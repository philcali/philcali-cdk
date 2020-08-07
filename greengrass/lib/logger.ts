import * as cdk from '@aws-cdk/core';
import * as greengrass from '@aws-cdk/aws-greengrass';

export interface ILoggerDefinition extends cdk.IResource {
  readonly name: string
  readonly versionId: string
  addLogger(logger: LoggerProps): ILoggerDefinition
}

export class LoggerDefinition extends cdk.Resource implements ILoggerDefinition {
  readonly name: string
  readonly versionId: string
  private loggers: Array<greengrass.CfnLoggerDefinitionVersion.LoggerProperty>
  constructor(scope: cdk.Resource, id: string, props?: LoggerDefinitionProps) {
    super(scope, id);
    this.loggers = [];
    if (props?.loggers) {
      props.loggers.forEach(this.addLogger.bind(this));
    }
    const definition = new greengrass.CfnLoggerDefinition(scope, 'Definition', {
      name: props?.name || id
    });
    this.name = definition.name;
    const version = new greengrass.CfnLoggerDefinitionVersion(definition, 'Version', {
      loggerDefinitionId: definition.ref,
      loggers: this.loggers
    });
    this.versionId = version.ref;
  }

  addLogger(logger: LoggerProps): ILoggerDefinition {
    this.loggers.push({
      ...logger
    });
    return this;
  }
}

export interface LoggerDefinitionProps {
  readonly name?: string
  readonly loggers?: Array<LoggerProps>
}

export interface LoggerProps {
  readonly id: string,
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
