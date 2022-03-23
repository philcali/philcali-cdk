# Device Lab Construct

This very simple construct definition supplies the control plane for the [device-pool][1] API.

## How to use it?

There are three core infrastructure concepts:

- DynamoDB Table: normalized table which stores all management information
- API Gateway: binds service code to an HTTP accessible REST API.
- Step Function: provision workflow is centralized

```
npm install @philcali-cdk/device-lab
```

In your CDK infra:

``` javascript
const deviceLab = new DeviceLab({
    serviceCode: // Pull in the jars from maven or other prior
    workflowCode: // Pull in the jars from maven or other prior
});
// Extend into your infrastructure using these generated resources
deviceLab.controlPlane // RestApi
deviceLab.table // Table
deviceLab.provisionWorkflow // StateMachine
deviceLab.invokeSteps // LambdaInvoke
```

## Installing Device Pools

The library supports managing device pool definitions as infrastructure.
This approach aligns quite nicely with using `MANAGED` or `UNMANAGED` pools
like that of an external source.

``` javascript
deviceLab.addDevicePool({
    name: 'pi-cameras',
    description: 'This is a device pool definition representing my cameras',
    poolType: DevicePoolType.MANAGED
});
```

## Integrations

An `UNMANAGED` device pool is one that hooks into the provisioning
workflow via a supported means like an `http` network call, or `Lambda`
function invocation. Adding a custom integration can be done with the
`LambdaDevicePoolIntegration` class.

``` javascript
let lambdaFunction = new Function(this, 'MyLambdaFunction', {
    // function args ...
});

deviceLab.addDevicePool({
    name: 'pi-cameras',
    poolType: DevicePoolType.UNMANAGED,
    integration: new LambdaDevicePoolIntegration({
        lambdaFunction
    })
})
```

Integrations are device pool independent. For example: one function may service multiple
device pool definitions.

``` javascript
let integration = new LambdaDevicePoolIntegration({
    lambdaFunction
});

deviceLab.addDevicePool({
    name: 'pool-1',
    integration
});

deviceLab.addDevicePool({
    name: 'pool-2',
    integration
})
```

### SSM Integration

Direct integration with SSM exists as a `Lambda`. This means that
a device pool construct is mapped to categorized nodes in an SSM fleet.
When clients through the control plane request provisioning, it'll return
adapted resources from SSM. Taking advantage of this integration is as
simple as using the `SSMDevicePoolIntegration`.

``` javascript
deviceLab.addDevicePool({
    name: 'pi-cameras',
    poolType: DevicePoolType.UNMANAGED,
    integration: new SSMDevicePoolIntegration(this, {
        locking: true,
        lockingDuration: Duration.seconds(30),
        code // Pull in the jars from maven or some other source
    })
})
```

[1]: https://github.com/philcali/device-pool

## How to build it

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests