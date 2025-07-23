import { LauncherVersion } from './LauncherVersion'

export class VersionsConfig {
  constructor (
    public version: string,
    public list: LauncherVersion[] = []
  ) {}

  static import (data: any) {
    const cfg = new VersionsConfig(data.version)
    Object.assign(cfg.list, data.list)
    return cfg
  }
}
