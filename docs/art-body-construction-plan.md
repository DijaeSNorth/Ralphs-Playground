# Art Bible and Body Construction System Plan

## Goal

Ralph's Swole Safari should move toward polished 2D illustrated character art. The player should read as a friendly retro gym-adventure hero, not a low-poly mannequin, filtered 3D model, or blocky placeholder.

The customization system should feel like constructing an appealing body from designed art parts. Every build, frame, and muscle emphasis should look intentional, readable, animation-ready, and cohesive with the colorful creature-catching world.

## 1. Visual Art Direction

### Style target

- 2D illustrated character art with clean shapes, strong outlines, and layered body parts.
- Retro handheld readability, but not literal pixel sprites at first. The art should support pixel presentation while remaining clean at modern resolutions.
- Chunky, expressive proportions: larger head, clear face, heroic but friendly torso, readable hands and shoes.
- Stylized athletic anatomy instead of realistic bodybuilding striation.
- Characters should look charming first, muscular second.

### Linework

- Use confident outer contour lines with slightly softer inner detail lines.
- Outer line weight should be strongest around the silhouette, hands, hair, shoes, and major muscle masses.
- Inner linework should be sparse: pec separation, ab hint, deltoid edge, knee/calf curve, shoulder blade/lats in back view.
- Avoid tiny anatomy lines that become noisy in the gameplay camera.

### Silhouette

- The silhouette should communicate frame and build immediately.
- Shoulders, lats, hips, thighs, calves, hair, gloves, and shoes should create readable shape changes.
- High muscle settings should widen or thicken the correct body region, not randomly inflate all parts.
- Back view should be as intentional as front view, with clear lats, traps, shoulders, glutes, calves, hair, and outfit back details.

### Face

- Simple, friendly face with large readable eyes or visor-like eye shapes.
- Mouth and eyebrows should be expressive but minimal.
- Avoid uncanny realism, aggressive expressions, or harsh facial planes.
- Face variants can later support confident, cheerful, focused, and goofy trainer personalities.

### Hair

- Hair should be drawn as clean silhouette chunks, not many small strands.
- Each hairstyle needs front and back shapes.
- Hair should frame the head and remain visible from the angled gameplay view.
- Avoid hairstyles that obscure the face or blend into the background.

### Outfit

- Retro trainer / safari gym explorer theme.
- Base outfit: sporty top or vest, shorts or fitted athletic pants, gloves or wristbands, sneakers, optional headband/belt.
- Outfit should reinforce the body shape without hiding every muscle control.
- Clothes should have simple color blocking and a small accent color.
- Avoid overly detailed clothing folds that fight the muscle shapes.

### Muscle rendering

- Muscles should be shown through shape, line emphasis, and highlight placement.
- Low settings: soft athletic curves with little internal linework.
- Medium settings: clearer deltoids, pecs, arm shape, quads, calves.
- High settings: bold superhero/gym-comic silhouette with controlled definition.
- Never use vein-heavy, hyper-realistic, or grotesque anatomy.

### Color palette

- Bright retro palette with warm skin tones, strong outfit accents, and readable contrast.
- Use limited highlight/shadow steps: base, shadow, highlight, outline.
- Skin shadows should be warm and simple.
- Outfit accents should harmonize with the current Safari palette: teal, gold, coral, navy, cream, green.
- Custom colors should be constrained to readable palettes rather than free unrestricted color pickers.

### Shadows and highlights

- Use simple cel-shaded shadows on major masses.
- Use small highlight patches on shoulders, hair, gloves, shoes, and chest/arms at higher builds.
- Ground shadow should be a soft pixel-styled blob or oval, not realistic lighting.

### Fit with Ralph's Swole Safari

- The player should feel like a creature-catching gym explorer leading a crew of buff beasts.
- The character should be aspirational, goofy, and friendly.
- The art should pair with muscular animal creatures by using similar outline weight, color blocking, exaggerated silhouette, and readable 2.5D staging.

## 2. Body Construction Anatomy Map

The character should be built from layered 2D parts. Each part needs front, back, and angled/gameplay variants where practical. Parts should be transformable through scale, position, rotation, and optional art swaps.

### Head

- Controls: head size, hero readability, face placement.
- Front: rounded/chunky shape with clear jaw and cheeks.
- Back: hair and head outline dominate, with neck connection visible.
- Animation: idle bob, walk bounce, arm-wrestle tilt.
- Safe scaling: 0.92-1.12. Larger than this becomes mascot-like; smaller hurts readability.

### Face

- Controls: expression and friendliness.
- Front: eyes, brows, mouth, nose hint.
- Back: hidden or represented by head/hair only.
- Animation: blink, smile pop, focused capture expression.
- Safe scaling: keep facial features locked to head proportions. Avoid independently stretching eyes/mouth.

### Hair

- Controls: identity silhouette and back-view recognition.
- Front: bangs, volume, side shapes, hairline.
- Back: main hairstyle silhouette, ponytail/bun/locs/braids if selected.
- Animation: small bounce on walk or workout; reduced motion disables bounce.
- Safe scaling: 0.9-1.15 by hairstyle. Prefer art swaps over heavy deformation.

### Neck

- Controls: head-to-torso connection and trap transition.
- Front: short sturdy neck, partially covered by head/shirt.
- Back: visible neck between hair and traps.
- Animation: rotates with head/upper torso.
- Safe scaling: 0.9-1.18. Too tall looks awkward; too wide looks stiff.

### Shoulders

- Controls: width, athletic shape, V-taper.
- Front: deltoid caps define upper silhouette.
- Back: shoulder caps frame traps and lats.
- Animation: rotate/swing during walk, curl, press, arm-wrestle.
- Safe scaling: 0.85-1.35. Beyond 1.35 risks looking disconnected unless arms and traps also increase.

### Traps

- Controls: upper back/neck strength and build intensity.
- Front: subtle slope from neck to shoulders.
- Back: visible trapezius mass under neck.
- Animation: moves with shoulders during press/pull poses.
- Safe scaling: 0.85-1.25. High values should be heroic, not hunched.

### Chest / Pecs

- Controls: upper torso mass and front-view strength.
- Front: pec shape, center line, lower edge, shirt tension if clothed.
- Back: no direct pec shape; affects torso thickness and shoulder posture.
- Animation: squash/stretch during press and arm-wrestle.
- Safe scaling: 0.85-1.3. Keep chest under shoulders so it does not balloon.

### Torso / Core

- Controls: ribcage, abs, waist length, midsection definition.
- Front: abs/core lines and taper to waist.
- Back: spine/lower back panel, lats connection.
- Animation: bends during walk, squat, arm-wrestle, idle breathing.
- Safe scaling: 0.9-1.18 height, 0.85-1.2 width. Preserve believable rib/waist relationship.

### Lats / Back / Wings

- Controls: V-taper and back width.
- Front: creates side flare under arms and stronger upper-body silhouette.
- Back: primary lat shape, shoulder blade framing, width.
- Animation: expands subtly in flex/press/pull poses.
- Safe scaling: 0.85-1.35. High values should look like strong lats, not literal wings.

### Upper arms

- Controls: biceps/triceps mass and arm silhouette.
- Front: biceps curve, triceps outer edge.
- Back: triceps and rear deltoid connection.
- Animation: curl, press, walk swing, arm-wrestle bend.
- Safe scaling: 0.8-1.35. Keep elbow and forearm alignment intact.

### Forearms

- Controls: grip strength and lower arm thickness.
- Front: taper from elbow to wrist, wristband/glove scale.
- Back: same silhouette, fewer inner details.
- Animation: hand/wrist rotation for curls, cable pulls, arm-wrestle.
- Safe scaling: 0.8-1.28. Avoid forearms bigger than upper arms unless a specific stylized preset calls for it.

### Hands

- Controls: gesture readability and grip.
- Front: mitten-like or simple glove shape.
- Back: knuckle/glove pad hint.
- Animation: swing, grip bar, arm-wrestle hand clasp.
- Safe scaling: 0.9-1.18. Oversized hands can look cartoony but must stay intentional.

### Waist

- Controls: taper, frame identity, torso-to-hip transition.
- Front: belt/shorts waistband and oblique contour.
- Back: lower back and waistband.
- Animation: pivots during walk and workout poses.
- Safe scaling: 0.82-1.2. Do not pinch so hard that torso and hips disconnect.

### Hips

- Controls: lower-body frame and stance.
- Front: pelvis width under waist, shorts/pants shape.
- Back: hip/glute connection and back silhouette.
- Animation: walk sway, squat compression.
- Safe scaling: 0.85-1.3. Must stay balanced with thighs/glutes.

### Glutes

- Controls: lower-body power and back-view shape.
- Front: mostly affects hip/upper thigh contour.
- Back: clear rounded lower-body mass, especially for curved/power frames.
- Animation: squat, walk, leg press compression.
- Safe scaling: 0.85-1.3. Keep stylized and athletic.

### Thighs / Quads

- Controls: leg strength and stance.
- Front: quad mass, knee placement, shorts/pants silhouette.
- Back: hamstring-adjacent outer mass.
- Animation: walk cycle, squat bend, leg press extension.
- Safe scaling: 0.85-1.35. Knees must remain readable and not swallowed by thigh mass.

### Hamstrings

- Controls: rear leg shape where visible.
- Front: minimal or hidden.
- Back: back-of-thigh curve under glutes.
- Animation: squat/leg press stretch, walk recovery pose.
- Safe scaling: 0.85-1.25. Keep subtle so back view does not become noisy.

### Calves

- Controls: lower-leg strength.
- Front: calf flare and ankle taper.
- Back: primary calf shape and ankle silhouette.
- Animation: walk bounce, sprint pose, squat drive.
- Safe scaling: 0.8-1.3. Preserve ankle/shoe connection.

### Feet / Shoes

- Controls: ground readability, movement direction, outfit personality.
- Front: chunky sneakers, toe direction, stance width.
- Back: heel shape and sole.
- Animation: step frames, idle foot shift.
- Safe scaling: 0.9-1.2. Shoes can be chunky but should not dominate the body.

### Outfit layers

- Controls: character theme, color identity, body readability.
- Front: top, shorts/pants, belt, visible seams.
- Back: back of top, waistband, possible backpack/backplate.
- Animation: follows torso/limbs with small secondary movement.
- Safe scaling: outfit should inherit body part transforms but avoid stretching logos or patterns.

### Accessories

- Controls: personality and silhouette accents.
- Front: gloves, wristbands, headband, belt, sneakers.
- Back: headband tails, belt, shoe backs.
- Animation: small bounce or rotation where appropriate.
- Safe scaling: 0.9-1.2. Accessories should not hide body construction feedback.

## 3. Muscle Variety System

Muscle controls should map to real visual groups. Each group changes silhouette, line intensity, and part relationships. The same slider should produce a coherent low, medium, and high result.

### Shoulders / Deltoids

- Low: narrow athletic shoulder cap with minimal linework.
- Medium: round deltoid cap, clear arm separation.
- High: broad heroic shoulders with strong outline.
- Front effect: widens upper silhouette and makes arms hang farther from torso.
- Back effect: frames traps/lats and creates stronger rear silhouette.
- Animation: deltoids rotate with upper arms; avoid clipping with chest/lats.

### Traps

- Low: relaxed neck-to-shoulder slope.
- Medium: visible athletic trap mass.
- High: powerful upper-back shelf without hunching.
- Front effect: thicker neck/shoulder transition.
- Back effect: strong trapezius shape below neck.
- Animation: lifts slightly during press, pull, and flex poses.

### Chest / Pecs

- Low: flat athletic chest with shirt contour only.
- Medium: visible pec shape and mild center line.
- High: broad pec mass with stronger lower edge and highlight.
- Front effect: increases torso volume and heroic chest line.
- Back effect: slight torso thickness and posture confidence.
- Animation: chest compresses during arm-wrestle and expands subtly during idle breathing.

### Back / Lats / Wings

- Low: straight torso sides, minimal back flare.
- Medium: clear V-taper and rear lat panels.
- High: wide upper back with heroic silhouette.
- Front effect: side flare under arms and narrow waist contrast.
- Back effect: wider lat panels and shoulder-blade framing.
- Animation: lats shift with arm raises and cable pulls.

### Biceps

- Low: simple upper-arm curve.
- Medium: visible biceps bump in front/flex/curl poses.
- High: large rounded biceps, still attached cleanly at shoulder/elbow.
- Front effect: stronger inner upper-arm shape.
- Back effect: subtle side thickness; triceps dominates rear.
- Animation: biceps bulge on curl and arm-wrestle pressure.

### Triceps

- Low: smooth rear/outer upper arm.
- Medium: clear horseshoe hint in back/side views.
- High: thick outer arm mass for press poses.
- Front effect: increases outer arm width.
- Back effect: main upper-arm definition.
- Animation: extends during press, arm-wrestle pin, and cable push-like poses.

### Forearms

- Low: slim athletic taper.
- Medium: stronger wrist-to-elbow shape.
- High: powerful grip-heavy forearms.
- Front effect: thicker lower arms and gloves/wristbands read larger.
- Back effect: same silhouette with less detail.
- Animation: rotates around wrist/elbow for curls, gripping, and arm-wrestle.

### Abs / Core

- Low: smooth torso, no hard ab lines.
- Medium: soft ab panels and oblique hint.
- High: clear stylized abs with limited clean lines.
- Front effect: definition and tighter waist feeling.
- Back effect: lower-back/oblique contour.
- Animation: torso squash/stretch during movement, avoid rigid six-pack sticker look.

### Obliques

- Low: smooth waist.
- Medium: side cuts that support taper.
- High: strong side contour without over-shredding.
- Front effect: sharper waist and core shape.
- Back effect: side/lower-back definition.
- Animation: bends with torso and walk sway.

### Glutes

- Low: modest athletic hip-back transition.
- Medium: rounded lower-body power.
- High: strong glute silhouette for squat/leg builds.
- Front effect: fuller hip/upper-thigh relationship.
- Back effect: clear rounded glute mass.
- Animation: compresses in squat/leg press and shifts during walk.

### Quads

- Low: slim athletic thighs.
- Medium: visible quad mass with knee clarity.
- High: thick powerful thighs with clean outline.
- Front effect: major thigh width and lower-body strength.
- Back effect: outer thigh mass supports hamstrings/glutes.
- Animation: bend/extend during squats and walking.

### Hamstrings

- Low: simple rear thigh.
- Medium: visible back-thigh curve.
- High: strong lower-body rear silhouette.
- Front effect: minimal.
- Back effect: fuller upper leg below glutes.
- Animation: stretches in squat descent and walk recovery.

### Calves

- Low: slim lower legs.
- Medium: athletic calf bulge.
- High: strong rounded calves with ankle taper preserved.
- Front effect: lower-leg flare and strong stance.
- Back effect: primary calf shape.
- Animation: bounce and stretch during walk/sprint.

## 4. Body Frame System

Frames define proportion relationships before muscle sliders are applied.

### Balanced

- Shoulder-to-waist: even athletic taper.
- Hips: proportional to shoulders.
- Height feel: average.
- Default muscle emphasis: balanced full-body.
- Front/back: reliable default, best for first-time players.

### Tapered

- Shoulder-to-waist: wider shoulders, narrower waist.
- Hips: slightly narrower.
- Height feel: average to tall.
- Default muscle emphasis: shoulders, lats, chest.
- Front/back: strong V-taper, clear back width.

### Compact

- Shoulder-to-waist: sturdy and close.
- Hips: strong, grounded.
- Height feel: shorter/powerful.
- Default muscle emphasis: arms, thighs, calves.
- Front/back: dense silhouette, big stance, no stretched limbs.

### Curved

- Shoulder-to-waist: softer upper taper.
- Hips: fuller lower-body curve.
- Height feel: average.
- Default muscle emphasis: glutes, thighs, calves, core.
- Front/back: athletic lower-body emphasis, tasteful rounded silhouette.

### Power

- Shoulder-to-waist: thick shoulders and torso.
- Hips: strong and stable.
- Height feel: large/heavy.
- Default muscle emphasis: chest, traps, arms, thighs.
- Front/back: blockier but still charming and clean.

### Athletic

- Shoulder-to-waist: light taper.
- Hips: balanced.
- Height feel: slightly tall and agile.
- Default muscle emphasis: shoulders, core, calves.
- Front/back: sporty, lean, ready-for-motion silhouette.

### Heavyweight

- Shoulder-to-waist: broad full torso.
- Hips: broad and grounded.
- Height feel: large.
- Default muscle emphasis: chest, back, glutes, thighs.
- Front/back: big strong shape, not sloppy or distorted.

### Lean

- Shoulder-to-waist: narrow but athletic.
- Hips: narrow to balanced.
- Height feel: tall/light.
- Default muscle emphasis: core, calves, shoulders.
- Front/back: crisp runner-like silhouette with lighter muscle mass.

## 5. Build Presets

Build presets define overall mass, definition, line intensity, pose confidence, and default proportions.

### Beginner

- Overall size: smaller and casual.
- Muscle definition: minimal.
- Line intensity: low; mostly clean outlines.
- Pose confidence: relaxed, slightly humble.
- Default proportions: lean torso, smaller arms/legs.
- Distinct trait: approachable starter hero, not weak or awkward.

### Average

- Overall size: everyday active.
- Muscle definition: light.
- Line intensity: low-medium.
- Pose confidence: neutral and friendly.
- Default proportions: balanced body, mild shoulders and legs.
- Distinct trait: normal trainer look with room to grow.

### Toned

- Overall size: lean.
- Muscle definition: clear but not bulky.
- Line intensity: medium, especially core/arms.
- Pose confidence: upright and capable.
- Default proportions: narrower waist, visible shoulders/calves.
- Distinct trait: defined athletic silhouette.

### Athletic

- Overall size: sporty.
- Muscle definition: medium.
- Line intensity: medium.
- Pose confidence: energetic and ready.
- Default proportions: balanced upper/lower body, strong legs.
- Distinct trait: best all-around adventure trainer.

### Muscular

- Overall size: visibly strong.
- Muscle definition: medium-high.
- Line intensity: medium-high on delts, chest, arms, thighs.
- Pose confidence: proud but friendly.
- Default proportions: wider shoulders, thicker arms, stronger quads.
- Distinct trait: clearly gym-trained without becoming extreme.

### Bodybuilder

- Overall size: large.
- Muscle definition: high but stylized.
- Line intensity: high outer shape, controlled inner lines.
- Pose confidence: showy and theatrical.
- Default proportions: broad shoulders, big chest/back/arms, strong thighs.
- Distinct trait: impressive and clean, not grotesque.

### Elite

- Overall size: heroic/swole.
- Muscle definition: high with bold highlights.
- Line intensity: high but still readable.
- Pose confidence: legendary creature-catcher energy.
- Default proportions: exaggerated shoulders/back/arms/legs with preserved anatomy.
- Distinct trait: peak fantasy gym hero, beautiful and intentional.

## 6. Customization Controls

The UI should present customization as meaningful styling and body construction, not random sliders.

### Identity

- Skin tone.
- Hair style.
- Face/eyes if supported.
- Optional expression/personality later.

### Body Frame

- Balanced, Tapered, Compact, Curved, Power, Athletic, Heavyweight, Lean.
- UI should show a short silhouette description and front/back preview effect.

### Build Preset

- Beginner, Average, Toned, Athletic, Muscular, Bodybuilder, Elite.
- Presets should update multiple body groups together while detailed sculpt controls remain available for fine-tuning.

### Muscle Focus

- Upper body: shoulders, chest, arms, traps.
- Lower body: glutes, thighs, hamstrings, calves.
- Core: abs, obliques, waist posture.
- Arms: biceps, triceps, forearms.
- Back: lats/wings, traps, rear shoulders.

### Detailed Muscle Sculpt

- Shoulders.
- Traps.
- Chest.
- Lats/wings.
- Arms.
- Forearms.
- Core.
- Glutes.
- Thighs.
- Calves.

Each detailed control should display a short friendly explanation and stay inside safe visual clamps.

### Outfit

- Shirt/top.
- Shorts/pants.
- Shoes.
- Gloves/wristbands.
- Accent color.

Outfit choices should inherit body part transforms and remain readable at all build/frame combinations.

## 7. Front / Back / Gameplay Views

### Front preview

- Primary body construction view.
- Must show face, chest, abs/core, shoulders, arms, quads, calves, outfit front, shoes.
- Best for skin, hair-front, face, chest, abs, arm, quad, and outfit decisions.

### Back preview

- Equal priority to front preview.
- Must show hair-back, traps, lats/wings, rear delts, glutes, hamstrings, calves, shoe backs, outfit back.
- Best for back/lats, glutes, calves, hairstyle back, and frame shape.

### Angled gameplay view

- Use simplified composite or a generated angled variant.
- Must preserve head, hair, shoulder width, torso shape, arms, legs, shoes.
- Fine inner muscle lines can be reduced.

### Workout poses

- Press: torso prone/seated, arms extended, chest/shoulder emphasis.
- Squat/leg press: knees bend, thighs/glutes compress, calves visible.
- Free weights: biceps/forearms animate cleanly.
- Cable/row: back/lats/arms pull.

### Arm-wrestling pose

- Side/angled body pose with one arm emphasized.
- Requires clear forearm, biceps, shoulder, chest, face, and reaction expression.
- Creature/player close-up stage should use larger art layers or higher-detail pose parts.

### Idle and walk animations

- Idle: subtle breathing and hair/accessory bounce.
- Walk: simple 4- or 6-frame part-transform cycle.
- Reduced motion: lowers bounce and secondary movement.

## 8. Technical Implementation Plan

### Recommended direction

Use layered 2D art parts rendered through generated SVG/canvas placeholders first, with future support for hand-drawn replacement assets.

The current Three.js renderer can still host the character as camera-facing planes or grouped flat meshes, but the character source should become a 2D rig, not low-poly geometry.

### Data model

Create a body construction layer that maps appearance choices to normalized part transforms.

Suggested modules:

- `src/game/content/bodyConstruction.ts`: body part definitions, safe ranges, transform mapping, muscle group names.
- `src/game/content/characterPresets.ts`: frame definitions, build presets, default body recipes.
- `src/render/objects/characterRig2d.ts`: rig assembly, part ordering, transform application, pose helpers.
- `src/render/objects/illustratedCharacterFactory.ts`: creates renderable Three.js plane groups from SVG/canvas-generated parts.
- `src/ui/characterCustomizer.ts`: optional extraction from HUD when customization grows too large.

### Rendering architecture

- Generate part textures from SVG strings or canvas drawing functions.
- Use one plane/group per major part.
- Use a strict draw order: back accessories, back hair, back arms, torso, legs, outfit, front arms, head, face, hair, accessories.
- Front/back variants should share body data but use different part art and layer ordering.
- Gameplay view can use a simplified angled/front-biased rig until bespoke angled assets exist.
- Arm-wrestle and workout poses should be pose presets that reposition/rotate existing layers, with optional pose-specific arm art.

### Transform system

- Input: `PlayerAppearance`, frame preset, build preset, muscle sculpt sliders.
- Output: `CharacterRigState` containing scale, position, rotation, variant, and line/detail intensity per part.
- Clamp values per part, not globally.
- Couple related parts: large shoulders should affect traps and upper arms slightly; large lats should affect torso width and arm spacing; large thighs should affect hips/knees/shoes spacing.

### Placeholder asset plan

Phase 1:

- Build generated SVG/canvas placeholder parts.
- Replace current player mesh with a 2D plane rig in gameplay and preview.
- Keep existing customization controls wired to new rig state.

Phase 2:

- Add front/back part variants.
- Improve preview controls and pose switching.
- Add simplified workout and arm-wrestle pose variants.

Phase 3:

- Replace generated placeholders with polished hand-drawn assets.
- Add expression variants and outfit packs.
- Add creature-facing arm-wrestle close-up art if needed.

### Migration notes

- Keep save data compatible by retaining existing appearance ids where possible.
- Add new fields with defaults rather than replacing old fields immediately.
- Avoid changing gameplay logic while migrating art.
- Keep `createPlayerMesh()` as a compatibility wrapper until callers can move to `createIllustratedPlayerRig()`.

## 9. Quality Rules

- Clamp extreme values per body part.
- Preserve a clean silhouette at every setting.
- Keep front and back views equally intentional.
- Avoid tiny noisy details that vanish in gameplay.
- Maintain pleasant proportions before anatomical accuracy.
- Every setting must look designed, not mathematically stretched.
- Avoid broken anatomy: disconnected arms, pinched waist, swollen limbs, hidden joints.
- Couple adjacent anatomy so changes feel natural.
- High-end builds should be impressive and beautiful, not grotesque.
- Outfit layers must remain readable and should not erase customization feedback.
- Reduced motion must preserve pose readability while simplifying secondary movement.
- New art should work on mobile without excessive texture count or draw calls.

## Recommended Implementation Approach

Start with a docs-approved 2D rig architecture before replacing the player. The first implementation pass should create body construction data and a generated placeholder 2D rig behind the current `createPlayerMesh()` compatibility path. Once the rig can render front, back, and gameplay views from the same appearance data, the old low-poly player can be retired safely.

The safest near-term path is:

1. Add body construction content and preset modules.
2. Build generated SVG/canvas 2D parts.
3. Add `characterRig2d.ts` and `illustratedCharacterFactory.ts`.
4. Swap preview renderer first, because front/back QA is easier there.
5. Swap gameplay player second.
6. Add pose presets for walk, workout, and arm-wrestle.
7. Replace generated placeholders with final illustrated assets.
