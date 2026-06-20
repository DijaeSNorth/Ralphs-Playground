import * as THREE from 'three';
import type { BuddyDefinition } from '../../game/types';

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

export function createPlayerMesh(): THREE.Group {
  const group = new THREE.Group();
  const body = cylinder(0.28, 0.34, 0.76, 0x24445f, 7);
  body.position.y = 0.72;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 0), standardMaterial(0xffcf9a));
  head.position.y = 1.2;
  const cap = box(0.38, 0.08, 0.34, 0xff705c, 0, 1.38, 0.02);
  const visor = box(0.2, 0.04, 0.25, 0xff705c, 0, 1.36, 0.25);

  const leftLeg = cylinder(0.08, 0.1, 0.48, 0x1b2f43, 5);
  leftLeg.position.set(-0.12, 0.28, 0);
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.12;

  const leftArm = cylinder(0.07, 0.08, 0.58, 0xffcf9a, 5);
  leftArm.position.set(-0.36, 0.76, 0.04);
  leftArm.rotation.z = 0.28;
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.36;
  rightArm.rotation.z = -0.28;

  group.add(body, head, cap, visor, leftLeg, rightLeg, leftArm, rightArm);
  group.scale.setScalar(1.04);
  return markShadows(group) as THREE.Group;
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

  return markShadows(group) as THREE.Group;
}

export function createCaptureProjectile(): THREE.Group {
  const group = new THREE.Group();
  const body = cylinder(0.12, 0.14, 0.46, 0xff705c, 8);
  body.rotation.x = Math.PI / 2;
  const capA = cylinder(0.1, 0.1, 0.08, 0xf9f7ef, 8);
  capA.rotation.x = Math.PI / 2;
  capA.position.z = 0.27;
  const capB = capA.clone();
  capB.position.z = -0.27;
  group.add(body, capA, capB);
  return markShadows(group) as THREE.Group;
}

export function createCaptureRing(color: number): THREE.Mesh {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 24), basicMaterial(color, 0.9));
  ring.rotation.x = Math.PI / 2;
  return ring;
}
