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

[1]: https://github.com/philcali/device-pool

## How to build it

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests