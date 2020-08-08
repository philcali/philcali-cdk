# AWS Greengrass

Simple CDK bindings for AWS Greengrass for small scale device configuration.

## Example

### Basic Bindings

```
import * as iot from '@philcali-cdk/iot';
import * as greengrass from '@philcali-cdk/greengrass';

// Attach the Greengrass service role to account
const servieRole = new greengrass.GreengrassServiceRole(stack, 'GGServiceRole', {
  attachToAccount: true
});

// Create a Thing certificate provider
const certificates: ICertificateAuthority;

// Create a couple of ThingPools
const corePool = new iot.ThingPool(stack, 'Core', {
  certificates,
  document: new greengrass.CoreBasePolicyDocument(stack)
});

const devicePool = new iot.ThingPool(stack, 'Device', {
  certificates,
  document: new greengrass.DeviceBasePolicyDocument(stack)
});

// Create your things
const core = corePool.create('SmartHome');
const motionSensor = devicePool.create('MotionSensor');
const camera = devicePool.create('Camera');

// Create some other cloud resources like SNS
const motionNotifications = new sns.Topic(stack, 'MotionNotifications');

// Optional: SNS connector integration
const snsConnector = new greengrass.SNS({
  version: greengrass.SNS.LATEST_VERSION,
  defaultSNSArn: topic.ref
})

// Optional: Lambda edge function
const messageTransformer = new lambda.Function(stack, 'MessageTransformer', {
  // ... it's things
});
const messageTransformerVersion = new lambda.Version(stack, 'MessageTransformer', {
  lambda: messageTransformer
});

// Associate to Greengrass
const group = new greengrass.Group(stack, 'SmartHomeGroup', {
  core,
  devices: [ motionSensor, camera ],
  connectors: [ snsConnector ],
  functions: [{
    version: messageTransformerVersion,
    config: {
      timeout: cdk.Duration.seconds(15)
    }
  }],
  subscriptions: [{
    subject: 'home/motion',
    source: motionSensor,
    target: camera
  }, {
    subject: 'home/motion/captured',
    source: camera,
    target: messageTransformerVersion
  }, {
    subject: 'sns/message',
    source: messageTransformerVersion,
    target: snsConnector
  }]
});
```
