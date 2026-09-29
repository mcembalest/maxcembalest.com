---
title: Automatic Differentiation Engine
description: Final project for Harvard CS107 Systems Development. A Python package for automatic differentiation with forward and reverse mode, plus second-order Hessian computation via Edge Pushing.
links:
  - { label: GitHub, href: 'https://github.com/mcembalest/graddog' }
---

For my final project in Harvard's CS107 Systems Development course, I wrote a Python package for automatic differentiation called [graddog](https://github.com/mcembalest/graddog). It computes derivatives of numerical functions using both forward and reverse mode autodiff.

For extra credit, I implemented automatic second-order differentiation to calculate Hessians via a method called [Edge Pushing](https://par.nsf.gov/servlets/purl/10039361). The idea is to propagate second-order derivative information through the computational graph by "pushing" partial derivatives along edges.

![Edge Pushing algorithm](../../../assets/autodiff/edge-pushing-full.png)
