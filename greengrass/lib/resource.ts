import * as greengrass from '@aws-cdk/aws-greengrass';
import * as cdk from '@aws-cdk/core';
import { Permission } from './function';
import { lazyHash } from './hash';
import { Tags } from './tag';

export interface IResourceDefinition {
  readonly definitionId: string;
  readonly definitionArn: string;
  readonly versionArn?: string;
}

export interface IResourceDefinitionVersion {
  readonly versionArn: string;
}

export interface ResourceDefinitionVersionProps {
  readonly resources?: Array<ResourceProps>;
  readonly definition: IResourceDefinition;
}

type ResourceLike = (
  greengrass.CfnResourceDefinition.ResourceInstanceProperty |
  greengrass.CfnResourceDefinitionVersion.ResourceInstanceProperty
);

function transformResource(scope: cdk.Construct, resource: ResourceProps): ResourceLike {
  return {
    ...resource,
    name: resource.name || lazyHash(`${scope.node.id}-${resource.id}`),
  };
}

export class ResourceDefinitionVersion extends cdk.Resource implements IResourceDefinitionVersion {
  readonly versionArn: string;
  private resources: Array<greengrass.CfnResourceDefinitionVersion.ResourceInstanceProperty>

  constructor(scope: cdk.Construct, id: string, props: ResourceDefinitionVersionProps) {
    super(scope, id);
    this.resources = [];
    if (props?.resources) {
      props.resources.forEach(this.addResource.bind(this));
    }

    const version = new greengrass.CfnResourceDefinitionVersion(this, 'Version', {
      resourceDefinitionId: props.definition.definitionId,
      resources: this.resources
    });
    this.versionArn = version.ref;
  }

  addResource(resource: ResourceProps): ResourceDefinitionVersion {
    this.resources.push(transformResource(this, resource));
    return this;
  }
}

export class ResourceDefinition extends cdk.Resource implements IResourceDefinition {
  readonly definitionId: string
  readonly definitionArn: string
  readonly versionArn?: string;

  constructor(scope: cdk.Construct, id: string, props?: ResourceDefinitionProps) {
    super(scope, id);

    let initialVersion: greengrass.CfnResourceDefinition.ResourceDefinitionVersionProperty | undefined;
    if (props?.resources) {
      initialVersion = {
        resources: props.resources.map(resource => transformResource(this, resource))
      };
    }

    const definition = new greengrass.CfnResourceDefinition(this, 'Definition', {
      name: props?.name || id,
      tags: props?.tags,
      initialVersion
    });

    this.definitionId = definition.ref;
    this.definitionArn = definition.attrArn;
    this.versionArn = definition.attrLatestVersionArn;
  }
}


export interface ResourceProps {
  readonly id: string
  readonly name?: string
  readonly resourceDataContainer: LocalVolumeResourceData
    | LocalDeviceResourceData
    | S3MachineLearningResourceData
    | SageMakerMachineLearningModelResourceData
    | SecretsManagerSecretResourceData
    | greengrass.CfnResourceDefinitionVersion.ResourceDataContainerProperty
}

export interface ResourceDataContainerProps {
  readonly localDeviceResourceData?: greengrass.CfnResourceDefinitionVersion.LocalDeviceResourceDataProperty
  readonly localVolumeResourceData?: greengrass.CfnResourceDefinitionVersion.LocalVolumeResourceDataProperty
  readonly s3MachineLearningModelResourceData?: greengrass.CfnResourceDefinitionVersion.S3MachineLearningModelResourceDataProperty
  readonly sageMakerMachineLearningModelResourceData?: greengrass.CfnResourceDefinitionVersion.SageMakerMachineLearningModelResourceDataProperty
  readonly secretsManagerSecretResourceData?: greengrass.CfnResourceDefinitionVersion.SecretsManagerSecretResourceDataProperty
}

export interface DownloadOwnerSetting {
  readonly groupOwner: string
  readonly groupPermission: Permission
}

export interface LocalOwnerSetting {
  readonly autoAddGroupOwner: boolean
  readonly groupOwner?: string
}

export interface LocalDeviceResourceDataProps {
  readonly sourcePath: string
  readonly groupOwnerSetting: LocalOwnerSetting
}

export interface LocalVolumeResourceDataProps {
  readonly sourcePath: string
  readonly destinationPath: string
  readonly groupOwnerSetting?: LocalOwnerSetting
}

export interface S3MachineLearningModelResourceDataProps {
  readonly destinationPath: string
  readonly ownerSetting?: DownloadOwnerSetting
  readonly s3Uri: string
}

export interface SageMakerMachineLearningModelResourceDataProps {
  readonly destinationPath: string
  readonly ownerSetting?: DownloadOwnerSetting
  readonly sageMakerJobArn: string
}

export interface SecretsManagerSecretResourceDataProps {
  readonly additionalStagingLabelsToDownload?: Array<string>
  readonly arn: string
}

export class LocalDeviceResourceData implements ResourceDataContainerProps {
  readonly localDeviceResourceData: greengrass.CfnResourceDefinitionVersion.LocalDeviceResourceDataProperty
  constructor(props: LocalDeviceResourceDataProps) {
    this.localDeviceResourceData = props;
  }
}

export class LocalVolumeResourceData implements ResourceDataContainerProps {
  readonly localVolumeResourceData: greengrass.CfnResourceDefinitionVersion.LocalVolumeResourceDataProperty
  constructor(props: LocalVolumeResourceDataProps) {
    this.localVolumeResourceData = props;
  }
}

export class S3MachineLearningResourceData implements ResourceDataContainerProps {
  readonly s3MachineLearningModelResourceData: greengrass.CfnResourceDefinitionVersion.S3MachineLearningModelResourceDataProperty
  constructor(props: S3MachineLearningModelResourceDataProps) {
    this.s3MachineLearningModelResourceData = props;
  }
}

export class SageMakerMachineLearningModelResourceData implements ResourceDataContainerProps {
  readonly sageMakerMachineLearningModelResourceData: greengrass.CfnResourceDefinitionVersion.SageMakerMachineLearningModelResourceDataProperty
  constructor(props: SageMakerMachineLearningModelResourceDataProps) {
    this.sageMakerMachineLearningModelResourceData = props;
  }
}

export class SecretsManagerSecretResourceData implements ResourceDataContainerProps {
  readonly secretsManagerSecretResourceData: greengrass.CfnResourceDefinitionVersion.SecretsManagerSecretResourceDataProperty
  constructor(props: SecretsManagerSecretResourceDataProps) {
    this.secretsManagerSecretResourceData = props;
  }
}

export interface ResourceDefinitionProps {
  readonly name?: string,
  readonly tags?: Tags,
  readonly resources?: Array<ResourceProps>
}
