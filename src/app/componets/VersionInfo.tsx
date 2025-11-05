'use client'

import {
  faCheck,
  faCode,
  faHardDrive,
  faShieldHalved,
  faWarning
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { format } from 'date-fns'
import { useGlobal } from '../GlobalProvider'
import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'
import prettyBytes from 'pretty-bytes'

export default function VersionInfo () {
  const {
    getVersionGame,
    getVersionInfo,
    managingVersion,
    downloadedVersionsConfig
  } = useGlobal()
  if (!managingVersion || !downloadedVersionsConfig) return <></>

  const versionInfo = getVersionInfo(managingVersion)
  const gameInfo = getVersionGame(versionInfo?.game)
  const [versionSize, setVersionSize] = useState<number | null>(null)

  useEffect(() => {
    invoke<string>('folder_size', {
      version: managingVersion
    }).then(size => {
      setVersionSize(parseInt(size, 10))
    })
  }, [managingVersion, setVersionSize])

  return (
    <>
      <p className='text-xl text-center'>
        Viewing info for{' '}
        {getVersionGame(getVersionInfo(managingVersion)?.game)?.name} v
        {getVersionInfo(managingVersion)?.versionName}
      </p>
      <div className='popup-content flex flex-col items-center justify-center gap-2 h-full'>
        <div className='entry-info-item'>
          <p>
            Installed{' '}
            {format(
              new Date(downloadedVersionsConfig.timestamps[managingVersion]),
              'MM/dd/yyyy'
            )}
          </p>
        </div>
        <div
          className='entry-info-item'
          hidden={!versionInfo || versionInfo.releaseDate == 0}
        >
          <p>
            Released{' '}
            {format(
              new Date(
                versionInfo?.releaseDate ? versionInfo.releaseDate * 1000 : 0
              ),
              'MM/dd/yyyy'
            )}
          </p>
        </div>
        <div className='entry-info-item'>
          <FontAwesomeIcon icon={faCheck} color='#19c84b' />
          <p>Official</p>
        </div>
        <div className='entry-info-item'>
          <FontAwesomeIcon
            icon={gameInfo?.verified ? faShieldHalved : faWarning}
            color={gameInfo?.verified ? '#19c84b' : '#ffc800'}
          />
          <p>{gameInfo?.verified ? 'Verified' : 'Unverified'}</p>
        </div>
        <div className='entry-info-item'>
          <FontAwesomeIcon icon={faCode} color='lightgray' />
          <p>Developer: {gameInfo?.developer}</p>
        </div>
        <div className='entry-info-item'>
          <FontAwesomeIcon icon={faHardDrive} color='lightgray' />
          <p>
            Size:{' '}
            {versionSize !== null
              ? prettyBytes(versionSize, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })
              : 'Loading...'}
          </p>
        </div>
      </div>
    </>
  )
}
