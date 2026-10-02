// Match the rendered <img>, including responsive object-fit cropping. The substrate must
// describe the pixels under the overlay, not an uncropped thumbnail of the source asset.
export function imagePlacement(sourceWidth: number, sourceHeight: number, width: number, height: number,
  fit: string, position = '50% 50%') {
  let w = width, h = height
  if (fit !== 'fill') {
    const contain = Math.min(width / sourceWidth, height / sourceHeight)
    const scale = fit === 'cover' ? Math.max(width / sourceWidth, height / sourceHeight)
      : fit === 'none' ? 1 : fit === 'scale-down' ? Math.min(1, contain) : contain
    w = sourceWidth * scale
    h = sourceHeight * scale
  }
  const parts = position.trim().split(/\s+/)
  const offset = (token: string, free: number) => {
    if (token === 'left' || token === 'top') return 0
    if (token === 'right' || token === 'bottom') return free
    if (token === 'center') return free / 2
    if (token.endsWith('%')) return free * parseFloat(token) / 100
    if (token.endsWith('px')) return parseFloat(token)
    return free / 2
  }
  return { x: offset(parts[0], width - w), y: offset(parts[1] ?? '50%', height - h), width: w, height: h }
}
