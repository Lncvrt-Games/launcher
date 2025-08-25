import { DownloadedVersion } from './DownloadedVersion'
import { DownloadProgress } from './DownloadProgress'
import { LauncherVersion } from './LauncherVersion'
import { NormalConfig } from './NormalConfig'
import { VersionsConfig } from './VersionsConfig'

export type InstallsProps = {
  downloadProgress: DownloadProgress[]
  showPopup: boolean
  setShowPopup: (v: boolean) => void
  setPopupMode: (v: null | number) => void
  setFadeOut: (v: boolean) => void
  setSelectedVersionList: (v: LauncherVersion[]) => void
  setVersionList: (v: null | LauncherVersion[]) => void
  downloadedVersionsConfig: VersionsConfig | null
  normalConfig: NormalConfig | null
  setManagingVersion: (v: DownloadedVersion | null) => void
}
