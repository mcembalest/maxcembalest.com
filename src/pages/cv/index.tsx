import { Link } from 'react-router-dom'
import '../CV.css'

function CVIndex() {
  return (
    <div className="work-container">
      <h1>CV</h1>

      <h2>2025</h2>

      <Link to="/cv/2025/style-outweighs-substance" className="cv-row">
        <img src="https://via.placeholder.com/150x100" alt="Style Outweighs Substance" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Style Outweighs Substance - ICLR 2025</h3>
          <p>Published research critically analyzing LLM-judge failure modes for AI alignment. Developed SOS-BENCH meta-benchmark to provide reliable measurements with ground truth.</p>
        </div>
      </Link>

      <Link to="/cv/2025/odsc-nomic" className="cv-row">
        <img src="https://via.placeholder.com/150x100" alt="ODSC Nomic" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Open Data Science Conference Speaker - Nomic</h3>
          <p>Speaker at the Open Data Science Conference (May 2025) representing Nomic.</p>
        </div>
      </Link>

      <h2>2024</h2>

      <Link to="/cv/2024/odsc-arthur" className="cv-row">
        <img src="https://via.placeholder.com/150x100" alt="ODSC Arthur" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Reckoning with the Disagreement Problem - ODSC Presentation</h3>
          <p>Presented on PEAR method for improving neural network interpretability through explanation consensus during training.</p>
        </div>
      </Link>

      <Link to="/cv/2024/llm-experimentation-guide" className="cv-row">
        <img src="https://via.placeholder.com/150x100" alt="LLM Guide" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>The Ultimate Guide to LLM Experimentation and Development</h3>
          <p>Comprehensive technical guide covering end-to-end LLM lifecycle, model ecosystem analysis, benchmarking, and prompt engineering techniques.</p>
        </div>
      </Link>

      <Link to="/cv/2024/llm-evaluation-webinars" className="cv-row">
        <img src="https://via.placeholder.com/150x100" alt="LLM Evaluation" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>LLM Evaluation Webinar Series</h3>
          <p>Educational webinar series on evaluating large language models, covering methodologies, benchmarking, and implementation strategies.</p>
        </div>
      </Link>

      <Link to="/cv/2024/umap-tutorial" className="cv-row">
        <img src="https://via.placeholder.com/150x100" alt="UMAP Tutorial" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Visualizing Training Dynamics with UMAP</h3>
          <p>Tutorial accepted to official UMAP documentation demonstrating neural network training visualization using Nomic Atlas.</p>
        </div>
      </Link>

      <Link to="/cv/2024/nomic-documentation" className="cv-row">
        <img src="https://via.placeholder.com/150x100" alt="Nomic Docs" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Nomic API Platform Documentation</h3>
          <p>Owner of Nomic API Platform Documentation, managing technical content for ML engineers on embedding and visualization technology.</p>
        </div>
      </Link>

      <h2>2023</h2>

      <Link to="/cv/2023/pear" className="cv-row">
        <img src="https://via.placeholder.com/150x100" alt="PEAR" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>PEAR: Post-Hoc Explanation Agreement Regularization</h3>
          <p>Research on improving consistency of neural network explanations. Presented at 2023 AAAI/ACM conference on AI, Ethics, and Society.</p>
        </div>
      </Link>

      <Link to="/cv/2023/pytorch-gnn" className="cv-row">
        <img src="https://via.placeholder.com/150x100" alt="GNN" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>PyTorch Geometric GNN Starter Repository</h3>
          <p>Starter repository for training graph neural networks using PyTorch Geometric, demonstrating airport connectivity prediction.</p>
        </div>
      </Link>

      <h2>2022</h2>

      <Link to="/cv/2022/shapley-residuals" className="cv-row">
        <img src="https://via.placeholder.com/150x100" alt="Shapley" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Tutorial on Shapley Residuals</h3>
          <p>TowardsDataScience tutorial explaining Shapley values and calculating their residuals to measure explainability limitations.</p>
        </div>
      </Link>

      <Link to="/cv/2022/skew-the-script" className="cv-row">
        <img src="https://via.placeholder.com/150x100" alt="Skew The Script" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Interactive Web Applications for Skew The Script</h3>
          <p>Co-developed AP Statistics lessons on distributional sampling and hypothesis testing with interactive gerrymandering and CLT demonstrations.</p>
        </div>
      </Link>

      <h2>2021</h2>

      <Link to="/cv/2021/masters-capstone" className="cv-row">
        <img src="https://via.placeholder.com/150x100" alt="Capstone" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Masters Capstone: Geospatial Modeling for Lead Pipe Removal</h3>
          <p>Developed geospatially robust model for BlueConduit to identify lead pipes in Flint, Michigan using XGBoost and spatial diffusion.</p>
        </div>
      </Link>
    </div>
  )
}

export default CVIndex
