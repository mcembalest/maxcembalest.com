import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function OdscNomic() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>Speaker @ ODSC East 2025</h1>

      <section className="work-item">
        <p>
          Presented at the Open Data Science Conference (May 2025) on Nomic's pre-training and post-training methods for embedding models.
        </p>
        <p><b>Abstract:</b></p>
        <p>This talk unpacks the journey behind building, training, and scaling the Nomic Embed model series—one of the most widely used open-source, multilingual, multimodal embedding families on Hugging Face, with over 35M+ downloads. We’ll explore the data curation pipeline, training infrastructure, and inference-time objectives that make these models state-of-the-art, including innovations like Matryoshka resizability, quantization, and sparse mixture-of-experts training. Additionally, we'll discuss the unique challenges of pushing applied deep learning forward in an industry lab, where real-world constraints drive cutting-edge advancements in embedding model design.</p>
        <p></p>
        <p>
        <a href="https://staging6.odsc.com/blog/speaker/max-cembalest/">ODSC Speaker Profile</a>
        </p>
      </section>
    </div>
  )
}

export default OdscNomic
