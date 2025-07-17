import { HashRouter, Route, Routes } from 'react-router-dom'
import './App.scss'
import Home from './routes/Home'
import Sidebar from './componets/Sidebar'

export default function App () {
  return (
    <HashRouter>
      <Sidebar />
      <Routes>
        <Route path='/' element={<Home />} />
      </Routes>
    </HashRouter>
  )
}
