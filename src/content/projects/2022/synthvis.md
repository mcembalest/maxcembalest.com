---
title: 'SynthVis: Polyphonic Synthesizer Visualizer'
description: Final project for Harvard CS171 Data Visualization. A playable synthesizer in Unity where each instrument is visualized as a 3D object deforming based on spectral analysis.
links:
  - { label: GitHub, href: 'https://github.com/mcembalest/synthvis' }
---

For my final project in Harvard's CS171 Data Visualization course, I built [SynthVis](https://github.com/mcembalest/synthvis), a polyphonic synthesizer and digital instrument visualizer in Unity/C#.

Each row of the computer keyboard is playable as its own synth, with controllable sine, square, triangle, and sawtooth wave combinations.

<video controls muted loop playsinline preload="none" poster="/media/synthvis.jpg" width="480" height="270">
  <source src="/media/synthvis.mp4" type="video/mp4" />
</video>

The project grew out of my experiences with visual feedback in instrument design plugins in Logic Pro. Existing waveform displays and individual instrument visualizers felt disconnected from the actual character of a combined polyphonic sound. I wanted to design a system where visual complexity reflected the sonic complexity of the generated tone.

In addition to showing traditional waveforms and spectrograms, each instrument is visualized as a 3D object that deforms based on spectral analysis of the generated tone. The shape is modulated by the Gini coefficient of the frequency distribution—a measure of how concentrated or spread out the energy is across the spectrum. Pure tones have energy focused at fewer frequencies, while complex wave combinations spread energy across many harmonics. This means spikier, more intricate shapes correspond to richer, more complex sounds, making it easy to compare how different instruments sound just by looking at them.
