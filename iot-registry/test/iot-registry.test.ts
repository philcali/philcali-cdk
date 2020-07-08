import { expect as expectCDK, haveResource, SynthUtils } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as iot from '../lib/index';

test('IoT Registry', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "TestStack");
  // WHEN
  const things = [
    new iot.Thing(stack, 'Thing1'),
    new iot.Thing(stack, 'Thing2')
  ];

  const sharedCert = iot.Certificate.fromCertificateArn(stack, 'SharedCert', 'abc-123');
  const sharedPolicy = iot.Policy.fromPolicyName(stack, 'SharedPolicy', 'policy-name');

  sharedCert.attachToPolicy(sharedPolicy);
  things.forEach(thing => {
    sharedCert.attachToThing(thing)
  });

  // THEN
  expectCDK(stack).to(haveResource("AWS::IoT::Thing"));
  expectCDK(stack).to(haveResource("AWS::IoT::PolicyPrincipalAttachment"));
  expectCDK(stack).to(haveResource("AWS::IoT::ThingPrincipalAttachment"));
});

test('IoT S3 Certificate Storage', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "TestStack");
  // WHEN
  const destination = new s3.Bucket(stack, 'Bucket');
  const certificates = new iot.S3CertificateAuthority(stack, 'Provider', {
    destination
  });

  const things = new iot.ThingPool(stack, 'BasePool', {
    certificates,
    document: new iam.PolicyDocument({
      statements: [new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [ 's3:*' ],
        resources: [ '*' ]
      })]
    })
  });

  [1, 2, 3].forEach(number => {
    const thing: iot.ICertifiedThing = things.create(`Thing${number}`);
  });

  // THEN
  expectCDK(stack).to(haveResource("AWS::IoT::Thing"));
  expectCDK(stack).to(haveResource("AWS::S3::Bucket"));
  expectCDK(stack).to(haveResource("AWS::Lambda::Function"));
  expectCDK(stack).to(haveResource("AWS::IAM::Role"));
  expectCDK(stack).to(haveResource("AWS::Iot::Policy"));
  expectCDK(stack).to(haveResource("AWS::IoT::PolicyPrincipalAttachment"));
  expectCDK(stack).to(haveResource("AWS::IoT::ThingPrincipalAttachment"));
  expectCDK(stack).to(haveResource("AWS::CloudFormation::CustomResource"));
});

