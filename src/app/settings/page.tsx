'use client'

import { useEffect, useState } from 'react'
import { Setting } from '../componets/Setting'
import { writeNormalConfig } from '../util/BazookaManager'
import { useGlobal } from '../GlobalProvider'

export default function Settings () {
  const [allowNotifications, setAllowNotifications] = useState(false)
  const [alwaysShowGamesInSidebar, setAlwaysShowGamesInSidebar] =
    useState(false)
  const [loaded, setLoaded] = useState(false)
  const { normalConfig, setNormalConfig } = useGlobal()

  useEffect(() => {
    ;(async () => {
      while (normalConfig != null) {
        setAllowNotifications(normalConfig.settings.allowNotifications)
        setAlwaysShowGamesInSidebar(
          normalConfig.settings.alwaysShowGamesInSidebar
        )
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
            label='Always show games in sidebar'
            value={alwaysShowGamesInSidebar}
            onChange={async () => {
              while (normalConfig != null) {
                setAlwaysShowGamesInSidebar(!alwaysShowGamesInSidebar)
                setNormalConfig({
                  ...normalConfig,
                  settings: {
                    ...normalConfig.settings,
                    alwaysShowGamesInSidebar: !alwaysShowGamesInSidebar
                  }
                })
                writeNormalConfig({
                  ...normalConfig,
                  settings: {
                    ...normalConfig.settings,
                    alwaysShowGamesInSidebar: !alwaysShowGamesInSidebar
                  }
                })
                break
              }
            }}
          />
        </div>
      )}
    </>
  )
}
