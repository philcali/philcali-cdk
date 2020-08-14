import * as cdk from '@aws-cdk/core';
import { Connector } from '../connector';

export class IoTAnalytics extends Connector {
    public static VERSIONS = [ 3, 2, 1 ];
    public static LATEST_VERSION = IoTAnalytics.VERSIONS[0];

    constructor(scope: cdk.Construct, props: IoTAnalyticsProps) {
        super(scope, props.version, {
            'MemorySize': `${props.memorySize}`,
            'PublishRegion': props.publishRegion,
            'PublishInterval': props.publishInterval?.toString(),
            'IotAnalyticsMaxActiveChannels': props.maxActiveChannels?.toString(),
            'IotAnalyticsQueueDropBehavior': props.queueDropBehavior,
            'IotAnalyticsQueueSizePerChannel': props.queueSizePerChannel?.toString(),
            'IotAnalyticsBatchSizePerChannel': props.batchSizePerChannel?.toString(),
            'IotAnalyticsDefaultChannelName': props.defaultChannelName
        });
    }
}

export interface IoTAnalyticsProps {
    readonly version: number,
    readonly memorySize: number,
    readonly publishRegion?: string,
    readonly publishInterval?: number,
    readonly maxActiveChannels?: number,
    readonly queueDropBehavior?: QueueDropBehavior,
    readonly queueSizePerChannel?: number,
    readonly batchSizePerChannel?: number,
    readonly defaultChannelName?: string
}

export enum QueueDropBehavior {
    DROP_NEWEST = 'DROP_NEWEST',
    DROP_OLDEST = 'DROP_OLDEST'
}