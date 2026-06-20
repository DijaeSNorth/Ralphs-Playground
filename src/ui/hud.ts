import { getBuddyDefinition } from '../game/content/buddies';
import type { ActionState, WorldSnapshot } from '../game/types';

export class GameHud {
  readonly canvasMount: HTMLDivElement;
  readonly touchControls: HTMLDivElement;

  private readonly staminaFill: HTMLDivElement;
  private readonly shakersValue: HTMLSpanElement;
  private readonly capturedValue: HTMLSpanElement;
  private readonly objective: HTMLDivElement;
  private readonly target: HTMLDivElement;
  private readonly dexList: HTMLDivElement;
  private readonly toast: HTMLDivElement;
  private readonly inputStatus: HTMLDivElement;
  private toastTimer = 0;

  constructor(root: HTMLElement) {
    root.className = 'game-root';
    root.innerHTML = `
      <div class="game-canvas" data-canvas-mount></div>
      <div class="hud" aria-live="polite">
        <section class="hud-cluster hud-cluster--left">
          <div class="objective-chip" data-objective>Find a gym buddy and get close.</div>
          <div class="target-chip" data-target>No target</div>
        </section>
        <section class="hud-cluster hud-cluster--right" aria-label="Player status">
          <div class="stat-row">
            <span>Protein Shakers</span>
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
        <div class="control-hint">Move · Catch · Sprint</div>
        <div class="touch-controls" data-touch-controls aria-label="Touch controls">
          <div class="touch-pad" aria-label="Movement">
            <button type="button" class="touch-key touch-key--up" data-move="up" aria-label="Move up">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l7 8h-5v6h-4v-6H5l7-8z"/></svg>
            </button>
            <button type="button" class="touch-key touch-key--left" data-move="left" aria-label="Move left">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l8-7v5h6v4h-6v5l-8-7z"/></svg>
            </button>
            <button type="button" class="touch-key touch-key--right" data-move="right" aria-label="Move right">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12l-8 7v-5H5v-4h6V5l8 7z"/></svg>
            </button>
            <button type="button" class="touch-key touch-key--down" data-move="down" aria-label="Move down">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19l-7-8h5V5h4v6h5l-7 8z"/></svg>
            </button>
          </div>
          <button type="button" class="catch-button" data-catch>Catch</button>
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
      !touchControls
    ) {
      throw new Error('HUD failed to initialize');
    }

    this.canvasMount = canvasMount;
    this.staminaFill = staminaFill;
    this.shakersValue = shakersValue;
    this.capturedValue = capturedValue;
    this.objective = objective;
    this.target = target;
    this.dexList = dexList;
    this.toast = toast;
    this.inputStatus = inputStatus;
    this.touchControls = touchControls;
  }

  update(snapshot: WorldSnapshot, actions: ActionState, deltaSeconds: number): void {
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
        : `${definition.name} · ${distance.toFixed(1)}m`;
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
}
