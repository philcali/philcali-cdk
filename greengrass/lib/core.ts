import * as greengrass from '@aws-cdk/aws-greengrass';
import * as iot from '@philcali-cdk/iot';
import * as cdk from '@aws-cdk/core';
import { Tags } from './tag';
import { GreengrassDevice } from './thing';
import {  transformDevice } from './types';

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
  readonly core?: GreengrassDevice;
  readonly tags?: Tags;
}

export interface CoreDefinitionVersionProps {
  readonly definition: ICoreDefinition
  readonly core: GreengrassDevice;
}

export class CoreDefinitionVersion extends cdk.Resource implements ICoreDefintiionVersion {
  readonly versionArn: string

  constructor(scope: cdk.Construct, id: string, props: CoreDefinitionVersionProps) {
    super(scope, id);
    const version = new greengrass.CfnCoreDefinitionVersion(this, 'Version', {
      coreDefinitionId: props.definition.defintiionId,
      cores: [transformDevice(this, props.core)]
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
        cores: [transformDevice(this, props.core)]
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
