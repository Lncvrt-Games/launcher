import { HashRouter, Route, Routes } from 'react-router-dom'
import './App.scss'
import Home from './routes/Home'

export default function App () {
  return (
    <HashRouter>
      <Routes>
        <Route path='/' element={<Home />} />
      </Routes>
    </HashRouter>
  )
}
