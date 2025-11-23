import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import CVIndex from './pages/cv/index'
import StyleOutweighsSubstance from './pages/cv/2025/StyleOutweighsSubstance'
import OdscNomic from './pages/cv/2025/OdscNomic'
import OdscArthur from './pages/cv/2024/OdscArthur'
import LlmExperimentationGuide from './pages/cv/2024/LlmExperimentationGuide'
import LlmEvaluationWebinars from './pages/cv/2024/LlmEvaluationWebinars'
import UmapTutorial from './pages/cv/2025/UmapTutorial'
import NomicDocumentation from './pages/cv/2025/NomicDocumentation'
import Pear from './pages/cv/2023/Pear'
import PytorchGnn from './pages/cv/2023/PytorchGnn'
import Tensions from './pages/cv/2023/Tensions'
import ShapleyResiduals from './pages/cv/2022/ShapleyResiduals'
import SkewTheScript from './pages/cv/2022/SkewTheScript'
import MastersCapstone from './pages/cv/2021/MastersCapstone'
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
          <Route path="/cv" element={<CVIndex />} />
          <Route path="/cv/2025/style-outweighs-substance" element={<StyleOutweighsSubstance />} />
          <Route path="/cv/2025/odsc-nomic" element={<OdscNomic />} />
          <Route path="/cv/2025/umap-tutorial" element={<UmapTutorial />} />
          <Route path="/cv/2025/nomic-documentation" element={<NomicDocumentation />} />
          <Route path="/cv/2024/odsc-arthur" element={<OdscArthur />} />
          <Route path="/cv/2024/llm-experimentation-guide" element={<LlmExperimentationGuide />} />
          <Route path="/cv/2024/llm-evaluation-webinars" element={<LlmEvaluationWebinars />} />
          <Route path="/cv/2023/pear" element={<Pear />} />
          <Route path="/cv/2023/pytorch-gnn" element={<PytorchGnn />} />
          <Route path="/cv/2023/tensions" element={<Tensions />} />
          <Route path="/cv/2022/shapley-residuals" element={<ShapleyResiduals />} />
          <Route path="/cv/2022/skew-the-script" element={<SkewTheScript />} />
          <Route path="/cv/2021/masters-capstone" element={<MastersCapstone />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

