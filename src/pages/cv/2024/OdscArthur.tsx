import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function OdscArthur() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Reckoning with the Disagreement Problem - ODSC Presentation</h1>

      <section className="work-item">
        <p>
          Presented "Reckoning with the Disagreement Problem: Post-Hoc Explanation Agreement as a Training Objective"
          at the Open Data Science Conference. This talk covered the PEAR (Post-hoc Explanation Agreement Regularization)
          method developed at Arthur for improving the interpretability and reliability of neural networks by regularizing
          for explanation consensus directly during model training.
        </p>
        <p>
          <a href="https://odsc.com/speakers/reckoning-with-the-disagreement-problem-post-hoc-explanation-agreement-as-a-training-objective/">
            View session description
          </a>
        </p>
      </section>
    </div>
  )
}

export default OdscArthur
