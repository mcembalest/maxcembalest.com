import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function LlmEvaluationWebinars() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>LLM Evaluation Webinar Series</h1>

      <section className="work-item">
        <p>
          Produced and presented educational webinar series on how to evaluate large language models, covering
          evaluation methodologies, benchmarking approaches, and practical implementation strategies for assessing
          LLM performance.
        </p>
        <p>
          <a href="https://www.youtube.com/watch?v=jW290vZThgw">Part 1</a> |
          <a href="https://www.youtube.com/watch?v=Ij1_9n9p0y8"> Part 2</a>
        </p>
      </section>
    </div>
  )
}

export default LlmEvaluationWebinars
