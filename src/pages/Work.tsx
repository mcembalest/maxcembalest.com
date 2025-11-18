import './Work.css'

function Work() {
  return (
    <div className="work-container">
      <h1>Work</h1>

      <h2>2023</h2>

      <section className="work-item">
        <h3>PEAR: Post-Hoc Explanation Agreement Regularization</h3>
        <p>
          In late 2022 and early 2023 colleagues and I from Arthur worked on studying the "Disagreement Problem" 
          in explainable machine learning, which refers to the difficulty in getting consistent explanations of 
          neural network behavior. We developed a method that improves the consistency of neural network explanations 
          called PEAR. You can train any pytorch model with our regularizer by pip-installing <code>pear-xai</code> or 
          cloning from our <a href="https://github.com/aks2203/pear-xai">github repo</a>.
        </p>
        <p>
          Our paper on PEAR and the disagreement problem more broadly can be found on <a href="https://arxiv.org/abs/2303.13299">arxiv</a>. 
          I will be presenting my team's work at the 2023 AAAI/ACM conference on Artificial Intelligence, Ethics, and Society in Montreal.
        </p>
        <img src="/arthur/reckoning1.png" alt="reckoning1" />
        <img src="/arthur/reckoning2.png" alt="reckoning2" />
      </section>

      <section className="work-item">
        <h3>Pytorch Geometric GNN starter repository</h3>
        <p>
          I put together a <a href="https://github.com/mcembalest/GNN">starter github repo</a> with all the requirements 
          necessary to train graph neural networks (GNNs) using PyTorch Geometric.
        </p>
        <p>
          Graph neural networks are a natural choice for data that exhibits a network structure. To demonstrate this in 
          the starter repo, I load a dataset of the annual passenger "activity level" of each US airport (whether the 
          airport was in the 1st, 2nd, 3rd, or 4th quartile of airports ranked by yearly passenger usage). The goal of 
          this dataset is to train a model to predict that activity level. The available input feature set is connectivity 
          graph of airports that have a flight from one to the other:
        </p>
        <img src="/gnn/airports.png" alt="airports" />
        <p>
          I first train a logistic regression model as a baseline, extracting the degree of each airport from the 
          connectivity graph as the only input feature (the degree of an airport is the number of airports each airport 
          has an available flight to). I get ~50% accuracy at predicting the activity level of each airport using this 
          baseline model.
        </p>
        <p>
          Then I train two kinds of GNNs (Graph Convolutional Network and GraphSAGE) using PyTorch Geometric and get 
          between 75%-85% accuracy on the same dataset, this time using the connectivity graph directly as the input to 
          the model.
        </p>
        <p>
          In my notebook I include code for visualizing the last-layer GNN embeddings during training to qualitatively 
          compare how the models are factoring the four classes of data. There are four classes of data, so the desired 
          picture here would be for the data to slowly group by color in the four corners of the embedding space for 
          maximum separability - GraphSAGE does this better than GCN at this, and achieves lower loss in the process.
        </p>
        <img src="https://raw.githubusercontent.com/mcembalest/GNN/main/img/trajectories.gif" alt="last layer classifications" />
        <img src="/gnn/gnn_embeddings.png" alt="gnn_embeddings" />
      </section>

      <h2>2022</h2>

      <section className="work-item">
        <h3>Tutorial on Shapley Residuals</h3>
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

      <section className="work-item">
        <h3>Interactive Congressional Gerrymandering Explorer</h3>
        <p>
          For <a href="https://skewthescript.org/">Skew The Script</a>, I co-developed an AP Statistics lesson on 
          sampling and p-values, applied to the problem of evaluating the level of gerrymandering of congressional maps 
          relative to the other valid maps that could have been drawn (using the{' '}
          <a href="https://alarm-redist.org/fifty-states/">redist</a> simulator).
        </p>
        <p>
          You can visit the interactive applet{' '}
          <a href="https://skew-the-script.github.io/Gerrymandering/#firstPage">here</a> and see how the current 
          congressional map for your state compares to the distribution of other maps that could have been drawn!
        </p>
        <img src="/skewthescript/gerry.png" alt="gerrymandering level of New York state" />
      </section>

      <h2>2021</h2>

      <section className="work-item">
        <h3>Geospatial Modeling for Lead Pipe Removal</h3>
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

export default Work

