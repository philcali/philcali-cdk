import { Duration } from "aws-cdk-lib";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { DeviceLab } from "../device-lab";
import { LambdaDevicePoolIntegration } from "./lambda-integration";

const DEFAULT_MEMORY_SIZE = 512;

export interface IotDevicePoolIntegrationProps {
    readonly functionMemorySize?: number;
    readonly code: Code;
    readonly recursive?: boolean;
    readonly locking?: boolean;
    readonly lockingDuration?: Duration;
}

export class IotDevicePoolIntegration extends LambdaDevicePoolIntegration {
    constructor(scope: Construct, props: IotDevicePoolIntegrationProps) {
        super({
            lambdaFunction: new Function(scope, "IotDevicePoolIntegration", {
                memorySize: props.functionMemorySize || DEFAULT_MEMORY_SIZE,
                runtime: Runtime.JAVA_11,
                timeout: Duration.minutes(1),
                code: props.code,
                handler: 'me.philcali.device.pool.service.unmanaged.UnmanagedHandlerIot::handleRequest',
                environment: {
                    'ENABLE_RECURSION': (props.recursive || true).toString(),
                    'ENABLE_LOCKING': (props.locking || false).toString(),
                    'LOCKING_DURATION': (props.lockingDuration || Duration.seconds(15)).toSeconds().toString()
                }
            })
        });

        this.lambdaFunction.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'iot:listThingsInThingGroup'
            ],
            resources: [
                '*'
            ]
        }))
    }

    associateToLab(deviceLab: DeviceLab): void {
        super.associateToLab(deviceLab);
        this.lambdaFunction.addEnvironment("TABLE_NAME", deviceLab.table.tableName);
        this.lambdaFunction.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:UpdateItem',
                'dynamodb:PutItem',
            ],
            resources: [
                deviceLab.table.tableArn
            ]
        }));       
    }
}