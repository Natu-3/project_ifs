import { useState } from 'react'
import './App.css'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import MainNote from './components/MainNote'
import CalendarPanel from './components/CalendarPanel'
import { Route, Routes } from 'react-router-dom'
import Login from "./pages/Login";
import Signup from './pages/Signup'
import CalendarPage from './pages/CalendarPage'
import MyPage from './pages/MyPage'
import ProtectedRoute from './routes/ProtectedRoute'
function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <Routes>
    <Route 
      path='/login' 
      element={
        <div className="app-wrapper">
          <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <Login />
        </div>
      } 
    />
    <Route 
      path='/signup' 
      element={
        <div className="app-wrapper">
          <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <Signup />
        </div>
      } 
    />
    <Route 
      path='/mypage'
      element={
        <div className="app-wrapper">
          <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <MyPage />
        </div>
      }
    />

    <Route 
      path='/'
      element={
      <div className="app-wrapper">
        <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="layout">
          <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
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
            <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <div className="layout calendar-layout">
              <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
              <CalendarPage />
            </div>
          </div>
        }
    />
    <Route
      path='/calendar/team/:teamId'
        element={
        <div className="app-wrapper">
          <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <div className="layout calendar-layout">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
            <CalendarPage />
          </div>
        </div>
      }
    />
    </Routes>
  )
}

export default App
