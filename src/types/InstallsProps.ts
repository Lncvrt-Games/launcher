import { LauncherVersion } from "./LauncherVersion"

export type InstallsProps = {
  downloadVersions: (versions: LauncherVersion[]) => void
}