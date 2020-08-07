import * as custom from '@aws-cdk/custom-resources';
import * as iam from '@aws-cdk/aws-iam';
import * as logs from '@aws-cdk/aws-logs';
import * as cdk from '@aws-cdk/core';

export interface IGreengrassServiceRole extends iam.IRole {
  attachToAccount(): void
}

export interface GreengrassServiceRoleProps {
  readonly attachToAccount?: boolean;
  readonly description?: string;
  readonly externalIds?: Array<string>;
  readonly inlinePolicies?: Record<string, iam.PolicyDocument>;
  readonly managedPolicies?: Array<iam.IManagedPolicy>;
  readonly maxSessionDuration?: cdk.Duration;
  readonly path?: string;
  readonly roleName?: string;
  readonly permissionsBoundary?: iam.IManagedPolicy;
}

export class GreengrassServiceRole extends iam.Role implements IGreengrassServiceRole {
  constructor(scope: cdk.Construct, id: string, props?: GreengrassServiceRoleProps) {
    super(scope, id, {
      ...props,
      assumedBy: new iam.ServicePrincipal('greengrass.amazonaws.com'),
      managedPolicies: [
        ...(props?.managedPolicies || []),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGreengrassResourceAccessRolePolicy')
      ]
    });
    if (props?.attachToAccount) {
      this.attachToAccount();
    }
  }

  public attachToAccount() {
    const updateServiceRoleResource = new custom.AwsCustomResource(this, 'AttachToAccount', {
      logRetention: logs.RetentionDays.ONE_WEEK,
      policy: {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'greengrass:AssociateServiceRoleToAccount',
              'greengrass:DisassociateServiceRoleFromAccount'
            ],
            resources: [ '*' ]
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'iam:PassRole',
            ],
            resources: [ this.roleArn ]
          }),
        ]
      },
      onCreate: {
        physicalResourceId: custom.PhysicalResourceId.of(this.node.id),
        action: 'associateServiceRoleToAccount',
        service: 'Greengrass',
        parameters: { 'RoleArn': this.roleArn }
      },
      onDelete: {
        action: 'disassociateServiceRoleFromAccount',
        service: 'Greengrass'
      }
    });
  }
}
