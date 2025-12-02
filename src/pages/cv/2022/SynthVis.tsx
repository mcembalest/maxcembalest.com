import { Link } from 'react-router-dom'
import '../../../pages/CV.css'

function SynthVis() {
  return (
    <div className="work-container">
      <Link to="/cv">← Back to CV</Link>

      <h1>SynthVis: Polyphonic Synthesizer Visualizer</h1>

      <section className="work-item">
        <p>
          For my final project in Harvard's CS171 Data Visualization course, I built{' '}
          <a href="https://github.com/mcembalest/synthvis">SynthVis</a>, a polyphonic
          synthesizer and digital instrument visualizer in Unity/C#.
        </p>
        <p>
          Each row of the computer keyboard is playable as its own synth, with
          controllable sine, square, triangle, and sawtooth wave combinations.
        </p>
        <img src="/harvarddataviz/synthvis.gif" alt="SynthVis demo" />
        <p>
          Instead of showing traditional waveforms, each instrument is visualized as a
          3D object that deforms based on spectral analysis. Sharper tones with more
          complex wave combinations appear as spikier shapes, making it easy to compare
          how different instruments sound just by looking at them.
        </p>
      </section>
    </div>
  )
}

export default SynthVis
