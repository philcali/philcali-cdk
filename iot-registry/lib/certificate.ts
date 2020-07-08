import * as iot from '@aws-cdk/aws-iot';
import * as cdk from '@aws-cdk/core';
import { IPolicy, Policy } from './policy';
import { IThing, ICertifiedThing } from './thing';

type CertificateProps = iot.CfnCertificateProps;

export interface IAttachable {
  readonly type: string;
  readonly principal: string
}

export interface ICertificate extends cdk.IResource, IAttachable {
  readonly certificateArn: string

  attachToPolicy(policy: IPolicy): ICertificate

  attachToThing(thing: IThing): ICertifiedThing
}

export interface ICertificateAuthority {
  certify(scope: cdk.IConstruct): ICertificate
}

abstract class CertificateBase extends cdk.Resource implements ICertificate {
  public abstract readonly principal: string;
  public abstract readonly certificateArn: string;
  public readonly type = 'Cert';

  attachToPolicy(policy: IPolicy): ICertificate {
    new iot.CfnPolicyPrincipalAttachment(this, 'AttachCertToPolicy', {
      principal: this.principal,
      policyName: policy.policyName
    });
    return this;
  }

  attachToThing(thing: IThing): ICertifiedThing {
    return thing.attachToCertificate(this);
  }
}

export class Certificate extends CertificateBase {
  readonly certificateArn: string;
  readonly principal: string;

  public static fromCertificateArn(scope: cdk.Construct, id: string, certificateArn: string): ICertificate {
    class Import extends CertificateBase {
      readonly certificateArn: string = certificateArn;
      readonly principal: string = certificateArn;
    }
    return new Import(scope, id);
  }

  constructor(scope: cdk.Construct, id: string, props: CertificateProps) {
    super(scope, id);

    const certificate = new iot.CfnCertificate(scope, 'Certificate', props);
    this.certificateArn = certificate.ref;
    this.principal = this.certificateArn;
  }
}

