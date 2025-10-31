'use client'

import { useEffect } from 'react'
import { platform } from '@tauri-apps/plugin-os'
import '../Installs.css'
import { format } from 'date-fns'
import { invoke } from '@tauri-apps/api/core'
import { message } from '@tauri-apps/plugin-dialog'
import { useGlobal } from '../GlobalProvider'
import { useSearchParams } from 'next/navigation'

export default function Installs () {
  const {
    downloadProgress,
    showPopup,
    setShowPopup,
    setPopupMode,
    setFadeOut,
    setSelectedVersionList,
    downloadedVersionsConfig,
    normalConfig,
    setManagingVersion,
    getVersionInfo,
    getVersionGame,
    setSelectedGame
  } = useGlobal()

  const params = useSearchParams()

  useEffect(() => {
    if (!showPopup) return
    setSelectedVersionList([])
  }, [normalConfig, setSelectedVersionList, showPopup])

  return (
    <div className='mx-4 mt-4'>
      <div className='flex justify-between items-center mb-4'>
        <p className='text-3xl'>Installs</p>
        <button
          className='button text-3xl'
          onClick={() => {
            setSelectedGame(Number(params.get('id') || 0))
            setPopupMode(0)
            setShowPopup(true)
            setFadeOut(false)
          }}
          disabled={downloadProgress.length != 0}
        >
          Download versions
        </button>
      </div>
      <div className='downloads-container'>
        <div className='downloads-scroll'>
          {downloadedVersionsConfig && downloadedVersionsConfig.list.length ? (
            downloadedVersionsConfig.list
              .filter(v => {
                const info = getVersionInfo(v)
                if (!info) return false
                return info.game === Number(params.get('id') || 0)
              })
              .sort((a, b) => {
                const infoA = getVersionInfo(a)
                const infoB = getVersionInfo(b)
                if (!infoA && !infoB) return 0
                if (!infoA) return 1
                if (!infoB) return -1
                return infoB.place - infoA.place
              })
              .map((entry, i) => (
                <div key={i} className='downloads-entry'>
                  <div className='flex flex-col'>
                    <p className='text-2xl'>
                      {getVersionGame(getVersionInfo(entry)?.game)?.name} v
                      {getVersionInfo(entry)?.versionName}
                    </p>
                    <p className='text-gray-400 text-md'>
                      Installed{' '}
                      {format(
                        new Date(downloadedVersionsConfig.timestamps[entry]),
                        'MM/dd/yyyy'
                      )}
                    </p>
                  </div>
                  <div className='flex flex-row items-center gap-2'>
                    <button
                      className='button'
                      onClick={async () => {
                        setManagingVersion(entry)
                        setPopupMode(2)
                        setShowPopup(true)
                        setFadeOut(false)
                      }}
                    >
                      Manage
                    </button>
                    <button
                      className='button button-green'
                      onClick={async () => {
                        const verInfo = getVersionInfo(entry)
                        if (verInfo == undefined) return
                        let plat = platform()
                        let willUseWine = false
                        let cfg = null
                        while (normalConfig != null) {
                          cfg = normalConfig
                          break
                        }
                        if (plat === 'macos' || plat === 'linux') {
                          if (
                            !verInfo.platforms.includes(plat) &&
                            verInfo.platforms.includes('windows')
                          ) {
                            if (
                              cfg != null &&
                              !cfg.settings.useWineOnUnixWhenNeeded
                            ) {
                              await message(
                                'Wine support is disabled in settings and this version requires wine',
                                {
                                  title: 'Wine is needed to load this version',
                                  kind: 'error'
                                }
                              )
                              return
                            }
                            plat = 'windows'
                            willUseWine = true
                          }
                        }
                        invoke('launch_game', {
                          name: verInfo.id,
                          executable:
                            verInfo.executables[
                              verInfo.platforms.indexOf(plat)
                            ],
                          wine: willUseWine,
                          wineCommand: cfg?.settings.wineOnUnixCommand
                        })
                      }}
                    >
                      Launch
                    </button>
                  </div>
                </div>
              ))
          ) : (
            <div className='flex justify-center items-center h-full'>
              <p className='text-3xl'>No games installed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
