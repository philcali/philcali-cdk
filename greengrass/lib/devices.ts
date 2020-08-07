import * as greengrass from '@aws-cdk/aws-greengrass';
import * as iot from '@philcali-cdk/iot';
import * as cdk from '@aws-cdk/core';
import { Tags } from './tag';

export interface IDeviceDefinition extends cdk.IResource {
  readonly name: string;
  readonly versionId: string;
  addDevice(device: iot.ICertifiedThing): IDeviceDefinition;
}

export interface DeviceDefinitionProps {
  readonly name?: string;
  readonly devices?: Array<iot.ICertifiedThing>;
  readonly tags?: Tags
}

export class DeviceDefinition extends cdk.Resource implements IDeviceDefinition {
  readonly name: string;
  readonly versionId: string;
  private devices: Array<greengrass.CfnDeviceDefinitionVersion.DeviceProperty>;
  constructor(scope: cdk.Construct, id: string, props?: DeviceDefinitionProps) {
    super(scope, id);
    this.devices = [];
    (props?.devices || []).forEach(this.addDevice.bind(this));
    const definition = new greengrass.CfnDeviceDefinition(this, 'Devices', {
      name: props?.name || id,
      tags: props?.tags
    });
    this.name = definition.ref;
    const version = new greengrass.CfnDeviceDefinitionVersion(definition, 'Version', {
      deviceDefinitionId: this.name,
      devices: this.devices
    });
    this.versionId = version.ref;
  }

  addDevice(device: iot.ICertifiedThing): IDeviceDefinition {
    const stack = cdk.Stack.of(this);
    this.devices.push({
      certificateArn: device.certificate.certificateArn,
      id: this.node.id + device.thing.thingName,
      thingArn: stack.formatArn({
        service: 'iot',
        resource: 'thing',
        resourceName: device.thing.thingName,
        sep: '/'
      })
    });
    return this;
  }
}
