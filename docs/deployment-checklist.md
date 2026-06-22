# Deployment Checklist

## Build command

```bash
npm run build
```

## Preview command

```bash
npm run preview -- --host 127.0.0.1 --port 4173
```

## GitHub Pages notes

- Vite is configured with `base: './'` in `vite.config.ts`, so generated script, stylesheet, preload, favicon, and public asset links are relative to the deployed page path.
- `public/.nojekyll` is present so GitHub Pages serves Vite assets and nested public files without Jekyll processing.
- Character asset paths are resolved through `resolvePublicAssetPath()` against `import.meta.env.BASE_URL`.
- Static character preview HTML now uses relative paths for its SVG previews.

## Verification run

- `npm run build` passed.
- Local Vite preview served `dist/index.html` at `http://127.0.0.1:4173/`.
- Built HTML assets returned HTTP 200 in preview:
  - `./favicon.svg`
  - `./assets/index-*.js`
  - `./assets/three-core-*.js`
  - `./assets/gym-meshes-*.js`
  - `./assets/index-*.css`
- Character public assets returned HTTP 200:
  - `/assets/characters/character_asset_manifest.json`
  - `/assets/characters/preview.html`
- Repository search found no remaining root-absolute `href="/..."`, `src="/..."`, `url(/...)`, or `/assets/characters` references in deployable source/build files.

## Known issues

- Music and SFX sliders are saved settings placeholders until audio is implemented.
- Local headless Chrome/Edge console validation was attempted, but the installed Chromium browsers crashed or hung in this environment before page execution. HTTP asset validation passed; a final browser console check should be done in a normal browser session after GitHub Pages publishes.
