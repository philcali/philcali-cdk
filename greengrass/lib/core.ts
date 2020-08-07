import * as greengrass from '@aws-cdk/aws-greengrass';
import * as iot from '@philcali-cdk/iot';
import * as cdk from '@aws-cdk/core';
import { Tags } from './tag';

export interface ICoreDefinition extends cdk.IResource {
  readonly name: string;
  readonly versionId: string;
  setCore(device: iot.ICertifiedThing): ICoreDefinition;
}

export interface CoreDefinitionProps {
  readonly name?: string;
  readonly core: iot.ICertifiedThing;
  readonly tags?: Tags;
}

export class CoreDefinition extends cdk.Resource implements ICoreDefinition {
  readonly name: string;
  readonly versionId: string;
  private cores: Array<greengrass.CfnCoreDefinitionVersion.CoreProperty>

  constructor(scope: cdk.Construct, id: string, props?: CoreDefinitionProps) {
    super(scope, id);

    const definition = new greengrass.CfnCoreDefinition(this, 'Definition', {
      name: props?.name || id,
      tags: props?.tags
    });
    this.name = definition.ref;
    this.cores = [];
    if (props?.core) {
      this.setCore(props?.core);
    }
    const version = new greengrass.CfnCoreDefinitionVersion(definition, 'Version', {
      coreDefinitionId: this.name,
      cores: this.cores
    });
    this.versionId = version.ref;
  }

  setCore(device: iot.ICertifiedThing) {
    const stack = cdk.Stack.of(this);
    this.cores[0] = {
      certificateArn: device.certificate.certificateArn,
      id: this.node.id + device.thing.thingName,
      thingArn: stack.formatArn({
        service: 'iot',
        resource: 'thing',
        resourceName: device.thing.thingName,
        sep: '/'
      })
    };
    return this;
  }
}
