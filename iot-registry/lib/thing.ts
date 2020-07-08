import * as iot from '@aws-cdk/aws-iot';
import * as cdk from '@aws-cdk/core';
import { IAttachable, ICertificate } from './certificate';

type AttributeMap = { [key: string]: string };

export interface IThing extends cdk.IResource {
  readonly thingName: string

  attachToCertificate(certificate: ICertificate): ICertifiedThing

  attachPrincipal(attachable: IAttachable): void
}

export interface ICertifiedThing {
  readonly thing: IThing
  readonly certificate: ICertificate
}

export interface ThingProps {
  readonly thingName?: string
  readonly attributes?: AttributeMap
}

abstract class ThingBase extends cdk.Resource implements IThing {
  public abstract readonly thingName: string;

  public attachPrincipal(attachable: IAttachable) {
    new iot.CfnThingPrincipalAttachment(this, `Attach${attachable.type}ToThing`, {
      principal: attachable.principal,
      thingName: this.thingName
    });
  }

  public attachToCertificate(certificate: ICertificate): ICertifiedThing {
    this.attachPrincipal(certificate);
    return {
      thing: this,
      certificate
    };
  }
}

export class Thing extends ThingBase {
  readonly thingName: string
  private readonly attributes: AttributeMap

  public static fromThingName(scope: cdk.Construct, id: string, thingName: string): IThing {
    class Import extends ThingBase {
      readonly thingName: string = thingName;
    }
    return new Import(scope, id);
  }

  constructor(scope: cdk.Construct, id: string, props?: ThingProps) {
    super(scope, id);

    let thingName: string | undefined = props?.thingName;
    this.attributes = props?.attributes || {};
    const device = new iot.CfnThing(this, 'Thing', {
      thingName,
      attributePayload: {
        attributes: this.attributes
      }
    });
    this.thingName = device.ref;
  }

  public addAttribute(key: string, value: string): Thing {
    this.attributes[key] = value;
    return this;
  }
}
