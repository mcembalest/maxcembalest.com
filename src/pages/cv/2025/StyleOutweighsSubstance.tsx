import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function StyleOutweighsSubstance() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Style Outweighs Substance - ICLR 2025</h1>

      <section className="work-item">
        <p>
          Published research at ICLR 2025 that critically analyzes the failure modes of using LLM-judges for AI
          alignment benchmarking. Identified critical biases in LLM-judges for AI alignment, leading to the development
          of SOS-BENCH to provide more reliable and concrete measurements. This work demonstrates that popular LLM-judge
          preferences do not correlate with concrete metrics for safety, world knowledge, or instruction following.
          Instead, it identifies powerful implicit biases where judges prioritize stylistic qualities over substance
          (i.e., factuality and safety). To address this, we introduced SOS-BENCH, a large-scale, reproducible
          meta-benchmark with ground truth, to provide a more reliable, concrete measure of model alignment.
        </p>
        <p>
          <a href="https://arxiv.org/abs/2409.15268">Read the paper on arXiv</a>
        </p>
      </section>
    </div>
  )
}

export default StyleOutweighsSubstance
