import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import MainNote from './components/MainNote'
import CalendarPanel from './components/CalendarPanel'

function App() {
    const [count, setCount] = useState(0)
  // javascript
  return (
    //html
    <>
      <Header />

      <div>
        <Sidebar />
        <MainNote />
        <CalendarPanel />
      </div>
    </>
  )
}

export default App
