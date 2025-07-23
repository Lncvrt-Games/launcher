import { useEffect, useState } from 'react'
import { Setting } from '../componets/Setting'
import { readNormalConfig, writeNormalConfig } from '../util/BazookaManager'
import { platform } from '@tauri-apps/plugin-os'

export default function Settings () {
  const [checkForNewVersionOnLoad, setCheckForNewVersionOnLoad] =
    useState(false)
  const [useWineOnUnixWhenNeeded, setUseWineOnUnixWhenNeeded] = useState(false)
  const [allowNotifications, setAllowNotifications] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      const config = await readNormalConfig()
      setCheckForNewVersionOnLoad(config.settings.checkForNewVersionOnLoad)
      setUseWineOnUnixWhenNeeded(config.settings.useWineOnUnixWhenNeeded)
      setAllowNotifications(config.settings.allowNotifications)
      setLoaded(true)
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
              setCheckForNewVersionOnLoad(!checkForNewVersionOnLoad)
              const config = await readNormalConfig()
              config.settings.checkForNewVersionOnLoad = !checkForNewVersionOnLoad
              await writeNormalConfig(config)
            }}
          />
          <Setting
            label='Allow sending notifications'
            value={allowNotifications}
            onChange={async () => {
              setAllowNotifications(!allowNotifications)
              const config = await readNormalConfig()
              config.settings.allowNotifications = !allowNotifications
              await writeNormalConfig(config)
            }}
          />
          <Setting
            label='Use wine to launch Berry Dash when needed'
            value={useWineOnUnixWhenNeeded}
            onChange={async () => {
              setUseWineOnUnixWhenNeeded(!useWineOnUnixWhenNeeded)
              const config = await readNormalConfig()
              config.settings.useWineOnUnixWhenNeeded = !useWineOnUnixWhenNeeded
              await writeNormalConfig(config)
            }}
            className={platform() == 'linux' || platform() == 'macos' ? '' : 'hidden'}
          />
        </div>
      )}
    </>
  )
}
