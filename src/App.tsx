import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Work from './pages/Work'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="nav">
          <Link to="/" className="nav-brand">Max Cembalest</Link>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/work">Work</Link>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/work" element={<Work />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

