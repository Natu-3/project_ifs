import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PostProvider } from './context/PostContext.jsx'
import { BrowserRouter } from 'react-router-dom'
import { CalendarProvider } from './context/CalendarContext.jsx'
import { TeamCalendarProvider } from './components/TeamCalendarContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <PostProvider>
        <TeamCalendarProvider>
          <CalendarProvider>
            <App />
          </CalendarProvider>
        </TeamCalendarProvider>
      </PostProvider>
    </BrowserRouter>
  </StrictMode>,
)
