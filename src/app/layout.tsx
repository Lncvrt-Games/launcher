'use client'

import { useCallback, useEffect, useState } from 'react'
import Sidebar from './componets/Sidebar'
import './Globals.css'
import { DownloadProgress } from './types/DownloadProgress'
import { arch, platform } from '@tauri-apps/plugin-os'
import { invoke } from '@tauri-apps/api/core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faAdd,
  faChevronLeft,
  faDownload,
  faRemove,
  faXmark
} from '@fortawesome/free-solid-svg-icons'
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
import { NormalConfig } from './types/NormalConfig'
import { app } from '@tauri-apps/api'
import axios from 'axios'
import { openUrl } from '@tauri-apps/plugin-opener'
import { GlobalProvider } from './GlobalProvider'
import { Roboto } from 'next/font/google'
import { ServerVersionsResponse } from './types/ServerVersionsResponse'
import { GameVersion } from './types/GameVersion'
import { Game } from './types/Game'
import { listen } from '@tauri-apps/api/event'
import { usePathname, useSearchParams } from 'next/navigation'

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

  const [serverVersionList, setServerVersionList] =
    useState<null | ServerVersionsResponse>(null)
  const [selectedVersionList, setSelectedVersionList] = useState<string[]>([])

  const [downloadedVersionsConfig, setDownloadedVersionsConfig] =
    useState<VersionsConfig | null>(null)
  const [normalConfig, setNormalConfig] = useState<NormalConfig | null>(null)

  const [showPopup, setShowPopup] = useState(false)
  const [popupMode, setPopupMode] = useState<null | number>(null)
  const [fadeOut, setFadeOut] = useState(false)

  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress[]>(
    []
  )
  const [managingVersion, setManagingVersion] = useState<string | null>(null)
  const [selectedGame, setSelectedGame] = useState<number | null>(null)

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
    let unlistenProgress: (() => void) | null = null
    let unlistenUninstalled: (() => void) | null = null

    listen<string>('download-progress', event => {
      const [versionName, progStr] = event.payload.split(':')
      const prog = Number(progStr)
      setDownloadProgress(prev => {
        const i = prev.findIndex(d => d.version === versionName)
        if (i === -1) return prev
        const copy = [...prev]
        copy[i] = { ...copy[i], progress: prog }
        return copy
      })
    }).then(f => (unlistenProgress = f))

    listen<string>('version-uninstalled', event => {
      const versionName = event.payload
      setDownloadedVersionsConfig(prev => {
        if (!prev) return prev
        const updatedList = prev.list.filter(v => v !== versionName)
        const updatedTimestamps = Object.fromEntries(
          Object.entries(prev.timestamps).filter(([k]) => k !== versionName)
        )
        const updatedConfig = {
          ...prev,
          list: updatedList,
          timestamps: updatedTimestamps
        }
        writeVersionsConfig(updatedConfig)
        setManagingVersion(null)
        setFadeOut(true)
        setTimeout(() => setShowPopup(false), 200)
        return updatedConfig
      })
    }).then(f => (unlistenUninstalled = f))

    return () => {
      unlistenProgress?.()
      unlistenUninstalled?.()
    }
  }, [notifyUser])

  useEffect(() => {
    ;(async () => {
      if (process.env.NODE_ENV === 'production') {
        setLoadingText('Checking latest version...')
        try {
          const response = await axios.get(
            'https://games.lncvrt.xyz/api/launcher/latest'
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
      setLoadingText('Downloading version list...')
      try {
        const res = await axios.get(
          'https://games.lncvrt.xyz/api/launcher/versions'
        )
        setServerVersionList(res.data)
      } catch {
        setLoadingText('Failed to download versions list.')
        return
      }
      setLoadingText('Loading configs...')
      const normalConfig = await readNormalConfig()
      const versionsConfig = await readVersionsConfig()
      setDownloadedVersionsConfig(versionsConfig)
      setNormalConfig(normalConfig)
      setLoading(false)

      let permissionGranted = await isPermissionGranted()
      if (!permissionGranted) {
        const permission = await requestPermission()
        permissionGranted = permission === 'granted'
      }
    })()
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('contextmenu', handler)
    return () => document.removeEventListener('contextmenu', handler)
  }, [])

  function getSpecialVersionsList (game?: number): GameVersion[] {
    if (!normalConfig || !serverVersionList) return []

    const useWine = normalConfig.settings.useWineOnUnixWhenNeeded
    const p = platform()
    const a = arch()

    return serverVersionList.versions
      .filter(v => !downloadedVersionsConfig?.list.includes(v.id))
      .filter(v => {
        if (game && v.game != game) return false
        if (p === 'macos' || p === 'linux') {
          if (useWine) {
            return (
              v.platforms.includes('windows-x86') ||
              v.platforms.includes('windows-x64') ||
              v.platforms.includes(p)
            )
          }
          return v.platforms.includes(p)
        }

        if (p === 'windows') {
          if (a === 'x86_64')
            return (
              v.platforms.includes('windows-x86') ||
              v.platforms.includes('windows-x64')
            )
          if (a === 'aarch64') return v.platforms.includes('windows-arm64')
        }

        return false
      })
      .sort((a, b) => {
        if (b.game !== a.game) return a.game - b.game
        return b.place - a.place
      })
  }

  function getDownloadLink (version: GameVersion): string | undefined {
    const p = platform()
    const a = arch()

    const findUrl = (plat: string) => {
      const i = version.platforms.indexOf(plat)
      return i >= 0 ? version.downloadUrls[i] : undefined
    }

    if (p === 'windows') {
      if (a === 'x86_64')
        return findUrl('windows-x64') || findUrl('windows-x86')
      if (a === 'aarch64') return findUrl('windows-arm64')
    }

    if (p === 'macos' || p === 'linux') {
      if (normalConfig?.settings.useWineOnUnixWhenNeeded) {
        return findUrl('windows-x86') || findUrl('windows-x64') || findUrl(p)
      }
      return findUrl(p)
    }

    return undefined
  }

  function getExecutableName (version: GameVersion): string | undefined {
    const p = platform()
    const a = arch()

    const findUrl = (plat: string) => {
      const i = version.platforms.indexOf(plat)
      return i >= 0 ? version.executables[i] : undefined
    }

    if (p === 'windows') {
      if (a === 'x86_64')
        return findUrl('windows-x64') || findUrl('windows-x86')
      if (a === 'aarch64') return findUrl('windows-arm64')
    }

    if (p === 'macos' || p === 'linux') {
      if (normalConfig?.settings.useWineOnUnixWhenNeeded) {
        return findUrl('windows-x86') || findUrl('windows-x64') || findUrl(p)
      }
      return findUrl(p)
    }

    return undefined
  }

  function getVersionInfo (id: string | undefined): GameVersion | undefined {
    if (!id) return undefined
    return serverVersionList?.versions.find(v => v.id === id)
  }

  function getVersionGame (game: number | undefined): Game | undefined {
    if (!game) return undefined
    return serverVersionList?.games.find(g => g.id === game)
  }

  function getListOfGames (): Game[] {
    if (!downloadedVersionsConfig?.list) return []

    const gamesMap = new Map<number, Game>()

    downloadedVersionsConfig.list.forEach(i => {
      const version = getVersionInfo(i)
      if (!version) return
      const game = getVersionGame(version.game)
      if (!game) return
      gamesMap.set(game.id, game)
    })

    return Array.from(gamesMap.values())
  }

  async function downloadVersions (): Promise<void> {
    const list = selectedVersionList
    setSelectedVersionList([])

    const newDownloads = list.map(
      version => new DownloadProgress(version, 0, false, true)
    )

    setDownloadProgress(newDownloads)

    for (const download of newDownloads) {
      const info = getVersionInfo(download.version)
      if (!info) {
        setDownloadProgress(prev =>
          prev.filter(d => d.version !== download.version)
        )
        return
      }
      const gameInfo = getVersionGame(info.game)
      if (!gameInfo) {
        setDownloadProgress(prev =>
          prev.filter(d => d.version !== download.version)
        )
        return
      }
      const downloadLink = getDownloadLink(info)
      if (!downloadLink) {
        setDownloadProgress(prev =>
          prev.filter(d => d.version !== download.version)
        )
        return
      }
      const executableName = getExecutableName(info)
      if (!executableName) {
        setDownloadProgress(prev =>
          prev.filter(d => d.version !== download.version)
        )
        return
      }
      setDownloadProgress(prev =>
        prev.map(d =>
          d.version === download.version ? { ...d, queued: false } : d
        )
      )
      const res = await invoke<string>('download', {
        url: downloadLink,
        name: info.id,
        executable: executableName
      })
      if (res == '1') {
        setDownloadProgress(prev =>
          prev.filter(d => d.version !== download.version)
        )
        let data = downloadedVersionsConfig
        if (!data) {
          setDownloadProgress(prev =>
            prev.filter(d => d.version !== download.version)
          )
          return
        }
        const date = Date.now()
        data.list = [...data.list, download.version]
        data.timestamps = { ...data.timestamps, [download.version]: date }
        setDownloadedVersionsConfig(data)
        writeVersionsConfig(data)
      } else {
        setDownloadProgress(prev =>
          prev.map(d =>
            d.version === download.version
              ? { ...d, queued: false, failed: true, progress: 0 }
              : d
          )
        )
        await notifyUser(
          'Download Failed',
          `The download for version ${gameInfo.name} v${info.versionName} has failed.`
        )
      }
    }

    await notifyUser('Downloads Finished', 'All downloads have finished.')
  }

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
                      openUrl('https://games.lncvrt.xyz/berrydash/download')
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
            <GlobalProvider
              value={{
                serverVersionList,
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
                setManagingVersion,
                getVersionInfo,
                getVersionGame,
                getListOfGames,
                setSelectedGame
              }}
            >
              <div
                tabIndex={0}
                onKeyDown={e => {
                  if (showPopup && e.key === 'Escape') {
                    if (popupMode == 0 && selectedGame) {
                      setSelectedGame(null)
                      setSelectedVersionList([])
                    } else {
                      setFadeOut(true)
                      setTimeout(() => setShowPopup(false), 200)
                    }
                  }
                }}
              >
                <Sidebar />
                <div
                  className='relative z-2 ml-[239px] w-[761px] border-b border-[#242424] h-[33px] bg-[#161616]'
                  style={{
                    display: platform() === 'windows' ? 'block' : 'none'
                  }}
                />
                <div className='relative z-0'>
                  <main style={{ marginLeft: '15rem' }}>{children}</main>
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
                          if (popupMode == 0 && selectedGame) {
                            setSelectedGame(null)
                            setSelectedVersionList([])
                          } else {
                            setFadeOut(true)
                            setTimeout(() => setShowPopup(false), 200)
                          }
                        }}
                      >
                        <FontAwesomeIcon
                          icon={
                            popupMode == 0 && selectedGame
                              ? faChevronLeft
                              : faXmark
                          }
                        />
                      </button>
                      {popupMode === 0 && selectedGame ? (
                        <>
                          <p className='text-xl text-center'>
                            Select versions to download
                          </p>
                          <div className='popup-content'>
                            {getSpecialVersionsList(selectedGame).map(
                              (v, i) => (
                                <div key={i} className='popup-entry'>
                                  <p className='text-2xl'>
                                    {getVersionGame(v.game)?.name} v
                                    {v.versionName}
                                  </p>
                                  <button
                                    className='button right-2 bottom-2'
                                    onClick={() => {
                                      setSelectedVersionList(prev =>
                                        prev.includes(v.id)
                                          ? prev.filter(i => i !== v.id)
                                          : [...prev, v.id]
                                      )
                                    }}
                                  >
                                    {selectedVersionList.includes(v.id) ? (
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
                              )
                            )}
                          </div>
                        </>
                      ) : popupMode === 0 && !selectedGame ? (
                        <>
                          <p className='text-xl text-center'>
                            Select a game to download
                          </p>
                          <div className='popup-content'>
                            {serverVersionList?.games.map((v, i) => (
                              <div key={i} className='popup-entry'>
                                <p className='text-2xl'>{v.name}</p>
                                <button
                                  className='button right-2 bottom-2'
                                  onClick={() => setSelectedGame(v.id)}
                                >
                                  <>
                                    <FontAwesomeIcon icon={faDownload} />{' '}
                                    Download
                                  </>
                                </button>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : popupMode === 1 ? (
                        <>
                          <p className='text-xl text-center'>Downloads</p>
                          <div className='popup-content'>
                            {downloadProgress.length === 0 ? (
                              <p className='text-center mt-6'>
                                No more downloads!
                              </p>
                            ) : (
                              downloadProgress.map((v, i) => (
                                <div
                                  key={i}
                                  className='popup-entry flex flex-col justify-between'
                                >
                                  <p className='text-2xl'>
                                    {
                                      getVersionGame(
                                        getVersionInfo(v.version)?.game
                                      )?.name
                                    }{' '}
                                    v{getVersionInfo(v.version)?.versionName}
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
                                            onClick={() => {
                                              setDownloadProgress(prev =>
                                                prev.filter(
                                                  d => d.version !== v.version
                                                )
                                              )
                                            }}
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
                              Manage{' '}
                              {
                                getVersionGame(
                                  getVersionInfo(managingVersion)?.game
                                )?.name
                              }{' '}
                              v{getVersionInfo(managingVersion)?.versionName}
                            </p>
                            <div className='popup-content flex flex-col items-center justify-center gap-2 h-full'>
                              <button
                                className='button'
                                onClick={() =>
                                  invoke('uninstall_version', {
                                    name: managingVersion
                                  })
                                }
                              >
                                Uninstall
                              </button>
                              <button
                                className='button'
                                onClick={async () =>
                                  invoke('open_folder', {
                                    name: managingVersion
                                  })
                                }
                              >
                                Open Folder
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className='text-xl text-center'>
                            No version selected
                          </p>
                        )
                      ) : null}
                      {popupMode == 0 &&
                        selectedGame &&
                        serverVersionList != null && (
                          <div className='flex justify-center'>
                            <button
                              className='button w-fit mt-2 -mb-4'
                              onClick={() => {
                                setFadeOut(true)
                                setTimeout(() => setShowPopup(false), 200)
                                downloadVersions()
                              }}
                            >
                              Download {selectedVersionList.length} version
                              {selectedVersionList.length == 1 ? '' : 's'}
                            </button>
                            <button
                              className='button w-fit mt-2 ml-2 -mb-4'
                              onClick={() => {
                                const allIds = getSpecialVersionsList(
                                  selectedGame
                                ).map(v => v.id)
                                setSelectedVersionList(prev =>
                                  prev.length === allIds.length ? [] : allIds
                                )
                              }}
                            >
                              {selectedVersionList.length ===
                              getSpecialVersionsList(selectedGame).length
                                ? 'Deselect All'
                                : 'Select All'}
                            </button>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </GlobalProvider>
          )}
        </body>
      </html>
    </>
  )
}
