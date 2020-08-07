import * as greengrass from '@aws-cdk/aws-greengrass';
import * as cdk from '@aws-cdk/core';
import * as iot from '@philcali-cdk/iot';
import { IVersion } from '@aws-cdk/aws-lambda';
import { ConnectorProps } from './connector';

export interface ISubscriptionDefinition extends cdk.IResource {
  readonly name: string;
  readonly versionId: string;
  addSubscription(subscription: SubscriptionProps): ISubscriptionDefinition;
}

export class SubscriptionDefinition extends cdk.Resource implements ISubscriptionDefinition {
  readonly name: string
  readonly versionId: string;
  private subscriptions: Array<greengrass.CfnSubscriptionDefinitionVersion.SubscriptionProperty>

  constructor(scope: cdk.Resource, id: string, props?: SubscriptionDefinitionProps) {
    super(scope, id);
    this.subscriptions = [];
    if (props?.subscriptions) {
      props?.subscriptions.forEach(this.addSubscription.bind(this));
    }
    const definition = new greengrass.CfnSubscriptionDefinition(this, 'Defintiion', {
      name: props?.name || id
    });
    this.name = definition.ref;

    const version = new greengrass.CfnSubscriptionDefinitionVersion(definition, 'Version', {
      subscriptionDefinitionId: this.name,
      subscriptions: this.subscriptions
    });
    this.versionId = version.ref;
  }

  addSubscription(subscription: SubscriptionProps): ISubscriptionDefinition {
    this.subscriptions.push({
      ...subscription,
      source: subscription.source.subscriptionHandle(),
      target: subscription.source.subscriptionHandle()
    });
    return this;
  }
}

export interface SubscriptionDefinitionProps {
  readonly name?: string
  readonly subscriptions?: Array<SubscriptionProps>
}

export enum Observable {
  IOT_CLOUD = "cloud",
  GG_SHADOW = "GGShadowService"
}

export interface IMQTTEntity {
  subscriptionHandle(): string
}

export class AWSMQTTEntity implements IMQTTEntity {
  private observable: string;
  constructor(observable: Observable) {
    this.observable = observable;
  }

  subscriptionHandle() {
    return this.observable;
  }
}

export class LambdaMQTTEntity implements IMQTTEntity {
  private lambda: IVersion
  constructor(lambda: IVersion) {
    this.lambda = lambda;
  }

  subscriptionHandle() {
    return `${this.lambda.functionArn}:${this.lambda.version}`
  }
}

export class ThingMQTTEntity implements IMQTTEntity {
  private device: iot.ICertifiedThing
  constructor(device: iot.ICertifiedThing) {
    this.device = device;
  }

  subscriptionHandle() {
    const stack = cdk.Stack.of(this.device.thing);
    return stack.formatArn({
      service: 'iot',
      resource: 'thing',
      resourceName: this.device.thing.thingName,
      sep: '/'
    });
  }
}

export class ConnectorMQTTEntity implements IMQTTEntity {
  private connector: ConnectorProps
  constructor(connector: ConnectorProps) {
    this.connector = connector;
  }

  subscriptionHandle() {
    return this.connector.connectorArn;
  }
}

export interface SubscriptionProps {
  readonly id: string
  readonly subject: string
  readonly source: IMQTTEntity
  readonly target: IMQTTEntity
}
