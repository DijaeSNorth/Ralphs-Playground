# Deployment Checklist

Release: Playtest v1  
Version: `0.1.0-playtest.1`  
GitHub Pages URL: https://dijaesnorth.github.io/Ralphs-Playground/

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
- Release branch for Playtest v1: `release/playtest-v1`.
- In-game Settings shows `Version 0.1.0-playtest.1`.

## Verification run

- `npm run build` passed for `0.1.0-playtest.1` on 2026-06-23.
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

- Audio uses lightweight generated Web Audio effects and subtle placeholder music loops; final authored audio assets are not included yet.
- Local production preview returned HTTP 200 for `http://127.0.0.1:4173/`. A final browser console check should be done in a normal browser session after GitHub Pages publishes.
- Feedback collection is manual; testers should use Settings -> Copy Playtest Report and send the plain-text output with notes.
- Local daily gym events depend on the tester's device date.
