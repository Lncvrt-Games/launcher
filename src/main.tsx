import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import Installs from './routes/Installs'
import Settings from './routes/Settings'
import Sidebar from './componets/Sidebar'
import './Globals.scss'

function App () {
  const [hash, setHash] = useState(window.location.hash || '#installs')

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

  function renderContent() {
    if (hash === "#installs") {
      return <Installs />
    } else if (hash === "#settings") {
      return <Settings />
    }
    return null
  }

  return (
    <>
      <Sidebar />
      <main style={{ marginLeft: '15rem' }}>
        {renderContent()}
      </main>
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
