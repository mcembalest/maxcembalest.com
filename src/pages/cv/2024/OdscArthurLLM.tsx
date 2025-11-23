import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function OdscArthurLLM() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Speaker @ ODSC East 2024</h1>

      <section className="work-item">
        <p>Speaker at the Open Data Science Conference (April 2024) on the LLM Experimentation Ecosystem. I gave a talk on the end-to-end lifecycle for LLM experimentation and development, including model selection, evaluation, and deployment.</p>
      </section>
    </div>
  )
}

export default OdscArthurLLM
