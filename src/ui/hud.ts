import { getBuddyDefinition } from '../game/content/buddies';
import {
  BODY_SIZE_CONTROLS,
  DEFAULT_PLAYER_APPEARANCE,
  FRAME_OPTIONS,
  HAIR_OPTIONS,
  MUSCLE_BUILD_OPTIONS,
  SKIN_TONE_OPTIONS
} from '../game/content/playerAppearance';
import { WORKOUT_STATIONS } from '../game/content/equipment';
import type {
  ActionState,
  BodySizeKey,
  BossState,
  BuddyRosterEntry,
  PlayerAppearance,
  VendingMachine,
  WorkoutStation,
  WorkoutType,
  WorldSnapshot
} from '../game/types';

type ActiveWorkout = {
  station: WorkoutStation;
  score: number;
  attempts: number;
  cursor: number;
  direction: 1 | -1;
  expected: string;
  balance: number;
  message: string;
};

const WORKOUT_GOAL = 5;
const ROSTER_SPOT_RANGE = 1.95;

export class GameHud {
  readonly canvasMount: HTMLDivElement;
  readonly touchControls: HTMLDivElement;
  readonly creatorPreviewMount: HTMLDivElement;

  private readonly root: HTMLElement;
  private readonly characterCreator: HTMLDivElement;
  private readonly staminaFill: HTMLDivElement;
  private readonly shakersValue: HTMLSpanElement;
  private readonly capturedValue: HTMLSpanElement;
  private readonly objective: HTMLDivElement;
  private readonly target: HTMLDivElement;
  private readonly dexList: HTMLDivElement;
  private readonly crewCount: HTMLSpanElement;
  private readonly crewList: HTMLDivElement;
  private readonly bossPanel: HTMLDivElement;
  private readonly bossName: HTMLSpanElement;
  private readonly bossStats: HTMLSpanElement;
  private readonly bossTimer: HTMLSpanElement;
  private readonly toast: HTMLDivElement;
  private readonly inputStatus: HTMLDivElement;
  private readonly workoutPrompt: HTMLDivElement;
  private readonly workoutPromptName: HTMLSpanElement;
  private readonly freeWeightPrompt: HTMLDivElement;
  private readonly freeWeightPromptName: HTMLSpanElement;
  private readonly freeWeightPromptButton: HTMLButtonElement;
  private readonly vendingPrompt: HTMLDivElement;
  private readonly vendingPromptName: HTMLSpanElement;
  private readonly vendingPanel: HTMLDivElement;
  private readonly vendingTitle: HTMLHeadingElement;
  private readonly vendingEnergyMeta: HTMLSpanElement;
  private readonly vendingSnackMeta: HTMLSpanElement;
  private readonly vendingEnergyButton: HTMLButtonElement;
  private readonly vendingSnackButton: HTMLButtonElement;
  private readonly workoutPanel: HTMLDivElement;
  private readonly workoutTitle: HTMLHeadingElement;
  private readonly workoutInstruction: HTMLDivElement;
  private readonly spotCallout: HTMLDivElement;
  private readonly spotCalloutText: HTMLSpanElement;
  private readonly spotCalloutButton: HTMLButtonElement;
  private readonly workoutMeterFill: HTMLDivElement;
  private readonly workoutCursor: HTMLDivElement;
  private readonly workoutScore: HTMLDivElement;
  private readonly workoutButtons: HTMLDivElement;
  private readonly appearanceListeners: Array<(appearance: PlayerAppearance) => void> = [];
  private readonly startListeners: Array<() => void> = [];
  private readonly workoutCompleteListeners: Array<(station: WorkoutStation) => void> = [];
  private readonly vendingEnergyListeners: Array<() => void> = [];
  private readonly vendingSnackListeners: Array<() => void> = [];
  private readonly freeWeightInteractListeners: Array<() => void> = [];
  private readonly rosterTrainListeners: Array<(rosterId: number) => void> = [];
  private readonly rosterSpotListeners: Array<(rosterId: number) => void> = [];
  private readonly rosterRemoveListeners: Array<(rosterId: number) => void> = [];
  private readonly bossChallengeListeners: Array<() => void> = [];
  private appearance: PlayerAppearance = { ...DEFAULT_PLAYER_APPEARANCE };
  private nearbyStation?: WorkoutStation;
  private nearbyVending?: VendingMachine;
  private activeWorkout?: ActiveWorkout;
  private activeVending?: VendingMachine;
  private suppressedWorkoutStationId?: string;
  private suppressedVendingMachineId?: string;
  private workoutPromptCooldown = 0;
  private vendingPromptCooldown = 0;
  private toastTimer = 0;
  private renderedDexMarkup = '';
  private renderedCrewMarkup = '';
  private renderedStaminaWidth = '';
  private renderedShakersValue = '';
  private renderedCapturedValue = '';
  private renderedCrewCountValue = '';
  private renderedInputStatus = '';
  private renderedObjective = '';
  private renderedTarget = '';
  private renderedTargetReady = false;
  private renderedToastVisible = false;
  private renderedWorkoutPromptName = '';
  private renderedFreeWeightPromptName = '';
  private renderedFreeWeightPromptButton = '';
  private renderedVendingPromptName = '';
  private renderedBossName = '';
  private renderedBossStats = '';
  private renderedBossTimer = '';
  private renderedSpotCalloutText = '';
  private renderedVendingEnergyMeta = '';
  private renderedVendingSnackMeta = '';
  private renderedWorkoutMeterWidth = '';
  private renderedWorkoutCursorLeft = '';
  private spotTargetRosterId?: number;

  constructor(root: HTMLElement) {
    this.root = root;
    root.className = 'game-root game-root--creating';
    root.innerHTML = `
      <div class="game-canvas" data-canvas-mount></div>
      <div class="hud" aria-live="polite">
        <section class="hud-cluster hud-cluster--left">
          <div class="objective-chip" data-objective>Find a gym buddy and get close.</div>
          <div class="target-chip" data-target>No target</div>
        </section>
        <section class="hud-cluster hud-cluster--right" aria-label="Player status">
          <div class="stat-row">
            <span>Shakers</span>
            <strong data-shakers>0</strong>
          </div>
          <div class="stat-row">
            <span>RepDex</span>
            <strong data-captured>0</strong>
          </div>
          <div class="stat-row">
            <span>Crew</span>
            <strong data-crew-count>0/4</strong>
          </div>
          <div class="stamina-wrap" aria-label="Stamina">
            <span>Stamina</span>
            <div class="stamina-track">
              <div class="stamina-fill" data-stamina></div>
            </div>
          </div>
        </section>
        <section class="repdex-panel" aria-label="RepDex entries">
          <div class="panel-title">RepDex</div>
          <div class="dex-list" data-dex-list></div>
        </section>
        <section class="crew-panel" aria-label="Crew buddies">
          <div class="panel-title">Crew</div>
          <div class="crew-list" data-crew-list></div>
        </section>
        <section class="boss-panel" data-boss-panel hidden aria-label="Boss challenge">
          <div>
            <span data-boss-name>Boss</span>
            <strong data-boss-timer>0s</strong>
          </div>
          <span data-boss-stats>Power set</span>
          <button type="button" data-boss-challenge>Challenge</button>
        </section>
        <div class="toast" data-toast></div>
        <div class="input-status" data-input-status>Keyboard + Mouse</div>
        <div class="control-hint">WASD Move / Shift Sprint / Left Click Catch or Throw / Right Click Use</div>
        <div class="workout-prompt" data-workout-prompt hidden>
          <span data-workout-prompt-name>Workout station</span>
          <button type="button" data-workout-start>Use</button>
        </div>
        <div class="freeweight-prompt" data-freeweight-prompt hidden>
          <span data-freeweight-prompt-name>Free Weight</span>
          <button type="button" data-freeweight-action>Pick Up</button>
        </div>
        <div class="spot-callout spot-callout--floating" data-spot-callout hidden>
          <span data-spot-callout-text>Buddy needs a spot.</span>
          <button type="button" data-spot-buddy-now>Spot</button>
        </div>
        <div class="vending-prompt" data-vending-prompt hidden>
          <span data-vending-prompt-name>Fuel Vending</span>
          <button type="button" data-vending-open>Use</button>
        </div>
        <section class="vending-panel" data-vending-panel hidden aria-label="Vending machine">
          <div class="vending-head">
            <h2 data-vending-title>Fuel Vending</h2>
            <button type="button" data-vending-close aria-label="Close vending">Close</button>
          </div>
          <div class="vending-options">
            <button type="button" class="vending-option" data-vending-energy>
              <strong>Energy Drink</strong>
              <span data-vending-energy-meta>1 shaker -> +38 stamina</span>
            </button>
            <button type="button" class="vending-option" data-vending-snack>
              <strong>Protein Snack</strong>
              <span data-vending-snack-meta>Ready</span>
            </button>
          </div>
        </section>
        <section class="workout-panel" data-workout-panel hidden aria-label="Workout mini game">
          <div class="workout-head">
            <h2 data-workout-title>Workout</h2>
            <button type="button" data-workout-close aria-label="Close workout">Close</button>
          </div>
          <div class="workout-instruction" data-workout-instruction></div>
          <div class="workout-meter" aria-hidden="true">
            <div class="workout-meter-fill" data-workout-meter-fill></div>
            <div class="workout-cursor" data-workout-cursor></div>
            <div class="workout-zone"></div>
          </div>
          <div class="workout-score" data-workout-score>0 / 5</div>
          <div class="workout-buttons" data-workout-buttons></div>
        </section>
        <section class="character-creator" data-character-creator aria-label="Character creation">
          <div class="creator-preview" data-character-preview aria-hidden="true"></div>
          <div class="creator-panel">
            <div class="creator-head">
              <h1>Create your catcher</h1>
              <span>Mega Gym entry</span>
            </div>
            <div class="creator-group" aria-label="Hair">
              <div class="creator-label">Hair</div>
              <div class="creator-options">
                ${HAIR_OPTIONS.map(
                  (option) => `
                    <button type="button" class="creator-choice" data-hair="${option.id}" aria-pressed="false">
                      <span class="choice-swatch" style="--swatch: ${option.swatch}"></span>
                      <span>${option.label}</span>
                    </button>
                  `
                ).join('')}
              </div>
            </div>
            <div class="creator-group" aria-label="Skin tone">
              <div class="creator-label">Skin Tone</div>
              <div class="creator-options">
                ${SKIN_TONE_OPTIONS.map(
                  (option) => `
                    <button type="button" class="creator-choice" data-skin="${option.id}" aria-pressed="false">
                      <span class="choice-swatch" style="--swatch: ${option.swatch}"></span>
                      <span>${option.label}</span>
                    </button>
                  `
                ).join('')}
              </div>
            </div>
            <div class="creator-group" aria-label="Muscle build">
              <div class="creator-label">Muscle</div>
              <div class="creator-options creator-options--muscle">
                ${MUSCLE_BUILD_OPTIONS.map(
                  (option) => `
                    <button type="button" class="creator-choice creator-choice--muscle" data-muscle="${option.id}" aria-pressed="false">
                      <span>${option.label}</span>
                    </button>
                  `
                ).join('')}
              </div>
            </div>
            <div class="creator-group" aria-label="Frame">
              <div class="creator-label">Frame</div>
              <div class="creator-options creator-options--frame">
                ${FRAME_OPTIONS.map(
                  (option) => `
                    <button type="button" class="creator-choice creator-choice--frame" data-frame="${option.id}" aria-pressed="false">
                      <span>${option.label}</span>
                    </button>
                  `
                ).join('')}
              </div>
            </div>
            <div class="creator-group" aria-label="Body sizing">
              <div class="creator-label">Body Scale</div>
              <div class="creator-sliders">
                ${BODY_SIZE_CONTROLS.map(
                  (control) => `
                    <label class="creator-slider">
                      <span>${control.label}</span>
                      <input
                        type="range"
                        min="${control.min}"
                        max="${control.max}"
                        step="${control.step}"
                        value="${DEFAULT_PLAYER_APPEARANCE.body[control.id]}"
                        data-body-size="${control.id}"
                      />
                      <strong data-body-size-value="${control.id}">100%</strong>
                    </label>
                  `
                ).join('')}
              </div>
            </div>
            <button type="button" class="creator-start" data-start-game>Enter Gym</button>
          </div>
        </section>
        <div class="touch-controls" data-touch-controls aria-label="Touch controls">
          <div class="touch-joystick" data-joystick aria-label="Move">
            <div class="touch-joystick-ring"></div>
            <div class="touch-joystick-knob" data-joystick-knob></div>
          </div>
          <div class="touch-actions">
            <button type="button" class="touch-action touch-action--sprint" data-sprint>Sprint</button>
            <button type="button" class="touch-action touch-action--catch" data-catch>Catch</button>
          </div>
        </div>
      </div>
    `;

    const canvasMount = root.querySelector<HTMLDivElement>('[data-canvas-mount]');
    const staminaFill = root.querySelector<HTMLDivElement>('[data-stamina]');
    const shakersValue = root.querySelector<HTMLSpanElement>('[data-shakers]');
    const capturedValue = root.querySelector<HTMLSpanElement>('[data-captured]');
    const crewCount = root.querySelector<HTMLSpanElement>('[data-crew-count]');
    const objective = root.querySelector<HTMLDivElement>('[data-objective]');
    const target = root.querySelector<HTMLDivElement>('[data-target]');
    const dexList = root.querySelector<HTMLDivElement>('[data-dex-list]');
    const crewList = root.querySelector<HTMLDivElement>('[data-crew-list]');
    const bossPanel = root.querySelector<HTMLDivElement>('[data-boss-panel]');
    const bossName = root.querySelector<HTMLSpanElement>('[data-boss-name]');
    const bossStats = root.querySelector<HTMLSpanElement>('[data-boss-stats]');
    const bossTimer = root.querySelector<HTMLSpanElement>('[data-boss-timer]');
    const toast = root.querySelector<HTMLDivElement>('[data-toast]');
    const inputStatus = root.querySelector<HTMLDivElement>('[data-input-status]');
    const touchControls = root.querySelector<HTMLDivElement>('[data-touch-controls]');
    const characterCreator = root.querySelector<HTMLDivElement>('[data-character-creator]');
    const creatorPreviewMount = root.querySelector<HTMLDivElement>('[data-character-preview]');
    const workoutPrompt = root.querySelector<HTMLDivElement>('[data-workout-prompt]');
    const workoutPromptName = root.querySelector<HTMLSpanElement>('[data-workout-prompt-name]');
    const freeWeightPrompt = root.querySelector<HTMLDivElement>('[data-freeweight-prompt]');
    const freeWeightPromptName = root.querySelector<HTMLSpanElement>('[data-freeweight-prompt-name]');
    const freeWeightPromptButton = root.querySelector<HTMLButtonElement>('[data-freeweight-action]');
    const vendingPrompt = root.querySelector<HTMLDivElement>('[data-vending-prompt]');
    const vendingPromptName = root.querySelector<HTMLSpanElement>('[data-vending-prompt-name]');
    const vendingPanel = root.querySelector<HTMLDivElement>('[data-vending-panel]');
    const vendingTitle = root.querySelector<HTMLHeadingElement>('[data-vending-title]');
    const vendingEnergyMeta = root.querySelector<HTMLSpanElement>('[data-vending-energy-meta]');
    const vendingSnackMeta = root.querySelector<HTMLSpanElement>('[data-vending-snack-meta]');
    const vendingEnergyButton = root.querySelector<HTMLButtonElement>('[data-vending-energy]');
    const vendingSnackButton = root.querySelector<HTMLButtonElement>('[data-vending-snack]');
    const workoutPanel = root.querySelector<HTMLDivElement>('[data-workout-panel]');
    const workoutTitle = root.querySelector<HTMLHeadingElement>('[data-workout-title]');
    const workoutInstruction = root.querySelector<HTMLDivElement>('[data-workout-instruction]');
    const spotCallout = root.querySelector<HTMLDivElement>('[data-spot-callout]');
    const spotCalloutText = root.querySelector<HTMLSpanElement>('[data-spot-callout-text]');
    const spotCalloutButton = root.querySelector<HTMLButtonElement>('[data-spot-buddy-now]');
    const workoutMeterFill = root.querySelector<HTMLDivElement>('[data-workout-meter-fill]');
    const workoutCursor = root.querySelector<HTMLDivElement>('[data-workout-cursor]');
    const workoutScore = root.querySelector<HTMLDivElement>('[data-workout-score]');
    const workoutButtons = root.querySelector<HTMLDivElement>('[data-workout-buttons]');

    if (
      !canvasMount ||
      !staminaFill ||
      !shakersValue ||
      !capturedValue ||
      !crewCount ||
      !objective ||
      !target ||
      !dexList ||
      !crewList ||
      !bossPanel ||
      !bossName ||
      !bossStats ||
      !bossTimer ||
      !toast ||
      !inputStatus ||
      !touchControls ||
      !characterCreator ||
      !creatorPreviewMount ||
      !workoutPrompt ||
      !workoutPromptName ||
      !freeWeightPrompt ||
      !freeWeightPromptName ||
      !freeWeightPromptButton ||
      !vendingPrompt ||
      !vendingPromptName ||
      !vendingPanel ||
      !vendingTitle ||
      !vendingEnergyMeta ||
      !vendingSnackMeta ||
      !vendingEnergyButton ||
      !vendingSnackButton ||
      !workoutPanel ||
      !workoutTitle ||
      !workoutInstruction ||
      !spotCallout ||
      !spotCalloutText ||
      !spotCalloutButton ||
      !workoutMeterFill ||
      !workoutCursor ||
      !workoutScore ||
      !workoutButtons
    ) {
      throw new Error('HUD failed to initialize');
    }

    this.canvasMount = canvasMount;
    this.characterCreator = characterCreator;
    this.creatorPreviewMount = creatorPreviewMount;
    this.staminaFill = staminaFill;
    this.shakersValue = shakersValue;
    this.capturedValue = capturedValue;
    this.crewCount = crewCount;
    this.objective = objective;
    this.target = target;
    this.dexList = dexList;
    this.crewList = crewList;
    this.bossPanel = bossPanel;
    this.bossName = bossName;
    this.bossStats = bossStats;
    this.bossTimer = bossTimer;
    this.toast = toast;
    this.inputStatus = inputStatus;
    this.touchControls = touchControls;
    this.workoutPrompt = workoutPrompt;
    this.workoutPromptName = workoutPromptName;
    this.freeWeightPrompt = freeWeightPrompt;
    this.freeWeightPromptName = freeWeightPromptName;
    this.freeWeightPromptButton = freeWeightPromptButton;
    this.vendingPrompt = vendingPrompt;
    this.vendingPromptName = vendingPromptName;
    this.vendingPanel = vendingPanel;
    this.vendingTitle = vendingTitle;
    this.vendingEnergyMeta = vendingEnergyMeta;
    this.vendingSnackMeta = vendingSnackMeta;
    this.vendingEnergyButton = vendingEnergyButton;
    this.vendingSnackButton = vendingSnackButton;
    this.workoutPanel = workoutPanel;
    this.workoutTitle = workoutTitle;
    this.workoutInstruction = workoutInstruction;
    this.spotCallout = spotCallout;
    this.spotCalloutText = spotCalloutText;
    this.spotCalloutButton = spotCalloutButton;
    this.workoutMeterFill = workoutMeterFill;
    this.workoutCursor = workoutCursor;
    this.workoutScore = workoutScore;
    this.workoutButtons = workoutButtons;
    this.bindCharacterCreator();
    this.bindWorkoutUi();
    this.bindFreeWeightUi();
    this.bindVendingUi();
    this.bindCrewUi();
    this.bindBossUi();
    this.syncCreatorControls();
  }

  update(snapshot: WorldSnapshot, actions: ActionState, deltaSeconds: number): void {
    this.updateActiveWorkout(deltaSeconds);
    this.workoutPromptCooldown = Math.max(0, this.workoutPromptCooldown - deltaSeconds);
    this.vendingPromptCooldown = Math.max(0, this.vendingPromptCooldown - deltaSeconds);
    const staminaWidth = `${Math.round(Math.max(0, Math.min(100, snapshot.player.stamina)))}%`;
    if (staminaWidth !== this.renderedStaminaWidth) {
      this.staminaFill.style.width = staminaWidth;
      this.renderedStaminaWidth = staminaWidth;
    }

    this.renderedShakersValue = this.setText(
      this.shakersValue,
      this.renderedShakersValue,
      String(snapshot.player.proteinShakers)
    );
    this.renderedCapturedValue = this.setText(
      this.capturedValue,
      this.renderedCapturedValue,
      String(snapshot.player.capturedTotal)
    );
    this.renderedCrewCountValue = this.setText(
      this.crewCount,
      this.renderedCrewCountValue,
      `${snapshot.roster.length}/${snapshot.maxRosterSize}`
    );
    this.renderedInputStatus = this.setText(
      this.inputStatus,
      this.renderedInputStatus,
      actions.inputLabel
    );

    const carriedFreeWeight = snapshot.freeWeights.find((freeWeight) => freeWeight.status === 'carried');
    let targetText = 'No target';
    let objectiveText = 'Find a gym buddy and get close.';
    let targetReady = false;
    if (carriedFreeWeight) {
      targetText = 'Free weight ready';
      objectiveText = 'Left click to throw. Use again to set it down.';
      targetReady = true;
    } else if (snapshot.nearestFreeWeight) {
      targetText = 'Free weight nearby';
      objectiveText = 'Use it to pick up and throw a dumbbell.';
      targetReady = true;
    } else if (snapshot.nearestBuddy) {
      const definition = getBuddyDefinition(snapshot.nearestBuddy.buddy.definitionId);
      const targetName = snapshot.nearestBuddy.buddy.displayName ?? definition.name;
      const distance = snapshot.nearestBuddy.distance;
      const inRange = distance <= snapshot.captureRange;
      targetText = inRange
        ? `Catch ${targetName}`
        : `${targetName} - ${distance.toFixed(1)}m`;
      objectiveText = inRange
        ? 'Buddy in range. Throw clean.'
        : 'Close the gap without draining stamina.';
      targetReady = inRange;
    }

    this.renderedTarget = this.setText(this.target, this.renderedTarget, targetText);
    this.renderedObjective = this.setText(this.objective, this.renderedObjective, objectiveText);
    if (targetReady !== this.renderedTargetReady) {
      this.target.classList.toggle('target-chip--ready', targetReady);
      this.renderedTargetReady = targetReady;
    }

    const dexMarkup = snapshot.repDex
      .map(
        (entry) => `
          <div class="dex-row ${entry.count > 0 ? 'dex-row--caught' : ''}">
            <span>${entry.definition.name}</span>
            <strong>${entry.count}</strong>
          </div>
        `
      )
      .join('');
    if (dexMarkup !== this.renderedDexMarkup) {
      this.dexList.innerHTML = dexMarkup;
      this.renderedDexMarkup = dexMarkup;
    }

    const crewMarkup = this.renderCrew(snapshot.roster);
    if (crewMarkup !== this.renderedCrewMarkup) {
      this.crewList.innerHTML = crewMarkup;
      this.renderedCrewMarkup = crewMarkup;
    }
    this.updateFreeWeightPrompt(snapshot);
    this.updateSpotCallout(snapshot);
    this.updateBossPanel(snapshot.activeBoss);
    this.updateVendingPanel(snapshot);

    if (this.toastTimer > 0) {
      this.toastTimer -= deltaSeconds;
    }

    const toastVisible = this.toastTimer > 0;
    if (toastVisible !== this.renderedToastVisible) {
      this.toast.classList.toggle('toast--visible', toastVisible);
      this.renderedToastVisible = toastVisible;
    }
  }

  pushMessage(message: string): void {
    if (this.toast.textContent !== message) {
      this.toast.textContent = message;
    }

    this.toastTimer = 2.35;
  }

  private setText<T extends HTMLElement>(element: T, previous: string, next: string): string {
    if (previous !== next) {
      element.textContent = next;
      return next;
    }

    return previous;
  }

  private setHidden<T extends HTMLElement>(element: T, hidden: boolean): void {
    if (element.hidden !== hidden) {
      element.hidden = hidden;
    }
  }

  getAppearance(): PlayerAppearance {
    return { ...this.appearance };
  }

  onAppearanceChange(callback: (appearance: PlayerAppearance) => void): void {
    this.appearanceListeners.push(callback);
  }

  onStart(callback: () => void): void {
    this.startListeners.push(callback);
  }

  onWorkoutComplete(callback: (station: WorkoutStation) => void): void {
    this.workoutCompleteListeners.push(callback);
  }

  onVendingEnergyDrink(callback: () => void): void {
    this.vendingEnergyListeners.push(callback);
  }

  onVendingProteinSnack(callback: () => void): void {
    this.vendingSnackListeners.push(callback);
  }

  onFreeWeightInteract(callback: () => void): void {
    this.freeWeightInteractListeners.push(callback);
  }

  onRosterTrain(callback: (rosterId: number) => void): void {
    this.rosterTrainListeners.push(callback);
  }

  onRosterSpot(callback: (rosterId: number) => void): void {
    this.rosterSpotListeners.push(callback);
  }

  onRosterRemove(callback: (rosterId: number) => void): void {
    this.rosterRemoveListeners.push(callback);
  }

  onBossChallenge(callback: () => void): void {
    this.bossChallengeListeners.push(callback);
  }

  isWorkoutActive(): boolean {
    return Boolean(this.activeWorkout);
  }

  isInteractionActive(): boolean {
    return Boolean(this.activeWorkout || this.activeVending);
  }

  tryStartNearbyWorkout(): boolean {
    if (
      !this.nearbyStation ||
      this.activeWorkout ||
      this.activeVending ||
      this.root.classList.contains('game-root--creating')
    ) {
      return false;
    }

    this.startWorkout(this.nearbyStation);
    return true;
  }

  tryStartNearbyVending(): boolean {
    if (
      !this.nearbyVending ||
      this.activeWorkout ||
      this.activeVending ||
      this.root.classList.contains('game-root--creating')
    ) {
      return false;
    }

    this.startVending(this.nearbyVending);
    return true;
  }

  updateWorkoutStation(station?: WorkoutStation): void {
    this.nearbyStation = station;

    if (!station) {
      this.suppressedWorkoutStationId = undefined;
      this.workoutPromptCooldown = 0;
    }

    const promptSuppressed =
      station &&
      this.suppressedWorkoutStationId === station.id &&
      this.workoutPromptCooldown > 0;

    if (
      this.activeWorkout ||
      this.activeVending ||
      this.root.classList.contains('game-root--creating') ||
      !station ||
      promptSuppressed
    ) {
      this.setHidden(this.workoutPrompt, true);
      return;
    }

    if (this.suppressedWorkoutStationId !== station.id) {
      this.suppressedWorkoutStationId = undefined;
      this.workoutPromptCooldown = 0;
    }

    this.renderedWorkoutPromptName = this.setText(
      this.workoutPromptName,
      this.renderedWorkoutPromptName,
      station.name
    );
    this.setHidden(this.workoutPrompt, false);
  }

  updateVendingMachine(machine?: VendingMachine): void {
    this.nearbyVending = machine;

    if (!machine) {
      this.suppressedVendingMachineId = undefined;
      this.vendingPromptCooldown = 0;
    }

    const promptSuppressed =
      machine &&
      this.suppressedVendingMachineId === machine.id &&
      this.vendingPromptCooldown > 0;

    if (
      this.activeWorkout ||
      this.activeVending ||
      this.root.classList.contains('game-root--creating') ||
      !machine ||
      promptSuppressed
    ) {
      this.setHidden(this.vendingPrompt, true);
      return;
    }

    if (this.suppressedVendingMachineId !== machine.id) {
      this.suppressedVendingMachineId = undefined;
      this.vendingPromptCooldown = 0;
    }

    this.renderedVendingPromptName = this.setText(
      this.vendingPromptName,
      this.renderedVendingPromptName,
      machine.name
    );
    this.setHidden(this.vendingPrompt, false);
  }

  closeCharacterCreator(): void {
    this.root.classList.remove('game-root--creating');
    this.characterCreator.hidden = true;
  }

  private bindCharacterCreator(): void {
    this.characterCreator.querySelectorAll<HTMLButtonElement>('[data-hair]').forEach((button) => {
      button.addEventListener('click', () => {
        this.setAppearance({ hair: button.dataset.hair as PlayerAppearance['hair'] });
      });
    });

    this.characterCreator.querySelectorAll<HTMLButtonElement>('[data-skin]').forEach((button) => {
      button.addEventListener('click', () => {
        this.setAppearance({ skinTone: button.dataset.skin as PlayerAppearance['skinTone'] });
      });
    });

    this.characterCreator.querySelectorAll<HTMLButtonElement>('[data-muscle]').forEach((button) => {
      button.addEventListener('click', () => {
        this.setAppearance({ muscleBuild: button.dataset.muscle as PlayerAppearance['muscleBuild'] });
      });
    });

    this.characterCreator.querySelectorAll<HTMLButtonElement>('[data-frame]').forEach((button) => {
      button.addEventListener('click', () => {
        this.setAppearance({ frame: button.dataset.frame as PlayerAppearance['frame'] });
      });
    });

    this.characterCreator.querySelectorAll<HTMLInputElement>('[data-body-size]').forEach((input) => {
      input.addEventListener('input', () => {
        this.setBodySize(input.dataset.bodySize as BodySizeKey, Number(input.value));
      });
    });

    this.characterCreator.querySelector<HTMLButtonElement>('[data-start-game]')?.addEventListener('click', () => {
      this.closeCharacterCreator();
      this.startListeners.forEach((callback) => callback());
    });
  }

  private bindWorkoutUi(): void {
    this.root.querySelector<HTMLButtonElement>('[data-workout-start]')?.addEventListener('click', () => {
      if (this.nearbyStation) {
        this.startWorkout(this.nearbyStation);
      }
    });

    this.root.querySelector<HTMLButtonElement>('[data-workout-close]')?.addEventListener('click', () => {
      this.closeWorkout();
    });

    this.spotCalloutButton.addEventListener('click', () => {
      const targetRosterId = this.spotTargetRosterId;

      if (!this.activeWorkout || targetRosterId === undefined) {
        return;
      }

      this.rosterSpotListeners.forEach((callback) => callback(targetRosterId));
    });

    this.workoutButtons.addEventListener('click', (event) => {
      const target = event.target;

      if (!(target instanceof HTMLButtonElement)) {
        return;
      }

      const action = target.dataset.workoutAction;

      if (action) {
        this.handleWorkoutAction(action);
      }
    });
  }

  private bindFreeWeightUi(): void {
    this.freeWeightPromptButton.addEventListener('click', () => {
      this.freeWeightInteractListeners.forEach((callback) => callback());
    });
  }

  private bindVendingUi(): void {
    this.root.querySelector<HTMLButtonElement>('[data-vending-open]')?.addEventListener('click', () => {
      if (this.nearbyVending) {
        this.startVending(this.nearbyVending);
      }
    });

    this.root.querySelector<HTMLButtonElement>('[data-vending-close]')?.addEventListener('click', () => {
      this.closeVending();
    });

    this.vendingEnergyButton.addEventListener('click', () => {
      this.vendingEnergyListeners.forEach((callback) => callback());
    });

    this.vendingSnackButton.addEventListener('click', () => {
      this.vendingSnackListeners.forEach((callback) => callback());
    });
  }

  private bindCrewUi(): void {
    this.crewList.addEventListener('click', (event) => {
      const target = event.target;

      if (!(target instanceof HTMLButtonElement)) {
        return;
      }

      const trainId = target.dataset.trainBuddy;
      const removeId = target.dataset.removeBuddy;

      if (trainId) {
        this.rosterTrainListeners.forEach((callback) => callback(Number(trainId)));
      }

      if (removeId) {
        this.rosterRemoveListeners.forEach((callback) => callback(Number(removeId)));
      }
    });
  }

  private bindBossUi(): void {
    this.root.querySelector<HTMLButtonElement>('[data-boss-challenge]')?.addEventListener('click', () => {
      this.bossChallengeListeners.forEach((callback) => callback());
    });
  }

  private updateFreeWeightPrompt(snapshot: WorldSnapshot): void {
    const carried = snapshot.freeWeights.find((freeWeight) => freeWeight.status === 'carried');
    const nearest = snapshot.nearestFreeWeight;
    const shouldHide =
      this.activeWorkout ||
      this.activeVending ||
      this.root.classList.contains('game-root--creating') ||
      (!carried && !nearest);

    if (shouldHide) {
      this.setHidden(this.freeWeightPrompt, true);
      return;
    }

    const label = carried
      ? `${carried.name} loaded`
      : nearest
        ? `${nearest.freeWeight.name} ${nearest.distance.toFixed(1)}m`
        : 'Free Weight';
    const buttonText = carried ? 'Drop' : 'Pick Up';
    this.renderedFreeWeightPromptName = this.setText(
      this.freeWeightPromptName,
      this.renderedFreeWeightPromptName,
      label
    );
    this.renderedFreeWeightPromptButton = this.setText(
      this.freeWeightPromptButton,
      this.renderedFreeWeightPromptButton,
      buttonText
    );
    this.setHidden(this.freeWeightPrompt, false);
  }

  private renderCrew(roster: BuddyRosterEntry[]): string {
    if (roster.length === 0) {
      return '<div class="crew-empty">Catch up to 4 gym buddies.</div>';
    }

    return roster
      .map((entry) => {
        const definition = getBuddyDefinition(entry.definitionId);
        const displayName = entry.displayName ?? definition.name;
        const busy = entry.status !== 'ready';
        const progress =
          entry.taskDuration > 0
            ? Math.round(Math.max(0, Math.min(100, 100 - entry.taskTimer / entry.taskDuration * 100)))
            : Math.round(entry.energy);
        let status = `Energy ${Math.round(entry.energy)}`;

        if (entry.status === 'training') {
          status = `${entry.taskLabel ?? 'Training'} ${Math.ceil(entry.taskTimer)}s`;
        }

        if (entry.status === 'needs-spot') {
          status = `Needs spot ${Math.ceil(entry.taskTimer)}s`;
        }

        return `
          <div class="crew-row crew-row--${entry.status}">
            <div class="crew-main">
              <span>${displayName}</span>
              <strong>Lv ${entry.level}</strong>
            </div>
            <div class="crew-stats">
              <span>S${entry.strength}</span>
              <span>E${entry.endurance}</span>
              <span>F${entry.focus}</span>
            </div>
            <div class="crew-meter" aria-hidden="true">
              <div style="width: ${progress}%"></div>
            </div>
            <div class="crew-actions">
              <span>${status}</span>
              <button type="button" data-train-buddy="${entry.rosterId}" ${busy ? 'disabled' : ''}>Train</button>
              <button type="button" class="crew-remove" data-remove-buddy="${entry.rosterId}">Remove</button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  private updateSpotCallout(snapshot: WorldSnapshot): void {
    if (this.root.classList.contains('game-root--creating') || this.activeVending) {
      this.setHidden(this.spotCallout, true);
      this.spotTargetRosterId = undefined;
      return;
    }

    const target = this.findNearbySpotTarget(snapshot);

    this.spotTargetRosterId = target?.rosterId;

    if (!target) {
      this.setHidden(this.spotCallout, true);
      return;
    }

    const station = target.taskStationId
      ? WORKOUT_STATIONS.find((station) => station.id === target.taskStationId)
      : undefined;
    const targetName = target.displayName ?? getBuddyDefinition(target.definitionId).name;
    const stationDistance = station
      ? Math.hypot(snapshot.player.position.x - station.position.x, snapshot.player.position.z - station.position.z)
      : undefined;
    const stationName = station?.name ?? target.taskLabel ?? 'their set';
    const spotRange = this.getSpotRange(station);
    const nearSpot = stationDistance === undefined || stationDistance <= spotRange;
    this.spotCalloutButton.disabled = !nearSpot;
    const text = `${targetName} needs a spot on ${stationName} (${Math.ceil(target.taskTimer)}s)${
      stationDistance !== undefined ? ` - ${stationDistance.toFixed(1)}m` : ''
    }`;
    this.renderedSpotCalloutText = this.setText(
      this.spotCalloutText,
      this.renderedSpotCalloutText,
      text
    );
    this.spotCalloutButton.textContent = nearSpot ? 'Spot' : 'Move Closer';
    this.setHidden(this.spotCallout, false);
  }

  trySpotBuddy(snapshot: WorldSnapshot): boolean {
    const target = this.findNearbySpotTarget(snapshot);

    if (!target || !target.taskStationId) {
      return false;
    }

    const station = WORKOUT_STATIONS.find((candidate) => candidate.id === target.taskStationId);
    const stationDistance = station
      ? Math.hypot(
          snapshot.player.position.x - station.position.x,
          snapshot.player.position.z - station.position.z
        )
      : Infinity;
    const spotRange = this.getSpotRange(station);

    if (stationDistance > spotRange) {
      return false;
    }

    this.rosterSpotListeners.forEach((callback) => callback(target.rosterId));
    return true;
  }

  private getSpotRange(station?: WorkoutStation): number {
    return station ? Math.max(ROSTER_SPOT_RANGE, station.radius - 0.45) : ROSTER_SPOT_RANGE;
  }

  hasSpotTarget(snapshot: WorldSnapshot): boolean {
    return Boolean(this.findNearbySpotTarget(snapshot));
  }

  private findNearbySpotTarget(snapshot: WorldSnapshot): BuddyRosterEntry | undefined {
    let nearest: { target: BuddyRosterEntry; distance: number } | undefined;

    for (const entry of snapshot.roster) {
      if (entry.status !== 'needs-spot' || !entry.taskStationId) {
        continue;
      }

      const station = WORKOUT_STATIONS.find((candidate) => candidate.id === entry.taskStationId);

      if (!station) {
        continue;
      }

      const stationDistance = Math.hypot(
        snapshot.player.position.x - station.position.x,
        snapshot.player.position.z - station.position.z
      );

      if (!nearest || stationDistance < nearest.distance) {
        nearest = { target: entry, distance: stationDistance };
      }
    }

    return nearest?.target;
  }

  private updateBossPanel(boss?: BossState): void {
    if (!boss || this.root.classList.contains('game-root--creating')) {
      this.setHidden(this.bossPanel, true);
      return;
    }

    this.renderedBossName = this.setText(this.bossName, this.renderedBossName, boss.name);
    this.renderedBossStats = this.setText(
      this.bossStats,
      this.renderedBossStats,
      `S${boss.strength} E${boss.endurance} F${boss.focus}`
    );
    this.renderedBossTimer = this.setText(this.bossTimer, this.renderedBossTimer, `${Math.ceil(boss.timer)}s`);
    this.setHidden(this.bossPanel, false);
  }

  private startVending(machine: VendingMachine): void {
    this.activeVending = machine;
    this.root.classList.add('game-root--vending');
    this.setHidden(this.workoutPrompt, true);
    this.setHidden(this.vendingPrompt, true);
    if (this.vendingTitle.textContent !== machine.name) {
      this.vendingTitle.textContent = machine.name;
    }
    this.setHidden(this.vendingPanel, false);
  }

  private closeVending(): void {
    if (this.activeVending) {
      this.suppressedVendingMachineId = this.activeVending.id;
      this.vendingPromptCooldown = 1.8;
    }

    this.activeVending = undefined;
    this.root.classList.remove('game-root--vending');
    this.setHidden(this.vendingPanel, true);
  }

  private updateVendingPanel(snapshot: WorldSnapshot): void {
    if (!this.activeVending) {
      return;
    }

    const machine = this.activeVending;
    const snackCooldown = snapshot.vending.snackCooldown;
    const lacksShaker = snapshot.player.proteinShakers < machine.energyDrinkCost;
    const staminaFull = snapshot.player.stamina >= 99.5;

    const energyDisabled = lacksShaker || staminaFull;
    const snackDisabled = snackCooldown > 0;
    if (this.vendingEnergyButton.disabled !== energyDisabled) {
      this.vendingEnergyButton.disabled = energyDisabled;
    }

    if (this.vendingSnackButton.disabled !== snackDisabled) {
      this.vendingSnackButton.disabled = snackDisabled;
    }

    let energyMeta: string;
    if (lacksShaker) {
      energyMeta = `Need ${machine.energyDrinkCost} shaker`;
    } else if (staminaFull) {
      energyMeta = 'Stamina full';
    } else {
      energyMeta = `${machine.energyDrinkCost} shaker -> +${machine.energyDrinkStamina} stamina`;
    }

    const snackMeta =
      snackCooldown > 0
        ? `Restocking ${Math.ceil(snackCooldown)}s`
        : `+${machine.snackStamina} stamina, +${machine.snackCrewEnergy} crew energy`;
    this.renderedVendingEnergyMeta = this.setText(
      this.vendingEnergyMeta,
      this.renderedVendingEnergyMeta,
      energyMeta
    );
    this.renderedVendingSnackMeta = this.setText(
      this.vendingSnackMeta,
      this.renderedVendingSnackMeta,
      snackMeta
    );
  }

  private startWorkout(station: WorkoutStation): void {
    this.activeWorkout = {
      station,
      score: 0,
      attempts: 0,
      cursor: this.isFreeWeightWorkout(station.type) ? 50 : 35,
      direction: 1,
      expected: this.getInitialExpectedAction(station.type),
      balance: 0,
      message: this.getWorkoutInstruction(station.type)
    };
    this.root.classList.add('game-root--workout');
    this.setHidden(this.workoutPrompt, true);
    this.setHidden(this.workoutPanel, false);
    this.renderWorkout();
  }

  private closeWorkout(): void {
    this.activeWorkout = undefined;
    this.spotTargetRosterId = undefined;
    this.setHidden(this.spotCallout, true);
    this.root.classList.remove('game-root--workout');
    this.setHidden(this.workoutPanel, true);
  }

  private updateActiveWorkout(deltaSeconds: number): void {
    if (!this.activeWorkout) {
      return;
    }

    if (this.usesTimingMeter(this.activeWorkout.station.type)) {
      this.activeWorkout.cursor += this.activeWorkout.direction * deltaSeconds * 62;

      if (this.activeWorkout.cursor >= 100) {
        this.activeWorkout.cursor = 100;
        this.activeWorkout.direction = -1;
      }

      if (this.activeWorkout.cursor <= 0) {
        this.activeWorkout.cursor = 0;
        this.activeWorkout.direction = 1;
      }

      this.renderWorkoutMeter();
    }
  }

  private handleWorkoutAction(action: string): void {
    if (!this.activeWorkout) {
      return;
    }

    const workout = this.activeWorkout;
    let correct = false;

    if (this.isPressWorkout(workout.station.type)) {
      correct = action === workout.expected && workout.cursor >= 28 && workout.cursor <= 82;
      workout.expected = workout.expected === 'lower' ? 'press' : 'lower';
    }

    if (this.isSquatWorkout(workout.station.type)) {
      correct =
        action === workout.expected &&
        (action === 'brace' || (workout.cursor >= 25 && workout.cursor <= 85));
      workout.expected = this.getNextSquatAction(workout.expected);
    }

    if (workout.station.type === 'leg-press') {
      correct = action === workout.expected && workout.cursor >= 30 && workout.cursor <= 84;
      workout.expected = workout.expected === 'load' ? 'drive' : 'load';
    }

    if (this.isCableWorkout(workout.station.type)) {
      correct = action === workout.expected;
      workout.expected = this.getNextCableAction(workout.expected);
    }

    if (this.isFreeWeightWorkout(workout.station.type)) {
      workout.balance += action === 'left' ? -24 : 24;
      workout.balance *= 0.62;
      correct = Math.abs(workout.balance) < 34;
      workout.expected = action === 'left' ? 'right' : 'left';
      workout.cursor = Math.max(0, Math.min(100, 50 + workout.balance));
    }

    workout.attempts += 1;

    if (correct) {
      workout.score += 1;
      workout.message = this.getSuccessMessage(workout.station.type);
    } else {
      workout.score = Math.max(0, workout.score - 1);
      workout.message = this.getMissMessage(workout.station.type);
    }

    if (workout.score >= WORKOUT_GOAL) {
      const completedStation = workout.station;
      this.closeWorkout();
      this.suppressedWorkoutStationId = completedStation.id;
      this.workoutPromptCooldown = 2.45;
      this.workoutCompleteListeners.forEach((callback) => callback(completedStation));
      return;
    }

    this.renderWorkout();
  }

  private renderWorkout(): void {
    if (!this.activeWorkout) {
      return;
    }

    const workout = this.activeWorkout;
    if (this.workoutTitle.textContent !== workout.station.name) {
      this.workoutTitle.textContent = workout.station.name;
    }

    if (this.workoutInstruction.textContent !== workout.message) {
      this.workoutInstruction.textContent = workout.message;
    }

    const scoreText = `${workout.score} / ${WORKOUT_GOAL}`;
    if (this.workoutScore.textContent !== scoreText) {
      this.workoutScore.textContent = scoreText;
    }

    this.workoutButtons.innerHTML = this.getWorkoutButtons(workout.station.type, workout.expected);
    this.renderWorkoutMeter();
  }

  private renderWorkoutMeter(): void {
    if (!this.activeWorkout) {
      return;
    }

    const progress = (this.activeWorkout.score / WORKOUT_GOAL) * 100;
    const meterWidth = `${Math.round(progress)}%`;
    const cursorLeft = `${this.activeWorkout.cursor.toFixed(1)}%`;
    if (meterWidth !== this.renderedWorkoutMeterWidth) {
      this.workoutMeterFill.style.width = meterWidth;
      this.renderedWorkoutMeterWidth = meterWidth;
    }

    if (cursorLeft !== this.renderedWorkoutCursorLeft) {
      this.workoutCursor.style.left = cursorLeft;
      this.renderedWorkoutCursorLeft = cursorLeft;
    }
  }

  private isPressWorkout(type: WorkoutType): boolean {
    return type === 'bench' || type === 'incline-bench' || type === 'machine-press';
  }

  private isSquatWorkout(type: WorkoutType): boolean {
    return type === 'squat-rack' || type === 'hack-squat';
  }

  private isCableWorkout(type: WorkoutType): boolean {
    return type === 'cable' || type === 'lat-pulldown';
  }

  private isFreeWeightWorkout(type: WorkoutType): boolean {
    return type === 'free-weights' || type === 'free-weight-bench';
  }

  private getWorkoutButtons(type: WorkoutType, expected: string): string {
    if (this.isPressWorkout(type)) {
      return `
        <button type="button" data-workout-action="lower" class="${expected === 'lower' ? 'workout-button--next' : ''}">Lower</button>
        <button type="button" data-workout-action="press" class="${expected === 'press' ? 'workout-button--next' : ''}">Press</button>
      `;
    }

    if (this.isSquatWorkout(type)) {
      return `
        <button type="button" data-workout-action="brace" class="${expected === 'brace' ? 'workout-button--next' : ''}">Brace</button>
        <button type="button" data-workout-action="descend" class="${expected === 'descend' ? 'workout-button--next' : ''}">Descend</button>
        <button type="button" data-workout-action="drive" class="${expected === 'drive' ? 'workout-button--next' : ''}">Drive</button>
      `;
    }

    if (type === 'leg-press') {
      return `
        <button type="button" data-workout-action="load" class="${expected === 'load' ? 'workout-button--next' : ''}">Load</button>
        <button type="button" data-workout-action="drive" class="${expected === 'drive' ? 'workout-button--next' : ''}">Drive</button>
      `;
    }

    if (this.isCableWorkout(type)) {
      return `
        <button type="button" data-workout-action="high" class="${expected === 'high' ? 'workout-button--next' : ''}">High</button>
        <button type="button" data-workout-action="mid" class="${expected === 'mid' ? 'workout-button--next' : ''}">Mid</button>
        <button type="button" data-workout-action="low" class="${expected === 'low' ? 'workout-button--next' : ''}">Low</button>
      `;
    }

    return `
      <button type="button" data-workout-action="left" class="${expected === 'left' ? 'workout-button--next' : ''}">Left Curl</button>
      <button type="button" data-workout-action="right" class="${expected === 'right' ? 'workout-button--next' : ''}">Right Curl</button>
    `;
  }

  private getInitialExpectedAction(type: WorkoutType): string {
    if (this.isPressWorkout(type)) {
      return 'lower';
    }

    if (this.isSquatWorkout(type)) {
      return 'brace';
    }

    if (type === 'leg-press') {
      return 'load';
    }

    if (this.isCableWorkout(type)) {
      return 'high';
    }

    return 'left';
  }

  private usesTimingMeter(type: WorkoutType): boolean {
    return (
      this.isPressWorkout(type) ||
      this.isSquatWorkout(type) ||
      type === 'leg-press'
    );
  }

  private getNextSquatAction(current: string): string {
    if (current === 'brace') {
      return 'descend';
    }

    if (current === 'descend') {
      return 'drive';
    }

    return 'brace';
  }

  private getNextCableAction(current: string): string {
    if (current === 'high') {
      return 'mid';
    }

    if (current === 'mid') {
      return 'low';
    }

    return 'high';
  }

  private getWorkoutInstruction(type: WorkoutType): string {
    if (type === 'bench') {
      return 'Lower and press while the bar stays in the gold zone.';
    }

    if (type === 'incline-bench') {
      return 'Control the incline press through the gold zone.';
    }

    if (type === 'machine-press') {
      return 'Drive the press handles through the gold zone.';
    }

    if (type === 'squat-rack') {
      return 'Brace, descend, and drive while the bar path stays clean.';
    }

    if (type === 'hack-squat') {
      return 'Brace into the pads, descend, and drive the sled clean.';
    }

    if (type === 'leg-press') {
      return 'Load and drive the sled through the gold zone.';
    }

    if (type === 'cable') {
      return 'Match the high, mid, low cable pattern.';
    }

    if (type === 'lat-pulldown') {
      return 'Match the high, mid, low pull pattern.';
    }

    if (type === 'free-weight-bench') {
      return 'Balance dumbbell reps left and right without tipping the meter.';
    }

    return 'Balance curls left and right without tipping the meter.';
  }

  private getSuccessMessage(type: WorkoutType): string {
    if (type === 'bench') {
      return 'Solid rep. Control the bar path.';
    }

    if (type === 'incline-bench') {
      return 'Strong angle. Keep the press stacked.';
    }

    if (type === 'machine-press') {
      return 'Machine path locked. Keep pressing clean.';
    }

    if (type === 'squat-rack') {
      return 'Clean depth. Drive out of the pocket.';
    }

    if (type === 'hack-squat') {
      return 'Sled path clean. Keep the drive steady.';
    }

    if (type === 'leg-press') {
      return 'Sled moving smooth. Reset the load.';
    }

    if (type === 'cable') {
      return 'Pattern locked. Keep the cable smooth.';
    }

    if (type === 'lat-pulldown') {
      return 'Pull pattern locked. Control the return.';
    }

    if (type === 'free-weight-bench') {
      return 'Even dumbbell rep. Match the other side.';
    }

    return 'Balanced curl. Keep both sides even.';
  }

  private getMissMessage(type: WorkoutType): string {
    if (type === 'bench') {
      return 'Bar path drifted. Reset the rep.';
    }

    if (type === 'incline-bench') {
      return 'Press drifted off angle.';
    }

    if (type === 'machine-press') {
      return 'Handles drifted. Reset the press.';
    }

    if (type === 'squat-rack') {
      return 'Rep got loose. Re-brace.';
    }

    if (type === 'hack-squat') {
      return 'Sled path got loose. Re-brace.';
    }

    if (type === 'leg-press') {
      return 'Sled missed the drive window.';
    }

    if (type === 'cable') {
      return 'Cable sequence slipped.';
    }

    if (type === 'lat-pulldown') {
      return 'Pull sequence slipped.';
    }

    if (type === 'free-weight-bench') {
      return 'Dumbbells drifted. Counter with the other side.';
    }

    return 'Balance drifted. Counter with the other side.';
  }

  private setAppearance(appearance: Partial<PlayerAppearance>): void {
    this.appearance = {
      ...this.appearance,
      ...appearance,
      body: {
        ...this.appearance.body,
        ...(appearance.body ?? {})
      }
    };
    this.syncCreatorControls();
    const snapshot = this.getAppearance();
    this.appearanceListeners.forEach((callback) => callback(snapshot));
  }

  private setBodySize(key: BodySizeKey, value: number): void {
    if (!key || !Number.isFinite(value)) {
      return;
    }

    this.setAppearance({
      body: {
        ...this.appearance.body,
        [key]: value
      }
    });
  }

  private syncCreatorControls(): void {
    this.characterCreator.querySelectorAll<HTMLButtonElement>('[data-hair]').forEach((button) => {
      const selected = button.dataset.hair === this.appearance.hair;
      button.classList.toggle('creator-choice--selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    this.characterCreator.querySelectorAll<HTMLButtonElement>('[data-skin]').forEach((button) => {
      const selected = button.dataset.skin === this.appearance.skinTone;
      button.classList.toggle('creator-choice--selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    this.characterCreator.querySelectorAll<HTMLButtonElement>('[data-muscle]').forEach((button) => {
      const selected = button.dataset.muscle === this.appearance.muscleBuild;
      button.classList.toggle('creator-choice--selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    this.characterCreator.querySelectorAll<HTMLButtonElement>('[data-frame]').forEach((button) => {
      const selected = button.dataset.frame === this.appearance.frame;
      button.classList.toggle('creator-choice--selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    this.characterCreator.querySelectorAll<HTMLInputElement>('[data-body-size]').forEach((input) => {
      const key = input.dataset.bodySize as BodySizeKey;
      const value = this.appearance.body[key] ?? 1;
      const nextValue = value.toFixed(2);

      if (input.value !== nextValue) {
        input.value = nextValue;
      }

      const output = this.characterCreator.querySelector<HTMLElement>(`[data-body-size-value="${key}"]`);

      if (output) {
        output.textContent = `${Math.round(value * 100)}%`;
      }
    });
  }
}
