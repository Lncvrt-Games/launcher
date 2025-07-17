import './Sidebar.css'
import Icon from '../Icon.png'
import { openUrl } from '@tauri-apps/plugin-opener'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCog, faServer } from '@fortawesome/free-solid-svg-icons'
import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import { useState } from 'react'

const Sidebar = () => {
  const [rot, setRot] = useState(0)
  const [dir, setDir] = useState(1)

  return (
    <aside className='sidebar'>
      <div className='logo'>
        <img
          src={Icon}
          width={48}
          height={48}
          style={{
            transform: `rotate(${rot}deg)`,
            transition: 'transform 0.3s ease'
          }}
          onClick={() =>
            setRot(r => {
              let next = r + dir * 90
              if (next >= 360) {
                next = 360
                setDir(-1)
              } else if (next <= 0) {
                next = 0
                setDir(1)
              }
              return next
            })
          }
        />
      </div>
      <nav className="nav-links">
        <a href="#installs" className={`link ${(window.location.hash || '#installs') === '#installs' ? 'active' : ''}`}><FontAwesomeIcon icon={faServer} className="mr-2" /> Installs</a>
        <a href="#settings" className={`link ${(window.location.hash || '#installs') === '#settings' ? 'active' : ''}`}><FontAwesomeIcon icon={faCog} className="mr-2" /> Settings</a>
        <a onClick={() => openUrl("https://berrydash.lncvrt.xyz/discord")} className="link"><FontAwesomeIcon icon={faDiscord} className="mr-2" /> Support</a>
      </nav>
    </aside>
  )
}

export default Sidebar