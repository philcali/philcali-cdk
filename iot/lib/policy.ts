import * as iot from '@aws-cdk/aws-iot';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import { IAttachable, ICertificate, Certificate } from './certificate';

type PolicyProps = iot.CfnPolicyProps;

export interface IPolicy extends cdk.IResource {
  readonly policyName: string

  attachToCertificate(certificate: ICertificate): IPolicy

  attachPrincipal(attachable: IAttachable): void
}

abstract class PolicyBase extends cdk.Resource implements IPolicy {
  public abstract policyName: string;

  public attachToCertificate(certificate: ICertificate): IPolicy {
    certificate.attachToPolicy(this);
    return this;
  }

  public attachPrincipal(attachable: IAttachable) {
    new iot.CfnPolicyPrincipalAttachment(this, `Attach${attachable.type}ToPolicy`, {
      principal: attachable.principal,
      policyName: this.policyName
    });
  }
}

export class Policy extends PolicyBase {
  readonly policyName: string
  private readonly policyDocument: iam.PolicyDocument

  public static fromPolicyName(scope: cdk.Construct, id: string, policyName: string): IPolicy {
    class Import extends PolicyBase {
      readonly policyName: string = policyName;
    }
    return new Import(scope, id);
  }

  constructor(scope: cdk.Construct, id: string, props: PolicyProps) {
    super(scope, id);
    this.policyDocument = props.policyDocument;
    const policy = new iot.CfnPolicy(this, 'Policy', props);
    this.policyName = policy.ref;
  }

  public addStatement(statement: iam.PolicyStatement): Policy {
    this.policyDocument.addStatements(statement);
    return this;
  }
}

