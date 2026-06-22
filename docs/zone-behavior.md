# Gym Zone Behavior

The gym is divided into local spawn identity zones. Each zone has a center position, radius, spawn weight, and creature preference table in `src/game/content/zones.ts`.

## Zones

- Cardio Corner: favors faster or tempo creatures like Flex Fox, Pump Panther, Rowing Raccoon, Curl Corgi, and Press Penguin.
- Heavy Lift Hall: favors strength creatures like Bench Bear, Iron Rhino, Deadlift Deer, Bulk Buffalo, and Swole Gorilla.
- Flex Mirror Lane: favors showy creatures like Buff Bunny, Flex Fox, Jacked Jaguar, Tricep Tiger, and Pump Panther.
- Mythic Platform: has a small exotic spawn bonus and favors dramatic high-power normal creatures.
- Recovery Lounge: favors lower-pressure cooldown creatures like Buff Bunny, Press Penguin, Squat Squirrel, Curl Corgi, and Rowing Raccoon.

## How spawns use zones

- Wild creature spawns choose a gym zone first.
- The spawn position is picked inside that zone when possible.
- The creature table combines normal progression weights with the zone's preferred creature weights.
- Mythic Platform adds an exotic spawn chance bonus, but exotics still use the global exotic spawn cap from balance config.

## Player-facing behavior

- The HUD shows the player's current zone with a subtle `Zone` chip.
- The chip updates as the player moves around the gym.
- Zone names are informational; they do not block movement or change capture odds.

## Tuning notes

- Zone definitions live in `src/game/content/zones.ts`.
- Global spawn progression and exotic caps remain in `src/game/content/balance.ts`.
- Catch odds are unchanged and still come from the approved arm-wrestle catch table.
