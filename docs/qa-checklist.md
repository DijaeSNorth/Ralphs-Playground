# QA Checklist: Ralph's Swole Safari

Version: `0.1.0-playtest.1`

## Build and release

- [ ] `npm run build` passes.
- [ ] Version `0.1.0-playtest.1` appears on title screen.
- [ ] Version `0.1.0-playtest.1` appears in Settings.
- [ ] Playtest report includes version, browser, screen, save summary, settings summary, zone/event, and recent errors.
- [ ] GitHub Pages URL returns HTTP 200: https://dijaesnorth.github.io/Ralphs-Playground/

## Start screen

- [ ] Title reads Ralph's Swole Safari.
- [ ] Subtitle explains arm-wrestling wild gym beasts.
- [ ] Start Game, Customize Character, Settings, and version label are visible.
- [ ] RepDex, Crew, Goals, Storage, Debug, and Playtest Report are not shown as main-screen clutter.

## Customization

- [ ] Customize Character opens from title screen.
- [ ] Front View, Back View, Rotate Left, Rotate Right, and Reset View work.
- [ ] Hair, skin tone, build, frame, presets, and muscle sculpt controls visibly update preview.
- [ ] Settings can reopen customization after gameplay starts.
- [ ] Customization clicks do not move the player.

## Movement

- [ ] WASD and arrows move screen-relative to the 2.5D camera.
- [ ] Diagonal keyboard movement works.
- [ ] Mouse clicks do not move the player.
- [ ] Touch joystick or touch controls move the player without stealing UI taps.
- [ ] Sprint works and stamina changes are readable.

## Menus and HUD

- [ ] First gameplay screen only shows objective, minimal status, and relevant controls.
- [ ] Target panel appears only near a creature.
- [ ] Crew, RepDex, Goals, and Settings buttons open one panel at a time.
- [ ] Close buttons, Escape, and outside click close detail sheets.
- [ ] Debug tools are hidden unless `?debug=1` is active.

## Creature encounter

- [ ] Nearby target panel shows creature name, level, rarity, catch chance, and short flavor.
- [ ] Buff animal silhouettes are readable from the 2.5D camera.
- [ ] Exotic badges and glow are readable without hurting contrast.
- [ ] Creature nearby audio plays once per encounter, not constantly.

## Arm-wrestle capture

- [ ] Capture odds remain exact: 90%, 85%, 80%, 70%, and Exotic 40%.
- [ ] Capture starts a close-up action scene, not a shaker projectile.
- [ ] HUD hides unrelated panels during capture.
- [ ] Struggle input affects animation intensity only.
- [ ] Success shows pin, cry reaction, result card, and crew/storage destination.
- [ ] Failure shows power-out/escape and result card.
- [ ] Capture music/sounds start only after user interaction.

## Crew and storage

- [ ] Captured creature appears in active crew if space exists.
- [ ] Captured creature goes to storage if active crew is full.
- [ ] Active crew limit is 4.
- [ ] Sorting, detail card, rename, release confirmation, storage swap, and steroid buttons work.
- [ ] Save updates after rename, release, storage swap, steroid use, and capture.

## RepDex

- [ ] Overview shows discovered/captured/normal/exotic progress.
- [ ] Filters work: All, Caught, Mystery, Normal, Exotic.
- [ ] Locked entries show mystery state, rarity clue, and zone clue.
- [ ] Caught entries show species, rarity, caught count, best level, role/passive, and favorite workout.
- [ ] Detail card shows flavor, personality, reactions, passive, role, workout, zone clue, and catch odds.
- [ ] Detail cards close reliably on desktop and mobile.

## Workouts

- [ ] Workout prompt appears only near station.
- [ ] Bench/press, squat/leg, cable/row, and free-weight workouts have distinct animations.
- [ ] Workout start, rep, and complete sounds play at reasonable volume.
- [ ] Workout completion grants XP/stat progress and does not trap the UI.

## Goals and progression

- [ ] First capture goal rewards once.
- [ ] First workout goal rewards once.
- [ ] Goals panel stays hidden until useful and does not clutter first playthrough.
- [ ] Boss gates and exotic encounter goals progress when expected.

## Steroids

- [ ] Steroids appear in inventory only when relevant.
- [ ] Use Steroid increases level by 1 and consumes 1 item.
- [ ] Steroids are framed as fictional arcade item only.
- [ ] No real-world medical guidance appears.

## Bosses

- [ ] Boss panel appears only when a boss is active.
- [ ] Boss challenge requires at least one creature.
- [ ] Boss battle panel shows crew/boss power and result.
- [ ] Boss intro, win, and loss sounds trigger.
- [ ] Losing does not wipe progress.

## Save/load

- [ ] Refresh preserves appearance, crew, storage, levels, XP, steroids, RepDex, goals, tutorial state, and settings.
- [ ] Reset Save requires confirmation.
- [ ] Corrupt save fallback backs up bad data and starts clean.

## Mobile

- [ ] Main screen is readable at phone width.
- [ ] Panels become full-screen or bottom-sheet style.
- [ ] Touch controls do not cover target odds or capture buttons.
- [ ] RepDex and crew scroll cleanly.

## Reduced motion

- [ ] Reduced motion tones down capture shake, creature motion, UI animations, and glow.
- [ ] Reduced motion does not mute audio.

## Audio

- [ ] No sound plays before first user interaction.
- [ ] Master, Music, SFX, and Mute settings work.
- [ ] Menu/select, back/close, start, customization, nearby, capture, struggle, success, fail, crying, workout, level-up, steroid, goal, exotic, and boss sounds trigger.
- [ ] Sounds are short and not harsh.

## Performance

- [ ] Build size remains reasonable.
- [ ] Repeated capture effects clean up.
- [ ] Workout/capture/boss audio does not create runaway overlapping sound.
- [ ] Mobile capture and RepDex scrolling remain stable.

## Known issues

- [ ] Current known issues are documented in `docs/known-issues.md`.