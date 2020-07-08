import * as iot from '@aws-cdk/aws-iot';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import { ICertificate, Certificate } from './certificate';

type PolicyProps = iot.CfnPolicyProps;

export interface IPolicy {
  readonly policyName: string

  attachToCertificate(certificate: ICertificate): IPolicy
}

export class Policy extends cdk.Resource implements IPolicy {
  readonly policyName: string
  private readonly policyDocument: iam.PolicyDocument

  public static attachPrincipal(scope: cdk.Construct, id: string, principal: string, policy: IPolicy) {
    new iot.CfnPolicyPrincipalAttachment(scope, 'Attach${id}ToPolicy', {
      principal,
      policyName: policy.policyName
    });
  }

  public static fromPolicyName(scope: cdk.Construct, id: string, policyName: string): IPolicy {
    class Import extends cdk.Resource implements IPolicy {
      readonly policyName: string = policyName;
      attachToCertificate(certificate: ICertificate): IPolicy {
        certificate.attachToPolicy(this);
        return this;
      }
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

  public attachToCertificate(certificate: ICertificate): IPolicy {
    certificate.attachToPolicy(this);
    return this;
  }
}

