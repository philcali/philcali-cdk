import * as cdk from '@aws-cdk/core';
import { Connector } from './../connector';
import { IsolationMode } from './../function';

export class SNS extends Connector {
  public static VERSIONS = [ 4, 3, 2, 1 ]
  public static LATEST_VERSION = SNS.VERSIONS[0];
  public static INPUT_TOPICS = {
    MESSAGE: 'sns/message'
  };
  public static OUTPUT_TOPICS = {
    MESSAGE_STATUS: 'sns/message/status'
  };

  constructor(scope: cdk.Construct, props: SNSProps) {
    super(scope, props.version, {
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
