import { Duration } from "aws-cdk-lib";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { DeviceLab } from "../device-lab";
import { LambdaDevicePoolIntegration } from "./lambda-integration";

const DEFAULT_MEMORY_SIZE = 512;

export enum ProvisionStrategy {
    CYCLIC = "CYCLIC"
}

export interface SSMDevicePoolIntegrationProps {
    readonly code: Code,
    readonly locking?: boolean,
    readonly lockingDuration?: Duration,
    readonly provisionStrategy?: ProvisionStrategy,
    readonly functionMemorySize?: number,
}

export class SSMDevicePoolIntegration extends LambdaDevicePoolIntegration {

    constructor(scope: Construct, props: SSMDevicePoolIntegrationProps) {
        super({
            lambdaFunction : new Function(scope, "SSMDevicePoolIntegration", {
                memorySize: props.functionMemorySize || DEFAULT_MEMORY_SIZE,
                timeout: Duration.minutes(1),
                handler: "me.philcali.device.pool.service.unmanaged.ObtainDevicesSSM::handleRequest",
                code: props.code,
                runtime: Runtime.JAVA_11,
                environment: {
                    "LOCKING": (props.locking || false).toString(),
                    "LOCKING_DURATION": (props.lockingDuration || Duration.seconds(15)).toSeconds().toString(),
                    "PROVISION_STRATEGY": (props.provisionStrategy || ProvisionStrategy.CYCLIC)
                }
            })
        });

        this.lambdaFunction.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'ssm:DescribeInstanceInformation'
            ],
            resources: [
                '*'
            ]
        }))
    }

    associateToLab(lab: DeviceLab) {
        super.associateToLab(lab);
        this.lambdaFunction.addEnvironment("TABLE_NAME", lab.table.tableName);
        this.lambdaFunction.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:UpdateItem',
                'dynamodb:PutItem',
            ],
            resources: [
                lab.table.tableArn
            ]
        }));
    }
}