import * as iam from '@aws-cdk/aws-iam';
import * as greengrass from '@aws-cdk/aws-greengrass';
import * as cdk from '@aws-cdk/core';
import { ICoreDefinition } from './core';
import { IConnectorDefinitionVersion } from './connector';
import { IDeviceDefinition } from './devices';
import { ILoggerDefinition } from './logger';
import { IResourceDefinition } from './resource';
import { IFunctionDefinition } from './function';
import { ISubscriptionDefinition } from './subscription';
import { Tags } from './tag';

export interface IGroup extends cdk.IResource {
  readonly id: string;
  addVersion(props?: AddGroupVersionProps): IGroupVersion;
}

export interface IGroupVersion extends cdk.IResource {
  readonly versionId: string;
  addCore(core: ICoreDefinition): IGroupVersion;
  addDevices(devices: IDeviceDefinition): IGroupVersion;
  addLoggers(loggers: ILoggerDefinition): IGroupVersion;
  addConnectors(connectors: IConnectorDefinitionVersion): IGroupVersion;
  addResources(resources: IResourceDefinition): IGroupVersion;
  addSubscriptions(subscriptions: ISubscriptionDefinition): IGroupVersion;
  addFunctions(functions: IFunctionDefinition): IGroupVersion;
}

export interface AddGroupVersionProps {
  core?: ICoreDefinition;
  devices?: IDeviceDefinition;
  loggers?: ILoggerDefinition;
  connectors?: IConnectorDefinitionVersion;
  resources?: IResourceDefinition;
  subscriptions?: ISubscriptionDefinition;
  functions?: IFunctionDefinition;
}

export interface GroupVersionProps extends AddGroupVersionProps {
  id: string;
}

export interface GroupProps {
  readonly name?: string;
  readonly role: iam.IRole;
  readonly tags?: Tags;
}

export class Group extends cdk.Resource implements IGroup {
  readonly id: string;

  constructor(scope: cdk.Resource, id: string, props: GroupProps) {
    super(scope, id);

    const group = new greengrass.CfnGroup(this, 'Group', {
      name: props.name || id,
      roleArn: props.role.roleArn,
      tags: props.tags
    });
    this.id = group.ref;
  }

  addVersion(props: AddGroupVersionProps): IGroupVersion {
    return new GroupVersion(this, 'Version', {...props,
      id: this.id
    });
  }
}

class MutableGroupVersionProps implements greengrass.CfnGroupVersionProps {
  readonly groupId: string;
  coreDefinitionVersionArn?: string;
  deviceDefinitionVersionArn?: string;
  loggerDefinitionVersionArn?: string;
  connectorDefinitionVersionArn?: string;
  resourceDefinitionVersionArn?: string;
  functionDefinitionVersionArn?: string;
  subscriptionDefinitionVersionArn?: string;

  constructor(props: GroupVersionProps) {
    this.groupId = props.id;
    this.coreDefinitionVersionArn = props.core?.versionId
    this.deviceDefinitionVersionArn = props.devices?.versionId
    this.loggerDefinitionVersionArn = props.loggers?.versionId
    this.connectorDefinitionVersionArn = props.connectors?.versionId
    this.resourceDefinitionVersionArn = props.resources?.versionId
    this.functionDefinitionVersionArn = props.functions?.versionId
    this.subscriptionDefinitionVersionArn = props.subscriptions?.versionId
  }
}

export class GroupVersion extends cdk.Resource implements IGroupVersion {
  readonly versionId: string;
  private mutableProps: MutableGroupVersionProps;

  constructor(scope: cdk.Resource, id: string, props: GroupVersionProps) {
    super(scope, id);
    this.mutableProps = new MutableGroupVersionProps(props);
    const version = new greengrass.CfnGroupVersion(this, 'Version', this.mutableProps);
    this.versionId = version.ref;
  }

  addCore(core: ICoreDefinition): IGroupVersion {
    this.mutableProps.coreDefinitionVersionArn = core.versionId;
    return this;
  }

  addFunctions(functions: IFunctionDefinition): IGroupVersion {
    this.mutableProps.functionDefinitionVersionArn = functions.versionId;
    return this;
  }

  addDevices(devices: IDeviceDefinition): IGroupVersion {
    this.mutableProps.deviceDefinitionVersionArn = devices.versionId;
    return this;
  }

  addResources(resources: IResourceDefinition): IGroupVersion {
    this.mutableProps.resourceDefinitionVersionArn = resources.versionId;
    return this;
  }

  addLoggers(loggers: ILoggerDefinition): IGroupVersion {
    this.mutableProps.loggerDefinitionVersionArn = loggers.versionId;
    return this;
  }

  addConnectors(connectors: IConnectorDefinitionVersion): IGroupVersion {
    this.mutableProps.connectorDefinitionVersionArn = connectors.versionId;
    return this;
  }

  addSubscriptions(subscriptions: ISubscriptionDefinition): IGroupVersion {
    this.mutableProps.subscriptionDefinitionVersionArn = subscriptions.versionId;
    return this;
  }
}
