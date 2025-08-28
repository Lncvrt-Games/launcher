'use client'

import { useEffect, useState } from 'react'
import './Leaderboards.css'
import axios from 'axios'
import { app } from '@tauri-apps/api'
import { platform } from '@tauri-apps/plugin-os'
import { decrypt } from '../util/Encryption'
import { invoke } from '@tauri-apps/api/core'
import Image from 'next/image'
import { LeaderboardResponse } from '../types/LeaderboardResponse'

export default function Leaderboards () {
  const [leaderboardData, setLeaderboardData] =
    useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const formatter = new Intl.NumberFormat('en-US')

  async function refresh () {
    setLoading(true)
    setLeaderboardData(null)
    try {
      const launcherVersion = await app.getVersion()
      const response = await axios.get(
        'https://berrydash.lncvrt.xyz/database/getTopPlayers.php',
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
  }

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
  }, [])

  return (
    <div className='mx-4 mt-4'>
      <div className='flex justify-between items-center mb-4'>
        <p className='text-3xl'>Leaderboards</p>
        <div className='flex gap-2'>
          <button
            className='button text-3xl'
            onClick={downloadLeaderboard}
            disabled={loading || leaderboardData?.entries.length === 0}
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
        <div className='leaderboard-scroll'>
          {leaderboardData?.entries.length ? (
            leaderboardData.entries.map((entry, i) => (
              <div key={i} className='leaderboard-entry justify-between'>
                <div className='flex items-center gap-2'>
                  {/* <Image
                    src={}
                    width={28}
                    height={28}
                    alt=''
                    className='scale-x-[-1] -ml-2'
                  /> */}
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
      </div>
    </div>
  )
}
