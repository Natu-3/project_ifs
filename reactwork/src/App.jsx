import { useState } from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import MainNote from './components/MainNote'
import CalendarPanel from './components/CalendarPanel'
import { Route, Routes } from 'react-router-dom'
import Login from "./pages/Login";
import Signup from './pages/signup'
import CalendarPage from './pages/CalendarPage'

function App() {
    const [count, setCount] = useState(0)
  // javascript
  return (
    <Routes>
    <Route path='/login' element={<Login />} />
    <Route path='/signup' element={<Signup />} />

    <Route 
      path='/'
      element={
      <div className="app-wrapper">
        <div className="layout">
          <Sidebar />
          <MainNote />
          <CalendarPanel />
        </div>
      </div>
      }
    />
      
    <Route
      path='/calendar'
        element={
          <div className="app-wrapper">
            <div className="layout">
              <Sidebar />
              <CalendarPage />
            </div>
          </div>
        }
    />
    </Routes>
  )
}

export default App
