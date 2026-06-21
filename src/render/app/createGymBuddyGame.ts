import {
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PCFSoftShadowMap,
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
  createArena,
  createBuddyMesh,
  createCaptureRing,
  createBossMesh,
  createFreeWeightMesh,
  createGymProps,
  createProteinShakerProjectile,
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
  projectile: Group;
  ring: Mesh;
  success: boolean;
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

  constructor(private readonly container: HTMLElement) {
    this.renderer = new WebGLRenderer({
      alpha: true,
      antialias: !this.touchOptimized,
      preserveDrawingBuffer: true,
      powerPreference: 'default'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.touchOptimized ? 1.1 : 1.4));
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
    this.camera.position.set(0, 1.12, 4.25);
    this.camera.lookAt(0, 0.72, 0);

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

  private addLights(): void {
    this.scene.add(new HemisphereLight(0xf6fbff, 0x7a5b42, 2.4));

    const key = new DirectionalLight(0xfff4dc, 2.6);
    key.position.set(3.8, 5.6, 4.4);
    this.scene.add(key);

    const rim = new DirectionalLight(0x7bdad6, 1.25);
    rim.position.set(-4, 2.4, -3.4);
    this.scene.add(rim);
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    this.width = Math.max(1, Math.floor(rect.width));
    this.height = Math.max(1, Math.floor(rect.height));
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.touchOptimized ? 1.1 : 1.4));
    this.renderer.setSize(this.width, this.height, false);
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

function getRenderPixelRatioCap(touchOptimized: boolean): number {
  return touchOptimized ? 1.15 : 1.5;
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

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
  private width = 1;
  private height = 1;

  constructor(private readonly container: HTMLElement, initialSnapshot: WorldSnapshot) {
    this.renderer = new WebGLRenderer({
      antialias: !this.touchOptimized,
      preserveDrawingBuffer: false,
      powerPreference: this.touchOptimized ? 'default' : 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, getRenderPixelRatioCap(this.touchOptimized)));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
    });

    this.container.appendChild(this.renderer.domElement);
    this.scene.background = new Color(0xc7d8dc);
    this.scene.fog = new Fog(0xc7d8dc, 32, 82);

    this.camera.position.set(0, 11, 14);
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

  update(snapshot: WorldSnapshot, events: WorldEvent[], deltaSeconds: number): void {
    this.syncPlayer(snapshot);
    this.syncBuddies(snapshot);
    this.syncRosterBuddies(snapshot);
    this.syncBoss(snapshot);
    this.syncFreeWeights(snapshot);
    this.handleEvents(events);
    this.updateCamera(snapshot, deltaSeconds);
    this.updateEffects(deltaSeconds);
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
    const hemi = new HemisphereLight(0xf6fbff, 0xa06f4c, 1.75);
    this.scene.add(hemi);

    const sun = new DirectionalLight(0xfff4dc, 2.05);
    sun.position.set(10, 16, 7);
    sun.castShadow = true;
    const shadowSize = this.touchOptimized ? 512 : 1024;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -24;
    sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -24;
    sun.target = this.clockShadowTarget;
    this.scene.add(sun, sun.target);
  }

  private syncPlayer(snapshot: WorldSnapshot): void {
    this.player.position.set(snapshot.player.position.x, 0, snapshot.player.position.z);
    this.player.rotation.y = snapshot.player.heading;

    const bob = Math.sin(performance.now() * 0.008) * 0.035;
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

      const projectile = createProteinShakerProjectile();
      const ring = createCaptureRing(event.result === 'success' ? 0xf6c85f : 0xffffff);
      projectile.position.set(event.start.x, 0.8, event.start.z);
      ring.position.set(event.target.x, 0.08, event.target.z);
      ring.scale.setScalar(0.2);
      this.scene.add(projectile, ring);
      this.effects.push({
        age: 0,
        duration: event.result === 'success' ? 0.78 : 0.55,
        start: event.start,
        target: event.target,
        projectile,
        ring,
        success: event.result === 'success'
      });
    }
  }

  private updateCamera(snapshot: WorldSnapshot, deltaSeconds: number): void {
    const player = snapshot.player;
    const backward = {
      x: -Math.sin(player.heading),
      z: -Math.cos(player.heading)
    };
    const desired = new Vector3(
      player.position.x + backward.x * 11,
      9.5,
      player.position.z + backward.z * 11
    );
    const lookAt = new Vector3(player.position.x, 0.75, player.position.z);
    const smoothing = 1 - Math.pow(0.001, deltaSeconds);

    this.camera.position.lerp(desired, smoothing);
    this.camera.lookAt(lookAt);
    this.clockShadowTarget.position.copy(lookAt);
  }

  private updateEffects(deltaSeconds: number): void {
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index];
      effect.age += deltaSeconds;
      const progress = Math.min(effect.age / effect.duration, 1);
      const eased = easeOutCubic(progress);
      const arc = Math.sin(progress * Math.PI) * 2.2;

      effect.projectile.position.set(
        lerp(effect.start.x, effect.target.x, eased),
        0.8 + arc,
        lerp(effect.start.z, effect.target.z, eased)
      );
      effect.projectile.rotation.x += deltaSeconds * 8;
      effect.projectile.rotation.z += deltaSeconds * 5;

      effect.ring.position.set(effect.target.x, 0.12, effect.target.z);
      effect.ring.scale.setScalar(effect.success ? 0.35 + eased * 2.3 : 0.3 + eased * 1.2);

      const material = effect.ring.material as MeshBasicMaterial;
      material.opacity = Math.max(0, 0.9 * (1 - progress));

      if (progress >= 1) {
        this.scene.remove(effect.projectile, effect.ring);
        effect.projectile.traverse((child) => {
          if (child instanceof Mesh) {
            child.geometry.dispose();
          }
        });
        effect.ring.geometry.dispose();
        material.dispose();
        this.effects.splice(index, 1);
      }
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, getRenderPixelRatioCap(this.touchOptimized)));
    this.renderer.setSize(this.width, this.height, false);
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
  const input = new InputController();
  input.setInputMode(hud.getInputMode());
  const world = new GymBuddyWorld();
  const initialSnapshot = world.getSnapshot();
  const renderer = new GymBuddyRenderer(hud.canvasMount, initialSnapshot);
  const previewRenderer = new CharacterPreviewRenderer(hud.creatorPreviewMount);
  let gameStarted = false;

  input.bindTouchControls(hud.touchControls);
  input.bindMouseControls(hud.canvasMount);
  hud.onAppearanceChange((appearance) => {
    renderer.updatePlayerAppearance(appearance);
    previewRenderer.updateAppearance(appearance);
  });
  hud.onPreviewRotationChange((rotation) => {
    previewRenderer.setRotation(rotation);
  });
  hud.onStart(() => {
    gameStarted = true;
    hud.pushMessage('Mega Gym is open.');
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
  hud.onBossChallenge(() => {
    world.challengeBoss();
  });
  hud.onInputModeChange((mode: InputMode) => {
    input.setInputMode(mode);
  });
  renderer.updatePlayerAppearance(hud.getAppearance());
  previewRenderer.updateAppearance(hud.getAppearance());

  let lastTime = performance.now();
  let proximityTimer = 0;
  let lastProximityPosition: Vec2 | undefined;

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

    const canSimulate = gameStarted && !hud.isInteractionActive();
    const actions = canSimulate ? movementActions : createPausedActions(movementActions);
    world.update(canSimulate ? deltaSeconds : 0, actions);
    const events = world.drainEvents();
    const snapshot = world.getSnapshot();

    if (!gameStarted || shouldRefreshNearbyPrompts(snapshot.player.position, deltaSeconds)) {
      refreshNearbyPrompts(snapshot.player.position);
    }

    for (const event of events) {
      hud.pushMessage(event.message);
    }

    renderer.update(snapshot, events, deltaSeconds);
    previewRenderer.update(deltaSeconds, !gameStarted);
    hud.update(snapshot, inputActions, deltaSeconds);
    requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    lastTime = performance.now();
  });

  requestAnimationFrame(frame);
}
