import * as cdk from '@aws-cdk/core';
import { GreengrassDevice } from '../thing';
import { isGreengrassThing } from '../types';
import { Connector } from './../connector';
import { IsolationMode } from './../function';

export class RaspberryPiGPIO extends Connector {
  public static VERSIONS = [ 3, 2, 1 ]
  public static LATEST_VERSION = RaspberryPiGPIO.VERSIONS[0];

  private static gpioPrefix(core: GreengrassDevice): string {
    let device = isGreengrassThing(core) ? core.device : core;
    return `gpio/${device.thing.thingName}`;
  }

  private static topic(core: GreengrassDevice, pin: number, mode: string): string {
    return `${this.gpioPrefix(core)}/${pin}/${mode}`;
  }

  public static inputWriteTopic(core: GreengrassDevice, pin: number): string {
    return this.topic(core, pin, "write");
  }

  public static inputReadTopic(core: GreengrassDevice, pin: number): string {
    return this.topic(core, pin, "read");
  }

  public static outputStateTopic(core: GreengrassDevice, pin: number): string {
    return this.topic(core, pin, "state");
  }

  public static outputErrorTopic(core: GreengrassDevice): string {
    return `${this.gpioPrefix(core)}/error`;
  }

  constructor(scope: cdk.Construct, props: RaspberryPiGPIOProps) {
    super(scope, props.version, {
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
