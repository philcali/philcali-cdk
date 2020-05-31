import * as s3 from '@aws-cdk/aws-s3';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as route53 from '@aws-cdk/aws-route53';
import * as lambda from '@aws-cdk/aws-lambda';
import * as events from '@aws-cdk/aws-lambda-event-sources';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';

const INVALIDATE_CODE = `
const AWS = require('aws-sdk');
const cloudfront = new AWS.CloudFront();

exports.handler = (input, context, callback) => {
  const params = {
    DistributionId: process.env['CDN'],
    InvalidationBatch: {
      CallerReference: context.awsRequestId,
      Paths: {
        Quantity: 1,
        Items: [ '/*' ]
      }
    }
  };
  const json = JSON.stringify(input);
  console.log("Triggered by " + json);
  cloudfront.createInvalidation(params, (err, data) => {
    console.log("Invoked invalidation with params: " + json);
    callback(err, data);
  });
};
`;

export interface StaticWebsiteProps {
  readonly domainName: string;

  readonly certificate: acm.ICertificate;

  readonly hostedZone: route53.IHostedZone;
}

export class StaticWebsite extends cdk.Construct {

  readonly content: s3.Bucket;

  readonly distribution: cloudfront.CloudFrontWebDistribution;

  readonly invalidation: lambda.Function;

  readonly recordSet: route53.IRecordSet;

  constructor(scope: cdk.Construct, id: string, props: StaticWebsiteProps) {
    super(scope, id);

    this.invalidation = new lambda.Function(this, 'Invalidation', {
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromInline(INVALIDATE_CODE),
      timeout: cdk.Duration.minutes(1),
      memorySize: 128
    });

    this.content = new s3.Bucket(this, 'StaticWebsite', {
      cors: [{
        allowedOrigins: [ '*' ],
        allowedMethods: [
          s3.HttpMethods.GET,
          s3.HttpMethods.HEAD
        ]
      }],
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,
        blockPublicPolicy: true
      })
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI');

    this.distribution = new cloudfront.CloudFrontWebDistribution(this, 'StaticWebsiteCDN', {
      viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(props.certificate, {
        aliases: [ props.domainName ],
        securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_1_2016
      }),
      originConfigs: [{
        s3OriginSource: {
          s3BucketSource: this.content,
          originAccessIdentity
        },
        behaviors: [{ isDefaultBehavior: true }]
      }]
    });

    const stack = cdk.Stack.of(this.invalidation);

    this.invalidation.addEnvironment('CDN', this.distribution.distributionId);
    this.invalidation.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [ 'cloudfront:createInvalidation' ],
      resources: [ stack.formatArn({
        service: 'cloudfront',
        region: '',
        resource: `distribution/${this.distribution.distributionId}`,
        sep: ':'
      }) ]
    }));


    this.invalidation.addEventSource(new events.S3EventSource(this.content, {
      events: [ s3.EventType.OBJECT_CREATED ],
      filters: [{
        suffix: 'index.html'
      }]
    }));

    this.recordSet = new route53.CnameRecord(this, 'StaticWebsiteCNAME', {
      domainName: this.distribution.domainName,
      recordName: props.domainName,
      zone: props.hostedZone,
      ttl: cdk.Duration.minutes(5)
    });
  }
}
