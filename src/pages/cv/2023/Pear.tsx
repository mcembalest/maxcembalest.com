import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function Pear() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>[Published @ AIES 2023] Reckoning with the Disagreement Problem: Explanation Consensus as a Training Objective</h1>

      <section className="work-item">
        <p>
          We formulated a new training objective to improve the consistency of neural network explanations. 
        </p>
        <p>
          The "Disagreement Problem" in explainable machine learning refers to the 
          difficulty in getting consistent explanations of neural network behavior. My team and I developed a method that 
          improves the consistency of neural network explanations called PEAR (Post-Hoc Explanation Agreement Regularization). 
          You can train any pytorch model with our regularizer by pip-installing <code>pear-xai</code> or
          cloning from our <a href="https://github.com/aks2203/pear-xai">github repo</a>.
        </p>
        <p>
          <b>Abstract:</b>
        </p>
        <p>As neural networks increasingly make critical decisions in high-stakes settings, monitoring and explaining their behavior in an understandable and trustworthy manner is a necessity. One commonly used type of explainer is post hoc feature attribution, a family of methods for giving each feature in an input a score corresponding to its influence on a model's output. A major limitation of this family of explainers in practice is that they can disagree on which features are more important than others. Our contribution in this paper is a method of training models with this disagreement problem in mind. We do this by introducing a Post hoc Explainer Agreement Regularization (PEAR) loss term alongside the standard term corresponding to accuracy, an additional term that measures the difference in feature attribution between a pair of explainers. We observe on three datasets that we can train a model with this loss term to improve explanation consensus on unseen data, and see improved consensus between explainers other than those used in the loss term. We examine the trade-off between improved consensus and model performance. And finally, we study the influence our method has on feature attribution explanations.</p>
        <p>
          Our paper can be found on <a href="https://arxiv.org/abs/2303.13299">arxiv</a>.
          I presented our work at the 2023 AAAI/ACM conference on Artificial Intelligence, Ethics, and Society in Montreal.
        </p>
        <img src="/arthur/reckoning1.png" alt="reckoning1" />
        <img src="/arthur/reckoning2.png" alt="reckoning2" />
      </section>
    </div>
  )
}

export default Pear
