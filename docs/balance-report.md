# Ralph's Swole Safari Balance Report

## Scope

This pass tunes existing systems only. It does not add new gameplay systems and does not change the approved catch chance table.

## Capture Odds

Capture odds are unchanged:

- Normal level 1-15: 90%
- Normal level 16-25: 85%
- Normal level 26-35: 80%
- Normal level 36+: 70%
- Exotic mythological creatures: 40%

## First 5 Minutes

Current tuning goals:

- The fixed starter creature spawns nearby and is capped at level 5.
- Starter Stretch wild creatures are capped to levels 1-5.
- Capture animation duration is 1.45 seconds.
- Failed capture respawn/retry pacing is 0.7 seconds.
- Failed capture stamina cost is 6.
- First capture remains highly likely because level 1-5 normal creatures use the approved 90% chance tier.

Known concern:

- A 90% first capture can still fail. The quick retry pacing is intended to make this funny rather than frustrating.

## Spawn Rates and Zone Pacing

Active wild creature count:

- 8 active wild creatures.

Zone level shaping:

- Starter Stretch: level 1-5.
- Flex Trail: mostly early agile creatures, clamped up to level 16.
- Heavy Lift Hall: level floor 6, strength creatures trend higher, clamped up to level 30.
- Core Court: level floor 5, balanced/focus creatures, clamped up to level 26.
- Mythic Platform: level floor 10, higher dramatic encounters, clamped up to level 50.

Exotic spawn tuning:

- Base exotic chance: 0.3%.
- Progress scaling: up to +1.4%.
- Global exotic cap: 6%.
- Mythic Platform adds an additional local exotic bonus.

Known concern:

- Exotics should be rare but discoverable around Mythic Platform. Playtesters should report whether they see one within a reasonable mid-game session.

## XP Rewards

Current XP values:

- Capture XP to active crew: 32.
- New captured creature bonus XP: 50.
- Base workout XP: 42.

Goal XP rewards:

- First capture: 45 crew XP.
- First workout: 60 crew XP.
- 3 workouts: 90 crew XP.
- Capture 3 creatures: 70 crew XP.
- Level any creature to 5: 100 crew XP.
- First boss win: 120 crew XP.
- 25% RepDex: 100 crew XP.
- 50% RepDex: 140 crew XP.

Expected feel:

- Early levels should move quickly through capture plus workout.
- Mid levels should require repeated training or boss rewards.
- High levels should still require sustained play or Steroids.

## Workout Rewards

Workout target score:

- 4 successful workout actions.

Roster training duration:

- 10 seconds.

Workout identity:

- Bench/press: strongest strength gain.
- Squat/leg press: strength plus endurance.
- Cable/row: focus plus strength.
- Free weights: balanced strength/focus.

Zone bonuses:

- Flex Trail: endurance bonus and slight XP boost.
- Heavy Lift Hall: strength bonus and token bonus.
- Core Court: focus bonus and XP boost.
- Mythic Platform: focus bonus, XP boost, and token bonus.

Known concern:

- There is not yet a dedicated cardio/core station type in the station data. Existing zones and station types approximate those roles.

## Steroid Rewards

Steroids remain fictional arcade level-up items.

Current economy:

- Starting Steroids: 0.
- First capture goal: +1 Steroid.
- 3 workouts: +1 Steroid.
- Capture 3 creatures: +1 Steroid.
- Encounter exotic: +1 Steroid.
- First exotic capture: +3 Steroids.
- Level any creature to 5: +1 Steroid.
- First boss win goal: +1 Steroid.
- Workout random Steroid chance: 18%.

Expected feel:

- The player gets an early sample after first capture.
- Regular leveling still comes from XP.
- Steroids remain valuable and not required.

Known concern:

- First capture granting a Steroid is useful for teaching the item, but playtesters should report whether it feels too early.

## Boss Difficulty

Boss unlock pacing:

- Plate Titan: after 3 captures or a level 5 crew member.
- Rep Reaper: after 8 captures or 25% RepDex.
- Bulk Baron: after exotic encounter/capture or a level 15 crew member.

Boss balance values:

- Boss power bonus: 14.
- Base win chance: 48%.
- Crew power divisor: 135.
- Minimum win chance: 24%.
- Maximum win chance: 92%.
- Boss reward XP base: 36.
- Boss reward XP power scale: 0.28.
- Boss Steroid upgrade chance: 25%.

Loss:

- Costs stamina.
- Grants consolation XP at 35% of the boss XP reward, minimum 8.
- Does not wipe progress.

Expected feel:

- First boss should be approachable after a little training.
- Boss wins should reward preparation.
- Boss losses should teach the player to train without feeling like a reset.

## Recommended Future Playtest Questions

- Does the first capture happen quickly enough?
- Is a failed first capture funny or annoying?
- Do workouts feel worth doing before boss fights?
- Does level 5 happen at a satisfying pace?
- Are Steroids useful without feeling spammed?
- Does Plate Titan feel fair after 3 captures or one level 5 creature?
- Do exotics appear rarely but not impossibly?
- Does Mythic Platform feel meaningfully different?
- Is the HUD still clean during exploration and capture?
