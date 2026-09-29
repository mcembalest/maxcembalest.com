# maxcembalest.com

Personal site, built with [Astro](https://astro.build) as static HTML.

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # type-check and build to dist/
```

- `src/pages/index.astro`: home page
- `src/pages/cv/index.astro`: CV
- `src/content/projects/`: CV detail pages (Markdown; the path becomes the URL, e.g. `2023/pear.md` → `/cv/2023/pear`)
- `src/assets/`: images, resized and converted to WebP at build time
- `public/media/`: short MP4 clips (converted from GIFs) and their poster frames
