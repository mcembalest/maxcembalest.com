import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { test } from 'node:test'
import { reserved, things } from './registry.ts'

const pages = new URL('../pages/', import.meta.url)

test('every registered thing has a page and a folder, and no reserved or duplicate slug', () => {
  const slugs = things.map((t) => t.slug)
  assert.equal(new Set(slugs).size, slugs.length, 'duplicate slug')
  for (const slug of slugs) {
    assert.match(slug, /^[a-z0-9-]+$/, `slug "${slug}" should be lowercase letters, digits, and dashes`)
    assert.ok(!reserved.includes(slug), `slug "${slug}" is reserved`)
    assert.ok(existsSync(new URL(`${slug}.astro`, pages)), `missing src/pages/${slug}.astro`)
    assert.ok(existsSync(new URL(`./${slug}/`, import.meta.url)), `missing src/things/${slug}/`)
  }
})

test('every top-level page is either a site page or a registered thing', () => {
  const slugs = new Set(things.map((t) => t.slug))
  for (const file of readdirSync(pages)) {
    const name = file.replace(/\.astro$/, '')
    if (!file.endsWith('.astro') || reserved.includes(name)) continue
    assert.ok(slugs.has(name), `src/pages/${file} is not in src/things/registry.ts`)
  }
})
