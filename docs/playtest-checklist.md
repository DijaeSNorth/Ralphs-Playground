# Playtest Checklist

Version: `0.1.0-playtest.1`

## 1. Game URL

- Public playtest URL: https://dijaesnorth.github.io/Ralphs-Playground/
- Local preview for maintainers: run `npm run build`, then `npm run preview`.

## 2. What testers should try first

- Start a new game and confirm the title explains the creature-catching loop.
- Move around the gym and approach the nearest creature.
- Read the target panel for name, level, rarity, and catch chance.
- Try one arm-wrestling capture and watch the result screen.
- Open Crew, Storage, RepDex, Goals, and Settings.
- Open Settings and confirm the version label reads `0.1.0-playtest.1`.
- If Steroids are available, use one on a captured creature.
- Keep playing long enough to see higher-level spawns, a boss, or an exotic creature.

## 3. Controls

- Move: `WASD` or arrow keys.
- Sprint: `Shift` or the on-screen sprint button.
- Capture/interact: `Space`, click, or tap the on-screen button when near a creature.
- Arm-wrestle struggle: tap, click, or press `Space` during the meter for visual push only.
- Menus: click or tap HUD buttons for Crew, Storage, RepDex, Goals, and Settings.
- Tester report: Settings -> Copy Playtest Report.

## 4. How to capture creatures

- Walk near a wild creature until the target preview appears.
- Confirm the preview shows the creature name, level, rarity, and catch chance.
- Start the arm-wrestling capture attempt.
- The final catch result uses the displayed odds; struggle input only changes the animation.
- On success, the creature joins the active crew if a slot is open, otherwise it goes to storage.

## 5. How Steroids work

- Steroids are a fictional arcade level-up item.
- Using one on a captured creature consumes 1 Steroid and adds 1 level.
- Steroids boost creature stats but do not change wild capture odds.
- If multiple crew creatures exist, confirm the prompt shows the selected creature name.

## 6. How exotic creatures work

- Exotic creatures are rare mythological gym beasts with special badges and stronger visuals.
- Exotic catch chance should always display and resolve at 40%.
- Date-based events may slightly improve exotic spawn chances, but exotics should still feel uncommon.

## 7. What feedback to collect

- Was the first-time tutorial clear and short enough?
- Did capture odds, rarity, levels, and result screens make sense?
- Did arm wrestling feel readable and fun on your device?
- Were Crew, Storage, RepDex, Goals, Settings, and Reset Save easy to find?
- Did Steroids feel clearly fictional and understandable?
- Did mobile/touch controls cover important UI or feel hard to tap?
- Did performance drop, stutter, overheat, or drain battery quickly?
- Did save/load preserve crew, storage, levels, goals, settings, and RepDex progress?
- Did Copy Playtest Report create a useful plain-text report without exposing personal info?
- Did corrupt-save recovery show a friendly reset/reload screen instead of breaking permanently?
- Any stale wording about protein shakers as capture items should be reported.

## 8. Known issues

- Feedback collection is manual; the game does not upload tester notes.
- Audio uses lightweight generated Web Audio tones, not final music or external sound assets.
- Local rotating events are based on the tester's device date and do not require a backend.
- Protein shakers may still exist as non-capture gym economy flavor if present, but they should not be described as the capture method.
- Playtest reports include browser user agent and screen size by design, but omit raw save data and custom creature nicknames.
- Save corruption backups stay in localStorage under a bad-save backup key for debugging; testers can still reset the active save.

## 9. Browser/device info testers should report

- Browser name and version.
- Device model and operating system.
- Desktop, tablet, or phone.
- Screen size and orientation.
- Input method: keyboard, mouse, touch, controller, or mixed.
- Approximate performance: smooth, occasional stutter, frequent stutter, or unplayable.
- Console errors, screenshots, or exact steps for any bug.
- Paste the Copy Playtest Report output when reporting a bug.
