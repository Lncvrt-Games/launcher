import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './Installs.css'
import { useState } from 'react'
import { faX } from '@fortawesome/free-solid-svg-icons'

export default function Installs() {
  const [showPopup, setShowPopup] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  function downloadVersion() {
    setShowPopup(true)
    setFadeOut(false)
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      setFadeOut(true)
      setTimeout(() => setShowPopup(false), 200)
    }
  }

  return (
    <>
      <p className='text-3xl ml-4 mt-4'>Installs</p>
      <button className='button text-3xl mt-4 absolute right-4 top-4' onClick={downloadVersion}>
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
          </div>
        </div>
      )}
    </>
  )
}
