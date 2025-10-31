'use client'

import { useEffect } from 'react'
import { platform } from '@tauri-apps/plugin-os'
import './Installs.css'
import { format } from 'date-fns'
import { invoke } from '@tauri-apps/api/core'
import { message } from '@tauri-apps/plugin-dialog'
import { useGlobal } from './GlobalProvider'
import Link from 'next/link'

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
    setManagingVersion,
    getVersionInfo,
    getVersionGame,
    setSelectedGame,
    getListOfGames
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
        <div className='downloads-scroll'>
          {downloadedVersionsConfig && downloadedVersionsConfig.list.length ? (
            getListOfGames()
              .sort((a, b) => {
                return a.id - b.id
              })
              .map(i => (
                <div key={i.id} className='downloads-entry'>
                  <div className='flex flex-col'>
                    <p className='text-2xl'>{i.name}</p>
                    <p className='text-gray-400 text-md'>
                      Installed {format(new Date(), 'MM/dd/yyyy')}
                    </p>
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
