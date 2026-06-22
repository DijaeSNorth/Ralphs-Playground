# Local Gym Event Rotation

Gym events are client-only. The game does not call a backend or save event state.

## How the event is chosen

The current event comes from the browser's local date using `new Date().getDay()`.

- Sunday: Beast Weekend
- Monday: Mythic Monday
- Tuesday: Cardio Chaos
- Wednesday: Chest Day
- Thursday: Cardio Chaos
- Friday: Flex Friday
- Saturday: Beast Weekend

Because the event is date-derived, it can change after midnight local time without save/load changes.

## Current bonuses

- Chest Day: strength-focused workout XP is multiplied by `1.1`.
- Cardio Chaos: endurance-focused workout XP is multiplied by `1.1`.
- Mythic Monday: exotic spawn chance gets a small `+0.008` local boost.
- Flex Friday: steroid rewards that already grant at least one Steroid grant one extra Steroid.
- Beast Weekend: boss XP/exotic boost rewards are multiplied by `1.15`, and boss steroid rewards get `+1`.

## Implementation notes

- Event definitions live in `src/game/content/gymEvents.ts`.
- `WorldSnapshot.currentEvent` exposes the active event to the HUD and title screen.
- Save data intentionally does not include event state.
- Bonuses are intentionally small so regular progression remains stable.
