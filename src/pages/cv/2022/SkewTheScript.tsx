import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function SkewTheScript() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Interactive Web Applications for Skew The Script</h1>

      <section className="work-item">
        <p>
          For <a href="https://skewthescript.org/">Skew The Script</a>, I worked with its founder Dashiell Young-Saver (a classmate from my Masters @ Harvard IACS) to develop interactive web applications to help make AP Statistics lessons more engaging and relevant to students. 
          We developed two lessons on distributional sampling and hypothesis testing, applied to important real-world problems that challenge students' to think critically about statistical inference.
        </p>
        <h4>Congressional Gerrymandering Explorer</h4>
        <p>
          The <a href="https://skew-the-script.github.io/Gerrymandering/#firstPage">gerrymandering app</a> shows the current
          congressional map for each US state and compares it to the distribution of other maps that could have been drawn.
        </p>
        <img src="/skewthescript/STS-gerrymandering.gif" alt="gerrymandering level of New York and Maryland" />
        <h4>Central Limit Theorem Demonstration</h4>
        <p>
          The <a href="https://skew-the-script.github.io/CentralLimitTheorem/#firstPage">central limit theorem app</a> shows how the sample means of a dataset converge to a normal distribution as the sample size increases.
        </p>
        <img src="/skewthescript/STS-sampling.gif" alt="central limit theorem demonstration" />
      </section>
    </div>
  )
}

export default SkewTheScript
