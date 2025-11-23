import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function UmapTutorial() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Visualizing Training Dynamics with UMAP</h1>

      <img src="https://assets.nomicatlas.com/mnist-training-embeddings-umap-short.gif" alt="UMAP Tutorial" className="cv-thumbnail" />

      <section className="work-item">
        <p>
          Authored tutorial accepted to the official UMAP documentation on visualizing and analyzing the training
          dynamics of neural networks. The tutorial demonstrates training a convolutional neural network on MNIST,
          extracting high-dimensional embeddings from test images at each epoch, and utilizing UMAP to project these
          evolving embeddings into 2D space. Leveraged the Nomic Atlas platform to create a large-scale, interactive
          web visualization for exploring how the model learned to separate digit classes over time.
        </p>
        <p>
          <a href="https://umap-learn.readthedocs.io/en/latest/nomic_atlas_visualizing_mnist_training_dynamics.html#visualizing-mnist-training-dynamics-with-nomic-atlas">
            View the tutorial
          </a>
        </p>
      </section>
    </div>
  )
}

export default UmapTutorial
