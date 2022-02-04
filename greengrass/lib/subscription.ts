import * as greengrass from '@aws-cdk/aws-greengrass';
import * as cdk from '@aws-cdk/core';
import { IVersion } from '@aws-cdk/aws-lambda';
import { IConnector } from './connector';
import { Tags } from './tag';
import { lazyHash } from './hash';
import { ICertifiedThing } from '@philcali-cdk/iot';
import { isConnector, isThing, isVersion } from './types';

export interface ISubscriptionDefinition extends cdk.IResource {
  readonly definitionId: string;
  readonly definitionArn: string;
  readonly versionArn?: string;
}

export interface ISubscriptionDefinitionVersion extends cdk.Resource {
  readonly versionArn: string;
}

export interface SubscriptionDefinitionVersionProps {
  definition: ISubscriptionDefinition;
  subscriptions?: Array<SubscriptionProps>;
}

type SubscriptionLike = (
  greengrass.CfnSubscriptionDefinition.SubscriptionProperty |
  greengrass.CfnSubscriptionDefinitionVersion.SubscriptionProperty
);

function transformSubscription(scope: cdk.Construct, subscription: SubscriptionProps): SubscriptionLike {
  const source = subscriptionHandle(subscription.source);
  const target = subscriptionHandle(subscription.target);
  return {
    ...subscription,
    id: subscription.id || lazyHash([
      scope.node.id,
      subscription.subject,
      source,
      target
    ].join('-')),
    source,
    target
  };
}

export class SubscriptionDefinitionVersion extends cdk.Resource implements ISubscriptionDefinitionVersion {
  readonly versionArn: string;
  private subscriptions: Array<greengrass.CfnSubscriptionDefinitionVersion.SubscriptionProperty>

  constructor(scope: cdk.Construct, id: string, props: SubscriptionDefinitionVersionProps) {
    super(scope, id);
    this.subscriptions = [];
    if (props?.subscriptions) {
      props?.subscriptions.forEach(this.addSubscription.bind(this));
    }
    const version = new greengrass.CfnSubscriptionDefinitionVersion(this, 'Version', {
      subscriptionDefinitionId: props.definition.definitionId,
      subscriptions: this.subscriptions
    });
    this.versionArn = version.ref;
  }

  addSubscription(subscription: SubscriptionProps): SubscriptionDefinitionVersion {
    this.subscriptions.push(transformSubscription(this, subscription));
    return this;
  }
}

export class SubscriptionDefinition extends cdk.Resource implements ISubscriptionDefinition {
  readonly definitionId: string
  readonly definitionArn: string;
  readonly versionArn?: string;
  constructor(scope: cdk.Construct, id: string, props?: SubscriptionDefinitionProps) {
    super(scope, id);

    let initialVersion: greengrass.CfnSubscriptionDefinition.SubscriptionDefinitionVersionProperty | undefined;
    if (props?.subscriptions) {
      initialVersion = {
        subscriptions: props.subscriptions.map(sub => transformSubscription(this, sub))
      };
    }

    const definition = new greengrass.CfnSubscriptionDefinition(this, 'Defintiion', {
      name: props?.name || id,
      tags: props?.tags,
      initialVersion
    });
    this.definitionId = definition.ref;
    this.definitionArn = definition.attrArn;
    this.versionArn = definition.attrLatestVersionArn;
  }
}

export interface SubscriptionDefinitionProps {
  readonly name?: string
  readonly subscriptions?: Array<SubscriptionProps>,
  readonly tags?: Tags;
}

export enum Observable {
  IOT_CLOUD = "cloud",
  GG_SHADOW = "GGShadowService"
}

function subscriptionHandle(handle: SubscriptionHandle): string {
  if (isConnector(handle)) {
    return handle.connectorArn;
  } else if (isVersion(handle)) {
    return handle.functionArn;
  } else if (isThing(handle)) {
    return cdk.Stack.of(handle.thing).formatArn({
      service: 'iot',
      resource: 'thing',
      resourceName: handle.thing.thingName,
      sep: '/'
    });
  } else {
    return handle;
  }
}

export type SubscriptionHandle = (
  IConnector | IVersion | ICertifiedThing | Observable
);

export interface SubscriptionProps {
  readonly id?: string
  readonly subject: string
  readonly source: SubscriptionHandle,
  readonly target: SubscriptionHandle
}
