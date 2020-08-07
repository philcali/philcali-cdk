import * as greengrass from '@aws-cdk/aws-greengrass';
import * as cdk from '@aws-cdk/core';
import { Permission } from './function';
import { Tags } from './tag';

export interface IResourceDefinition {
  readonly name: string;
  readonly versionId: string;
  addResource(resource: ResourceProps): IResourceDefinition;
}

export class ResourceDefinition extends cdk.Resource implements IResourceDefinition {
  readonly name: string
  readonly versionId: string
  private resources: Array<greengrass.CfnResourceDefinitionVersion.ResourceInstanceProperty>

  constructor(scope: cdk.Resource, id: string, props?: ResourceDefinitionProps) {
    super(scope, id);
    this.resources = [];
    if (props?.resources) {
      props.resources.forEach(this.addResource.bind(this));
    }
    const definition = new greengrass.CfnResourceDefinition(this, 'Definition', {
      name: props?.name || id,
      tags: props?.tags
    });
    this.name = definition.ref;
    const version = new greengrass.CfnResourceDefinitionVersion(definition, 'Version', {
      resourceDefinitionId: definition.ref,
      resources: this.resources
    });
    this.versionId = version.ref;
  }

  addResource(resource: ResourceProps): IResourceDefinition {
    this.resources.push(resource);
    return this;
  }
}

export interface ResourceProps {
  readonly id: string
  readonly name: string
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
