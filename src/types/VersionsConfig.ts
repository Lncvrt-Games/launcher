import { DownloadedVersion } from './DownloadedVersion'

export class VersionsConfig {
  constructor (public version: string, public list: DownloadedVersion[] = []) {}

  static import (data: any) {
    const cfg = new VersionsConfig(data.version)
    Object.assign(cfg.list, data.list)
    return cfg
  }
}
