import { Duration } from "aws-cdk-lib"
import { DeviceLab } from "../device-lab";

export enum DevicePoolType {
    MANAGED = "MANAGED",
    UNMANAGED = "UNMANAGED"
}

export enum DevicePoolEndpointType {
    HTTP = "HTTP",
    LAMBDA = "LAMBDA"
}

export interface DevicePoolEndpointProps {
    readonly endpointType: DevicePoolEndpointType,
    readonly uri: string
}

export interface DevicePoolLockProps {
    readonly enabled?: boolean,
    readonly duration?: Duration;
}

export interface DevicePoolProps {
    readonly name: string,
    readonly description?: string,
    readonly poolType?: DevicePoolType,
    readonly integration?: DevicePoolEndpointProps | IDevicePoolIntegration,
    readonly lockOptions?: DevicePoolLockProps,
}

export interface IDevicePoolIntegration {
    associateToLab(deviceLab: DeviceLab): void;

    readonly endpoint: DevicePoolEndpointProps;
}
