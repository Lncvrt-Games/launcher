import { LauncherVersion } from './LauncherVersion'

export class DownloadProgress {
  constructor (
    public version: LauncherVersion,
    public progress: number,
    public done: boolean
  ) {}
}
