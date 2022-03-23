import * as cdk from 'aws-cdk-lib';
import { CfnParameter } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Code } from 'aws-cdk-lib/aws-lambda';
import * as lab from '../lib/index';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/index.ts
test('Managed DeviceLab', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    // WHEN
    const bucketNameParam = new CfnParameter(stack, 'bucketParam', {
        default: 'bucketParam'
    })
    const objectKeyParam = new CfnParameter(stack, 'objectKeyParam', {
        default: 'objectKeyParam'
    })
    const deviceLab = new lab.DeviceLab(stack, 'MyTestConstruct', {
        serviceCode: Code.fromCfnParameters({
            bucketNameParam,
            objectKeyParam
        }),
        workflowCode: Code.fromCfnParameters({
            bucketNameParam,
            objectKeyParam
        })
    });

    deviceLab.addDevicePool({
        name: 'MyPool',
        description: "This is the human readable name of the pool",
        poolType: lab.DevicePoolType.MANAGED,
        lockOptions: {
            enabled: true,
            duration: cdk.Duration.hours(1)
        }
    });

    deviceLab.addDevicePool({
        name: 'MyNodes',
        poolType: lab.DevicePoolType.UNMANAGED,
        integration: new lab.SSMDevicePoolIntegration(stack, {
            code: Code.fromCfnParameters({
                bucketNameParam,
                objectKeyParam
            })
        })
    })

    // THEN
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'DeviceLab'
    });
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'DeviceLabControlPlane'
    });
    template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        StateMachineName: 'DeviceLabWorkflow'
    })
});
