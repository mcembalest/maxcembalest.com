import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import CV from './pages/CV'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="nav">
          <Link to="/" className="nav-brand">Max Cembalest</Link>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/cv">CV</Link>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cv" element={<CV />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

