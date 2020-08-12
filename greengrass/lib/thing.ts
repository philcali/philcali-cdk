import * as iot from '@philcali-cdk/iot';
import { ICertifiedThing } from '@philcali-cdk/iot';
import * as greengrass from '@aws-cdk/aws-greengrass';

export type GreengrassDevice = IGreengrassThing | ICertifiedThing;

export type DeviceLike = (
    greengrass.CfnCoreDefinition.CoreProperty |
    greengrass.CfnCoreDefinitionVersion.CoreProperty |
    greengrass.CfnDeviceDefinition.DeviceProperty |
    greengrass.CfnDeviceDefinitionVersion.DeviceProperty
);

export interface IGreengrassThing {
    readonly syncShadow?: boolean
    readonly device: iot.ICertifiedThing
}