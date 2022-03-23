import { Function } from "aws-cdk-lib/aws-lambda";
import { DeviceLab } from "../device-lab";
import { DevicePoolEndpointProps, DevicePoolEndpointType, IDevicePoolIntegration } from "./device-pool";

export interface LambdaDevicePoolIntegrationProps {
    readonly lambdaFunction: Function;
}

export class LambdaDevicePoolIntegration implements IDevicePoolIntegration {
    readonly lambdaFunction: Function;

    constructor(props: LambdaDevicePoolIntegrationProps) {
        this.lambdaFunction = props.lambdaFunction;
    }

    associateToLab(deviceLab: DeviceLab): void {
        this.lambdaFunction.grantInvoke(deviceLab.obtainDeviceFunction);
    }

    get endpoint(): DevicePoolEndpointProps {
        return {
            endpointType: DevicePoolEndpointType.LAMBDA,
            uri: this.lambdaFunction.functionArn
        }
    }
}