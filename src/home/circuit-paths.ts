// Convert graph edges into rounded, tapered chains. Pure geometry, shared by rendering/tests.
export interface Segment { node: number; ax: number; ay: number; cx: number; cy: number; bx: number; by: number }
export function circuitPaths(nodes: Float32Array, edges: Uint32Array) {
  const count = nodes.length / 7, adjacent: number[][] = Array.from({ length: count }, () => [])
  for (let i = 0; i < edges.length; i += 2) {
    adjacent[edges[i]].push(edges[i + 1]); adjacent[edges[i + 1]].push(edges[i])
  }
  const used = new Set<number>(), chains: number[][] = []
  const key = (a: number, b: number) => Math.min(a, b) * count + Math.max(a, b)
  const walk = (a: number, b: number) => {
    const chain = [a]
    while (!used.has(key(a, b))) {
      used.add(key(a, b)); chain.push(b)
      if (adjacent[b].length !== 2) break
      const next = adjacent[b].find(n => n !== a)!
      a = b; b = next
    }
    chains.push(chain)
  }
  for (let a = 0; a < count; a++) if (adjacent[a].length !== 2)
    for (const b of adjacent[a]) if (!used.has(key(a, b))) walk(a, b)
  // All-degree-two components are closed circuits, with no junction to start the first pass.
  for (let i = 0; i < edges.length; i += 2) if (!used.has(key(edges[i], edges[i + 1]))) walk(edges[i], edges[i + 1])
  const segments: Segment[] = []
  for (const chain of chains) chain.forEach((node, i) => {
    const previous = chain[Math.max(0, i - 1)], next = chain[Math.min(chain.length - 1, i + 1)]
    const cx = nodes[node * 7], cy = nodes[node * 7 + 1]
    segments.push({ node, ax: (nodes[previous * 7] + cx) / 2, ay: (nodes[previous * 7 + 1] + cy) / 2,
      cx, cy, bx: (nodes[next * 7] + cx) / 2, by: (nodes[next * 7 + 1] + cy) / 2 })
  })
  return { chains, segments }
}
