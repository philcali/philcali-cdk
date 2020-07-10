import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import { Policy } from './policy';
import { ICertificateAuthority } from './certificate';
import { ICertifiedThing, ThingProps, Thing } from './thing';

export interface IThingPool extends cdk.IConstruct {
  create(id: string, props?: ThingPoolCreateProps): ICertifiedThing;
}

export interface ThingPoolCreateProps extends ThingProps {
  readonly statements: iam.PolicyStatement[]
}

export interface ThingPoolProps {
  readonly certificates: ICertificateAuthority;
  readonly document: iam.PolicyDocument;
}

export class ThingPool extends cdk.Construct implements IThingPool {
  private certificates: ICertificateAuthority;
  private document: iam.PolicyDocument;

  constructor(scope: cdk.Construct, id: string, props: ThingPoolProps) {
    super(scope, id);
    this.certificates = props.certificates;
    this.document = props.document;
  }

  create(id: string, props?: ThingPoolCreateProps): ICertifiedThing {
    const document = iam.PolicyDocument.fromJson(this.document.toJSON());
    (props?.statements || []).forEach(statement => document.addStatements(statement));
    const thing = new Thing(this, id, props);
    const policy = new Policy(thing, 'Policy', {
      policyName: thing.thingName + '_policy',
      policyDocument: document
    });
    return this.certificates.certify(thing)
      .attachToPolicy(policy)
      .attachToThing(thing);
  }
}
