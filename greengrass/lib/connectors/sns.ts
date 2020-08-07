import * as cdk from '@aws-cdk/core';
import { Connector } from './../connector';
import { IsolationMode } from './../function';

export class SNS extends Connector {
  public static VERSIONS = [ 4, 3, 2, 1 ]
  public static LATEST_VERSION = SNS.VERSIONS[0];

  constructor(scope: cdk.IResource, id: string, props: SNSProps) {
    super(scope, id, props.version, {
      DefaultSNSArn: props.defaultSNSArn,
      IsolationMode: props.isolationMode
    });
  }
}

export interface SNSProps {
  readonly version: number,
  readonly defaultSNSArn: string
  readonly isolationMode?: IsolationMode
}
