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
          The project grew out of my experiences with visual feedback in instrument
          design plugins in Logic Pro. Existing waveform displays and individual instrument visualizers felt disconnected from the actual character of a combined polyphonic sound. I wanted to design system where visual complexity reflected the sonic complexity of the generated tone.
        </p>
        <p>
          In addition to showing traditional waveforms and spectrograms, each instrument is visualized as a 3D object that deforms based on spectral analysis of the generated tone. The shape is modulated by the Gini coefficient of the frequency
          distribution—a measure of how concentrated or spread out the energy is across
          the spectrum. Pure tones have energy focused at fewer frequencies, while
          complex wave combinations spread energy across many harmonics. This means
          spikier, more intricate shapes correspond to richer, more complex sounds,
          making it easy to compare how different instruments sound just by looking at them.
        </p>
      </section>
    </div>
  )
}

export default SynthVis
