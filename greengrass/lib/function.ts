import * as greengrass from '@aws-cdk/aws-greengrass';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import { Tags } from './tag';

export interface IFunctionDefinition extends cdk.IResource {
  readonly name: string;
  readonly versionId: string;
  addFunction(func: FunctionProps): IFunctionDefinition;
}

export interface FunctionDefinitionProps {
  readonly name?: string;
  readonly defaultConfig?: DefaultConfigProps;
  readonly functions?: Array<FunctionProps>;
  readonly tags?: Tags;
}

export class FunctionDefinition extends cdk.Resource implements IFunctionDefinition {
  readonly name: string
  readonly versionId: string
  private functions: Array<greengrass.CfnFunctionDefinitionVersion.FunctionProperty>

  constructor(scope: cdk.Resource, id: string, props?: FunctionDefinitionProps) {
    super(scope, id);

    this.functions = [];
    if (props?.functions) {
      props?.functions.forEach(this.addFunction.bind(this));
    }
    const definition = new greengrass.CfnFunctionDefinition(this, 'Defintiion', {
      name: props?.name || id,
      tags: props?.tags
    });
    this.name = definition.ref;
    const version = new greengrass.CfnFunctionDefinitionVersion(definition, 'Version', {
      functionDefinitionId: this.name,
      defaultConfig: props?.defaultConfig,
      functions: this.functions
    });
    this.versionId = version.ref;
  }

  addFunction(func: FunctionProps): IFunctionDefinition {
    this.functions.push({...func,
      functionArn: func.version.version,
      functionConfiguration: {...func.config,
        timeout: func.config.timeout?.toSeconds()
      }
    });
    return this;
  }
}

export interface FunctionProps {
  readonly id: string;
  readonly version: lambda.IVersion;
  readonly config: FunctionConfigProps;
}

export interface FunctionConfigProps {
  readonly encodingType?: EncodingType
  readonly environment?: EnvironmentProps
  readonly args?: Array<string>
  readonly executable?: string
  readonly memorySize?: number
  readonly timeout?: cdk.Duration
  readonly pinned?: boolean
}

export interface EnvironmentProps {
  readonly execution?: ExecutionProps
  readonly variables?: Map<string, string>
  readonly accessSysfs?: boolean
  readonly resourceAccessPolicies?: Array<ResourceAccessPolicyProps>
}

export interface ResourceAccessPolicyProps {
  readonly permission?: Permission
  readonly resourceId: string
}

export interface DefaultConfigProps {
  readonly execution: ExecutionProps
}

export interface ExecutionProps {
  readonly isolationMode?: IsolationMode
  readonly runAs?: RunAsProps
}

export interface RunAsProps {
  readonly gid?: number
  readonly uid?: number
}

export enum EncodingType {
  JSON = "json",
  BINARY = "binary"
}

export enum IsolationMode {
  CONTAINER = "GreengrassContainer",
  NO_CONTAINER = "NoContainer"
}

export enum Permission {
  RW = "rw",
  RO = "ro"
}
