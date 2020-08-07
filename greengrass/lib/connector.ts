import * as cdk from '@aws-cdk/core';
import * as greengrass from '@aws-cdk/aws-greengrass';
import { Tags } from './tag';

export interface IConnectorDefinition extends cdk.IResource {
  readonly id: string
  addVersion(props?: AddConnectorDefinitionVersionProps): IConnectorDefinitionVersion;
}

export interface IConnectorDefinitionVersion extends cdk.IResource {
  readonly versionId: string
  addConnector(connector: ConnectorProps): IConnectorDefinitionVersion;
}

export interface AddConnectorDefinitionVersionProps {
  readonly connectors?: Array<ConnectorProps>
}

export interface ConnectorDefinitionVersionProps extends AddConnectorDefinitionVersionProps {
  readonly id: string;
}

export class ConnectorDefinitionVersion extends cdk.Resource implements IConnectorDefinitionVersion {
  readonly versionId: string
  private connectors: Array<greengrass.CfnConnectorDefinitionVersion.ConnectorProperty>

  constructor(scope: cdk.Construct, id: string, props: ConnectorDefinitionVersionProps) {
    super(scope, id);
    this.connectors = [];
    if (props?.connectors) {
      props.connectors.forEach(this.addConnector.bind(this));
    }
    const version = new greengrass.CfnConnectorDefinitionVersion(this, id, {
      connectorDefinitionId: props.id,
      connectors: this.connectors
    });
    this.versionId = version.ref;
  }

  addConnector(connector: ConnectorProps): IConnectorDefinitionVersion {
    this.connectors.push(connector)
    return this;
  }
}

export class ConnectorDefinition extends cdk.Resource implements IConnectorDefinition {
  readonly id: string

  constructor(scope: cdk.Construct, id: string, props?: ConnectorDefinitionProps) {
    super(scope, id);
    const definition = new greengrass.CfnConnectorDefinition(this, 'Definition', {
      name: props?.name || id,
      tags: props?.tags
    });
    this.id = definition.ref;
  }

  addVersion(props?: AddConnectorDefinitionVersionProps): IConnectorDefinitionVersion {
    return new ConnectorDefinitionVersion(this, 'Version', {...props,
      id: this.id
    });
  }
}

export interface ConnectorDefinitionProps {
  readonly name?: string
  readonly tags?: Tags
}

export interface ConnectorProps {
  readonly connectorArn: string
  readonly id: string
  readonly parameters: any
}

export class Connector implements ConnectorProps {
  readonly id: string
  readonly connectorArn: string
  readonly parameters: any
  constructor(scope: cdk.IResource, id: string, version:number, parameters: any) {
    this.id = id;
    this.connectorArn = cdk.Stack.of(scope).formatArn({
      service: 'greengrass',
      account: '',
      resource: `connectors/${this.constructor.name}/versions/${version}`,
    });
  }
}
