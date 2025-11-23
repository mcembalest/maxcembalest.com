import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function NomicDocumentation() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Nomic API Platform Documentation</h1>

      <section className="work-item">
        <p>
          Owner of the Nomic API Platform Documentation (docs.nomic.ai), managing technical content for an audience
          of ML engineers and data scientists. Translated complex product capabilities into a comprehensive library
          of expert guides, authoring articles on retrieval, multi-vector embedding models, and visualization
          techniques. This work enabled users to understand and build with Nomic's core embedding and visualization
          technology.
        </p>
        <p>
          <a href="https://docs.nomic.ai">docs.nomic.ai</a>
        </p>
      </section>
    </div>
  )
}

export default NomicDocumentation
