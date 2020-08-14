import * as s3 from '@aws-cdk/aws-s3';
import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam';
import * as custom from '@aws-cdk/custom-resources';
import * as cdk from '@aws-cdk/core';
import * as path from 'path';
import { ICertificateAuthority, ICertificate, Certificate } from './certificate';

export interface S3CertificateAuthorityProps {
  destination: s3.IBucket;
  memorySize?: number;
  timeout?: cdk.Duration;
}

export class S3CertificateAuthority extends cdk.Resource implements ICertificateAuthority {
  private certificateAuthorityProvider: custom.Provider;

  constructor(scope: cdk.Construct, id: string, props: S3CertificateAuthorityProps) {
    super(scope, id);
    const certificateAuthorityFunction = new lambda.Function(this, 'Function', {
      code: new lambda.AssetCode(path.dirname(__filename) + '/certs'),
      runtime: lambda.Runtime.PYTHON_3_7,
      memorySize: props.memorySize || 128,
      handler: 'index.handler',
      timeout: props.timeout || cdk.Duration.minutes(5)
    });

    certificateAuthorityFunction.addEnvironment('BucketName', props.destination.bucketName);
    certificateAuthorityFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'iot:createKeysAndCertificate',
        'iot:updateCertificate',
        'iot:deleteCertificate'
      ],
      resources: [ '*' ]
    }));
    certificateAuthorityFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:putObject'
      ],
      resources: [ `${props.destination.bucketArn}/certs/*` ]
    }));

    this.certificateAuthorityProvider = new custom.Provider(this, 'Provider', {
      onEventHandler: certificateAuthorityFunction
    });
  }

  certify(scope: cdk.IConstruct): ICertificate {
    const customCertificate = new cdk.CustomResource(this, scope.node.id, {
      serviceToken: this.certificateAuthorityProvider.serviceToken,
      properties: {
        'ThingName': scope.node.path
      }
    });
    return Certificate.fromCertificateArn(customCertificate, 'Import', customCertificate.getAttString('CertificateArn'));
  }
}

