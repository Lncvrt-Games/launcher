import { useEffect } from 'react'
import axios from 'axios'
import { InstallsProps } from '../types/InstallsProps'
import { platform } from '@tauri-apps/plugin-os'
import './Installs.css'
import { format } from 'date-fns'
import { invoke } from '@tauri-apps/api/core'
import { message } from '@tauri-apps/plugin-dialog'

export default function Installs ({
  downloadProgress,
  showPopup,
  setShowPopup,
  setPopupMode,
  setFadeOut,
  setSelectedVersionList,
  setVersionList,
  downloadedVersionsConfig,
  normalConfig
}: InstallsProps) {
  useEffect(() => {
    if (!showPopup) return
    setSelectedVersionList([])
    setVersionList(null)
    ;(async () => {
      try {
        while (normalConfig != null) {
          const useWine = normalConfig.settings.useWineOnUnixWhenNeeded
          const res = await axios.get(
            'https://berrydash.lncvrt.xyz/database/launcher/versions.php'
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
  }, [showPopup])

  return (
    <div className='mx-4 mt-4'>
      <div className='flex justify-between items-center mb-4'>
        <p className='text-3xl'>Install</p>
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
                      {format(new Date(entry.installDate), 'yyyy/MM/dd')}
                    </p>
                  </div>
                  <div className='flex flex-row items-center gap-2'>
                    <button
                      className='button'
                      onClick={async () => {
                        let plat = platform()
                        let willUseWine = false
                        if (plat === 'macos' || plat === 'linux') {
                          if (
                            !entry.version.platforms.includes(plat) &&
                            entry.version.platforms.includes('windows')
                          ) {
                            while (normalConfig != null) {
                              if (
                                !normalConfig.settings.useWineOnUnixWhenNeeded
                              ) {
                                await message(
                                  'Wine support is disabled in settings and this version requires wine',
                                  {
                                    title:
                                      'Wine is needed to load this version',
                                    kind: 'error'
                                  }
                                )
                                return
                              }
                              break
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
                          wine: willUseWine
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
