'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import './Leaderboards.css'
import axios from 'axios'
import { app } from '@tauri-apps/api'
import { platform } from '@tauri-apps/plugin-os'
import { decrypt, encrypt } from '../util/Encryption'
import { invoke } from '@tauri-apps/api/core'
import Image from 'next/image'
import { LeaderboardResponse } from '../types/LeaderboardResponse'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { getKey } from '../util/KeysHelper'

import Berry from '../assets/berries/Berry.png'
import PoisonBerry from '../assets/berries/PoisonBerry.png'
import SlowBerry from '../assets/berries/SlowBerry.png'
import UltraBerry from '../assets/berries/UltraBerry.png'
import SpeedyBerry from '../assets/berries/SpeedyBerry.png'
import CoinBerry from '../assets/berries/CoinBerry.png'

export default function Leaderboards () {
  const [leaderboardData, setLeaderboardData] =
    useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const leftRef = useRef<HTMLDivElement | null>(null)
  const rightRef = useRef<HTMLDivElement | null>(null)
  const formatter = new Intl.NumberFormat('en-US')
  const [leaderboardType, setLeaderboardType] = useState<number>(0)
  const [berryType, setBerryType] = useState<number>(0)

  const refresh = useCallback(async () => {
    setLoading(true)
    setLeaderboardData(null)
    try {
      const launcherVersion = await app.getVersion()
      const sendKey = await getKey(1)
      const formData = new URLSearchParams()
      formData.append(
        await encrypt('type', sendKey),
        await encrypt(leaderboardType.toString(), sendKey)
      )
      if (leaderboardType == 1) {
        formData.append(
          await encrypt('showType', sendKey),
          await encrypt(berryType.toString(), sendKey)
        )
      }
      const response = await axios.post(
        'https://berrydash.lncvrt.xyz/database/getTopPlayers.php',
        formData,
        {
          headers: {
            Requester: 'BerryDashLauncher',
            LauncherVersion: launcherVersion,
            ClientPlatform: platform()
          }
        }
      )
      const decrypted = await decrypt(response.data)
      setLeaderboardData(JSON.parse(decrypted))
    } catch (e) {
      console.error('Error fetching leaderboard data:', e)
    } finally {
      setLoading(false)
    }
  }, [leaderboardType, berryType])

  function downloadLeaderboard () {
    let content = '"Username","Score","ScoreFormatted"\n'
    leaderboardData?.entries.forEach(entry => {
      content += `"${entry.username}","${entry.value}","${formatter.format(
        BigInt(entry.value)
      )}"\n`
    })
    while (content.endsWith('\n')) {
      content = content.slice(0, -1)
    }
    invoke('download_leaderboard', { content })
  }

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    function onDocClick (e: MouseEvent) {
      const t = e.target as Node
      if (leftRef.current && !leftRef.current.contains(t)) setLeftOpen(false)
      if (rightRef.current && !rightRef.current.contains(t)) setRightOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div className='mx-4 mt-4'>
      <div className='flex justify-between items-center mb-4'>
        <p className='text-3xl'>Leaderboards</p>
        <div className='flex gap-2'>
          <button
            className='button text-3xl'
            onClick={downloadLeaderboard}
            disabled={loading || leaderboardData?.entries?.length === 0}
          >
            Download Leaderboards
          </button>
          <button
            className='button text-3xl'
            onClick={refresh}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className='leaderboard-container'>
        <div className='side-dropdown'>
          <div ref={leftRef} className='dropdown-root dropdown-left'>
            <button
              className='dropdown-btn'
              onClick={() => setLeftOpen(v => !v)}
              aria-expanded={leftOpen}
              disabled={loading}
            >
              Type{' '}
              <FontAwesomeIcon
                icon={faChevronDown}
                className={leftOpen ? 'rotate-180' : ''}
              />
            </button>
            <div className={`dropdown-menu ${leftOpen ? 'open' : ''}`}>
              <button
                className={`dropdown-item ${
                  leaderboardType == 0 ? 'selected' : ''
                }`}
                onClick={() => {
                  setLeftOpen(false)
                  setLeaderboardType(0)
                }}
              >
                Score Leaderboard
              </button>
              <button
                className={`dropdown-item ${
                  leaderboardType == 1 ? 'selected' : ''
                }`}
                onClick={() => {
                  setLeftOpen(false)
                  setLeaderboardType(1)
                }}
              >
                Berry Leaderboard
              </button>
              <button
                className={`dropdown-item ${
                  leaderboardType == 2 ? 'selected' : ''
                }`}
                onClick={() => {
                  setLeftOpen(false)
                  setLeaderboardType(2)
                }}
              >
                Coins Leaderboard
              </button>
              <button
                className={`dropdown-item ${
                  leaderboardType == 3 ? 'selected' : ''
                }`}
                onClick={() => {
                  setLeftOpen(false)
                  setLeaderboardType(3)
                }}
              >
                Legacy Leaderboard
              </button>
            </div>
          </div>
        </div>

        <div className='leaderboard-scroll'>
          {leaderboardData?.entries?.length ? (
            leaderboardData.entries.map((entry, i) => (
              <div key={i} className='leaderboard-entry justify-between'>
                <div className='flex items-center gap-2'>
                  <Image
                    src={
                      entry.customIcon == null
                        ? entry.overlay == 0
                          ? `https://berrydash-api.lncvrt.xyz/icon?r=${entry.birdColor[0]}&g=${entry.birdColor[1]}&b=${entry.birdColor[2]}&id=${entry.icon}`
                          : `https://berrydash-api.lncvrt.xyz/iconandoverlay?br=${entry.birdColor[0]}&bg=${entry.birdColor[1]}&bb=${entry.birdColor[2]}&bid=${entry.icon}&or=${entry.overlayColor[0]}&og=${entry.overlayColor[1]}&ob=${entry.overlayColor[2]}&oid=${entry.overlay}`
                        : `data:image/png;base64,${
                            leaderboardData.customIcons[entry.customIcon]
                          }`
                    }
                    width={28}
                    height={28}
                    alt=''
                    className='scale-x-[-1] -ml-2'
                    onError={e => {
                      ;(e.currentTarget as HTMLImageElement).style.display =
                        'none'
                    }}
                  />
                  <p>
                    {entry.username} (#{i + 1})
                  </p>
                </div>
                <div>
                  <p className='score'>
                    {formatter.format(BigInt(entry.value))}
                  </p>
                </div>
              </div>
            ))
          ) : loading ? (
            <div className='flex justify-center items-center h-full'>
              <p className='text-3xl'>Loading...</p>
            </div>
          ) : (
            <div className='flex justify-center items-center h-full'>
              <p className='text-3xl'>No data...</p>
            </div>
          )}
        </div>

        <div className='side-dropdown'>
          <div ref={rightRef} className='dropdown-root dropdown-right'>
            <button
              className='dropdown-btn'
              onClick={() => setRightOpen(v => !v)}
              aria-expanded={rightOpen}
              disabled={loading || leaderboardType != 1}
            >
              Berry Type{' '}
              <FontAwesomeIcon
                icon={faChevronDown}
                className={rightOpen ? 'rotate-180' : ''}
              />
            </button>
            <div className={`dropdown-menu ${rightOpen ? 'open' : ''}`}>
              <button
                className={`dropdown-item ${berryType == 0 ? 'selected' : ''}`}
                onClick={() => {
                  setRightOpen(false)
                  setBerryType(0)
                }}
              >
                <span className='flex items-center gap-2'>
                  <Image src={Berry} width={24} height={24} alt='' />
                  Normal Berry
                </span>
              </button>
              <button
                className={`dropdown-item ${berryType == 1 ? 'selected' : ''}`}
                onClick={() => {
                  setRightOpen(false)
                  setBerryType(1)
                }}
              >
                <span className='flex items-center gap-2'>
                  <Image src={PoisonBerry} width={24} height={24} alt='' />
                  Poison Berry
                </span>
              </button>
              <button
                className={`dropdown-item ${berryType == 2 ? 'selected' : ''}`}
                onClick={() => {
                  setRightOpen(false)
                  setBerryType(2)
                }}
              >
                <span className='flex items-center gap-2'>
                  <Image src={SlowBerry} width={24} height={24} alt='' />
                  Slow Berry
                </span>
              </button>
              <button
                className={`dropdown-item ${berryType == 3 ? 'selected' : ''}`}
                onClick={() => {
                  setRightOpen(false)
                  setBerryType(3)
                }}
              >
                <span className='flex items-center gap-2'>
                  <Image src={UltraBerry} width={24} height={24} alt='' />
                  Ultra Berry
                </span>
              </button>
              <button
                className={`dropdown-item ${berryType == 4 ? 'selected' : ''}`}
                onClick={() => {
                  setRightOpen(false)
                  setBerryType(4)
                }}
              >
                <span className='flex items-center gap-2'>
                  <Image src={SpeedyBerry} width={24} height={24} alt='' />
                  Speedy Berry
                </span>
              </button>
              <button
                className={`dropdown-item ${berryType == 5 ? 'selected' : ''}`}
                onClick={() => {
                  setRightOpen(false)
                  setBerryType(5)
                }}
              >
                <span className='flex items-center gap-2'>
                  <Image src={CoinBerry} width={24} height={24} alt='' />
                  Coin Berry
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
