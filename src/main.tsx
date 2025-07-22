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
import Leaderboards from './routes/Leaderboards'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'

function App () {
  const [hash, setHash] = useState(window.location.hash || '#installs')
  const [versionList, setVersionList] = useState<null | LauncherVersion[]>(null);
  const [selectedVersionList, setSelectedVersionList] = useState<LauncherVersion[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress[]>([]);
  const [showPopup, setShowPopup] = useState(false)
  const [popupMode, setPopupMode] = useState<null | number>(null)
  const [fadeOut, setFadeOut] = useState(false)
  let activeDownloads = 0
  const queue: (() => void)[] = []

  function runNext() {
    if (activeDownloads >= 3 || queue.length === 0) return
    activeDownloads++
    const next = queue.shift()
    next?.()
  }

  useEffect(() => {
    const unlistenProgress = listen<string>('download-progress', (event) => {
      const [versionName, progStr] = event.payload.split(':')
      const prog = Number(progStr)

      setDownloadProgress(prev => {
        const i = prev.findIndex(d => d.version.version === versionName)
        if (i === -1) return prev
        const copy = [...prev]
        copy[i] = { ...copy[i], progress: prog }
        return copy
      })
    })

    const unlistenDone = listen<string>('download-done', async (event) => {
      const versionName = event.payload
      setDownloadProgress(prev => prev.filter(d => d.version.version !== versionName))
      activeDownloads--
      runNext()
      if (downloadProgress.length === 0) {
        await notifyUser('Downloads Complete', 'All downloads have completed.')
      }
    })

    const unlistenFailed = listen<string>('download-failed', async (event) => {
      const versionName = event.payload
      setDownloadProgress(prev =>
        prev.map(d =>
          d.version.version === versionName ? { ...d, failed: true } : d
        )
      )
      activeDownloads--
      runNext()
      await notifyUser('Download Failed', `The download for version ${versionName} has failed.`)
    })

    return () => {
      unlistenProgress.then(f => f())
      unlistenDone.then(f => f())
      unlistenFailed.then(f => f())
    }
  }, [])

  function downloadVersions(versions: LauncherVersion[]) {
    const newDownloads = versions.map(v => new DownloadProgress(v, 0, false, true))
    setDownloadProgress(prev => [...prev, ...newDownloads])

    newDownloads.forEach(download => {
      const task = () => {
        setDownloadProgress(prev => {
          const i = prev.findIndex(d => d.version.version === download.version.version)
          if (i === -1) return prev
          const copy = [...prev]
          copy[i] = { ...copy[i], queued: false }
          return copy
        })

        invoke('download', {
          url: download.version.downloadUrls[download.version.platforms.indexOf(platform())],
          name: download.version.version,
          executable: download.version.executables[download.version.platforms.indexOf(platform())]
        })
      }

      queue.push(task)
      runNext()
    })
  }

  function handleOverlayClick (e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      setFadeOut(true)
      setTimeout(() => setShowPopup(false), 200)
    }
  }

  async function notifyUser(title: string, body: string) {
    let permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }
    if (permissionGranted) {
      sendNotification({ title, body });
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
    } else if (hash === '#leaderboards') {
      return <Leaderboards />
    }
    return null
  }

  return (
    <>
      <Sidebar setShowPopup={setShowPopup} setPopupMode={setPopupMode} setFadeOut={setFadeOut} />
      <div className="relative z-[2] ml-[239px] w-[761px] border-b border-[#242424] h-[33px] bg-[#161616]" style={{ display: platform() == 'windows' ? 'block' : 'none' }}></div>
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
                      <div key={i} className='popup-entry flex flex-col justify-between'>
                        <p className='text-2xl'>Berry Dash v{v.version.displayName}</p>
                        <div className='mt-[25px] flex items-center justify-between'>
                          {v.failed ? (
                            <>
                              <div className='flex items-center'>
                                <span className='text-red-500'>Download failed</span>
                                <button
                                  className='button ml-30 mb-2'
                                  onClick={() =>
                                    setDownloadProgress((prev) => prev.filter((_, idx) => idx !== i))
                                  }
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          ) : v.queued ? (
                            <span className='text-yellow-500'>Queued…</span>
                          ) : (
                            <span>Downloading: {v.progress}% done</span>
                          )}
                        </div>
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
