import { useEffect, useState } from 'react'
import { Setting } from '../componets/Setting'
import { writeNormalConfig } from '../util/BazookaManager'
import { platform } from '@tauri-apps/plugin-os'
import { SettingsProps } from '../types/SettingsProps'
import { invoke } from '@tauri-apps/api/core'

export default function Settings ({ normalConfig }: SettingsProps) {
  const [checkForNewVersionOnLoad, setCheckForNewVersionOnLoad] =
    useState(false)
  const [allowNotifications, setAllowNotifications] = useState(false)
  const [useWineOnUnixWhenNeeded, setUseWineOnUnixWhenNeeded] = useState(false)
  const [useWindowsRoundedCorners, setUseWindowsRoundedCorners] =
    useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      while (normalConfig != null) {
        setCheckForNewVersionOnLoad(
          normalConfig.settings.checkForNewVersionOnLoad
        )
        setUseWineOnUnixWhenNeeded(
          normalConfig.settings.useWineOnUnixWhenNeeded
        )
        setAllowNotifications(normalConfig.settings.allowNotifications)
        setUseWindowsRoundedCorners(
          normalConfig.settings.useWindowsRoundedCorners
        )
        setLoaded(true)
        break
      }
    })()
  }, [])

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
          <Setting
            label='Use rounded corners (if supported)'
            value={useWindowsRoundedCorners}
            onChange={async () => {
              while (normalConfig != null) {
                setUseWindowsRoundedCorners(!useWindowsRoundedCorners)
                normalConfig.settings.useWindowsRoundedCorners =
                  !useWindowsRoundedCorners
                await writeNormalConfig(normalConfig)
                invoke('windows_rounded_corners', {
                  enabled: !useWindowsRoundedCorners
                })
                break
              }
            }}
            className={platform() == 'windows' ? '' : 'hidden'}
          />
        </div>
      )}
    </>
  )
}
