import * as iot from '@aws-cdk/aws-iot';
import * as cdk from '@aws-cdk/core';
import { ICertificate } from './certificate';

type AttributeMap = { [key: string]: string };

export interface IThing {
  readonly type: string
  readonly thingName: string

  attachToCertificate(certificate: ICertificate): ICertifiedThing
}

export interface ICertifiedThing {
  readonly thing: IThing
  readonly certificate: ICertificate
}

export interface ThingProps {
  readonly type: string
  readonly thingName?: string
  readonly attributes?: AttributeMap
}

export interface FromThingNameOptions {
  readonly type: string
}

export class Thing extends cdk.Resource implements IThing {
  readonly thingName: string
  readonly type: string
  private readonly attributes: AttributeMap

  public static attachPrincipal(scope: cdk.Construct, id: string, principal: string, thing: IThing) {
    new iot.CfnThingPrincipalAttachment(scope, `Attach${id}ToThing`, {
      principal,
      thingName: thing.thingName
    });
  }

  public static fromThingName(scope: cdk.Construct, id: string, thingName: string, props: FromThingNameOptions): IThing {
    class Import extends cdk.Resource implements IThing {
      readonly thingName: string = thingName;
      readonly type: string = props.type;
      attachToCertificate(certificate: ICertificate) {
        Thing.attachPrincipal(scope, 'Cert', certificate.certificateArn, this);
        return {
          thing: this,
          certificate
        };
      }
    }
    return new Import(scope, id);
  }

  constructor(scope: cdk.Construct, id: string, props: ThingProps) {
    super(scope, id);

    let thingName: string | undefined = props.thingName;
    this.attributes = props.attributes || {};
    const device = new iot.CfnThing(this, 'Thing', {
      thingName,
      attributePayload: {
        attributes: this.attributes
      }
    });
    this.type = props.type;
    this.thingName = device.ref;
  }

  public addAttribute(key: string, value: string): Thing {
    this.attributes[key] = value;
    return this;
  }

  public attachToCertificate(certificate: ICertificate): ICertifiedThing {
    Thing.attachPrincipal(this, 'Cert', certificate.certificateArn, this);
    return {
      thing: this,
      certificate
    };
  }
}
