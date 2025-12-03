import React from 'react'
import ReactDOM from 'react-dom/client'
import ResumeGenerator from './pages/ResumeGenerator'
import './index.css'

ReactDOM.createRoot(document.getElementById('resume-root')!).render(
  <React.StrictMode>
    <div style={{ minHeight: '100vh' }}>
      <ResumeGenerator />
    </div>
  </React.StrictMode>,
)

