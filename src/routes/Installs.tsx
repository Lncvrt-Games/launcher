import './Installs.css'
import { useEffect } from 'react'
import axios from 'axios'
import { InstallsProps } from '../types/InstallsProps'
import { platform } from '@tauri-apps/plugin-os'

export default function Installs({ downloadProgress, showPopup, setShowPopup, setPopupMode, setFadeOut, setSelectedVersionList, setVersionList }: InstallsProps) {
  useEffect(() => {
    if (!showPopup) return
    setSelectedVersionList([]);
    setVersionList(null)
    axios.get('https://berrydash.lncvrt.xyz/database/launcher/versions.php')
      .then(res => setVersionList(res.data.reverse().filter((d: { platforms: string[] }) => d.platforms.includes(platform()))))
      .catch(() => setVersionList([]))
  }, [showPopup])

  return (
    <>
      <p className='text-3xl ml-4 mt-4'>Installs</p>
      <button
        className='button text-3xl mt-4 absolute right-4 top-4'
        onClick={() => { setPopupMode(0); setShowPopup(true); setFadeOut(false) }}
        disabled={downloadProgress.length != 0}
      >
        Download new version
      </button>
    </>
  )
}
