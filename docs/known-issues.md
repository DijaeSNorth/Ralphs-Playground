# Known Issues

Version: `0.1.0-playtest.1`

## Visual placeholders

- Player and creatures use generated illustrated/vector-style construction instead of hand-authored final sprite sheets.
- Some workout/capture poses are transform-based polish rather than full frame-by-frame animation.
- RepDex creature previews are stylized letter/silhouette cards, not final illustrated portraits.

## Animation limitations

- Reduced motion intentionally removes or simplifies several UI and scene animations.
- Boss, workout, and capture animations are readable MVP beats, but not final animation timing.
- Creature personality animations are species-biased transform loops, not unique authored animation sets per creature.

## Audio limitations

- Audio is generated with the Web Audio API; no final audio assets are included yet.
- Music loops are lightweight placeholders and may feel repetitive during long sessions.
- Browser autoplay policy means audio starts only after the first user click/tap/key press.
- Very rapid UI interaction can still overlap short blips, though workout struggle sounds are cooldown-limited.

## Balance concerns

- First capture is intentionally generous, but a 90% catch can still fail.
- Exotic creatures are intentionally rare; testers should report if they feel invisible or too common.
- Early Steroid rewards teach the item but may need tuning after playtest data.
- Boss difficulty depends on crew level/stat progression and needs more device/player sampling.

## Mobile concerns

- Very small screens may still require panel scrolling in RepDex, Crew, Settings, and customization.
- Touch performance depends on device GPU/browser; older devices may stutter during capture or boss moments.
- Safe-area/notch behavior should be checked on real iOS and Android devices.

## Browser and deployment concerns

- Final console-error verification should be performed in a normal browser session after GitHub Pages publishes the latest branch.
- Local save data is browser-specific and may be cleared by private browsing, storage cleanup, or browser policy.
- Feedback is manual; the game does not upload bug reports.

## Tester reporting note

Use Settings -> Copy Playtest Report and send it with reproduction steps, browser/device details, and screenshots when possible.