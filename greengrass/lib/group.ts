import * as iam from '@aws-cdk/aws-iam';
import * as greengrass from '@aws-cdk/aws-greengrass';
import * as cdk from '@aws-cdk/core';
import { Tags } from './tag';
import { CoreDefinition, ICoreDefinition, ICoreDefintiionVersion } from './core';
import { DeviceDefinition, IDeviceDefinition, IDeviceDefinitionVersion } from './devices';
import { ConnectorDefinition, IConnector, IConnectorDefinition, IConnectorDefinitionVersion } from './connector';
import { FunctionDefinition, FunctionProps, IFunctionDefinition, IFunctionDefinitionVersion } from './function';
import { ILoggerDefinition, ILoggerDefinitionVersion, LoggerDefinition, LoggerProps } from './logger';
import { IResourceDefinition, IResourceDefinitionVersion, ResourceDefinition, ResourceProps } from './resource';
import { ISubscriptionDefinition, ISubscriptionDefinitionVersion, SubscriptionDefinition, SubscriptionProps } from './subscription';
import { isArrayType, isConnector, isFunction, isGreengrassThing, isLogger, isResource, isSubscription, isThing } from './types';
import { GreengrassDevice } from './thing';

export interface IGroup extends cdk.IResource {
  readonly groupId: string;
  readonly groupArn: string;
  readonly versionArn?: string;
}

export interface IGroupVersion extends cdk.IResource {
  readonly versionArn: string;
}

type CoreType = (
  GreengrassDevice | ICoreDefinition | ICoreDefintiionVersion
);

type DeviceType = (
  Array<GreengrassDevice> | IDeviceDefinition | IDeviceDefinitionVersion
);

type ConnectorType = (
  Array<IConnector> | IConnectorDefinition | IConnectorDefinitionVersion
);

type FunctionType = (
  Array<FunctionProps> | IFunctionDefinition | IFunctionDefinitionVersion
);

type LoggerType = (
  Array<LoggerProps> | ILoggerDefinition | ILoggerDefinitionVersion
);

type ResourceType = (
  Array<ResourceProps> | IResourceDefinition | IResourceDefinitionVersion
);

type SubscriptionType = (
  Array<SubscriptionProps> | ISubscriptionDefinition | ISubscriptionDefinitionVersion
);

export interface GreengrassCollectiveProps {
  readonly core?: CoreType,
  readonly devices?: DeviceType,
  readonly connectors?: ConnectorType,
  readonly functions?: FunctionType,
  readonly loggers?: LoggerType,
  readonly resources?: ResourceType,
  readonly subscriptions?: SubscriptionType
}

export interface GroupProps extends GreengrassCollectiveProps{
  readonly name?: string;
  readonly role?: iam.IRole;
  readonly tags?: Tags;
}

export interface GroupVersionProps extends GreengrassCollectiveProps {
  readonly group: IGroup
}

function coreVersionArn(scope: cdk.Construct, core?: CoreType): string | undefined {
  if (core && (isGreengrassThing(core) || isThing(core))) {
    return new CoreDefinition(scope, 'Core', { core }).versionArn;
  }
  return core?.versionArn;
}

function deviceVersionArn(scope: cdk.Construct, devices?: DeviceType): string | undefined {
  if (isArrayType(devices, device => (isThing(device) || isGreengrassThing(device)))) {
    return new DeviceDefinition(scope, 'Devices', { devices }).versionArn;
  }
  return devices?.versionArn;
}

function connectorVersionArn(scope: cdk.Construct, connectors?: ConnectorType): string | undefined {
  if (isArrayType(connectors, isConnector)) {
    return new ConnectorDefinition(scope, 'Connectors', { connectors }).versionArn;
  }
  return connectors?.versionArn;
}

function functionVersionArn(scope: cdk.Construct, functions?: FunctionType): string | undefined {
  if (isArrayType(functions, isFunction)) {
    return new FunctionDefinition(scope, 'Functions', { functions }).versionArn;
  }
  return functions?.versionArn;
}

function loggerVersionArn(scope: cdk.Construct, loggers?: LoggerType): string | undefined {
  if (isArrayType(loggers, isLogger)) {
    return new LoggerDefinition(scope, 'Loggers', { loggers }).versionArn;
  }
  return loggers?.versionArn;
}

function resourceVersionArn(scope: cdk.Construct, resources?: ResourceType): string | undefined {
  if (isArrayType(resources, isResource)) {
    return new ResourceDefinition(scope, 'Resources', { resources }).versionArn;
  }
  return resources?.versionArn;
}

function subscriptionVersionArn(scope: cdk.Construct, subscriptions?: SubscriptionType): string | undefined {
  if (isArrayType(subscriptions, isSubscription)) {
    return new SubscriptionDefinition(scope, 'Subscriptions', { subscriptions }).versionArn;
  }
  return subscriptions?.versionArn;
}

export class Group extends cdk.Resource implements IGroup {
  readonly groupId: string;
  readonly groupArn: string;
  readonly versionArn?: string;
  
  constructor(scope: cdk.Construct, id: string, props?: GroupProps) {
    super(scope, id);

    let initialVersion: greengrass.CfnGroup.GroupVersionProperty | undefined;
    if (props?.core) {
      initialVersion = {
        coreDefinitionVersionArn: coreVersionArn(this, props.core),
        deviceDefinitionVersionArn: deviceVersionArn(this, props.devices),
        connectorDefinitionVersionArn: connectorVersionArn(this, props.connectors),
        functionDefinitionVersionArn: functionVersionArn(this, props.functions),
        loggerDefinitionVersionArn: loggerVersionArn(this, props.loggers),
        resourceDefinitionVersionArn: resourceVersionArn(this, props.resources),
        subscriptionDefinitionVersionArn: subscriptionVersionArn(this, props.subscriptions)
      };
    }

    const group = new greengrass.CfnGroup(this, 'Group', {
      name: props?.name || id,
      roleArn: props?.role?.roleArn,
      tags: props?.tags,
      initialVersion
    });

    this.groupArn = group.attrArn;
    this.groupId = group.attrId;
    this.versionArn = group.attrLatestVersionArn;
  }
}

export class GroupVersion extends cdk.Resource implements IGroupVersion {
  readonly versionId: string;
  readonly versionArn: string;
  constructor(scope: cdk.Construct, id: string, props: GroupVersionProps) {
    super(scope, id);
    const version = new greengrass.CfnGroupVersion(this, 'Version', {
      groupId: props.group.groupId,
      coreDefinitionVersionArn: coreVersionArn(this, props.core),
      deviceDefinitionVersionArn: deviceVersionArn(this, props.devices),
      connectorDefinitionVersionArn: connectorVersionArn(this, props.connectors),
      functionDefinitionVersionArn: functionVersionArn(this, props.functions),
      loggerDefinitionVersionArn: loggerVersionArn(this, props.loggers),
      resourceDefinitionVersionArn: resourceVersionArn(this, props.resources),
      subscriptionDefinitionVersionArn: subscriptionVersionArn(this, props.subscriptions)
    });
    this.versionId = version.attrId;
    this.versionArn = version.attrArn;
  }
}