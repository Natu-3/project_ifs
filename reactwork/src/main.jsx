import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/design-tokens.css'
import App from './App.jsx'
import { PostProvider } from './context/PostContext.jsx'
import { BrowserRouter } from 'react-router-dom'
import { CalendarProvider } from './context/CalendarContext.jsx'
import { TeamCalendarProvider } from './components/TeamCalendarContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <PostProvider>
            <TeamCalendarProvider>
              <CalendarProvider>
                <App />
              </CalendarProvider>
            </TeamCalendarProvider>
          </PostProvider>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
