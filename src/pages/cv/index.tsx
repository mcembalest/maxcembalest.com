import { Link } from 'react-router-dom'
import '../CV.css'

function CVIndex() {
  return (
    <div className="work-container">
      <h1>CV</h1>

      <h2>2025</h2>

      <Link to="/cv/2025/style-outweighs-substance" className="cv-row">
        <img src="arthur/llm-judge.png" alt="Style Outweighs Substance" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>[Published @ ICLR 2025] Style Outweighs Substance: Failure Modes of LLM Judges in Alignment Benchmarking</h3>
          <p>Published research analyzing LLM-judge failure modes for AI alignment. Developed SOS-BENCH benchmark to provide more reliable measurements of model behavior.</p>
        </div>
      </Link>

      <Link to="/cv/2025/umap-tutorial" className="cv-row">
        <img src="https://assets.nomicatlas.com/mnist-training-embeddings-umap-short.gif" alt="UMAP Tutorial" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Tutorial on Visualizing Neural Network Training Dynamics with UMAP</h3>
          <p>Contributed a guide to the official UMAP documentation demonstrating neural network training visualization using Nomic Atlas.</p>
        </div>
      </Link>

      <Link to="/cv/2025/nomic-documentation" className="cv-row">
        <img src="nomic/nomic-docs-guides.png" alt="Nomic Docs" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Nomic AI Platform Documentation</h3>
          <p>Owner of the technical guides, developer SDKs, and explanatory videos for the Nomic AI Platform. I was responsible for explaining Nomic's embedding models and overall product capabilities into a comprehensive library</p>
        </div>
      </Link>

      <Link to="/cv/2025/odsc-nomic" className="cv-row">
        <img src="odsc.png" alt="ODSC Nomic" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Speaker @ ODSC East 2025</h3>
          <p>Delivered a talk at the Open Data Science Conference (May 2025) detailing Nomic's pre-training and post-training methods for embedding models.</p>
        </div>
      </Link>

      <h2>2024</h2>

      <Link to="/cv/2024/llm-experimentation" className="cv-row">
        <img src="arthur/llm-stats-coding-eval.png" alt="LLM Guide" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Applied Research on LLM Experimentation Ecosystem</h3>
          <p>Conducted research on the end-to-end lifecycle for LLM experimentation and development, including model selection, prompting, tool use, inference acceleration, structured outputs, and more.</p>
        </div>
      </Link>

      <Link to="/cv/2024/pytorch-gnn" className="cv-row">
        <img src="https://raw.githubusercontent.com/mcembalest/GNN/main/img/trajectories.gif" alt="GNN" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Tutorial on Graph Neural Networks & PyTorch Geometric</h3>
          <p>Code & walkthrough for training graph neural networks using PyTorch Geometric and visualizing learned embeddings during training.</p>
        </div>
      </Link>

      <Link to="/cv/2024/odsc-arthur-llm" className="cv-row">
        <img src="odsc.png" alt="ODSC Arthur" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Speaker @ ODSC East 2024</h3>
          <p>Presented "The Ultimate Guide to LLM Experimentation and Development" at the Open Data Science Conference.</p>
        </div>
      </Link>

      <h2>2023</h2>

      <Link to="/cv/2023/pear" className="cv-row">
        <img src="arthur/pear-loss.png" alt="PEAR" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>[Published @ AAAI/ACM 2023] Reckoning with the Disagreement Problem: Post-Hoc Explanation Agreement as a Training Objective</h3>
          <p>We formulated a new training objective to improve the consistency of neural network explanations. Presented at 2023 AAAI/ACM conference on AI, Ethics, and Society.</p>
        </div>
      </Link>

      <Link to="/cv/2023/llm-evaluation" className="cv-row">
        <img src="arthur/LLM-eval-webinar-1.png" alt="LLM Evaluation" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Applied Research on LLM Evaluation and LLM-as-Judge</h3>
          <p>Published experiments evaluating large language models, covering methodologies, benchmarking, and implementation strategies.</p>
        </div>
      </Link>

      <Link to="/cv/2023/odsc-arthur-pear" className="cv-row">
        <img src="odsc.png" alt="ODSC Arthur" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Speaker @ ODSC East 2023</h3>
          <p>Presented "Reckoning with the Disagreement Problem: Post-Hoc Explanation Agreement as a Training Objective" at the Open Data Science Conference.</p>
        </div>
      </Link>

      <h2>2022</h2>

      <Link to="/cv/2023/tensions" className="cv-row">
        <img src="arthur/tensions.png" alt="Tensions" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>[Published @ IEEE 2023] Tensions Between the Proxies of Human Values in AI</h3>
          <p>Position paper on the tradeoffs between fairness, transparency, and privacy in AI. Presented at 2023 IEEE Conference on Secure and Trustworthy Machine Learning.</p>
        </div>
      </Link>

      <Link to="/cv/2022/shapley-residuals" className="cv-row">
        <img src="arthur/shapresid-eq.png" alt="Shapley" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Article on Shapley Values & Residuals</h3>
          <p>Article explaining Shapley values and calculating their residuals to measure explainability limitations. Published on TowardsDataScience.</p>
        </div>
      </Link>

      <Link to="/cv/2022/skew-the-script" className="cv-row">
        <img src="skewthescript/STS-gerrymandering.gif" alt="Skew The Script" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Interactive Web Applications for Skew The Script</h3>
          <p>Developed interactive web apps to help make AP Statistics lessons more engaging and relevant to students, covering distributional sampling, hypothesis testing, and the Central Limit Theorem.</p>
        </div>
      </Link>

      <h2>2021</h2>

      <Link to="/cv/2021/masters-capstone" className="cv-row">
        <img src="harvardcapstone/diffusion.png" alt="Capstone" className="cv-thumbnail" />
        <div className="cv-content">
          <h3>Master's Capstone: Geospatial Modeling for Lead Pipe Removal</h3>
          <p>Developed geospatial model to identify likely locations of lead pipes in Flint, Michigan and prioritize digging efforts in the most urgent areas.</p>
        </div>
      </Link>
    </div>
  )
}

export default CVIndex
