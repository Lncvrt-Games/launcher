import { DownloadedVersion } from './DownloadedVersion'

type VersionsConfigData = {
  version: string
  list: DownloadedVersion[]
}

export class VersionsConfig {
  constructor (public version: string, public list: DownloadedVersion[] = []) {}

  static import (data: VersionsConfigData) {
    const cfg = new VersionsConfig(data.version)
    cfg.list = [...data.list]
    return cfg
  }
}
