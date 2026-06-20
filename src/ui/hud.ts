import { getBuddyDefinition } from '../game/content/buddies';
import {
  DEFAULT_PLAYER_APPEARANCE,
  HAIR_OPTIONS,
  MUSCLE_BUILD_OPTIONS,
  SKIN_TONE_OPTIONS
} from '../game/content/playerAppearance';
import type { ActionState, PlayerAppearance, WorkoutStation, WorkoutType, WorldSnapshot } from '../game/types';

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

export class GameHud {
  readonly canvasMount: HTMLDivElement;
  readonly touchControls: HTMLDivElement;

  private readonly root: HTMLElement;
  private readonly characterCreator: HTMLDivElement;
  private readonly staminaFill: HTMLDivElement;
  private readonly shakersValue: HTMLSpanElement;
  private readonly capturedValue: HTMLSpanElement;
  private readonly objective: HTMLDivElement;
  private readonly target: HTMLDivElement;
  private readonly dexList: HTMLDivElement;
  private readonly toast: HTMLDivElement;
  private readonly inputStatus: HTMLDivElement;
  private readonly workoutPrompt: HTMLDivElement;
  private readonly workoutPromptName: HTMLSpanElement;
  private readonly workoutPanel: HTMLDivElement;
  private readonly workoutTitle: HTMLHeadingElement;
  private readonly workoutInstruction: HTMLDivElement;
  private readonly workoutMeterFill: HTMLDivElement;
  private readonly workoutCursor: HTMLDivElement;
  private readonly workoutScore: HTMLDivElement;
  private readonly workoutButtons: HTMLDivElement;
  private readonly appearanceListeners: Array<(appearance: PlayerAppearance) => void> = [];
  private readonly startListeners: Array<() => void> = [];
  private readonly workoutCompleteListeners: Array<(station: WorkoutStation) => void> = [];
  private appearance: PlayerAppearance = { ...DEFAULT_PLAYER_APPEARANCE };
  private nearbyStation?: WorkoutStation;
  private activeWorkout?: ActiveWorkout;
  private suppressedWorkoutStationId?: string;
  private workoutPromptCooldown = 0;
  private toastTimer = 0;

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
        <div class="toast" data-toast></div>
        <div class="input-status" data-input-status>Keyboard</div>
        <div class="control-hint">Move / Catch / Sprint</div>
        <div class="workout-prompt" data-workout-prompt hidden>
          <span data-workout-prompt-name>Workout station</span>
          <button type="button" data-workout-start>Use</button>
        </div>
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
    const objective = root.querySelector<HTMLDivElement>('[data-objective]');
    const target = root.querySelector<HTMLDivElement>('[data-target]');
    const dexList = root.querySelector<HTMLDivElement>('[data-dex-list]');
    const toast = root.querySelector<HTMLDivElement>('[data-toast]');
    const inputStatus = root.querySelector<HTMLDivElement>('[data-input-status]');
    const touchControls = root.querySelector<HTMLDivElement>('[data-touch-controls]');
    const characterCreator = root.querySelector<HTMLDivElement>('[data-character-creator]');
    const workoutPrompt = root.querySelector<HTMLDivElement>('[data-workout-prompt]');
    const workoutPromptName = root.querySelector<HTMLSpanElement>('[data-workout-prompt-name]');
    const workoutPanel = root.querySelector<HTMLDivElement>('[data-workout-panel]');
    const workoutTitle = root.querySelector<HTMLHeadingElement>('[data-workout-title]');
    const workoutInstruction = root.querySelector<HTMLDivElement>('[data-workout-instruction]');
    const workoutMeterFill = root.querySelector<HTMLDivElement>('[data-workout-meter-fill]');
    const workoutCursor = root.querySelector<HTMLDivElement>('[data-workout-cursor]');
    const workoutScore = root.querySelector<HTMLDivElement>('[data-workout-score]');
    const workoutButtons = root.querySelector<HTMLDivElement>('[data-workout-buttons]');

    if (
      !canvasMount ||
      !staminaFill ||
      !shakersValue ||
      !capturedValue ||
      !objective ||
      !target ||
      !dexList ||
      !toast ||
      !inputStatus ||
      !touchControls ||
      !characterCreator ||
      !workoutPrompt ||
      !workoutPromptName ||
      !workoutPanel ||
      !workoutTitle ||
      !workoutInstruction ||
      !workoutMeterFill ||
      !workoutCursor ||
      !workoutScore ||
      !workoutButtons
    ) {
      throw new Error('HUD failed to initialize');
    }

    this.canvasMount = canvasMount;
    this.characterCreator = characterCreator;
    this.staminaFill = staminaFill;
    this.shakersValue = shakersValue;
    this.capturedValue = capturedValue;
    this.objective = objective;
    this.target = target;
    this.dexList = dexList;
    this.toast = toast;
    this.inputStatus = inputStatus;
    this.touchControls = touchControls;
    this.workoutPrompt = workoutPrompt;
    this.workoutPromptName = workoutPromptName;
    this.workoutPanel = workoutPanel;
    this.workoutTitle = workoutTitle;
    this.workoutInstruction = workoutInstruction;
    this.workoutMeterFill = workoutMeterFill;
    this.workoutCursor = workoutCursor;
    this.workoutScore = workoutScore;
    this.workoutButtons = workoutButtons;
    this.bindCharacterCreator();
    this.bindWorkoutUi();
    this.syncCreatorControls();
  }

  update(snapshot: WorldSnapshot, actions: ActionState, deltaSeconds: number): void {
    this.updateActiveWorkout(deltaSeconds);
    this.workoutPromptCooldown = Math.max(0, this.workoutPromptCooldown - deltaSeconds);
    this.staminaFill.style.width = `${Math.max(0, Math.min(100, snapshot.player.stamina))}%`;
    this.shakersValue.textContent = String(snapshot.player.proteinShakers);
    this.capturedValue.textContent = String(snapshot.player.capturedTotal);
    this.inputStatus.textContent = actions.gamepadConnected ? 'Gamepad' : actions.inputLabel;

    if (snapshot.nearestBuddy) {
      const definition = getBuddyDefinition(snapshot.nearestBuddy.buddy.definitionId);
      const distance = snapshot.nearestBuddy.distance;
      const inRange = distance <= snapshot.captureRange;
      this.target.textContent = inRange
        ? `Catch ${definition.name}`
        : `${definition.name} - ${distance.toFixed(1)}m`;
      this.target.classList.toggle('target-chip--ready', inRange);
      this.objective.textContent = inRange
        ? 'Buddy in range. Throw clean.'
        : 'Close the gap without draining stamina.';
    } else {
      this.target.textContent = 'No target';
      this.target.classList.remove('target-chip--ready');
      this.objective.textContent = 'Find a gym buddy and get close.';
    }

    this.dexList.innerHTML = snapshot.repDex
      .map(
        (entry) => `
          <div class="dex-row ${entry.count > 0 ? 'dex-row--caught' : ''}">
            <span>${entry.definition.name}</span>
            <strong>${entry.count}</strong>
          </div>
        `
      )
      .join('');

    if (this.toastTimer > 0) {
      this.toastTimer -= deltaSeconds;
    }

    this.toast.classList.toggle('toast--visible', this.toastTimer > 0);
  }

  pushMessage(message: string): void {
    this.toast.textContent = message;
    this.toastTimer = 2.35;
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

  isWorkoutActive(): boolean {
    return Boolean(this.activeWorkout);
  }

  tryStartNearbyWorkout(): boolean {
    if (!this.nearbyStation || this.activeWorkout || this.root.classList.contains('game-root--creating')) {
      return false;
    }

    this.startWorkout(this.nearbyStation);
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
      this.root.classList.contains('game-root--creating') ||
      !station ||
      promptSuppressed
    ) {
      this.workoutPrompt.hidden = true;
      return;
    }

    if (this.suppressedWorkoutStationId !== station.id) {
      this.suppressedWorkoutStationId = undefined;
      this.workoutPromptCooldown = 0;
    }

    this.workoutPromptName.textContent = station.name;
    this.workoutPrompt.hidden = false;
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

  private startWorkout(station: WorkoutStation): void {
    this.activeWorkout = {
      station,
      score: 0,
      attempts: 0,
      cursor: station.type === 'free-weights' ? 50 : 35,
      direction: 1,
      expected: this.getInitialExpectedAction(station.type),
      balance: 0,
      message: this.getWorkoutInstruction(station.type)
    };
    this.root.classList.add('game-root--workout');
    this.workoutPrompt.hidden = true;
    this.workoutPanel.hidden = false;
    this.renderWorkout();
  }

  private closeWorkout(): void {
    this.activeWorkout = undefined;
    this.root.classList.remove('game-root--workout');
    this.workoutPanel.hidden = true;
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

    if (workout.station.type === 'bench' || workout.station.type === 'incline-bench') {
      correct = action === workout.expected && workout.cursor >= 28 && workout.cursor <= 82;
      workout.expected = workout.expected === 'lower' ? 'press' : 'lower';
    }

    if (workout.station.type === 'squat-rack') {
      correct =
        action === workout.expected &&
        (action === 'brace' || (workout.cursor >= 25 && workout.cursor <= 85));
      workout.expected = this.getNextSquatAction(workout.expected);
    }

    if (workout.station.type === 'leg-press') {
      correct = action === workout.expected && workout.cursor >= 30 && workout.cursor <= 84;
      workout.expected = workout.expected === 'load' ? 'drive' : 'load';
    }

    if (workout.station.type === 'cable') {
      correct = action === workout.expected;
      workout.expected = this.getNextCableAction(workout.expected);
    }

    if (workout.station.type === 'free-weights') {
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
    this.workoutTitle.textContent = workout.station.name;
    this.workoutInstruction.textContent = workout.message;
    this.workoutScore.textContent = `${workout.score} / ${WORKOUT_GOAL}`;
    this.workoutButtons.innerHTML = this.getWorkoutButtons(workout.station.type, workout.expected);
    this.renderWorkoutMeter();
  }

  private renderWorkoutMeter(): void {
    if (!this.activeWorkout) {
      return;
    }

    const progress = (this.activeWorkout.score / WORKOUT_GOAL) * 100;
    this.workoutMeterFill.style.width = `${progress}%`;
    this.workoutCursor.style.left = `${this.activeWorkout.cursor}%`;
  }

  private getWorkoutButtons(type: WorkoutType, expected: string): string {
    if (type === 'bench' || type === 'incline-bench') {
      return `
        <button type="button" data-workout-action="lower" class="${expected === 'lower' ? 'workout-button--next' : ''}">Lower</button>
        <button type="button" data-workout-action="press" class="${expected === 'press' ? 'workout-button--next' : ''}">Press</button>
      `;
    }

    if (type === 'squat-rack') {
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

    if (type === 'cable') {
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
    if (type === 'bench' || type === 'incline-bench') {
      return 'lower';
    }

    if (type === 'squat-rack') {
      return 'brace';
    }

    if (type === 'leg-press') {
      return 'load';
    }

    if (type === 'cable') {
      return 'high';
    }

    return 'left';
  }

  private usesTimingMeter(type: WorkoutType): boolean {
    return (
      type === 'bench' ||
      type === 'incline-bench' ||
      type === 'squat-rack' ||
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

    if (type === 'squat-rack') {
      return 'Brace, descend, and drive while the bar path stays clean.';
    }

    if (type === 'leg-press') {
      return 'Load and drive the sled through the gold zone.';
    }

    if (type === 'cable') {
      return 'Match the high, mid, low cable pattern.';
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

    if (type === 'squat-rack') {
      return 'Clean depth. Drive out of the pocket.';
    }

    if (type === 'leg-press') {
      return 'Sled moving smooth. Reset the load.';
    }

    if (type === 'cable') {
      return 'Pattern locked. Keep the cable smooth.';
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

    if (type === 'squat-rack') {
      return 'Rep got loose. Re-brace.';
    }

    if (type === 'leg-press') {
      return 'Sled missed the drive window.';
    }

    if (type === 'cable') {
      return 'Cable sequence slipped.';
    }

    return 'Balance drifted. Counter with the other side.';
  }

  private setAppearance(appearance: Partial<PlayerAppearance>): void {
    this.appearance = { ...this.appearance, ...appearance };
    this.syncCreatorControls();
    const snapshot = this.getAppearance();
    this.appearanceListeners.forEach((callback) => callback(snapshot));
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
  }
}
