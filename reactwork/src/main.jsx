import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PostProvider } from './context/PostContext.jsx'
import { BrowserRouter } from 'react-router-dom'
import { CalendarPravider } from './context/CalendarContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <PostProvider>
        <CalendarPravider>
          <App />
        </CalendarPravider>
      </PostProvider>
    </BrowserRouter>
  </StrictMode>,
)
