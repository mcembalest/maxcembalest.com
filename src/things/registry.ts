// Every applet on the site. Each one lives in src/things/<slug>/ and is served at /<slug> by
// src/pages/<slug>.astro; registry.test.ts checks that the two stay in sync.

export interface Thing {
  slug: string
  title: string
  // One line in Max's words, shown on the index and in link previews.
  description: string
}

export const things: Thing[] = [
  {
    slug: 'tessellate',
    title: 'Tessellate',
    description: 'A simple and surprising two-player board game.',
  },
]

// Top-level paths that belong to the site itself, so no applet can claim them.
export const reserved = ['cv', 'notes', 'games', '404', 'index', 'favicon', 'media', '_astro']

export const thing = (slug: string) => {
  const found = things.find((t) => t.slug === slug)
  if (!found) throw new Error(`No thing registered with slug "${slug}"`)
  return found
}
