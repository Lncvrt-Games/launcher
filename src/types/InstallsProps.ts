import { DownloadProgress } from './DownloadProgress'
import { LauncherVersion } from './LauncherVersion'

export type InstallsProps = {
  downloadVersions: (versions: LauncherVersion[]) => void
  downloadProgress: DownloadProgress[]
}
