# IoT

Simply CDK bindings for IoT for small scale thing registration.

## Example

### Basic Bindings

```
import * as iot from '@philcali-cdk/iot';

// Simply create a thing
const thing = new Thing(stack, 'MyThing');
// Add attribute
thing.addAttribute("key", "value");

// Simply create a cert
const cert = new Certificate(thing, 'Cert', {
  status: 'ACTIVE',
  certificateSigningRequest: csr
});

// Simply create a policy
const policy = new Policy(cert, 'Policy', {
  policyName: thing.thingName + '_policy',
  policyDocument: new iam.PolicyDocument({
    statements: [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [ 's3:*' ],
        resources: [ '*' ]
      })
    ]
  })
});

// Attach to a policy
cert.attachToPolicy(policy);
// Attach to a thing
const certifiedThing = thing.attachToCertificate(cert);
```

### Certificate Authority

```
import * as iot from '@philcali-cdk/iot';

const certificateAuthority = ... // Use a resource as a cert generator

// Certify a cert for a construct in the tree (like a thing or a pool)
// This creates a cert for the stack
const cert = certificateAuthority.certify(stack);
const thing = cert.attachToThing(new Thing(stack, 'Thing'));
```

### Thing Pool

Use CDK's Construct concept to group resources together, ideal for
grouping thing policies.

```
import * as iot from '@philcali-cdk/iot';

const certificates = ... // Use a resource as a cert generator
const document = new iam.PolicyDocument({
  statements: [
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [ 's3:*' ],
      resources: [ '*' ]
    })
  ]
});

const thingPool = new ThingPool(stack, 'ThingPool', { certificates, document });

const thing = thingPool.create('Thing1');
```
