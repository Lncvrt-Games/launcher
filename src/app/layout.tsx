'use client'

import { useCallback, useEffect, useState } from 'react'
import Sidebar from './componets/Sidebar'
import './Globals.css'
import { DownloadProgress } from './types/DownloadProgress'
import { invoke } from '@tauri-apps/api/core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faAdd,
  faCheck,
  faChevronLeft,
  faCode,
  faDownload,
  faRemove,
  faShieldHalved,
  faWarning,
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
import { usePathname } from 'next/navigation'
import { arch, platform } from '@tauri-apps/plugin-os'
import VersionInfo from './componets/VersionInfo'

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

  const pathname = usePathname()

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

    listen<string>('download-hash-checking', event => {
      const versionName = event.payload
      setDownloadProgress(prev => {
        const i = prev.findIndex(d => d.version === versionName)
        if (i === -1) return prev
        const copy = [...prev]
        copy[i] = { ...copy[i], hash_checking: true }
        return copy
      })
    }).then(f => (unlistenProgress = f))

    listen<string>('download-finishing', event => {
      const versionName = event.payload
      setDownloadProgress(prev => {
        const i = prev.findIndex(d => d.version === versionName)
        if (i === -1) return prev
        const copy = [...prev]
        copy[i] = { ...copy[i], hash_checking: false, finishing: true }
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
          `https://games.lncvrt.xyz/api/launcher/versions?platform=${platform()}&arch=${arch()}`
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

    return serverVersionList.versions
      .filter(v => !downloadedVersionsConfig?.list.includes(v.id))
      .filter(v => {
        if (game && v.game != game) return false
        return true
      })
      .sort((a, b) => {
        if (b.game !== a.game) return a.game - b.game
        return 0
      })
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
      version => new DownloadProgress(version, 0, false, true, false, false)
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
      setDownloadProgress(prev =>
        prev.map(d =>
          d.version === download.version ? { ...d, queued: false } : d
        )
      )
      const res = await invoke<string>('download', {
        url: info.downloadUrl,
        name: info.id,
        executable: info.executable,
        hash: info.sha512sum
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

  function getVersionsAmountData (gameId: number): {
    installed: number
    total: number
  } | null {
    if (!downloadedVersionsConfig || !serverVersionList) return null

    const installed = downloadedVersionsConfig.list.filter(
      v => getVersionGame(getVersionInfo(v)?.game)?.id === gameId
    ).length

    const total = serverVersionList.versions.filter(
      v => getVersionGame(v?.game)?.id === gameId
    ).length

    return { installed, total }
  }

  return (
    <>
      <html lang='en' className={roboto.className}>
        <body
          className={
            normalConfig?.settings.theme === 1
              ? 'red-theme'
              : normalConfig?.settings.theme === 2
              ? 'green-theme'
              : normalConfig?.settings.theme === 3
              ? 'blue-theme'
              : normalConfig?.settings.theme === 4
              ? 'purple-theme'
              : 'dark-theme'
          }
        >
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
                setSelectedGame,
                getVersionsAmountData
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
                  className='relative z-2 ml-[239px] w-[761px] border-b border-(--col3) h-[33px] bg-(--col1)'
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
                          if (
                            popupMode == 0 &&
                            selectedGame &&
                            pathname === '/'
                          ) {
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
                            popupMode == 0 && selectedGame && pathname === '/'
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
                                <div className='flex gap-2'>
                                  <div className='entry-info-item'>
                                    <p>
                                      {(() => {
                                        const data = getVersionsAmountData(v.id)
                                        if (!data) return 'N/A'
                                        return `${data.installed}/${data.total}`
                                      })()}{' '}
                                      versions installed
                                    </p>
                                  </div>
                                  <div
                                    className='entry-info-item'
                                    hidden={!v.official}
                                  >
                                    <FontAwesomeIcon
                                      icon={faCheck}
                                      color='#19c84b'
                                    />
                                    <p>Official</p>
                                  </div>
                                  <div
                                    className='entry-info-item'
                                    hidden={v.official}
                                  >
                                    <FontAwesomeIcon
                                      icon={
                                        v.verified ? faShieldHalved : faWarning
                                      }
                                      color={v.verified ? '#19c84b' : '#ffc800'}
                                    />
                                    <p>
                                      {v.verified ? 'Verified' : 'Unverified'}
                                    </p>
                                  </div>
                                </div>
                                <div
                                  className='entry-info-item mt-2'
                                  hidden={v.official}
                                >
                                  <FontAwesomeIcon
                                    icon={faCode}
                                    color='lightgray'
                                  />
                                  <p>Developer: {v.developer}</p>
                                </div>
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
                                    ) : v.queued ? (
                                      <span className='text-yellow-500'>
                                        Queued…
                                      </span>
                                    ) : v.hash_checking ? (
                                      <span className='text-blue-500'>
                                        Checking hash...
                                      </span>
                                    ) : v.finishing ? (
                                      <span className='text-green-500'>
                                        Finishing...
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
                      ) : popupMode === 3 ? (
                        managingVersion && downloadedVersionsConfig ? (
                          <VersionInfo />
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
