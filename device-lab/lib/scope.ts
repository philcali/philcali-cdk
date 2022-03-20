import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";

export enum Scope {
  READ_DEVICE_POOL,
  READ_DEVICE_POOL_LOCK,
  READ_DEVICE,
  READ_DEVICE_LOCK,
  READ_PROVISION,
  READ_RESERVATION,
  READ,
  WRITE_DEVICE_POOL,
  WRITE_DEVICE_POOL_LOCK,
  WRITE_DEVICE,
  WRITE_DEVICE_LOCK,
  WRITE_PROVISION,
  WRITE_RESERVATION,
  WRITE
}

export interface DeviceLabApiScopeProps {
  readonly stageName?: string,
  readonly scopes: Array<Scope>,
  readonly allowList: Array<string>
}

export class DeviceLabApiScope extends PolicyStatement {
  constructor(props: DeviceLabApiScopeProps) {
    let resources: string[] = [];
    props.scopes.forEach(scope => {
      resources = resources.concat(DeviceLabApiScope.toResourceName(props.stageName || 'v1', scope));
    })
    super({
      effect: Effect.ALLOW,
      actions: [ 'execute-api:Invoke' ],
      resources
    })
    props.allowList.forEach(this.addAwsAccountPrincipal.bind(this));
  }

  static toResourceName(stageName: string, scope: Scope): Array<string> {
    let paths = [];
    let method = 'GET';
    switch (scope) {
      case Scope.WRITE:
        method = '*';
        paths.push("/*");
        break;
      case Scope.READ:
        paths.push("/*");
        break;
      case Scope.WRITE_DEVICE_POOL:
        method = '*';
        paths.push('/pools');
        paths.push('/pools/*');
        break;
      case Scope.WRITE_DEVICE_POOL_LOCK:
        method = '*';
        paths.push('/pools/*/locks');
        break;
      case Scope.READ_DEVICE_POOL:
        paths.push('/pools');
        paths.push('/pools/*');
        break;
      case Scope.READ_DEVICE_POOL_LOCK:
        paths.push('/pools/*/locks');
        break;
      case Scope.WRITE_DEVICE:
        method = '*';
        paths.push('/pools/*/devices');
        paths.push('/pools/*/devices/*/');
        break;
      case Scope.WRITE_DEVICE_LOCK:
        method = '*';
        paths.push('/pools/*/devices/*/locks');
        break;
      case Scope.READ_DEVICE:
        paths.push('/pools/*/devices');
        paths.push('/pools/*/devices/*/');
        break;
      case Scope.READ_DEVICE_LOCK:
        paths.push('/pools/*/devices/*/locks');
        break;
      case Scope.WRITE_PROVISION:
        method = '*';
        paths.push(`/pools/*/provisions`);
        paths.push(`/pools/*/provisions/*/`);
        break;
      case Scope.READ_PROVISION:
        paths.push(`/pools/*/provisions`);
        paths.push(`/pools/*/provisions/*/`);
        break;
      case Scope.WRITE_RESERVATION:
        method = '*';
        paths.push(`/pools/*/provisions/*/reservations`);
        paths.push(`/pools/*/provisions/*/reservations/*/`);
        break;
      case Scope.READ_RESERVATION:
        paths.push(`/pools/*/provisions/*/reservations`);
        paths.push(`/pools/*/provisions/*/reservations/*/`);
        break;
    }
    return paths.map(path => {
      return `execute-api:/${stageName}/${method}${path}`;
    });
  }
}