import * as cdk from '@aws-cdk/core';
import { Connector } from '../connector';
import { IsolationMode } from '../function';

export class CloudWatchMetrics extends Connector {
    public static VERSIONS = [ 4, 3, 2, 1 ];
    public static LATEST_VERSION = CloudWatchMetrics.VERSIONS[0];

    public static INPUT_TOPICS = {
        METRIC_PUT: 'cloudwatch/metric/put'
    };

    public static OUTPUT_TOPICS = {
        METRIC_PUT_STATUS: 'cloudwatch/metric/put/status'
    }

    constructor(scope: cdk.Construct, props: CloudWatchMetricsProps) {
        super(scope, props.version, {
            'PublishInterval': `${props.publishInterval}`,
            'PublishRegion': props.publishRegion,
            'MemorySize': `${props.memorySize}`,
            'MaxMetricsToRetain': `${props.maxMetricsToRetain}`,
            'IsolationMode': props.isolationMode
        });
    }
}

export interface CloudWatchMetricsProps {
    readonly version: number;
    readonly publishInterval: number;
    readonly publishRegion?: string;
    readonly memorySize: number;
    readonly maxMetricsToRetain: number,
    readonly isolationMode?: IsolationMode
}