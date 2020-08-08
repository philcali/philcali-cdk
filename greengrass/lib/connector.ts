import * as cdk from '@aws-cdk/core';
import * as greengrass from '@aws-cdk/aws-greengrass';
import { Tags } from './tag';

export interface IConnectorDefinition extends cdk.IResource {
  readonly definitionId: string
  readonly definitionArn: string
  readonly versionArn?: string
}

export interface IConnectorDefinitionVersion extends cdk.IResource {
  readonly versionArn: string
}

export interface ConnectorDefinitionVersionProps {
  readonly definition: IConnectorDefinition
  readonly connectors?: Array<IConnector>
}

export class ConnectorDefinitionVersion extends cdk.Resource implements IConnectorDefinitionVersion {
  readonly versionArn: string
  private connectors: Array<greengrass.CfnConnectorDefinitionVersion.ConnectorProperty>

  constructor(scope: cdk.Construct, id: string, props: ConnectorDefinitionVersionProps) {
    super(scope, id);
    this.connectors = [];
    if (props?.connectors) {
      props.connectors.forEach(this.addConnector.bind(this));
    }
    const version = new greengrass.CfnConnectorDefinitionVersion(this, 'Version', {
      connectorDefinitionId: props.definition.definitionId,
      connectors: this.connectors
    });
    this.versionArn = version.ref;
  }

  addConnector(connector: IConnector): ConnectorDefinitionVersion {
    this.connectors.push(connector)
    return this;
  }
}

export class ConnectorDefinition extends cdk.Resource implements IConnectorDefinition {
  readonly definitionId: string
  readonly definitionArn: string
  readonly versionArn?: string

  constructor(scope: cdk.Construct, id: string, props?: ConnectorDefinitionProps) {
    super(scope, id);

    let initialVersion: greengrass.CfnConnectorDefinition.ConnectorDefinitionVersionProperty | undefined;
    if (props?.connectors) {
      initialVersion = {
        connectors: props.connectors
      };
    }

    const definition = new greengrass.CfnConnectorDefinition(this, 'Definition', {
      name: props?.name || id,
      tags: props?.tags,
      initialVersion
    });
    this.definitionId = definition.attrId;
    this.definitionArn = definition.attrArn;
    this.versionArn = definition.attrLatestVersionArn;
  }
}

export interface ConnectorDefinitionProps {
  readonly name?: string
  readonly tags?: Tags
  readonly connectors?: Array<IConnector>;
}

export interface IConnector {
  readonly connectorArn: string
  readonly id: string
  readonly parameters: any
}

export class Connector implements IConnector {
  readonly id: string
  readonly connectorArn: string
  readonly parameters: any

  constructor(scope: cdk.IResource, version: number, parameters: any) {
    this.id = `${this.constructor.name}-${version}` 
    this.connectorArn = cdk.Stack.of(scope).formatArn({
      service: 'greengrass',
      account: '',
      resource: `connectors/${this.constructor.name}/versions/${version}`,
    });
  }
}
