'use client'

import { useEffect, useState } from 'react'
import { Setting } from '../componets/Setting'
import { writeNormalConfig } from '../util/BazookaManager'
import { platform } from '@tauri-apps/plugin-os'
import { invoke } from '@tauri-apps/api/core'
import { useGlobal } from '../GlobalProvider'

export default function Settings () {
  const [checkForNewVersionOnLoad, setCheckForNewVersionOnLoad] =
    useState(false)
  const [allowNotifications, setAllowNotifications] = useState(false)
  const [useWineOnUnixWhenNeeded, setUseWineOnUnixWhenNeeded] = useState(false)
  const [wineOnUnixCommand, setWineOnUnixCommand] = useState('wine %path%')
  const [loaded, setLoaded] = useState(false)
  const { normalConfig } = useGlobal()

  useEffect(() => {
    ;(async () => {
      while (normalConfig != null) {
        setCheckForNewVersionOnLoad(
          normalConfig.settings.checkForNewVersionOnLoad
        )
        setUseWineOnUnixWhenNeeded(
          normalConfig.settings.useWineOnUnixWhenNeeded
        )
        setWineOnUnixCommand(normalConfig.settings.wineOnUnixCommand)
        setAllowNotifications(normalConfig.settings.allowNotifications)
        setLoaded(true)
        break
      }
    })()
  }, [normalConfig])

  return (
    <>
      <p className='text-3xl ml-4 mt-4'>Settings</p>
      {loaded && (
        <div className='ml-4 mt-4 bg-[#161616] border border-[#242424] rounded-lg p-4 w-fit h-fit'>
          <Setting
            label='Check for new version on load'
            value={checkForNewVersionOnLoad}
            onChange={async () => {
              while (normalConfig != null) {
                setCheckForNewVersionOnLoad(!checkForNewVersionOnLoad)
                normalConfig.settings.checkForNewVersionOnLoad =
                  !checkForNewVersionOnLoad
                await writeNormalConfig(normalConfig)
                break
              }
            }}
          />
          <Setting
            label='Allow sending notifications'
            value={allowNotifications}
            onChange={async () => {
              while (normalConfig != null) {
                setAllowNotifications(!allowNotifications)
                normalConfig.settings.allowNotifications = !allowNotifications
                await writeNormalConfig(normalConfig)
                break
              }
            }}
          />
          <Setting
            label='Use wine to launch Berry Dash when needed'
            value={useWineOnUnixWhenNeeded}
            onChange={async () => {
              while (normalConfig != null) {
                setUseWineOnUnixWhenNeeded(!useWineOnUnixWhenNeeded)
                normalConfig.settings.useWineOnUnixWhenNeeded =
                  !useWineOnUnixWhenNeeded
                await writeNormalConfig(normalConfig)
                break
              }
            }}
            className={platform() == 'linux' ? '' : 'hidden'}
          />
          <input
            type='text'
            value={wineOnUnixCommand}
            onChange={async e => {
              while (normalConfig != null) {
                setWineOnUnixCommand(e.target.value)
                normalConfig.settings.wineOnUnixCommand = e.target.value
                await writeNormalConfig(normalConfig)
                break
              }
            }}
            className={`input-field ${
              platform() == 'linux' && useWineOnUnixWhenNeeded ? '' : 'hidden'
            }`}
          ></input>
        </div>
      )}
    </>
  )
}
