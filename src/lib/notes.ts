import { getCollection } from 'astro:content'

// Published notes, newest first. Drafts are included only in development so they can be previewed.
export async function getNotes() {
  const notes = await getCollection('notes', (note) => import.meta.env.DEV || !note.data.draft)
  return notes.sort((a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0))
}
