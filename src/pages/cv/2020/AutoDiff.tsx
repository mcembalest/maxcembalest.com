import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function AutoDiff() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Automatic Differentiation Engine</h1>

      <section className="work-item">
        <p>
          For my final project in Harvard's CS107 Systems Development course, I wrote a Python package for automatic differentiation called <a href="https://github.com/mcembalest/graddog">graddog</a>. It computes derivatives of numerical functions using both forward and reverse mode autodiff.
        </p>
        <p>
          For extra credit, I implemented automatic second-order differentiation to
          calculate Hessians via a method called{' '}
          <a href="https://par.nsf.gov/servlets/purl/10039361">Edge Pushing</a>. The idea
          is to propagate second-order derivative information through the computational
          graph by "pushing" partial derivatives along edges.
        </p>
        <img src="/harvardsoftwaredev/edge-pushing-full.png" alt="Edge Pushing algorithm" />
      </section>
    </div>
  )
}

export default AutoDiff
