import * as cdk from '@aws-cdk/core';
import { Connector } from './../connector';
import { IsolationMode } from './../function';

export class TwilioNotifications extends Connector {
  public static VERSIONS = [ 5, 4, 3, 2, 1 ]
  public static LATEST_VERSION = TwilioNotifications.VERSIONS[0];

  constructor(scope: cdk.IResource, id: string, props: TwilioNotificationsProps) {
    super(scope, id, props.version, {
      'TWILIO_ACCOUNT_SID': props.twilioAccountSid,
      'TwilioAuthTokenSecretArn': props.twilioAuthTokenSecretArn,
      'TwilioAuthTokenSecretArn-ResourceId': props.twilioAuthTokenSecretArnResourceId,
      'DefaultFromPhoneNumber': props.defaultFromPhoneNumber,
      'IsolationMode': props.isolationMode
    });
  }
}

export interface TwilioNotificationsProps {
  readonly version: number,
  readonly twilioAccountSid: string,
  readonly twilioAuthTokenSecretArn: string,
  readonly twilioAuthTokenSecretArnResourceId: string,
  readonly defaultFromPhoneNumber?: string,
  readonly isolationMode?: IsolationMode
}
