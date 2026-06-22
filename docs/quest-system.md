# Quest System

The quest system guides the main play loop with 1-3 active objectives shown in the HUD.

## Definitions

Quest definitions live in `src/game/content/quests.ts`. Each quest has an id, short title, target progress, one-time completion flag, and rewards.

Current quest hooks cover:

- Capture 2 common creatures.
- Win 1 boss battle.
- Use 1 Steroid on a crew creature.
- Capture a level 16+ creature.
- Find an exotic creature.
- Level any creature to 10.

## Rewards

Quest rewards reuse existing progression systems:

- Crew XP.
- Steroids.
- Small exotic spawn boost.

Rewards are granted once when a quest first reaches its target.

## Save/load

Quest state is saved with local progress as completed/progress pairs. Missing or old save data gets default quest state during sanitization.

## HUD

The world snapshot exposes active quests, and the HUD renders only the first three incomplete quests so the player always has a concise next goal.
