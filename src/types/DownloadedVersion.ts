import { LauncherVersion } from './LauncherVersion'

export class DownloadedVersion {
  constructor (
    public version: LauncherVersion,
    public installDate: number = Date.now()
  ) {}

  static import (data: LauncherVersion) {
    return new DownloadedVersion(data)
  }
}
