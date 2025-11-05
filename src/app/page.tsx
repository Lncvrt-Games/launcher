'use client'

import { useEffect } from 'react'
import './Installs.css'
import { useGlobal } from './GlobalProvider'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheck,
  faShieldHalved,
  faWarning
} from '@fortawesome/free-solid-svg-icons'
import { platform } from '@tauri-apps/plugin-os'

export default function Installs () {
  const {
    downloadProgress,
    showPopup,
    setShowPopup,
    setPopupMode,
    setFadeOut,
    setSelectedVersionList,
    downloadedVersionsConfig,
    normalConfig,
    setSelectedGame,
    getListOfGames,
    getVersionsAmountData
  } = useGlobal()

  useEffect(() => {
    if (!showPopup) return
    setSelectedVersionList([])
  }, [normalConfig, setSelectedVersionList, showPopup])

  return (
    <div className='mx-4 mt-4'>
      <div className='flex justify-between items-center mb-4'>
        <p className='text-3xl'>Games</p>
        <button
          className='button text-3xl'
          onClick={() => {
            setSelectedGame(null)
            setPopupMode(0)
            setShowPopup(true)
            setFadeOut(false)
          }}
          disabled={downloadProgress.length != 0}
        >
          Download game
        </button>
      </div>
      <div className='downloads-container'>
        <div
          className={`downloads-scroll h-[calc(100vh-${
            platform() === 'windows' ? '116' : '84'
          }px)]`}
        >
          {downloadedVersionsConfig && downloadedVersionsConfig.list.length ? (
            getListOfGames()
              .sort((a, b) => {
                return a.id - b.id
              })
              .map(i => (
                <div key={i.id} className='downloads-entry'>
                  <div className='flex flex-col'>
                    <p className='text-2xl'>{i.name}</p>
                    <div className='flex gap-2'>
                      <div className='entry-info-item'>
                        <p>
                          {(() => {
                            const data = getVersionsAmountData(i.id)
                            if (!data) return 'N/A'
                            return `${data.installed}/${data.total}`
                          })()}{' '}
                          versions installed
                        </p>
                      </div>
                      <div className='entry-info-item' hidden={!i.official}>
                        <FontAwesomeIcon icon={faCheck} color='#19c84b' />
                        <p>Official</p>
                      </div>
                      <div className='entry-info-item' hidden={i.official}>
                        <FontAwesomeIcon
                          icon={i.verified ? faShieldHalved : faWarning}
                          color={i.verified ? '#19c84b' : '#ffc800'}
                        />
                        <p>{i.verified ? 'Verified' : 'Unverified'}</p>
                      </div>
                    </div>
                  </div>
                  <div className='flex flex-row items-center gap-2'>
                    <Link className='button' href={'/game?id=' + i.id}>
                      Installs
                    </Link>
                  </div>
                </div>
              ))
          ) : (
            <div className='flex justify-center items-center h-full'>
              <p className='text-3xl'>No games installed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
