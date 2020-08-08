import * as greengrass from '@aws-cdk/aws-greengrass';
import * as iot from '@philcali-cdk/iot';
import * as cdk from '@aws-cdk/core';
import { Tags } from './tag';
import { lazyHash } from './hash';

export interface ICoreDefinition extends cdk.IResource {
  readonly defintiionId: string;
  readonly definitionArn: string;
  readonly versionArn?: string;
}

export interface ICoreDefintiionVersion extends cdk.IResource {
  readonly versionArn: string;
}

export interface CoreDefinitionProps {
  readonly name?: string;
  readonly core?: iot.ICertifiedThing;
  readonly tags?: Tags;
}

export interface CoreDefinitionVersionProps {
  readonly definition: ICoreDefinition
  readonly core: iot.ICertifiedThing;
}

type CoreLike = (
  greengrass.CfnCoreDefinition.CoreProperty |
  greengrass.CfnCoreDefinitionVersion.CoreProperty
);

function transformCore(scope: cdk.Construct, device: iot.ICertifiedThing): CoreLike {
  return {
    certificateArn: device.certificate.certificateArn,
    id: lazyHash(`${scope.node.id}-${device.thing.thingName}`),
    thingArn: cdk.Stack.of(scope).formatArn({
      service: 'iot',
      resource: 'thing',
      resourceName: device.thing.thingName,
      sep: '/'
    })
  }
}

export class CoreDefinitionVersion extends cdk.Resource implements ICoreDefintiionVersion {
  readonly versionArn: string

  constructor(scope: cdk.Construct, id: string, props: CoreDefinitionVersionProps) {
    super(scope, id);
    const version = new greengrass.CfnCoreDefinitionVersion(this, 'Version', {
      coreDefinitionId: props.definition.defintiionId,
      cores: [transformCore(this, props.core)]
    });
    this.versionArn = version.ref;
  }
}

export class CoreDefinition extends cdk.Resource implements ICoreDefinition {
  readonly defintiionId: string;
  readonly definitionArn: string;
  readonly versionArn?: string;

  constructor(scope: cdk.Construct, id: string, props?: CoreDefinitionProps) {
    super(scope, id);

    let initialVersion: greengrass.CfnCoreDefinition.CoreDefinitionVersionProperty | undefined;
    if (props?.core) {
      initialVersion = {
        cores: [transformCore(this, props.core)]
      };
    }

    const definition = new greengrass.CfnCoreDefinition(this, 'Definition', {
      name: props?.name || id,
      tags: props?.tags,
      initialVersion
    });

    this.defintiionId = definition.attrId;
    this.definitionArn = definition.attrArn;
    this.versionArn = definition.attrLatestVersionArn;
  }
}
