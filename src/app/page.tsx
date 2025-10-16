'use client'

import { useEffect } from 'react'
import axios from 'axios'
import { platform } from '@tauri-apps/plugin-os'
import './Installs.css'
import { format } from 'date-fns'
import { invoke } from '@tauri-apps/api/core'
import { message } from '@tauri-apps/plugin-dialog'
import { useGlobal } from './GlobalProvider'

export default function Installs () {
  const {
    downloadProgress,
    showPopup,
    setShowPopup,
    setPopupMode,
    setFadeOut,
    setSelectedVersionList,
    setVersionList,
    downloadedVersionsConfig,
    normalConfig,
    setManagingVersion
  } = useGlobal()

  useEffect(() => {
    if (!showPopup) return
    setSelectedVersionList([])
    setVersionList(null)
    ;(async () => {
      try {
        while (normalConfig != null) {
          const useWine = normalConfig.settings.useWineOnUnixWhenNeeded
          const res = await axios.get(
            'https://games.lncvrt.xyz/database/launcher/versions.php'
          )
          const p = platform()
          const filtered = res.data.filter((d: { platforms: string[] }) =>
            p === 'macos' || p === 'linux'
              ? useWine
                ? d.platforms.includes('windows') || d.platforms.includes(p)
                : d.platforms.includes(p)
              : d.platforms.includes(p)
          )
          setVersionList(filtered)
          break
        }
      } catch {
        setVersionList([])
      }
    })()
  }, [normalConfig, setSelectedVersionList, setVersionList, showPopup])

  return (
    <div className='mx-4 mt-4'>
      <div className='flex justify-between items-center mb-4'>
        <p className='text-3xl'>Installs</p>
        <button
          className='button text-3xl'
          onClick={() => {
            setPopupMode(0)
            setShowPopup(true)
            setFadeOut(false)
          }}
          disabled={downloadProgress.length != 0}
        >
          Download new version
        </button>
      </div>
      <div className='downloads-container'>
        <div className='downloads-scroll'>
          {downloadedVersionsConfig && downloadedVersionsConfig.list.length ? (
            downloadedVersionsConfig.list
              .sort((a, b) => b.version.id - a.version.id)
              .map((entry, i) => (
                <div key={i} className='downloads-entry'>
                  <div className='flex flex-col'>
                    <p className='text-2xl'>
                      Berry Dash v{entry.version.displayName}
                    </p>
                    <p className='text-gray-400 text-md'>
                      Installed{' '}
                      {format(new Date(entry.installDate), 'MM/dd/yyyy')}
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
                        let plat = platform()
                        let willUseWine = false
                        let cfg = null
                        while (normalConfig != null) {
                          cfg = normalConfig
                          break
                        }
                        if (plat === 'macos' || plat === 'linux') {
                          if (
                            !entry.version.platforms.includes(plat) &&
                            entry.version.platforms.includes('windows')
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
                          name: entry.version.version,
                          executable:
                            entry.version.executables[
                              entry.version.platforms.indexOf(plat)
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
              <p className='text-3xl'>No versions installed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
