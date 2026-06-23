import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  SphereGeometry,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  MeshStandardMaterial,
  Object3D,
  DoubleSide,
  RingGeometry,
  SRGBColorSpace,
  TorusGeometry,
  TextureLoader,
  type Texture
} from 'three';
import {
  DEFAULT_PLAYER_APPEARANCE,
  normalizeHairStyle,
  normalizeMuscleBuild,
  getHairOption,
  getSkinToneOption
} from '../../game/content/playerAppearance';
import {
  getCharacterAssetManifest,
  getCachedCharacterAssetManifest,
  resolveBodyMeshPath,
  resolveHairMeshPath
} from '../../game/content/characterAssetManifest';
import type {
  BossDefinition,
  BuddyDefinition,
  BuddyBodyTraits,
  CharacterSex,
  MuscleBuild,
  PlayerAppearance,
  VendingMachine,
  WorkoutStation
} from '../../game/types';

const standardMaterialCache = new Map<string, MeshStandardMaterial>();
const basicMaterialCache = new Map<string, MeshBasicMaterial>();
const textureLoader = new TextureLoader();
const spritePlaneGeometry = new PlaneGeometry(1, 1);
const spriteTextureStateCache = new Map<
  string,
  { status: 'loading' | 'ready' | 'failed'; texture?: Texture; promise?: Promise<Texture | null> }
>();
const spriteMaterialCache = new Map<string, MeshBasicMaterial>();

type SpriteMaterialColorKey = `${number}`;

function normalizeAssetUrl(url: string): string {
  return url.trim();
}

function requestSpriteTexture(url: string): Promise<Texture | null> {
  const resolvedUrl = normalizeAssetUrl(url);
  const state = spriteTextureStateCache.get(resolvedUrl);

  if (state?.status === 'ready') {
    return Promise.resolve(state.texture ?? null);
  }

  if (state?.status === 'loading' && state.promise) {
    return state.promise;
  }

  const promise = new Promise<Texture | null>((resolve) => {
    textureLoader.load(
      resolvedUrl,
      (texture) => {
        texture.colorSpace = SRGBColorSpace;
        spriteTextureStateCache.set(resolvedUrl, { status: 'ready', texture });
        resolve(texture);
      },
      undefined,
      () => {
        spriteTextureStateCache.set(resolvedUrl, { status: 'failed' });
        resolve(null);
      }
    );
  });

  spriteTextureStateCache.set(resolvedUrl, { status: 'loading', promise });
  return promise;
}

function getSpriteMaterial(url: string, tint: number): MeshBasicMaterial | null {
  const resolvedUrl = normalizeAssetUrl(url);
  const state = spriteTextureStateCache.get(resolvedUrl);

  if (!state || state.status !== 'ready' || !state.texture) {
    return null;
  }

  const materialKey: string = `${resolvedUrl}:${String(tint) as SpriteMaterialColorKey}`;
  const cachedMaterial = spriteMaterialCache.get(materialKey);

  if (cachedMaterial) {
    return cachedMaterial;
  }

  const material = new MeshBasicMaterial({
    map: state.texture,
    color: tint,
    transparent: true,
    alphaTest: 0.01,
    depthWrite: false,
    side: DoubleSide
  });
  spriteMaterialCache.set(materialKey, material);
  return material;
}

function addSpriteOverlay(
  group: Group,
  material: MeshBasicMaterial,
  width: number,
  height: number,
  x: number,
  y: number,
  z: number
): void {
  const sprite = new Mesh(spritePlaneGeometry, material);
  sprite.scale.set(width, height, 1);
  sprite.position.set(x, y, z);
  group.add(sprite);
}

export async function preloadCharacterAssetTextures(): Promise<void> {
  const manifest = getCachedCharacterAssetManifest() ?? (await getCharacterAssetManifest().catch(() => null));

  if (!manifest) {
    return;
  }

  const textureUrls = [
    manifest.bodyMeshes.man.base,
    manifest.bodyMeshes.woman.base,
    ...manifest.hairMeshes.map((entry) => entry.file)
  ];
  await Promise.all(textureUrls.map((url) => requestSpriteTexture(url)));
}

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
  const stageWidth = Math.min(34, Math.max(30, radius * 1.7));
  const stageDepth = Math.min(42, Math.max(36, radius * 2.05));
  const backZ = -stageDepth / 2;
  const frontZ = stageDepth / 2;
  const leftX = -stageWidth / 2;
  const rightX = stageWidth / 2;
  const baseFloor = box(stageWidth, 0.18, stageDepth, 0xf0b45e, 0, -0.12, 0);
  const floorOutline = box(stageWidth + 1.1, 0.1, stageDepth + 1.1, 0x24324a, 0, -0.18, 0);
  group.add(floorOutline, baseFloor);
  const laneSpecs = [
    { z: backZ + 4.8, width: 10.5, depth: 6.1, color: 0x77d7c2, edge: 0x2a6f78 },
    { z: backZ + 11.4, width: 17.8, depth: 5.5, color: 0xf7d56a, edge: 0xaa6b43 },
    { z: backZ + 17.8, width: 12.2, depth: 5.4, color: 0xf37b6c, edge: 0x803c58 },
    { z: frontZ - 8.8, width: 18.8, depth: 7.1, color: 0x70c46b, edge: 0x376b46 },
    { z: frontZ - 2.8, width: 13.2, depth: 4.3, color: 0x8bb7ff, edge: 0x425b9a }
  ];
  for (const lane of laneSpecs) {
    const shadow = box(lane.width + 0.72, 0.06, lane.depth + 0.54, lane.edge, 0.22, 0.02, lane.z + 0.22);
    const panel = box(lane.width, 0.08, lane.depth, lane.color, 0, 0.09, lane.z);
    const centerLine = box(0.16, 0.045, lane.depth - 0.85, 0xfff0a6, 0, 0.16, lane.z);
    const crossLine = box(lane.width - 1.1, 0.045, 0.14, 0xfff0a6, 0, 0.165, lane.z);
    group.add(shadow, panel, centerLine, crossLine);
  }
  const mainPath = box(4.4, 0.07, stageDepth - 4.6, 0xf8e3a0, 0, 0.05, 0.4);
  const mainPathLeftEdge = box(0.16, 0.06, stageDepth - 5.2, 0x293a54, -2.35, 0.13, 0.4);
  const mainPathRightEdge = mainPathLeftEdge.clone();
  mainPathRightEdge.position.x = 2.35;
  group.add(mainPath, mainPathLeftEdge, mainPathRightEdge);
  for (let index = 0; index < 9; index += 1) {
    const z = backZ + 5 + index * 3.7;
    const marker = box(index % 2 === 0 ? 0.95 : 1.35, 0.08, 0.22, 0xffffff, index % 2 === 0 ? -1.15 : 1.15, 0.18, z);
    group.add(marker);
  }
  const leftRail = box(0.32, 0.55, stageDepth - 1.6, 0x24324a, leftX + 0.25, 0.22, 0);
  const rightRail = leftRail.clone();
  rightRail.position.x = rightX - 0.25;
  const frontLip = box(stageWidth, 0.62, 0.38, 0x24324a, 0, 0.24, frontZ - 0.12);
  const backLip = box(stageWidth, 0.42, 0.34, 0x24324a, 0, 0.18, backZ + 0.12);
  group.add(leftRail, rightRail, frontLip, backLip);
  const backWall = box(stageWidth + 1.4, 5.3, 0.36, 0x9bd9ec, 0, 2.48, backZ - 0.28);
  const backWallBase = box(stageWidth + 1.8, 0.42, 0.52, 0x24324a, 0, 0.18, backZ - 0.04);
  const skyBand = box(stageWidth + 1.5, 1.25, 0.08, 0xf8e3a0, 0, 4.65, backZ - 0.49);
  const mirrorBand = box(stageWidth - 4, 1.85, 0.08, 0xbee9f4, 0, 2.82, backZ - 0.52);
  group.add(backWall, backWallBase, skyBand, mirrorBand);
  for (let index = 0; index < 6; index += 1) {
    const mirror = box(3.7, 1.48, 0.1, index % 2 === 0 ? 0xd8f6ff : 0xb6dfe9, -11.4 + index * 4.55, 2.84, backZ - 0.62);
    const mirrorLine = box(0.08, 1.54, 0.12, 0xffffff, mirror.position.x + 1.58, 2.85, backZ - 0.68);
    group.add(mirror, mirrorLine);
  }
  const mythicPlatformShadow = box(8.7, 0.08, 3.2, 0x3a2f74, 6.7, 0.03, backZ + 6.2);
  const mythicPlatform = box(8, 0.2, 2.55, 0x7865e8, 6.4, 0.22, backZ + 5.9);
  const mythicRune = box(3.9, 0.06, 0.18, 0xf8e3a0, 6.4, 0.36, backZ + 5.9);
  const mythicRuneCross = box(0.18, 0.06, 1.72, 0xf8e3a0, 6.4, 0.37, backZ + 5.9);
  group.add(mythicPlatformShadow, mythicPlatform, mythicRune, mythicRuneCross);
  const foregroundMat = box(stageWidth - 5.2, 0.09, 2.15, 0x2fa3a5, 0, 0.13, frontZ - 1.7);
  const foregroundMatStripeA = box(stageWidth - 8, 0.045, 0.12, 0xfff0a6, 0, 0.2, frontZ - 2.22);
  const foregroundMatStripeB = foregroundMatStripeA.clone();
  foregroundMatStripeB.position.z = frontZ - 1.18;
  group.add(foregroundMat, foregroundMatStripeA, foregroundMatStripeB);
  for (let index = 0; index < 4; index += 1) {
    const step = box(stageWidth - 4 - index * 2.3, 0.12, 0.52, 0xd88754, 0, 0.02 + index * 0.07, frontZ - 3.28 - index * 0.48);
    group.add(step);
  }
  return markShadows(group) as Group;
}

export function createGymProps(): Group {
  const group = new Group();
  const backZ = -20.8;
  const posterColors = [0xf37b6c, 0xf7d56a, 0x77d7c2, 0x7865e8];
  for (let index = 0; index < posterColors.length; index += 1) {
    const x = -13.2 + index * 4.8;
    const poster = box(2.1, 1.15, 0.08, posterColors[index], x, 4.15, backZ - 0.18);
    const posterTop = box(2.35, 0.12, 0.1, 0x24324a, x, 4.82, backZ - 0.24);
    const posterBottom = posterTop.clone();
    posterBottom.position.y = 3.48;
    group.add(poster, posterTop, posterBottom);
  }
  const sidePropSets = [
    { x: -14.25, z: -6.6, color: 0x2fa3a5 },
    { x: 14.25, z: -0.6, color: 0xf37b6c },
    { x: -14.25, z: 6.2, color: 0xf7d56a },
    { x: 14.25, z: 10.4, color: 0x70c46b }
  ];
  for (const prop of sidePropSets) {
    const rackBase = box(2.5, 0.2, 0.55, 0x24324a, prop.x, 0.22, prop.z);
    const rackTop = box(2.35, 0.12, 0.42, prop.color, prop.x, 0.92, prop.z);
    const postA = box(0.14, 1.15, 0.14, 0x24324a, prop.x - 1.05, 0.68, prop.z);
    const postB = postA.clone();
    postB.position.x = prop.x + 1.05;
    group.add(rackBase, rackTop, postA, postB);
    for (let index = 0; index < 3; index += 1) {
      const plate = cylinder(0.24 - index * 0.035, 0.24 - index * 0.035, 0.14, index % 2 === 0 ? 0xf8e3a0 : 0xffffff, 8);
      plate.rotation.z = Math.PI / 2;
      plate.position.set(prop.x + (index - 1) * 0.62, 0.95, prop.z + 0.35);
      group.add(plate);
    }
  }
  const mirrorStandLeft = box(0.22, 2.45, 0.18, 0x24324a, -7.8, 1.36, backZ + 1.05);
  const mirrorStandRight = mirrorStandLeft.clone();
  mirrorStandRight.position.x = 7.8;
  const banner = box(15.9, 0.62, 0.18, 0xfff0a6, 0, 5.25, backZ + 0.94);
  group.add(mirrorStandLeft, mirrorStandRight, banner);
  for (let index = 0; index < 5; index += 1) {
    const cone = cylinder(0.18, 0.28, 0.58, index % 2 === 0 ? 0xf37b6c : 0xf7d56a, 5);
    cone.position.set(-9 + index * 4.5, 0.37, 15.2);
    group.add(cone);
  }
  return markShadows(group) as Group;
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
  const palettes = [
    { mat: 0x77d7c2, face: 0xf8e3a0, accent: 0x24324a },
    { mat: 0xf37b6c, face: 0xffffff, accent: 0x803c58 },
    { mat: 0xf7d56a, face: 0x70c46b, accent: 0x24324a },
    { mat: 0x8bb7ff, face: 0xffffff, accent: 0x425b9a }
  ];
  stations.forEach((station, index) => {
    const palette = palettes[index % palettes.length];
    const x = station.position.x;
    const z = station.position.z;
    const shadow = box(2.7, 0.06, 1.48, 0x141d33, x + 0.18, 0.04, z + 0.18);
    const floorMat = box(2.52, 0.08, 1.32, palette.mat, x, 0.12, z);
    const backPlate = box(1.58, 1.05, 0.12, 0x141d33, x, 0.78, z - 0.46);
    const sign = box(1.42, 0.9, 0.14, palette.face, x, 0.82, z - 0.39);
    const stripe = box(1.18, 0.12, 0.16, palette.accent, x, 1.06, z - 0.3);
    const baseStripe = box(1.22, 0.1, 0.16, palette.accent, x, 0.56, z - 0.29);
    group.add(shadow, floorMat, backPlate, sign, stripe, baseStripe);
    const iconBar = cylinder(0.035, 0.035, 0.92, palette.accent, 6);
    iconBar.rotation.z = Math.PI / 2;
    iconBar.position.set(x, 0.83, z - 0.2);
    const plateLeft = cylinder(0.15, 0.15, 0.08, palette.accent, 8);
    plateLeft.rotation.z = Math.PI / 2;
    plateLeft.position.set(x - 0.56, 0.83, z - 0.2);
    const plateRight = plateLeft.clone();
    plateRight.position.x = x + 0.56;
    group.add(iconBar, plateLeft, plateRight);
    if (index % 3 === 1) {
      const punch = box(0.34, 0.34, 0.16, palette.mat, x + 0.38, 0.78, z - 0.12);
      punch.rotation.z = 0.55;
      group.add(punch);
    } else if (index % 3 === 2) {
      const sparkleA = box(0.12, 0.44, 0.14, palette.mat, x + 0.38, 0.83, z - 0.12);
      const sparkleB = box(0.44, 0.12, 0.14, palette.mat, x + 0.38, 0.83, z - 0.12);
      group.add(sparkleA, sparkleB);
    }
  });
  return markShadows(group) as Group;
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
    const x = machine.position.x;
    const z = machine.position.z;
    const shadow = box(1.95, 0.06, 1.15, 0x141d33, x + 0.16, 0.04, z + 0.16);
    const kioskBack = box(1.18, 1.82, 0.18, 0x141d33, x, 1.02, z - 0.08);
    const kiosk = box(1.02, 1.66, 0.2, 0xef3d4f, x, 1.04, z);
    const screen = box(0.64, 0.46, 0.12, 0x9bd9ec, x - 0.04, 1.32, z + 0.13);
    const slot = box(0.58, 0.12, 0.14, 0xffe56d, x - 0.02, 0.86, z + 0.14);
    const buttonA = box(0.13, 0.13, 0.14, 0xffffff, x + 0.36, 1.06, z + 0.15);
    const buttonB = box(0.13, 0.13, 0.14, 0xf7d56a, x + 0.36, 0.86, z + 0.15);
    const awning = box(1.28, 0.18, 0.34, 0xffe56d, x, 1.96, z + 0.03);
    const floorMat = box(1.72, 0.08, 0.82, 0x77d7c2, x, 0.12, z + 0.46);
    group.add(shadow, floorMat, kioskBack, kiosk, screen, slot, buttonA, buttonB, awning);
  }
  return markShadows(group) as Group;
}

type CanonicalMuscleBuild = Exclude<MuscleBuild, 'lean' | 'power' | 'sculpted'>;

type BodyBuildSpec = {
  torsoTop: number;
  torsoBottom: number;
  shoulderPlane: number;
  shoulder: number;
  arm: number;
  forearm: number;
  leg: number;
  neckHeight: number;
  coreDepth: number;
  deltoid: number;
  pec: number;
  glute: number;
  calf: number;
  baseScale: number;
};

const MUSCLE_SPECS: Record<CanonicalMuscleBuild, BodyBuildSpec> = {
  beginner: {
    torsoTop: 0.26,
    torsoBottom: 0.29,
    shoulderPlane: 0.21,
    shoulder: 0.2,
    arm: 0.07,
    forearm: 0.065,
    leg: 0.08,
    neckHeight: 0.13,
    coreDepth: 0.88,
    deltoid: 0.79,
    pec: 0.72,
    glute: 0.86,
    calf: 0.83,
    baseScale: 1.02
  },
  average: {
    torsoTop: 0.3,
    torsoBottom: 0.34,
    shoulderPlane: 0.23,
    shoulder: 0.24,
    arm: 0.08,
    forearm: 0.07,
    leg: 0.087,
    neckHeight: 0.15,
    coreDepth: 0.94,
    deltoid: 0.83,
    pec: 0.8,
    glute: 0.92,
    calf: 0.86,
    baseScale: 1.05
  },
  toned: {
    torsoTop: 0.33,
    torsoBottom: 0.36,
    shoulderPlane: 0.24,
    shoulder: 0.255,
    arm: 0.088,
    forearm: 0.08,
    leg: 0.096,
    neckHeight: 0.154,
    coreDepth: 1,
    deltoid: 0.9,
    pec: 0.9,
    glute: 0.98,
    calf: 0.9,
    baseScale: 1.06
  },
  athletic: {
    torsoTop: 0.36,
    torsoBottom: 0.4,
    shoulderPlane: 0.265,
    shoulder: 0.3,
    arm: 0.11,
    forearm: 0.096,
    leg: 0.108,
    neckHeight: 0.162,
    coreDepth: 1.05,
    deltoid: 1.01,
    pec: 1.02,
    glute: 1.06,
    calf: 0.95,
    baseScale: 1.08
  },
  muscular: {
    torsoTop: 0.39,
    torsoBottom: 0.43,
    shoulderPlane: 0.285,
    shoulder: 0.315,
    arm: 0.118,
    forearm: 0.102,
    leg: 0.113,
    neckHeight: 0.17,
    coreDepth: 1.1,
    deltoid: 1.1,
    pec: 1.15,
    glute: 1.12,
    calf: 1.0,
    baseScale: 1.11
  },
  bodybuilder: {
    torsoTop: 0.41,
    torsoBottom: 0.45,
    shoulderPlane: 0.295,
    shoulder: 0.33,
    arm: 0.126,
    forearm: 0.11,
    leg: 0.117,
    neckHeight: 0.174,
    coreDepth: 1.14,
    deltoid: 1.16,
    pec: 1.22,
    glute: 1.16,
    calf: 1.03,
    baseScale: 1.14
  },
  elite: {
    torsoTop: 0.43,
    torsoBottom: 0.48,
    shoulderPlane: 0.31,
    shoulder: 0.34,
    arm: 0.135,
    forearm: 0.116,
    leg: 0.123,
    neckHeight: 0.178,
    coreDepth: 1.18,
    deltoid: 1.2,
    pec: 1.29,
    glute: 1.2,
    calf: 1.06,
    baseScale: 1.16
  }
};

const MUSCLE_ALIAS_MAP: Record<MuscleBuild, CanonicalMuscleBuild> = {
  lean: 'beginner',
  beginner: 'beginner',
  average: 'average',
  power: 'athletic',
  toned: 'toned',
  athletic: 'athletic',
  sculpted: 'bodybuilder',
  muscular: 'muscular',
  bodybuilder: 'bodybuilder',
  elite: 'elite'
};

type BodySexStyle = {
  label: string;
  shoulderWidth: number;
  shoulderDepth: number;
  torsoWidth: number;
  torsoDepth: number;
  hipWidth: number;
  hipDepth: number;
  armLength: number;
  armMass: number;
  calfMass: number;
  thighMass: number;
  gluteDepth: number;
  chestLift: number;
  wingLift: number;
};

const BODY_STYLE_BY_SEX: Record<CharacterSex, BodySexStyle> = {
  man: {
    label: 'man',
    shoulderWidth: 1.06,
    shoulderDepth: 1,
    torsoWidth: 1,
    torsoDepth: 1.01,
    hipWidth: 0.96,
    hipDepth: 0.96,
    armLength: 1,
    armMass: 1.08,
    calfMass: 1,
    thighMass: 1,
    gluteDepth: 0.94,
    chestLift: 1.01,
    wingLift: 1
  },
  woman: {
    label: 'woman',
    shoulderWidth: 0.9,
    shoulderDepth: 0.92,
    torsoWidth: 0.98,
    torsoDepth: 1.11,
    hipWidth: 1.22,
    hipDepth: 1.17,
    armLength: 0.96,
    armMass: 0.94,
    calfMass: 1.03,
    thighMass: 1.03,
    gluteDepth: 1.2,
    chestLift: 0.94,
    wingLift: 0.88
  }
};

function resolveBuild(build: MuscleBuild): CanonicalMuscleBuild {
  return MUSCLE_ALIAS_MAP[normalizeMuscleBuild(build)] ?? 'athletic';
}

function resolveBodyStyle(sex: CharacterSex): BodySexStyle {
  return BODY_STYLE_BY_SEX[sex];
}

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
  },
  power: {
    shoulderSpread: 1.14,
    hipSpread: 1.08,
    torsoTopScale: 1.14,
    torsoBottomScale: 1.1,
    torsoDepth: 1.14,
    legSpread: 1.08,
    heightScale: 1
  },
  athletic: {
    shoulderSpread: 1.06,
    hipSpread: 0.99,
    torsoTopScale: 1.04,
    torsoBottomScale: 0.98,
    torsoDepth: 1,
    legSpread: 1.02,
    heightScale: 1.04
  },
  heavyweight: {
    shoulderSpread: 1.18,
    hipSpread: 1.15,
    torsoTopScale: 1.18,
    torsoBottomScale: 1.16,
    torsoDepth: 1.18,
    legSpread: 1.12,
    heightScale: 1.03
  },
  lean: {
    shoulderSpread: 0.96,
    hipSpread: 0.92,
    torsoTopScale: 0.96,
    torsoBottomScale: 0.9,
    torsoDepth: 0.94,
    legSpread: 0.94,
    heightScale: 1.08
  },
  voluptuous: {
    shoulderSpread: 0.95,
    hipSpread: 1.38,
    torsoTopScale: 0.92,
    torsoBottomScale: 1.26,
    torsoDepth: 1.18,
    legSpread: 1.14,
    heightScale: 0.95
  },
  pear: {
    shoulderSpread: 0.92,
    hipSpread: 1.45,
    torsoTopScale: 0.9,
    torsoBottomScale: 1.32,
    torsoDepth: 1.22,
    legSpread: 1.2,
    heightScale: 0.93
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

const DEFAULT_BUDDY_BODY_TRAITS: BuddyBodyTraits = {
  chest: 1,
  wings: 1,
  glutes: 1,
  thighs: 1,
  calfs: 1
};

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
  const hairStyle = normalizeHairStyle(appearance.hair);
  const hair = getHairOption(hairStyle);
  const hairMaterial = standardMaterial(hair.color);
  const isWoman = appearance.sex === 'woman';

  const addBaseCap = (scaleX = 1, scaleY = 0.44, scaleZ = 0.9, y = 1.34): void => {
    const cap = new Mesh(new IcosahedronGeometry(0.27, 0), hairMaterial);
    cap.scale.set(scaleX, scaleY, scaleZ);
    cap.position.set(0, y, -0.02);
    group.add(cap);
  };

  const addTopRibbon = (x: number, width: number, depth: number, y = 1.42, z = -0.03): void => {
    const ribbon = box(width, 0.055, depth, hair.color, x, y, z);
    ribbon.scale.set(1, 1, 1);
    group.add(ribbon);
  };

  if (hairStyle === 'buzz-cut') {
    addBaseCap(1.05, 0.45, 0.9, 1.34);
    const front = box(0.34, 0.07, 0.18, hair.color, 0, 1.33, 0.19);
    group.add(front);
    return;
  }

  if (hairStyle === 'afro') {
    addBaseCap(1.08, 0.44, 0.9, 1.38);
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

  if (hairStyle === 'short-curls' || hairStyle === 'medium-curls') {
    addBaseCap(1.02, 0.42, 0.88, 1.33);
    const rows = hairStyle === 'short-curls' ? 3 : 4;
    const size = hairStyle === 'short-curls' ? 0.065 : 0.072;
    const spread = hairStyle === 'short-curls' ? 0.11 : 0.10;
    for (let row = 0; row < rows; row += 1) {
      const lockCount = 5;
      for (let col = 0; col < lockCount; col += 1) {
        const x = -0.22 + col * spread + (row % 2) * 0.04;
        const z = -0.05 + row * 0.09;
        addHairOrb(group, hairMaterial, x, 1.4 + row * 0.03, z, size, 1.1, 0.8, 1.1);
      }
    }

    return;
  }

  if (hairStyle === 'fade') {
    addBaseCap(1.05, 0.3, 0.84, 1.3);
    for (let i = 0; i < 5; i += 1) {
      addHairOrb(group, hairMaterial, -0.16 + i * 0.08, 1.42, 0.04, 0.055, 1, 0.9, 1);
    }

    return;
  }

  if (hairStyle === 'waves') {
    addBaseCap(1.08, 0.32, 0.9, 1.31);
    for (let i = 0; i < 4; i += 1) {
      const wave = box(0.34, 0.035, 0.035, hair.color, 0, 1.36 + i * 0.035, 0.1 - i * 0.07);
      wave.rotation.z = i % 2 === 0 ? 0.2 : -0.2;
      group.add(wave);
    }

    return;
  }

  if (hairStyle === 'high-top') {
    const base = new Mesh(new IcosahedronGeometry(0.24, 0), hairMaterial);
    base.scale.set(1.02, 0.34, 0.88);
    base.position.set(0, 1.31, -0.02);
    const top = box(0.48, 0.34, 0.42, hair.color, 0, 1.51, -0.03);
    top.rotation.y = 0.18;
    group.add(base, top);
    return;
  }

  if (hairStyle === 'bun') {
    addBaseCap(1, 0.48, 0.9, 1.33);
    const base = new Mesh(new IcosahedronGeometry(0.25, 0), hairMaterial);
    base.position.set(0, 1.33, -0.03);
    const bun = new Mesh(new IcosahedronGeometry(0.15, 0), hairMaterial);
    bun.position.set(0, 1.51, isWoman ? -0.2 : -0.18);
    const tail = box(0.14, 0.1, 0.09, hair.color, 0, 1.58, isWoman ? -0.29 : -0.25);
    base.scale.set(1, 0.48, 0.9);
    group.add(base, bun, tail);
    return;
  }

  if (hairStyle === 'high-puff') {
    addBaseCap(1, 0.42, 0.86, 1.31);
    addHairOrb(group, hairMaterial, 0, 1.55, isWoman ? -0.12 : -0.1, 0.24, 1.18, 1, 1.08);
    return;
  }

  if (hairStyle === 'ponytail') {
    addBaseCap(1.02, 0.38, 0.88, 1.33);
    addHairOrb(group, hairMaterial, -0.14, 1.26, 0.14, 0.09, 1.4, 1.08, 1.02);
    addHairOrb(group, hairMaterial, 0, 1.24, -0.35, 0.11, isWoman ? 1.2 : 1.08, 1.05, 0.95);
    addHairOrb(group, hairMaterial, -0.06, 1.12, -0.34, 0.08, 1.25, 0.85, 0.9);
    return;
  }

  if (hairStyle === 'side-part') {
    addBaseCap(1.02, 0.39, 0.9, 1.33);
    const divider = box(0.07, 0.05, 0.21, 0x1d2024, -0.05, 1.4, 0.03);
    divider.scale.set(0.9, 0.65, 1);
    const sideLeft = box(0.24, 0.17, 0.12, hair.color, -0.18, 1.45, 0.08);
    const sideRight = box(0.24, 0.17, 0.06, hair.color, 0.13, 1.38, 0.08);
    group.add(divider, sideLeft, sideRight);
    return;
  }

  if (hairStyle === 'undercut') {
    addBaseCap(1.05, 0.34, 0.88, 1.31);
    addTopRibbon(-0.2, 0.1, 0.07, 1.42, -0.03);
    addTopRibbon(0.2, 0.1, 0.07, 1.43, -0.04);
    const fade = box(0.35, 0.06, 0.14, hair.color, 0, 1.29, 0.09);
    fade.rotation.z = 0.22;
    group.add(fade);
    return;
  }

  if (hairStyle === 'mohawk') {
    addBaseCap(0.96, 0.24, 0.83, 1.33);
    const spike = box(0.14, 0.34, 0.13, hair.color, 0, 1.58, -0.12);
    spike.rotation.x = -0.22;
    const left = box(0.06, 0.24, 0.11, hair.color, -0.1, 1.5, -0.08);
    const right = box(0.06, 0.24, 0.11, hair.color, 0.1, 1.5, -0.08);
    group.add(spike, left, right);
    return;
  }

  if (hairStyle === 'spiky') {
    addBaseCap(1.02, 0.44, 0.9, 1.32);
    addHairOrb(group, hairMaterial, -0.16, 1.42, 0.06, 0.05, 0.95, 1, 1.1);
    addHairOrb(group, hairMaterial, 0, 1.44, 0.1, 0.06, 1.02, 1, 1.16);
    addHairOrb(group, hairMaterial, 0.16, 1.42, 0.06, 0.05, 0.95, 1, 1.1);
    const crest = box(0.2, 0.08, 0.1, hair.color, 0, 1.48, 0.13);
    crest.rotation.z = 0.28;
    group.add(crest);
    return;
  }

  if (hairStyle === 'swept-back') {
    addBaseCap(1, 0.42, 0.88, 1.33);
    const cap = new Group();
    const wedgeA = box(0.34, 0.09, 0.2, hair.color, -0.08, 1.42, 0.12);
    wedgeA.rotation.z = -0.25;
    const wedgeB = box(0.24, 0.07, 0.18, hair.color, 0.13, 1.36, 0.17);
    wedgeB.rotation.z = -0.55;
    cap.add(wedgeA, wedgeB);
    group.add(cap);
    return;
  }

  if (hairStyle === 'bangs') {
    addBaseCap(1.0, 0.4, 0.84, 1.34);
    const front = box(0.32, 0.06, 0.2, hair.color, 0, 1.38, 0.22);
    front.rotation.z = -0.18;
    const lock = box(0.12, 0.055, 0.1, hair.color, -0.1, 1.44, 0.11);
    lock.rotation.z = 0.25;
    group.add(front, lock);
    return;
  }

  if (hairStyle === 'locs' || hairStyle === 'twists' || hairStyle === 'braids') {
    addBaseCap(1.05, 0.36, 0.9, 1.31);
    const isTwists = hairStyle === 'twists';
    const isBraids = hairStyle === 'braids';
    const long = isTwists || isBraids;
    const thick = isTwists ? 0.045 : 0.035;
    const length = long ? 0.42 : 0.24;
    const sideXs = [-0.28, -0.18, -0.08, 0.08, 0.18, 0.28];

    for (let i = 0; i < sideXs.length; i += 1) {
      const x = sideXs[i];
      const y = 1.12 - (long ? 0.03 : 0);
      const z = i < 3 ? 0.1 : -0.05;
      addHairLock(group, hair.color, x, y, z, length, thick, x < 0 ? 0.16 : -0.16);
    }

    if (isBraids) {
      for (let i = 0; i < 4; i += 1) {
        addHairLock(group, hair.color, -0.18 + i * 0.12, 1.08, -0.18, 0.38, 0.03, 0);
      }
    }

    if (isTwists) {
      for (let i = 0; i < 2; i += 1) {
        addHairLock(group, hair.color, 0.05 + i * 0.18, 1.25, -0.25, 0.31, 0.028, 0.06);
      }
    }

    return;
  }

  if (hairStyle === 'long-straight' || hairStyle === 'long-wavy') {
    addBaseCap(1.04, 0.4, 0.86, isWoman ? 1.3 : 1.32);
    const backMass = new Mesh(new IcosahedronGeometry(0.22, 0), hairMaterial);
    backMass.scale.set(1.16, 1.08, isWoman ? 1.05 : 0.98);
    backMass.position.set(0, 1.24, -0.2);
    const backLock = cylinder(0.16, 0.16, 0.52, hair.color, 5);
    backLock.rotation.z = 0.18;
    backLock.position.set(0, 0.88, -0.15);
    group.add(backMass, backLock);

    if (hairStyle === 'long-wavy') {
      addHairOrb(group, hairMaterial, -0.16, 1.22, -0.12, 0.1, 1.4, 0.92, 1.06);
      addHairOrb(group, hairMaterial, 0.16, 1.22, -0.12, 0.1, 1.35, 0.92, 1.06);
    }

    return;
  }
  // Default is a polished swept-back fallback.
  addBaseCap(1, 0.42, 0.88, 1.33);
  const cap = new Group();
  const wedgeA = box(0.34, 0.09, 0.2, hair.color, -0.08, 1.42, 0.12);
  wedgeA.rotation.z = -0.25;
  const wedgeB = box(0.24, 0.07, 0.18, hair.color, 0.13, 1.36, 0.17);
  wedgeB.rotation.z = -0.55;
  cap.add(wedgeA, wedgeB);
  group.add(cap);
}

function addPlayerMuscleGeometry(
  group: Group,
  appearance: PlayerAppearance,
  skinColor: number,
  shirtAccent: number
): void {
  const build = resolveBuild(appearance.muscleBuild);
  const bodyStyle = resolveBodyStyle(appearance.sex);
  const spec = MUSCLE_SPECS[build];
  const frame = FRAME_SPECS[appearance.frame];
  const sizing = getBodySize(appearance);
  const shoulderScale = sizing.shoulders * frame.shoulderSpread * bodyStyle.shoulderWidth;
  const armScale = sizing.arms;
  const legScale = sizing.legs;
  const torsoScale = sizing.torso;
  const hipScale = frame.hipSpread * bodyStyle.hipWidth;
  const chestScale = sizing.chest;
  const wingsScale = sizing.wings;
  const gluteScale = sizing.glutes * bodyStyle.gluteDepth;
  const calfScale = sizing.calfs * bodyStyle.calfMass;
  const thighScale = sizing.thighs * bodyStyle.thighMass;
  const shoulderOffset = 0.39 * shoulderScale;
  const armOffset = 0.47 * shoulderScale * bodyStyle.armLength;
  const legOffset = 0.16 * frame.legSpread * hipScale;
  const leftShoulder = new Mesh(
    new IcosahedronGeometry(spec.shoulder * bodyStyle.shoulderDepth, 0),
    standardMaterial(skinColor)
  );
  leftShoulder.scale.set(1.2 * sizing.shoulders, 0.72 * bodyStyle.armMass, 0.9);
  leftShoulder.position.set(-shoulderOffset, 0.96, 0.04);
  const rightShoulder = leftShoulder.clone();
  rightShoulder.position.x = shoulderOffset;
  group.add(leftShoulder, rightShoulder);

  const leftBicep = new Mesh(
    new IcosahedronGeometry(spec.arm * 1.35 * bodyStyle.armMass, 0),
    standardMaterial(skinColor)
  );
  leftBicep.scale.set(0.9 * armScale, 1.2 * armScale, 0.78 * armScale);
  leftBicep.position.set(-armOffset, 0.72, 0.08);
  const rightBicep = leftBicep.clone();
  rightBicep.position.x = armOffset;
  group.add(leftBicep, rightBicep);

  const leftQuad = new Mesh(
    new IcosahedronGeometry(spec.leg * 1.25 * bodyStyle.thighMass, 0),
    standardMaterial(0x1b2f43)
  );
  leftQuad.scale.set(0.8 * legScale, 1.25 * legScale, 0.72 * legScale);
  leftQuad.position.set(-legOffset, 0.42, 0.09);
  const rightQuad = leftQuad.clone();
  rightQuad.position.x = legOffset;
  group.add(leftQuad, rightQuad);

  const chestVolume = Math.max(0.48, 0.84 + (chestScale - 1) * 0.16);
  const breastVolume = Math.max(0.56, 0.9 + (chestScale - 1) * 0.16);
  const wingVolume = Math.max(0.24, wingsScale);

  const pecLeftBase = box(
    0.14 * torsoScale * chestVolume,
    0.09,
    0.065 * breastVolume,
    shirtAccent,
    -0.11 * torsoScale,
    0.92,
    0.34
  );
  pecLeftBase.scale.set(0.95 * chestVolume, 1, breastVolume);
  pecLeftBase.rotation.z = 0.1;
  const pecRightBase = pecLeftBase.clone();
  pecRightBase.position.x = 0.11 * torsoScale;
  pecRightBase.rotation.z = -0.1;
  group.add(pecLeftBase, pecRightBase);

  if (chestScale > 1.04) {
    const breastLeft = box(
      0.075 * torsoScale * breastVolume,
      0.055,
      0.03 * breastVolume,
      shirtAccent,
      -0.17 * torsoScale,
      0.95,
      0.33
    );
    const breastRight = breastLeft.clone();
    breastRight.position.x = 0.17 * torsoScale;
    group.add(breastLeft, breastRight);
  }

  if (wingsScale > 0.82) {
    const wingBaseY = 0.88;
    const wingHeight = 0.24 * wingVolume;
    const wingDepth = 0.14 * Math.max(1, wingsScale - 0.45);
    const wingLeft = box(0.055, wingHeight, wingDepth, skinColor, -0.62 * shoulderScale, wingBaseY, -0.01);
    wingLeft.rotation.z = 0.5;
    wingLeft.rotation.x = -0.25;
    const wingLeftTip = box(0.04, wingHeight * 0.72, 0.05, 0x1b2f43, -0.72 * shoulderScale, wingBaseY - 0.02, -0.09);
    wingLeftTip.rotation.z = 0.95;
    const wingRight = wingLeft.clone();
    wingRight.position.x = 0.62 * shoulderScale;
    wingRight.rotation.z = -0.5;
    const wingRightTip = wingLeftTip.clone();
    wingRightTip.position.x = 0.72 * shoulderScale;
    wingRightTip.rotation.z = -0.95;
    group.add(wingLeft, wingLeftTip, wingRight, wingRightTip);
  }

  const gluteScaleY = 0.7 + (gluteScale - 1) * 0.36;
  const gluteLeft = box(
    0.16 * torsoScale * hipScale * Math.max(0.6, gluteScale),
    0.15 * gluteScaleY,
    0.12,
    0x1b2f43,
    -0.19 * hipScale,
    0.48,
    -0.02
  );
  const gluteRight = gluteLeft.clone();
  gluteRight.position.x = 0.19 * hipScale;
  const gluteTop = box(0.17 * torsoScale * Math.max(0.6, gluteScale), 0.085, 0.1, 0x2f3d4c, 0, 0.58, -0.01);
  const legRibbon = box(
    0.34 * torsoScale * Math.max(0.65, thighScale * 0.8),
    0.055,
    0.1,
    0xf9f7ef,
    0,
    0.33,
    0.04
  );
  group.add(gluteLeft, gluteRight, gluteTop, legRibbon);

  if (build === 'beginner') {
    const chestLineA = box(0.08 * torsoScale, 0.025, 0.28, shirtAccent, -0.1 * torsoScale, 0.93, 0.32);
    chestLineA.rotation.z = 0.35;
    const chestLineB = chestLineA.clone();
    chestLineB.position.x = 0.1 * torsoScale;
    chestLineB.rotation.z = -0.35;
    const core = createFlatHex(0.06 * bodyStyle.chestLift, shirtAccent);
    core.position.set(0, 0.72, 0.35);
    const obliqueLeft = box(0.044, 0.16 * (0.84 + (calfScale - 1) * 0.08), 0.045, skinColor, -0.2 * torsoScale, 0.74, 0.34);
    obliqueLeft.rotation.z = -0.34;
    const obliqueRight = obliqueLeft.clone();
    obliqueRight.position.x = 0.2 * torsoScale;
    obliqueRight.rotation.z = 0.34;
    const thighMarkLeft = box(
      0.05 * (0.86 + (thighScale - 1) * 0.14),
      0.16,
      0.052,
      shirtAccent,
      -0.18 * legOffset * 1.2,
      0.36,
      0.06
    );
    const thighMarkRight = thighMarkLeft.clone();
    thighMarkRight.position.x = 0.18 * 1.2 * legOffset;
    group.add(obliqueLeft, obliqueRight, thighMarkLeft, thighMarkRight);
    group.add(chestLineA, chestLineB, core);
    return;
  }

  const pecLeft = box(0.2 * torsoScale, 0.11, 0.08, shirtAccent, -0.12 * torsoScale, 0.9, 0.35);
  pecLeft.rotation.z = 0.12;
  const pecRight = pecLeft.clone();
  pecRight.position.x = 0.12 * torsoScale;
  pecRight.rotation.z = -0.12;
  group.add(pecLeft, pecRight);

  const abRows = build === 'muscular' || build === 'bodybuilder' || build === 'elite' ? 3 : 2;

  for (let row = 0; row < abRows; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      const ab = createFlatHex(build === 'muscular' || build === 'bodybuilder' || build === 'elite' ? 0.055 : 0.045, 0x5dd29a);
      ab.position.set(col === 0 ? -0.055 * torsoScale : 0.055 * torsoScale, 0.76 - row * 0.075, 0.36);
      ab.scale.set(0.82, 1, 1);
      group.add(ab);
    }
  }

  if (build === 'muscular' || build === 'bodybuilder' || build === 'elite') {
    const obliqueLeft = box(0.045, 0.18, 0.05, 0xffc55c, -0.21 * torsoScale * hipScale, 0.73, 0.34);
    obliqueLeft.rotation.z = -0.35;
    const obliqueRight = obliqueLeft.clone();
    obliqueRight.position.x = 0.21 * torsoScale * hipScale;
    obliqueRight.rotation.z = 0.35;
    group.add(obliqueLeft, obliqueRight);
  }
}

export function createPlayerMesh(appearance?: PlayerAppearance): Group {
  const group = new Group();
  const resolvedAppearance: PlayerAppearance = {
    ...DEFAULT_PLAYER_APPEARANCE,
    ...(appearance ?? {}),
    hair: normalizeHairStyle(appearance?.hair ?? DEFAULT_PLAYER_APPEARANCE.hair),
    muscleBuild: normalizeMuscleBuild(appearance?.muscleBuild ?? DEFAULT_PLAYER_APPEARANCE.muscleBuild),
    skinTone:
      typeof appearance?.skinTone === 'string'
        ? appearance.skinTone
        : DEFAULT_PLAYER_APPEARANCE.skinTone,
    body: {
      ...DEFAULT_PLAYER_APPEARANCE.body,
      ...(appearance?.body ?? {})
    }
  };
  const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
  const sizing = getBodySize(resolvedAppearance);
  const build = resolveBuild(resolvedAppearance.muscleBuild);
  const buildStyles: Record<
    CanonicalMuscleBuild,
    { mass: number; arms: number; chest: number; legs: number }
  > = {
    beginner: { mass: 0.9, arms: 0.88, chest: 0.88, legs: 0.92 },
    average: { mass: 0.96, arms: 0.95, chest: 0.95, legs: 0.97 },
    toned: { mass: 0.99, arms: 0.99, chest: 0.98, legs: 1 },
    athletic: { mass: 1.03, arms: 1.06, chest: 1.04, legs: 1.04 },
    muscular: { mass: 1.08, arms: 1.12, chest: 1.1, legs: 1.07 },
    bodybuilder: { mass: 1.12, arms: 1.17, chest: 1.15, legs: 1.09 },
    elite: { mass: 1.16, arms: 1.22, chest: 1.19, legs: 1.11 }
  };
  const buildStyle = buildStyles[build];
  const frameSpec = FRAME_SPECS[resolvedAppearance.frame] ?? FRAME_SPECS.balanced;
  const frameStyles: Record<
    PlayerAppearance['frame'],
    { shoulders: number; waist: number; hips: number; height: number; lower: number }
  > = {
    balanced: { shoulders: 1, waist: 1, hips: 1, height: 1, lower: 1 },
    tapered: { shoulders: 1.08, waist: 0.94, hips: 0.96, height: 1.01, lower: 0.97 },
    curved: { shoulders: 0.96, waist: 0.98, hips: 1.09, height: 1, lower: 1.07 },
    compact: { shoulders: 1.04, waist: 1.02, hips: 1.03, height: 0.94, lower: 1.04 },
    power: { shoulders: 1.1, waist: 1.06, hips: 1.06, height: 1, lower: 1.08 },
    athletic: { shoulders: 1.05, waist: 0.96, hips: 0.99, height: 1.04, lower: 1.03 },
    heavyweight: { shoulders: 1.14, waist: 1.1, hips: 1.12, height: 1.02, lower: 1.12 },
    lean: { shoulders: 0.96, waist: 0.9, hips: 0.92, height: 1.08, lower: 0.96 },
    voluptuous: { shoulders: 0.98, waist: 1.02, hips: 1.12, height: 1, lower: 1.11 },
    pear: { shoulders: 0.94, waist: 1, hips: 1.16, height: 1, lower: 1.14 }
  };
  const frameStyle = frameStyles[resolvedAppearance.frame];
  const buildMass = buildStyle.mass;
  const heightScale = clamp(sizing.height * frameSpec.heightScale * frameStyle.height, 0.9, 1.12);
  const shoulderScale = clamp(
    sizing.shoulders * frameSpec.shoulderSpread * frameStyle.shoulders * (0.98 + buildMass * 0.02),
    0.84,
    1.22
  );
  const torsoScale = clamp(sizing.torso * frameSpec.torsoTopScale * frameStyle.waist, 0.88, 1.16);
  const chestScale = clamp(sizing.chest * buildStyle.chest, 0.74, 1.28);
  const wingsScale = clamp(sizing.wings * frameStyle.shoulders, 0.72, 1.3);
  const armScale = clamp(sizing.arms * buildStyle.arms, 0.82, 1.22);
  const legScale = clamp(sizing.legs * buildStyle.legs, 0.86, 1.18);
  const thighScale = clamp(sizing.thighs * frameSpec.hipSpread * frameStyle.lower, 0.84, 1.2);
  const calfScale = clamp(sizing.calfs, 0.82, 1.2);
  const gluteScale = clamp(sizing.glutes * frameSpec.hipSpread * frameStyle.hips, 0.82, 1.22);
  const skin = getSkinToneOption(resolvedAppearance.skinTone).color;
  const hair = getHairOption(resolvedAppearance.hair).color;
  const outline = 0x162238;
  const trainerBlue = 0x2f7de1;
  const trainerNavy = 0x26395d;
  const shirtCream = 0xfff2c6;
  const accent = 0xffd85a;
  const coral = 0xf05f4f;
  const glove = 0xf7fbff;
  const shadow = new Mesh(new CylinderGeometry(0.62, 0.62, 0.035, 16), basicMaterial(outline, 0.26));
  shadow.scale.set(1.18 + shoulderScale * 0.1, 1, 0.38 + legScale * 0.04);
  shadow.rotation.x = Math.PI / 2;
  shadow.position.y = 0.025;
  group.add(shadow);

  const addFlat = (width: number, height: number, depth: number, color: number, x: number, y: number, z: number): Mesh => {
    const back = box(width + 0.09, height + 0.09, depth + 0.04, outline, x, y, z - 0.045);
    const front = box(width, height, depth, color, x, y, z);
    group.add(back, front);
    return front;
  };

  const addSoft = (
    radius: number,
    color: number,
    x: number,
    y: number,
    z: number,
    scaleX = 1,
    scaleY = 1,
    scaleZ = 1
  ): Mesh => {
    const mesh = new Mesh(new IcosahedronGeometry(radius, 0), standardMaterial(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(scaleX, scaleY, scaleZ);
    group.add(mesh);
    return mesh;
  };

  const hipOffset = 0.15 * clamp(frameSpec.hipSpread * frameStyle.hips, 0.88, 1.18);
  const legWidth = 0.2 * thighScale;
  const legHeight = 0.34 * legScale;
  const footWidth = 0.32 * calfScale;
  addFlat(legWidth, legHeight, 0.16, trainerNavy, -hipOffset, 0.32, 0.02);
  addFlat(legWidth, legHeight, 0.16, trainerNavy, hipOffset, 0.32, 0.02);
  addFlat(0.14 * calfScale, 0.22 * legScale, 0.13, skin, -hipOffset, 0.17, 0.04);
  addFlat(0.14 * calfScale, 0.22 * legScale, 0.13, skin, hipOffset, 0.17, 0.04);
  addFlat(footWidth, 0.11, 0.2, glove, -hipOffset, 0.065, 0.12);
  addFlat(footWidth, 0.11, 0.2, glove, hipOffset, 0.065, 0.12);
  addFlat(footWidth * 0.72, 0.045, 0.21, coral, -hipOffset, 0.09, 0.21);
  addFlat(footWidth * 0.72, 0.045, 0.21, coral, hipOffset, 0.09, 0.21);

  const torsoWidth = 0.62 * torsoScale * (0.95 + shoulderScale * 0.08);
  const torsoHeight = 0.58 * (0.96 + buildMass * 0.08);
  addFlat(torsoWidth * 1.08, torsoHeight, 0.19, trainerBlue, 0, 0.78, 0.02);
  addFlat(torsoWidth * 0.62, torsoHeight * 0.78, 0.21, shirtCream, 0, 0.8, 0.11);
  addFlat(torsoWidth * 1.12 * shoulderScale, 0.13, 0.22, accent, 0, 1.05, 0.1);
  addFlat(torsoWidth * 0.86, 0.085, 0.18, trainerNavy, 0, 0.47, 0.09);

  if (chestScale > 0.82) {
    const pecWidth = 0.13 * chestScale * torsoScale;
    addFlat(pecWidth, 0.08, 0.055, accent, -0.11 * torsoScale, 0.88, 0.24).rotation.z = 0.12;
    addFlat(pecWidth, 0.08, 0.055, accent, 0.11 * torsoScale, 0.88, 0.24).rotation.z = -0.12;
  }

  if (wingsScale > 0.82) {
    const latHeight = 0.28 * wingsScale;
    const leftLat = addFlat(0.075, latHeight, 0.09, 0x245fba, -0.38 * shoulderScale, 0.77, -0.1);
    leftLat.rotation.z = -0.2;
    const rightLat = addFlat(0.075, latHeight, 0.09, 0x245fba, 0.38 * shoulderScale, 0.77, -0.1);
    rightLat.rotation.z = 0.2;
  }

  const gluteWidth = 0.13 * gluteScale;
  addFlat(gluteWidth, 0.1, 0.08, trainerNavy, -0.09 * frameSpec.hipSpread, 0.44, -0.12);
  addFlat(gluteWidth, 0.1, 0.08, trainerNavy, 0.09 * frameSpec.hipSpread, 0.44, -0.12);

  const shoulderOffset = 0.42 * shoulderScale;
  addSoft(0.16 * armScale, skin, -shoulderOffset, 0.98, 0.08, 1.18, 0.78, 0.86);
  addSoft(0.16 * armScale, skin, shoulderOffset, 0.98, 0.08, 1.18, 0.78, 0.86);
  const leftArm = addFlat(0.15 * armScale, 0.42 * armScale, 0.14, skin, -0.49 * shoulderScale, 0.7, 0.06);
  leftArm.rotation.z = -0.18;
  const rightArm = addFlat(0.15 * armScale, 0.42 * armScale, 0.14, skin, 0.49 * shoulderScale, 0.7, 0.06);
  rightArm.rotation.z = 0.18;
  addFlat(0.18 * armScale, 0.075, 0.15, accent, -0.52 * shoulderScale, 0.51, 0.1).rotation.z = -0.18;
  addFlat(0.18 * armScale, 0.075, 0.15, accent, 0.52 * shoulderScale, 0.51, 0.1).rotation.z = 0.18;
  addSoft(0.095 * armScale, glove, -0.54 * shoulderScale, 0.43, 0.12, 1.15, 0.78, 0.84);
  addSoft(0.095 * armScale, glove, 0.54 * shoulderScale, 0.43, 0.12, 1.15, 0.78, 0.84);

  addSoft(0.37, outline, 0, 1.33, -0.015, 1.06, 1.02, 0.84);
  addSoft(0.32, skin, 0, 1.34, 0.04, 1.08, 1.03, 0.82);
  addFlat(0.48, 0.07, 0.08, accent, 0, 1.52, 0.2);
  addFlat(0.08, 0.08, 0.045, outline, -0.1, 1.38, 0.32);
  addFlat(0.08, 0.08, 0.045, outline, 0.1, 1.38, 0.32);
  addFlat(0.035, 0.035, 0.035, 0xffffff, -0.085, 1.395, 0.355);
  addFlat(0.035, 0.035, 0.035, 0xffffff, 0.115, 1.395, 0.355);
  addFlat(0.16, 0.035, 0.04, coral, 0, 1.26, 0.31);
  addFlat(0.09, 0.05, 0.04, 0xffb98c, -0.23, 1.31, 0.27);
  addFlat(0.09, 0.05, 0.04, 0xffb98c, 0.23, 1.31, 0.27);
  addFlat(0.28, 0.32, 0.08, coral, 0, 0.86, -0.16);
  addFlat(0.2, 0.1, 0.07, accent, 0, 1.17, -0.14);
  addPlayerHair(group, resolvedAppearance);

  group.scale.setScalar(0.92 * heightScale);
  return markShadows(group) as Group;
}

function addBuddyMuscleFeatures(
  group: Group,
  definition: BuddyDefinition,
  traits: BuddyBodyTraits
): void {
  const accent = definition.accent;
  const deepTone = definition.archetype === 'runner' ? 0x2d4054 : 0x1b2f43;
  const chestScale = traits.chest;
  const wingsScale = traits.wings;
  const gluteScale = traits.glutes;
  const thighScale = traits.thighs;
  const calfScale = traits.calfs;
  const isWomanBuddy = definition.gender === 'woman';
  const shoulderWidth = 1 + (chestScale - 1) * (isWomanBuddy ? 0.08 : 0.2);
  const pecMass = 0.9 + (chestScale - 1) * (isWomanBuddy ? 0.18 : 0.3);
  const quadMass = 0.82 + (thighScale - 1) * 0.34;
  const calfMass = 0.8 + (calfScale - 1) * 0.35;
  const obliqueMass = 0.74 + (gluteScale - 1) * 0.31;

  const shoulderLeft = createFacetMuscle(
    0.16 * shoulderWidth,
    accent,
    -0.43,
    0.91,
    0.04,
    1.2 * shoulderWidth,
    0.72,
    0.9 + (chestScale - 1) * (isWomanBuddy ? 0.06 : 0.25)
  );
  const shoulderRight = shoulderLeft.clone();
  shoulderRight.position.x = 0.43;
  const bicepLeft = createFacetMuscle(
    0.12 * pecMass,
    accent,
    -0.5,
    0.68,
    0.08,
    0.9 * pecMass,
    1.2 * pecMass,
    0.8 + (chestScale - 1) * (isWomanBuddy ? 0.12 : 0.2)
  );
  const bicepRight = bicepLeft.clone();
  bicepRight.position.x = 0.5;
  const forearmLeft = createFacetMuscle(
    0.095 * pecMass,
    accent,
    -0.46,
    0.5,
    0.08,
    0.85 * pecMass,
    1.15 * pecMass,
    0.75 + (chestScale - 1) * (isWomanBuddy ? 0.15 : 0.21)
  );
  const forearmRight = forearmLeft.clone();
  forearmRight.position.x = 0.46;
  group.add(shoulderLeft, shoulderRight, bicepLeft, bicepRight, forearmLeft, forearmRight);

  const pecLeft = box(
    0.18 * pecMass,
    0.1 * pecMass,
    0.08,
    accent,
    -0.11,
    0.84,
    0.41
  );
  pecLeft.rotation.z = 0.16;
  const pecRight = pecLeft.clone();
  pecRight.position.x = 0.11;
  pecRight.rotation.z = -0.16;
  const trapLeft = box(
    0.18 * (0.9 + (chestScale - 1) * (isWomanBuddy ? 0.24 : 0.14)),
    0.08 * (0.88 + (chestScale - 1) * (isWomanBuddy ? 0.08 : 0.22)),
    0.1,
    0xf9f7ef,
    -0.2,
    1.01,
    0.31
  );
  trapLeft.rotation.z = -0.28;
  const trapRight = trapLeft.clone();
  trapRight.position.x = 0.2;
  trapRight.rotation.z = 0.28;
  group.add(pecLeft, pecRight, trapLeft, trapRight);

  const abRows = isWomanBuddy ? (chestScale > 1.24 ? 3 : 2) : chestScale > 1.2 ? 4 : 3;
  for (let row = 0; row < abRows; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      const ab = createFlatHex(
        0.045 * pecMass,
        row === 1 ? 0xf9f7ef : isWomanBuddy ? 0xfff1cb : accent
      );
      ab.position.set(col === 0 ? -0.06 : 0.06, 0.72 - row * 0.075, 0.43);
      ab.scale.set(0.82, 1, 1);
      group.add(ab);
    }
  }

  const obliqueLeft = box(
    0.045 * obliqueMass,
    0.2 * obliqueMass,
    0.06 * (0.75 + (chestScale - 1) * (isWomanBuddy ? 0.28 : 0.12)),
    accent,
    -0.23,
    0.66,
    0.39
  );
  obliqueLeft.rotation.z = -0.38;
  const obliqueRight = obliqueLeft.clone();
  obliqueRight.position.x = 0.23;
  obliqueRight.rotation.z = 0.38;
  const quadLeft = createFacetMuscle(
    0.12 * quadMass,
    deepTone,
    -0.16,
    0.32,
    0.09,
    0.85 * quadMass,
    1.32,
    0.72
  );
  const quadRight = quadLeft.clone();
  quadRight.position.x = 0.16;
  const calfLeft = createFacetMuscle(
    0.085 * calfMass,
    accent,
    -0.18,
    0.18,
    0.08,
    0.75 + (calfScale - 1) * 0.4,
    1.3 * calfMass,
    0.7 * calfMass
  );
  const calfRight = calfLeft.clone();
  calfRight.position.x = 0.18;
  group.add(obliqueLeft, obliqueRight, quadLeft, quadRight, calfLeft, calfRight);

  const leftMark = createFlatHex(0.07, accent);
  leftMark.position.set(-0.1, 0.79, 0.45);
  const rightMark = leftMark.clone();
  rightMark.position.x = 0.1;
  group.add(leftMark, rightMark);

  if (isWomanBuddy && chestScale > 1.08) {
    const chestLobeLeft = createFacetMuscle(
      0.055 * chestScale,
      0xffdfd1,
      -0.13,
      0.86,
      0.37,
      1 + (chestScale - 1) * 0.3,
      0.75,
      0.65
    );
    const chestLobeRight = chestLobeLeft.clone();
    chestLobeRight.position.x = 0.13;
    group.add(chestLobeLeft, chestLobeRight);
  }

  if (!isWomanBuddy && chestScale > 1.16) {
    const chestPlate = new Mesh(new TorusGeometry(0.06, 0.018, 5, 12), standardMaterial(0xf9f7ef));
    chestPlate.position.set(0, 0.84, 0.5);
    chestPlate.rotation.z = Math.PI / 2;
    group.add(chestPlate);
  }

  if (wingsScale > 1.18) {
    const wingSpread = 0.42 * (wingsScale - 1);
    const backWingLeft = new Mesh(
      new TorusGeometry(0.2 + wingSpread, 0.03, 6, 16),
      standardMaterial(definition.accent)
    );
    backWingLeft.position.set(-0.4, 0.72, -0.18);
    backWingLeft.rotation.z = Math.PI / 2;
    backWingLeft.rotation.y = -0.38;
    const backWingRight = backWingLeft.clone();
    backWingRight.position.x = 0.4;
    backWingRight.rotation.y = 0.38;
    const ridgeLeft = box(
      0.06 * (wingsScale - 0.5),
      0.1 * (wingsScale - 0.6),
      0.06,
      definition.accent,
      -0.3,
      0.74,
      -0.04
    );
    ridgeLeft.rotation.z = -0.35;
    const ridgeRight = ridgeLeft.clone();
    ridgeRight.position.x = 0.3;
    ridgeRight.rotation.z = 0.35;
    group.add(backWingLeft, backWingRight, ridgeLeft, ridgeRight);
  }

  if (definition.archetype === 'yogi') {
    const coreRing = new Mesh(new TorusGeometry(0.18, 0.022, 5, 14), standardMaterial(accent));
    coreRing.rotation.x = Math.PI / 2;
    coreRing.position.set(0, 0.68, 0.39);
    const breathDiamond = createFlatHex(0.05, 0xf9f7ef);
    breathDiamond.position.set(0, 0.86, 0.4);
    group.add(coreRing, breathDiamond);
  }

  if (definition.archetype === 'runner') {
    const calfLeft = box(
      0.08 * calfMass,
      0.18 * (0.85 + (calfScale - 1) * 0.2),
      0.07,
      accent,
      -0.17,
      0.26,
      0.1
    );
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
    const shoulderRingA = new Mesh(
      new TorusGeometry(0.13, 0.025, 5, 12),
      standardMaterial(accent)
    );
    shoulderRingA.position.set(-0.39, 0.92, 0.07);
    shoulderRingA.rotation.y = Math.PI / 2;
    const shoulderRingB = shoulderRingA.clone();
    shoulderRingB.position.x = 0.39;
    const cadenceCore = createFlatHex(0.09, 0xf9f7ef);
    cadenceCore.position.set(0, 0.67, 0.39);
    group.add(shoulderRingA, shoulderRingB, cadenceCore);
  }

  if (definition.archetype === 'climber') {
    const forearmLeft = box(0.09 * (0.82 + (calfScale - 1) * 0.1), 0.24, 0.07, accent, -0.4, 0.82, 0.08);
    forearmLeft.rotation.z = 0.45;
    const forearmRight = forearmLeft.clone();
    forearmRight.position.x = 0.4;
    forearmRight.rotation.z = -0.45;
    const gripCore = createFlatHex(0.08, 0xf9f7ef);
    gripCore.position.set(0, 0.7, 0.39);
    group.add(forearmLeft, forearmRight, gripCore);
  }
}

function addBuddySpeciesFeatures(group: Group, definition: BuddyDefinition): void {
  const base = definition.color;
  const accent = definition.accent;

  if (definition.species === 'bunny') {
    const outerEar = new Mesh(new CylinderGeometry(0.028, 0.06, 0.34, 5), standardMaterial(accent));
    outerEar.position.set(-0.12, 1.46, 0.08);
    outerEar.rotation.z = -0.28;
    outerEar.rotation.x = -0.12;
    const outerEarRight = outerEar.clone();
    outerEarRight.position.x = 0.12;
    outerEarRight.rotation.z = 0.28;
    const earInner = new Mesh(new CylinderGeometry(0.018, 0.032, 0.22, 4), standardMaterial(0xf7e8d5));
    earInner.position.set(-0.12, 1.54, 0.11);
    earInner.rotation.set(-0.12, 0, -0.28);
    const earInnerRight = earInner.clone();
    earInnerRight.position.x = 0.12;
    earInnerRight.rotation.z = 0.28;
    const muzzle = new Mesh(new BoxGeometry(0.18, 0.09, 0.08), standardMaterial(base));
    muzzle.position.set(0, 1.11, 0.56);
    const nose = new Mesh(new SphereGeometry(0.022, 7, 5), standardMaterial(0x2e241f));
    nose.position.set(0, 1.1, 0.63);
    const tail = new Mesh(new CylinderGeometry(0.03, 0.008, 0.2, 6), standardMaterial(accent));
    tail.position.set(0, 0.62, -0.38);
    tail.rotation.x = -0.9;
    tail.rotation.z = 0.3;
    group.add(outerEar, outerEarRight, earInner, earInnerRight, muzzle, nose, tail);
    return;
  }

  if (definition.species === 'bear') {
    const ear = new Mesh(new CylinderGeometry(0.11, 0.14, 0.19, 7), standardMaterial(base));
    ear.position.set(-0.21, 1.53, 0.05);
    ear.rotation.z = -0.22;
    const rightEar = ear.clone();
    rightEar.position.x = 0.21;
    rightEar.rotation.z = 0.22;
    const snout = new Mesh(new BoxGeometry(0.24, 0.12, 0.22), standardMaterial(accent));
    snout.position.set(0, 1.06, 0.56);
    const snoutTip = new Mesh(new SphereGeometry(0.05, 8, 6), standardMaterial(0x2d221b));
    snoutTip.position.set(0, 1.07, 0.65);
    const brow = box(0.16, 0.07, 0.06, 0x2d221b, 0, 1.07, 0.46);
    const jaw = createFlatHex(0.07, 0x5d4536);
    jaw.position.set(0, 0.98, 0.53);
    group.add(ear, rightEar, snout, snoutTip, brow, jaw);
    return;
  }

  if (definition.species === 'fox') {
    const ear = new Mesh(new CylinderGeometry(0.028, 0.008, 0.21, 4), standardMaterial(base));
    ear.position.set(-0.11, 1.47, 0.07);
    ear.rotation.z = -0.42;
    ear.rotation.x = 0.1;
    const rightEar = ear.clone();
    rightEar.position.x = 0.11;
    rightEar.rotation.z = 0.42;
    const muzzle = new Mesh(new BoxGeometry(0.18, 0.08, 0.13), standardMaterial(accent));
    muzzle.position.set(0, 1.08, 0.56);
    const muzzleTip = new Mesh(new SphereGeometry(0.03, 8, 6), standardMaterial(0x3f2f2c));
    muzzleTip.position.set(0, 1.07, 0.65);
    const tail = new Mesh(new CylinderGeometry(0.05, 0.03, 0.58, 7), standardMaterial(base));
    tail.position.set(-0.16, 0.52, -0.36);
    tail.rotation.x = 0.5;
    tail.rotation.z = -0.9;
    const tailTip = new Mesh(new SphereGeometry(0.12, 7, 6), standardMaterial(accent));
    tailTip.position.set(-0.48, 0.79, -0.58);
    const cheek = box(0.1, 0.03, 0.16, 0x3d2d2b, 0, 0.84, 0.24);
    group.add(ear, rightEar, muzzle, muzzleTip, tail, tailTip, cheek);
    return;
  }

  if (definition.species === 'rhino') {
    const horn = new Mesh(new CylinderGeometry(0.05, 0.016, 0.46, 6), standardMaterial(0xd8cfb3));
    horn.position.set(0, 1.41, 0.16);
    horn.rotation.x = Math.PI / 2;
    const hornTip = new Mesh(new SphereGeometry(0.03, 8, 6), standardMaterial(0xe9ded2));
    hornTip.position.set(0, 1.67, 0.27);
    const muzzle = new Mesh(new BoxGeometry(0.3, 0.11, 0.08), standardMaterial(accent));
    muzzle.position.set(0, 1.03, 0.62);
    const brow = box(0.28, 0.08, 0.1, base, 0, 1.08, 0.48);
    const neck = new Mesh(new CylinderGeometry(0.13, 0.13, 0.28, 8), standardMaterial(accent));
    neck.position.set(0, 0.83, 0.06);
    neck.rotation.x = 0.2;
    group.add(horn, hornTip, muzzle, brow, neck);
    return;
  }

  if (definition.species === 'panther') {
    const ear = new Mesh(new BoxGeometry(0.03, 0.19, 0.05), standardMaterial(base));
    ear.position.set(-0.11, 1.46, 0.06);
    ear.rotation.z = -0.4;
    ear.rotation.x = -0.12;
    const rightEar = ear.clone();
    rightEar.position.x = 0.11;
    rightEar.rotation.z = 0.4;
    const tail = new Mesh(new CylinderGeometry(0.035, 0.019, 0.66, 8), standardMaterial(accent));
    tail.position.set(0.19, 0.47, -0.36);
    tail.rotation.x = 0.44;
    tail.rotation.z = -0.7;
    const tailTip = new Mesh(new SphereGeometry(0.11, 6, 5), standardMaterial(base));
    tailTip.position.set(0.54, 0.82, -0.62);
    const stripeA = box(0.05, 0.18, 0.04, 0x1f2633, 0, 0.72, -0.05);
    const stripeB = box(0.05, 0.14, 0.04, 0x1f2633, 0, 0.84, 0.13);
    const stripeC = box(0.05, 0.1, 0.04, 0x1f2633, 0, 0.78, 0.3);
    group.add(ear, rightEar, tail, tailTip, stripeA, stripeB, stripeC);
    return;
  }

  if (definition.species === 'corgi') {
    const ear = new Mesh(new CylinderGeometry(0.026, 0.07, 0.2, 4), standardMaterial(0x6f5234));
    ear.position.set(-0.11, 1.5, 0.12);
    ear.rotation.z = -0.28;
    const earRight = ear.clone();
    earRight.position.x = 0.11;
    earRight.rotation.z = 0.28;
    const muzzle = new Mesh(new BoxGeometry(0.16, 0.08, 0.08), standardMaterial(base));
    muzzle.position.set(0, 1.12, 0.58);
    const nose = new Mesh(new BoxGeometry(0.028, 0.018, 0.03), standardMaterial(0x2b1f1a));
    nose.position.set(0, 1.11, 0.65);
    const patch = box(0.12, 0.03, 0.26, 0x6f5234, 0, 1.02, 0.14);
    const tail = new Mesh(new CylinderGeometry(0.05, 0.02, 0.24, 6), standardMaterial(accent));
    tail.position.set(0.05, 0.56, -0.42);
    tail.rotation.set(-1.18, 0, 0.12);
    const tailTip = new Mesh(new SphereGeometry(0.07, 6, 5), standardMaterial(0x5c422b));
    tailTip.position.set(-0.02, 0.34, -0.5);
    const chestBand = box(0.09, 0.06, 0.1, definition.accent, 0, 0.8, 0.02);
    group.add(ear, earRight, muzzle, nose, patch, tail, tailTip, chestBand);
    return;
  }

  if (definition.species === 'deer') {
    const antler = new Mesh(new CylinderGeometry(0.04, 0.015, 0.34, 5), standardMaterial(0xd7c1a0));
    antler.position.set(-0.1, 1.54, 0.19);
    antler.rotation.z = -0.5;
    antler.rotation.x = 0.1;
    const antlerLeftTip = new Mesh(new CylinderGeometry(0.025, 0.01, 0.2, 4), standardMaterial(0xe9dece));
    antlerLeftTip.position.set(-0.22, 1.68, 0.17);
    antlerLeftTip.rotation.z = -0.7;
    const antlerR = antler.clone();
    const antlerRTip = antlerLeftTip.clone();
    antlerR.position.x = 0.1;
    antlerR.rotation.z = 0.5;
    antlerRTip.position.x = 0.22;
    antlerRTip.rotation.z = 0.7;
    const muzzle = new Mesh(new BoxGeometry(0.17, 0.08, 0.07), standardMaterial(base));
    muzzle.position.set(0, 1.07, 0.61);
    const snout = new Mesh(new SphereGeometry(0.036, 7, 6), standardMaterial(0x2f241f));
    snout.position.set(0, 1.06, 0.68);
    const dewlap = box(0.1, 0.09, 0.22, 0x6e5540, 0, 0.77, -0.14);
    group.add(antler, antlerR, antlerLeftTip, antlerRTip, muzzle, snout, dewlap);
    return;
  }

  if (definition.species === 'jaguar') {
    const ear = new Mesh(new BoxGeometry(0.045, 0.17, 0.07), standardMaterial(base));
    ear.position.set(-0.09, 1.47, 0.06);
    ear.rotation.z = -0.37;
    const earRight = ear.clone();
    earRight.position.x = 0.09;
    earRight.rotation.z = 0.37;
    const muzzle = new Mesh(new CylinderGeometry(0.08, 0.10, 0.08, 6), standardMaterial(base));
    muzzle.position.set(0, 1.11, 0.58);
    muzzle.rotation.x = Math.PI / 2;
    const nose = new Mesh(new SphereGeometry(0.028, 7, 5), standardMaterial(0x3f2e2d));
    nose.position.set(0, 1.11, 0.66);
    const stripeA = box(0.08, 0.17, 0.06, 0x2c3f2f, -0.14, 0.86, 0.12);
    const stripeB = box(0.08, 0.17, 0.06, 0x2c3f2f, 0.16, 0.9, 0.26);
    const tail = new Mesh(new CylinderGeometry(0.045, 0.018, 0.52, 8), standardMaterial(0xbf5a3c));
    tail.position.set(0.23, 0.5, -0.34);
    tail.rotation.set(0.5, 0, -0.42);
    const tailTip = new Mesh(new SphereGeometry(0.09, 7, 5), standardMaterial(0x6d3d2a));
    tailTip.position.set(0.58, 0.78, -0.56);
    group.add(ear, earRight, muzzle, nose, stripeA, stripeB, tail, tailTip);
    return;
  }

  if (definition.species === 'penguin') {
    const beak = new Mesh(new CylinderGeometry(0.03, 0.075, 0.16, 4), standardMaterial(definition.accent));
    beak.position.set(0, 1.07, 0.66);
    beak.rotation.x = Math.PI / 2;
    const eyeBand = box(0.16, 0.03, 0.05, 0x1f1f23, 0, 1.2, 0.49);
    const flapL = new Mesh(new BoxGeometry(0.08, 0.15, 0.05), standardMaterial(accent));
    flapL.position.set(-0.16, 1, 0.14);
    flapL.rotation.z = 0.28;
    const flapR = flapL.clone();
    flapR.position.x = 0.16;
    flapR.rotation.z = -0.28;
    const belly = box(0.07, 0.22, 0.25, 0xf8f8f8, 0, 0.95, 0.11);
    const headSpot = box(0.08, 0.03, 0.13, 0x253445, 0, 1.16, 0.46);
    group.add(beak, eyeBand, flapL, flapR, belly, headSpot);
    return;
  }

  if (definition.species === 'raccoon') {
    const ear = new Mesh(new CylinderGeometry(0.026, 0.056, 0.16, 4), standardMaterial(0x4f3c2d));
    ear.position.set(-0.08, 1.48, 0.08);
    ear.rotation.z = -0.28;
    const earRight = ear.clone();
    earRight.position.x = 0.08;
    earRight.rotation.z = 0.28;
    const mask = box(0.14, 0.08, 0.16, 0x2b1f1a, 0, 1.15, 0.24);
    const muzzle = new Mesh(new BoxGeometry(0.15, 0.06, 0.07), standardMaterial(base));
    muzzle.position.set(0, 1.08, 0.56);
    const stripe = new Mesh(new BoxGeometry(0.18, 0.015, 0.14), standardMaterial(0x1a1a1a));
    stripe.position.set(0, 1.03, 0.3);
    const tail = new Mesh(new CylinderGeometry(0.06, 0.018, 0.46, 6), standardMaterial(accent));
    tail.position.set(-0.17, 0.56, -0.36);
    tail.rotation.set(0.3, 0.15, -0.72);
    const tailTip = new Mesh(new SphereGeometry(0.1, 6, 5), standardMaterial(0xeed4be));
    tailTip.position.set(-0.44, 0.86, -0.64);
    group.add(ear, earRight, mask, muzzle, stripe, tail, tailTip);
    return;
  }

  if (definition.species === 'squirrel') {
    const ear = new Mesh(new CylinderGeometry(0.025, 0.054, 0.16, 4), standardMaterial(0xd5a679));
    ear.position.set(-0.095, 1.49, 0.1);
    ear.rotation.z = -0.12;
    const earRight = ear.clone();
    earRight.position.x = 0.095;
    earRight.rotation.z = 0.12;
    const muzzle = new Mesh(new BoxGeometry(0.12, 0.07, 0.06), standardMaterial(base));
    muzzle.position.set(0, 1.12, 0.57);
    const whisker = box(0.16, 0.02, 0.08, 0x2f251f, 0, 1.12, 0.27);
    const tail = new Mesh(new CylinderGeometry(0.08, 0.025, 0.6, 8), standardMaterial(accent));
    tail.position.set(0, 0.6, -0.36);
    tail.rotation.set(0.42, 0.15, -0.35);
    const tailTip = new Mesh(new SphereGeometry(0.1, 7, 6), standardMaterial(0x9b6447));
    tailTip.position.set(0.05, 0.92, -0.72);
    const cheek = box(0.08, 0.03, 0.08, 0x7f5c43, 0, 0.86, 0.2);
    group.add(ear, earRight, muzzle, whisker, tail, tailTip, cheek);
    return;
  }

  if (definition.species === 'tiger') {
    const ear = new Mesh(new BoxGeometry(0.035, 0.18, 0.06), standardMaterial(0x2d231f));
    ear.position.set(-0.105, 1.44, 0.07);
    ear.rotation.z = -0.3;
    const earRight = ear.clone();
    earRight.position.x = 0.105;
    earRight.rotation.z = 0.3;
    const muzzle = new Mesh(new CylinderGeometry(0.07, 0.1, 0.08, 6), standardMaterial(base));
    muzzle.position.set(0, 1.07, 0.58);
    muzzle.rotation.x = Math.PI / 2;
    const nose = new Mesh(new SphereGeometry(0.026, 6, 5), standardMaterial(0x1f1817));
    nose.position.set(0, 1.07, 0.65);
    const stripeA = box(0.06, 0.13, 0.04, 0x2d2c2c, 0, 0.83, 0.12);
    const stripeB = box(0.06, 0.13, 0.04, 0x2d2c2c, 0.15, 0.87, 0.3);
    const stripeC = box(0.06, 0.13, 0.04, 0x2d2c2c, -0.15, 0.9, 0.3);
    const tail = new Mesh(new CylinderGeometry(0.045, 0.022, 0.58, 8), standardMaterial(0xaa5f43));
    tail.position.set(0.21, 0.5, -0.34);
    tail.rotation.set(0.2, 0, -0.6);
    const tailTip = new Mesh(new SphereGeometry(0.1, 6, 5), standardMaterial(0x8c4430));
    tailTip.position.set(0.63, 0.73, -0.55);
    group.add(ear, earRight, muzzle, nose, stripeA, stripeB, stripeC, tail, tailTip);
    return;
  }

  if (definition.species === 'buffalo') {
    const horn = new Mesh(new CylinderGeometry(0.045, 0.02, 0.34, 6), standardMaterial(0xd9cfb9));
    horn.position.set(-0.08, 1.54, 0.18);
    horn.rotation.x = Math.PI / 2;
    const hornTip = new Mesh(new CylinderGeometry(0.026, 0.026, 0.07, 6), standardMaterial(0xf3e8d0));
    hornTip.position.set(-0.08, 1.76, 0.19);
    const hornR = horn.clone();
    const hornTipR = hornTip.clone();
    hornR.position.x = 0.08;
    hornTipR.position.x = 0.08;
    const hump = box(0.26, 0.17, 0.34, accent, 0, 0.94, -0.06);
    const muzzle = new Mesh(new BoxGeometry(0.23, 0.09, 0.07), standardMaterial(base));
    muzzle.position.set(0, 1.02, 0.6);
    const jaw = box(0.17, 0.06, 0.14, 0x5e4735, 0, 0.95, 0.2);
    const dewlap = box(0.09, 0.08, 0.18, 0x8d6d4d, 0, 0.74, -0.16);
    group.add(horn, hornR, hornTip, hornTipR, hump, muzzle, jaw, dewlap);
    return;
  }

  if (definition.species === 'griffin') {
    const face = new Mesh(new BoxGeometry(0.2, 0.11, 0.06), standardMaterial(base));
    face.position.set(0, 1.14, 0.58);
    face.rotation.x = -0.15;
    const beak = new Mesh(new CylinderGeometry(0.028, 0.08, 0.2, 5), standardMaterial(accent));
    beak.position.set(0, 1.04, 0.69);
    beak.rotation.x = Math.PI / 2;
    const crest = new Mesh(new BoxGeometry(0.18, 0.05, 0.06), standardMaterial(definition.accent));
    crest.position.set(0, 1.29, 0.08);
    crest.rotation.z = 0.16;
    const wingL = new Mesh(new TorusGeometry(0.28, 0.06, 5, 12), standardMaterial(accent));
    wingL.position.set(-0.34, 0.78, -0.22);
    wingL.rotation.z = 1.4;
    wingL.rotation.y = -1.32;
    const wingR = wingL.clone();
    wingR.position.x = 0.34;
    wingR.rotation.z = -1.4;
    wingR.rotation.y = 1.32;
    const talonLeft = new Mesh(new BoxGeometry(0.14, 0.1, 0.09), standardMaterial(accent));
    talonLeft.position.set(-0.08, 0.18, -0.46);
    talonLeft.rotation.z = 0.22;
    const talonRight = talonLeft.clone();
    talonRight.position.x = 0.08;
    talonRight.rotation.z = -0.22;
    const wingStrip = box(0.05, 0.02, 0.46, 0xa98b6f, 0.03, 0.3, -0.08);
    wingStrip.rotation.y = Math.PI / 2;
    group.add(face, beak, crest, wingL, wingR, talonLeft, talonRight, wingStrip);
    return;
  }

  if (definition.species === 'minotaur') {
    const hornLeft = new Mesh(new CylinderGeometry(0.052, 0.01, 0.4, 6), standardMaterial(0xf3e5bd));
    hornLeft.position.set(-0.1, 1.54, 0.22);
    hornLeft.rotation.x = -0.5;
    const hornRight = hornLeft.clone();
    hornRight.position.x = 0.1;
    hornRight.rotation.x = -0.5;
    const hornCrest = new Mesh(new BoxGeometry(0.22, 0.08, 0.07), standardMaterial(0x69452c));
    hornCrest.position.set(0, 1.38, 0.16);
    const mane = box(0.26, 0.14, 0.08, base, 0, 1.28, 0.12);
    mane.rotation.z = 0.2;
    const snout = new Mesh(new BoxGeometry(0.2, 0.1, 0.08), standardMaterial(base));
    snout.position.set(0, 1.06, 0.6);
    const fangL = new Mesh(new CylinderGeometry(0.015, 0.005, 0.06, 4), standardMaterial(0xf9f7ef));
    fangL.position.set(-0.045, 1.05, 0.68);
    const fangR = fangL.clone();
    fangR.position.x = 0.045;
    const loin = box(0.1, 0.08, 0.18, 0x6b3f2f, 0, 0.58, -0.15);
    group.add(hornLeft, hornRight, hornCrest, mane, snout, fangL, fangR, loin);
    return;
  }

  if (definition.species === 'dragon') {
    const hornBase = new Mesh(new CylinderGeometry(0.06, 0.02, 0.28, 6), standardMaterial(0xc9b58c));
    hornBase.position.set(0, 1.5, 0.14);
    const hornTip = new Mesh(new SphereGeometry(0.055, 7, 6), standardMaterial(0xf4ecd7));
    hornTip.position.set(0, 1.74, 0.3);
    const snout = new Mesh(new CylinderGeometry(0.1, 0.15, 0.26, 7), standardMaterial(base));
    snout.position.set(0, 1.04, 0.59);
    snout.rotation.x = Math.PI / 2;
    const crest = new Mesh(new BoxGeometry(0.32, 0.08, 0.12), standardMaterial(0x5e4738));
    crest.position.set(0, 1.36, 0.25);
    crest.rotation.z = -0.22;
    const scaleRowA = box(0.08, 0.1, 0.58, accent, -0.02, 0.62, -0.56);
    scaleRowA.rotation.x = 0.3;
    const scaleRowB = scaleRowA.clone();
    scaleRowB.position.set(0.02, 0.52, -0.58);
    const tail = new Mesh(new CylinderGeometry(0.06, 0.03, 0.62, 7), standardMaterial(base));
    tail.position.set(0, 0.33, -0.66);
    tail.rotation.x = 0.32;
    const tailTip = new Mesh(new SphereGeometry(0.1, 6, 5), standardMaterial(accent));
    tailTip.position.set(0, 0.66, -1.08);
    group.add(hornBase, hornTip, snout, crest, scaleRowA, scaleRowB, tail, tailTip);
    return;
  }

  if (definition.species === 'cyclops') {
    const brow = new Mesh(new BoxGeometry(0.34, 0.09, 0.06), standardMaterial(0x5c4130));
    brow.position.set(0, 1.3, 0.15);
    brow.rotation.z = -0.06;
    const eyeSocket = new Mesh(new CylinderGeometry(0.11, 0.11, 0.05, 8), standardMaterial(definition.accent));
    eyeSocket.position.set(0, 1.25, 0.44);
    eyeSocket.rotation.x = Math.PI / 2;
    const eye = new Mesh(new SphereGeometry(0.045, 7, 5), standardMaterial(0xf0efda));
    eye.position.set(0, 1.25, 0.53);
    const muzzle = new Mesh(new BoxGeometry(0.24, 0.1, 0.1), standardMaterial(base));
    muzzle.position.set(0, 1.01, 0.6);
    const cheek = box(0.11, 0.03, 0.08, 0x5e3f2e, 0, 0.9, 0.2);
    const crest = new Mesh(new CylinderGeometry(0.055, 0.015, 0.46, 6), standardMaterial(accent));
    crest.position.set(0, 1.45, 0.02);
    crest.rotation.z = Math.PI / 2;
    group.add(brow, eyeSocket, eye, muzzle, cheek, crest);
    return;
  }

  if (definition.species === 'hydra') {
    const mainJaw = new Mesh(new SphereGeometry(0.05, 7, 5), standardMaterial(base));
    mainJaw.position.set(0, 1.05, 0.65);
    const headLeft = new Mesh(new SphereGeometry(0.04, 6, 5), standardMaterial(definition.accent));
    headLeft.position.set(-0.09, 1.1, 0.6);
    const headRight = new Mesh(new SphereGeometry(0.04, 6, 5), standardMaterial(definition.accent));
    headRight.position.set(0.09, 1.12, 0.59);
    const neck = new Mesh(new CylinderGeometry(0.05, 0.07, 0.3, 6), standardMaterial(0x7c5f53));
    neck.position.set(-0.09, 1.4, 0.5);
    neck.rotation.x = 0.22;
    const neckR = new Mesh(new CylinderGeometry(0.05, 0.07, 0.28, 6), standardMaterial(0x7c5f53));
    neckR.position.set(0.09, 1.38, 0.49);
    neckR.rotation.x = -0.08;
    const scaleRow = box(0.1, 0.11, 0.45, accent, 0, 0.95, -0.17);
    const headStripA = box(0.07, 0.09, 0.06, 0x5b433a, -0.12, 1.22, 0.39);
    const headStripB = box(0.07, 0.09, 0.06, 0x5b433a, 0.12, 1.21, 0.38);
    group.add(mainJaw, headLeft, headRight, neck, neckR, scaleRow, headStripA, headStripB);
    return;
  }

  if (definition.species === 'pegasus') {
    const wingL = new Mesh(new BoxGeometry(0.28, 0.08, 0.7), standardMaterial(0xd5b37b));
    wingL.position.set(-0.44, 0.94, -0.02);
    wingL.rotation.z = 1.28;
    wingL.rotation.y = -1.22;
    const wingR = wingL.clone();
    wingR.position.set(0.44, 0.94, -0.02);
    wingR.rotation.z = -1.28;
    wingR.rotation.y = 1.22;
    const wingTipL = new Mesh(new BoxGeometry(0.15, 0.06, 0.18), standardMaterial(accent));
    wingTipL.position.set(-0.72, 0.62, -0.24);
    wingTipL.rotation.z = 1.52;
    const wingTipR = wingTipL.clone();
    wingTipR.position.set(0.72, 0.62, -0.24);
    wingTipR.rotation.z = -1.52;
    const mane = new Mesh(new TorusGeometry(0.12, 0.03, 5, 10), standardMaterial(definition.accent));
    mane.position.set(0, 1.3, 0.07);
    mane.rotation.x = Math.PI / 2;
    group.add(wingL, wingR, wingTipL, wingTipR, mane);
    return;
  }

  if (definition.species === 'werewolf') {
    const ear = new Mesh(new BoxGeometry(0.045, 0.16, 0.05), standardMaterial(0x2f2b2a));
    ear.position.set(-0.08, 1.47, 0.08);
    ear.rotation.z = -0.28;
    const earR = ear.clone();
    earR.position.x = 0.08;
    earR.rotation.z = 0.28;
    const muzzle = new Mesh(new CylinderGeometry(0.06, 0.11, 0.08, 6), standardMaterial(base));
    muzzle.position.set(0, 1.08, 0.58);
    muzzle.rotation.x = Math.PI / 2;
    const clawL = new Mesh(new BoxGeometry(0.045, 0.07, 0.09), standardMaterial(base));
    clawL.position.set(-0.24, 0.34, 0.27);
    clawL.rotation.z = 0.2;
    const clawR = clawL.clone();
    clawR.position.x = 0.24;
    clawR.rotation.z = -0.2;
    const fur = box(0.18, 0.06, 0.08, 0x4c3c31, 0, 0.83, 0.01);
    group.add(ear, earR, muzzle, clawL, clawR, fur);
    return;
  }

  if (definition.species === 'kraken') {
    const beak = new Mesh(new CylinderGeometry(0.04, 0.07, 0.12, 5), standardMaterial(0x97a4b6));
    beak.position.set(0, 1.06, 0.61);
    beak.rotation.x = Math.PI / 2;
    const tentA = new Mesh(new CylinderGeometry(0.04, 0.012, 0.62, 6), standardMaterial(accent));
    tentA.position.set(-0.16, 0.4, -0.16);
    tentA.rotation.set(-0.2, 0, -0.26);
    const tentB = new Mesh(new CylinderGeometry(0.038, 0.012, 0.58, 6), standardMaterial(base));
    tentB.position.set(0, 0.43, -0.34);
    tentB.rotation.set(0.2, 0, 0.11);
    const tentC = new Mesh(new CylinderGeometry(0.038, 0.012, 0.54, 6), standardMaterial(0x6b7f96));
    tentC.position.set(0.17, 0.43, -0.24);
    tentC.rotation.set(-0.16, 0, 0.22);
    const tentTipA = new Mesh(new SphereGeometry(0.055, 6, 5), standardMaterial(0x3f5971));
    tentTipA.position.set(-0.18, 0.11, -0.58);
    const tentTipB = tentTipA.clone();
    tentTipB.position.set(0.17, 0.08, -0.7);
    tentTipB.scale.set(0.86, 0.86, 0.86);
    group.add(beak, tentA, tentB, tentC, tentTipA, tentTipB);
    return;
  }

  if (definition.species === 'sphinx') {
    const crest = new Mesh(new BoxGeometry(0.22, 0.12, 0.09), standardMaterial(0xefd89a));
    crest.position.set(0, 1.26, 0.13);
    crest.rotation.z = 0.12;
    const mane = new Mesh(new CylinderGeometry(0.15, 0.22, 0.16, 8), standardMaterial(0x65472c));
    mane.position.set(0, 1.17, 0.26);
    mane.rotation.x = Math.PI / 2;
    const brow = new Mesh(new BoxGeometry(0.16, 0.05, 0.06), standardMaterial(definition.accent));
    brow.position.set(0, 1.12, 0.48);
    const maneStrip = box(0.12, 0.08, 0.09, 0x8c684f, 0, 0.64, -0.04);
    const royal = new Mesh(new CylinderGeometry(0.05, 0.05, 0.16, 6), standardMaterial(0xd6a03c));
    royal.position.set(0, 1.34, 0.06);
    group.add(crest, mane, brow, maneStrip, royal);
    return;
  }

  if (definition.species === 'phoenix') {
    const beak = new Mesh(new CylinderGeometry(0.028, 0.06, 0.14, 5), standardMaterial(0x352117));
    beak.position.set(0, 1.07, 0.66);
    beak.rotation.x = Math.PI / 2;
    const featherA = new Mesh(new BoxGeometry(0.1, 0.03, 0.16), standardMaterial(0xffae60));
    featherA.position.set(-0.09, 1.11, 0.13);
    featherA.rotation.z = 0.42;
    const featherB = new Mesh(new BoxGeometry(0.1, 0.03, 0.16), standardMaterial(0xffd39a));
    featherB.position.set(0.09, 1.11, 0.13);
    featherB.rotation.z = -0.42;
    const plume = new Mesh(new CylinderGeometry(0.06, 0.01, 0.4, 6), standardMaterial(0xff7c3f));
    plume.position.set(0, 1.22, 0.32);
    plume.rotation.set(-0.3, 0, 0.1);
    const flameA = new Mesh(new SphereGeometry(0.07, 7, 6), standardMaterial(0xffd47a));
    flameA.position.set(-0.1, 0.98, 0.05);
    const flameB = new Mesh(new SphereGeometry(0.07, 7, 6), standardMaterial(0xff9b4d));
    flameB.position.set(0.11, 0.96, 0.02);
    const plumeTip = new Mesh(new SphereGeometry(0.05, 6, 5), standardMaterial(0xff5f37));
    plumeTip.position.set(0, 0.78, 0.01);
    group.add(beak, featherA, featherB, plume, flameA, flameB, plumeTip);
    return;
  }

  const shoulderCapL = new Mesh(
    new CylinderGeometry(0.24, 0.16, 0.18, 6),
    standardMaterial(accent)
  );
  shoulderCapL.position.set(-0.5, 0.82, -0.01);
  shoulderCapL.rotation.z = 0.15;
  const shoulderCapR = shoulderCapL.clone();
  shoulderCapR.position.x = 0.5;
  shoulderCapR.rotation.z = -0.15;
  const armAnchorL = box(0.2, 0.56, 0.09, definition.color, -0.56, 0.55, 0.03);
  const armAnchorR = armAnchorL.clone();
  armAnchorR.position.x = 0.56;
  const face = new Mesh(new BoxGeometry(0.22, 0.11, 0.14), standardMaterial(base));
  face.position.set(0, 1.02, 0.54);
  const brow = createFlatHex(0.06, 0x2f2b2b);
  brow.position.set(0, 1.08, 0.45);
  const jaw = new Mesh(new CylinderGeometry(0.09, 0.09, 0.07, 7), standardMaterial(accent));
  jaw.position.set(0, 0.94, 0.57);
  group.add(shoulderCapL, shoulderCapR, armAnchorL, armAnchorR, face, brow, jaw);
}

function isExoticBuddyDefinition(definition: BuddyDefinition): boolean {
  return definition.rarity === 'exotic' || definition.isExotic === true;
}

function addExoticBuddyAura(group: Group, definition: BuddyDefinition): void {
  const halo = new Mesh(new TorusGeometry(0.82, 0.05, 6, 22), basicMaterial(definition.accent, 0.34));
  halo.position.set(0, 0.94, 0.34);
  halo.rotation.x = Math.PI / 2;

  const core = new Mesh(new TorusGeometry(0.57, 0.03, 5, 18), basicMaterial(definition.accent, 0.24));
  core.position.set(0, 1.33, 0.64);
  core.rotation.x = Math.PI / 2;

  const baseOutline = new Mesh(new TorusGeometry(0.74, 0.025, 6, 24), basicMaterial(0xf9f7ef, 0.42));
  baseOutline.position.set(0, 0.08, 0);
  baseOutline.rotation.x = Math.PI / 2;

  const shoulderOutline = new Mesh(new TorusGeometry(0.65, 0.022, 6, 18), basicMaterial(definition.accent, 0.28));
  shoulderOutline.position.set(0, 0.88, 0.05);
  shoulderOutline.rotation.x = Math.PI / 2;

  const marker = new Mesh(new SphereGeometry(0.12, 8, 5), standardMaterial(definition.accent));
  marker.position.set(0, 1.34, 0.68);

  group.add(halo, core, baseOutline, shoulderOutline, marker);
}

export function createBuddyMesh(
  definition: BuddyDefinition,
  traits: BuddyBodyTraits = DEFAULT_BUDDY_BODY_TRAITS
): Group {
  const safeTraits = { ...DEFAULT_BUDDY_BODY_TRAITS, ...traits };
  const group = new Group();
  const id = definition.id;
  const species = definition.species ?? id;
  const isExotic = isExoticBuddyDefinition(definition);
  const outline = 0x141d33;
  const color = definition.color;
  const accent = definition.accent;
  const chestBoost = Math.max(0.92, Math.min(1.28, safeTraits.chest));
  const armBoost = Math.max(0.92, Math.min(1.35, (safeTraits.chest + safeTraits.wings) * 0.5));
  const legBoost = Math.max(0.92, Math.min(1.24, safeTraits.thighs));
  const shadow = new Mesh(new CylinderGeometry(0.72, 0.72, 0.035, 16), basicMaterial(outline, 0.32));
  shadow.scale.set(isExotic ? 1.62 : 1.32, 1, isExotic ? 0.52 : 0.44);
  shadow.rotation.x = Math.PI / 2;
  shadow.position.y = 0.025;
  group.add(shadow);
  const addFlat = (width: number, height: number, depth: number, partColor: number, x: number, y: number, z: number): Mesh => {
    const back = box(width + 0.11, height + 0.11, depth + 0.045, outline, x, y, z - 0.055);
    const front = box(width, height, depth, partColor, x, y, z);
    group.add(back, front);
    return front;
  };
  const addOrb = (radius: number, partColor: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 0.55): Mesh => {
    const back = new Mesh(new IcosahedronGeometry(radius * 1.1, 0), standardMaterial(outline));
    back.scale.set(sx, sy, sz);
    back.position.set(x, y, z - 0.055);
    const front = new Mesh(new IcosahedronGeometry(radius, 0), standardMaterial(partColor));
    front.scale.set(sx, sy, sz);
    front.position.set(x, y, z);
    group.add(back, front);
    return front;
  };
  const addCone = (radius: number, height: number, partColor: number, x: number, y: number, z: number, sides = 4): Mesh => {
    const feature = cylinder(0.02, radius, height, partColor, sides);
    feature.position.set(x, y, z);
    group.add(feature);
    return feature;
  };
  const torsoWidth = isExotic ? 0.9 : 0.72;
  const torsoHeight = isExotic ? 0.92 : 0.76;
  addFlat(torsoWidth * chestBoost, torsoHeight, 0.19, color, 0, 0.75, 0.02);
  addFlat(torsoWidth * 1.18 * chestBoost, 0.28, 0.22, accent, 0, 1.02, 0.07);
  addFlat(0.16, 0.36 * legBoost, 0.15, color, -0.22, 0.27, 0.02);
  addFlat(0.16, 0.36 * legBoost, 0.15, color, 0.22, 0.27, 0.02);
  const leftArm = addFlat(0.24 * armBoost, 0.62, 0.16, color, -0.55, 0.76, 0.04);
  leftArm.rotation.z = -0.18;
  const rightArm = addFlat(0.24 * armBoost, 0.62, 0.16, color, 0.55, 0.76, 0.04);
  rightArm.rotation.z = 0.18;
  addOrb(isExotic ? 0.34 : 0.29, color, 0, isExotic ? 1.43 : 1.32, 0.07, 1.05, 0.92, 0.58);
  addFlat(0.09, 0.09, 0.07, outline, -0.1, isExotic ? 1.44 : 1.32, 0.22);
  addFlat(0.09, 0.09, 0.07, outline, 0.1, isExotic ? 1.44 : 1.32, 0.22);
  const addRoundEar = (x: number, y: number, scale = 1): void => {
    addOrb(0.13 * scale, color, x, y, 0.05, 0.95, 1, 0.42);
  };
  const addPointEar = (x: number, y: number, angle: number, scale = 1): void => {
    const ear = addCone(0.14 * scale, 0.38 * scale, color, x, y, 0.04, 3);
    ear.rotation.z = angle;
  };
  const addTail = (x: number, y: number, z: number, tailColor: number, length: number, angle: number): void => {
    const tail = cylinder(0.08, 0.15, length, tailColor, 6);
    tail.rotation.z = angle;
    tail.position.set(x, y, z);
    group.add(tail);
  };
  const addWing = (side: -1 | 1, wingColor = accent, tall = false): void => {
    const upper = addFlat(tall ? 0.34 : 0.46, tall ? 0.86 : 0.58, 0.1, wingColor, side * 0.72, 1.05, -0.03);
    upper.rotation.z = side * (tall ? -0.55 : -0.38);
    const tip = addCone(tall ? 0.18 : 0.16, tall ? 0.52 : 0.38, wingColor, side * 1.0, tall ? 0.88 : 0.82, -0.02, 3);
    tip.rotation.z = side * 0.6;
  };
  if (id.includes('bunny') || species.includes('bunny')) {
    const earLeft = addFlat(0.13, 0.72, 0.1, color, -0.16, 1.88, 0.02);
    earLeft.rotation.z = -0.13;
    const earRight = addFlat(0.13, 0.72, 0.1, color, 0.16, 1.88, 0.02);
    earRight.rotation.z = 0.13;
    addOrb(0.16, 0xffffff, 0.42, 0.58, -0.08, 1, 1, 0.42);
  } else if (id.includes('bear')) {
    addRoundEar(-0.24, 1.58, 1.1);
    addRoundEar(0.24, 1.58, 1.1);
    addFlat(0.32, 0.16, 0.13, accent, 0, 1.22, 0.25);
    addFlat(1.02, 0.22, 0.22, accent, 0, 1.1, 0.11);
  } else if (id.includes('fox')) {
    addPointEar(-0.22, 1.64, -0.34, 1.05);
    addPointEar(0.22, 1.64, 0.34, 1.05);
    addTail(-0.62, 0.72, -0.12, accent, 0.95, -0.9);
    addFlat(0.24, 0.14, 0.12, 0xffffff, 0, 1.2, 0.24);
  } else if (id.includes('rhino')) {
    const horn = addCone(0.12, 0.5, 0xf8f0d0, 0, 1.34, 0.34, 5);
    horn.rotation.x = Math.PI / 2;
    addRoundEar(-0.28, 1.58, 0.9);
    addRoundEar(0.28, 1.58, 0.9);
    addFlat(1.08, 0.38, 0.2, accent, 0, 0.98, 0.09);
  } else if (id.includes('panther')) {
    addPointEar(-0.22, 1.6, -0.25, 0.88);
    addPointEar(0.22, 1.6, 0.25, 0.88);
    addTail(0.64, 0.65, -0.12, accent, 1.05, 0.88);
    addFlat(0.72, 0.16, 0.2, accent, 0, 1.04, 0.1);
  } else if (id.includes('gorilla')) {
    addRoundEar(-0.34, 1.4, 0.95);
    addRoundEar(0.34, 1.4, 0.95);
    addFlat(0.34, 0.78, 0.18, color, -0.74, 0.6, 0.08).rotation.z = 0.22;
    addFlat(0.34, 0.78, 0.18, color, 0.74, 0.6, 0.08).rotation.z = -0.22;
    addFlat(1.12, 0.36, 0.22, accent, 0, 1.03, 0.12);
  } else if (id.includes('minotaur')) {
    const hornLeft = addCone(0.1, 0.58, 0xf8f0d0, -0.28, 1.68, 0.05, 5);
    hornLeft.rotation.z = 0.72;
    const hornRight = addCone(0.1, 0.58, 0xf8f0d0, 0.28, 1.68, 0.05, 5);
    hornRight.rotation.z = -0.72;
    addFlat(1.14, 0.42, 0.24, accent, 0, 1.08, 0.12);
  } else if (id.includes('griffin')) {
    addWing(-1, accent, false);
    addWing(1, accent, false);
    const beak = addCone(0.13, 0.34, 0xffe56d, 0, 1.36, 0.34, 4);
    beak.rotation.x = Math.PI / 2;
    addPointEar(-0.19, 1.67, -0.18, 0.78);
    addPointEar(0.19, 1.67, 0.18, 0.78);
  } else if (id.includes('dragon')) {
    addWing(-1, accent, true);
    addWing(1, accent, true);
    addTail(0.68, 0.58, -0.18, accent, 1.18, 0.84);
    const hornLeft = addCone(0.07, 0.36, 0xf8f0d0, -0.16, 1.72, 0.05, 4);
    hornLeft.rotation.z = 0.26;
    const hornRight = addCone(0.07, 0.36, 0xf8f0d0, 0.16, 1.72, 0.05, 4);
    hornRight.rotation.z = -0.26;
  } else if (id.includes('cyclops')) {
    addOrb(0.18, 0xffffff, 0, 1.42, 0.25, 1, 0.78, 0.32);
    addOrb(0.08, outline, 0, 1.42, 0.31, 1, 0.78, 0.32);
    const curlArm = new Mesh(new TorusGeometry(0.24, 0.055, 6, 18), standardMaterial(accent));
    curlArm.position.set(0.72, 1.0, 0.08);
    curlArm.rotation.y = Math.PI / 2;
    group.add(curlArm);
  } else {
    addPointEar(-0.2, 1.6, -0.25, 0.75);
    addPointEar(0.2, 1.6, 0.25, 0.75);
  }
  addBuddyMuscleFeatures(group, definition, safeTraits);
  if (isExotic) {
    group.scale.setScalar(1.24);
    addExoticBuddyAura(group, definition);
  }
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

export function createArmWrestleArmMesh(scale = 1): Group {
  const group = new Group();
  const outline = 0x162238;
  const skin = 0xffc58f;
  const wristband = 0xffe56d;
  const safeScale = scale > 1.5 ? 1.5 : scale < 0.6 ? 0.6 : scale;
  const addFlat = (width: number, height: number, depth: number, color: number, x: number, y: number, z: number): Mesh => {
    const back = box(width + 0.06, height + 0.06, depth + 0.04, outline, x, y, z - 0.035);
    const front = box(width, height, depth, color, x, y, z);
    group.add(back, front);
    return front;
  };
  addFlat(0.18, 0.14, 0.42, wristband, 0, 0.02, 0.06);
  addFlat(0.16, 0.16, 0.66, skin, 0, 0.02, 0.42);
  addFlat(0.28, 0.2, 0.24, skin, 0, 0.04, 0.82);
  addFlat(0.2, 0.18, 0.18, outline, 0, 0.03, 1.0);
  group.scale.setScalar(safeScale);
  return markShadows(group) as Group;
}

export function createBabyCryingDrops(): Group {
  const group = new Group();
  const material = new MeshBasicMaterial({
    color: 0x72d4ff,
    transparent: true,
    opacity: 0.92
  });
  for (let index = 0; index < 4; index += 1) {
    const drop = new Mesh(new IcosahedronGeometry(index < 2 ? 0.045 : 0.032, 0), material);
    drop.scale.set(0.75, 1.45, 0.35);
    drop.position.set(index % 2 === 0 ? -0.11 - index * 0.025 : 0.11 + index * 0.018, 0.04 - index * 0.04, 0.16);
    group.add(drop);
  }
  return markShadows(group) as Group;
}

export function createFreeWeightMesh(): Group {
  const group = new Group();
  const outline = 0x141d33;
  const metal = 0xf8e3a0;
  const accent = 0x24324a;
  const shadow = box(0.92, 0.035, 0.34, outline, 0.05, 0.02, 0.05);
  const gripBack = box(0.68, 0.08, 0.12, outline, 0, 0.12, -0.03);
  const grip = box(0.58, 0.055, 0.14, metal, 0, 0.14, 0.02);
  const plateA = box(0.18, 0.24, 0.16, accent, -0.42, 0.14, 0.02);
  const plateB = plateA.clone();
  plateB.position.x = 0.42;
  const shineA = box(0.08, 0.16, 0.18, 0xffffff, -0.42, 0.16, 0.12);
  const shineB = shineA.clone();
  shineB.position.x = 0.42;
  group.add(shadow, gripBack, grip, plateA, plateB, shineA, shineB);
  return markShadows(group) as Group;
}

export function createCaptureRing(color: number): Mesh {
  const material = new MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.86,
    depthWrite: false
  });
  const mat = new Mesh(new BoxGeometry(1.85, 0.045, 1.08), material);
  mat.position.y = 0.015;
  return mat;
}



