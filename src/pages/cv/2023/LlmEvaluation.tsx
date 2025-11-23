import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function LlmEvaluation() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Applied Research on LLM Evaluation and LLM-as-Judge</h1>

      <section className="work-item">
        <p>
          Produced and presented educational webinar series on how to evaluate large language models, covering
          evaluation methodologies, benchmarking approaches, and practical implementation strategies for assessing
          LLM performance.
        </p>
        <p>
          <a href="https://www.youtube.com/watch?v=jW290vZThgw">Webinar hosted by Arthur AI</a>
        </p>
        <p>
          <a href="https://www.youtube.com/watch?v=Ij1_9n9p0y8"> Presentation for the AI Infrastructure Alliance</a>
        </p>
      </section>
    </div>
  )
}

export default LlmEvaluation
