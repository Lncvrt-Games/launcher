import { useEffect } from 'react'
import axios from 'axios'
import { InstallsProps } from '../types/InstallsProps'
import { platform } from '@tauri-apps/plugin-os'
import { readNormalConfig } from '../util/BazookaManager'

export default function Installs({ downloadProgress, showPopup, setShowPopup, setPopupMode, setFadeOut, setSelectedVersionList, setVersionList }: InstallsProps) {
  useEffect(() => {
    if (!showPopup) return
    setSelectedVersionList([])
    setVersionList(null)
    ;(async () => {
      try {
        const config = await readNormalConfig()
        const useWine = config.settings.useWineOnUnixWhenNeeded
        const res = await axios.get('https://berrydash.lncvrt.xyz/database/launcher/versions.php')
        const p = platform()
        const filtered = res.data.filter((d: { platforms: string[] }) =>
          p === 'macos' || p === 'linux'
            ? useWine
              ? d.platforms.includes('windows') || d.platforms.includes(p)
              : d.platforms.includes(p)
            : d.platforms.includes(p)
        )
        setVersionList(filtered)
      } catch {
        setVersionList([])
      }
    })()
  }, [showPopup])

  return (
    <div className='flex justify-between items-center mt-4 mx-4'>
      <p className='text-3xl'>Installs</p>
      <button
        className='button text-3xl'
        onClick={() => { setPopupMode(0); setShowPopup(true); setFadeOut(false) }}
        disabled={downloadProgress.length != 0}
      >
        Download new version
      </button>
    </div>
  )
}
