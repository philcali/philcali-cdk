import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';

export class CoreBasePolicyDocument extends iam.PolicyDocument {
  constructor(scope: cdk.IConstruct, resource?: string) {
    const stack = cdk.Stack.of(scope);
    super({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "iot:Publish",
            "iot:Subscribe",
            "iot:Connect",
            "iot:Receive",
            "iot:GetThingShadow",
            "iot:DeleteThingShadow",
            "iot:UpdateThingShadow"
          ],
          resources: [ stack.formatArn({
            service: 'iot',
            resource: resource || '*:*'
          })]
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "greengrass:AssumeRoleForGroup",
            "greengrass:CreateCertificate",
            "greengrass:GetConnectivityInfo",
            "greengrass:GetDeployment",
            "greengrass:Discover",
            "greengrass:GetDeploymentArtifacts",
            "greengrass:UpdateConnectivityInfo",
            "greengrass:UpdateCoreDeploymentStatus"
          ],
          resources: [ '*' ]
        })
      ]
    });
  }
}

export class DeviceBasePolicyDocument extends iam.PolicyDocument {
  constructor(scope: cdk.IConstruct, resource?: string) {
    const stack = cdk.Stack.of(scope);
    super({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "iot:Publish",
            "iot:Subscribe",
            "iot:Connect",
            "iot:Receive",
          ],
          resources: [ stack.formatArn({
            service: 'iot',
            resource: resource || '*:*'
          })]
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "greengrass:*",
          ],
          resources: [ '*' ]
        })
      ]
    });
  }
}
