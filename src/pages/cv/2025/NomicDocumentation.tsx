import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function NomicDocumentation() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Nomic AI Platform Documentation</h1>

      <section className="work-item">
        <p>
          Owner of the technical guides, developer SDKs, and explanatory videos for the <a href="https://docs.nomic.ai">Nomic AI Platform Documentation</a>. I was responsible for explaining Nomic's embedding models and overall product capabilities into a comprehensive library
          of expert guides, authoring articles on retrieval, multi-vector embedding models, and visualization
          techniques. This work enabled users to understand and build with Nomic's core embedding and visualization
          technology.
        </p>
        <img src="/nomic/nomic-docs-guides.png" alt="Nomic Docs" />
        <img src="/nomic/nomic-docs-colnomic.png" alt="Nomic Docs" />
      </section>
    </div>
  )
}

export default NomicDocumentation
