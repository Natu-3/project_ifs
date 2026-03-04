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
import ChatbotPage from './pages/ChatbotPage'
import ProtectedRoute from './routes/ProtectedRoute'
import AdminRoute from './routes/AdminRoute'
import MustChangePasswordRoute from './routes/MustChangePasswordRoute'
import AdminPage from './pages/AdminPage'
import ForcePasswordChange from './pages/ForcePasswordChange'
function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <MustChangePasswordRoute>
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
        <ProtectedRoute>
          <div className="app-wrapper">
            <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <MyPage />
          </div>
        </ProtectedRoute>
      }
    />
    <Route
      path='/force-password-change'
      element={
        <ProtectedRoute>
          <div className="app-wrapper">
            <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <ForcePasswordChange />
          </div>
        </ProtectedRoute>
      }
    />

    <Route 
      path='/'
      element={
      <ProtectedRoute>
        <div className="app-wrapper">
          <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <div className="layout">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
            <MainNote />
            <CalendarPanel />
          </div>
        </div>
      </ProtectedRoute>
      }
    />
      
    <Route
      path='/calendar'
        element={
          <ProtectedRoute>
            <div className="app-wrapper">
              <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
              <div className="layout calendar-layout">
                <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
                <CalendarPage />
              </div>
            </div>
          </ProtectedRoute>
        }
    />
    <Route
      path='/calendar/team/:teamId'
        element={
        <ProtectedRoute>
          <div className="app-wrapper">
            <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <div className="layout calendar-layout">
              <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
              <CalendarPage />
            </div>
          </div>
        </ProtectedRoute>
      }
    />
    <Route
      path='/chatbot'
      element={
        <ProtectedRoute>
          <div className="app-wrapper">
            <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <div className="layout calendar-layout">
              <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
              <ChatbotPage />
            </div>
          </div>
        </ProtectedRoute>
      }
    />
    <Route
      path='/admin'
      element={
        <AdminRoute>
          <div className="app-wrapper">
            <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <AdminPage />
          </div>
        </AdminRoute>
      }
    />
    </Routes>
    </MustChangePasswordRoute>
  )
}

export default App
