import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function Tensions() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>[Published @ SaTML 2023] Tensions Between the Proxies of Human Values in AI</h1>

      <section className="work-item">
        <p>With my colleagues at Arthur, I wrote a position paper on the tradeoffs between fairness, transparency, and privacy in AI. Presented at 2023 SaTML Conference on Secure and Trustworthy Machine Learning (IEEE).</p>
      </section>
    </div>
  )
}

export default Tensions
