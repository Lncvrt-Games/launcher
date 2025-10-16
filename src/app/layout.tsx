'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Sidebar from './componets/Sidebar'
import './Globals.css'
import { LauncherVersion } from './types/LauncherVersion'
import { DownloadProgress } from './types/DownloadProgress'
import { platform } from '@tauri-apps/plugin-os'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAdd, faRemove, faXmark } from '@fortawesome/free-solid-svg-icons'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification
} from '@tauri-apps/plugin-notification'
import {
  readNormalConfig,
  readVersionsConfig,
  writeVersionsConfig
} from './util/BazookaManager'
import { VersionsConfig } from './types/VersionsConfig'
import { DownloadedVersion } from './types/DownloadedVersion'
import { NormalConfig } from './types/NormalConfig'
import { app } from '@tauri-apps/api'
import axios from 'axios'
import { openUrl } from '@tauri-apps/plugin-opener'
import { GlobalProvider } from './GlobalProvider'
import { Roboto } from 'next/font/google'

const roboto = Roboto({
  subsets: ['latin']
})

export default function RootLayout ({
  children
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(true)
  const [loadingText, setLoadingText] = useState('Loading...')
  const [outdated, setOutdated] = useState(false)
  const [versionList, setVersionList] = useState<null | LauncherVersion[]>(null)
  const [selectedVersionList, setSelectedVersionList] = useState<
    LauncherVersion[]
  >([])
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress[]>(
    []
  )
  const [showPopup, setShowPopup] = useState(false)
  const [popupMode, setPopupMode] = useState<null | number>(null)
  const [fadeOut, setFadeOut] = useState(false)
  const activeDownloads = useRef(0)
  const queue = useRef<(() => void)[]>([])
  const [downloadedVersionsConfig, setDownloadedVersionsConfig] =
    useState<VersionsConfig | null>(null)
  const [normalConfig, setNormalConfig] = useState<NormalConfig | null>(null)
  const [managingVersion, setManagingVersion] =
    useState<DownloadedVersion | null>(null)

  function runNext () {
    if (activeDownloads.current === 0 && queue.current.length === 0) {
      setFadeOut(true)
      setTimeout(() => setShowPopup(false), 200)
      return
    }
    if (activeDownloads.current >= 3 || queue.current.length === 0) return
    activeDownloads.current++
    const next = queue.current.shift()
    next?.()
  }

  async function downloadVersions (versions: LauncherVersion[]) {
    while (normalConfig != null) {
      const useWine = normalConfig.settings.useWineOnUnixWhenNeeded
      const p = platform()
      const newDownloads = versions.map(
        v => new DownloadProgress(v, 0, false, true)
      )
      setDownloadProgress(prev => [...prev, ...newDownloads])

      newDownloads.forEach(download => {
        let plat = p
        if (p === 'linux' && useWine) {
          if (
            !download.version.platforms.includes(p) &&
            download.version.platforms.includes('windows')
          ) {
            plat = 'windows'
          }
        }
        const idx = download.version.platforms.indexOf(plat)
        const url = download.version.downloadUrls[idx]
        const exe = download.version.executables[idx]

        if (!url) {
          setDownloadProgress(prev =>
            prev.map(d =>
              d.version.version === download.version.version
                ? { ...d, failed: true }
                : d
            )
          )
          return
        }

        const task = () => {
          setDownloadProgress(prev => {
            const i = prev.findIndex(
              d => d.version.version === download.version.version
            )
            if (i === -1) return prev
            const copy = [...prev]
            copy[i] = { ...copy[i], queued: false }
            return copy
          })

          invoke('download', {
            url,
            name: download.version.version,
            executable: exe
          })
        }

        queue.current.push(task)
        runNext()
      })
      break
    }
  }

  function handleOverlayClick (e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      setFadeOut(true)
      setTimeout(() => setShowPopup(false), 200)
    }
  }

  const notifyUser = useCallback(
    async (title: string, body: string) => {
      if (!normalConfig?.settings.allowNotifications) return

      let permissionGranted = await isPermissionGranted()
      if (!permissionGranted) {
        const permission = await requestPermission()
        permissionGranted = permission === 'granted'
      }

      if (permissionGranted) {
        sendNotification({ title, body })
      }
    },
    [normalConfig]
  )

  useEffect(() => {
    ;(async () => {
      if (process.env.NODE_ENV === 'production') {
        setLoadingText('Checking latest version...')
        try {
          const response = await axios.get(
            'https://berrydash.lncvrt.xyz/database/launcher/latest.php'
          )
          const client = await app.getVersion()
          if (response.data !== client) {
            setOutdated(true)
            return
          }
        } catch {
          setLoadingText('Failed to check latest version.')
          return
        }
      }
      setLoadingText('Loading configs...')
      const normalConfig = await readNormalConfig()
      const versionsConfig = await readVersionsConfig()
      setDownloadedVersionsConfig(versionsConfig)
      setNormalConfig(normalConfig)
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    let unlistenProgress: (() => void) | null = null
    let unlistenDone: (() => void) | null = null
    let unlistenFailed: (() => void) | null = null
    let unlistenUninstalled: (() => void) | null = null

    listen<string>('download-progress', event => {
      const [versionName, progStr] = event.payload.split(':')
      const prog = Number(progStr)
      setDownloadProgress(prev => {
        const i = prev.findIndex(d => d.version.version === versionName)
        if (i === -1) return prev
        const copy = [...prev]
        copy[i] = { ...copy[i], progress: prog }
        return copy
      })
    }).then(f => (unlistenProgress = f))

    listen<string>('download-done', event => {
      const versionName = event.payload
      setDownloadProgress(prev => {
        const downloaded = prev.find(d => d.version.version === versionName)
        if (!downloaded) return prev

        setDownloadedVersionsConfig(prevConfig => {
          if (!prevConfig) return prevConfig
          const newDownloaded = DownloadedVersion.import(downloaded.version)
          const updatedConfig = {
            ...prevConfig,
            list: [...prevConfig.list, newDownloaded]
          }
          writeVersionsConfig(updatedConfig)
          return updatedConfig
        })

        return prev.filter(d => d.version.version !== versionName)
      })

      activeDownloads.current--
      runNext()

      setDownloadProgress(curr => {
        if (curr.length === 0)
          notifyUser('Downloads Complete', 'All downloads have completed.')
        return curr
      })
    }).then(f => (unlistenDone = f))

    listen<string>('download-failed', async event => {
      const versionName = event.payload
      setDownloadProgress(prev =>
        prev.map(d =>
          d.version.version === versionName ? { ...d, failed: true } : d
        )
      )

      activeDownloads.current--
      runNext()
      await notifyUser(
        'Download Failed',
        `The download for version ${versionName} has failed.`
      )
    }).then(f => (unlistenFailed = f))

    listen<string>('version-uninstalled', event => {
      const versionName = event.payload
      setDownloadedVersionsConfig(prev => {
        if (!prev) return prev
        const updatedList = prev.list.filter(
          v => v.version.version !== versionName
        )
        const updatedConfig = { ...prev, list: updatedList }
        writeVersionsConfig(updatedConfig)
        setManagingVersion(null)
        setFadeOut(true)
        setTimeout(() => setShowPopup(false), 200)
        return updatedConfig
      })
    }).then(f => (unlistenUninstalled = f))

    return () => {
      unlistenProgress?.()
      unlistenDone?.()
      unlistenFailed?.()
      unlistenUninstalled?.()
    }
  }, [notifyUser])

  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('contextmenu', handler)
    return () => document.removeEventListener('contextmenu', handler)
  }, [])

  return (
    <>
      <html lang='en' className={roboto.className}>
        <body>
          {loading ? (
            <div className='w-screen h-screen flex items-center justify-center'>
              {outdated ? (
                <div className='text-center'>
                  <p className='text-8xl mb-4'>Outdated Launcher!</p>
                  <p className='text-4xl mb-4'>
                    Please update to the latest version to continue.
                  </p>
                  <button
                    className='button'
                    onClick={() =>
                      openUrl('https://berrydash.lncvrt.xyz/download')
                    }
                  >
                    Download latest version
                  </button>
                </div>
              ) : (
                <p className='text-7xl text-center'>{loadingText}</p>
              )}
            </div>
          ) : (
            <>
              <div
                tabIndex={0}
                onKeyDown={e => {
                  if (showPopup && e.key === 'Escape') {
                    setFadeOut(true)
                    setTimeout(() => setShowPopup(false), 200)
                  }
                }}
              >
                <GlobalProvider
                  value={{
                    versionList,
                    setVersionList,
                    selectedVersionList,
                    setSelectedVersionList,
                    downloadProgress,
                    setDownloadProgress,
                    showPopup,
                    setShowPopup,
                    popupMode,
                    setPopupMode,
                    fadeOut,
                    setFadeOut,
                    downloadedVersionsConfig,
                    setDownloadedVersionsConfig,
                    normalConfig,
                    setNormalConfig,
                    managingVersion,
                    setManagingVersion
                  }}
                >
                  <Sidebar />
                </GlobalProvider>
                <div
                  className='relative z-[2] ml-[239px] w-[761px] border-b border-[#242424] h-[33px] bg-[#161616]'
                  style={{
                    display: platform() == 'windows' ? 'block' : 'none'
                  }}
                ></div>
                <div className='relative z-0'>
                  <main style={{ marginLeft: '15rem' }}>
                    <GlobalProvider
                      value={{
                        versionList,
                        setVersionList,
                        selectedVersionList,
                        setSelectedVersionList,
                        downloadProgress,
                        setDownloadProgress,
                        showPopup,
                        setShowPopup,
                        popupMode,
                        setPopupMode,
                        fadeOut,
                        setFadeOut,
                        downloadedVersionsConfig,
                        setDownloadedVersionsConfig,
                        normalConfig,
                        setNormalConfig,
                        managingVersion,
                        setManagingVersion
                      }}
                    >
                      {children}
                    </GlobalProvider>
                  </main>
                </div>
                {showPopup && (
                  <div
                    className={`popup-overlay ${fadeOut ? 'fade-out' : ''}`}
                    onClick={handleOverlayClick}
                  >
                    <div className='popup-box'>
                      <button
                        className='close-button'
                        onClick={() => {
                          setFadeOut(true)
                          setTimeout(() => setShowPopup(false), 200)
                        }}
                      >
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                      {popupMode === 0 ? (
                        <>
                          <p className='text-xl text-center'>
                            Select versions to download
                          </p>
                          <div className='popup-content'>
                            {versionList == null ? (
                              <p className='text-center'>
                                Getting version list...
                              </p>
                            ) : (
                              versionList
                                .filter(
                                  v =>
                                    !downloadedVersionsConfig?.list.some(
                                      dv => dv.version.version === v.version
                                    )
                                )
                                .map((v, i) => (
                                  <div key={i} className='popup-entry'>
                                    <p className='text-2xl'>
                                      Berry Dash v{v.displayName}
                                    </p>
                                    <button
                                      className='button right-2 bottom-2'
                                      onClick={() => {
                                        if (!selectedVersionList) return
                                        if (!selectedVersionList.includes(v)) {
                                          setSelectedVersionList([
                                            ...selectedVersionList,
                                            v
                                          ])
                                        } else {
                                          setSelectedVersionList(
                                            selectedVersionList.filter(
                                              x => x !== v
                                            )
                                          )
                                        }
                                      }}
                                    >
                                      {selectedVersionList.includes(v) ? (
                                        <>
                                          <FontAwesomeIcon icon={faRemove} />{' '}
                                          Remove
                                        </>
                                      ) : (
                                        <>
                                          <FontAwesomeIcon icon={faAdd} /> Add
                                        </>
                                      )}
                                    </button>
                                  </div>
                                ))
                            )}
                          </div>
                        </>
                      ) : popupMode === 1 ? (
                        <>
                          <p className='text-xl text-center'>Downloads</p>
                          <div className='popup-content'>
                            {downloadProgress.length === 0 ? (
                              <p className='text-center mt-6'>
                                Nothing here...
                              </p>
                            ) : (
                              downloadProgress.map((v, i) => (
                                <div
                                  key={i}
                                  className='popup-entry flex flex-col justify-between'
                                >
                                  <p className='text-2xl'>
                                    Berry Dash v{v.version.displayName}
                                  </p>
                                  <div className='mt-[25px] flex items-center justify-between'>
                                    {v.failed ? (
                                      <>
                                        <div className='flex items-center'>
                                          <span className='text-red-500'>
                                            Download failed
                                          </span>
                                          <button
                                            className='button ml-30 mb-2'
                                            onClick={() =>
                                              setDownloadProgress(prev =>
                                                prev.filter(
                                                  (_, idx) => idx !== i
                                                )
                                              )
                                            }
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </>
                                    ) : v.queued ? (
                                      <span className='text-yellow-500'>
                                        Queued…
                                      </span>
                                    ) : (
                                      <span>
                                        Downloading: {v.progress}% done
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </>
                      ) : popupMode === 2 ? (
                        managingVersion ? (
                          <>
                            <p className='text-xl text-center'>
                              Manage version{' '}
                              {managingVersion.version.displayName}
                            </p>
                            <div className='popup-content flex flex-col items-center justify-center gap-2 h-full'>
                              <button
                                className='button'
                                onClick={() =>
                                  invoke('uninstall_version', {
                                    name: managingVersion.version.version
                                  })
                                }
                              >
                                Uninstall
                              </button>
                              <button
                                className='button'
                                onClick={async () =>
                                  invoke('open_folder', {
                                    name: managingVersion.version.version
                                  })
                                }
                              >
                                Open Folder
                              </button>
                              <button
                                className='button'
                                style={{
                                  display:
                                    platform() == 'macos' ? 'block' : 'none'
                                }}
                                onClick={async () => {
                                  const exe =
                                    managingVersion.version.executables[
                                      managingVersion.version.platforms.indexOf(
                                        platform()
                                      )
                                    ]
                                  await invoke('fix_mac_permissions', {
                                    name: managingVersion.version.version,
                                    executable: exe
                                  })
                                }}
                              >
                                Fix permissions
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className='text-xl text-center'>
                            No version selected
                          </p>
                        )
                      ) : null}
                      {popupMode == 0 && versionList != null && (
                        <div className='flex justify-center'>
                          <button
                            className='button w-fit mt-2 mb-[-16px]'
                            onClick={() => {
                              setFadeOut(true)
                              setTimeout(() => setShowPopup(false), 200)
                              downloadVersions(selectedVersionList)
                            }}
                          >
                            Download {selectedVersionList.length} version
                            {selectedVersionList.length == 1 ? '' : 's'}
                          </button>
                          <button
                            className='button w-fit mt-2 ml-2 mb-[-16px]'
                            onClick={() => {
                              const filtered = versionList.filter(
                                v =>
                                  !downloadedVersionsConfig?.list.some(
                                    dv => dv.version.version === v.version
                                  )
                              )
                              if (
                                selectedVersionList.length ===
                                  filtered.length &&
                                filtered.every(v =>
                                  selectedVersionList.includes(v)
                                )
                              ) {
                                setSelectedVersionList([])
                              } else {
                                setSelectedVersionList(filtered)
                              }
                            }}
                          >
                            {selectedVersionList.length ===
                            versionList.filter(
                              v =>
                                !downloadedVersionsConfig?.list.some(
                                  dv => dv.version.version === v.version
                                )
                            ).length
                              ? 'Deselect All'
                              : 'Select All'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </body>
      </html>
    </>
  )
}
