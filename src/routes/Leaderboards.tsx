import { useEffect, useState } from 'react'
import './Leaderboards.css'
import axios from 'axios'
import { LeaderboardEntry } from '../types/LeaderboardEntry'

export default function Leaderboards() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])

  function refresh() {
    setLeaderboardData([])
    axios
      .get('https://berrydash.lncvrt.xyz/database/getTopPlayersAPI.php')
      .then(res => setLeaderboardData(res.data))
      .catch(e => console.error('Error fetching leaderboard data:', e))
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className='mx-4 mt-4'>
      <div className='flex justify-between items-center mb-4'>
        <p className='text-3xl'>Leaderboards</p>
        <button className='button text-3xl' onClick={refresh}>Refresh</button>
      </div>
      <div className='leaderboard-container'>
        <div className='leaderboard-scroll'>
          {leaderboardData.length ? (
            leaderboardData.map((entry, i) => (
              <div key={entry.username} className='leaderboard-entry'>
                <p>#{i + 1} {entry.username}</p>
                <p className='score'>{entry.scoreFormatted}</p>
              </div>
            ))
          ) : (
            <div className='flex justify-center items-center h-full'>
              <p className='text-3xl'>Loading...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
