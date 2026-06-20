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

  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.18, 12),
    standardMaterial(0x6ccf8c, 0.92)
  );
  ground.position.y = -0.12;
  ground.receiveShadow = true;
  group.add(ground);

  const track = new THREE.Mesh(
    new THREE.RingGeometry(8.5, 10.7, 64),
    standardMaterial(0xd96e5d, 0.86)
  );
  track.rotation.x = -Math.PI / 2;
  track.position.y = 0.02;
  track.receiveShadow = true;
  group.add(track);

  const center = new THREE.Mesh(
    new THREE.CylinderGeometry(6.8, 6.8, 0.06, 10),
    standardMaterial(0x77d99b, 0.9)
  );
  center.position.y = 0.02;
  group.add(center);

  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const lane = box(0.08, 0.035, 1.3, 0xf9d66d);
    lane.position.set(Math.cos(angle) * 9.55, 0.07, Math.sin(angle) * 9.55);
    lane.rotation.y = -angle;
    group.add(lane);
  }

  return group;
}

export function createParkProps(): THREE.Group {
  const group = new THREE.Group();
  const stations = [
    { x: -12.8, z: -5.8, rotation: 0.45 },
    { x: 12.5, z: 4.8, rotation: -0.55 },
    { x: -5.5, z: 12.3, rotation: 1.05 },
    { x: 7.2, z: -11.8, rotation: -0.95 }
  ];

  for (const station of stations) {
    const mat = box(2.7, 0.08, 1.35, 0x2aa6a5, station.x, 0.08, station.z);
    mat.rotation.y = station.rotation;
    mat.receiveShadow = true;
    group.add(mat);
  }

  const bars = new THREE.Group();
  const leftPost = cylinder(0.08, 0.08, 2.4, 0x34445a, 8);
  leftPost.position.set(-14.2, 1.18, 6.3);
  const rightPost = leftPost.clone();
  rightPost.position.x = -12.8;
  const crossBar = cylinder(0.07, 0.07, 1.5, 0x34445a, 8);
  crossBar.rotation.z = Math.PI / 2;
  crossBar.position.set(-13.5, 2.36, 6.3);
  bars.add(leftPost, rightPost, crossBar);
  group.add(markShadows(bars));

  for (let i = 0; i < 7; i += 1) {
    const angle = (i / 7) * Math.PI * 2 + 0.3;
    const tree = new THREE.Group();
    const trunk = cylinder(0.15, 0.2, 1.1, 0x8d6644, 5);
    trunk.position.y = 0.55;
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.88, 0), standardMaterial(0x358f62));
    crown.position.y = 1.45;
    tree.add(trunk, crown);
    tree.position.set(Math.cos(angle) * 16.5, 0, Math.sin(angle) * 16.5);
    tree.rotation.y = angle;
    group.add(markShadows(tree));
  }

  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2 + 0.8;
    const bell = new THREE.Group();
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), standardMaterial(0x59667a));
    body.scale.set(1, 0.82, 1);
    body.position.y = 0.34;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 6, 8, Math.PI), standardMaterial(0x34445a));
    handle.position.y = 0.67;
    handle.rotation.z = Math.PI;
    bell.add(body, handle);
    bell.position.set(Math.cos(angle) * 5.6, 0, Math.sin(angle) * 5.6);
    group.add(markShadows(bell));
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
