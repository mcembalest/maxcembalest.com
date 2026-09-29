import { defineConfig } from 'astro/config'

// Old React-era URLs for entries that were folded into /cv.
const retired = [
  '2025/odsc-nomic',
  '2025/umap-tutorial',
  '2025/nomic-documentation',
  '2024/odsc-arthur-llm',
  '2024/llm-experimentation',
  '2024/pytorch-gnn',
  '2023/llm-evaluation',
  '2023/odsc-arthur-pear',
  '2022/tensions',
  '2022/shapley-residuals',
]

export default defineConfig({
  site: 'https://www.maxcembalest.com',
  // Astro's HTML compression drops the space between text and a link that starts a new line.
  compressHTML: false,
  redirects: Object.fromEntries(retired.map((path) => [`/cv/${path}`, '/cv'])),
})
