# QA Checklist: Ralph's Swole Safari

## 1) Build and deploy
- [ ] `npm run build` completes without TypeScript or bundling errors.
- [ ] Production bundle artifacts are produced in `dist/`.
- [ ] Boot text renders as `Loading Ralph's Swole Safari` before mount (`src/main.ts`).
- [ ] Failure fallback shows `Ralph's Swole Safari failed to load.`.
- [ ] Vite/GitHub Pages behavior remains unchanged (no changes to deployment config files).

## 2) Movement/input
- [ ] Keyboard input reads WASD/Arrow movement in `InputController.read()` (`src/game/input/actions.ts`).
- [ ] `Shift` enables sprint in desktop mode (`src/game/input/actions.ts`).
- [ ] Space / left mouse triggers capture attempt and does not break movement pathing when capture is unavailable.
- [ ] Right click continues to route to interaction (`interactPressed`) for workout/vending/spot actions.
- [ ] Touch joystick produces smoothed movement and respects touch dead-zone behavior.
- [ ] Touch sprint button sets `virtualSprintHeld` and returns to normal sprint state on release.
- [ ] Input mode switch updates the `inputLabel` shown in HUD (`src/ui/hud.ts`).
- [ ] During arm-wrestle cutscene, movement/actions are temporarily suppressed (`captureCutsceneTimer` in `world.ts` + `createGymBuddyGame.ts`).

## 3) Creature spawning
- [ ] Normal wild roster includes all new normal animals in definitions and weights:
  - `buff-bunny`, `curl-corgi`, `deadlift-deer`, `flex-fox`, `bench-bear`, `pump-panther`, `press-penguin`, `rowing-raccoon`, `squat-squirrel`, `tricep-tiger`, `iron-rhino`, `bulk-buffalo`, `jacked-jaguar`, `swole-gorilla`.
- [ ] These entries are present in normal weighted pools (`weightedBuddyDefinitionId`) in `src/game/simulation/world.ts`.
- [ ] Wild buddy levels are set at spawn (`getWildBuddyLevel`) and preserved to roster entry on capture (`buddy.level` passed to `createRosterEntry`).
- [ ] Active wild creature count on field remains bounded by existing spawn constants and active buddy array behavior.
- [ ] New exotics appear when `isExotic` roll in spawn resolves (`exoticChance` path), and normal pool is still the default.

## 4) Capture odds
- [ ] `getArmWrestleCatchChance` is the only helper used for arm-wrestle outcomes (`src/game/simulation/world.ts`).
- [ ] Odds table remains:
  - Lv 1–15: 90%
  - Lv 16–25: 85%
  - Lv 26–35: 80%
  - Lv 36+: 70%
  - Exotic flag (`rarity: exotic` or `isExotic: true`): 40%
- [ ] UI preview in `targetPreviewChance` is sourced from the same helper (`formatCatchChanceText` in `src/ui/hud.ts`).
- [ ] RepDex detail odds preview uses helper logic at multiple tiers (`getRepDexCaptureOdds`).
- [ ] `WorldEvent` sent on attempt includes `chance` value.

## 5) Arm-wrestling animation
- [ ] Capture event with `captureStyle: 'arm-wrestle'` is rendered with new pose actors (`createGymBuddyGame.ts` capture handler).
- [ ] Player and creature transition into prone-to-fight positions and return.
- [ ] Beat text appears at intervals around cutscene (`Arm wrestle!`, `It's close...`, success/fail final beat).
- [ ] Cutscene movement lock and camera framing occur while `captureCutsceneRemaining` is active (`world` + `GymBuddyRenderer`).
- [ ] On success path, creature tears marker is attached and played (`createBabyCryingDrops`).

## 6) Normal creature capture
- [ ] Capture an in-range normal creature from nearestBuddy and verify event `result: success` / `result: miss` appears.
- [ ] On success, target roster entry is created and level is retained from wild state.
- [ ] On miss, buddy reacts (`dodgeTimer`), and player stamina change is applied.
- [ ] Success and miss messages in capture event remain arm-wrestle-specific (no throw/shaker wording).

## 7) Exotic creature capture
- [ ] At least 10%? 0.1%–1.1% spawn path is enabled through `exoticChance` and does not overwrite normal pools.
- [ ] Every exotic capture checks the same helper and evaluates as 40%.
- [ ] Exotic species identifiers are defined and available in weighted list:
  - `minotaur-maximus`
  - `dragon-deadlift`
  - `griffin-gains`
  - `cyclops-curl`
  - `chrome-rhino`
  - `hydra-hypertrophy`
  - `pegasus-pump`
  - `werewolf-warrior`
  - `kraken-curl`
  - `sphinx-strength`
  - `phoenix-flex`
- [ ] Exotic row styling is applied when rarity is flagged (`isExoticBuddyDefinition`) in UI.
- [ ] Verify exotics show `Rarity` labels in RepDex and target preview.

## 8) Steroids item
- [ ] Player HUD shows steroid count and flavor copy.
- [ ] `Use Steroid` action exists in crew row and calls `world.useSteroid`.
- [ ] Using steroid increments level, updates XP and basic stats, and decrements player steroid inventory.
- [ ] Message appears confirming use.
- [ ] Guardrails trigger when roster creature is at level cap, when no steroids are owned, or when invalid roster id is sent.

## 9) RepDex
- [ ] RepDex list renders all creature definitions from snapshot (including highest level metadata and rarity badge).
- [ ] Tapping/clicking a row opens detail card.
- [ ] Detail card shows species, type, rarity, caught count and best level.
- [ ] Exotic label and flavor text path remains visible and distinct.
- [ ] Capture odds in detail are computed from helper and match preview tiers.

## 10) Mobile/touch controls
- [ ] Touch joystick captures pointer movement and recenters on release.
- [ ] Sprint + movement touch actions are responsive under short taps and sustained hold.
- [ ] Touch capture action still works and displays `Wrestle` in touch action button label.
- [ ] On low-end devices, capture/mesh animation still uses mobile tuned scales and durations.
- [ ] No severe CPU spikes from animation loops while cutscene is active (check average frame time during repeated tests).

## 11) Performance
- [ ] Build output sizes stay within expected bounds from previous commits.
- [ ] Wild creature meshes remain low-poly and low-material count.
- [ ] Arm-wrestle effect allocates small actor count and clears on completion (no persistent stale effects).
- [ ] Input and update loops remain stable at normal cadence while no captures are running.
- [ ] Mobile mode uses adjusted actor scale/gap/camera offsets where defined in renderer.

## 12) Known issues
- The game still uses generic terms (`buddy`) in several runtime internals and non-capture HUD snippets; this is cosmetic and not gameplay-affecting.
- Full end-to-end balance verification for catch progression and RNG probability distribution is inherently stochastic and can only be sampled over time, not proven in a single pass.
- Performance baselines vary by device; mobile frame-rate needs device-specific sampling with browser devtools.

- **Created**: 2026-06-22

