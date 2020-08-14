import * as cdk from '@aws-cdk/core';
import { Connector } from '../connector';

export class DockerApplicationDeployment extends Connector {
    public static VERSIONS = [ 5, 4, 3, 2, 1 ];
    public static LATEST_VERSION = DockerApplicationDeployment.VERSIONS[0];

    public static OUTPUT_TOPICS = {
        MESSAGE_STATUS: 'dockerapplicationdeploymentconnector/message/status'
    };

    constructor(scope: cdk.Construct, props: DockerApplicationDeploymentProps) {
        super(scope, props.version, {
            'DockerComposeFileS3Bucket': props.dockerComposeFileS3Bucket,
            'DockerComposeFileS3Key': props.dockerComposeFileS3Key,
            'DockerComposeFileS3Version': props.dockerComposeFileS3Version,
            'DockerComposeFileDestinationPath': props.dockerComposeFileDestinationPath,
            'DockerUserId': props.dockerUserId?.toString(),
            'AWSSecretsArnList': props.awsSecretsArnList ? `[${props.awsSecretsArnList.map(arn => `"${arn}"`).join(',')}]` : null,
            'DockerContainerStatusLogFrequency': props.dockerContainerStatusLogFrequency,
            'ForceDeploy': props.forceDeploy ? `${props.forceDeploy}` : null,
            'DockerPullBeforeUp': props.dockerPullBeforeUp ? `${props.dockerPullBeforeUp}` : null
        });
    }
}

export interface DockerApplicationDeploymentProps {
    readonly version: number,
    readonly dockerComposeFileS3Bucket: string,
    readonly dockerComposeFileS3Key: string,
    readonly dockerComposeFileS3Version?: string,
    readonly dockerComposeFileDestinationPath: string,
    readonly dockerUserId?: number,
    readonly awsSecretsArnList?: Array<string>,
    readonly dockerContainerStatusLogFrequency?: string,
    readonly forceDeploy?: boolean,
    readonly dockerPullBeforeUp?: boolean
}