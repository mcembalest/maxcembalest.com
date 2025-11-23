import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function LlmExperimentationGuide() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>The Ultimate Guide to LLM Experimentation and Development</h1>

      <section className="work-item">
        <p>
          Authored a comprehensive technical guide detailing the end-to-end lifecycle for LLM experimentation and
          development. Analyzed the "open vs. closed" and "small vs. big" model ecosystem, including quantitative
          analysis of GPT-4's performance against competitors. Curated best-in-class tools and techniques for
          interfacing with models, benchmarking, prompt engineering, few-shot example selection, agentic tool use,
          and structured LLM outputs.
        </p>
        <p>
          <a href="https://www.arthur.ai/blog/the-ultimate-guide-to-llm-experimentation-and-development-in-2024">
            Read the guide
          </a> | <a href="https://www.youtube.com/watch?v=9PGuvs_z4Pk">Watch the webinar</a>
        </p>
      </section>
    </div>
  )
}

export default LlmExperimentationGuide
