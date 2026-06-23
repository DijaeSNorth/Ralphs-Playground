import {
  AmbientLight,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  OrthographicCamera,
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
import type {
  ActionState,
  BuddyDefinition,
  BuddyState,
  PlayerAppearance,
  Vec2,
  WorkoutStation,
  WorkoutType,
  WorldEvent,
  WorldSnapshot
} from '../../game/types';
import { GameHud } from '../../ui/hud';
import {
  clearProgressStorage,
  loadProgressFromStorage,
  SAVE_STORAGE_KEY,
  saveProgressToStorage
} from '../../game/progress';
import { recordRuntimeError } from '../../game/runtimeErrors';
import {
  loadGameSettingsFromStorage,
  saveGameSettingsToStorage,
  type CameraDistanceSetting,
  type GameSettings
} from '../../game/settings';
import { RetroAudio } from '../../game/audio';
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
  battleStage?: Group;
  impactBurst?: Group;
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

type WorkoutAnimationKind = 'press' | 'squat' | 'free-weights' | 'cable';

type WorkoutAnimation = {
  stationId: string;
  type: WorkoutType;
  kind: WorkoutAnimationKind;
  group: Group;
  actor: Group;
  props: Group;
  liftA?: Object3D;
  liftB?: Object3D;
  cable?: Object3D;
  age: number;
  beatIndex: number;
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
const RETRO_CAMERA_OFFSET = 15.4;
const RETRO_CAMERA_HEIGHT = 12.6;
const RETRO_LOOK_AT_HEIGHT = 0.72;
const CUTSCENE_CAMERA_OFFSET = 6.4;
const CUTSCENE_CAMERA_HEIGHT = 5.9;
const CUTSCENE_LOOK_AT_HEIGHT = 0.62;
const CAPTURE_CLOSEUP_CAMERA_OFFSET = 3.15;
const CAPTURE_CLOSEUP_CAMERA_HEIGHT = 3.2;
const CAPTURE_CLOSEUP_LOOK_AT_HEIGHT = 0.42;
const CAPTURE_CLOSEUP_ZOOM = 1.85;
const CAPTURE_CLOSEUP_ZOOM_TOUCH = 1.55;
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
        const material = child.material;

        if (Array.isArray(material)) {
          material.forEach((entry) => entry.dispose());
        } else {
          material.dispose();
        }
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
const WORKOUT_BEAT_INTERVAL_SECONDS = 0.72;

class GymBuddyRenderer {
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-10, 10, 7, -7, 0.1, 160);
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
  private activeWorkout?: WorkoutAnimation;
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
  private playerAppearance?: PlayerAppearance;
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

  update(
    snapshot: WorldSnapshot,
    events: WorldEvent[],
    deltaSeconds: number,
    inputActions: ActionState,
    activeWorkoutStation?: WorkoutStation
  ): void {
    this.syncPlayer(snapshot);
    this.syncBuddies(snapshot);
    this.syncRosterBuddies(snapshot);
    this.syncBoss(snapshot);
    this.syncFreeWeights(snapshot);
    this.syncWorkoutAnimation(activeWorkoutStation, deltaSeconds);
    this.player.visible = !activeWorkoutStation;
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
    this.playerAppearance = appearance;
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
    return {
      forward: { x: 0, z: -1 },
      right: { x: 1, z: 0 }
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
      const definition = getBuddyDefinition(buddy.definitionId);

      if (!mesh) {
        mesh = createBuddyMesh(definition, buddy.bodyTraits);
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
      this.animateBuddyMesh(mesh, buddy, definition, playerDistance, ragdolled);
    }
  }

  private animateBuddyMesh(
    mesh: Group,
    buddy: BuddyState,
    definition: BuddyDefinition,
    playerDistance: number,
    ragdolled: boolean
  ): void {
    const now = performance.now() * 0.001;
    const isExotic = definition.rarity === 'exotic' || definition.isExotic === true;
    const motionScale = this.settings.reducedMotion ? 0.25 : 1;

    if (ragdolled) {
      mesh.position.y = 0.18;
      mesh.rotation.set(
        -1.12,
        buddy.heading,
        Math.sin(now * 18 + buddy.id) * 0.18 * motionScale
      );
      mesh.scale.setScalar(0.82);
      return;
    }

    const baseScale = isExotic ? 1 : 0.9;
    const idleWave = Math.sin(now * (isExotic ? 2.4 : 4) + buddy.id);
    const exoticPulse = isExotic ? Math.sin(now * 3.2 + buddy.id * 0.7) * 0.035 * motionScale : 0;
    let scaleX = baseScale + idleWave * 0.014 * motionScale + exoticPulse;
    let scaleY = baseScale + Math.abs(idleWave) * 0.018 * motionScale + exoticPulse * 0.7;
    let scaleZ = baseScale + idleWave * 0.01 * motionScale + exoticPulse;
    let positionY = 0.02 + Math.max(0, idleWave) * 0.015 * motionScale;
    let rotationX = 0;
    let rotationY = buddy.heading;
    let rotationZ = isExotic ? Math.sin(now * 0.9 + buddy.id) * 0.045 * motionScale : 0;

    if (isExotic) {
      positionY += (0.02 + Math.abs(exoticPulse) * 0.9) * motionScale;
      rotationY += Math.sin(now * 0.65 + buddy.id) * 0.035 * motionScale;
    }

    if (buddy.behavior === 'flex') {
      const flex = Math.sin(now * 10 + buddy.id);
      scaleX += (isExotic ? 0.1 : 0.075) * motionScale;
      scaleY += (isExotic ? 0.055 : 0.04) * motionScale;
      scaleZ -= 0.025 * motionScale;
      positionY += Math.abs(flex) * 0.04 * motionScale;
      rotationZ += flex * 0.12 * motionScale;
    } else if (buddy.behavior === 'stretch') {
      const stretch = Math.sin(now * 6 + buddy.id);
      scaleX -= 0.035 * motionScale;
      scaleY += (isExotic ? 0.14 : 0.105) * motionScale;
      scaleZ += 0.025 * motionScale;
      rotationX += 0.1 * stretch * motionScale;
      positionY += 0.025 * motionScale;
    } else if (buddy.behavior === 'react') {
      const alert = Math.abs(Math.sin(now * 15 + buddy.id));
      const facePlayerBoost = playerDistance < 3.2 ? 0.1 : 0;
      scaleX += alert * 0.045 * motionScale;
      scaleY += alert * 0.08 * motionScale;
      positionY += alert * 0.06 * motionScale;
      rotationZ += Math.sin(now * 18 + buddy.id) * (0.13 + facePlayerBoost) * motionScale;
    }

    mesh.position.y = positionY;
    mesh.rotation.set(rotationX, rotationY, rotationZ);
    mesh.scale.set(scaleX, scaleY, scaleZ);
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
      const definition = getBuddyDefinition(rosterEntry.definitionId);

      if (!mesh) {
        mesh = createBuddyMesh(definition, rosterEntry.bodyTraits);
        this.rosterBuddyMeshes.set(rosterEntry.rosterId, mesh);
        this.scene.add(mesh);
      }

      const playerDistance = Math.hypot(
        station.position.x - snapshot.player.position.x,
        station.position.z - snapshot.player.position.z
      );
      const now = performance.now() * 0.001;
      const motionScale = this.settings.reducedMotion ? 0.25 : 1;
      const isExotic = definition.rarity === 'exotic' || definition.isExotic === true;
      const wobble = Math.sin(now * 2 + rosterEntry.rosterId) * 0.06 * motionScale;
      const personalityPulse = Math.sin(now * 5 + rosterEntry.level + rosterEntry.rosterId) * 0.018 * motionScale;
      const baseScale = rosterEntry.status === 'needs-spot' ? 0.78 : 0.84 + (isExotic ? 0.06 : 0);
      const stationPulse = this.getWorkoutPulse(station.type, now + rosterEntry.rosterId * 0.17);
      mesh.visible = playerDistance <= renderDistance;
      mesh.scale.set(
        baseScale + personalityPulse + stationPulse.scaleX * 0.16 * motionScale,
        baseScale + Math.abs(personalityPulse) * 1.6 + stationPulse.scaleY * 0.18 * motionScale,
        baseScale + personalityPulse * 0.6 + stationPulse.scaleZ * 0.12 * motionScale
      );
      mesh.position.set(
        station.position.x,
        rosterEntry.status === 'needs-spot'
          ? 0.03
          : 0.02 + Math.max(0, wobble) + stationPulse.lift * 0.06 * motionScale,
        station.position.z
      );
      mesh.rotation.set(
        rosterEntry.status === 'needs-spot' ? -0.24 : stationPulse.rotationX * 0.32 * motionScale,
        (station.rotation ?? 0) + (isExotic ? Math.sin(now * 0.8 + rosterEntry.rosterId) * 0.04 * motionScale : 0),
        rosterEntry.status === 'needs-spot'
          ? Math.sin(now * 18 + rosterEntry.rosterId) * 0.35 * motionScale
          : Math.sin(now * 4 + rosterEntry.rosterId) * 0.045 * motionScale + stationPulse.rotationZ * 0.24 * motionScale
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

  private syncWorkoutAnimation(station: WorkoutStation | undefined, deltaSeconds: number): void {
    if (!station) {
      this.clearWorkoutAnimation();
      return;
    }

    if (!this.activeWorkout || this.activeWorkout.stationId !== station.id) {
      this.clearWorkoutAnimation();
      this.activeWorkout = this.createWorkoutAnimation(station);
      this.scene.add(this.activeWorkout.group);
      this.showRetroBeatText(this.getWorkoutStartBeat(station.type), 0.52);
    }

    this.updateWorkoutAnimation(this.activeWorkout, deltaSeconds);
  }

  private createWorkoutAnimation(station: WorkoutStation): WorkoutAnimation {
    const group = new Group();
    const actor = createPlayerMesh(this.playerAppearance);
    const props = new Group();
    const kind = this.getWorkoutAnimationKind(station.type);

    group.position.set(station.position.x, 0, station.position.z);
    group.rotation.y = station.rotation ?? 0;
    actor.scale.setScalar(this.touchOptimized ? 0.54 : 0.58);
    actor.position.set(-0.18, 0.04, 0.08);
    group.add(actor, props);

    let liftA: Object3D | undefined;
    let liftB: Object3D | undefined;
    let cable: Object3D | undefined;

    if (kind === 'press') {
      const bench = this.createWorkoutBox(1.42, 0.14, 0.56, 0x1b2f43);
      bench.position.set(-0.2, 0.34, 0);
      const bar = this.createWorkoutBar(1.52, 0xeff6ff, 0x24324a);
      bar.position.set(0.18, 1.18, 0);
      const armA = this.createWorkoutBox(0.12, 0.5, 0.1, 0xffc58f);
      const armB = armA.clone();
      armA.position.set(0.0, 0.88, -0.25);
      armB.position.set(0.0, 0.88, 0.25);
      props.add(bench, bar, armA, armB);
      liftA = bar;
      liftB = armA;
      cable = armB;
    } else if (kind === 'squat') {
      const bar = this.createWorkoutBar(1.42, 0xeff6ff, 0x24324a);
      bar.position.set(0, 1.33, 0);
      const pad = this.createWorkoutBox(0.88, 0.1, 0.34, 0xf6c85f);
      pad.position.set(0.1, 0.12, 0);
      props.add(pad, bar);
      liftA = bar;
    } else if (kind === 'cable') {
      const tower = this.createWorkoutBox(0.18, 2.1, 0.18, 0x24324a);
      tower.position.set(0.82, 1.08, 0);
      const handle = this.createWorkoutBar(0.78, 0xf9f7ef, 0xff705c);
      handle.position.set(-0.18, 1.2, 0);
      const line = this.createWorkoutBox(0.04, 1.1, 0.04, 0x141d33);
      line.position.set(0.4, 1.48, 0);
      props.add(tower, line, handle);
      liftA = handle;
      cable = line;
    } else {
      const dumbbellA = this.createWorkoutDumbbell();
      const dumbbellB = this.createWorkoutDumbbell();
      dumbbellA.position.set(-0.34, 0.62, -0.18);
      dumbbellB.position.set(-0.34, 0.62, 0.18);
      props.add(dumbbellA, dumbbellB);
      liftA = dumbbellA;
      liftB = dumbbellB;
    }

    return {
      stationId: station.id,
      type: station.type,
      kind,
      group,
      actor,
      props,
      liftA,
      liftB,
      cable,
      age: 0,
      beatIndex: 0
    };
  }

  private updateWorkoutAnimation(animation: WorkoutAnimation, deltaSeconds: number): void {
    animation.age += deltaSeconds;
    const motionScale = this.settings.reducedMotion ? 0.32 : 1;
    const beatPhase = Math.floor(animation.age / WORKOUT_BEAT_INTERVAL_SECONDS);
    const phase = animation.age * (this.settings.reducedMotion ? 2.1 : 4.2);
    const rep = (Math.sin(phase) + 1) / 2;
    const snap = easeOutCubic(rep);

    if (beatPhase !== animation.beatIndex) {
      animation.beatIndex = beatPhase;
      const beats = ['Rep!', 'Good form!', this.getWorkoutStartBeat(animation.type)];
      this.showRetroBeatText(beats[beatPhase % beats.length], 0.38);
    }

    if (animation.kind === 'press') {
      animation.actor.rotation.set(-1.02, Math.PI / 2, Math.sin(phase * 0.5) * 0.04 * motionScale);
      animation.actor.position.set(-0.32, 0.22 + snap * 0.02 * motionScale, 0);
      if (animation.liftA) {
        animation.liftA.position.y = 0.9 + snap * 0.52 * motionScale;
        animation.liftA.rotation.x = Math.PI / 2;
      }
      if (animation.liftB) {
        animation.liftB.position.y = 0.72 + snap * 0.38 * motionScale;
        animation.liftB.rotation.z = -0.28 + snap * 0.62 * motionScale;
      }
      if (animation.cable) {
        animation.cable.position.y = 0.72 + snap * 0.38 * motionScale;
        animation.cable.rotation.z = 0.28 - snap * 0.62 * motionScale;
      }
      return;
    }

    if (animation.kind === 'squat') {
      const squat = 1 - snap;
      const baseScale = this.touchOptimized ? 0.54 : 0.58;
      animation.actor.rotation.set(0.12 + squat * 0.24 * motionScale, 0, Math.sin(phase * 0.7) * 0.035 * motionScale);
      animation.actor.position.set(-0.08, 0.03 + snap * 0.12 * motionScale, 0);
      animation.actor.scale.set(baseScale, baseScale * (0.84 + snap * 0.2 * motionScale), baseScale);
      if (animation.liftA) {
        animation.liftA.position.y = 1.02 + snap * 0.34 * motionScale;
        animation.liftA.rotation.x = Math.PI / 2;
      }
      return;
    }

    if (animation.kind === 'cable') {
      const pull = snap;
      animation.actor.rotation.set(-0.04 - pull * 0.12 * motionScale, -Math.PI / 2, Math.sin(phase) * 0.035 * motionScale);
      animation.actor.position.set(-0.46 + pull * 0.08 * motionScale, 0.04, 0);
      if (animation.liftA) {
        animation.liftA.position.x = 0.2 - pull * 0.62 * motionScale;
        animation.liftA.position.y = 1.36 - pull * 0.3 * motionScale;
        animation.liftA.rotation.x = Math.PI / 2;
      }
      if (animation.cable) {
        animation.cable.scale.y = 1 - pull * 0.36 * motionScale;
        animation.cable.rotation.z = Math.PI / 2 - pull * 0.28 * motionScale;
      }
      return;
    }

    const curlA = (Math.sin(phase) + 1) / 2;
    const curlB = (Math.sin(phase + Math.PI) + 1) / 2;
    animation.actor.rotation.set(0, 0, Math.sin(phase * 0.5) * 0.05 * motionScale);
    animation.actor.position.set(-0.08, 0.04 + Math.max(curlA, curlB) * 0.04 * motionScale, 0);
    if (animation.liftA) {
      animation.liftA.position.y = 0.44 + curlA * 0.72 * motionScale;
      animation.liftA.rotation.z = Math.PI / 2 + curlA * 0.8 * motionScale;
    }
    if (animation.liftB) {
      animation.liftB.position.y = 0.44 + curlB * 0.72 * motionScale;
      animation.liftB.rotation.z = Math.PI / 2 + curlB * 0.8 * motionScale;
    }
  }

  private clearWorkoutAnimation(): void {
    if (!this.activeWorkout) {
      return;
    }

    this.scene.remove(this.activeWorkout.group);
    this.disposeObject(this.activeWorkout.group);
    this.activeWorkout = undefined;
    this.player.visible = true;
  }

  private getWorkoutAnimationKind(type: WorkoutType): WorkoutAnimationKind {
    if (type === 'bench' || type === 'incline-bench' || type === 'machine-press') {
      return 'press';
    }

    if (type === 'squat-rack' || type === 'hack-squat' || type === 'leg-press') {
      return 'squat';
    }

    if (type === 'cable' || type === 'lat-pulldown') {
      return 'cable';
    }

    return 'free-weights';
  }

  private getWorkoutPulse(
    type: WorkoutType,
    age: number
  ): { lift: number; rotationX: number; rotationZ: number; scaleX: number; scaleY: number; scaleZ: number } {
    const kind = this.getWorkoutAnimationKind(type);
    const rep = (Math.sin(age * 4) + 1) / 2;
    const snap = easeOutCubic(rep);

    if (kind === 'press') {
      return {
        lift: snap * 0.45,
        rotationX: -0.2 + snap * 0.16,
        rotationZ: Math.sin(age * 5) * 0.12,
        scaleX: 0.08,
        scaleY: snap * 0.2,
        scaleZ: -0.04
      };
    }

    if (kind === 'squat') {
      return {
        lift: snap * 0.55,
        rotationX: (1 - snap) * 0.42,
        rotationZ: 0,
        scaleX: 0.02,
        scaleY: snap * 0.22 - 0.08,
        scaleZ: 0.02
      };
    }

    if (kind === 'cable') {
      return {
        lift: snap * 0.28,
        rotationX: -snap * 0.24,
        rotationZ: Math.sin(age * 4.8) * 0.1,
        scaleX: 0.03,
        scaleY: snap * 0.08,
        scaleZ: 0.03
      };
    }

    return {
      lift: Math.max(0, Math.sin(age * 6)) * 0.35,
      rotationX: 0,
      rotationZ: Math.sin(age * 6) * 0.25,
      scaleX: 0.06,
      scaleY: snap * 0.12,
      scaleZ: 0.02
    };
  }

  private getWorkoutStartBeat(type: WorkoutType): string {
    const kind = this.getWorkoutAnimationKind(type);

    if (kind === 'press') {
      return 'Press!';
    }

    if (kind === 'squat') {
      return 'Drive!';
    }

    if (kind === 'cable') {
      return 'Pull!';
    }

    return 'Curl!';
  }

  private showRetroBeatText(text: string, duration = CAPTURE_BEAT_TEXT_HOLD_SECONDS): void {
    this.captureBeatText = text;
    this.captureBeatTextElement.textContent = text;
    this.captureBeatOpacity = 1;
    this.captureBeatTimer = duration;
    this.captureBeatTextElement.style.opacity = '1';
  }

  private createWorkoutBox(width: number, height: number, depth: number, color: number): Mesh {
    return new Mesh(new BoxGeometry(width, height, depth), new MeshBasicMaterial({ color }));
  }

  private createWorkoutCylinder(radius: number, depth: number, color: number, radialSegments = 8): Mesh {
    return new Mesh(new CylinderGeometry(radius, radius, depth, radialSegments), new MeshBasicMaterial({ color }));
  }

  private createWorkoutBar(length: number, barColor: number, plateColor: number): Group {
    const group = new Group();
    const bar = this.createWorkoutCylinder(0.035, length, barColor);
    bar.rotation.x = Math.PI / 2;
    const plateA = this.createWorkoutCylinder(0.15, 0.1, plateColor);
    const plateB = this.createWorkoutCylinder(0.15, 0.1, plateColor);
    plateA.rotation.x = Math.PI / 2;
    plateB.rotation.x = Math.PI / 2;
    plateA.position.z = -length / 2 - 0.08;
    plateB.position.z = length / 2 + 0.08;
    group.add(bar, plateA, plateB);
    return group;
  }

  private createWorkoutDumbbell(): Group {
    const group = new Group();
    const grip = this.createWorkoutCylinder(0.03, 0.36, 0xf9f7ef);
    const headA = this.createWorkoutCylinder(0.11, 0.08, 0x24324a, 6);
    const headB = this.createWorkoutCylinder(0.11, 0.08, 0x24324a, 6);
    grip.rotation.z = Math.PI / 2;
    headA.rotation.z = Math.PI / 2;
    headB.rotation.z = Math.PI / 2;
    headA.position.x = -0.24;
    headB.position.x = 0.24;
    group.add(grip, headA, headB);
    return group;
  }

  private createCaptureBattleStage(success: boolean): { stage: Group; impact: Group } {
    const stage = new Group();
    const impact = new Group();
    const matBack = this.createWorkoutBox(3.8, 0.05, 1.82, 0x141d33);
    const mat = this.createWorkoutBox(3.55, 0.06, 1.62, success ? 0xf6c85f : 0x8bb7ff);
    const centerStripe = this.createWorkoutBox(0.16, 0.07, 1.52, 0xff705c);
    const tableTop = this.createWorkoutBox(1.28, 0.16, 0.74, 0x8b6542);
    const tableEdge = this.createWorkoutBox(1.4, 0.06, 0.86, 0x24324a);
    const leftLeg = this.createWorkoutBox(0.12, 0.34, 0.12, 0x24324a);
    const rightLeg = this.createWorkoutBox(0.12, 0.34, 0.12, 0x24324a);

    matBack.position.set(0.1, 0.025, 0.1);
    mat.position.set(0, 0.055, 0);
    centerStripe.position.set(0, 0.095, 0);
    tableTop.position.set(0, 0.34, 0);
    tableEdge.position.set(0, 0.43, 0);
    leftLeg.position.set(-0.48, 0.18, -0.26);
    rightLeg.position.set(0.48, 0.18, 0.26);
    stage.add(matBack, mat, centerStripe, leftLeg, rightLeg, tableTop, tableEdge, impact);

    const burstColor = success ? 0xffffff : 0xff705c;
    for (let index = 0; index < 6; index += 1) {
      const ray = this.createWorkoutBox(index % 2 === 0 ? 0.08 : 0.06, 0.08, 0.54, burstColor);
      const angle = (index / 6) * Math.PI * 2;
      ray.position.set(Math.sin(angle) * 0.28, 0.58, Math.cos(angle) * 0.28);
      ray.rotation.y = angle;
      ray.rotation.z = index % 2 === 0 ? 0.34 : -0.34;
      impact.add(ray);
    }

    impact.visible = false;
    impact.scale.setScalar(0.2);
    return { stage, impact };
  }

  private handleEvents(events: WorldEvent[]): void {
    for (const event of events) {
      if (event.type === 'workout') {
        this.showRetroBeatText('Workout complete!', 0.62);
        continue;
      }

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
      const stageRotation = Math.atan2(direction.x, direction.z);
      const gap = this.touchOptimized ? 1.02 : 1.12;
      const proneHeight = this.touchOptimized ? 0.13 : 0.15;
      const actorScale = this.touchOptimized ? 0.98 : 1.08;
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

      const playerArm = createArmWrestleArmMesh(this.touchOptimized ? 1.24 : 1.38);
      const creatureArm = createArmWrestleArmMesh(this.touchOptimized ? 1.24 : 1.38);
      const { stage, impact } = this.createCaptureBattleStage(event.result === 'success');
      stage.position.set(midpoint.x, 0, midpoint.z);
      stage.rotation.y = stageRotation;
      this.scene.add(stage, playerMesh, creatureMesh, playerArm, creatureArm, ring);

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
        battleStage: stage,
        impactBurst: impact,
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
            text: 'Arm Wrestle!'
          },
          {
            at: 0.56,
            text: "It's close!"
          },
          {
            at: 1.14,
            text: event.result === 'success' ? 'Pinned!' : 'It powered out!'
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
      x: 0,
      z: 1
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
      const closeupOffset = this.touchOptimized ? CAPTURE_CLOSEUP_CAMERA_OFFSET * 1.12 : CAPTURE_CLOSEUP_CAMERA_OFFSET;
      const closeupHeight = this.touchOptimized ? CAPTURE_CLOSEUP_CAMERA_HEIGHT * 1.08 : CAPTURE_CLOSEUP_CAMERA_HEIGHT;
      const cutsceneOffset = captureEffect.target
        ? {
            x: captureEffect.captureMidpoint.x - direction.x * closeupOffset * cameraSettings.offset,
            z: captureEffect.captureMidpoint.z - direction.z * closeupOffset * cameraSettings.offset
          }
        : {
            x: captureEffect.captureMidpoint.x,
            z: captureEffect.captureMidpoint.z
          };
      const cutscenePosition = new Vector3(
        cutsceneOffset.x,
        lerp(cameraHeight, closeupHeight, focusBlend),
        cutsceneOffset.z
      );
      const cutsceneLookAt = new Vector3(
        captureEffect.captureMidpoint.x,
        lerp(RETRO_LOOK_AT_HEIGHT, CAPTURE_CLOSEUP_LOOK_AT_HEIGHT, settleBlend),
        captureEffect.captureMidpoint.z
      );

      const blend = clamp((1.7 * focusBlend + settleBlend) / 2, 0, 1) * motionBlend;
      desired = defaultPosition.clone().lerp(cutscenePosition, blend);
      lookAt = defaultLookAt.clone().lerp(cutsceneLookAt, blend);
    }

    const smoothing = 1 - Math.pow(this.settings.reducedMotion ? 0.00001 : 0.001, deltaSeconds);
    const targetZoom = captureEffect
      ? lerp(
          1,
          this.touchOptimized ? CAPTURE_CLOSEUP_ZOOM_TOUCH : CAPTURE_CLOSEUP_ZOOM,
          clamp((captureEffect.age / captureEffect.duration) / 0.32, 0, 1)
        )
      : 1;

    this.camera.position.lerp(desired, smoothing);
    const nextZoom = lerp(this.camera.zoom, targetZoom, smoothing);
    if (Math.abs(nextZoom - this.camera.zoom) > 0.001) {
      this.camera.zoom = nextZoom;
      this.camera.updateProjectionMatrix();
    }
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
        const failRecoil = effect.success ? 0 : clamp((progress - 0.58) * 1.75, 0, 1);
        const recoilAmount = Math.min(1, failRecoil);
        const recoil = {
          x: direction.x * 0.72 * recoilAmount,
          z: direction.z * 0.72 * recoilAmount
        };

        effect.playerMesh.position.set(
          playerX - recoil.x,
          0.12 + (Math.abs(Math.sin(progress * Math.PI)) * 0.026 + Math.abs(Math.cos(progress * 7.4)) * 0.009) * motionScale,
          playerZ - recoil.z
        );
        effect.creatureMesh.position.set(
          creatureX + recoil.x,
          0.12 + (Math.abs(Math.sin(progress * Math.PI)) * 0.026 + Math.abs(Math.cos(progress * 7.4)) * 0.009) * motionScale,
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
          const playerArmSwing = 1.0 + Math.sin(progress * 31 + Math.PI / 2) * (WRESTLE_ARM_BASE_TWITCH + struggle * 0.32) * motionScale;
          const creatureArmSwing = 1.0 + Math.sin(progress * 31 + 1.6) * ((WRESTLE_ARM_BASE_TWITCH + struggle * 0.28) * 1.25) * motionScale;

          effect.playerArm.position.set(playerArmX + direction.x * 0.06, 0.55 + shake * 1.5, playerArmZ + direction.z * 0.06);
          effect.creatureArm.position.set(creatureArmX - direction.x * 0.06, 0.55 - shake * 1.5, creatureArmZ - direction.z * 0.06);
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
          const cry = clamp((progress - 0.56) / 0.36, 0, 1);
          effect.tears.visible = cry > 0.02;
          effect.tears.scale.setScalar(clamp(0.4 + cry * 1.45, 0, 1.85));
          effect.tears.rotation.z = Math.sin(progress * 22) * 0.18 * motionScale;
          effect.tears.position.y = 0.22 + Math.sin(progress * 12) * 0.08 * motionScale;
          effect.tears.position.z = 0.28;
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
          effect.creatureMesh.position.x += escapeDirection.x * 0.72 * escape;
          effect.creatureMesh.position.z += escapeDirection.z * 0.72 * escape;
          effect.creatureMesh.position.y = 0.12 + escape * 0.44 * motionScale;
          effect.creatureMesh.rotation.x = lerp(WRESTLE_PRONE_ROT_X, 0.25, escape);
          effect.creatureMesh.rotation.z = -Math.sin(progress * 18) * 0.38 * escape * motionScale;
        }

        if (effect.success) {
          const pin = clamp((progress - 0.66) / 0.28, 0, 1);
          const pinBoost = WRESTLE_PIN_STRENGTH * 1.75 * pin * (0.56 + struggle * 0.44) * (this.settings.reducedMotion ? 0.65 : 1);
          effect.playerMesh.position.x -= direction.x * pinBoost;
          effect.playerMesh.position.z -= direction.z * pinBoost;
          effect.playerMesh.rotation.x = WRESTLE_PRONE_ROT_X + pin * 0.08 * (1 + struggle) * motionScale;
        }

        if (effect.impactBurst) {
          const impact = effect.success ? clamp((progress - 0.64) / 0.16, 0, 1) : clamp((progress - 0.56) / 0.18, 0, 1);
          const fade = clamp((progress - (effect.success ? 0.78 : 0.72)) / 0.18, 0, 1);
          effect.impactBurst.visible = impact > 0.04 && fade < 1;
          effect.impactBurst.scale.setScalar((0.25 + impact * 1.15) * (1 - fade * 0.45));
          effect.impactBurst.rotation.y = progress * 5.5;
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

        if (effect.battleStage) {
          this.scene.remove(effect.battleStage);
          this.disposeObject(effect.battleStage);
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
      this.showRetroBeatText(sequence[index].text, CAPTURE_BEAT_TEXT_HOLD_SECONDS);
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
    const aspect = this.width / this.height;
    const distance = CAMERA_DISTANCE_SETTINGS[this.settings.cameraDistance] ?? CAMERA_DISTANCE_SETTINGS.normal;
    const viewHeight = (this.touchOptimized ? 16.8 : 15.2) * distance.height;
    const viewWidth = viewHeight * aspect * distance.offset;
    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
    const pixelScale = getPixelCanvasScale(this.touchOptimized, this.settings.pixelFilter);
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

const DEBUG_STORAGE_KEY = 'gym-buddy-swole-safari-debug';

function isDebugModeEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const urlDebug = new URLSearchParams(window.location.search).get('debug') === '1';

  try {
    if (urlDebug) {
      window.localStorage.setItem(DEBUG_STORAGE_KEY, '1');
      return true;
    }

    const storedDebug =
      window.localStorage.getItem(DEBUG_STORAGE_KEY) ?? window.localStorage.getItem('debug');
    return storedDebug === '1' || storedDebug === 'true';
  } catch {
    return urlDebug;
  }
}

type DebugPanelApi = {
  refreshSummary: () => void;
  isSummaryVisible: () => boolean;
};

function createDebugPanel(
  root: HTMLElement,
  actions: {
    addSteroids: () => void;
    spawnNormal: () => void;
    spawnExotic: () => void;
    giveCrewXp: () => void;
    forceBoss: () => void;
    clearSave: () => void;
    toggleReducedMotion: () => void;
    getSummary: () => string;
  }
): DebugPanelApi {
  root.classList.add('game-root--debug');
  const panel = document.createElement('section');
  panel.className = 'debug-panel';
  panel.setAttribute('aria-label', 'Developer debug tools');
  panel.innerHTML = `
    <div class="debug-panel__head">
      <strong>Debug Tools</strong>
      <span>?debug=1</span>
    </div>
    <div class="debug-panel__grid">
      <button type="button" data-debug-action="add-steroids">Add 5 steroids</button>
      <button type="button" data-debug-action="spawn-normal">Spawn normal creature</button>
      <button type="button" data-debug-action="spawn-exotic">Spawn exotic creature</button>
      <button type="button" data-debug-action="crew-xp">Give active crew XP</button>
      <button type="button" data-debug-action="boss">Force boss spawn</button>
      <button type="button" data-debug-action="clear-save">Clear save</button>
      <button type="button" data-debug-action="reduced-motion">Toggle reduced motion</button>
      <button type="button" data-debug-action="summary">Show current save data summary</button>
    </div>
    <pre class="debug-panel__summary" data-debug-summary hidden></pre>
  `;
  root.append(panel);

  const summary = panel.querySelector<HTMLPreElement>('[data-debug-summary]');
  const refreshSummary = (): void => {
    if (summary) {
      summary.textContent = actions.getSummary();
    }
  };

  panel.addEventListener('click', (event) => {
    const button = event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>('[data-debug-action]')
      : null;

    if (!button) {
      return;
    }

    const action = button.dataset.debugAction;

    if (action === 'add-steroids') {
      actions.addSteroids();
    } else if (action === 'spawn-normal') {
      actions.spawnNormal();
    } else if (action === 'spawn-exotic') {
      actions.spawnExotic();
    } else if (action === 'crew-xp') {
      actions.giveCrewXp();
    } else if (action === 'boss') {
      actions.forceBoss();
    } else if (action === 'clear-save') {
      actions.clearSave();
    } else if (action === 'reduced-motion') {
      actions.toggleReducedMotion();
    } else if (action === 'summary' && summary) {
      summary.hidden = !summary.hidden;
      refreshSummary();
    }

    if (summary && !summary.hidden) {
      refreshSummary();
    }
  });

  return {
    refreshSummary,
    isSummaryVisible: () => Boolean(summary && !summary.hidden)
  };
}

export function createGymBuddyGame(root: HTMLElement): void {
  const hud = new GameHud(root);
  const initialSettings = loadGameSettingsFromStorage();
  hud.setSettings(initialSettings);
  const audio = new RetroAudio(initialSettings);
  audio.bindUnlockEvents();
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
  let struggleSoundCooldown = 0;

  const saveProgress = (): void => {
    saveProgressToStorage({
      ...world.getSaveData(),
      tutorialCompleted
    });
  };

  const getDebugSaveSummary = (): string => {
    const snapshot = world.getSnapshot();
    const saveData = world.getSaveData();
    const caughtSpecies = snapshot.repDex.filter((entry) => entry.count > 0).length;
    let storedSaveBytes = 0;

    try {
      storedSaveBytes = window.localStorage.getItem(SAVE_STORAGE_KEY)?.length ?? 0;
    } catch {
      storedSaveBytes = 0;
    }

    return [
      `Captured total: ${snapshot.player.capturedTotal}`,
      `Steroids: ${snapshot.player.steroids}`,
      `Active crew: ${snapshot.roster.length}/${snapshot.maxRosterSize}`,
      `Storage: ${snapshot.storage.length}`,
      `RepDex: ${caughtSpecies}/${snapshot.repDex.length}`,
      `Wild active: ${snapshot.activeBuddyCount}`,
      `Boss: ${snapshot.activeBoss ? snapshot.activeBoss.name : 'none'}`,
      `Tutorial complete: ${tutorialCompleted ? 'yes' : 'no'}`,
      `Progression tier: ${saveData.progressionTier}`,
      `Stored save bytes: ${storedSaveBytes}`
    ].join('\n');
  };

  const debugPanel = isDebugModeEnabled()
    ? createDebugPanel(root, {
        addSteroids: () => {
          audio.play('menu-select');
          world.debugAddSteroids();
          saveProgress();
        },
        spawnNormal: () => {
          audio.play('menu-select');
          world.debugSpawnNormalCreature();
        },
        spawnExotic: () => {
          audio.play('menu-select');
          world.debugSpawnExoticCreature();
        },
        giveCrewXp: () => {
          audio.play('menu-select');
          world.debugGiveActiveCrewXp();
          saveProgress();
        },
        forceBoss: () => {
          audio.play('menu-select');
          world.debugForceBossSpawn();
        },
        clearSave: () => {
          audio.play('menu-select');
          clearProgressStorage();
          world.reset();
          tutorialCompleted = false;
          tutorialStep = 0;
          tutorialMoveOrigin = undefined;
          tutorialBuddyReadTimer = 0;
          tutorialExoticNoticeTimer = 0;
          hud.hideTutorialPopup();
          hud.pushMessage('Debug: save cleared and world reset.');
        },
        toggleReducedMotion: () => {
          const nextSettings = {
            ...hud.getSettings(),
            reducedMotion: !hud.getSettings().reducedMotion
          };
          hud.setSettings(nextSettings, true);
        },
        getSummary: getDebugSaveSummary
      })
    : undefined;

  function playWorldEventSound(event: WorldEvent): void {
    if (event.message.startsWith('Goal complete')) {
      audio.play('goal-complete');
      return;
    }

    if (event.type === 'spawn') {
      const definition = getBuddyDefinition(event.buddy.definitionId);
      if (definition.rarity === 'exotic' || definition.isExotic === true) {
        audio.play('exotic-spawn');
      }
      return;
    }

    if (
      event.type === 'capture' &&
      event.captureStyle === 'arm-wrestle' &&
      event.buddy &&
      event.target &&
      (event.result === 'success' || event.result === 'miss')
    ) {
      audio.play('capture-start');
      audio.play(event.result === 'success' ? 'capture-success' : 'capture-fail', 0.76);
      return;
    }

    if (event.type === 'roster') {
      if (event.steroidUsed) {
        audio.play('steroid-use');
        if (event.levelUp) {
          audio.play('level-up', 0.14);
        }
        return;
      }

      if (event.levelUp) {
        audio.play('level-up');
      }
    }
  }

  input.bindTouchControls(hud.touchControls);
  input.bindMouseControls(hud.canvasMount);
  hud.onCaptureAction(() => {
    input.queueCapture();
  });
  hud.onAppearanceChange((appearance) => {
    renderer.updatePlayerAppearance(appearance);
    previewRenderer.updateAppearance(appearance);
  });
  hud.onPreviewRotationChange((rotation) => {
    audio.play('menu-select');
    previewRenderer.setRotation(rotation);
  });
  hud.onSettingsChange((settings) => {
    audio.updateSettings(settings);
    audio.play('menu-select');
    saveGameSettingsToStorage(settings);
    renderer.applySettings(settings);
    previewRenderer.applySettings(settings);
  });
  hud.onStart(() => {
    audio.play('menu-select');
    gameStarted = true;
    hud.pushMessage('The safari has opened.');
    tutorialMoveOrigin = undefined;
  });
  hud.onWorkoutComplete((station) => {
    audio.play('menu-select');
    world.completeWorkout(station);
  });
  hud.onVendingEnergyDrink(() => {
    audio.play('menu-select');
    world.buyEnergyDrink();
  });
  hud.onVendingProteinSnack(() => {
    audio.play('menu-select');
    world.grabProteinSnack();
  });
  hud.onFreeWeightInteract(() => {
    audio.play('menu-select');
    world.interactWithFreeWeight();
  });
  hud.onRosterTrain((rosterId) => {
    audio.play('menu-select');
    world.sendBuddyToWorkout(rosterId);
  });
  hud.onRosterSpot((rosterId) => {
    audio.play('menu-select');
    world.spotBuddy(rosterId);
  });
  hud.onRosterRemove((rosterId) => {
    audio.play('menu-select');
    world.removeBuddy(rosterId);
  });
  hud.onRosterStore((rosterId) => {
    audio.play('menu-select');
    world.storeBuddy(rosterId);
  });
  hud.onStorageActivate((rosterId) => {
    audio.play('menu-select');
    world.activateStoredBuddy(rosterId);
  });
  hud.onRosterUseSteroid((rosterId) => {
    world.useSteroid(rosterId);
  });
  hud.onRosterRename((rosterId, displayName) => {
    audio.play('menu-select');
    world.renameBuddy(rosterId, displayName);
  });
  hud.onResetSave(() => {
    audio.play('menu-select');
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
    audio.play('menu-select');
    world.challengeBoss();
  });
  hud.onInputModeChange((mode: InputMode) => {
    audio.play('menu-select');
    input.setInputMode(mode);
  });
  hud.onTutorialSkip(() => {
    if (tutorialCompleted) {
      return;
    }

    audio.play('menu-select');
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

  function frameUnsafe(now: number): void {
    const deltaSeconds = Math.min((now - lastTime) / 1000, 0.08);
    lastTime = now;
    struggleSoundCooldown = Math.max(0, struggleSoundCooldown - deltaSeconds);

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
    const captureCutsceneNowActive = snapshot.captureCutsceneRemaining > 0;

    if (captureCutsceneNowActive && inputActions.catchPressed && struggleSoundCooldown <= 0) {
      audio.play('arm-wrestle-struggle');
      struggleSoundCooldown = 0.12;
    }

    if (
      events.some(
        (event) => event.type === 'capture' || event.type === 'roster' || event.type === 'workout' || event.type === 'boss'
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
      playWorldEventSound(event);
      hud.pushMessage(event.message);
      if (event.type === 'capture') {
        hud.showCaptureResult(event);
      }
    }

    showTutorialPopup();
    renderer.update(snapshot, events, deltaSeconds, inputActions, hud.getActiveWorkoutStation());
    previewRenderer.update(deltaSeconds, !gameStarted);
    hud.update(snapshot, inputActions, deltaSeconds);
    if (debugPanel?.isSummaryVisible()) {
      debugPanel.refreshSummary();
    }
    requestAnimationFrame(frame);
  }

  function frame(now: number): void {
    try {
      frameUnsafe(now);
    } catch (error) {
      recordRuntimeError(error);
      hud.pushMessage('A gym gremlin tripped the sim. Recovered and kept going.');
      lastTime = performance.now();
      requestAnimationFrame(frame);
    }
  }

  document.addEventListener('visibilitychange', () => {
    lastTime = performance.now();
  });

  requestAnimationFrame(frame);
}

