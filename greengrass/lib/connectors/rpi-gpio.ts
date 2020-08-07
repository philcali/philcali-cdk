import * as cdk from '@aws-cdk/core';
import { Connector } from './../connector';
import { IsolationMode } from './../function';

export class RaspberryPiGPIO extends Connector {
  public static VERSIONS = [ 3, 2, 1 ]
  public static LATEST_VERSION = RaspberryPiGPIO.VERSIONS[0];

  constructor(scope: cdk.IResource, id: string, props: RaspberryPiGPIOProps) {
    super(scope, id, props.version, {
      'GpioMem-ResourceId': props.gpioMemResourceId,
      'InputPollPeriod': props.inputPollPeriod,
      'InputGpios': props.inputPins?.join(','),
      'OutputGpios': props.outputPins?.join(',')
    });
  }
}

export interface RaspberryPiGPIOProps {
  readonly version: number,
  readonly inputPins?: Array<string>
  readonly inputPollPeriod?: number
  readonly outputPins?: Array<string>
  readonly gpioMemResourceId: string
}
