import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function LlmEvaluation() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Applied Research on LLM Evaluation and LLM-as-Judge</h1>

      <section className="work-item">
        <p>
          Conducted research on the tradeoffs of different evaluation methods when measuring LLM performance, covering
          evaluation methodologies, benchmarking approaches, and practical implementation strategies. Presented work for the AI Infrastructure Alliance and Arthur AI webinars, included below. Published our work in an <a href="https://www.arthur.ai/blog/llm-guided-evaluation-using-llms-to-evaluate-llms">article for Arthur AI</a> on the topic.
        </p>
        <div style={{ margin: '1.5em 0' }}>
          <iframe
            width="560"
            height="315"
            src="https://www.youtube.com/embed/jW290vZThgw"
            title="Webinar hosted by Arthur AI"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
        <div style={{ margin: '1.5em 0' }}>
          <iframe
            width="560"
            height="315"
            src="https://www.youtube.com/embed/Ij1_9n9p0y8"
            title="Presentation for the AI Infrastructure Alliance"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </section>
    </div>
  )
}

export default LlmEvaluation
