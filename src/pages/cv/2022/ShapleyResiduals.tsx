import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function ShapleyResiduals() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Tutorial on Shapley Residuals</h1>

      <section className="work-item">
        <p>
          After my first few months researching machine learning interpretability & explainability at Arthur, I wrote a
          short explainer on Shapley values and a tutorial for calculating their residuals for{' '}
          <a href="https://towardsdatascience.com/shapley-residuals-measuring-the-limitations-of-shapley-values-for-explainability-d9cdc3582522">
            TowardsDataScience
          </a>{' '}
          based on the work of{' '}
          <a href="https://proceedings.neurips.cc/paper/2021/hash/dfc6aa246e88ab3e32caeaaecf433550-Abstract.html">
            Kumar et. al.
          </a>
        </p>
        <p>
          This post is aimed at a general data science practitioner audience to explain the limitations of Shapley
          values at capturing feature importance for complex models.
        </p>
        <img src="/arthur/shapley_residuals.png" alt="shapley_residuals" />
      </section>
    </div>
  )
}

export default ShapleyResiduals
