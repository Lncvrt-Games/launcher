import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './Installs.css'
import { useEffect, useState } from 'react'
import { faAdd, faRemove, faX } from '@fortawesome/free-solid-svg-icons'
import { LauncherVersion } from '../types/LauncherVersion'
import axios from 'axios'
import { InstallsProps } from '../types/InstallsProps'

export default function Installs({ downloadVersions }: InstallsProps) {
  const [showPopup, setShowPopup] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const [versionList, setVersionList] = useState<null | LauncherVersion[]>(null);
  const [selectedVersionList, setSelectedVersionList] = useState<LauncherVersion[]>([]);

  function downloadVersion () {
    setShowPopup(true)
    setFadeOut(false)
  }

  function handleOverlayClick (e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      setFadeOut(true)
      setTimeout(() => setShowPopup(false), 200)
    }
  }

  useEffect(() => {
    if (!showPopup) return
    setSelectedVersionList([]);
    setVersionList(null)
    axios.get('https://berrydash.lncvrt.xyz/database/launcher/versions.php')
      .then(res => setVersionList(res.data.reverse()))
      .catch(() => setVersionList([]))
  }, [showPopup])

  return (
    <>
      <p className='text-3xl ml-4 mt-4'>Installs</p>
      <button
        className='button text-3xl mt-4 absolute right-4 top-4'
        onClick={downloadVersion}
      >
        Download new version
      </button>
      {showPopup && (
        <div
          className={`popup-overlay ${fadeOut ? 'fade-out' : ''}`}
          onClick={handleOverlayClick}
        >
          <div className='popup-box'>
            <button
              className='close-button'
              onClick={() => {
                setFadeOut(true)
                setTimeout(() => setShowPopup(false), 200)
              }}
            >
              <FontAwesomeIcon icon={faX} />
            </button>
            <p className='text-xl text-center'>Select versions to download</p>
            <div className='popup-content'>
              {versionList == null ? (
                <p className='text-center'>Downloading version list...</p>
              ) : (
                versionList.map((v, i) => 
                  <div key={i} className='popup-entry'>
                    <p className='text-2xl'>Berry Dash v{v.displayName}</p>
                    <button className='button right-2 bottom-2' onClick={() => {
                      if (!selectedVersionList) return
                      if (!selectedVersionList.includes(v)) {
                        setSelectedVersionList([...selectedVersionList, v])
                      } else {
                        setSelectedVersionList(selectedVersionList.filter(x => x !== v))
                      }
                    }}>{selectedVersionList.includes(v) ? <><FontAwesomeIcon icon={faRemove} /> Remove</> : <><FontAwesomeIcon icon={faAdd} /> Add</>}</button>
                  </div>
                )
              )}
            </div>
            {versionList != null && (
              <div className='flex justify-center'>
                <button className='button w-fit mt-2 mb-[-16px]' onClick={() => {
                  setFadeOut(true)
                  setTimeout(() => setShowPopup(false), 200)
                  downloadVersions(selectedVersionList)
                }}>Download {selectedVersionList.length} version{selectedVersionList.length == 1 ? '' : 's'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
