import { Stack, StackProps } from 'monocdk';
import { Construct } from 'constructs';
import * as delivlib from 'aws-delivlib';
import { BuildSpec } from 'monocdk/lib/aws-codebuild';

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new delivlib.Pipeline(this, 'ConsutructsPipeline', {
        repo: new delivlib.GitHubRepo({
            repository: 'philcali/philcali-cdk',
            tokenSecretArn: 'GITHUB_TOKEN_NAME'
        }),
        buildSpec: BuildSpec.fromObject({
          version: '0.2',
          phases: {
            install: {
              commands: [
                'cd device-lab',
                'npm install'
              ]
            },
            build: {
              commands: [
                'npm run build'
              ]
            }
          },
          artifacts: {
            'base-directory': 'device-lab/dist'
          }
        })
    });
  }
}
