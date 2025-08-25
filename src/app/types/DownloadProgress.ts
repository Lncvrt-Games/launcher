import { LauncherVersion } from './LauncherVersion'

export class DownloadProgress {
  constructor (
    public version: LauncherVersion,
    public progress: number,
    public failed: boolean,
    public queued: boolean
  ) {}
}
