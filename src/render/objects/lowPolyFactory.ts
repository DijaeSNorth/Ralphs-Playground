import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  RingGeometry,
  TorusGeometry
} from 'three';
import {
  DEFAULT_PLAYER_APPEARANCE,
  getHairOption,
  getSkinToneOption
} from '../../game/content/playerAppearance';
import type {
  BossDefinition,
  BuddyDefinition,
  MuscleBuild,
  PlayerAppearance,
  VendingMachine,
  WorkoutStation
} from '../../game/types';

const standardMaterialCache = new Map<string, MeshStandardMaterial>();
const basicMaterialCache = new Map<string, MeshBasicMaterial>();

function standardMaterial(color: number, roughness = 0.78): MeshStandardMaterial {
  const key = `${color}:${roughness}`;
  const cached = standardMaterialCache.get(key);

  if (cached) {
    return cached;
  }

  const material = new MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.02,
    flatShading: true
  });
  standardMaterialCache.set(key, material);
  return material;
}

function basicMaterial(color: number, opacity = 1): MeshBasicMaterial {
  const key = `${color}:${opacity}`;
  const cached = basicMaterialCache.get(key);

  if (cached) {
    return cached;
  }

  const material = new MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1
  });
  basicMaterialCache.set(key, material);
  return material;
}

function box(
  width: number,
  height: number,
  depth: number,
  color: number,
  x = 0,
  y = 0,
  z = 0
): Mesh {
  const mesh = new Mesh(new BoxGeometry(width, height, depth), standardMaterial(color));
  mesh.position.set(x, y, z);
  return mesh;
}

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  color: number,
  radialSegments = 6
): Mesh {
  return new Mesh(
    new CylinderGeometry(radiusTop, radiusBottom, height, radialSegments),
    standardMaterial(color)
  );
}

function markShadows(object: Object3D): Object3D {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return object;
}

export function createArena(radius: number): Group {
  const group = new Group();

  const gymFloor = box(44, 0.18, 44, 0xc99458, 0, -0.12, 0);
  gymFloor.receiveShadow = true;
  group.add(gymFloor);

  const rubberZone = new Mesh(
    new CylinderGeometry(radius, radius, 0.08, 12),
    standardMaterial(0x516a72, 0.9)
  );
  rubberZone.position.y = 0.02;
  rubberZone.receiveShadow = true;
  group.add(rubberZone);

  const centerCourt = new Mesh(
    new CylinderGeometry(7.2, 7.2, 0.09, 10),
    standardMaterial(0x5dd29a, 0.88)
  );
  centerCourt.position.y = 0.08;
  centerCourt.receiveShadow = true;
  group.add(centerCourt);

  const trainingLoop = new Mesh(
    new RingGeometry(9.1, 11.2, 64),
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
  const backWall = new Mesh(new BoxGeometry(44, 5.8, 0.34), wallMaterial);
  backWall.position.set(0, 2.78, -22);
  backWall.receiveShadow = true;
  const leftWall = new Mesh(new BoxGeometry(0.34, 4.7, 44), wallMaterial);
  leftWall.position.set(-22, 2.25, 0);
  leftWall.receiveShadow = true;
  const rightWall = leftWall.clone();
  rightWall.position.x = 22;
  group.add(backWall, leftWall, rightWall);

  const mirrorPanelMaterial = new MeshStandardMaterial({
    color: 0xbfdce2,
    roughness: 0.25,
    metalness: 0.28,
    flatShading: true
  });

  for (let i = 0; i < 7; i += 1) {
    const mirror = new Mesh(new BoxGeometry(4.8, 2.15, 0.06), mirrorPanelMaterial);
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

export function createGymProps(): Group {
  const group = new Group();
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

  const rig = new Group();
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
    const rack = new Group();
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
    const bell = new Group();
    const body = new Mesh(new IcosahedronGeometry(0.35, 0), standardMaterial(0x59667a));
    body.scale.set(1, 0.82, 1);
    body.position.y = 0.34;
    const handle = new Mesh(new TorusGeometry(0.24, 0.045, 6, 8, Math.PI), standardMaterial(0x34445a));
    handle.position.y = 0.67;
    handle.rotation.z = Math.PI;
    bell.add(body, handle);
    bell.position.set(Math.cos(angle) * 6.1, 0, Math.sin(angle) * 6.1);
    group.add(markShadows(bell));
  }

  for (let i = 0; i < 4; i += 1) {
    const machine = new Group();
    const base = box(1.55, 0.12, 1.15, 0x303b4d, 0, 0.12, 0);
    const back = box(0.28, 1.65, 0.18, 0x34445a, -0.52, 0.94, -0.25);
    const pad = box(0.48, 0.82, 0.16, 0x1b2f43, -0.26, 0.74, 0.18);
    pad.rotation.x = -0.28;
    const lever = cylinder(0.045, 0.045, 1.15, 0xf9f7ef, 8);
    lever.rotation.z = Math.PI / 2;
    lever.position.set(0.33, 1.18, 0.14);
    const stack = new Group();

    for (let plate = 0; plate < 5; plate += 1) {
      stack.add(box(0.34, 0.06, 0.42, 0x59667a, 0.62, 0.36 + plate * 0.075, -0.3));
    }

    machine.add(base, back, pad, lever, stack);
    machine.position.set(-18.2 + i * 2.2, 0, -17.4);
    machine.rotation.y = 0.1;
    group.add(markShadows(machine));
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

function addStationMarker(group: Group, station: WorkoutStation, color = 0xf6c85f): void {
  const marker = new Mesh(
    new RingGeometry(1.15, 1.3, 24),
    basicMaterial(color, 0.5)
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(station.position.x, 0.2, station.position.z);
  group.add(marker);
}

function getStationRotation(station: WorkoutStation, fallback: number): number {
  return station.rotation ?? fallback;
}

function createBenchStation(station: WorkoutStation): Group {
  const group = new Group();
  const platform = box(3.4, 0.1, 2.1, 0x8b6542, 0, 0.12, 0);
  const pad = box(1.75, 0.16, 0.52, 0x1b2f43, -0.2, 0.48, 0);
  pad.rotation.z = -0.12;
  const postA = cylinder(0.07, 0.07, 1.75, 0x34445a, 8);
  postA.position.set(0.7, 1.02, -0.55);
  const postB = postA.clone();
  postB.position.z = 0.55;
  const bar = cylinder(0.04, 0.04, 1.8, 0xf9f7ef, 8);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(0.7, 1.88, 0);
  const plateA = cylinder(0.22, 0.22, 0.12, 0x303b4d, 10);
  plateA.rotation.x = Math.PI / 2;
  plateA.position.set(0.7, 1.88, -1.02);
  const plateB = plateA.clone();
  plateB.position.z = 1.02;
  group.add(platform, pad, postA, postB, bar, plateA, plateB);
  group.position.set(station.position.x, 0, station.position.z);
  group.rotation.y = getStationRotation(station, -0.7);
  return markShadows(group) as Group;
}

function createInclineBenchStation(station: WorkoutStation): Group {
  const group = new Group();
  const base = box(3.2, 0.1, 2.0, 0x8b6542, 0, 0.12, 0);
  const seat = box(0.75, 0.15, 0.58, 0x1b2f43, -0.72, 0.46, 0);
  const backPad = box(1.25, 0.16, 0.58, 0x1b2f43, 0.0, 0.82, 0);
  backPad.rotation.z = -0.55;
  const uprightA = cylinder(0.07, 0.07, 1.95, 0x34445a, 8);
  uprightA.position.set(0.82, 1.1, -0.58);
  const uprightB = uprightA.clone();
  uprightB.position.z = 0.58;
  const bar = cylinder(0.04, 0.04, 1.9, 0xf9f7ef, 8);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(0.82, 2.06, 0);
  const plateA = cylinder(0.2, 0.2, 0.12, 0x59667a, 10);
  plateA.rotation.x = Math.PI / 2;
  plateA.position.set(0.82, 2.06, -1.05);
  const plateB = plateA.clone();
  plateB.position.z = 1.05;
  group.add(base, seat, backPad, uprightA, uprightB, bar, plateA, plateB);
  group.position.set(station.position.x, 0, station.position.z);
  group.rotation.y = getStationRotation(station, 0.75);
  return markShadows(group) as Group;
}

function createSquatRackStation(station: WorkoutStation): Group {
  const group = new Group();
  const platform = box(3.4, 0.12, 2.6, 0x516a72, 0, 0.12, 0);
  const postA = cylinder(0.08, 0.08, 2.65, 0x34445a, 8);
  postA.position.set(-0.82, 1.42, -0.74);
  const postB = postA.clone();
  postB.position.z = 0.74;
  const postC = postA.clone();
  postC.position.x = 0.82;
  const postD = postB.clone();
  postD.position.x = 0.82;
  const topA = cylinder(0.055, 0.055, 1.68, 0x34445a, 8);
  topA.rotation.x = Math.PI / 2;
  topA.position.set(-0.82, 2.72, 0);
  const topB = topA.clone();
  topB.position.x = 0.82;
  const safetyA = box(1.88, 0.07, 0.1, 0xf6c85f, 0, 1.22, -0.74);
  const safetyB = safetyA.clone();
  safetyB.position.z = 0.74;
  const bar = cylinder(0.04, 0.04, 2.35, 0xf9f7ef, 8);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(0, 2.08, 0);
  const plateA = cylinder(0.24, 0.24, 0.16, 0x303b4d, 10);
  plateA.rotation.x = Math.PI / 2;
  plateA.position.set(0, 2.08, -1.28);
  const plateB = plateA.clone();
  plateB.position.z = 1.28;
  group.add(platform, postA, postB, postC, postD, topA, topB, safetyA, safetyB, bar, plateA, plateB);
  group.position.set(station.position.x, 0, station.position.z);
  group.rotation.y = getStationRotation(station, 0.25);
  return markShadows(group) as Group;
}

function createLegPressStation(station: WorkoutStation): Group {
  const group = new Group();
  const base = box(3.0, 0.14, 1.85, 0x303b4d, 0, 0.14, 0);
  const seat = box(0.82, 0.2, 0.74, 0x1b2f43, -0.78, 0.58, 0);
  seat.rotation.z = 0.18;
  const backPad = box(0.76, 0.18, 0.74, 0x1b2f43, -1.08, 0.94, 0);
  backPad.rotation.z = 0.72;
  const railA = cylinder(0.05, 0.05, 2.2, 0x34445a, 8);
  railA.rotation.z = -0.72;
  railA.position.set(0.22, 0.98, -0.42);
  const railB = railA.clone();
  railB.position.z = 0.42;
  const sled = box(0.72, 0.12, 1.15, 0xff705c, 0.78, 1.44, 0);
  sled.rotation.z = -0.72;
  const footPlate = box(0.18, 0.82, 1.18, 0xf9f7ef, 1.12, 1.68, 0);
  footPlate.rotation.z = -0.72;
  const plateA = cylinder(0.22, 0.22, 0.14, 0x59667a, 10);
  plateA.rotation.x = Math.PI / 2;
  plateA.position.set(1.0, 1.46, -0.82);
  const plateB = plateA.clone();
  plateB.position.z = 0.82;
  group.add(base, seat, backPad, railA, railB, sled, footPlate, plateA, plateB);
  group.position.set(station.position.x, 0, station.position.z);
  group.rotation.y = getStationRotation(station, -0.45);
  return markShadows(group) as Group;
}

function createCableTowerStation(station: WorkoutStation): Group {
  const group = new Group();
  const base = box(2.4, 0.16, 1.4, 0x303b4d, 0, 0.14, 0);
  const towerA = box(0.18, 3.1, 0.18, 0x34445a, -0.75, 1.65, 0);
  const towerB = towerA.clone();
  towerB.position.x = 0.75;
  const top = box(1.75, 0.18, 0.2, 0x34445a, 0, 3.08, 0);
  const stack = new Group();
  for (let i = 0; i < 6; i += 1) {
    stack.add(box(0.52, 0.08, 0.52, 0x59667a, 0, 0.45 + i * 0.1, -0.38));
  }
  const pulleyA = new Mesh(new TorusGeometry(0.16, 0.025, 6, 12), standardMaterial(0xf6c85f));
  pulleyA.position.set(-0.75, 2.85, 0.15);
  const pulleyB = pulleyA.clone();
  pulleyB.position.x = 0.75;
  const handleA = box(0.08, 0.42, 0.08, 0xff705c, -0.9, 1.45, 0.36);
  const handleB = handleA.clone();
  handleB.position.x = 0.9;
  group.add(base, towerA, towerB, top, stack, pulleyA, pulleyB, handleA, handleB);
  group.position.set(station.position.x, 0, station.position.z);
  group.rotation.y = getStationRotation(station, 0.6);
  return markShadows(group) as Group;
}

function createFreeWeightsStation(station: WorkoutStation): Group {
  const group = new Group();
  const rackBack = box(3.0, 1.25, 0.18, 0x34445a, 0, 0.86, -0.45);
  const rackShelfA = box(3.2, 0.12, 0.42, 0x303b4d, 0, 0.64, -0.12);
  const rackShelfB = rackShelfA.clone();
  rackShelfB.position.y = 1.08;
  group.add(rackBack, rackShelfA, rackShelfB);

  for (let i = 0; i < 6; i += 1) {
    const x = -1.25 + i * 0.5;
    const dumbbell = new Group();
    const grip = cylinder(0.035, 0.035, 0.32, 0xf9f7ef, 8);
    grip.rotation.z = Math.PI / 2;
    const headA = cylinder(0.1 + i * 0.012, 0.1 + i * 0.012, 0.08, 0x59667a, 6);
    headA.rotation.z = Math.PI / 2;
    headA.position.x = -0.22;
    const headB = headA.clone();
    headB.position.x = 0.22;
    dumbbell.add(grip, headA, headB);
    dumbbell.position.set(x, i % 2 === 0 ? 1.17 : 0.72, -0.04);
    dumbbell.rotation.y = 0.2;
    group.add(dumbbell);
  }

  for (let i = 0; i < 4; i += 1) {
    const bell = new Group();
    const body = new Mesh(new IcosahedronGeometry(0.24 + i * 0.03, 0), standardMaterial(0x2f3d4c));
    body.scale.set(1, 0.86, 1);
    body.position.y = 0.28;
    const handle = new Mesh(new TorusGeometry(0.18, 0.035, 6, 8, Math.PI), standardMaterial(0xf6c85f));
    handle.position.y = 0.56;
    handle.rotation.z = Math.PI;
    bell.add(body, handle);
    bell.position.set(-1.15 + i * 0.75, 0, 0.8);
    group.add(bell);
  }

  const plateTree = new Group();
  const post = cylinder(0.06, 0.06, 1.4, 0x34445a, 8);
  post.position.y = 0.72;
  plateTree.add(post);
  for (let i = 0; i < 5; i += 1) {
    const plate = new Mesh(new TorusGeometry(0.2 + i * 0.02, 0.035, 6, 12), standardMaterial(0x59667a));
    plate.position.set(0, 0.22 + i * 0.18, 0);
    plate.rotation.x = Math.PI / 2;
    plateTree.add(plate);
  }
  plateTree.position.set(1.55, 0, 0.72);
  group.add(plateTree);

  group.position.set(station.position.x, 0, station.position.z);
  group.rotation.y = getStationRotation(station, 0.45);
  return markShadows(group) as Group;
}

function createMachinePressStation(station: WorkoutStation): Group {
  const group = new Group();
  const shoulderPress = station.id.includes('shoulder');
  const base = box(2.35, 0.16, 1.65, 0x303b4d, 0, 0.14, 0);
  const seat = box(0.68, 0.18, 0.68, 0x1b2f43, -0.62, 0.52, 0);
  const backPad = box(0.34, 1.05, 0.7, 0x1b2f43, -0.95, 1.1, 0);
  backPad.rotation.z = shoulderPress ? -0.18 : 0.18;
  const tower = box(0.22, 2.2, 0.24, 0x34445a, 0.62, 1.18, 0);
  const braceA = cylinder(0.045, 0.045, 1.42, 0xf9f7ef, 8);
  braceA.rotation.x = Math.PI / 2;
  braceA.position.set(0.48, shoulderPress ? 1.94 : 1.43, 0);
  const armA = cylinder(0.05, 0.05, 1.08, 0xf6c85f, 8);
  armA.rotation.z = shoulderPress ? -0.92 : Math.PI / 2;
  armA.position.set(0.15, shoulderPress ? 1.9 : 1.32, -0.46);
  const armB = armA.clone();
  armB.position.z = 0.46;
  const handleA = box(0.12, 0.38, 0.08, 0xff705c, -0.38, shoulderPress ? 2.22 : 1.31, -0.58);
  const handleB = handleA.clone();
  handleB.position.z = 0.58;
  const plateA = cylinder(0.23, 0.23, 0.13, 0x59667a, 10);
  plateA.rotation.x = Math.PI / 2;
  plateA.position.set(0.82, shoulderPress ? 1.98 : 1.42, -0.86);
  const plateB = plateA.clone();
  plateB.position.z = 0.86;
  const foot = box(0.7, 0.08, 0.9, 0x59667a, -1.03, 0.23, 0);
  group.add(base, seat, backPad, tower, braceA, armA, armB, handleA, handleB, plateA, plateB, foot);
  group.position.set(station.position.x, 0, station.position.z);
  group.rotation.y = getStationRotation(station, -1.1);
  return markShadows(group) as Group;
}

function createLatPulldownStation(station: WorkoutStation): Group {
  const group = new Group();
  const rowVariant = station.id.includes('row');
  const base = box(2.45, 0.16, 1.55, 0x303b4d, 0, 0.14, 0);
  const towerA = box(0.2, 3.0, 0.2, 0x34445a, 0.72, 1.58, -0.5);
  const towerB = towerA.clone();
  towerB.position.z = 0.5;
  const top = box(0.28, 0.18, 1.35, 0x34445a, 0.72, 3.03, 0);
  const seat = box(0.8, 0.16, 0.66, 0x1b2f43, -0.48, 0.52, 0);
  const kneePad = box(0.72, 0.16, 0.78, 0xff705c, -0.2, 0.92, 0);
  const footPlate = box(0.18, 0.58, 1.0, 0xf9f7ef, -0.98, 0.52, 0);
  footPlate.rotation.z = rowVariant ? -0.42 : 0;
  const stack = new Group();
  for (let i = 0; i < 7; i += 1) {
    stack.add(box(0.46, 0.075, 0.54, 0x59667a, 0.76, 0.36 + i * 0.09, 0));
  }
  const pulley = new Mesh(new TorusGeometry(0.15, 0.025, 6, 12), standardMaterial(0xf6c85f));
  pulley.position.set(0.72, rowVariant ? 1.05 : 2.82, 0);
  const cable = cylinder(0.018, 0.018, rowVariant ? 1.15 : 2.0, 0x172436, 6);
  cable.position.set(rowVariant ? -0.14 : 0.1, rowVariant ? 0.88 : 1.9, 0);
  cable.rotation.z = rowVariant ? Math.PI / 2 : 0;
  const bar = cylinder(0.035, 0.035, rowVariant ? 0.72 : 1.42, 0xf9f7ef, 8);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(rowVariant ? -0.8 : -0.05, rowVariant ? 0.84 : 2.38, 0);
  group.add(base, towerA, towerB, top, seat, kneePad, footPlate, stack, pulley, cable, bar);
  group.position.set(station.position.x, 0, station.position.z);
  group.rotation.y = getStationRotation(station, 0);
  return markShadows(group) as Group;
}

function createHackSquatStation(station: WorkoutStation): Group {
  const group = new Group();
  const base = box(2.65, 0.16, 1.9, 0x303b4d, 0, 0.14, 0);
  const footPlate = box(0.88, 0.16, 1.35, 0xf9f7ef, -0.82, 0.45, 0);
  footPlate.rotation.z = -0.62;
  const railA = cylinder(0.055, 0.055, 2.6, 0x34445a, 8);
  railA.rotation.z = -0.55;
  railA.position.set(0.18, 1.38, -0.55);
  const railB = railA.clone();
  railB.position.z = 0.55;
  const sled = box(0.92, 0.2, 1.12, 0xff705c, 0.45, 1.55, 0);
  sled.rotation.z = -0.55;
  const padA = box(0.34, 0.24, 0.34, 0x1b2f43, 0.18, 1.82, -0.32);
  const padB = padA.clone();
  padB.position.z = 0.32;
  const plateA = cylinder(0.24, 0.24, 0.14, 0x59667a, 10);
  plateA.rotation.x = Math.PI / 2;
  plateA.position.set(0.72, 1.42, -0.88);
  const plateB = plateA.clone();
  plateB.position.z = 0.88;
  const topBrace = cylinder(0.04, 0.04, 1.3, 0xf6c85f, 8);
  topBrace.rotation.x = Math.PI / 2;
  topBrace.position.set(0.9, 2.35, 0);
  group.add(base, footPlate, railA, railB, sled, padA, padB, plateA, plateB, topBrace);
  group.position.set(station.position.x, 0, station.position.z);
  group.rotation.y = getStationRotation(station, 0.65);
  return markShadows(group) as Group;
}

function createFreeWeightBenchStation(station: WorkoutStation): Group {
  const group = new Group();
  const mat = box(2.75, 0.08, 1.75, 0x516a72, 0, 0.11, 0);
  const foot = box(0.18, 0.42, 0.16, 0x34445a, -0.7, 0.34, 0);
  const footB = foot.clone();
  footB.position.x = 0.62;
  const seat = box(0.72, 0.16, 0.5, 0x1b2f43, -0.58, 0.58, 0);
  const back = box(1.18, 0.16, 0.5, 0x1b2f43, 0.16, 0.78, 0);
  back.rotation.z = -0.35;
  const rack = box(1.35, 0.12, 0.3, 0x303b4d, 0.2, 0.62, -0.65);
  for (let i = 0; i < 4; i += 1) {
    const dumbbell = new Group();
    const grip = cylinder(0.03, 0.03, 0.28, 0xf9f7ef, 8);
    grip.rotation.z = Math.PI / 2;
    const headA = cylinder(0.09 + i * 0.014, 0.09 + i * 0.014, 0.07, 0x59667a, 6);
    headA.rotation.z = Math.PI / 2;
    headA.position.x = -0.19;
    const headB = headA.clone();
    headB.position.x = 0.19;
    dumbbell.add(grip, headA, headB);
    dumbbell.position.set(-0.48 + i * 0.32, 0.78, -0.66);
    group.add(dumbbell);
  }
  const floorBellA = cylinder(0.11, 0.11, 0.32, 0x59667a, 6);
  floorBellA.rotation.z = Math.PI / 2;
  floorBellA.position.set(-0.82, 0.26, 0.62);
  const floorBellB = floorBellA.clone();
  floorBellB.position.x = 0.82;
  group.add(mat, foot, footB, seat, back, rack, floorBellA, floorBellB);
  group.position.set(station.position.x, 0, station.position.z);
  group.rotation.y = getStationRotation(station, 0.5);
  return markShadows(group) as Group;
}

export function createWorkoutEquipment(stations: WorkoutStation[]): Group {
  const group = new Group();

  for (const station of stations) {
    const stationGroup = new Group();
    stationGroup.userData.cullCenter = station.position;
    stationGroup.userData.renderDistance = 25;
    addStationMarker(stationGroup, station);

    if (station.type === 'bench') {
      stationGroup.add(createBenchStation(station));
    }

    if (station.type === 'incline-bench') {
      stationGroup.add(createInclineBenchStation(station));
    }

    if (station.type === 'squat-rack') {
      stationGroup.add(createSquatRackStation(station));
    }

    if (station.type === 'leg-press') {
      stationGroup.add(createLegPressStation(station));
    }

    if (station.type === 'cable') {
      stationGroup.add(createCableTowerStation(station));
    }

    if (station.type === 'free-weights') {
      stationGroup.add(createFreeWeightsStation(station));
    }

    if (station.type === 'machine-press') {
      stationGroup.add(createMachinePressStation(station));
    }

    if (station.type === 'lat-pulldown') {
      stationGroup.add(createLatPulldownStation(station));
    }

    if (station.type === 'hack-squat') {
      stationGroup.add(createHackSquatStation(station));
    }

    if (station.type === 'free-weight-bench') {
      stationGroup.add(createFreeWeightBenchStation(station));
    }

    group.add(stationGroup);
  }

  return group;
}

function createVendingMachine(machine: VendingMachine): Group {
  const group = new Group();
  group.userData.cullCenter = machine.position;
  group.userData.renderDistance = 25;
  group.position.set(machine.position.x, 0, machine.position.z);
  group.rotation.y = -Math.PI / 2;

  const marker = new Mesh(new RingGeometry(1.12, 1.3, 24), basicMaterial(0x21a7a5, 0.48));
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.2;

  const base = box(1.24, 2.3, 0.72, 0x263649, 0, 1.16, 0);
  const topSign = box(1.14, 0.28, 0.78, 0xff705c, 0, 2.28, 0);
  const sideGlow = box(0.12, 1.8, 0.08, 0xf6c85f, -0.52, 1.16, -0.4);
  const screen = box(0.72, 1.22, 0.06, 0x9ddfe8, -0.17, 1.36, -0.39);
  const snackDoor = box(0.74, 0.28, 0.08, 0x172436, -0.17, 0.5, -0.41);
  const payPanel = box(0.22, 0.84, 0.08, 0xf9f7ef, 0.45, 1.35, -0.41);
  const slot = box(0.14, 0.05, 0.03, 0x172436, 0.45, 1.66, -0.46);
  const buttonA = cylinder(0.045, 0.045, 0.04, 0x49b779, 8);
  buttonA.rotation.x = Math.PI / 2;
  buttonA.position.set(0.45, 1.38, -0.47);
  const buttonB = buttonA.clone();
  buttonB.material = standardMaterial(0xff705c);
  buttonB.position.y = 1.18;

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const can = cylinder(0.055, 0.055, 0.22, col % 2 === 0 ? 0x21a7a5 : 0xf6c85f, 6);
      can.rotation.z = Math.PI / 2;
      can.position.set(-0.42 + col * 0.22, 1.7 - row * 0.3, -0.45);
      group.add(can);
    }
  }

  for (let col = 0; col < 3; col += 1) {
    const bar = box(0.16, 0.08, 0.06, col === 1 ? 0xff705c : 0x49b779, -0.4 + col * 0.23, 0.83, -0.45);
    group.add(bar);
  }

  group.add(marker, base, topSign, sideGlow, screen, snackDoor, payPanel, slot, buttonA, buttonB);
  return markShadows(group) as Group;
}

export function createVendingMachines(machines: VendingMachine[]): Group {
  const group = new Group();

  for (const machine of machines) {
    group.add(createVendingMachine(machine));
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

const FRAME_SPECS: Record<
  PlayerAppearance['frame'],
  {
    shoulderSpread: number;
    hipSpread: number;
    torsoTopScale: number;
    torsoBottomScale: number;
    torsoDepth: number;
    legSpread: number;
    heightScale: number;
  }
> = {
  balanced: {
    shoulderSpread: 1,
    hipSpread: 1,
    torsoTopScale: 1,
    torsoBottomScale: 1,
    torsoDepth: 1,
    legSpread: 1,
    heightScale: 1
  },
  tapered: {
    shoulderSpread: 1.16,
    hipSpread: 0.92,
    torsoTopScale: 1.12,
    torsoBottomScale: 0.94,
    torsoDepth: 1.02,
    legSpread: 0.96,
    heightScale: 1.02
  },
  curved: {
    shoulderSpread: 0.96,
    hipSpread: 1.16,
    torsoTopScale: 0.96,
    torsoBottomScale: 1.18,
    torsoDepth: 1.08,
    legSpread: 1.08,
    heightScale: 1
  },
  compact: {
    shoulderSpread: 1.08,
    hipSpread: 1.08,
    torsoTopScale: 1.08,
    torsoBottomScale: 1.1,
    torsoDepth: 1.12,
    legSpread: 1.02,
    heightScale: 0.94
  }
};

function createFlatHex(radius: number, color: number): Mesh {
  const mesh = new Mesh(
    new CylinderGeometry(radius, radius, 0.035, 6),
    standardMaterial(color)
  );
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function createFacetMuscle(
  radius: number,
  color: number,
  x: number,
  y: number,
  z: number,
  scaleX = 1,
  scaleY = 1,
  scaleZ = 1
): Mesh {
  const mesh = new Mesh(new IcosahedronGeometry(radius, 0), standardMaterial(color));
  mesh.position.set(x, y, z);
  mesh.scale.set(scaleX, scaleY, scaleZ);
  return mesh;
}

function getBodySize(appearance: PlayerAppearance): PlayerAppearance['body'] {
  return {
    ...DEFAULT_PLAYER_APPEARANCE.body,
    ...(appearance.body ?? {})
  };
}

function addHairOrb(
  group: Group,
  material: MeshStandardMaterial,
  x: number,
  y: number,
  z: number,
  radius: number,
  scaleX = 1,
  scaleY = 1,
  scaleZ = 1
): void {
  const orb = new Mesh(new IcosahedronGeometry(radius, 0), material);
  orb.position.set(x, y, z);
  orb.scale.set(scaleX, scaleY, scaleZ);
  group.add(orb);
}

function addHairLock(
  group: Group,
  color: number,
  x: number,
  y: number,
  z: number,
  length: number,
  radius = 0.035,
  tilt = 0
): void {
  const lock = cylinder(radius, radius * 1.08, length, color, 6);
  lock.position.set(x, y, z);
  lock.rotation.z = tilt;
  group.add(lock);
}

function addPlayerHair(group: Group, appearance: PlayerAppearance): void {
  const hair = getHairOption(appearance.hair);
  const hairMaterial = standardMaterial(hair.color);

  if (appearance.hair === 'crop') {
    const cap = new Mesh(new IcosahedronGeometry(0.27, 0), hairMaterial);
    cap.scale.set(1.05, 0.45, 0.9);
    cap.position.set(0, 1.34, -0.02);
    const front = box(0.34, 0.07, 0.18, hair.color, 0, 1.33, 0.19);
    group.add(cap, front);
    return;
  }

  if (appearance.hair === 'afro') {
    addHairOrb(group, hairMaterial, 0, 1.38, -0.01, 0.31, 1.18, 0.98, 1.08);
    const afroPoints = [
      [-0.24, 1.35, 0.02],
      [0.24, 1.35, 0.02],
      [-0.14, 1.52, -0.02],
      [0.14, 1.52, -0.02],
      [0, 1.46, -0.2],
      [-0.22, 1.42, -0.17],
      [0.22, 1.42, -0.17]
    ];

    for (const point of afroPoints) {
      addHairOrb(group, hairMaterial, point[0], point[1], point[2], 0.16, 1.05, 0.95, 1.05);
    }

    return;
  }

  if (appearance.hair === 'coils') {
    const cap = new Mesh(new IcosahedronGeometry(0.25, 0), hairMaterial);
    cap.scale.set(1.02, 0.42, 0.88);
    cap.position.set(0, 1.33, -0.02);
    group.add(cap);

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        const x = -0.22 + col * 0.11 + (row % 2) * 0.04;
        const z = -0.02 + row * 0.08;
        addHairOrb(group, hairMaterial, x, 1.4 + row * 0.03, z, 0.055, 1.1, 0.8, 1.1);
      }
    }

    return;
  }

  if (appearance.hair === 'tapered-fade') {
    const fade = new Mesh(new IcosahedronGeometry(0.24, 0), hairMaterial);
    fade.scale.set(1.05, 0.3, 0.84);
    fade.position.set(0, 1.3, -0.02);
    group.add(fade);

    for (let i = 0; i < 5; i += 1) {
      addHairOrb(group, hairMaterial, -0.16 + i * 0.08, 1.42, 0.04, 0.055, 1, 0.9, 1);
    }

    return;
  }

  if (appearance.hair === 'waves') {
    const cap = new Mesh(new IcosahedronGeometry(0.25, 0), hairMaterial);
    cap.scale.set(1.08, 0.32, 0.9);
    cap.position.set(0, 1.31, -0.03);
    group.add(cap);

    for (let i = 0; i < 4; i += 1) {
      const wave = box(0.34, 0.035, 0.035, hair.color, 0, 1.36 + i * 0.035, 0.1 - i * 0.07);
      wave.rotation.z = i % 2 === 0 ? 0.2 : -0.2;
      group.add(wave);
    }

    return;
  }

  if (appearance.hair === 'high-top') {
    const base = new Mesh(new IcosahedronGeometry(0.24, 0), hairMaterial);
    base.scale.set(1.02, 0.34, 0.88);
    base.position.set(0, 1.31, -0.02);
    const top = box(0.48, 0.34, 0.42, hair.color, 0, 1.51, -0.03);
    top.rotation.y = 0.18;
    group.add(base, top);
    return;
  }

  if (appearance.hair === 'bun') {
    const cap = new Mesh(new IcosahedronGeometry(0.25, 0), hairMaterial);
    cap.scale.set(1.0, 0.48, 0.9);
    cap.position.set(0, 1.33, -0.03);
    const bun = new Mesh(new IcosahedronGeometry(0.15, 0), hairMaterial);
    bun.position.set(0, 1.51, -0.18);
    group.add(cap, bun);
    return;
  }

  if (appearance.hair === 'puff') {
    const cap = new Mesh(new IcosahedronGeometry(0.25, 0), hairMaterial);
    cap.scale.set(1.0, 0.42, 0.86);
    cap.position.set(0, 1.31, -0.03);
    addHairOrb(group, hairMaterial, 0, 1.55, -0.1, 0.24, 1.18, 1, 1.08);
    group.add(cap);
    return;
  }

  if (appearance.hair === 'bantu-knots') {
    const cap = new Mesh(new IcosahedronGeometry(0.23, 0), hairMaterial);
    cap.scale.set(1.02, 0.32, 0.86);
    cap.position.set(0, 1.3, -0.03);
    group.add(cap);

    const knots = [
      [-0.22, 1.43, 0.04],
      [0, 1.49, 0.02],
      [0.22, 1.43, 0.04],
      [-0.12, 1.42, -0.18],
      [0.12, 1.42, -0.18]
    ];

    for (const knot of knots) {
      addHairOrb(group, hairMaterial, knot[0], knot[1], knot[2], 0.085, 1, 1.08, 1);
    }

    return;
  }

  if (
    appearance.hair === 'locs' ||
    appearance.hair === 'short-locs' ||
    appearance.hair === 'twists' ||
    appearance.hair === 'box-braids'
  ) {
    const cap = new Mesh(new IcosahedronGeometry(0.25, 0), hairMaterial);
    cap.scale.set(1.05, 0.36, 0.9);
    cap.position.set(0, 1.31, -0.03);
    group.add(cap);
    const long = appearance.hair === 'locs' || appearance.hair === 'box-braids';
    const thick = appearance.hair === 'twists' ? 0.045 : 0.035;
    const length = long ? 0.42 : 0.24;
    const sideXs = [-0.28, -0.18, -0.08, 0.08, 0.18, 0.28];

    for (let i = 0; i < sideXs.length; i += 1) {
      const x = sideXs[i];
      const y = 1.12 - (long ? 0.03 : 0);
      const z = i < 3 ? 0.1 : -0.05;
      addHairLock(group, hair.color, x, y, z, length, thick, x < 0 ? 0.16 : -0.16);
    }

    if (appearance.hair === 'box-braids') {
      for (let i = 0; i < 4; i += 1) {
        addHairLock(group, hair.color, -0.18 + i * 0.12, 1.08, -0.18, 0.38, 0.03, 0);
      }
    }

    return;
  }

  if (appearance.hair === 'cornrows') {
    const cap = new Mesh(new IcosahedronGeometry(0.24, 0), hairMaterial);
    cap.scale.set(1.02, 0.28, 0.86);
    cap.position.set(0, 1.3, -0.03);
    group.add(cap);

    for (let i = 0; i < 6; i += 1) {
      const row = box(0.035, 0.035, 0.46, hair.color, -0.18 + i * 0.072, 1.38, -0.02);
      row.rotation.x = -0.25;
      group.add(row);
    }

    return;
  }

  const sweep = new Group();
  const cap = new Mesh(new IcosahedronGeometry(0.25, 0), hairMaterial);
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
  group: Group,
  appearance: PlayerAppearance,
  skinColor: number,
  shirtAccent: number
): void {
  const build = appearance.muscleBuild;
  const spec = MUSCLE_SPECS[build];
  const frame = FRAME_SPECS[appearance.frame];
  const sizing = getBodySize(appearance);
  const shoulderScale = sizing.shoulders * frame.shoulderSpread;
  const armScale = sizing.arms;
  const legScale = sizing.legs;
  const torsoScale = sizing.torso;
  const hipScale = frame.hipSpread;
  const shoulderOffset = 0.39 * shoulderScale;
  const armOffset = 0.47 * shoulderScale;
  const legOffset = 0.16 * frame.legSpread * hipScale;
  const leftShoulder = new Mesh(new IcosahedronGeometry(spec.shoulder, 0), standardMaterial(skinColor));
  leftShoulder.scale.set(1.2 * sizing.shoulders, 0.72, 0.9);
  leftShoulder.position.set(-shoulderOffset, 0.96, 0.04);
  const rightShoulder = leftShoulder.clone();
  rightShoulder.position.x = shoulderOffset;
  group.add(leftShoulder, rightShoulder);

  const leftBicep = new Mesh(new IcosahedronGeometry(spec.arm * 1.35, 0), standardMaterial(skinColor));
  leftBicep.scale.set(0.9 * armScale, 1.2 * armScale, 0.78 * armScale);
  leftBicep.position.set(-armOffset, 0.72, 0.08);
  const rightBicep = leftBicep.clone();
  rightBicep.position.x = armOffset;
  group.add(leftBicep, rightBicep);

  const leftQuad = new Mesh(new IcosahedronGeometry(spec.leg * 1.25, 0), standardMaterial(0x1b2f43));
  leftQuad.scale.set(0.8 * legScale, 1.25 * legScale, 0.72 * legScale);
  leftQuad.position.set(-legOffset, 0.42, 0.09);
  const rightQuad = leftQuad.clone();
  rightQuad.position.x = legOffset;
  group.add(leftQuad, rightQuad);

  if (build === 'lean') {
    const chestLineA = box(0.08 * torsoScale, 0.025, 0.28, shirtAccent, -0.1 * torsoScale, 0.93, 0.32);
    chestLineA.rotation.z = 0.35;
    const chestLineB = chestLineA.clone();
    chestLineB.position.x = 0.1 * torsoScale;
    chestLineB.rotation.z = -0.35;
    const core = createFlatHex(0.06, shirtAccent);
    core.position.set(0, 0.72, 0.35);
    group.add(chestLineA, chestLineB, core);
    return;
  }

  const pecLeft = box(0.2 * torsoScale, 0.11, 0.08, shirtAccent, -0.12 * torsoScale, 0.9, 0.35);
  pecLeft.rotation.z = 0.12;
  const pecRight = pecLeft.clone();
  pecRight.position.x = 0.12 * torsoScale;
  pecRight.rotation.z = -0.12;
  group.add(pecLeft, pecRight);

  const abRows = build === 'sculpted' ? 3 : 2;

  for (let row = 0; row < abRows; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      const ab = createFlatHex(build === 'sculpted' ? 0.055 : 0.045, 0x5dd29a);
      ab.position.set(col === 0 ? -0.055 * torsoScale : 0.055 * torsoScale, 0.76 - row * 0.075, 0.36);
      ab.scale.set(0.82, 1, 1);
      group.add(ab);
    }
  }

  if (build === 'sculpted') {
    const obliqueLeft = box(0.045, 0.18, 0.05, 0xffc55c, -0.21 * torsoScale * hipScale, 0.73, 0.34);
    obliqueLeft.rotation.z = -0.35;
    const obliqueRight = obliqueLeft.clone();
    obliqueRight.position.x = 0.21 * torsoScale * hipScale;
    obliqueRight.rotation.z = 0.35;
    group.add(obliqueLeft, obliqueRight);
  }
}

export function createPlayerMesh(appearance = DEFAULT_PLAYER_APPEARANCE): Group {
  const group = new Group();
  const skinColor = getSkinToneOption(appearance.skinTone).color;
  const spec = MUSCLE_SPECS[appearance.muscleBuild];
  const frame = FRAME_SPECS[appearance.frame];
  const sizing = getBodySize(appearance);
  const torsoScale = sizing.torso;
  const shoulderScale = sizing.shoulders * frame.shoulderSpread;
  const armScale = sizing.arms;
  const legScale = sizing.legs;
  const hipScale = frame.hipSpread;
  const chest = cylinder(
    spec.torsoTop * frame.torsoTopScale * torsoScale,
    spec.torsoBottom * 0.88 * frame.torsoTopScale * torsoScale,
    0.48,
    0x24445f,
    7
  );
  chest.scale.z = frame.torsoDepth;
  chest.position.y = 0.84;
  const hips = cylinder(
    spec.torsoBottom * 0.72 * frame.torsoBottomScale * torsoScale,
    spec.torsoBottom * frame.torsoBottomScale * torsoScale,
    0.26,
    0x1b2f43,
    7
  );
  hips.scale.z = frame.torsoDepth * 0.95;
  hips.position.y = 0.52;
  const waistGap = box(0.48 * torsoScale * hipScale, 0.04, 0.1, 0xf9f7ef, 0, 0.64, 0.35);
  const head = new Mesh(new IcosahedronGeometry(0.25, 0), standardMaterial(skinColor));
  head.position.y = 1.2;
  const headband = box(0.36, 0.055, 0.3, 0xff705c, 0, 1.29, 0.06);

  const shoulderOffset = 0.38 * shoulderScale;
  const armOffset = 0.45 * shoulderScale;
  const upperArmHeight = 0.3 * armScale;
  const forearmHeight = 0.27 * armScale;
  const leftUpperArm = cylinder(spec.arm * 1.08 * armScale, spec.arm * 0.92 * armScale, upperArmHeight, skinColor, 5);
  leftUpperArm.position.set(-armOffset, 0.78, 0.04);
  leftUpperArm.rotation.z = 0.25;
  const rightUpperArm = leftUpperArm.clone();
  rightUpperArm.position.x = armOffset;
  rightUpperArm.rotation.z = -0.25;
  const leftForearm = cylinder(spec.forearm * 1.02 * armScale, spec.forearm * 0.9 * armScale, forearmHeight, skinColor, 5);
  leftForearm.position.set(-armOffset - 0.04, 0.52, 0.04);
  leftForearm.rotation.z = 0.12;
  const rightForearm = leftForearm.clone();
  rightForearm.position.x = armOffset + 0.04;
  rightForearm.rotation.z = -0.12;
  const leftElbow = createFacetMuscle(spec.forearm * 0.9 * armScale, skinColor, -armOffset - 0.01, 0.64, 0.04, 1, 0.78, 1);
  const rightElbow = leftElbow.clone();
  rightElbow.position.x = armOffset + 0.01;
  const leftHand = createFacetMuscle(0.07 * armScale, skinColor, -armOffset - 0.06, 0.35, 0.05, 0.9, 0.82, 0.9);
  const rightHand = leftHand.clone();
  rightHand.position.x = armOffset + 0.06;

  const legOffset = 0.15 * frame.legSpread * hipScale;
  const thighHeight = 0.29 * legScale;
  const calfHeight = 0.25 * legScale;
  const leftThigh = cylinder(spec.leg * 1.08 * legScale, spec.leg * 0.95 * legScale, thighHeight, 0x1b2f43, 5);
  leftThigh.position.set(-legOffset, 0.36, 0.02);
  const rightThigh = leftThigh.clone();
  rightThigh.position.x = legOffset;
  const leftKnee = createFacetMuscle(spec.leg * 0.82 * legScale, 0xf9f7ef, -legOffset, 0.22, 0.05, 1, 0.6, 0.8);
  const rightKnee = leftKnee.clone();
  rightKnee.position.x = legOffset;
  const leftCalf = cylinder(spec.leg * 0.82 * legScale, spec.leg * 0.76 * legScale, calfHeight, 0x1b2f43, 5);
  leftCalf.position.set(-legOffset, 0.12, 0.01);
  const rightCalf = leftCalf.clone();
  rightCalf.position.x = legOffset;
  const leftFoot = box(0.18 * legScale, 0.08, 0.3 * legScale, 0x172436, -legOffset, 0.02, 0.1);
  const rightFoot = leftFoot.clone();
  rightFoot.position.x = legOffset;

  group.add(
    chest,
    hips,
    waistGap,
    head,
    headband,
    leftUpperArm,
    rightUpperArm,
    leftForearm,
    rightForearm,
    leftElbow,
    rightElbow,
    leftHand,
    rightHand,
    leftThigh,
    rightThigh,
    leftKnee,
    rightKnee,
    leftCalf,
    rightCalf,
    leftFoot,
    rightFoot
  );
  const shoulderBridge = box(0.5 * shoulderScale, 0.08, 0.14, skinColor, 0, 1.0, 0.03);
  const hipBridge = box(0.38 * hipScale * torsoScale, 0.08, 0.12, 0x1b2f43, 0, 0.43, 0.02);
  group.add(shoulderBridge, hipBridge);
  addPlayerHair(group, appearance);
  addPlayerMuscleGeometry(group, appearance, skinColor, 0xff705c);
  group.scale.set(spec.baseScale, spec.baseScale * sizing.height * frame.heightScale, spec.baseScale);
  return markShadows(group) as Group;
}

function addBuddyMuscleFeatures(group: Group, definition: BuddyDefinition): void {
  const accent = definition.accent;
  const deepTone = definition.archetype === 'runner' ? 0x2d4054 : 0x1b2f43;

  const shoulderLeft = createFacetMuscle(0.16, accent, -0.43, 0.91, 0.04, 1.2, 0.72, 0.9);
  const shoulderRight = shoulderLeft.clone();
  shoulderRight.position.x = 0.43;
  const bicepLeft = createFacetMuscle(0.12, accent, -0.5, 0.68, 0.08, 0.9, 1.2, 0.8);
  const bicepRight = bicepLeft.clone();
  bicepRight.position.x = 0.5;
  const forearmLeft = createFacetMuscle(0.095, accent, -0.46, 0.5, 0.08, 0.85, 1.15, 0.75);
  const forearmRight = forearmLeft.clone();
  forearmRight.position.x = 0.46;
  group.add(shoulderLeft, shoulderRight, bicepLeft, bicepRight, forearmLeft, forearmRight);

  const pecLeft = box(0.18, 0.1, 0.08, accent, -0.11, 0.84, 0.41);
  pecLeft.rotation.z = 0.16;
  const pecRight = pecLeft.clone();
  pecRight.position.x = 0.11;
  pecRight.rotation.z = -0.16;
  const trapLeft = box(0.18, 0.08, 0.1, 0xf9f7ef, -0.2, 1.01, 0.31);
  trapLeft.rotation.z = -0.28;
  const trapRight = trapLeft.clone();
  trapRight.position.x = 0.2;
  trapRight.rotation.z = 0.28;
  group.add(pecLeft, pecRight, trapLeft, trapRight);

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      const ab = createFlatHex(0.045, row === 1 ? 0xf9f7ef : accent);
      ab.position.set(col === 0 ? -0.06 : 0.06, 0.72 - row * 0.075, 0.43);
      ab.scale.set(0.82, 1, 1);
      group.add(ab);
    }
  }

  const obliqueLeft = box(0.045, 0.2, 0.06, accent, -0.23, 0.66, 0.39);
  obliqueLeft.rotation.z = -0.38;
  const obliqueRight = obliqueLeft.clone();
  obliqueRight.position.x = 0.23;
  obliqueRight.rotation.z = 0.38;
  const quadLeft = createFacetMuscle(0.12, deepTone, -0.16, 0.32, 0.09, 0.85, 1.32, 0.72);
  const quadRight = quadLeft.clone();
  quadRight.position.x = 0.16;
  const calfLeft = createFacetMuscle(0.085, accent, -0.18, 0.18, 0.08, 0.75, 1.3, 0.7);
  const calfRight = calfLeft.clone();
  calfRight.position.x = 0.18;
  group.add(obliqueLeft, obliqueRight, quadLeft, quadRight, calfLeft, calfRight);

  const leftMark = createFlatHex(0.07, accent);
  leftMark.position.set(-0.1, 0.79, 0.45);
  const rightMark = leftMark.clone();
  rightMark.position.x = 0.1;
  group.add(leftMark, rightMark);

  if (definition.archetype === 'yogi') {
    const coreRing = new Mesh(new TorusGeometry(0.18, 0.022, 5, 14), standardMaterial(accent));
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
    const leftOrb = createFacetMuscle(0.18, accent, -0.52, 0.76, 0.06, 1.2, 0.95, 0.95);
    const rightOrb = leftOrb.clone();
    rightOrb.position.x = 0.5;
    const sternum = box(0.08, 0.28, 0.07, 0xf9f7ef, 0, 0.82, 0.39);
    group.add(leftOrb, rightOrb, sternum);
  }

  if (definition.archetype === 'spinner') {
    const shoulderRingA = new Mesh(new TorusGeometry(0.13, 0.025, 5, 12), standardMaterial(accent));
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

export function createBuddyMesh(definition: BuddyDefinition): Group {
  const group = new Group();
  const body = cylinder(0.4, 0.48, 0.84, definition.color, 7);
  body.position.y = 0.66;
  const head = new Mesh(new IcosahedronGeometry(0.28, 0), standardMaterial(0xffcf9a));
  head.position.y = 1.2;
  const accent = standardMaterial(definition.accent);
  const leftLeg = cylinder(0.1, 0.15, 0.5, 0x1b2f43, 5);
  leftLeg.position.set(-0.16, 0.3, 0);
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.16;
  const leftArm = cylinder(0.11, 0.14, 0.62, definition.accent, 5);
  leftArm.position.set(-0.39, 0.68, 0.02);
  leftArm.rotation.z = 0.26;
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.39;
  rightArm.rotation.z = -0.26;
  const latLeft = box(0.12, 0.34, 0.1, definition.color, -0.35, 0.72, 0.24);
  latLeft.rotation.z = -0.2;
  const latRight = latLeft.clone();
  latRight.position.x = 0.35;
  latRight.rotation.z = 0.2;
  group.add(body, head, leftLeg, rightLeg, leftArm, rightArm, latLeft, latRight);

  if (definition.archetype === 'yogi') {
    const halo = new Mesh(new TorusGeometry(0.32, 0.035, 5, 12), accent);
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
    const wheelA = new Mesh(new TorusGeometry(0.28, 0.04, 6, 12), accent);
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

  return markShadows(group) as Group;
}

function addBossMuscleDefinition(group: Group, definition: BossDefinition): void {
  const accent = definition.accent;
  const skinTone = 0xffc28f;
  const darkMuscle = 0x1b2f43;
  const highlight = 0xf9f7ef;

  const trapLeft = box(0.28, 0.14, 0.12, highlight, -0.24, 1.46, 0.46);
  trapLeft.rotation.z = -0.28;
  const trapRight = trapLeft.clone();
  trapRight.position.x = 0.24;
  trapRight.rotation.z = 0.28;
  const deltLeft = createFacetMuscle(0.25, skinTone, -0.73, 1.25, 0.05, 1.24, 0.8, 0.95);
  const deltRight = deltLeft.clone();
  deltRight.position.x = 0.73;
  const latLeft = box(0.22, 0.58, 0.12, definition.color, -0.52, 1.0, 0.35);
  latLeft.rotation.z = -0.18;
  const latRight = latLeft.clone();
  latRight.position.x = 0.52;
  latRight.rotation.z = 0.18;
  group.add(trapLeft, trapRight, deltLeft, deltRight, latLeft, latRight);

  const bicepLeft = createFacetMuscle(0.2, skinTone, -0.86, 1.0, 0.08, 0.9, 1.28, 0.86);
  const bicepRight = bicepLeft.clone();
  bicepRight.position.x = 0.86;
  const forearmLeft = createFacetMuscle(0.17, skinTone, -0.78, 0.7, 0.08, 0.82, 1.32, 0.76);
  const forearmRight = forearmLeft.clone();
  forearmRight.position.x = 0.78;
  group.add(bicepLeft, bicepRight, forearmLeft, forearmRight);

  const pecLeft = box(0.32, 0.18, 0.1, accent, -0.18, 1.13, 0.58);
  pecLeft.rotation.z = 0.12;
  const pecRight = pecLeft.clone();
  pecRight.position.x = 0.18;
  pecRight.rotation.z = -0.12;
  const lowerChestLeft = box(0.24, 0.08, 0.08, highlight, -0.15, 1.0, 0.6);
  lowerChestLeft.rotation.z = -0.08;
  const lowerChestRight = lowerChestLeft.clone();
  lowerChestRight.position.x = 0.15;
  lowerChestRight.rotation.z = 0.08;
  const sternum = box(0.08, 0.48, 0.08, highlight, 0, 0.98, 0.61);
  group.add(pecLeft, pecRight, lowerChestLeft, lowerChestRight, sternum);

  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      const ab = createFlatHex(row === 0 ? 0.075 : 0.068, row % 2 === 0 ? accent : highlight);
      ab.position.set(col === 0 ? -0.085 : 0.085, 0.9 - row * 0.09, 0.62);
      ab.scale.set(0.85, 1, 1);
      group.add(ab);
    }
  }

  const serratusLeftA = box(0.045, 0.22, 0.06, accent, -0.36, 0.98, 0.56);
  serratusLeftA.rotation.z = -0.45;
  const serratusLeftB = serratusLeftA.clone();
  serratusLeftB.position.y = 0.83;
  serratusLeftB.rotation.z = -0.28;
  const serratusRightA = serratusLeftA.clone();
  serratusRightA.position.x = 0.36;
  serratusRightA.rotation.z = 0.45;
  const serratusRightB = serratusLeftB.clone();
  serratusRightB.position.x = 0.36;
  serratusRightB.rotation.z = 0.28;
  group.add(serratusLeftA, serratusLeftB, serratusRightA, serratusRightB);

  const quadLeft = createFacetMuscle(0.18, darkMuscle, -0.25, 0.42, 0.1, 0.9, 1.45, 0.8);
  const quadRight = quadLeft.clone();
  quadRight.position.x = 0.25;
  const calfLeft = createFacetMuscle(0.13, accent, -0.26, 0.18, 0.08, 0.78, 1.35, 0.7);
  const calfRight = calfLeft.clone();
  calfRight.position.x = 0.26;
  group.add(quadLeft, quadRight, calfLeft, calfRight);

  if (definition.id === 'plate-titan') {
    const plateCore = new Mesh(new TorusGeometry(0.22, 0.035, 6, 14), standardMaterial(highlight));
    plateCore.rotation.x = Math.PI / 2;
    plateCore.position.set(0, 0.79, 0.64);
    group.add(plateCore);
  }

  if (definition.id === 'rep-reaper') {
    const focusCut = createFlatHex(0.11, accent);
    focusCut.position.set(0, 1.2, 0.64);
    focusCut.rotation.z = Math.PI / 4;
    group.add(focusCut);
  }

  if (definition.id === 'bulk-baron') {
    const bulkLeft = createFacetMuscle(0.16, accent, -0.48, 0.78, 0.44, 0.9, 1.4, 0.75);
    const bulkRight = bulkLeft.clone();
    bulkRight.position.x = 0.48;
    group.add(bulkLeft, bulkRight);
  }
}

export function createBossMesh(definition: BossDefinition): Group {
  const group = new Group();
  const body = cylinder(0.68, 0.84, 1.3, definition.color, 7);
  body.position.y = 0.96;
  const head = new Mesh(new IcosahedronGeometry(0.36, 0), standardMaterial(0xffc28f));
  head.position.y = 1.76;
  const belt = box(1.08, 0.14, 0.2, definition.accent, 0, 0.66, 0.57);

  const leftArm = cylinder(0.22, 0.27, 0.96, 0xffc28f, 6);
  leftArm.position.set(-0.82, 1.02, 0);
  leftArm.rotation.z = 0.28;
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.82;
  rightArm.rotation.z = -0.28;

  const leftLeg = cylinder(0.2, 0.28, 0.78, 0x1b2f43, 6);
  leftLeg.position.set(-0.24, 0.38, 0);
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.24;

  const bar = cylinder(0.05, 0.05, 2.35, 0xf9f7ef, 8);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 1.82, 0);
  const plateA = cylinder(0.24, 0.24, 0.16, 0x303b4d, 10);
  plateA.rotation.z = Math.PI / 2;
  plateA.position.set(-1.32, 1.82, 0);
  const plateB = plateA.clone();
  plateB.position.x = 1.32;

  const aura = new Mesh(new RingGeometry(0.95, 1.12, 24), basicMaterial(definition.accent, 0.38));
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.08;

  group.add(body, head, belt, leftArm, rightArm, leftLeg, rightLeg, bar, plateA, plateB, aura);
  addBossMuscleDefinition(group, definition);
  group.scale.setScalar(1.15);
  return markShadows(group) as Group;
}

export function createProteinShakerProjectile(): Group {
  const group = new Group();
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
  return markShadows(group) as Group;
}

export function createFreeWeightMesh(): Group {
  const group = new Group();
  const grip = cylinder(0.045, 0.045, 0.48, 0xf9f7ef, 8);
  grip.rotation.z = Math.PI / 2;
  const headA = cylinder(0.16, 0.16, 0.16, 0x303b4d, 6);
  headA.rotation.z = Math.PI / 2;
  headA.position.x = -0.34;
  const headB = headA.clone();
  headB.position.x = 0.34;
  const rimA = cylinder(0.18, 0.18, 0.055, 0x59667a, 6);
  rimA.rotation.z = Math.PI / 2;
  rimA.position.x = -0.45;
  const rimB = rimA.clone();
  rimB.position.x = 0.45;
  group.add(grip, headA, headB, rimA, rimB);
  return markShadows(group) as Group;
}

export function createCaptureRing(color: number): Mesh {
  const material = new MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });
  const ring = new Mesh(new TorusGeometry(0.45, 0.035, 6, 24), material);
  ring.rotation.x = Math.PI / 2;
  return ring;
}
