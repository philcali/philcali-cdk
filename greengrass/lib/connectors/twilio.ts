import * as cdk from '@aws-cdk/core';
import { Connector } from './../connector';
import { IsolationMode } from './../function';

export class TwilioNotifications extends Connector {
  public static VERSIONS = [ 5, 4, 3, 2, 1 ]
  public static LATEST_VERSION = TwilioNotifications.VERSIONS[0];
  public static INPUT_TOPICS = {
    MESSAGE_TXT: 'twilio/txt',
    MESSAGE_CALL: 'twilio/call'
  };
  public static OUTPUT_TOPICS = {
    MESSAGE_STATUS: 'twilio/message/status'
  }

  constructor(scope: cdk.Construct, props: TwilioNotificationsProps) {
    super(scope, props.version, {
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
