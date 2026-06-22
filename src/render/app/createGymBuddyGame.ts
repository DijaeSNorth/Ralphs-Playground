import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer
} from 'three';
import { getNearestWorkoutStation, WORKOUT_STATIONS } from '../../game/content/equipment';
import { getNearestVendingMachine, VENDING_MACHINES } from '../../game/content/vending';
import { InputController, type InputMode } from '../../game/input/actions';
import { GymBuddyWorld } from '../../game/simulation/world';
import type { ActionState, PlayerAppearance, Vec2, WorldEvent, WorldSnapshot } from '../../game/types';
import { GameHud } from '../../ui/hud';
import {
  clearProgressStorage,
  loadProgressFromStorage,
  saveProgressToStorage
} from '../../game/progress';
import {
  loadGameSettingsFromStorage,
  saveGameSettingsToStorage,
  type CameraDistanceSetting,
  type GameSettings
} from '../../game/settings';
import {
  createArena,
  createBuddyMesh,
  createCaptureRing,
  createArmWrestleArmMesh,
  createBabyCryingDrops,
  createBossMesh,
  createFreeWeightMesh,
  createGymProps,
  createPlayerMesh,
  createVendingMachines,
  createWorkoutEquipment
} from '../objects/lowPolyFactory';
import { getBuddyDefinition } from '../../game/content/buddies';
import { getBossDefinition } from '../../game/content/bosses';

type CaptureEffect = {
  age: number;
  duration: number;
  start: Vec2;
  target: Vec2;
  ringStart: Vec2;
  captureMidpoint: Vec2;
  ring: Mesh;
  success: boolean;
  style: 'arm-wrestle' | 'legacy';
  playerMesh?: Group;
  creatureMesh?: Group;
  playerArm?: Group;
  creatureArm?: Group;
  tears?: Group;
  playerHeading?: number;
  creatureHeading?: number;
  playerEnd?: Vec2;
  creatureEnd?: Vec2;
  playerBaseScale?: number;
  creatureBaseScale?: number;
  captureBeatSequence?: { at: number; text: string }[];
  captureBeatIndex?: number;
  struggleMeter?: number;
  struggleMomentum?: number;
};

type RenderCullable = {
  object: Object3D;
  renderDistance: number;
  center: Vec2;
};

type MovementBasis = {
  forward: Vec2;
  right: Vec2;
};

const BUDDY_RENDER_DISTANCE = 24;
const BUDDY_RENDER_DISTANCE_TOUCH = 18;
const DEFAULT_STATION_RENDER_DISTANCE = 25;
const DEFAULT_STATION_RENDER_DISTANCE_TOUCH = 21;
const WORLD_PIXEL_SCALE = 2.25;
const WORLD_PIXEL_SCALE_TOUCH = 2.85;
const PREVIEW_PIXEL_SCALE = 2.1;
const PREVIEW_PIXEL_SCALE_TOUCH = 2.6;
const RETRO_ARENA_SKY = 0x87c8ff;
const RETRO_CAMERA_OFFSET = 11.2;
const RETRO_CAMERA_HEIGHT = 10.9;
const RETRO_LOOK_AT_HEIGHT = 1.2;
const CUTSCENE_CAMERA_OFFSET = 5.6;
const CUTSCENE_CAMERA_HEIGHT = 5.5;
const CUTSCENE_LOOK_AT_HEIGHT = 0.62;
const CAPTURE_BEAT_TEXT_HOLD_SECONDS = 0.4;
const WRESTLE_STRUGGLE_METER_GAIN = 0.44;
const WRESTLE_STRUGGLE_MOMENTUM_GAIN = 0.9;
const WRESTLE_STRUGGLE_METER_DECAY = 0.68;
const WRESTLE_STRUGGLE_MOMENTUM_DECAY = 1.2;
const WRESTLE_PIN_STRENGTH = 0.18;
const TUTORIAL_STEPS = [
  'Move around the gym and feel the floor rumble.',
  'Get near a wild gym beast.',
  "Read its level and catch chance.",
  'Start an arm-wrestle capture attempt.',
  'Win one to add a buddy to your crew.',
  'Use Steroids on a crew member.',
  'Find a rare exotic beast.'
];
const TUTORIAL_MOVE_DISTANCE = 0.95;
const TUTORIAL_BUDDY_READ_TIME = 0.45;
const TUTORIAL_EXOTIC_NOTICE_TIME = 0.7;
const CAMERA_DISTANCE_SETTINGS: Record<CameraDistanceSetting, { offset: number; height: number }> = {
  close: { offset: 0.82, height: 0.94 },
  normal: { offset: 1, height: 1 },
  far: { offset: 1.18, height: 1.08 }
};

class CharacterPreviewRenderer {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(34, 1, 0.1, 20);
  private readonly renderer: WebGLRenderer;
  private readonly anchor = new Group();
  private readonly platform = createCaptureRing(0xf6c85f);
  private readonly touchOptimized = shouldUseTouchRendering();
  private player = createPlayerMesh();
  private elapsed = 0;
  private width = 1;
  private height = 1;
  private previewRotation = -0.45;

  constructor(private readonly container: HTMLElement, private settings: GameSettings) {
    this.renderer = new WebGLRenderer({
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: 'default'
    });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
    });
    this.container.appendChild(this.renderer.domElement);

    this.scene.add(this.anchor);
    this.anchor.add(this.player);
    this.platform.position.y = -0.02;
    this.platform.scale.setScalar(1.1);
    this.scene.add(this.platform);
    this.addLights();
    this.camera.position.set(0, 1.25, 4);
    this.camera.lookAt(0, 0.78, 0);

    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(this.container);
    this.resize();
  }

  updateAppearance(appearance: PlayerAppearance): void {
    this.anchor.remove(this.player);
    this.disposeObject(this.player);
    this.player = createPlayerMesh(appearance);
    this.anchor.add(this.player);
  }

  update(deltaSeconds: number, enabled: boolean): void {
    if (!enabled || this.width <= 2 || this.height <= 2) {
      return;
    }

    this.elapsed += deltaSeconds;
    this.anchor.position.y = 0.08 + Math.sin(this.elapsed * 1.4) * 0.05;
    this.anchor.rotation.y = this.previewRotation + Math.sin(this.elapsed * 0.75) * 0.22;
    this.platform.rotation.z += deltaSeconds * 0.28;
    this.renderer.render(this.scene, this.camera);
  }

  setRotation(rotation: number): void {
    this.previewRotation = rotation;
  }

  applySettings(settings: GameSettings): void {
    this.settings = { ...settings };
    this.resize();
  }

  private addLights(): void {
    this.scene.add(new AmbientLight(0x9fcfff, 0.9));

    const key = new DirectionalLight(0xfff5ca, 0.95);
    key.position.set(3.2, 4.1, 2.8);
    this.scene.add(key);

    const rim = new DirectionalLight(0x8bd8f8, 0.45);
    rim.position.set(-3.4, 2.1, -2.9);
    this.scene.add(rim);
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    this.width = Math.max(1, Math.floor(rect.width));
    this.height = Math.max(1, Math.floor(rect.height));
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    const pixelScale = getPixelCanvasScale(
      this.touchOptimized,
      this.settings.pixelFilter,
      PREVIEW_PIXEL_SCALE,
      PREVIEW_PIXEL_SCALE_TOUCH
    );
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(
      Math.max(1, Math.floor(this.width / pixelScale)),
      Math.max(1, Math.floor(this.height / pixelScale)),
      false
    );
  }

  private disposeObject(object: Object3D): void {
    object.traverse((child) => {
      if (child instanceof Mesh) {
        child.geometry.dispose();
      }
    });
  }
}

function shouldUseTouchRendering(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 || window.innerWidth <= 820;
}

function getPixelCanvasScale(
  touchOptimized: boolean,
  pixelFilter: boolean,
  desktopScale = WORLD_PIXEL_SCALE,
  touchScale = WORLD_PIXEL_SCALE_TOUCH
): number {
  if (pixelFilter) {
    return touchOptimized ? touchScale : desktopScale;
  }

  return touchOptimized ? 1.65 : 1.25;
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function safeDirection(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const distance = Math.hypot(dx, dz);

  if (distance < 0.0001) {
    return { x: 0, z: 0 };
  }

  return { x: dx / distance, z: dz / distance };
}

const WRESTLE_ARM_WOBBLE_SPEED = 24;
const WRESTLE_PRONE_ROT_X = 1.34;
const WRESTLE_FIGHT_PHASE = 0.58;
const WRESTLE_ARM_BASE_TWITCH = 0.1;

class GymBuddyRenderer {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(52, 1, 0.1, 120);
  private readonly renderer: WebGLRenderer;
  private readonly cullables: RenderCullable[] = [];
  private readonly touchOptimized = shouldUseTouchRendering();
  private player = createPlayerMesh();
  private bossMesh?: Group;
  private bossDefinitionId?: string;
  private readonly buddyMeshes = new Map<number, Group>();
  private readonly rosterBuddyMeshes = new Map<number, Group>();
  private readonly freeWeightMeshes = new Map<number, Group>();
  private readonly effects: CaptureEffect[] = [];
  private readonly clockShadowTarget = new Object3D();
  private lastCullPosition?: Vec2;
  private captureBeatText = '';
  private captureBeatOpacity = 0;
  private captureBeatTimer = 0;
  private readonly captureBeatOverlay: HTMLDivElement;
  private readonly captureBeatTextElement: HTMLDivElement;
  private readonly struggleOverlay: HTMLDivElement;
  private readonly struggleLabel: HTMLDivElement;
  private readonly struggleTrack: HTMLDivElement;
  private readonly struggleFill: HTMLDivElement;
  private width = 1;
  private height = 1;

  constructor(
    private readonly container: HTMLElement,
    initialSnapshot: WorldSnapshot,
    private settings: GameSettings
  ) {
    this.renderer = new WebGLRenderer({
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: this.touchOptimized ? 'default' : 'high-performance'
    });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;
    this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
    });

    this.container.appendChild(this.renderer.domElement);
    this.captureBeatTextElement = document.createElement('div');
    this.captureBeatTextElement.className = 'capture-beat-overlay__text';
    this.captureBeatTextElement.style.position = 'absolute';
    this.captureBeatTextElement.style.left = '50%';
    this.captureBeatTextElement.style.top = '10%';
    this.captureBeatTextElement.style.transform = 'translate(-50%, -50%)';
    this.captureBeatTextElement.style.color = '#ffffff';
    this.captureBeatTextElement.style.fontFamily = 'monospace';
    this.captureBeatTextElement.style.fontWeight = '700';
    this.captureBeatTextElement.style.fontSize = '20px';
    this.captureBeatTextElement.style.textAlign = 'center';
    this.captureBeatTextElement.style.textShadow = '0 0 6px rgba(0, 0, 0, 0.45)';
    this.captureBeatTextElement.style.pointerEvents = 'none';
    this.captureBeatTextElement.style.opacity = '0';
    this.captureBeatTextElement.style.transition = 'opacity 0.12s linear';
    this.captureBeatTextElement.style.zIndex = '3';
    this.captureBeatOverlay = document.createElement('div');
    this.captureBeatOverlay.style.position = 'absolute';
    this.captureBeatOverlay.style.left = '0';
    this.captureBeatOverlay.style.top = '0';
    this.captureBeatOverlay.style.right = '0';
    this.captureBeatOverlay.style.bottom = '0';
    this.captureBeatOverlay.style.display = 'flex';
    this.captureBeatOverlay.style.alignItems = 'flex-start';
    this.captureBeatOverlay.style.justifyContent = 'center';
    this.captureBeatOverlay.style.pointerEvents = 'none';
    this.captureBeatOverlay.style.zIndex = '3';
    this.captureBeatOverlay.appendChild(this.captureBeatTextElement);
    this.struggleOverlay = document.createElement('div');
    this.struggleOverlay.className = 'capture-struggle-overlay';
    this.struggleOverlay.style.display = 'none';
    this.struggleOverlay.hidden = true;
    this.struggleLabel = document.createElement('div');
    this.struggleLabel.className = 'capture-struggle-overlay__label';
    this.struggleLabel.textContent = 'Struggle Meter';
    this.struggleTrack = document.createElement('div');
    this.struggleTrack.className = 'capture-struggle-overlay__track';
    this.struggleFill = document.createElement('div');
    this.struggleFill.className = 'capture-struggle-overlay__fill';
    this.struggleTrack.appendChild(this.struggleFill);
    this.struggleOverlay.appendChild(this.struggleLabel);
    this.struggleOverlay.appendChild(this.struggleTrack);
    this.captureBeatOverlay.appendChild(this.struggleOverlay);
    this.container.appendChild(this.captureBeatOverlay);

    this.scene.background = new Color(RETRO_ARENA_SKY);
    this.scene.fog = null;

    this.camera.position.set(0, RETRO_CAMERA_HEIGHT, RETRO_CAMERA_OFFSET + 2.5);
    this.scene.add(this.clockShadowTarget);
    this.addLights();
    const workoutEquipment = createWorkoutEquipment(WORKOUT_STATIONS);
    const vendingMachines = createVendingMachines(VENDING_MACHINES);
    this.registerCullables(workoutEquipment);
    this.registerCullables(vendingMachines);
    this.scene.add(
      createArena(initialSnapshot.arenaRadius),
      createGymProps(),
      workoutEquipment,
      vendingMachines,
      this.player
    );

    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(this.container);
    this.resize();
  }

  update(snapshot: WorldSnapshot, events: WorldEvent[], deltaSeconds: number, inputActions: ActionState): void {
    this.syncPlayer(snapshot);
    this.syncBuddies(snapshot);
    this.syncRosterBuddies(snapshot);
    this.syncBoss(snapshot);
    this.syncFreeWeights(snapshot);
    this.handleEvents(events);
    const activeCaptureEffect = this.findActiveArmWrestleEffect();
    this.updateCamera(snapshot, deltaSeconds, activeCaptureEffect);
    this.updateStruggleMeter(activeCaptureEffect, deltaSeconds, inputActions.catchPressed);
    this.updateEffects(deltaSeconds, activeCaptureEffect);
    this.updateCaptureBeatOverlay(deltaSeconds);
    this.updateRenderDistance(snapshot.player.position);
    this.renderer.render(this.scene, this.camera);
  }

  updatePlayerAppearance(appearance: PlayerAppearance): void {
    const position = this.player.position.clone();
    const rotationY = this.player.rotation.y;
    this.scene.remove(this.player);
    this.disposeObject(this.player);
    this.player = createPlayerMesh(appearance);
    this.player.position.copy(position);
    this.player.rotation.y = rotationY;
    this.scene.add(this.player);
  }

  applySettings(settings: GameSettings): void {
    this.settings = { ...settings };
    this.resize();
  }

  getMovementBasis(): MovementBasis {
    const direction = new Vector3();
    this.camera.getWorldDirection(direction);
    direction.y = 0;

    if (direction.lengthSq() < 0.0001) {
      return {
        forward: { x: 0, z: -1 },
        right: { x: 1, z: 0 }
      };
    }

    direction.normalize();
    return {
      forward: { x: direction.x, z: direction.z },
      right: { x: -direction.z, z: direction.x }
    };
  }

  private addLights(): void {
    this.scene.add(new AmbientLight(0x9fc7ff, 0.82));

    const sun = new DirectionalLight(0xf2df9f, 1.15);
    sun.position.set(7.6, 8.8, 4.8);
    const rim = new DirectionalLight(0x7de6f5, 0.58);
    rim.position.set(-5.8, 5.2, -4.1);
    const fill = new DirectionalLight(0xffddb4, 0.28);
    fill.position.set(0, 3.8, 4.7);
    sun.target = this.clockShadowTarget;
    this.scene.add(sun, sun.target);
    this.scene.add(rim, fill);
  }

  private syncPlayer(snapshot: WorldSnapshot): void {
    this.player.position.set(snapshot.player.position.x, 0, snapshot.player.position.z);
    this.player.rotation.y = snapshot.player.heading;

    const bob = this.settings.reducedMotion ? 0 : Math.sin(performance.now() * 0.008) * 0.035;
    this.player.position.y = 0.02 + bob;
  }

  private syncBuddies(snapshot: WorldSnapshot): void {
    const activeIds = new Set(snapshot.buddies.map((buddy) => buddy.id));

    for (const [id, mesh] of this.buddyMeshes) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        mesh.traverse((child) => {
          if (child instanceof Mesh) {
            child.geometry.dispose();
          }
        });
        this.buddyMeshes.delete(id);
      }
    }

    for (const buddy of snapshot.buddies) {
      let mesh = this.buddyMeshes.get(buddy.id);

      if (!mesh) {
        mesh = createBuddyMesh(getBuddyDefinition(buddy.definitionId), buddy.bodyTraits);
        this.buddyMeshes.set(buddy.id, mesh);
        this.scene.add(mesh);
      }

      const playerDistance = Math.hypot(
        buddy.position.x - snapshot.player.position.x,
        buddy.position.z - snapshot.player.position.z
      );
      const renderDistance = this.touchOptimized ? BUDDY_RENDER_DISTANCE_TOUCH : BUDDY_RENDER_DISTANCE;
      const ragdolled = buddy.ragdollTimer > 0;
      mesh.visible = !buddy.captured && playerDistance <= renderDistance;
      mesh.position.set(buddy.position.x, 0, buddy.position.z);
      mesh.rotation.set(0, buddy.heading, 0);

      const idleScale = 0.9 + Math.sin(performance.now() * 0.004 + buddy.id) * 0.018;
      if (ragdolled) {
        mesh.position.y = 0.18;
        mesh.rotation.x = -1.12;
        mesh.rotation.z = Math.sin(performance.now() * 0.018 + buddy.id) * 0.18;
        mesh.scale.setScalar(0.82);
      } else {
        mesh.scale.setScalar(idleScale);
      }
    }
  }

  private syncRosterBuddies(snapshot: WorldSnapshot): void {
    const activeIds = new Set<number>();
    const renderDistance = this.touchOptimized ? BUDDY_RENDER_DISTANCE_TOUCH : BUDDY_RENDER_DISTANCE;

    for (const rosterEntry of snapshot.roster) {
      if (rosterEntry.status !== 'training' && rosterEntry.status !== 'needs-spot') {
        continue;
      }

      const station = WORKOUT_STATIONS.find((workoutStation) => {
        return workoutStation.id === rosterEntry.taskStationId;
      });

      if (!station) {
        continue;
      }

      activeIds.add(rosterEntry.rosterId);
      let mesh = this.rosterBuddyMeshes.get(rosterEntry.rosterId);

      if (!mesh) {
        mesh = createBuddyMesh(getBuddyDefinition(rosterEntry.definitionId), rosterEntry.bodyTraits);
        this.rosterBuddyMeshes.set(rosterEntry.rosterId, mesh);
        this.scene.add(mesh);
      }

      const playerDistance = Math.hypot(
        station.position.x - snapshot.player.position.x,
        station.position.z - snapshot.player.position.z
      );
      const wobble = Math.sin(performance.now() * 0.002 + rosterEntry.rosterId) * 0.06;
      mesh.visible = playerDistance <= renderDistance;
      mesh.scale.setScalar(rosterEntry.status === 'needs-spot' ? 0.78 : 0.84);
      mesh.position.set(
        station.position.x,
        rosterEntry.status === 'needs-spot' ? 0.03 : 0.02 + Math.max(0, wobble),
        station.position.z
      );
      mesh.rotation.set(
        rosterEntry.status === 'needs-spot' ? -0.24 : 0,
        station.rotation ?? 0,
        rosterEntry.status === 'needs-spot' ? Math.sin(performance.now() * 0.018 + rosterEntry.rosterId) * 0.35 : 0
      );
    }

    for (const [rosterBuddyId, mesh] of this.rosterBuddyMeshes) {
      if (!activeIds.has(rosterBuddyId)) {
        this.scene.remove(mesh);
        mesh.traverse((child) => {
          if (child instanceof Mesh) {
            child.geometry.dispose();
          }
        });
        this.rosterBuddyMeshes.delete(rosterBuddyId);
      }
    }
  }

  private syncBoss(snapshot: WorldSnapshot): void {
    const boss = snapshot.activeBoss;

    if (!boss) {
      if (this.bossMesh) {
        this.scene.remove(this.bossMesh);
        this.disposeObject(this.bossMesh);
        this.bossMesh = undefined;
        this.bossDefinitionId = undefined;
      }

      return;
    }

    if (!this.bossMesh || this.bossDefinitionId !== boss.definitionId) {
      if (this.bossMesh) {
        this.scene.remove(this.bossMesh);
        this.disposeObject(this.bossMesh);
      }

      this.bossMesh = createBossMesh(getBossDefinition(boss.definitionId));
      this.bossDefinitionId = boss.definitionId;
      this.scene.add(this.bossMesh);
    }

    this.bossMesh.position.set(boss.position.x, 0, boss.position.z);
    if (boss.ragdollTimer > 0) {
      this.bossMesh.position.y = 0.22;
      this.bossMesh.rotation.x = -1.05;
      this.bossMesh.rotation.z = 0.32 + Math.sin(performance.now() * 0.014) * 0.12;
    } else {
      this.bossMesh.rotation.x = 0;
      this.bossMesh.rotation.z = 0;
      this.bossMesh.rotation.y += 0.01;
    }
  }

  private syncFreeWeights(snapshot: WorldSnapshot): void {
    const activeIds = new Set(snapshot.freeWeights.map((freeWeight) => freeWeight.id));

    for (const [id, mesh] of this.freeWeightMeshes) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.disposeObject(mesh);
        this.freeWeightMeshes.delete(id);
      }
    }

    for (const freeWeight of snapshot.freeWeights) {
      let mesh = this.freeWeightMeshes.get(freeWeight.id);

      if (!mesh) {
        mesh = createFreeWeightMesh();
        this.freeWeightMeshes.set(freeWeight.id, mesh);
        this.scene.add(mesh);
      }

      const thrownLift = freeWeight.status === 'thrown'
        ? 0.34 + Math.abs(Math.sin(freeWeight.spin * 1.4)) * 0.28
        : 0;
      const carriedLift = freeWeight.status === 'carried' ? 1.03 : 0.18;
      mesh.position.set(
        freeWeight.position.x,
        freeWeight.status === 'thrown' ? thrownLift : carriedLift,
        freeWeight.position.z
      );
      mesh.rotation.set(
        freeWeight.status === 'ground' ? 0.05 : freeWeight.spin,
        freeWeight.spin,
        freeWeight.status === 'thrown' ? freeWeight.spin * 1.6 : 0
      );
      mesh.scale.setScalar(freeWeight.status === 'carried' ? 1.08 : 1);
    }
  }

  private handleEvents(events: WorldEvent[]): void {
    for (const event of events) {
      if (event.type !== 'capture' || !event.target || event.result === 'empty') {
        continue;
      }

      const ring = createCaptureRing(event.result === 'success' ? 0xf6c85f : 0xffffff);
      const midpoint = {
        x: (event.start.x + event.target.x) / 2,
        z: (event.start.z + event.target.z) / 2
      };
      ring.position.set(midpoint.x, 0.1, midpoint.z);
      ring.scale.setScalar(0.2);

      if (event.captureStyle !== 'arm-wrestle' || !event.capturePose || !event.buddy) {
        this.scene.add(ring);
        this.effects.push({
          age: 0,
          duration: event.result === 'success' ? 0.78 : 0.55,
          start: event.start,
          target: event.target,
          ringStart: midpoint,
          captureMidpoint: midpoint,
          ring,
          style: 'legacy',
          success: event.result === 'success'
        });
        continue;
      }

      const capturePose = event.capturePose;
      const playerMesh = createPlayerMesh();
      const creatureMesh = createBuddyMesh(getBuddyDefinition(event.buddy.definitionId), event.buddy.bodyTraits);
      const playerStart = capturePose?.player?.position ?? event.start;
      const creatureStart = capturePose?.creature?.position ?? event.target;
      const direction = safeDirection(playerStart, creatureStart);
      const gap = this.touchOptimized ? 0.48 : 0.58;
      const proneHeight = this.touchOptimized ? 0.025 : 0.03;
      const actorScale = this.touchOptimized ? 0.63 : 0.58;
      const playerEnd = {
        x: (playerStart.x + creatureStart.x) / 2 - direction.x * gap,
        z: (playerStart.z + creatureStart.z) / 2 - direction.z * gap
      };
      const creatureEnd = {
        x: (playerStart.x + creatureStart.x) / 2 + direction.x * gap,
        z: (playerStart.z + creatureStart.z) / 2 + direction.z * gap
      };

      const playerHeading = capturePose?.player?.heading ?? 0;
      const creatureHeading = capturePose?.creature?.heading ?? event.buddy.heading ?? 0;
      playerMesh.position.set(playerStart.x, proneHeight, playerStart.z);
      creatureMesh.position.set(creatureStart.x, proneHeight, creatureStart.z);
      playerMesh.rotation.set(WRESTLE_PRONE_ROT_X, playerHeading, 0);
      creatureMesh.rotation.set(WRESTLE_PRONE_ROT_X, creatureHeading, 0);
      playerMesh.scale.setScalar(actorScale);
      creatureMesh.scale.setScalar(actorScale);

      const playerArm = createArmWrestleArmMesh();
      const creatureArm = createArmWrestleArmMesh();
      this.scene.add(playerMesh, creatureMesh, playerArm, creatureArm, ring);

      const tears = event.result === 'success' ? createBabyCryingDrops() : undefined;
      if (tears) {
        tears.visible = false;
        tears.scale.setScalar(0);
        creatureMesh.add(tears);
      }

      this.effects.push({
        age: 0,
        duration: this.settings.reducedMotion
          ? (event.result === 'success' ? 0.62 : 0.52)
          : event.captureDuration ?? (event.result === 'success' ? 0.92 : 0.72),
        start: playerStart,
        target: creatureStart,
        ringStart: midpoint,
        captureMidpoint: midpoint,
        ring,
        success: event.result === 'success',
        style: 'arm-wrestle',
        playerMesh,
        creatureMesh,
        playerArm,
        creatureArm,
        tears,
        playerHeading: capturePose?.player?.heading ?? 0,
        creatureHeading: capturePose?.creature?.heading ?? creatureMesh.rotation.y,
        playerEnd,
        creatureEnd,
        playerBaseScale: actorScale,
        creatureBaseScale: actorScale,
        struggleMeter: 0,
        struggleMomentum: 0,
        captureBeatSequence: event.captureBeatSequence ?? [
          {
            at: 0.06,
            text: 'Arm wrestle!'
          },
          {
            at: 0.56,
            text: "It's close..."
          },
          {
            at: 1.14,
            text: event.result === 'success' ? 'You pinned it!' : 'It powered out!'
          }
        ]
      });
    }
  }

  private findActiveArmWrestleEffect(): CaptureEffect | undefined {
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index];

      if (effect.style === 'arm-wrestle' && effect.age < effect.duration) {
        return effect;
      }
    }

    return undefined;
  }

  private updateCamera(snapshot: WorldSnapshot, deltaSeconds: number, captureEffect?: CaptureEffect): void {
    const player = snapshot.player;
    const cameraSettings = CAMERA_DISTANCE_SETTINGS[this.settings.cameraDistance];
    const cameraOffset = RETRO_CAMERA_OFFSET * cameraSettings.offset;
    const cameraHeight = RETRO_CAMERA_HEIGHT * cameraSettings.height;
    const backward = {
      x: -Math.sin(player.heading),
      z: -Math.cos(player.heading)
    };
    const defaultPosition = new Vector3(
      player.position.x + backward.x * cameraOffset,
      cameraHeight,
      player.position.z + backward.z * cameraOffset
    );
    const defaultLookAt = new Vector3(player.position.x, RETRO_LOOK_AT_HEIGHT, player.position.z);
    let desired = defaultPosition;
    let lookAt = defaultLookAt;

    if (captureEffect && captureEffect.duration > 0) {
      const progress = clamp(captureEffect.age / captureEffect.duration, 0, 1);
      const focusBlend = clamp(progress / 0.8, 0, 1);
      const settleBlend = clamp((progress - 0.1) / 0.7, 0, 1);
      const motionBlend = this.settings.reducedMotion ? 0.42 : 1;
      const midpoint = captureEffect.captureMidpoint;
      const direction = safeDirection(captureEffect.start, captureEffect.target);
      const cutsceneOffset = captureEffect.target
        ? {
            x: captureEffect.captureMidpoint.x - direction.x * CUTSCENE_CAMERA_OFFSET * cameraSettings.offset,
            z: captureEffect.captureMidpoint.z - direction.z * CUTSCENE_CAMERA_OFFSET * cameraSettings.offset
          }
        : {
            x: captureEffect.captureMidpoint.x,
            z: captureEffect.captureMidpoint.z
          };
      const cutscenePosition = new Vector3(
        cutsceneOffset.x,
        lerp(cameraHeight, CUTSCENE_CAMERA_HEIGHT, focusBlend),
        cutsceneOffset.z
      );
      const cutsceneLookAt = new Vector3(
        captureEffect.captureMidpoint.x,
        lerp(RETRO_LOOK_AT_HEIGHT, CUTSCENE_LOOK_AT_HEIGHT, settleBlend),
        captureEffect.captureMidpoint.z
      );

      const blend = clamp((1.7 * focusBlend + settleBlend) / 2, 0, 1) * motionBlend;
      desired = defaultPosition.clone().lerp(cutscenePosition, blend);
      lookAt = defaultLookAt.clone().lerp(cutsceneLookAt, blend);
    }

    const smoothing = 1 - Math.pow(this.settings.reducedMotion ? 0.00001 : 0.001, deltaSeconds);

    this.camera.position.lerp(desired, smoothing);
    this.camera.lookAt(lookAt);
    this.clockShadowTarget.position.copy(lookAt);
  }

  private updateEffects(deltaSeconds: number, activeCaptureEffect?: CaptureEffect): void {
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index];
      effect.age += deltaSeconds;
      const progress = Math.min(effect.age / effect.duration, 1);
      const eased = easeOutCubic(progress);
      const direction = safeDirection(effect.start, effect.target);
      const approach = effect.success ? Math.min(1, easeOutCubic(progress * 0.95)) : Math.min(1, easeOutCubic(progress * 1.02));
      const contest = clamp((progress - WRESTLE_FIGHT_PHASE) / 0.48, 0, 1);
      const struggle = clamp((effect.struggleMomentum ?? 0), 0, 1);
      const motionScale = this.settings.reducedMotion ? 0.26 : 1;
      const shake = Math.sin(progress * WRESTLE_ARM_WOBBLE_SPEED) * (0.013 + struggle * 0.018) * motionScale;

      if (effect.style === 'arm-wrestle' && effect.playerMesh && effect.creatureMesh) {
        if (effect === activeCaptureEffect) {
          this.advanceCaptureBeat(effect, progress);
        }

        const settle = effect.success ? approach : approach * 0.94;
        const playerX = lerp(effect.start.x, effect.playerEnd?.x ?? effect.start.x, settle);
        const playerZ = lerp(effect.start.z, effect.playerEnd?.z ?? effect.start.z, settle);
        const creatureX = lerp(effect.target.x, effect.creatureEnd?.x ?? effect.target.x, settle);
        const creatureZ = lerp(effect.target.z, effect.creatureEnd?.z ?? effect.target.z, settle);
        const failRecoil = effect.success ? 0 : clamp((progress - 0.6) * 1.65, 0, 1);
        const recoilAmount = Math.min(1, failRecoil);
        const recoil = {
          x: direction.x * 0.55 * recoilAmount,
          z: direction.z * 0.55 * recoilAmount
        };

        effect.playerMesh.position.set(
          playerX - recoil.x,
          0.03 + (Math.abs(Math.sin(progress * Math.PI)) * 0.014 + Math.abs(Math.cos(progress * 7.4)) * 0.004) * motionScale,
          playerZ - recoil.z
        );
        effect.creatureMesh.position.set(
          creatureX + recoil.x,
          0.03 + (Math.abs(Math.sin(progress * Math.PI)) * 0.014 + Math.abs(Math.cos(progress * 7.4)) * 0.004) * motionScale,
          creatureZ + recoil.z
        );

        effect.playerMesh.rotation.set(
          WRESTLE_PRONE_ROT_X - recoilAmount * 0.15 * (effect.success ? 0.4 : 1),
          effect.playerHeading ?? Math.atan2(direction.x, direction.z),
          shake * 2
        );
        effect.creatureMesh.rotation.set(
          WRESTLE_PRONE_ROT_X + recoilAmount * 0.08 * (effect.success ? 0.25 : 0.95),
          effect.creatureHeading ?? Math.atan2(-direction.x, -direction.z),
          -shake * 2
        );

        if (effect.playerArm && effect.creatureArm) {
          const midpoint = {
            x: (playerX + creatureX) / 2,
            z: (playerZ + creatureZ) / 2
          };
          const playerLead = clamp(
            effect.success
              ? 0.48 + contest * 0.36 + struggle * 0.24
              : 0.52 - contest * 0.24 - struggle * 0.08,
            0.12,
            0.88
          );
          const creatureLead = clamp(1 - playerLead, 0.1, 0.86);
          const playerArmX = lerp(playerX, midpoint.x, playerLead);
          const playerArmZ = lerp(playerZ, midpoint.z, playerLead);
          const creatureArmX = lerp(creatureX, midpoint.x, creatureLead);
          const creatureArmZ = lerp(creatureZ, midpoint.z, creatureLead);
          const playerArmSwing = 1.0 + Math.sin(progress * 31 + Math.PI / 2) * (WRESTLE_ARM_BASE_TWITCH + struggle * 0.28) * motionScale;
          const creatureArmSwing = 1.0 + Math.sin(progress * 31 + 1.6) * ((WRESTLE_ARM_BASE_TWITCH + struggle * 0.24) * 1.25) * motionScale;

          effect.playerArm.position.set(playerArmX + direction.x * 0.05, 0.16 + shake, playerArmZ + direction.z * 0.05);
          effect.creatureArm.position.set(creatureArmX - direction.x * 0.05, 0.16 - shake, creatureArmZ - direction.z * 0.05);
          effect.playerArm.rotation.set(
            0.18 + Math.sin(progress * 4 + contest * 3) * 0.12 * motionScale,
            Math.atan2(creatureX - playerX, creatureZ - playerZ),
            Math.sin(progress * 16) * 0.22 * motionScale
          );
          effect.creatureArm.rotation.set(
            0.18 + Math.sin(progress * 4 + 0.9 + contest * 3) * 0.12 * motionScale,
            Math.atan2(playerX - creatureX, playerZ - creatureZ),
            Math.sin(progress * 16 + 1.2) * 0.22 * motionScale
          );

          effect.playerArm.scale.set(1, 1, playerArmSwing * 0.6 + playerLead);
          effect.creatureArm.scale.set(1, 1, creatureArmSwing * 0.6 + creatureLead);
        }

        if (effect.success && effect.tears) {
          const cry = clamp((progress - 0.58) / 0.38, 0, 1);
          effect.tears.visible = cry > 0.02;
          effect.tears.scale.setScalar(clamp(0.2 + cry * 0.8, 0, 1));
          effect.tears.rotation.z = Math.sin(progress * 22) * 0.18 * motionScale;
          effect.tears.position.y = 0.09 + Math.sin(progress * 12) * 0.03 * motionScale;
        }

        if (effect.success) {
          const vanish = clamp((progress - 0.66) / 0.33, 0, 1);
          const creatureScale = effect.creatureBaseScale ?? 0.58;
          effect.creatureMesh.scale.set(
            creatureScale * (1 - vanish * 0.95),
            creatureScale * (1 + (1 - vanish) * 0.1 * motionScale),
            creatureScale * (1 - vanish * 0.95)
          );
        } else {
          const escape = clamp(
            (progress - 0.58) / 0.34 + Math.max(0, 0.06 - struggle * 0.03),
            0,
            1
          );
          const escapeDirection = safeDirection(effect.playerMesh.position, {
            x: creatureX,
            z: creatureZ
          });
          effect.creatureMesh.position.x += escapeDirection.x * 0.34 * escape;
          effect.creatureMesh.position.z += escapeDirection.z * 0.34 * escape;
          effect.creatureMesh.position.y = 0.02 + escape * 0.24 * motionScale;
          effect.creatureMesh.rotation.x = lerp(WRESTLE_PRONE_ROT_X, 0.44, escape);
          effect.creatureMesh.rotation.z = -Math.sin(progress * 16) * 0.2 * escape * motionScale;
        }

        if (effect.success) {
          const pin = clamp((progress - 0.66) / 0.28, 0, 1);
          const pinBoost = WRESTLE_PIN_STRENGTH * pin * (0.56 + struggle * 0.44) * (this.settings.reducedMotion ? 0.65 : 1);
          effect.playerMesh.position.x -= direction.x * pinBoost;
          effect.playerMesh.position.z -= direction.z * pinBoost;
          effect.playerMesh.rotation.x = WRESTLE_PRONE_ROT_X + pin * 0.03 * (1 + struggle) * motionScale;
        }
      } else {
        const playerX = lerp(effect.start.x, effect.target.x, eased);
        const playerZ = lerp(effect.start.z, effect.target.z, eased);
        if (effect.playerMesh) {
          effect.playerMesh.position.set(playerX, 0.03 + Math.sin(progress * Math.PI) * 0.01, playerZ);
        }

        if (effect.creatureMesh) {
          effect.creatureMesh.position.set(
            lerp(effect.target.x, playerX, eased),
            0.03 + Math.sin(progress * Math.PI) * 0.01,
            lerp(effect.target.z, playerZ, eased)
          );
        }
      }

      effect.ring.position.set(effect.ringStart.x, 0.12, effect.ringStart.z);
      effect.ring.scale.setScalar(effect.success ? 0.35 + eased * 2.3 : 0.3 + eased * 1.2);

      const material = effect.ring.material as MeshBasicMaterial;
        material.opacity = Math.max(0, 0.9 * (1 - progress));

        if (progress >= 1) {
        if (effect.playerMesh) {
          this.scene.remove(effect.playerMesh);
          this.disposeObject(effect.playerMesh);
        }

        if (effect.creatureMesh) {
          this.scene.remove(effect.creatureMesh);
          this.disposeObject(effect.creatureMesh);
        }

        if (effect.playerArm) {
          this.scene.remove(effect.playerArm);
          this.disposeObject(effect.playerArm);
        }

        if (effect.creatureArm) {
          this.scene.remove(effect.creatureArm);
          this.disposeObject(effect.creatureArm);
        }

        this.scene.remove(effect.ring);
        effect.ring.geometry.dispose();
        material.dispose();
        this.effects.splice(index, 1);
      }
    }
  }

  private updateStruggleMeter(
    captureEffect: CaptureEffect | undefined,
    deltaSeconds: number,
    strugglePressed: boolean
  ): void {
    if (!captureEffect || captureEffect.style !== 'arm-wrestle') {
      this.struggleOverlay.style.display = 'none';
      this.struggleOverlay.hidden = true;
      this.struggleFill.style.width = '0%';
      this.struggleLabel.textContent = 'Struggle Meter';
      return;
    }

    const gainMeter = strugglePressed ? WRESTLE_STRUGGLE_METER_GAIN : 0;
    const gainMomentum = strugglePressed ? WRESTLE_STRUGGLE_MOMENTUM_GAIN : 0;
    captureEffect.struggleMeter = clamp(
      (captureEffect.struggleMeter ?? 0) + gainMeter - deltaSeconds * WRESTLE_STRUGGLE_METER_DECAY,
      0,
      1
    );
    captureEffect.struggleMomentum = clamp(
      (captureEffect.struggleMomentum ?? 0) + gainMomentum - deltaSeconds * WRESTLE_STRUGGLE_MOMENTUM_DECAY,
      0,
      1
    );
    const fillPercent = Math.round((captureEffect.struggleMeter ?? 0) * 100);
    this.struggleFill.style.width = `${fillPercent}%`;
    this.struggleLabel.textContent = `Struggle Meter ${fillPercent}%`;
    this.struggleOverlay.hidden = false;
    this.struggleOverlay.style.display = 'grid';
  }

  private advanceCaptureBeat(effect: CaptureEffect, progress: number): void {
    const sequence = effect.captureBeatSequence;

    if (!sequence || sequence.length === 0) {
      return;
    }

    let index = effect.captureBeatIndex ?? 0;

    while (index < sequence.length && progress >= sequence[index].at) {
      this.captureBeatText = sequence[index].text;
      this.captureBeatTextElement.textContent = this.captureBeatText;
      this.captureBeatOpacity = 1;
      this.captureBeatTimer = CAPTURE_BEAT_TEXT_HOLD_SECONDS;
      this.captureBeatTextElement.style.opacity = '1';
      index += 1;
    }

    effect.captureBeatIndex = index;
  }

  private updateCaptureBeatOverlay(deltaSeconds: number): void {
    if (this.captureBeatTimer > 0) {
      this.captureBeatTimer = Math.max(0, this.captureBeatTimer - deltaSeconds);
      this.captureBeatOpacity = clamp(this.captureBeatTimer / CAPTURE_BEAT_TEXT_HOLD_SECONDS, 0, 1);
      this.captureBeatTextElement.style.opacity = String(this.captureBeatOpacity);
      return;
    }

    if (this.captureBeatText !== '') {
      this.captureBeatText = '';
      this.captureBeatTextElement.textContent = '';
      this.captureBeatTextElement.style.opacity = '0';
      this.captureBeatOpacity = 0;
    }
  }

  private registerCullables(root: Group): void {
    for (const child of root.children) {
      const center = child.userData.cullCenter as Vec2 | undefined;
      const baseRenderDistance =
        typeof child.userData.renderDistance === 'number'
          ? child.userData.renderDistance
          : DEFAULT_STATION_RENDER_DISTANCE;
      this.cullables.push({
        object: child,
        renderDistance: this.touchOptimized
          ? Math.min(baseRenderDistance, DEFAULT_STATION_RENDER_DISTANCE_TOUCH)
          : baseRenderDistance,
        center: center ?? { x: child.position.x, z: child.position.z }
      });
    }
  }

  private updateRenderDistance(playerPosition: Vec2): void {
    if (this.lastCullPosition) {
      const moved = Math.hypot(
        playerPosition.x - this.lastCullPosition.x,
        playerPosition.z - this.lastCullPosition.z
      );

      if (moved < 0.35) {
        return;
      }
    }

    this.lastCullPosition = { x: playerPosition.x, z: playerPosition.z };

    for (const cullable of this.cullables) {
      const distance = Math.hypot(
        cullable.center.x - playerPosition.x,
        cullable.center.z - playerPosition.z
      );
      cullable.object.visible = distance <= cullable.renderDistance;
    }
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    this.width = Math.max(1, Math.floor(rect.width));
    this.height = Math.max(1, Math.floor(rect.height));
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(1);
    const pixelScale = getPixelCanvasScale(this.touchOptimized, this.settings.pixelFilter);
    this.renderer.setSize(
      Math.max(1, Math.floor(this.width / pixelScale)),
      Math.max(1, Math.floor(this.height / pixelScale)),
      false
    );
  }

  private disposeObject(object: Object3D): void {
    object.traverse((child) => {
      if (child instanceof Mesh) {
        child.geometry.dispose();
      }
    });
  }
}

function createPausedActions(actions: ActionState): ActionState {
  return {
    ...actions,
    moveX: 0,
    moveZ: 0,
    catchPressed: false,
    interactPressed: false,
    sprintHeld: false,
    resetPressed: false
  };
}

function createCameraRelativeActions(actions: ActionState, basis: MovementBasis): ActionState {
  const localMagnitude = Math.min(1, Math.hypot(actions.moveX, actions.moveZ));

  if (localMagnitude <= 0.001) {
    return actions;
  }

  let moveX = basis.right.x * actions.moveX + basis.forward.x * -actions.moveZ;
  let moveZ = basis.right.z * actions.moveX + basis.forward.z * -actions.moveZ;
  const worldMagnitude = Math.hypot(moveX, moveZ);

  if (worldMagnitude > 0.001) {
    moveX = moveX / worldMagnitude * localMagnitude;
    moveZ = moveZ / worldMagnitude * localMagnitude;
  }

  return {
    ...actions,
    moveX,
    moveZ
  };
}

export function createGymBuddyGame(root: HTMLElement): void {
  const hud = new GameHud(root);
  const initialSettings = loadGameSettingsFromStorage();
  hud.setSettings(initialSettings);
  const input = new InputController();
  input.setInputMode(hud.getInputMode());
  const world = new GymBuddyWorld();
  const savedProgress = loadProgressFromStorage();
  const initialTutorialCompleted = Boolean(savedProgress?.tutorialCompleted);

  if (savedProgress) {
    world.loadSaveData(savedProgress);
  }

  const initialSnapshot = world.getSnapshot();
  const renderer = new GymBuddyRenderer(hud.canvasMount, initialSnapshot, initialSettings);
  const previewRenderer = new CharacterPreviewRenderer(hud.creatorPreviewMount, initialSettings);
  let gameStarted = false;
  let tutorialCompleted = initialTutorialCompleted;
  let tutorialStep = tutorialCompleted ? TUTORIAL_STEPS.length : 0;
  let tutorialMoveOrigin: Vec2 | undefined;
  let tutorialBuddyReadTimer = 0;
  let tutorialExoticNoticeTimer = 0;

  const saveProgress = (): void => {
    saveProgressToStorage({
      ...world.getSaveData(),
      tutorialCompleted
    });
  };

  input.bindTouchControls(hud.touchControls);
  input.bindMouseControls(hud.canvasMount);
  hud.onAppearanceChange((appearance) => {
    renderer.updatePlayerAppearance(appearance);
    previewRenderer.updateAppearance(appearance);
  });
  hud.onPreviewRotationChange((rotation) => {
    previewRenderer.setRotation(rotation);
  });
  hud.onSettingsChange((settings) => {
    saveGameSettingsToStorage(settings);
    renderer.applySettings(settings);
    previewRenderer.applySettings(settings);
  });
  hud.onStart(() => {
    gameStarted = true;
    hud.pushMessage('The safari has opened.');
    tutorialMoveOrigin = undefined;
  });
  hud.onWorkoutComplete((station) => {
    world.completeWorkout(station);
  });
  hud.onVendingEnergyDrink(() => {
    world.buyEnergyDrink();
  });
  hud.onVendingProteinSnack(() => {
    world.grabProteinSnack();
  });
  hud.onFreeWeightInteract(() => {
    world.interactWithFreeWeight();
  });
  hud.onRosterTrain((rosterId) => {
    world.sendBuddyToWorkout(rosterId);
  });
  hud.onRosterSpot((rosterId) => {
    world.spotBuddy(rosterId);
  });
  hud.onRosterRemove((rosterId) => {
    world.removeBuddy(rosterId);
  });
  hud.onRosterUseSteroid((rosterId) => {
    world.useSteroid(rosterId);
  });
  hud.onRosterRename((rosterId, displayName) => {
    world.renameBuddy(rosterId, displayName);
  });
  hud.onResetSave(() => {
    clearProgressStorage();
    world.reset();
    tutorialCompleted = false;
    tutorialStep = 0;
    tutorialMoveOrigin = undefined;
    tutorialBuddyReadTimer = 0;
    tutorialExoticNoticeTimer = 0;
    hud.hideTutorialPopup();
    saveProgress();
  });
  hud.onBossChallenge(() => {
    world.challengeBoss();
  });
  hud.onInputModeChange((mode: InputMode) => {
    input.setInputMode(mode);
  });
  hud.onTutorialSkip(() => {
    if (tutorialCompleted) {
      return;
    }

    tutorialCompleted = true;
    tutorialStep = TUTORIAL_STEPS.length;
    hud.hideTutorialPopup();
    saveProgress();
  });
  renderer.updatePlayerAppearance(hud.getAppearance());
  previewRenderer.updateAppearance(hud.getAppearance());

  let lastTime = performance.now();
  let proximityTimer = 0;
  let lastProximityPosition: Vec2 | undefined;

  function isTutorialExotic(definitionId: string): boolean {
    const definition = getBuddyDefinition(definitionId);
    return definition.rarity === 'exotic' || definition.isExotic === true;
  }

  function completeTutorialStep(): boolean {
    if (tutorialCompleted) {
      return false;
    }

    tutorialStep += 1;

    if (tutorialStep >= TUTORIAL_STEPS.length) {
      tutorialCompleted = true;
      tutorialStep = TUTORIAL_STEPS.length;
      return true;
    }

    return true;
  }

  function updateTutorial(
    preUpdateSnapshot: WorldSnapshot,
    postUpdateSnapshot: WorldSnapshot,
    deltaSeconds: number,
    inputActions: ActionState,
    events: WorldEvent[]
  ): boolean {
    if (!gameStarted || tutorialCompleted) {
      return false;
    }

    if (!tutorialMoveOrigin) {
      tutorialMoveOrigin = { ...postUpdateSnapshot.player.position };
    }

    if (tutorialStep === 0) {
      const moved = Math.hypot(
        postUpdateSnapshot.player.position.x - tutorialMoveOrigin.x,
        postUpdateSnapshot.player.position.z - tutorialMoveOrigin.z
      );

      if (moved >= TUTORIAL_MOVE_DISTANCE) {
        return completeTutorialStep();
      }
    } else if (tutorialStep === 1) {
      if (postUpdateSnapshot.nearestBuddy && postUpdateSnapshot.nearestBuddy.distance <= postUpdateSnapshot.captureRange * 1.6) {
        return completeTutorialStep();
      }
    } else if (tutorialStep === 2) {
      const readBuddy =
        preUpdateSnapshot.nearestBuddy &&
        preUpdateSnapshot.nearestBuddy.distance <= preUpdateSnapshot.captureRange;

      if (readBuddy) {
        tutorialBuddyReadTimer += deltaSeconds;
      } else {
        tutorialBuddyReadTimer = 0;
      }

      if (tutorialBuddyReadTimer >= TUTORIAL_BUDDY_READ_TIME) {
        return completeTutorialStep();
      }
    } else if (tutorialStep === 3) {
      if (
        preUpdateSnapshot.nearestBuddy &&
        preUpdateSnapshot.nearestBuddy.distance <= preUpdateSnapshot.captureRange &&
        preUpdateSnapshot.captureCutsceneRemaining <= 0 &&
        inputActions.catchPressed
      ) {
        return completeTutorialStep();
      }
    } else if (tutorialStep === 4) {
      if (events.some((event) => event.type === 'capture' && event.result === 'success')) {
        return completeTutorialStep();
      }
    } else if (tutorialStep === 5) {
      if (events.some((event) => event.type === 'roster' && event.steroidUsed)) {
        return completeTutorialStep();
      }
    } else if (tutorialStep === 6) {
      const nearest = postUpdateSnapshot.nearestBuddy;
      const isExotic = Boolean(
        nearest && isTutorialExotic(nearest.buddy.definitionId) && nearest.distance <= postUpdateSnapshot.captureRange * 1.4
      );

      if (isExotic) {
        tutorialExoticNoticeTimer += deltaSeconds;
      } else {
        tutorialExoticNoticeTimer = 0;
      }

      if (tutorialExoticNoticeTimer >= TUTORIAL_EXOTIC_NOTICE_TIME) {
        return completeTutorialStep();
      }
    }

    if (tutorialCompleted) {
      return true;
    }

    return false;
  }

  function showTutorialPopup(): void {
    if (!gameStarted || tutorialCompleted || hud.isInteractionActive()) {
      hud.hideTutorialPopup();
      return;
    }

    if (tutorialStep < TUTORIAL_STEPS.length) {
      hud.setTutorialStep(TUTORIAL_STEPS[tutorialStep]);
      return;
    }

    hud.hideTutorialPopup();
  }

  if (initialTutorialCompleted) {
    hud.hideTutorialPopup();
  }

  function refreshNearbyPrompts(playerPosition: Vec2): void {
    if (!gameStarted) {
      lastProximityPosition = undefined;
      proximityTimer = 0;
      hud.updateVendingMachine(undefined);
      hud.updateWorkoutStation(undefined);
      return;
    }

    const nearbyStation = getNearestWorkoutStation(playerPosition);
    const nearbyVending = getNearestVendingMachine(playerPosition);
    lastProximityPosition = { x: playerPosition.x, z: playerPosition.z };
    proximityTimer = 0.1;
    hud.updateVendingMachine(nearbyVending?.machine);
    hud.updateWorkoutStation(nearbyVending ? undefined : nearbyStation?.station);
  }

  function shouldRefreshNearbyPrompts(playerPosition: Vec2, deltaSeconds: number): boolean {
    proximityTimer = Math.max(0, proximityTimer - deltaSeconds);

    if (!lastProximityPosition) {
      return true;
    }

    const moved = Math.hypot(
      playerPosition.x - lastProximityPosition.x,
      playerPosition.z - lastProximityPosition.z
    );
    return proximityTimer <= 0 || moved > 0.25;
  }

  function frame(now: number): void {
    const deltaSeconds = Math.min((now - lastTime) / 1000, 0.08);
    lastTime = now;

    const inputActions = input.read();
    const movementActions = createCameraRelativeActions(inputActions, renderer.getMovementBasis());
    const preUpdateSnapshot = world.getSnapshot();

    if (gameStarted && !hud.isInteractionActive() && inputActions.interactPressed) {
      refreshNearbyPrompts(preUpdateSnapshot.player.position);
      const hasSpotTarget = hud.hasSpotTarget(preUpdateSnapshot);

      if (
        !world.interactWithFreeWeight() &&
        !hud.tryStartNearbyVending() &&
        !hud.trySpotBuddy(preUpdateSnapshot) &&
        !hasSpotTarget
      ) {
        hud.tryStartNearbyWorkout();
      }
    }

    const captureCutsceneActive = preUpdateSnapshot.captureCutsceneRemaining > 0;
    const canSimulate = gameStarted && !hud.isInteractionActive();
    const shouldAdvanceWorld = canSimulate;
    const actions = canSimulate && !captureCutsceneActive ? movementActions : createPausedActions(movementActions);
    world.update(shouldAdvanceWorld ? deltaSeconds : 0, actions);
    const events = world.drainEvents();
    const snapshot = world.getSnapshot();
    const tutorialAdvanced = updateTutorial(preUpdateSnapshot, snapshot, deltaSeconds, inputActions, events);

    if (
      events.some(
        (event) => event.type === 'capture' || event.type === 'roster' || event.type === 'workout'
      )
    ) {
      saveProgress();
    }

    if (tutorialAdvanced) {
      saveProgress();
    }

    if (!gameStarted || shouldRefreshNearbyPrompts(snapshot.player.position, deltaSeconds)) {
      refreshNearbyPrompts(snapshot.player.position);
    }

    for (const event of events) {
      hud.pushMessage(event.message);
    }

    showTutorialPopup();
    renderer.update(snapshot, events, deltaSeconds, inputActions);
    previewRenderer.update(deltaSeconds, !gameStarted);
    hud.update(snapshot, inputActions, deltaSeconds);
    requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    lastTime = performance.now();
  });

  requestAnimationFrame(frame);
}
