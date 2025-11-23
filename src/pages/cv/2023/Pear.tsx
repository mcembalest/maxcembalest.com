import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function Pear() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Reckoning with the Disagreement Problem: Explanation Consensus as a Training Objective</h1>

      <section className="work-item">
        <p>
          I worked on studying the "Disagreement Problem" in explainable machine learning, which refers to the 
          difficulty in getting consistent explanations of neural network behavior. We developed a method that 
          improves the consistency of neural network explanations called PEAR (Post-Hoc Explanation Agreement Regularization). 
          You can train any pytorch model with our regularizer by pip-installing <code>pear-xai</code> or
          cloning from our <a href="https://github.com/aks2203/pear-xai">github repo</a>.
        </p>
        <p>
          Our paper on PEAR and the disagreement problem more broadly can be found on <a href="https://arxiv.org/abs/2303.13299">arxiv</a>.
          I presented my team's work at the 2023 AAAI/ACM conference on Artificial Intelligence, Ethics, and Society in Montreal.
        </p>
        <img src="/arthur/reckoning1.png" alt="reckoning1" />
        <img src="/arthur/reckoning2.png" alt="reckoning2" />
      </section>
    </div>
  )
}

export default Pear
