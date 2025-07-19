import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import Installs from './routes/Installs'
import Settings from './routes/Settings'
import Sidebar from './componets/Sidebar'
import './Globals.css'
import { LauncherVersion } from './types/LauncherVersion'
import { DownloadProgress } from './types/DownloadProgress'

function App () {
  const [hash, setHash] = useState(window.location.hash || '#installs')
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress[]>([]);

  function downloadVersions(versions: LauncherVersion[]) {
    setDownloadProgress(prev => [
      ...prev,
      ...versions.map(v => new DownloadProgress(v, 0, false))
    ])

    return;
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
      return <Installs downloadVersions={downloadVersions} downloadProgress={downloadProgress} />
    } else if (hash === '#settings') {
      return <Settings />
    }
    return null
  }

  return (
    <>
      <Sidebar downloadProgress={downloadProgress} />
      <main style={{ marginLeft: '15rem' }}>{renderContent()}</main>
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
