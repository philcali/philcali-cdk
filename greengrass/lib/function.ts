import * as greengrass from '@aws-cdk/aws-greengrass';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import { lazyHash } from './hash';
import { Tags } from './tag';

export interface IFunctionDefinition extends cdk.IResource {
  readonly defintiionId: string;
  readonly definitionArn: string;
  readonly versionArn?: string;
}

export interface IFunctionDefinitionVersion extends cdk.IResource {
  readonly versionArn: string;
}

export interface FunctionDefinitionVersionProps {
  readonly definition: IFunctionDefinition;
  readonly defaultConfig?: DefaultConfigProps;
  readonly functions?: Array<FunctionProps>;
}

export interface FunctionDefinitionProps {
  readonly name?: string;
  readonly defaultConfig?: DefaultConfigProps;
  readonly functions?: Array<FunctionProps>;
  readonly tags?: Tags;
}

function transformFunction(scope: cdk.Construct, func: FunctionProps): greengrass.CfnFunctionDefinitionVersion.FunctionProperty {
  return {...func,
    id: func.id || lazyHash(func.version.node.path),
    functionArn: func.version.functionArn,
    functionConfiguration: {...func.config,
      timeout: func.config.timeout?.toSeconds()
    }
  };
}

export class FunctionDefinitionVersion extends cdk.Resource implements IFunctionDefinitionVersion {
  readonly versionArn: string;
  private functions: Array<greengrass.CfnFunctionDefinitionVersion.FunctionProperty>

  constructor(scope: cdk.Construct, id: string, props: FunctionDefinitionVersionProps) {
    super(scope, id);
    this.functions = [];
    if (props.functions) {
      props.functions.forEach(this.addFunction.bind(this));
    }
    const version = new greengrass.CfnFunctionDefinitionVersion(this, 'Version', {
      functionDefinitionId: props.definition.defintiionId,
      defaultConfig: props?.defaultConfig,
      functions: this.functions
    });
    this.versionArn = version.ref;
  }

  addFunction(func: FunctionProps): FunctionDefinitionVersion {
    this.functions.push(transformFunction(this, func));
    return this;
  }
}

export class FunctionDefinition extends cdk.Resource implements IFunctionDefinition {
  readonly defintiionId: string
  readonly definitionArn: string
  readonly versionArn?: string;

  constructor(scope: cdk.Construct, id: string, props?: FunctionDefinitionProps) {
    super(scope, id);

    let initialVersion: greengrass.CfnFunctionDefinition.FunctionDefinitionVersionProperty | undefined;
    if (props?.functions) {
      initialVersion = {
        defaultConfig: props?.defaultConfig,
        functions: props?.functions.map(func => {
          return {
            id: func.id || lazyHash(func.version.node.path),
            functionArn: func.version.functionArn,
            functionConfiguration: {...func.config,
              timeout: func.config.timeout?.toSeconds()
            }
          };
        })
      };
    }

    const definition = new greengrass.CfnFunctionDefinition(this, 'Definition', {
      name: props?.name || id,
      tags: props?.tags,
      initialVersion
    });

    this.defintiionId = definition.ref;
    this.definitionArn = definition.attrArn;
    this.versionArn = definition.attrLatestVersionArn;
  }
}

export interface FunctionProps {
  readonly id?: string;
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