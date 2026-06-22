# Update Plan: Gym Buddy Catcher / Arm Wrestle Capture

## Files identified

- Buddy and creature definitions
  - `src/game/content/buddies.ts`
  - `src/game/types.ts`

- World simulation and capture logic
  - `src/game/input/actions.ts`
  - `src/game/simulation/world.ts`

- Renderer capture effects
  - `src/render/app/createGymBuddyGame.ts`

- HUD inventory / crew UI
  - `src/ui/hud.ts`
  - `src/style.css` (HUD and crew panel styles)

- Player and buddy mesh creation
  - `src/render/objects/lowPolyFactory.ts`
  - `src/render/app/createGymBuddyGame.ts`
  - `src/game/content/playerAppearance.ts`

- Styling in general
  - `src/style.css`
  - `src/ui/hud.ts` (markup + class hooks)

## Planned implementation order

1. Confirm data models and existing creature data contracts (`buddies.ts`, `types.ts`) to avoid breaking current stat, name, and roster assumptions.
2. Update gameplay interactions/input capture path in `actions.ts` and `world.ts` first, including `ActionState`, capture event generation, and capture/respawn bookkeeping.
3. Wire any required data surfaced to the renderer in `world.ts` snapshot shape before changing visuals.
4. Implement or tune capture feedback in `createGymBuddyGame.ts` (ring/projectile/target effects, timings, and success/fail states).
5. Update mesh creation hooks in `lowPolyFactory.ts` and mesh usage points in `createGymBuddyGame.ts` for buddy appearance and player/buddy visuals.
6. Update crew inventory/capture status flows and controls in `hud.ts` and align with existing CSS classes.
7. Apply targeted styling updates in `style.css` for any new visual states while preserving existing structure.
8. Implement pixel-art-inspired handheld RPG presentation in `src/render/app/createGymBuddyGame.ts` and `src/style.css` while keeping gameplay/deploy unchanged.

## Deployment constraint to preserve

- Keep `vite.config.ts` (`base: './'`, manual chunking) and GitHub Pages workflow (`.github/workflows/pages.yml`) unchanged to preserve current build and deployment behavior.
