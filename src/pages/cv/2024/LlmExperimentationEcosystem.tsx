import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function LlmExperimentationEcosystem() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Applied Research on LLM Experimentation Ecosystem</h1>

      <section className="work-item">
        <p>
        Conducted research on the end-to-end lifecycle for LLM experimentation and development, including model selection, prompting, tool use, inference acceleration, structured outputs, and more. Presented work for the AI Infrastructure Alliance and Arthur AI webinars, included below.
          Authored a <a href="https://www.arthur.ai/blog/the-ultimate-guide-to-llm-experimentation-and-development-in-2024">
           technical article
          </a> detailing the end-to-end lifecycle for LLM experimentation and
          development. Analyzed the "open vs. closed" and "small vs. big" model ecosystem, including quantitative
          analysis of GPT-4's performance against competitors. Curated best-in-class tools and techniques for
          interfacing with models, benchmarking, prompt engineering, few-shot example selection, tool use,
          and structured LLM outputs.
        </p>
        <img src="/arthur/LLM-experimentation-dspy.png" alt="LLM Experimentation Guide" />
        <div style={{ margin: '1.5em 0' }}>
          <iframe
            width="560"
            height="315"
            src="https://www.youtube.com/embed/9PGuvs_z4Pk"
            title="Webinar hosted by Arthur AI"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </section>
    </div>
  )
}

export default LlmExperimentationEcosystem
