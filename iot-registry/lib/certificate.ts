import * as iot from '@aws-cdk/aws-iot';
import * as cdk from '@aws-cdk/core';
import { IPolicy, Policy } from './policy';
import { IThing, ICertifiedThing } from './thing';

type CertificateProps = iot.CfnCertificateProps;

export interface ICertificate {
  readonly certificateArn: string

  attachToPolicy(policy: IPolicy): ICertificate

  attachToThing(thing: IThing): ICertifiedThing
}

export interface ICertificateAuthority {
  certify(scope: cdk.Construct): ICertificate
}

export class Certificate extends cdk.Resource implements ICertificate {
  readonly certificateArn: string;

  public static fromCertificateArn(scope: cdk.Construct, id: string, certificateArn: string): ICertificate {
    class Import extends cdk.Resource implements ICertificate {
      readonly certificateArn: string = certificateArn;
      attachToPolicy(policy: IPolicy): ICertificate {
        Policy.attachPrincipal(this, 'Cert', this.certificateArn, policy);
        return this;
      }

      attachToThing(thing: IThing): ICertifiedThing {
        return thing.attachToCertificate(this);
      }
    }
    return new Import(scope, id);
  }

  constructor(scope: cdk.Construct, id: string, props: CertificateProps) {
    super(scope, id);

    const certificate = new iot.CfnCertificate(scope, 'Certificate', props);
    this.certificateArn = certificate.ref;
  }

  attachToPolicy(policy: IPolicy): ICertificate {
    Policy.attachPrincipal(this, 'Cert', this.certificateArn, policy);
    return this;
  }

  attachToThing(thing: IThing): ICertifiedThing {
    return thing.attachToCertificate(this);
  }
}

