import * as greengrass from '@aws-cdk/aws-greengrass';
import * as iot from '@philcali-cdk/iot';
import * as cdk from '@aws-cdk/core';
import { Tags } from './tag';
import { lazyHash } from './hash';

export interface IDeviceDefinition extends cdk.IResource {
  readonly definitionId: string
  readonly defintiionArn: string
  readonly versionArn?: string
}

export interface IDeviceDefinitionVersion extends cdk.IResource {
  readonly versionArn: string
}

export interface DeviceDefinitionProps {
  readonly name?: string;
  readonly devices?: Array<iot.ICertifiedThing>;
  readonly tags?: Tags
}

export interface DeviceDefintiionVersionProps {
  readonly definition: IDeviceDefinition
  readonly devices?: Array<iot.ICertifiedThing>;
}

type DeviceLike = (
  greengrass.CfnDeviceDefinition.DeviceProperty |
  greengrass.CfnDeviceDefinitionVersion.DeviceProperty
);

function transformDevice(scope: cdk.Construct, device: iot.ICertifiedThing): DeviceLike {
  return {
      certificateArn: device.certificate.certificateArn,
      id: lazyHash(`${scope.node.id}-${device.thing.thingName}`),
      thingArn: cdk.Stack.of(scope).formatArn({
        service: 'iot',
        resource: 'thing',
        resourceName: device.thing.thingName,
        sep: '/'
      })
  };
}

export class DeviceDefinitionVersion extends cdk.Resource implements IDeviceDefinitionVersion {
  readonly versionArn: string;
  private devices: Array<greengrass.CfnDeviceDefinitionVersion.DeviceProperty>;
  constructor(scope: cdk.Construct, id: string, props: DeviceDefintiionVersionProps) {
    super(scope, id);
    this.devices = [];
    (props.devices || []).forEach(this.addDevice.bind(this));
    const version = new greengrass.CfnDeviceDefinitionVersion(this, 'Version', {
      deviceDefinitionId: props.definition.definitionId,
      devices: this.devices
    });
    this.versionArn = version.ref;
  }

  addDevice(device: iot.ICertifiedThing): DeviceDefinitionVersion {
    const stack = cdk.Stack.of(this);
    this.devices.push(transformDevice(this, device));
    return this;
  }
}

export class DeviceDefinition extends cdk.Resource implements IDeviceDefinition {
  readonly definitionId: string;
  readonly defintiionArn: string;
  readonly versionArn?: string;

  constructor(scope: cdk.Construct, id: string, props?: DeviceDefinitionProps) {
    super(scope, id);

    let initialVersion: greengrass.CfnDeviceDefinition.DeviceDefinitionVersionProperty | undefined;
    if (props?.devices) {
      initialVersion = {
        devices: props.devices.map(device => transformDevice(this, device))
      };
    }

    const definition = new greengrass.CfnDeviceDefinition(this, 'Devices', {
      name: props?.name || id,
      tags: props?.tags,
      initialVersion
    });

    this.definitionId = definition.attrId;
    this.defintiionArn = definition.attrArn;
    this.versionArn = definition.attrLatestVersionArn;
  }
}
