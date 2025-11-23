import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function OdscArthur() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Speaker @ ODSC East 2024</h1>

      <section className="work-item">
        <p>
          Presented "Reckoning with the Disagreement Problem: Post-Hoc Explanation Agreement as a Training Objective"
          at the Open Data Science Conference. This talk covered the PEAR (Post-hoc Explanation Agreement Regularization)
          method developed at Arthur for improving the interpretability and reliability of neural networks by regularizing
          for explanation consensus directly during model training.
        </p>

        <p><b>Abstract:</b></p>
        <p>As neural networks increasingly make critical decisions in high-stakes settings, monitoring and explaining their behavior in an understandable and trustworthy manner has become a necessity. One commonly used type of explainer is post hoc feature attribution, which is a family of different methods of giving to each feature in a model’s input a score corresponding to the feature’s influence on the model’s output. A major limitation of this family of explainers in practice is that they can disagree on which features are more important than others. Our contribution in this paper is a method of training models with this disagreement problem in mind. We do this by including in the loss function, alongside the standard term corresponding to model performance, an additional term that measures the difference in feature attribution between a pair of explainers. We observe in our experiments on three datasets that models trained with this loss term can see improved explanation consensus on unseen data and on explainers that were not explicitly trained to agree. However, this improved consensus comes with a cost to model performance. Finally, we study how our method influences model outputs and explanations.</p>
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
