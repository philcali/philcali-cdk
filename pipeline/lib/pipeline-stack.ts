import * as path from 'path';
import { Construct, Stack, StackProps } from 'monocdk';
import * as delivlib from 'aws-delivlib';
import { BuildSpec, LinuxBuildImage, Project } from 'monocdk/lib/aws-codebuild';
import { Bucket, IBucket } from 'monocdk/lib/aws-s3';
import { Secret } from 'monocdk/lib/aws-secretsmanager';
import { Artifact, IStage } from 'monocdk/lib/aws-codepipeline';
import { AddToPipelineOptions, IPublisher, LinuxPlatform, Shellable } from 'aws-delivlib';
import { IRole } from 'monocdk/lib/aws-iam';
import { CodeBuildAction } from 'monocdk/lib/aws-codepipeline-actions';

interface PublishToS3Props {
  bucket: IBucket;
  public?: boolean;
  dryRun?: boolean;
  sourceDirectory?: string;
}

class PublishToS3 extends Construct implements IPublisher {
  public readonly role?: IRole;
  public readonly project: Project;

  constructor(scope: Construct, id: string, props: PublishToS3Props) {
    super(scope, id);

    const forReal = props.dryRun === undefined ? 'false' : (!props.dryRun).toString();

    const shellable = new Shellable(this, 'Default', {
      platform: new LinuxPlatform(LinuxBuildImage.UBUNTU_14_04_NODEJS_8_11_0),
      scriptDirectory: path.join(__dirname, 'publishing', 's3'),
      entrypoint: 'publish.sh',
      environment: {
        BUCKET_URL: `s3://${props.bucket.bucketName}`,
        CHANGELOG: props.public ? 'true' : 'false',
        SOURCE_DIRECTORY: props.sourceDirectory || '.',
        FOR_REAL: forReal,
      },
    });

    // Allow script to write to bucket
    if (shellable.role) {
      props.bucket.grantReadWrite(shellable.role);
    }

    this.role = shellable.role;
    this.project = shellable.project;
  }

  public addToPipeline(stage: IStage, id: string, options: AddToPipelineOptions): void {
    stage.addAction(new CodeBuildAction({
      actionName: id,
      input: options.inputArtifact || new Artifact(),
      runOrder: options.runOrder,
      project: this.project,
    }));
  }
}

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucket = Bucket.fromBucketName(this, 'ArtifactBucket', 'philcali-artifact-repo');
    const npmSecret = Secret.fromSecretNameV2(this, 'NPMTokenSecret', 'NPM_AUTOMATION_PUBLISH');
    const dryRun = false;

    const pipeline = new delivlib.Pipeline(this, 'ConsutructsPipeline', {
      dryRun,
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
              'npm run build',
              'npm run package',
              'mkdir -p dist/personal-maven/maven/release',
              'cp -r dist/java/* dist/personal-maven/maven/release'
            ]
          }
        },
        artifacts: {
          files: [
            '**/*'
          ],
          'base-directory': 'device-lab/dist'
        }
      })
    });

    pipeline.publishToNpm({
      npmTokenSecret: {
        secretArn: npmSecret.secretArn + "-ar7ftL",
      }
    });

    const personalMavenPublishing = new PublishToS3(this, 'PersonalMaven', {
      bucket,
      sourceDirectory: 'personal-maven',
      dryRun
    });
    pipeline.addPublish(personalMavenPublishing);
  }
}
