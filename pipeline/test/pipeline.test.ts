import * as cdk from 'monocdk';
import { Template } from 'monocdk/assertions';
import * as pipeline from '../lib/pipeline-stack';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/pipeline-stack.ts
test('SQS Queue Created', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new pipeline.PipelineStack(app, 'MyTestStack');
    // THEN
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
    });
});
