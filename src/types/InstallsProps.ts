import { DownloadProgress } from './DownloadProgress'
import { LauncherVersion } from './LauncherVersion'

export type InstallsProps = {
  downloadProgress: DownloadProgress[]
  showPopup: boolean
  setShowPopup: (v: boolean) => void
  setPopupMode: (v: null | number) => void
  setFadeOut: (v: boolean) => void
  setSelectedVersionList: (v: LauncherVersion[]) => void
  setVersionList: (v: null | LauncherVersion[]) => void
}
