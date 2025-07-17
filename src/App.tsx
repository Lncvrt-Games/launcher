import { useEffect, useState } from 'react'
import './App.scss'
import Sidebar from './componets/Sidebar'
import Settings from './routes/Settings'
import Installs from './routes/Installs'

export default function App () {
  const [hash, setHash] = useState(window.location.hash || '#installs')

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#installs')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
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
