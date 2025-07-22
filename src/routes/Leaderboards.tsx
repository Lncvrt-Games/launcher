import { useEffect, useState } from 'react'
import './Leaderboards.css'
import axios from 'axios'
import { LeaderboardEntry } from '../types/LeaderboardEntry'
import { app } from '@tauri-apps/api'
import { platform } from '@tauri-apps/plugin-os'
import { decrypt } from '../util/Encryption'

export default function Leaderboards () {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh () {
    setLoading(true)
    setLeaderboardData([])
    const launcherVersion = await app.getVersion()
    axios
      .get('https://berrydash.lncvrt.xyz/database/getTopPlayers.php', {
        headers: {
          Requester: 'BerryDashLauncher',
          LauncherVersion: launcherVersion,
          ClientPlatform: platform()
        }
      })
      .then(res => {
        const decrypted = decrypt(res.data)
        setLeaderboardData(JSON.parse(decrypted))
      })
      .catch(e => console.error('Error fetching leaderboard data:', e))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className='mx-4 mt-4'>
      <div className='flex justify-between items-center mb-4'>
        <p className='text-3xl'>Leaderboards</p>
        <button
          className='button text-3xl'
          onClick={refresh}
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      <div className='leaderboard-container'>
        <div className='leaderboard-scroll'>
          {leaderboardData.length ? (
            leaderboardData.map((entry, i) => (
              <div key={entry.username} className='leaderboard-entry'>
                <p>
                  #{i + 1} {entry.username}
                </p>
                <p className='score'>{entry.value}</p>
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
