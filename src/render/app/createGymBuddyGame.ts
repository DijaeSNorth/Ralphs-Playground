import * as THREE from 'three';
import { getNearestWorkoutStation, WORKOUT_STATIONS } from '../../game/content/equipment';
import { InputController } from '../../game/input/actions';
import { GymBuddyWorld } from '../../game/simulation/world';
import type { ActionState, PlayerAppearance, Vec2, WorldEvent, WorldSnapshot } from '../../game/types';
import { GameHud } from '../../ui/hud';
import {
  createArena,
  createBuddyMesh,
  createCaptureRing,
  createGymProps,
  createProteinShakerProjectile,
  createPlayerMesh,
  createWorkoutEquipment
} from '../objects/lowPolyFactory';
import { getBuddyDefinition } from '../../game/content/buddies';

type CaptureEffect = {
  age: number;
  duration: number;
  start: Vec2;
  target: Vec2;
  projectile: THREE.Group;
  ring: THREE.Mesh;
  success: boolean;
};

type RenderCullable = {
  object: THREE.Object3D;
  renderDistance: number;
  center: Vec2;
};

const BUDDY_RENDER_DISTANCE = 24;
const BUDDY_RENDER_DISTANCE_TOUCH = 18;
const DEFAULT_STATION_RENDER_DISTANCE = 25;
const DEFAULT_STATION_RENDER_DISTANCE_TOUCH = 21;

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
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly cullables: RenderCullable[] = [];
  private readonly touchOptimized = shouldUseTouchRendering();
  private player = createPlayerMesh();
  private readonly buddyMeshes = new Map<number, THREE.Group>();
  private readonly effects: CaptureEffect[] = [];
  private readonly clockShadowTarget = new THREE.Object3D();
  private width = 1;
  private height = 1;

  constructor(private readonly container: HTMLElement, initialSnapshot: WorldSnapshot) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.touchOptimized,
      preserveDrawingBuffer: false,
      powerPreference: this.touchOptimized ? 'default' : 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, getRenderPixelRatioCap(this.touchOptimized)));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
    });

    this.container.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color(0xc7d8dc);
    this.scene.fog = new THREE.Fog(0xc7d8dc, 32, 82);

    this.camera.position.set(0, 11, 14);
    this.scene.add(this.clockShadowTarget);
    this.addLights();
    const workoutEquipment = createWorkoutEquipment(WORKOUT_STATIONS);
    this.registerCullables(workoutEquipment);
    this.scene.add(createArena(initialSnapshot.arenaRadius), createGymProps(), workoutEquipment, this.player);

    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(this.container);
    this.resize();
  }

  update(snapshot: WorldSnapshot, events: WorldEvent[], deltaSeconds: number): void {
    this.syncPlayer(snapshot);
    this.syncBuddies(snapshot);
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

  private addLights(): void {
    const hemi = new THREE.HemisphereLight(0xf6fbff, 0xa06f4c, 1.75);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff4dc, 2.05);
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
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
          }
        });
        this.buddyMeshes.delete(id);
      }
    }

    for (const buddy of snapshot.buddies) {
      let mesh = this.buddyMeshes.get(buddy.id);

      if (!mesh) {
        mesh = createBuddyMesh(getBuddyDefinition(buddy.definitionId));
        this.buddyMeshes.set(buddy.id, mesh);
        this.scene.add(mesh);
      }

      const playerDistance = Math.hypot(
        buddy.position.x - snapshot.player.position.x,
        buddy.position.z - snapshot.player.position.z
      );
      const renderDistance = this.touchOptimized ? BUDDY_RENDER_DISTANCE_TOUCH : BUDDY_RENDER_DISTANCE;
      mesh.visible = !buddy.captured && playerDistance <= renderDistance;
      mesh.position.set(buddy.position.x, 0, buddy.position.z);
      mesh.rotation.y = buddy.heading;

      const idleScale = 0.9 + Math.sin(performance.now() * 0.004 + buddy.id) * 0.018;
      mesh.scale.setScalar(idleScale);
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
    const desired = new THREE.Vector3(
      player.position.x + backward.x * 11,
      9.5,
      player.position.z + backward.z * 11
    );
    const lookAt = new THREE.Vector3(player.position.x, 0.75, player.position.z);
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

      const material = effect.ring.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, 0.9 * (1 - progress));

      if (progress >= 1) {
        this.scene.remove(effect.projectile, effect.ring);
        effect.projectile.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
          }
        });
        effect.ring.geometry.dispose();
        material.dispose();
        this.effects.splice(index, 1);
      }
    }
  }

  private registerCullables(root: THREE.Group): void {
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

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
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

export function createGymBuddyGame(root: HTMLElement): void {
  const hud = new GameHud(root);
  const input = new InputController();
  const world = new GymBuddyWorld();
  const initialSnapshot = world.getSnapshot();
  const renderer = new GymBuddyRenderer(hud.canvasMount, initialSnapshot);
  let gameStarted = false;

  input.bindTouchControls(hud.touchControls);
  hud.onAppearanceChange((appearance) => {
    renderer.updatePlayerAppearance(appearance);
  });
  hud.onStart(() => {
    gameStarted = true;
    hud.pushMessage('Mega Gym is open.');
  });
  hud.onWorkoutComplete((station) => {
    world.completeWorkout(station);
  });
  renderer.updatePlayerAppearance(hud.getAppearance());

  let lastTime = performance.now();

  function frame(now: number): void {
    const deltaSeconds = Math.min((now - lastTime) / 1000, 0.08);
    lastTime = now;

    const inputActions = input.read();
    if (gameStarted && !hud.isWorkoutActive() && inputActions.interactPressed) {
      hud.tryStartNearbyWorkout();
    }

    const canSimulate = gameStarted && !hud.isWorkoutActive();
    const actions = canSimulate ? inputActions : createPausedActions(inputActions);
    world.update(canSimulate ? deltaSeconds : 0, actions);
    const events = world.drainEvents();
    const snapshot = world.getSnapshot();
    const nearbyStation = gameStarted ? getNearestWorkoutStation(snapshot.player.position) : undefined;

    for (const event of events) {
      hud.pushMessage(event.message);
    }

    renderer.update(snapshot, events, deltaSeconds);
    hud.updateWorkoutStation(nearbyStation?.station);
    hud.update(snapshot, inputActions, deltaSeconds);
    requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    lastTime = performance.now();
  });

  requestAnimationFrame(frame);
}
