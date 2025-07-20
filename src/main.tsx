import { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import Installs from './routes/Installs'
import Settings from './routes/Settings'
import Sidebar from './componets/Sidebar'
import './Globals.css'
import { LauncherVersion } from './types/LauncherVersion'
import { DownloadProgress } from './types/DownloadProgress'
import { platform } from '@tauri-apps/plugin-os'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAdd, faRemove, faX } from '@fortawesome/free-solid-svg-icons'
import '@fontsource/roboto'

function App () {
  const [hash, setHash] = useState(window.location.hash || '#installs')
  const [versionList, setVersionList] = useState<null | LauncherVersion[]>(null);
  const [selectedVersionList, setSelectedVersionList] = useState<LauncherVersion[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress[]>([]);
  const [showPopup, setShowPopup] = useState(false)
  const [popupMode, setPopupMode] = useState<null | number>(null)
  const [fadeOut, setFadeOut] = useState(false)

  listen<string>('download-progress', (event) => {
    const [urlEnc, progStr] = event.payload.split(':')
    const url = atob(urlEnc)
    const prog = Number(progStr)
    setDownloadProgress(prev => {
      const i = prev.findIndex(d => d.version.downloadUrls[d.version.platforms.indexOf(platform())] === url)
      if (i === -1) return prev
      if (prog >= 100) return prev.filter((_, j) => j !== i)
      const copy = [...prev]
      copy[i] = { ...copy[i], progress: prog }
      return copy
    })
  })

  function downloadVersions(versions: LauncherVersion[]) {
    const newDownloads = versions.map(v => new DownloadProgress(v, 0, false));
    setDownloadProgress(prev => [...prev, ...newDownloads]);

    newDownloads.forEach(download => {
      invoke('download', { url: download.version.downloadUrls[download.version.platforms.indexOf(platform())], name: download.version.version });
    });
  }

  function handleOverlayClick (e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      setFadeOut(true)
      setTimeout(() => setShowPopup(false), 200)
    }
  }

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#installs')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('contextmenu', handler)
    return () => document.removeEventListener('contextmenu', handler)
  }, [])

  function renderContent () {
    if (hash === '#installs') {
      return <Installs downloadProgress={downloadProgress} showPopup={showPopup} setShowPopup={setShowPopup} setPopupMode={setPopupMode} setFadeOut={setFadeOut} setSelectedVersionList={setSelectedVersionList} setVersionList={setVersionList} />
    } else if (hash === '#settings') {
      return <Settings />
    }
    return null
  }

  return (
    <>
      <Sidebar setShowPopup={setShowPopup} setPopupMode={setPopupMode} setFadeOut={setFadeOut} />
      <div className="relative z-[1] ml-[239px] w-[761px] border-b border-[#323232] h-[33px] bg-[#161616]" style={{ display: platform() == 'windows' ? 'block' : 'none' }}></div>
      <div className="relative z-0">
        <main style={{ marginLeft: '15rem' }}>{renderContent()}</main>
      </div>
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
            {popupMode === 0 ? (
              <>
                <p className='text-xl text-center'>Select versions to download</p>
                <div className='popup-content'>
                  {versionList == null ? (
                    <p className='text-center'>Getting version list...</p>
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
              </>
            ) : popupMode === 1 ? (
              <>
                <p className='text-xl text-center'>Downloads</p>
                <div className='popup-content'>
                  {downloadProgress.length === 0 ? (
                    <p className='text-center mt-6'>Nothing here...</p>
                  ) : (
                    downloadProgress.map((v, i) => (
                      <div key={i} className='popup-entry'>
                        <p className='text-2xl'>Berry Dash v{v.version.displayName}</p>
                        <p className='mt-[25px]'>{v.progress}% downloaded</p>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : null}
            {popupMode == 0 && versionList != null && (
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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
)
