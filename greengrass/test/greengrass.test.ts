import { expect as expectCDK, haveResource, SynthUtils } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as greengrass from '../lib/index';
import * as iot from '@philcali-cdk/iot';
import * as s3 from '@aws-cdk/aws-s3';

test('Greengrass service role attached', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "TestStack");
  // WHEN
  new greengrass.GreengrassServiceRole(stack, 'ServiceRole', {
    attachToAccount: true
  });
  // THEN
  expectCDK(stack).to(haveResource("AWS::IAM::Role"));
  expectCDK(stack).to(haveResource("AWS::Lambda::Function"));
});

test('Greengrass basic group', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "TestStack");
  // WHEN
  const group = new greengrass.Group(stack, 'Group');
  // THEN
  expectCDK(stack).to(haveResource("AWS::Greengrass::Group"));
  expectCDK(stack).notTo(haveResource("AWS::IoT::Thing"));
  expectCDK(stack).notTo(haveResource("AWS::Greengrass::GroupVersion"));
});

test('Greengrass group core and device definition', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "TestStack");
  // WHEN
  const destination = new s3.Bucket(stack, 'Bucket');
  const certificates = new iot.S3CertificateAuthority(stack, 'ThingCertAuthority', {
    destination,
  });
  const corePool = new iot.ThingPool(stack, 'CorePool', {
    document: new greengrass.CoreBasePolicyDocument(stack),
    certificates 
  });
  const devicePool = new iot.ThingPool(stack, 'DevicePool', {
    document: new greengrass.DeviceBasePolicyDocument(stack),
    certificates
  });
  const pingDevice = devicePool.create('EdgeDeviceA');
  const pongDevice = devicePool.create('EdgeDeviceB');
  const group = new greengrass.Group(stack, 'Group', {
    core: corePool.create('CoreDevice'),
    devices: [ pingDevice, { syncShadow: true, device: pongDevice } ],
    subscriptions: [{
      source: pingDevice,
      target: pongDevice,
      subject: 'ping'
    }, {
      subject: 'pong',
      source: pongDevice,
      target: pingDevice
    }]
  });
  // THEN
  expectCDK(stack).to(haveResource("AWS::Greengrass::Group"));
  expectCDK(stack).to(haveResource("AWS::IoT::Thing"));
  expectCDK(stack).to(haveResource("AWS::Greengrass::CoreDefinition"));
  expectCDK(stack).to(haveResource("AWS::Greengrass::DeviceDefinition"));
  expectCDK(stack).to(haveResource("AWS::Greengrass::SubscriptionDefinition"));
});