import * as THREE from 'three';
import {
  DEFAULT_PLAYER_APPEARANCE,
  getHairOption,
  getSkinToneOption
} from '../../game/content/playerAppearance';
import type { BuddyDefinition, MuscleBuild, PlayerAppearance } from '../../game/types';

function standardMaterial(color: number, roughness = 0.78): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.02,
    flatShading: true
  });
}

function basicMaterial(color: number, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1
  });
}

function box(
  width: number,
  height: number,
  depth: number,
  color: number,
  x = 0,
  y = 0,
  z = 0
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), standardMaterial(color));
  mesh.position.set(x, y, z);
  return mesh;
}

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  color: number,
  radialSegments = 6
): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments),
    standardMaterial(color)
  );
}

function markShadows(object: THREE.Object3D): THREE.Object3D {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return object;
}

export function createArena(radius: number): THREE.Group {
  const group = new THREE.Group();

  const gymFloor = box(44, 0.18, 44, 0xc99458, 0, -0.12, 0);
  gymFloor.receiveShadow = true;
  group.add(gymFloor);

  const rubberZone = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.08, 12),
    standardMaterial(0x516a72, 0.9)
  );
  rubberZone.position.y = 0.02;
  rubberZone.receiveShadow = true;
  group.add(rubberZone);

  const centerCourt = new THREE.Mesh(
    new THREE.CylinderGeometry(7.2, 7.2, 0.09, 10),
    standardMaterial(0x5dd29a, 0.88)
  );
  centerCourt.position.y = 0.08;
  centerCourt.receiveShadow = true;
  group.add(centerCourt);

  const trainingLoop = new THREE.Mesh(
    new THREE.RingGeometry(9.1, 11.2, 64),
    standardMaterial(0xe56e57, 0.86)
  );
  trainingLoop.rotation.x = -Math.PI / 2;
  trainingLoop.position.y = 0.12;
  trainingLoop.receiveShadow = true;
  group.add(trainingLoop);

  const keyLine = box(0.12, 0.04, 13.8, 0xf7e17b, 0, 0.18, 0);
  const crossLine = box(13.8, 0.04, 0.12, 0xf7e17b, 0, 0.18, 0);
  group.add(keyLine, crossLine);

  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const lane = box(0.08, 0.035, 1.15, 0xf9d66d);
    lane.position.set(Math.cos(angle) * 10.2, 0.18, Math.sin(angle) * 10.2);
    lane.rotation.y = -angle;
    group.add(lane);
  }

  const wallMaterial = standardMaterial(0xdde5e6, 0.82);
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(44, 5.8, 0.34), wallMaterial);
  backWall.position.set(0, 2.78, -22);
  backWall.receiveShadow = true;
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.34, 4.7, 44), wallMaterial);
  leftWall.position.set(-22, 2.25, 0);
  leftWall.receiveShadow = true;
  const rightWall = leftWall.clone();
  rightWall.position.x = 22;
  group.add(backWall, leftWall, rightWall);

  const mirrorPanelMaterial = new THREE.MeshStandardMaterial({
    color: 0xbfdce2,
    roughness: 0.25,
    metalness: 0.28,
    flatShading: true
  });

  for (let i = 0; i < 7; i += 1) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.15, 0.06), mirrorPanelMaterial);
    mirror.position.set(-15 + i * 5, 2.15, -21.78);
    group.add(mirror);
  }

  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2 + 0.2;
    const pillar = cylinder(0.18, 0.22, 4.4, 0x9aaab1, 6);
    pillar.position.set(Math.cos(angle) * 19.5, 2.15, Math.sin(angle) * 19.5);
    group.add(pillar);
  }

  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const light = box(2.4, 0.08, 0.42, 0xfff0bd, -12 + col * 6, 6.2, -10 + row * 16);
      light.rotation.y = row === 0 ? 0.08 : -0.08;
      group.add(light);
    }
  }

  return group;
}

export function createGymProps(): THREE.Group {
  const group = new THREE.Group();
  const mats = [
    { x: -13.4, z: -8.4, rotation: 0.45 },
    { x: 13.2, z: 7.2, rotation: -0.55 },
    { x: -6.5, z: 13.5, rotation: 1.05 },
    { x: 7.4, z: -13.1, rotation: -0.95 }
  ];

  for (const matInfo of mats) {
    const mat = box(3.2, 0.08, 1.45, 0x2aa6a5, matInfo.x, 0.13, matInfo.z);
    mat.rotation.y = matInfo.rotation;
    mat.receiveShadow = true;
    group.add(mat);
  }

  const rig = new THREE.Group();
  const leftPost = cylinder(0.09, 0.09, 3.1, 0x34445a, 8);
  leftPost.position.set(-15.1, 1.55, 5.8);
  const rightPost = leftPost.clone();
  rightPost.position.x = -13.0;
  const crossBar = cylinder(0.07, 0.07, 2.25, 0x34445a, 8);
  crossBar.rotation.z = Math.PI / 2;
  crossBar.position.set(-14.05, 3.05, 5.8);
  const topBar = crossBar.clone();
  topBar.position.z = 4.85;
  rig.add(leftPost, rightPost, crossBar, topBar);
  group.add(markShadows(rig));

  const racks = [
    { x: 15.2, z: -7.8, rotation: -0.45 },
    { x: -15.8, z: -13.6, rotation: 0.2 },
    { x: 13.8, z: 13.1, rotation: 0.55 }
  ];

  for (const rackInfo of racks) {
    const rack = new THREE.Group();
    const base = box(2.6, 0.16, 1.2, 0x303b4d, 0, 0.12, 0);
    const backA = cylinder(0.07, 0.07, 2.2, 0x34445a, 8);
    backA.position.set(-0.95, 1.15, -0.38);
    const backB = backA.clone();
    backB.position.x = 0.95;
    const top = cylinder(0.06, 0.06, 2.1, 0x34445a, 8);
    top.rotation.z = Math.PI / 2;
    top.position.set(0, 2.24, -0.38);
    const bench = box(1.35, 0.16, 0.44, 0x1f2d3a, 0, 0.46, 0.34);
    const bar = cylinder(0.04, 0.04, 2.7, 0x202b35, 8);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.75, -0.42);
    rack.add(base, backA, backB, top, bench, bar);
    rack.position.set(rackInfo.x, 0, rackInfo.z);
    rack.rotation.y = rackInfo.rotation;
    group.add(markShadows(rack));
  }

  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2 + 0.8;
    const bell = new THREE.Group();
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), standardMaterial(0x59667a));
    body.scale.set(1, 0.82, 1);
    body.position.y = 0.34;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 6, 8, Math.PI), standardMaterial(0x34445a));
    handle.position.y = 0.67;
    handle.rotation.z = Math.PI;
    bell.add(body, handle);
    bell.position.set(Math.cos(angle) * 6.1, 0, Math.sin(angle) * 6.1);
    group.add(markShadows(bell));
  }

  for (let i = 0; i < 4; i += 1) {
    const bike = new THREE.Group();
    const wheelA = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.045, 6, 12), standardMaterial(0x2f3d4c));
    wheelA.position.set(-0.42, 0.48, 0);
    wheelA.rotation.y = Math.PI / 2;
    const wheelB = wheelA.clone();
    wheelB.position.x = 0.48;
    const seat = box(0.46, 0.12, 0.32, 0x1b2f43, 0.04, 1.08, -0.08);
    const handles = box(0.75, 0.08, 0.08, 0x34445a, 0.5, 1.22, 0.2);
    const frame = box(1.18, 0.08, 0.1, 0x21a7a5, 0.05, 0.78, 0);
    bike.add(wheelA, wheelB, seat, handles, frame);
    bike.position.set(-18.2 + i * 2.2, 0, -17.4);
    bike.rotation.y = 0.1;
    group.add(markShadows(bike));
  }

  const platformSpots = [
    { x: -10.6, z: 15.8 },
    { x: 10.8, z: -15.9 }
  ];

  for (const spot of platformSpots) {
    const platform = box(4.1, 0.12, 2.4, 0x8b6542, spot.x, 0.1, spot.z);
    const pad = box(2.3, 0.14, 1.8, 0x59667a, spot.x, 0.22, spot.z);
    group.add(platform, pad);
  }

  return group;
}

const MUSCLE_SPECS: Record<
  MuscleBuild,
  {
    torsoTop: number;
    torsoBottom: number;
    shoulder: number;
    arm: number;
    forearm: number;
    leg: number;
    baseScale: number;
  }
> = {
  lean: {
    torsoTop: 0.28,
    torsoBottom: 0.31,
    shoulder: 0.24,
    arm: 0.08,
    forearm: 0.075,
    leg: 0.09,
    baseScale: 1.05
  },
  power: {
    torsoTop: 0.36,
    torsoBottom: 0.4,
    shoulder: 0.32,
    arm: 0.12,
    forearm: 0.1,
    leg: 0.12,
    baseScale: 1.08
  },
  sculpted: {
    torsoTop: 0.34,
    torsoBottom: 0.37,
    shoulder: 0.3,
    arm: 0.11,
    forearm: 0.095,
    leg: 0.115,
    baseScale: 1.08
  }
};

function createFlatHex(radius: number, color: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.035, 6),
    standardMaterial(color)
  );
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function addPlayerHair(group: THREE.Group, appearance: PlayerAppearance): void {
  const hair = getHairOption(appearance.hair);
  const hairMaterial = standardMaterial(hair.color);

  if (appearance.hair === 'crop') {
    const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.27, 0), hairMaterial);
    cap.scale.set(1.05, 0.45, 0.9);
    cap.position.set(0, 1.34, -0.02);
    const front = box(0.34, 0.07, 0.18, hair.color, 0, 1.33, 0.19);
    group.add(cap, front);
    return;
  }

  if (appearance.hair === 'bun') {
    const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 0), hairMaterial);
    cap.scale.set(1.0, 0.48, 0.9);
    cap.position.set(0, 1.33, -0.03);
    const bun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), hairMaterial);
    bun.position.set(0, 1.51, -0.18);
    group.add(cap, bun);
    return;
  }

  const sweep = new THREE.Group();
  const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 0), hairMaterial);
  cap.scale.set(1.0, 0.42, 0.88);
  cap.position.set(0, 1.33, -0.02);
  const wedgeA = box(0.34, 0.09, 0.2, hair.color, -0.08, 1.42, 0.12);
  wedgeA.rotation.z = -0.25;
  const wedgeB = box(0.24, 0.07, 0.18, hair.color, 0.13, 1.36, 0.17);
  wedgeB.rotation.z = -0.55;
  sweep.add(cap, wedgeA, wedgeB);
  group.add(sweep);
}

function addPlayerMuscleGeometry(
  group: THREE.Group,
  build: MuscleBuild,
  skinColor: number,
  shirtAccent: number
): void {
  const spec = MUSCLE_SPECS[build];
  const leftShoulder = new THREE.Mesh(new THREE.IcosahedronGeometry(spec.shoulder, 0), standardMaterial(skinColor));
  leftShoulder.scale.set(1.2, 0.72, 0.9);
  leftShoulder.position.set(-0.39, 0.94, 0.04);
  const rightShoulder = leftShoulder.clone();
  rightShoulder.position.x = 0.39;
  group.add(leftShoulder, rightShoulder);

  const leftBicep = new THREE.Mesh(new THREE.IcosahedronGeometry(spec.arm * 1.35, 0), standardMaterial(skinColor));
  leftBicep.scale.set(0.9, 1.2, 0.78);
  leftBicep.position.set(-0.46, 0.72, 0.08);
  const rightBicep = leftBicep.clone();
  rightBicep.position.x = 0.46;
  group.add(leftBicep, rightBicep);

  const leftQuad = new THREE.Mesh(new THREE.IcosahedronGeometry(spec.leg * 1.25, 0), standardMaterial(0x1b2f43));
  leftQuad.scale.set(0.8, 1.25, 0.72);
  leftQuad.position.set(-0.15, 0.42, 0.09);
  const rightQuad = leftQuad.clone();
  rightQuad.position.x = 0.15;
  group.add(leftQuad, rightQuad);

  if (build === 'lean') {
    const chestLineA = box(0.08, 0.025, 0.28, shirtAccent, -0.1, 0.93, 0.32);
    chestLineA.rotation.z = 0.35;
    const chestLineB = chestLineA.clone();
    chestLineB.position.x = 0.1;
    chestLineB.rotation.z = -0.35;
    const core = createFlatHex(0.06, shirtAccent);
    core.position.set(0, 0.72, 0.35);
    group.add(chestLineA, chestLineB, core);
    return;
  }

  const pecLeft = box(0.2, 0.11, 0.08, shirtAccent, -0.12, 0.9, 0.35);
  pecLeft.rotation.z = 0.12;
  const pecRight = pecLeft.clone();
  pecRight.position.x = 0.12;
  pecRight.rotation.z = -0.12;
  group.add(pecLeft, pecRight);

  const abRows = build === 'sculpted' ? 3 : 2;

  for (let row = 0; row < abRows; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      const ab = createFlatHex(build === 'sculpted' ? 0.055 : 0.045, 0x5dd29a);
      ab.position.set(col === 0 ? -0.055 : 0.055, 0.76 - row * 0.075, 0.36);
      ab.scale.set(0.82, 1, 1);
      group.add(ab);
    }
  }

  if (build === 'sculpted') {
    const obliqueLeft = box(0.045, 0.18, 0.05, 0xffc55c, -0.21, 0.73, 0.34);
    obliqueLeft.rotation.z = -0.35;
    const obliqueRight = obliqueLeft.clone();
    obliqueRight.position.x = 0.21;
    obliqueRight.rotation.z = 0.35;
    group.add(obliqueLeft, obliqueRight);
  }
}

export function createPlayerMesh(appearance = DEFAULT_PLAYER_APPEARANCE): THREE.Group {
  const group = new THREE.Group();
  const skinColor = getSkinToneOption(appearance.skinTone).color;
  const spec = MUSCLE_SPECS[appearance.muscleBuild];
  const body = cylinder(spec.torsoTop, spec.torsoBottom, 0.78, 0x24445f, 7);
  body.position.y = 0.72;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 0), standardMaterial(skinColor));
  head.position.y = 1.2;
  const headband = box(0.36, 0.055, 0.3, 0xff705c, 0, 1.29, 0.06);

  const leftLeg = cylinder(spec.leg * 0.78, spec.leg, 0.48, 0x1b2f43, 5);
  leftLeg.position.set(-0.12, 0.28, 0);
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.12;

  const leftArm = cylinder(spec.arm * 0.85, spec.forearm, 0.58, skinColor, 5);
  leftArm.position.set(-0.36, 0.76, 0.04);
  leftArm.rotation.z = 0.28;
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.36;
  rightArm.rotation.z = -0.28;

  group.add(body, head, headband, leftLeg, rightLeg, leftArm, rightArm);
  addPlayerHair(group, appearance);
  addPlayerMuscleGeometry(group, appearance.muscleBuild, skinColor, 0xff705c);
  group.scale.setScalar(spec.baseScale);
  return markShadows(group) as THREE.Group;
}

function addBuddyMuscleFeatures(group: THREE.Group, definition: BuddyDefinition): void {
  const accent = definition.accent;
  const leftMark = createFlatHex(0.07, accent);
  leftMark.position.set(-0.09, 0.78, 0.38);
  const rightMark = leftMark.clone();
  rightMark.position.x = 0.09;
  group.add(leftMark, rightMark);

  if (definition.archetype === 'yogi') {
    const coreRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 5, 14), standardMaterial(accent));
    coreRing.rotation.x = Math.PI / 2;
    coreRing.position.set(0, 0.68, 0.39);
    const breathDiamond = createFlatHex(0.05, 0xf9f7ef);
    breathDiamond.position.set(0, 0.86, 0.4);
    group.add(coreRing, breathDiamond);
  }

  if (definition.archetype === 'runner') {
    const calfLeft = box(0.08, 0.18, 0.07, accent, -0.17, 0.26, 0.1);
    calfLeft.rotation.z = -0.3;
    const calfRight = calfLeft.clone();
    calfRight.position.x = 0.17;
    calfRight.rotation.z = 0.3;
    const speedChevron = box(0.28, 0.05, 0.07, 0xf9f7ef, 0, 0.98, 0.36);
    speedChevron.rotation.z = -0.18;
    group.add(calfLeft, calfRight, speedChevron);
  }

  if (definition.archetype === 'lifter') {
    const leftOrb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), standardMaterial(accent));
    leftOrb.scale.set(1.15, 0.9, 0.9);
    leftOrb.position.set(-0.5, 0.76, 0.04);
    const rightOrb = leftOrb.clone();
    rightOrb.position.x = 0.5;
    const sternum = box(0.08, 0.28, 0.07, 0xf9f7ef, 0, 0.82, 0.39);
    group.add(leftOrb, rightOrb, sternum);
  }

  if (definition.archetype === 'spinner') {
    const shoulderRingA = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 5, 12), standardMaterial(accent));
    shoulderRingA.position.set(-0.39, 0.92, 0.07);
    shoulderRingA.rotation.y = Math.PI / 2;
    const shoulderRingB = shoulderRingA.clone();
    shoulderRingB.position.x = 0.39;
    const cadenceCore = createFlatHex(0.09, 0xf9f7ef);
    cadenceCore.position.set(0, 0.67, 0.39);
    group.add(shoulderRingA, shoulderRingB, cadenceCore);
  }

  if (definition.archetype === 'climber') {
    const forearmLeft = box(0.09, 0.24, 0.07, accent, -0.4, 0.82, 0.08);
    forearmLeft.rotation.z = 0.45;
    const forearmRight = forearmLeft.clone();
    forearmRight.position.x = 0.4;
    forearmRight.rotation.z = -0.45;
    const gripCore = createFlatHex(0.08, 0xf9f7ef);
    gripCore.position.set(0, 0.7, 0.39);
    group.add(forearmLeft, forearmRight, gripCore);
  }
}

export function createBuddyMesh(definition: BuddyDefinition): THREE.Group {
  const group = new THREE.Group();
  const body = cylinder(0.34, 0.42, 0.78, definition.color, 7);
  body.position.y = 0.64;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), standardMaterial(0xffcf9a));
  head.position.y = 1.14;
  const accent = standardMaterial(definition.accent);
  group.add(body, head);

  if (definition.archetype === 'yogi') {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 5, 12), accent);
    halo.position.y = 1.45;
    halo.rotation.x = Math.PI / 2;
    const mat = box(1.08, 0.045, 0.5, definition.accent, 0, 0.07, -0.04);
    group.add(halo, mat);
  }

  if (definition.archetype === 'runner') {
    const sash = box(0.78, 0.11, 0.08, definition.accent, 0, 0.88, 0.32);
    const leftShoe = box(0.2, 0.1, 0.32, 0x1b2f43, -0.2, 0.1, 0.1);
    const rightShoe = box(0.2, 0.1, 0.32, 0x1b2f43, 0.2, 0.1, -0.06);
    group.add(sash, leftShoe, rightShoe);
  }

  if (definition.archetype === 'lifter') {
    const leftArm = cylinder(0.12, 0.14, 0.68, definition.accent, 6);
    leftArm.position.set(-0.52, 0.72, 0);
    leftArm.rotation.z = 0.2;
    const rightArm = leftArm.clone();
    rightArm.position.x = 0.52;
    rightArm.rotation.z = -0.2;
    const bar = cylinder(0.035, 0.035, 1.28, 0x303b4d, 8);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.28, 0.03);
    const leftPlate = cylinder(0.16, 0.16, 0.12, 0x303b4d, 8);
    leftPlate.rotation.z = Math.PI / 2;
    leftPlate.position.set(-0.72, 1.28, 0.03);
    const rightPlate = leftPlate.clone();
    rightPlate.position.x = 0.72;
    group.add(leftArm, rightArm, bar, leftPlate, rightPlate);
  }

  if (definition.archetype === 'spinner') {
    const wheelA = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 6, 12), accent);
    wheelA.position.set(-0.42, 0.24, 0.2);
    wheelA.rotation.y = Math.PI / 2;
    const wheelB = wheelA.clone();
    wheelB.position.x = 0.42;
    const handle = box(0.86, 0.08, 0.08, definition.accent, 0, 1.24, 0.18);
    group.add(wheelA, wheelB, handle);
  }

  if (definition.archetype === 'climber') {
    const chalkBag = cylinder(0.16, 0.19, 0.22, 0xf3f0e7, 6);
    chalkBag.position.set(0.42, 0.54, -0.1);
    const leftGrip = box(0.22, 0.18, 0.16, definition.accent, -0.52, 1.02, 0.04);
    const rightGrip = box(0.22, 0.18, 0.16, definition.accent, 0.52, 1.14, 0.04);
    group.add(chalkBag, leftGrip, rightGrip);
  }

  addBuddyMuscleFeatures(group, definition);

  return markShadows(group) as THREE.Group;
}

export function createProteinShakerProjectile(): THREE.Group {
  const group = new THREE.Group();
  const body = cylinder(0.13, 0.15, 0.54, 0x2aa6a5, 8);
  body.rotation.x = Math.PI / 2;
  const lid = cylinder(0.12, 0.12, 0.08, 0xf9f7ef, 8);
  lid.rotation.x = Math.PI / 2;
  lid.position.z = 0.31;
  const base = cylinder(0.11, 0.11, 0.04, 0xf9f7ef, 8);
  base.rotation.x = Math.PI / 2;
  base.position.z = -0.31;
  const band = cylinder(0.132, 0.132, 0.07, 0xff705c, 8);
  band.rotation.x = Math.PI / 2;
  band.position.z = 0.03;
  const spout = box(0.08, 0.08, 0.12, 0xf9f7ef, 0, 0.12, 0.36);
  group.add(body, lid, base, band, spout);
  return markShadows(group) as THREE.Group;
}

export function createCaptureRing(color: number): THREE.Mesh {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 24), basicMaterial(color, 0.9));
  ring.rotation.x = Math.PI / 2;
  return ring;
}
