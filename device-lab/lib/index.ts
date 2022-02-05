import { Construct } from 'constructs';
import {
  Table,
  BillingMode,
  AttributeType,
  StreamViewType
} from 'aws-cdk-lib/aws-dynamodb';
import { Code, Function, Runtime, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { ArnFormat, Duration, Stack } from 'aws-cdk-lib';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Effect, PolicyDocument, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  TaskInput,
  Choice,
  Condition,
  Pass,
  Wait,
  WaitTime,
  StateMachine
} from 'aws-cdk-lib/aws-stepfunctions';
import { 
  AuthorizationType,
  CorsOptions,
  EndpointType,
  LambdaRestApi,
  MethodOptions,
  RestApi
} from 'aws-cdk-lib/aws-apigateway';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

type InvokeSteps = {[key: string]: LambdaInvoke};

export enum Scope {
  READ_DEVICE_POOL,
  READ_DEVICE,
  READ_PROVISION,
  READ_RESERVATION,
  READ,
  WRITE_DEVICE_POOL,
  WRITE_DEVICE,
  WRITE_PROVISION,
  WRITE_RESERVATION,
  WRITE
}

export interface DeviceLabApiScopeProps {
  readonly stageName?: string,
  readonly scopes: Array<Scope>,
  readonly allowList: Array<string>
}

export class DeviceLabApiScope extends PolicyStatement {
  constructor(props: DeviceLabApiScopeProps) {
    let resources: string[] = [];
    props.scopes.forEach(scope => {
      resources = resources.concat(DeviceLabApiScope.toResourceName(props.stageName || 'v1', scope));
    })
    super({
      effect: Effect.ALLOW,
      actions: [ 'execute-api:Invoke' ],
      resources
    })
    props.allowList.forEach(this.addAwsAccountPrincipal.bind(this));
  }

  static toResourceName(stageName: string, scope: Scope): Array<string> {
    let paths = [];
    let method = 'GET';
    switch (scope) {
      case Scope.WRITE:
        method = '*';
        paths.push("/*");
        break;
      case Scope.READ:
        paths.push("/*");
        break;
      case Scope.WRITE_DEVICE_POOL:
        method = '*';
        paths.push('/pools');
        paths.push('/pools/*');
        break;
      case Scope.READ_DEVICE_POOL:
        paths.push('/pools');
        paths.push('/pools/*');
        break;
      case Scope.WRITE_DEVICE:
        method = '*';
        paths.push('/pools/*/devices');
        paths.push('/pools/*/devices/*/');
        break;
      case Scope.READ_DEVICE:
        paths.push('/pools/*/devices');
        paths.push('/pools/*/devices/*/');
        break;
      case Scope.WRITE_PROVISION:
        method = '*';
        paths.push(`/pools/*/provisions`);
        paths.push(`/pools/*/provisions/*/`);
        break;
      case Scope.READ_PROVISION:
        paths.push(`/pools/*/provisions`);
        paths.push(`/pools/*/provisions/*/`);
        break;
      case Scope.WRITE_RESERVATION:
        method = '*';
        paths.push(`/pools/*/provisions/*/reservations`);
        paths.push(`/pools/*/provisions/*/reservations/*/`);
        break;
      case Scope.READ_RESERVATION:
        paths.push(`/pools/*/provisions/*/reservations`);
        paths.push(`/pools/*/provisions/*/reservations/*/`);
        break;
    }
    return paths.map(path => {
      return `execute-api:/${stageName}/${method}${path}`;
    });
  }
}

export interface DeviceLabTableProps {
  readonly tableName?: string,
  readonly billingMode?: BillingMode,
  readonly readCapacity?: number,
  readonly writeCapacity?: number
}

export interface DeviceLabWorkflowProps {
  readonly workflowName?: string,
  readonly timeout?: Duration,
  readonly waitTime?: Duration
}

export interface DeviceLabApiProps {
  readonly defaultMethodOptions?: MethodOptions,
  readonly defaultCorsPreflightOptions?: CorsOptions,
  readonly stageName?: string,
  readonly apiName?: string,
  readonly policy?: PolicyDocument
}

export interface DeviceLabProps {
  readonly tableProps?: DeviceLabTableProps,
  readonly workflowProps?: DeviceLabWorkflowProps,
  readonly apiProps?: DeviceLabApiProps,
  readonly serviceCode: Code,
  readonly workflowCode: Code
}

export class DeviceLab extends Construct {
  readonly table: Table;
  readonly provisioningWorkflow: StateMachine;
  readonly invokeSteps: InvokeSteps;
  readonly controlPlane: RestApi;

  constructor(scope: Construct, id: string, props: DeviceLabProps) {
    super(scope, id);

    this.table = new Table(this, "DeviceLabTable", {
      ...props.tableProps,
      partitionKey: {
        name: 'PK',
        type: AttributeType.STRING
      },
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      sortKey: {
        name: 'SK',
        type: AttributeType.STRING
      },
      tableName: props.tableProps?.tableName || 'DeviceLab',
      timeToLiveAttribute: 'expiresIn',
      billingMode: props.tableProps?.billingMode || BillingMode.PAY_PER_REQUEST,
    });

    const tablePolicy = new PolicyStatement({
      actions: [
        'dynamodb:PutItem',
        'dynamodb:GetItem',
        'dynamodb:Query',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem'
      ],
      effect: Effect.ALLOW,
      resources: [
        this.table.tableArn
      ]
    })

    const failProvision = "failProvision";
    const workflowSteps = [
      'startProvision',
      'createReservation',
      'obtainDevices',
      failProvision,
      'finishProvision'
    ];

    const invokeSteps: InvokeSteps = {};
    // Create all lambda based invoke steps
    workflowSteps.forEach(stepName => {
      const lambdaFunction = new Function(this, stepName + "Function", {
        handler: `me.philcali.device.pool.service.DevicePoolEvents::${stepName}Step`,
        code: props.workflowCode,
        environment: {
          TABLE_NAME: this.table.tableName
        },
        memorySize: 512,
        runtime: Runtime.JAVA_11,
        timeout: Duration.minutes(5),
      });
      lambdaFunction.addToRolePolicy(tablePolicy);
      invokeSteps[stepName] = new LambdaInvoke(this, `${stepName}Step`, {
      lambdaFunction,
        retryOnServiceExceptions: true,
        outputPath: '$.Payload',
        payload: TaskInput.fromObject({
          'input.$': '$',
          'executionName.$': '$$.Execution.Id'
        })
      });
    });
    // Apply error catch to all non failure steps
    for (let stepName in invokeSteps) {
      if (stepName !== failProvision) {
        invokeSteps[stepName].addCatch(invokeSteps[failProvision], {
          resultPath: '$.error'
        });
      }
    }

    const definition = invokeSteps['startProvision']
      .next(new Pass(this, 'scalingEntry'))
      .next(new Choice(this, 'Is Managed?')
        .when(Condition.stringEquals("$.poolType", "UNMANAGED"), invokeSteps['obtainDevices'])
        .otherwise(invokeSteps['createReservation'])
        .afterwards()
        .next(new Choice(this, 'Is Done?')
          .when(Condition.booleanEquals('$.done', true), invokeSteps['finishProvision'])
          .otherwise(new Wait(this, 'waitLoop', {
            time: WaitTime.duration(props.workflowProps?.waitTime || Duration.seconds(5))
          }))));

    this.invokeSteps = invokeSteps;
    this.provisioningWorkflow = new StateMachine(this, 'ProvisioningWorkflow', {
      stateMachineName: props.workflowProps?.workflowName || 'DeviceLabWorkflow',
      timeout: props.workflowProps?.timeout || Duration.hours(1),
      definition
    });

    const eventsFunction = new Function(this, 'DeviceLabEventFunction', {
      handler: '',
      code: props.workflowCode,
      environment: {
        TABLE_NAME: this.table.tableName,
        WORKFLOW_ID: this.provisioningWorkflow.stateMachineArn
      },
      memorySize: 512,
      timeout: Duration.minutes(5),
      runtime: Runtime.JAVA_11
    });
    eventsFunction.addToRolePolicy(tablePolicy);
    eventsFunction.addToRolePolicy(new PolicyStatement({
      actions: [ 'states:StartExecution' ],
      resources: [ this.provisioningWorkflow.stateMachineArn ],
      effect: Effect.ALLOW
    }));
    eventsFunction.addToRolePolicy(new PolicyStatement({
      actions: [ 'states:StopExecution' ],
      effect: Effect.ALLOW,
      resources: [
        Stack.of(this).formatArn({
          service: 'states',
          resource: 'execution',
          arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          resourceName: this.provisioningWorkflow.stateMachineName + ":*"
        })
      ]
    }))
    eventsFunction.addEventSource(new DynamoEventSource(this.table, {
      enabled: true,
      batchSize: 100,
      startingPosition: StartingPosition.TRIM_HORIZON
    }))

    const controlPlaneFunction = new Function(this, 'DeviceLabApiFunction', {
      handler: 'me.philcali.device.pool.service.DevicePools::handleRequest',
      code: props.serviceCode,
      environment: {
        TABLE_NAME: this.table.tableName,
        API_VERSION: 'V1'
      },
      memorySize: 512,
      runtime: Runtime.JAVA_11,
      timeout: Duration.seconds(30),
    });
    controlPlaneFunction.addToRolePolicy(tablePolicy);
    this.controlPlane = new LambdaRestApi(this, 'DeviceLabApi', {
      handler: controlPlaneFunction,
      restApiName: props.apiProps?.apiName || 'DeviceLabControlPlane',
      endpointConfiguration: {
        types: [ EndpointType.REGIONAL ]
      },
      policy: props.apiProps?.policy,
      deployOptions: {
        stageName: props.apiProps?.stageName || 'v1'
      },
      defaultMethodOptions: props.apiProps?.defaultMethodOptions || {
        authorizationType: AuthorizationType.IAM
      },
      defaultCorsPreflightOptions: props.apiProps?.defaultCorsPreflightOptions
    });
  }
}
