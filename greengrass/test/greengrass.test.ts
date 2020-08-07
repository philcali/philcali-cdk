import { expect as expectCDK, haveResource, SynthUtils } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as greengrass from '../lib/index';

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
