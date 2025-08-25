'use client'

import { createContext, useContext, ReactNode } from 'react'
import { LauncherVersion } from './types/LauncherVersion'
import { DownloadProgress } from './types/DownloadProgress'
import { VersionsConfig } from './types/VersionsConfig'
import { NormalConfig } from './types/NormalConfig'
import { DownloadedVersion } from './types/DownloadedVersion'

type GlobalCtxType = {
  versionList: LauncherVersion[] | null
  setVersionList: (v: LauncherVersion[] | null) => void
  selectedVersionList: LauncherVersion[]
  setSelectedVersionList: (v: LauncherVersion[]) => void
  downloadProgress: DownloadProgress[]
  setDownloadProgress: (v: DownloadProgress[]) => void
  showPopup: boolean
  setShowPopup: (v: boolean) => void
  popupMode: number | null
  setPopupMode: (v: number | null) => void
  fadeOut: boolean
  setFadeOut: (v: boolean) => void
  downloadedVersionsConfig: VersionsConfig | null
  setDownloadedVersionsConfig: (v: VersionsConfig | null) => void
  normalConfig: NormalConfig | null
  setNormalConfig: (v: NormalConfig | null) => void
  managingVersion: DownloadedVersion | null
  setManagingVersion: (v: DownloadedVersion | null) => void
}

const GlobalCtx = createContext<GlobalCtxType | null>(null)

export const useGlobal = () => {
  const ctx = useContext(GlobalCtx)
  if (!ctx) throw new Error('useGlobal must be inside GlobalProvider')
  return ctx
}

export const GlobalProvider = ({
  children,
  value
}: {
  children: ReactNode
  value: GlobalCtxType
}) => {
  return <GlobalCtx.Provider value={value}>{children}</GlobalCtx.Provider>
}
