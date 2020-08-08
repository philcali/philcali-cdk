import * as cdk from '@aws-cdk/core';
import * as greengrass from '@aws-cdk/aws-greengrass';
import { Tags } from './tag';
import { lazyHash } from './hash';

export interface ILoggerDefinition extends cdk.IResource {
  readonly definitionId: string
  readonly definitionArn: string
  readonly versionArn?: string;
}

export interface ILoggerDefinitionVersion extends cdk.IResource {
  readonly versionArn: string;
}

export interface LoggerDefinitionVersionProps {
  readonly definition: ILoggerDefinition;
  readonly loggers?: Array<LoggerProps>;
}

type LoggerLike = (
  greengrass.CfnLoggerDefinition.LoggerProperty |
  greengrass.CfnLoggerDefinitionVersion.LoggerProperty
);

function transformLogger(scope: cdk.Construct, logger: LoggerProps): LoggerLike {
  return {
    ...logger,
    id: logger.id || lazyHash(`${scope.node.id}-${logger.component}-${logger.type}`)
  };
}

export class LoggerDefinitionVersion extends cdk.Resource implements ILoggerDefinitionVersion {
  readonly versionArn: string;
  private loggers: Array<greengrass.CfnLoggerDefinitionVersion.LoggerProperty>

  constructor(scope: cdk.Construct, id: string, props: LoggerDefinitionVersionProps) {
    super(scope, id);
    this.loggers = [];
    if (props.loggers) {
      props.loggers.forEach(this.addLogger.bind(this));
    }
    const version = new greengrass.CfnLoggerDefinitionVersion(this, 'Version', {
      loggerDefinitionId: props.definition.definitionArn,
      loggers: this.loggers
    });
    this.versionArn = version.ref;
  }

  addLogger(logger: LoggerProps): LoggerDefinitionVersion {
    this.loggers.push(transformLogger(this, logger));
    return this;
  }
}

export class LoggerDefinition extends cdk.Resource implements ILoggerDefinition {
  readonly definitionId: string
  readonly definitionArn: string
  readonly versionArn?: string;
 
  constructor(scope: cdk.Construct, id: string, props?: LoggerDefinitionProps) {
    super(scope, id);
    
    let initialVersion: greengrass.CfnLoggerDefinition.LoggerDefinitionVersionProperty | undefined;
    if (props?.loggers) {
      initialVersion = {
        loggers: props.loggers.map(logger => transformLogger(this, logger))
      };
    }

    const definition = new greengrass.CfnLoggerDefinition(scope, 'Definition', {
      name: props?.name || id,
      tags: props?.tags,
      initialVersion
    });
    this.definitionId = definition.attrId;
    this.definitionArn = definition.attrArn;
    this.versionArn = definition.attrLatestVersionArn;
  }
}

export interface LoggerDefinitionProps {
  readonly name?: string
  readonly loggers?: Array<LoggerProps>
  readonly tags?: Tags
}

export interface LoggerProps {
  readonly id?: string,
  readonly component: LogComponent,
  readonly level: LogLevel,
  readonly type: LogEventType,
  readonly space?: number
}

export enum LogComponent {
  GREENGRASS_SYSTEM = 'GreengrassSystem',
  LAMBDA = 'Lambda'
}

export enum LogEventType {
  FILE_SYSTEM = 'FileSystem',
  AWS_CLOUD_WATCH = 'AWSCloudWatch'
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL'
}
