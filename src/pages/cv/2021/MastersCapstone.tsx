import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function MastersCapstone() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Masters Capstone: Geospatial Modeling for Lead Pipe Removal</h1>

      <section className="work-item">
        <p>
          For my capstone research class, I worked with the organization{' '}
          <a href="https://blueconduit.com/">BlueConduit</a> on a{' '}
          <a href="https://github.com/mcembalest/teamBlueConduit">
            project to improve their model's performance at identifying lead in underground pipes serving water to homes
            in Flint, Michigan
          </a>. They already had a well-performing XGBoost model in production, but wanted help identifying a more
          geospatially robust model to take advantage of the spatial nature of the problem - homes with lead in the
          water service line pipes tend to occur nearby each other.
        </p>
        <p>
          We took the baseline XGBoost model that BlueConduit had been using in production, and applied geospatial
          diffusion as a post-processing module to reduce the model's overfitting of the probability each home has lead
          water pipes.
        </p>
        <img src="/harvardcapstone/diffusion.png" alt="diffusion" />
        <p>
          We conducted an assessment of our model against the baseline across the city and found that overall it
          performed better at prioritize predicting homes with lead to be dug up earlier in the digging queue than homes
          without lead.
        </p>
        <img src="/harvardcapstone/change_prob_uncertain_dist.png" alt="change_prob_uncertain_dist" />
        <img src="/harvardcapstone/change_order_dist.png" alt="change_order_dist" />
      </section>
    </div>
  )
}

export default MastersCapstone
