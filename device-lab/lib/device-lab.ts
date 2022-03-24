import { ArnFormat, Duration, Stack } from "aws-cdk-lib";
import { AuthorizationType, CorsOptions, EndpointType, LambdaRestApi, MethodOptions, RestApi } from "aws-cdk-lib/aws-apigateway";
import { AttributeType, BillingMode, StreamViewType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Effect, PolicyDocument, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Code, Function, Runtime, StartingPosition } from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Choice, Condition, Pass, StateMachine, TaskInput, Wait, WaitTime } from "aws-cdk-lib/aws-stepfunctions";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { IDevicePoolIntegration, DevicePoolProps, DevicePoolType, DevicePoolEndpointProps } from "./pools/device-pool";

type InvokeSteps = {[key: string]: LambdaInvoke};
type FunctionStep = {[key: string]: Function};
type IntegrationCache = {[key: string]: IDevicePoolIntegration}

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
  readonly obtainDeviceFunction: Function;
  private readonly integrations: IntegrationCache = {};

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
    const functionSteps: FunctionStep = {};
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
      functionSteps[stepName] = lambdaFunction;
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

    this.obtainDeviceFunction = functionSteps['obtainDevices'];

    // Apply error catch to all non failure steps
    for (let stepName in invokeSteps) {
      if (stepName !== failProvision) {
        invokeSteps[stepName].addCatch(invokeSteps[failProvision], {
          resultPath: '$.error'
        });
      }
    }

    const scaliingNode = new Pass(this, 'scalingEntry');
    const definition = invokeSteps['startProvision']
      .next(scaliingNode)
      .next(new Choice(this, 'Is Managed?')
        .when(Condition.stringEquals("$.poolType", "UNMANAGED"), invokeSteps['obtainDevices'])
        .otherwise(invokeSteps['createReservation'])
        .afterwards()
        .next(new Choice(this, 'Is Done?')
          .when(Condition.booleanEquals('$.done', true), invokeSteps['finishProvision'])
          .otherwise(new Wait(this, 'waitLoop', {
            time: WaitTime.duration(props.workflowProps?.waitTime || Duration.seconds(5))
          }))
          .afterwards()
          .next(scaliingNode)));

    this.invokeSteps = invokeSteps;
    this.provisioningWorkflow = new StateMachine(this, 'ProvisioningWorkflow', {
      stateMachineName: props.workflowProps?.workflowName || 'DeviceLabWorkflow',
      timeout: props.workflowProps?.timeout || Duration.hours(1),
      definition
    });

    const eventsFunction = new Function(this, 'DeviceLabEventFunction', {
      handler: 'me.philcali.device.pool.service.DevicePoolEvents::handleDatabaseEvents',
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

  addIntegration(integration: IDevicePoolIntegration) {
    if (!this.integrations[integration.endpoint.uri]) {
      integration.associateToLab(this);
      this.integrations[integration.endpoint.uri] = integration;
    }
  }

  addDevicePool(devicePool: DevicePoolProps) {
    let endpoint: {[key: string]: any} = { M: {} };
    let lockOptions: {[key: string]: any} = {
      M: {
          "enabled": { BOOL: devicePool.lockOptions?.enabled || false }
      }
    };
    if (devicePool.integration) {
      if (devicePool.poolType === DevicePoolType.MANAGED) {
        throw new Error(`Trying to set an endpoint on a ${devicePool.poolType} pool ${devicePool.name}`);
      }
      let endpointObject: DevicePoolEndpointProps;
      if ("associateToLab" in devicePool.integration) {
        devicePool.integration.associateToLab(this);
        endpointObject = devicePool.integration.endpoint;
      } else {
        endpointObject = devicePool.integration;
      }
      endpoint.M['type'] = { S: endpointObject.endpointType };
      endpoint.M['uri'] = { S: endpointObject.uri };
    }
    if (devicePool.lockOptions) {
      lockOptions.M['enabled'] = { BOOL: devicePool.lockOptions.enabled || false };
      lockOptions.M['duration'] = { N: (devicePool.lockOptions.duration || Duration.hours(1)).toSeconds.toString() };
    }
    new AwsCustomResource(this, "Install" + devicePool.name, {
      onCreate: {
        physicalResourceId: PhysicalResourceId.of(devicePool.name),
        service: 'DynamoDB',
        action: 'putItem',
        parameters: {
          TableName: this.table.tableName,
          Item: {
            PK: { S: Stack.of(this).account + ":pool" },
            SK: { S: devicePool.name },
            description: { S: devicePool.description || 'Installed device pool for ' + devicePool.name },
            type: { S: devicePool.poolType || DevicePoolType.MANAGED },
            endpoint,
            lockOptions,
          }
        }
      },
      onDelete: {
        physicalResourceId: PhysicalResourceId.of(devicePool.name),
        service: 'DynamoDB',
        action: 'deleteItem',
        parameters: {
          TableName: this.table.tableName,
          Key: {
            PK: { S: Stack.of(this).account + ":pool" },
            SK: { S: devicePool.name }
          }
        }
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: [
          this.table.tableArn
        ]
      })
    });
  }
}