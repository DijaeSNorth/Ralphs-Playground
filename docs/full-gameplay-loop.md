# Ralph's Swole Safari - Full Gameplay Loop Design

## Purpose

This document defines the intended full gameplay loop for **Ralph's Swole Safari** before any new gameplay implementation work. It expands the original request into a clear player journey, system map, progression plan, reward loop, and UI visibility model.

## Game Identity

**Ralph's Swole Safari** is a 2D illustrated creature-catching gym adventure.

The player customizes a retro trainer, explores stylized gym zones, finds muscular animal and mythological creatures, challenges them in close-up arm-wrestling capture scenes, builds an active crew, trains captured creatures through workouts, and grows stronger over time.

The game should feel like a colorful handheld creature adventure with intentional illustrated art, readable silhouettes, strong linework, funny gym energy, and a clean first playthrough.

## Original Request to Preserve

### Visual Direction

- Beautiful intentional 2D art.
- Strong linework and readable silhouettes.
- Muscle variety through body construction customization.
- A creature-catching adventure feel.
- A clean retro presentation, not an old 3D gym with only a pixel filter.

### Creatures

- Creatures resemble real animals or mythological beings.
- All creatures are muscular.
- Each creature has a funny gym identity.
- Exotic mythological creatures exist as rare special types.
- Creature designs must stay original and avoid copyrighted monster designs.

### Capture

- Protein shakers are not the capture method.
- Capture happens through arm wrestling.
- Capture transitions into a close-up action scene.
- Player and creature are staged in a readable arm-wrestling pose.
- The match should feel close.
- On success, the player wins and the creature cries dramatically/cartoonishly.
- On failure, the creature powers out and escapes.

### Catch Odds

Approved catch odds must remain exact:

- Normal level 1-15: 90%
- Normal level 16-25: 85%
- Normal level 26-35: 80%
- Normal level 36+: 70%
- Exotic mythological creatures: 40%

Tap, click, or Space input during capture may affect visual struggle intensity only. It must not change the final catch chance unless a later explicit design changes that rule.

### Steroids

- Steroids are a fictional arcade level-up item.
- They work like a rare level candy.
- They instantly raise a captured creature by one level.
- They must never include real-world medical advice, dosage, health claims, or realistic usage instructions.

## Full Loop Summary

The core loop is:

1. Explore a stylized gym zone.
2. Spot a roaming muscular creature.
3. Inspect level, rarity, personality, and catch odds.
4. Start an arm-wrestling capture.
5. Resolve success or failure using approved odds.
6. Add captured creatures to active crew or storage.
7. Train crew through workouts.
8. Use rewards, XP, and fictional Steroids to strengthen favorites.
9. Unlock tougher zones, bosses, and rare exotic hunts.
10. Fill the RepDex and optimize the active crew.

The minute-to-minute loop should be simple and visible. Long-term depth should be hidden until the player has a reason to use it.

## First-Time Player Flow

### Title Screen

Show only:

- Ralph's Swole Safari title.
- Short description: "Arm wrestle wild gym beasts. Build the strongest crew."
- Start Game.
- Customize Character.
- Settings.
- Version label.

Hide:

- RepDex.
- Crew list.
- Storage.
- Goals.
- Quests.
- Debug tools.
- Stats.
- Playtest report.
- Daily event details.

### Character Setup

The player can open customization before starting.

Customization should feel like body construction:

- Large preview.
- Front View.
- Back View.
- Rotate Left.
- Rotate Right.
- Reset View.
- Quick presets.
- Build preset.
- Body frame.
- Muscle sculpt controls by region.
- Outfit and style options.
- Live body summary.

The player should not be forced to customize, because the default trainer should look polished and ready to play.

### First Gameplay Moment

Show only:

- Objective: "Find your first creature."
- Minimal movement controls.
- Simple stamina/status if needed.

Hide:

- Crew.
- RepDex.
- Goals.
- Quests.
- Storage.
- Boss info.
- Stats.
- Settings panels.
- Daily event details.

### First Creature Encounter

When the player gets near a creature, show a compact target panel:

- Creature name.
- Level.
- Rarity.
- Catch chance.
- Short personality line.
- Arm Wrestle prompt.

Do not open a large creature detail panel automatically.

### First Capture

When the player starts capture:

- Hide unrelated HUD.
- Cut to a close-up illustrated arm-wrestling action scene.
- Show action text such as "Arm Wrestle!" and "It's close!"
- Allow tap/press input for visual struggle intensity only if already supported.
- Resolve using approved catch odds.

On success:

- Show the player pinning the creature.
- Show creature crying dramatically/cartoonishly.
- Add creature to active crew if there is space.
- Send creature to storage if active crew is full.
- Update RepDex.
- Show a short result card.

On failure:

- Show the creature powering out.
- Creature jumps back, backs away, or escapes.
- Player returns to exploration.
- Failure should be funny, not punishing.

### After First Capture

Show a short result:

- Creature joined your crew.
- "View Crew" button.
- "Keep Playing" button.

Then briefly introduce:

- "Your crew helps you progress."

Unlock or reveal:

- Crew button.
- RepDex button.
- Goals button.

## Minute-to-Minute Loop

The player should always have one obvious next action:

1. Walk through a zone.
2. See creature behavior, zone props, or a workout station.
3. Approach a creature or station.
4. Inspect compact contextual info.
5. Arm wrestle, train, or keep exploring.
6. Receive a quick result.
7. Return to clean gameplay.

Moment-to-moment verbs:

- Move.
- Inspect.
- Arm Wrestle.
- Train.
- Manage crew.
- Check RepDex.
- Complete goals.
- Challenge boss when available.

## Long-Term Progression Loop

The player progresses by:

- Capturing more creatures.
- Raising creature levels.
- Improving creature stats.
- Completing goals and quests.
- Winning boss challenges.
- Discovering new zones.
- Filling the RepDex.
- Finding exotic creatures.
- Optimizing the active crew.

Progression should produce new opportunities, not UI clutter.

### First 5 Minutes

Player should:

- Start from a clean title screen.
- Optionally customize trainer.
- Enter the first zone.
- Find a first creature.
- See catch odds.
- Start arm wrestle.
- Capture or fail in a funny way.
- Understand active crew.
- Unlock Crew, RepDex, and Goals.

### Early Game

Focus:

- Capture normal level 1-15 creatures.
- Learn rarity and catch odds.
- Learn workouts.
- Level the first crew.
- Complete basic goals.
- Earn first fictional Steroids reward.

Expected creature mix:

- Mostly common and uncommon normal creatures.
- Low-level creatures.
- Exotic spawns should be absent or extremely rare.

### Mid Game

Focus:

- Unlock more zones.
- See more level 16-25 creatures.
- Start using storage.
- Use Steroids strategically.
- Fight first boss.
- Encounter rare creatures.
- Begin seeing exotic hints.

Expected creature mix:

- More uncommon and rare normal creatures.
- Occasional higher-level creatures.
- Rare exotic chance in special zones or events.

### Late Game

Focus:

- Hunt exotic mythological creatures.
- Optimize active crew slots.
- Complete RepDex.
- Challenge stronger bosses.
- Max favorite creatures.
- Build specialized teams around passives and stat growth.

Expected creature mix:

- Level 26-35 and 36+ normal creatures.
- Exotic creatures remain uncommon but meaningfully huntable.
- Zone choice and events can influence spawns.

## Economy and Reward Loop

Rewards should support the main loop without overwhelming the player.

### Reward Types

- XP for captured creatures.
- XP from workouts.
- Gym tokens or equivalent small currency.
- Fictional Steroids.
- Rare or exotic spawn boosts.
- Boss rewards.
- Cosmetic or profile rewards if added later.

### Reward Sources

- Successful captures.
- Workout completion.
- Goals and quests.
- Boss victories.
- First exotic capture.
- RepDex milestones.
- Daily/local gym events.

### Economy Principles

- Early rewards should teach systems.
- Mid-game rewards should encourage crew management.
- Late-game rewards should support targeted collection and optimization.
- Steroids should stay useful but not replace natural XP leveling.
- Failure should cost time, stamina, or opportunity, not wipe progress.

## Capture Loop

### Exploration Capture Setup

When near a creature:

- Show target panel only.
- Do not open full Creature Data automatically.
- Show level and catch odds before capture.
- Show personality line for flavor.

### Arm-Wrestle Action Scene

Scene goals:

- Make the capture feel like a short retro battle moment.
- Clearly frame player and creature.
- Hide unrelated UI.
- Make the arm struggle readable.
- Show success and failure as different outcomes.

Scene beats:

1. "Arm Wrestle!"
2. "It's close!"
3. Result beat:
   - Success: "Pinned!"
   - Failure: "It powered out!"

### Capture Result

Success result card:

- Creature name.
- Level.
- Rarity.
- Catch chance used.
- Joined Active Crew or Sent to Storage.
- Flavor reaction line.

Failure result card:

- Creature name.
- Level.
- Rarity.
- Catch chance used.
- "It powered out!"

Result card should be short, skippable, mobile friendly, and never trap the player.

## Crew and Storage Loop

### Active Crew

- Active crew has limited slots.
- Active crew drives passives, boss power, and immediate progression.
- Captured creatures join active crew first if there is space.

### Storage

- Extra captures go to storage.
- Storage prevents forced release.
- Player can swap active crew and storage.
- Storage should not be shown until it matters.

### Crew Card Information

Each captured creature should show:

- Name or nickname.
- Species.
- Level.
- XP bar.
- Rarity badge.
- Stats.
- Passive ability.
- Flavor/personality.
- Recent/caught metadata where useful.

### Crew Management Actions

- View details.
- Rename.
- Use Steroids.
- Swap with storage.
- Release with confirmation.

## Workout Loop

Workouts should be a main progression pillar, not just side buttons.

### Workout Flow

1. Player approaches a station.
2. Station prompt appears.
3. Player starts workout.
4. Trainer or active creature performs a short readable animation.
5. UI shows short text beats such as "Press!", "Rep!", "Good form!", "Workout complete!"
6. Rewards apply.
7. Player returns to exploration.

### Workout Types

- Bench press: strength, chest, arms.
- Squat or leg press: legs, glutes.
- Cardio: endurance, stamina.
- Cable or row: back, lats.
- Free weights: arms, strength.
- Core station: focus, core.

### Workout Rewards

Workouts may grant:

- XP.
- Stat growth.
- Stamina recovery or stamina capacity progress.
- Gym tokens.
- Small chance of arcade rewards.
- Progress toward goals.

Workout type should influence stat growth so station choice matters.

## Steroids Loop

Steroids are fictional arcade items.

### Earn

Steroids can come from:

- Capture milestones.
- Goals.
- Boss rewards.
- First exotic capture.
- RepDex milestones.
- Special local events.

### Use

When used:

- Consume 1 Steroid.
- Raise one captured creature by 1 level.
- Apply a small stat boost consistent with leveling.
- Show a funny retro message.

### Safety and Tone

UI text should say:

- "Instantly adds one level to a captured creature."

UI text should avoid:

- Dosage.
- Real-world advice.
- Medical claims.
- Realistic instructions.

## Boss Loop

Bosses should test the player's crew and give long-term targets.

### Boss Appearance

Bosses can appear:

- After capture milestones.
- In special zones.
- After goals.
- During local events.
- As late-game repeatable challenges.

### Challenge Rules

Boss challenge power should compare:

- Active crew levels.
- Creature stats.
- Rarity/exotic bonuses.
- Active crew passives.
- Relevant workout progress.

### Boss UI

Show boss details only when a boss is active:

- Boss name.
- Recommended crew power.
- Challenge button.
- Reward preview.
- Short battle panel after challenge starts.

### Boss Outcomes

Victory:

- XP.
- Steroids.
- Rare/exotic spawn boost.
- Tokens or cosmetics if supported.

Loss:

- No progress wipe.
- Small stamina cost, cooldown, or delayed rewards.
- Funny failure message.

## Exotic Loop

Exotics are rare mythological gym beasts.

### Exotic Rules

- Fixed 40% catch chance.
- Rare spawn rate.
- Stronger visual presentation.
- Exotic rarity badge.
- Special RepDex treatment.
- Dramatic capture scene.

### Exotic Examples

- Minotaur Maximus.
- Griffin Gains.
- Dragon Deadlift.
- Cyclops Curl.
- Hydra Hypertrophy.
- Pegasus Pump.
- Werewolf Warrior.
- Kraken Curl.
- Sphinx Strength.
- Phoenix Flex.

### Exotic Hunt Flow

1. Player learns exotics exist through goals, RepDex silhouettes, or a rare hint.
2. Player discovers zones/events that increase exotic chance.
3. Player encounters an exotic with stronger visual effects.
4. Target panel clearly labels Exotic Catch: 40%.
5. Arm-wrestle capture scene uses more dramatic staging.
6. First exotic capture triggers a special reward and toast.

## Zone Loop

Zones should create spawn identity and exploration structure.

### Zone Examples

- Cardio Corner: fast creatures, endurance gains, runner types.
- Heavy Lift Hall: bears, gorillas, rhinos, strength creatures.
- Flex Mirror Lane: foxes, panthers, personality-heavy creatures.
- Mythic Platform: exotics and rare dramatic spawns.
- Recovery Lounge: lower pressure, tutorials, stamina recovery.

### Zone Purpose

- Give players a reason to move around.
- Make creature spawns feel intentional.
- Support creature hunting.
- Help teach workout types.
- Provide clear visual landmarks.

## Goals and Quest Loop

Goals and quests should guide play without flooding the HUD.

### Goals

Goals are longer-term milestones:

- Capture 3 creatures.
- Capture 6 creatures.
- Capture 10 creatures.
- Capture first exotic.
- Level any creature to 10.
- Fill 50% of RepDex.

### Quests

Quests are short next steps:

- Capture 2 common creatures.
- Win 1 boss battle.
- Use 1 Steroid.
- Capture a level 16+ creature.
- Find an exotic creature.
- Level a creature to 10.

### Visibility

- Show only 1-3 active objectives.
- Keep details inside the Goals panel.
- Do not show quest logs before the player has first captured a creature.
- Completed goals should reward once.

## RepDex Loop

RepDex is the collection encyclopedia.

Each entry should show:

- Creature name.
- Species.
- Rarity.
- Caught count.
- Highest level caught.
- Exotic badge if applicable.

Details should show:

- Description.
- Personality tag.
- Favorite workout.
- Victory/cry reaction line.
- Catch odds by level tier.
- Normal or exotic type.
- Funny gym flavor text.

RepDex should support long-term collection without cluttering the gameplay screen.

## Save and Load Loop

Save data should preserve:

- Active crew.
- Storage.
- Creature levels and XP.
- Steroids inventory.
- RepDex progress.
- Captured total.
- Goals and quests.
- Unlocked progression tier.
- Settings.
- Tutorial completion.

Save data should not preserve:

- Renderer objects.
- Three.js objects.
- Temporary scene state.
- Runtime-only effects.

Corrupt or old save data should fail gracefully by backing up bad data and starting clean.

## Tutorial and Onboarding

Tutorial should be short and step-based:

1. Move around.
2. Get near a creature.
3. Read level and catch chance.
4. Start arm-wrestling capture.
5. Add captured creature to crew.
6. Use Steroids after earning one.
7. Find rare exotic creatures.

Rules:

- Use small retro popups.
- Allow skip.
- Do not return after completion unless save is reset.
- Keep text short and funny.

## UI Visibility Rules

### Always Clean During Exploration

Show only:

- Current objective or tutorial hint.
- Target panel when near a creature.
- Simple stamina/status.
- Small active crew count or crew button after unlocked.
- Minimal controls.

### Hide Until Relevant

- RepDex: after first capture.
- Crew: after first capture.
- Goals: after first capture.
- Steroids: after player earns one.
- Storage: when active crew is full or storage contains creatures.
- Boss panel: only when boss is active.
- Exotic details: after exotic encounter or hint.
- Debug tools: only with `?debug=1` or explicit debug setting.
- Playtest report: inside Settings or Feedback.

### Panels

- Only one panel open at a time.
- Panels close when gameplay action starts.
- Escape closes active panel.
- Mobile panels should be full-screen or bottom-sheet style.
- Hidden panels must not intercept clicks.

### Toasts

- Show one toast at a time.
- Auto-dismiss quickly.
- Never cover target odds, capture prompt, or core controls.

## Accessibility and Mobile Controls

Mobile and accessibility requirements:

- Touch movement uses joystick or intended touch controls only.
- Mouse clicks are for UI only, not click-to-move.
- Capture, interact, sprint, and steroid buttons must be large enough to tap.
- HUD panels collapse on small screens.
- Reduced motion should tone down shake, glow, and animation intensity.
- Catch odds visibility should respect settings.
- Pixel filter should be toggleable.
- Text must remain readable on small screens.

## Required Systems

The full game loop depends on these systems:

- Creature spawning.
- Zone definitions and zone-biased spawns.
- Level-based capture odds.
- Arm-wrestle action scene.
- Active crew and storage.
- RepDex.
- Workouts and workout animations.
- XP and leveling.
- Fictional Steroids item.
- Boss battles.
- Goals and quests.
- Save/load.
- Tutorial/onboarding.
- Settings.
- Mobile controls.
- Accessibility/reduced motion.
- Debug tools hidden from normal players.

## What Should Be Implemented or Polished Next

### Recommended Next Implementation Order

1. **Visual and UX quality pass**
   - Confirm the 2D illustrated trainer, creatures, target panel, and capture scene all read clearly in the current build.
   - Fix any remaining old gym/protein-shaker wording or visual leftovers.

2. **First 5 minutes pass**
   - Ensure title, customization, first objective, first target panel, first capture, and first result are clean.
   - Ensure Crew, RepDex, and Goals unlock only after first capture.

3. **Capture result and arm-wrestle polish**
   - Verify close-up capture staging, success pin, crying reaction, failure escape, and result card.
   - Keep catch odds unchanged.

4. **Workout loop polish**
   - Make station prompts obvious but not cluttered.
   - Ensure workout animations and rewards feel connected to creature growth.

5. **Progression tuning**
   - Tune spawn pacing, level ranges, exotic rarity, goal rewards, and boss timing.
   - Keep early game generous.

6. **Crew/storage/RepDex clarity**
   - Make active crew and storage swapping clear.
   - Ensure RepDex details are readable on mobile.

7. **Boss and exotic hunt polish**
   - Ensure bosses and exotics feel special without overwhelming the first playthrough.

8. **Playtest readiness**
   - Run desktop and mobile smoke checks.
   - Verify save/reset behavior.
   - Export tester report.
   - Update known issues.

## Design Risks

- UI clutter can obscure the simple creature-catching fantasy.
- Too many systems too early can overwhelm first-time players.
- Capture must stay visually fun even though odds are table-driven.
- Steroids must remain clearly fictional and avoid real-world guidance.
- Exotics should feel rare but not invisible.
- Workout rewards should matter without becoming mandatory grind.

## Success Criteria

The full gameplay loop succeeds if:

- A new player knows what to do in the first 30 seconds.
- The first creature capture is clear and funny.
- The player understands why crew matters after the first capture.
- Workouts feel connected to growth.
- Goals point the player toward the next meaningful action.
- Bosses and exotics give longer-term reasons to keep playing.
- The UI stays clean during active gameplay.
- The game still centers on original muscular creatures and arm-wrestling capture.
