import { IVersion } from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import * as iot from '@philcali-cdk/iot';
import { IConnector } from "./connector";
import { FunctionProps } from './function';
import { lazyHash } from './hash';
import { LoggerProps } from './logger';
import { ResourceProps } from './resource';
import { SubscriptionProps } from './subscription';
import { DeviceLike, GreengrassDevice, IGreengrassThing } from './thing';


export function isConnector(connector: any): connector is IConnector {
    return (connector as IConnector).connectorArn !== undefined;
};

export function isThing(device: any): device is iot.ICertifiedThing {
    return (device as iot.ICertifiedThing).thing !== undefined;
}

export function isVersion(version: any): version is IVersion {
    return (version as IVersion).version !== undefined;
};

export function isGreengrassThing(thing: any): thing is IGreengrassThing {
    return (thing as IGreengrassThing).device !== undefined;
}

export function isArrayType<T>(t: any, pred: (a: T) => boolean): t is Array<T> {
    return t && t instanceof Array && (pred(t[0]));
};

export function isFunction(func: any): func is FunctionProps {
    return (func as FunctionProps).version !== undefined;
};

export function isLogger(logger: any): logger is LoggerProps {
    return (logger as LoggerProps).type !== undefined;
};

export function isResource(resource: any): resource is ResourceProps {
    return (resource as ResourceProps).name !== undefined;
};

export function isSubscription(subscription: any): subscription is SubscriptionProps {
    return (subscription as SubscriptionProps).source !== undefined;
};

export function transformDevice(scope: cdk.Construct, thing: GreengrassDevice): DeviceLike {
    let device: iot.ICertifiedThing;
    let syncShadow: boolean | undefined;
    if (isGreengrassThing(thing)) {
      device = thing.device;
      syncShadow = thing.syncShadow;
    } else {
      device = thing;
    }
    return {
      syncShadow,
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