import { useState } from 'react'
import { StrictMode } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Sidebar from './components/Sidebar'
import MainNote from './components/MainNote'
import CalendarPanel from './components/CalendarPanel'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

function App() {
    const [count, setCount] = useState(0)
  // javascript
  return (
    //html
      <BrowserRouter>
        <div className="app-wrapper">
          <div className="layout">
            <Sidebar />
            <MainNote />
            <CalendarPanel />
          </div>
        </div>
      </BrowserRouter>
  )
}

export default App
