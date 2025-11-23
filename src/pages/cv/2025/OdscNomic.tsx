import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function OdscNomic() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Open Data Science Conference Speaker - Nomic</h1>

      <section className="work-item">
        <p>
          Speaker at the Open Data Science Conference (May 2025) representing Nomic.
        </p>
        <p>
          <a href="https://odsc.com/blog/speaker/max-cembalest/">View speaker profile</a>
        </p>
      </section>
    </div>
  )
}

export default OdscNomic
