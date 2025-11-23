import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function Tensions() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Tensions Between the Proxies of Human Values in AI</h1>

      <section className="work-item">
        <p>
          In late 2022, colleagues and I from Arthur worked on studying the "Disagreement Problem"
          in explainable machine learning, which refers to the difficulty in getting consistent explanations of
          neural network behavior. We developed a method that improves the consistency of neural network explanations
          called PEAR. You can train any pytorch model with our regularizer by pip-installing <code>pear-xai</code> or
          cloning from our <a href="https://github.com/aks2203/pear-xai">github repo</a>.
        </p>
        <p>
          Our paper can be found on <a href="https://arxiv.org/abs/2212.07508">arxiv</a>.
        </p>
        <img src="/arthur/reckoning1.png" alt="reckoning1" />
        <img src="/arthur/reckoning2.png" alt="reckoning2" />
      </section>
    </div>
  )
}

export default Tensions
