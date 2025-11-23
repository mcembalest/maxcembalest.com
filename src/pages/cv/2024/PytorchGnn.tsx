import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function PytorchGnn() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Pytorch Geometric GNN starter repository</h1>

      <section className="work-item">
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
    </div>
  )
}

export default PytorchGnn
