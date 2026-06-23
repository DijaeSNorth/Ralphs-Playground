import { getBuddyDefinition } from '../game/content/buddies';
import type { InputMode } from '../game/input/actions';
import { normalizeManifestHairId, normalizeManifestSex } from '../game/content/characterAssetManifest';
import {
  ACTIVE_CREW_LIMIT,
  GOAL_LABELS,
  ROSTER_TRAINING_BALANCE,
  STAMINA_BALANCE,
  VENDING_BALANCE,
  WORKOUT_BALANCE,
  getArmWrestleCatchChance,
  getBuddyXpForNextLevel,
  getGoalTargets
} from '../game/content/balance';
import { BUDDY_DEFINITIONS } from '../game/content/buddies';
import { getCurrentGymEvent } from '../game/content/gymEvents';
import { DEFAULT_GAME_SETTINGS, type CameraDistanceSetting, type GameSettings } from '../game/settings';
import {
  BODY_SIZE_CONTROLS,
  SEX_OPTIONS,
  DEFAULT_PLAYER_APPEARANCE,
  FRAME_OPTIONS,
  HAIR_OPTIONS,
  MUSCLE_BUILD_OPTIONS,
  normalizeBodyFrame,
  SKIN_TONE_OPTIONS
} from '../game/content/playerAppearance';
import { WORKOUT_STATIONS } from '../game/content/equipment';
import { getRecentRuntimeErrors, recordRuntimeError } from '../game/runtimeErrors';
import type {
  ActionState,
  BodySizeKey,
  BossState,
  BuddyRosterEntry,
  BuddyDefinition,
  RepDexEntry,
  BuddyState,
  PlayerAppearance,
  VendingMachine,
  WorkoutStation,
  WorkoutType,
  WorldEvent,
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

const WORKOUT_GOAL = WORKOUT_BALANCE.goalScore;
const ROSTER_SPOT_RANGE = ROSTER_TRAINING_BALANCE.spotRange;
const PREVIEW_ROTATE_STEP = Math.PI / 12;
const SPOT_HOLD_DURATION = 0.55;
const GAME_VERSION = '0.1.0-playtest.1';
const SAVE_VERSION_LABEL = '1';
const CONTROL_HINTS: Record<InputMode, string> = {
  'keyboard-mouse': 'WASD Move / Shift Sprint / Click Arm Wrestle / Right Click Use',
  touch: 'Move / Sprint / Wrestle / Use'
};
const SWITCH_MODE_BUTTON_LABELS: Record<InputMode, string> = {
  'keyboard-mouse': 'Switch to Touch Controls',
  touch: 'Switch to Keyboard + Mouse'
};
const GOAL_TARGETS = getGoalTargets(BUDDY_DEFINITIONS.length);
const RARITY_SORT_ORDER: Record<string, number> = {
  normal: 0,
  common: 0,
  uncommon: 1,
  rare: 2,
  exotic: 3
};
type CrewSortMode = 'level' | 'rarity' | 'strength' | 'recent';
type HudDrawer = 'crew' | 'repdex' | 'goals' | 'settings';

export class GameHud {
  readonly canvasMount: HTMLDivElement;
  readonly touchControls: HTMLDivElement;
  readonly creatorPreviewMount: HTMLDivElement;

  private readonly root: HTMLElement;
  private readonly characterCreator: HTMLDivElement;
  private readonly staminaFill: HTMLDivElement;
  private readonly shakersValue: HTMLSpanElement;
  private readonly steroidsValue: HTMLSpanElement;
  private readonly capturedValue: HTMLSpanElement;
  private readonly objective: HTMLDivElement;
  private readonly target: HTMLDivElement;
  private readonly eventChip: HTMLDivElement;
  private readonly zoneChip: HTMLDivElement;
  private readonly targetPreview: HTMLDivElement;
  private readonly targetPreviewName: HTMLDivElement;
  private readonly targetPreviewRarity: HTMLDivElement;
  private readonly targetPreviewChance: HTMLDivElement;
  private readonly targetCaptureButton: HTMLButtonElement;
  private readonly goalsList: HTMLDivElement;
  private readonly goalsPanel: HTMLElement;
  private readonly goalsPanelToggle: HTMLButtonElement;
  private readonly goalsPanelBody: HTMLDivElement;
  private readonly questsList: HTMLDivElement;
  private readonly questsPanel: HTMLElement;
  private readonly questsPanelToggle: HTMLButtonElement;
  private readonly questsPanelBody: HTMLDivElement;
  private readonly crewSortSelect: HTMLSelectElement;
  private readonly dexList: HTMLDivElement;
  private readonly repdexPanel: HTMLElement;
  private readonly repdexPanelToggle: HTMLButtonElement;
  private readonly repdexPanelBody: HTMLDivElement;
  private readonly repDexDetail: HTMLDivElement;
  private readonly repDexDetailClose: HTMLButtonElement;
  private readonly repDexDetailTitle: HTMLHeadingElement;
  private readonly repDexDetailSpecies: HTMLDivElement;
  private readonly repDexDetailType: HTMLDivElement;
  private readonly repDexDetailRarity: HTMLDivElement;
  private readonly repDexDetailPersonality: HTMLDivElement;
  private readonly repDexDetailFavoriteWorkout: HTMLDivElement;
  private readonly repDexDetailCount: HTMLDivElement;
  private readonly repDexDetailDescription: HTMLDivElement;
  private readonly repDexDetailOdds: HTMLDivElement;
  private readonly repDexDetailFlavor: HTMLDivElement;
  private readonly crewPanel: HTMLElement;
  private readonly crewPanelToggle: HTMLButtonElement;
  private readonly crewPanelBody: HTMLElement;
  private readonly crewDetail: HTMLDivElement;
  private readonly crewDetailClose: HTMLButtonElement;
  private readonly crewDetailTitle: HTMLHeadingElement;
  private readonly crewDetailSpecies: HTMLDivElement;
  private readonly crewDetailType: HTMLDivElement;
  private readonly crewDetailRarity: HTMLDivElement;
  private readonly crewDetailLevel: HTMLDivElement;
  private readonly crewDetailStrength: HTMLDivElement;
  private readonly crewDetailEndurance: HTMLDivElement;
  private readonly crewDetailFocus: HTMLDivElement;
  private readonly crewDetailEnergy: HTMLDivElement;
  private readonly crewDetailCaughtAt: HTMLDivElement;
  private readonly crewDetailNameInput: HTMLInputElement;
  private readonly crewDetailRenameButton: HTMLButtonElement;
  private readonly crewDetailUseSteroidButton: HTMLButtonElement;
  private readonly crewDetailReleaseButton: HTMLButtonElement;
  private readonly crewCount: HTMLSpanElement;
  private readonly crewList: HTMLDivElement;
  private readonly storageList: HTMLDivElement;
  private readonly bossPanel: HTMLDivElement;
  private readonly bossName: HTMLSpanElement;
  private readonly bossStats: HTMLSpanElement;
  private readonly bossTimer: HTMLSpanElement;
  private readonly bossBattlePanel: HTMLDivElement;
  private readonly bossBattleName: HTMLSpanElement;
  private readonly bossBattleResult: HTMLSpanElement;
  private readonly bossBattleMeter: HTMLDivElement;
  private readonly bossBattleScores: HTMLDivElement;
  private readonly bossBattleLog: HTMLDivElement;
  private readonly bossBattleRewards: HTMLDivElement;
  private readonly captureResultCard: HTMLDivElement;
  private readonly captureResultContent: HTMLDivElement;
  private readonly captureResultClose: HTMLButtonElement;
  private readonly captureResultViewCrew: HTMLButtonElement;
  private readonly captureResultKeepPlaying: HTMLButtonElement;
  private readonly toast: HTMLDivElement;
  private readonly inputStatus: HTMLDivElement;
  private readonly controlHint: HTMLDivElement;
  private readonly inputModeButton: HTMLButtonElement;
  private readonly resetSaveButton: HTMLButtonElement;
  private readonly creatorEvent: HTMLDivElement;
  private readonly creatorEventName: HTMLDivElement;
  private readonly creatorEventBonus: HTMLDivElement;
  private readonly settingsButton: HTMLButtonElement;
  private readonly settingsPanel: HTMLDivElement;
  private readonly settingsCloseButton: HTMLButtonElement;
  private readonly menuCrewButton: HTMLButtonElement;
  private readonly menuRepDexButton: HTMLButtonElement;
  private readonly menuGoalsButton: HTMLButtonElement;
  private readonly menuSettingsButton: HTMLButtonElement;
  private readonly panelCloseButtons: NodeListOf<HTMLButtonElement>;
  private readonly settingsMusicInput: HTMLInputElement;
  private readonly settingsMusicValue: HTMLSpanElement;
  private readonly settingsSfxInput: HTMLInputElement;
  private readonly settingsSfxValue: HTMLSpanElement;
  private readonly settingsMuteInput: HTMLInputElement;
  private readonly settingsPixelInput: HTMLInputElement;
  private readonly settingsCameraSelect: HTMLSelectElement;
  private readonly settingsReducedInput: HTMLInputElement;
  private readonly settingsCatchOddsInput: HTMLInputElement;
  private readonly settingsHelpButton: HTMLButtonElement;
  private readonly settingsResetSaveButton: HTMLButtonElement;
  private readonly playtestReportButton: HTMLButtonElement;
  private readonly tutorialPopup: HTMLDivElement;
  private readonly tutorialText: HTMLDivElement;
  private readonly tutorialSkip: HTMLButtonElement;
  private readonly workoutPrompt: HTMLDivElement;
  private readonly workoutPromptName: HTMLSpanElement;
  private readonly freeWeightPrompt: HTMLDivElement;
  private readonly freeWeightPromptName: HTMLSpanElement;
  private readonly freeWeightPromptButton: HTMLButtonElement;
  private readonly vendingPrompt: HTMLDivElement;
  private readonly vendingPromptName: HTMLSpanElement;
  private readonly vendingPanel: HTMLDivElement;
  private readonly previewFront: HTMLButtonElement;
  private readonly previewBack: HTMLButtonElement;
  private readonly previewRotateLeft: HTMLButtonElement;
  private readonly previewRotateRight: HTMLButtonElement;
  private readonly previewRotateReset: HTMLButtonElement;
  private readonly creatorSummary: HTMLDivElement;
  private readonly vendingTitle: HTMLHeadingElement;
  private readonly vendingEnergyMeta: HTMLSpanElement;
  private readonly vendingSnackMeta: HTMLSpanElement;
  private readonly vendingEnergyButton: HTMLButtonElement;
  private readonly vendingSnackButton: HTMLButtonElement;
  private readonly workoutPanel: HTMLDivElement;
  private readonly creatorCustomize: HTMLDetailsElement;
  private readonly creatorCustomizeToggleButton: HTMLButtonElement;
  private readonly creatorStartButton: HTMLButtonElement;
  private readonly creatorSettingsButton: HTMLButtonElement;
  private readonly settingsCustomizeButton: HTMLButtonElement;
  private readonly workoutTitle: HTMLHeadingElement;
  private readonly workoutInstruction: HTMLDivElement;
  private readonly spotCallout: HTMLDivElement;
  private readonly spotCalloutText: HTMLSpanElement;
  private readonly spotCalloutButton: HTMLButtonElement;
  private readonly spotCalloutMeterFill: HTMLDivElement;
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
  private readonly rosterStoreListeners: Array<(rosterId: number) => void> = [];
  private readonly rosterUseSteroidListeners: Array<(rosterId: number) => void> = [];
  private readonly rosterRenameListeners: Array<(rosterId: number, displayName?: string) => void> = [];
  private readonly storageActivateListeners: Array<(rosterId: number) => void> = [];
  private readonly bossChallengeListeners: Array<() => void> = [];
  private readonly previewRotationListeners: Array<(rotation: number) => void> = [];
  private readonly inputModeListeners: Array<(mode: InputMode) => void> = [];
  private readonly resetSaveListeners: Array<() => void> = [];
  private readonly settingsChangeListeners: Array<(settings: GameSettings) => void> = [];
  private readonly tutorialSkipListeners: Array<() => void> = [];
  private activeDrawer?: HudDrawer;
  private inputMode: InputMode = 'keyboard-mouse';
  private settings: GameSettings = { ...DEFAULT_GAME_SETTINGS };
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
  private renderedStorageMarkup = '';
  private renderedStaminaWidth = '';
  private renderedShakersValue = '';
  private renderedSteroidsValue = '';
  private renderedCapturedValue = '';
  private renderedCrewCountValue = '';
  private renderedInputStatus = '';
  private renderedObjective = '';
  private renderedTarget = '';
  private renderedEventName = '';
  private renderedEventBonus = '';
  private renderedZoneName = '';
  private renderedZoneDescription = '';
  private renderedTargetReady = false;
  private renderedTargetPreviewName = '';
  private renderedTargetPreviewRarity = '';
  private renderedTargetPreviewChance = '';
  private renderedGoalsMarkup = '';
  private renderedQuestsMarkup = '';
  private renderedToastVisible = false;
  private availableSteroids = 0;
  private renderedTutorialText = '';
  private renderedWorkoutPromptName = '';
  private renderedFreeWeightPromptName = '';
  private renderedFreeWeightPromptButton = '';
  private renderedVendingPromptName = '';
  private latestSnapshot?: WorldSnapshot;
  private renderedBossName = '';
  private renderedBossStats = '';
  private renderedBossTimer = '';
  private renderedBossBattleName = '';
  private renderedBossBattleResult = '';
  private renderedBossBattleMeter = '';
  private renderedBossBattleScores = '';
  private renderedBossBattleLog = '';
  private renderedBossBattleRewards = '';
  private captureResultTimer = 0;
  private pendingCaptureResult?: {
    delay: number;
    html: string;
    visibleSeconds: number;
  };
  private renderedSpotCalloutText = '';
  private renderedVendingEnergyMeta = '';
  private renderedVendingSnackMeta = '';
  private renderedWorkoutMeterWidth = '';
  private renderedWorkoutCursorLeft = '';
  private renderedSpotMeterWidth = '';
  private readonly repDexEntriesById = new Map<string, RepDexEntry>();
  private readonly rosterEntriesById = new Map<number, BuddyRosterEntry>();
  private readonly storageEntriesById = new Map<number, BuddyRosterEntry>();
  private readonly rosterNameById = new Map<number, string>();
  private activeCrewDetailId?: number;
  private lastCreatureDetailTrigger?: HTMLElement;
  private crewSort: CrewSortMode = 'recent';
  private spotTargetRosterId?: number;
  private spotHoldProgress = 0;
  private spotHoldActive = false;
  private spotHoldTargetId?: number;
  private previewRotation = -0.45;
  private readonly creatorHairButtons: NodeListOf<HTMLButtonElement>;
  private readonly creatorSkinButtons: NodeListOf<HTMLButtonElement>;
  private readonly creatorSexButtons: NodeListOf<HTMLButtonElement>;
  private readonly creatorMuscleButtons: NodeListOf<HTMLButtonElement>;
  private readonly creatorFrameButtons: NodeListOf<HTMLButtonElement>;
  private readonly creatorBodySizeInputs: NodeListOf<HTMLInputElement>;
  private readonly creatorBodySizeValueElements = new Map<BodySizeKey, HTMLElement>();
  private appearanceNotifyHandle: number | null = null;
  private hasStarted = false;
  private readonly captureActionListeners: Array<() => void> = [];

  constructor(root: HTMLElement) {
    this.root = root;
    const initialEvent = getCurrentGymEvent();
    root.className = 'game-root game-root--creating';
    try {
      const debugEnabled =
        new URLSearchParams(window.location.search).get('debug') === '1' ||
        window.localStorage.getItem('debug') === '1';
      root.classList.toggle('game-root--debug-enabled', debugEnabled);
    } catch {
      root.classList.remove('game-root--debug-enabled');
    }
    root.innerHTML = `
      <div class="game-canvas" data-canvas-mount></div>
      <div class="hud" aria-live="polite">
        <section class="hud-cluster hud-cluster--left">
          <div class="objective-chip" data-objective>Arm-wrestle wild gym beasts. Build the strongest crew.</div>
          <div class="event-chip" data-event-chip>
            <span>Today</span>
            <strong>${initialEvent.name}</strong>
            <small>${initialEvent.bonusLabel}</small>
          </div>
          <div class="zone-chip" data-zone-chip>
            <span>Zone</span>
            <strong>Finding Zone</strong>
            <small>Move around the gym.</small>
          </div>
          <div class="target-chip" data-target>No target</div>
          <section class="target-preview target-preview--hidden" data-target-preview>
            <div class="target-preview-name" data-target-preview-name></div>
            <div class="target-preview-rarity" data-target-preview-rarity></div>
            <div class="target-preview-chance" data-target-preview-chance></div>
            <button type="button" class="target-preview-action" data-capture-action>Arm Wrestle</button>
          </section>
          <section class="goals-panel hud-panel--collapsible" data-panel="goals" aria-label="Progress goals">
            <div class="panel-title">
              <span>Goals</span>
              <button type="button" class="panel-toggle" data-panel-toggle="goals" aria-expanded="true" aria-controls="goals-body">?</button>
              <button type="button" class="panel-close" data-panel-close="goals" aria-label="Close goals">Close</button>
            </div>
            <div class="panel-body" id="goals-body">
              <div class="goals-list" data-goals-list></div>
            </div>
          </section>
          <section class="quests-panel hud-panel--collapsible" data-panel="quests" aria-label="Active quests">
            <div class="panel-title">
              <span>Quests</span>
              <button type="button" class="panel-toggle" data-panel-toggle="quests" aria-expanded="true" aria-controls="quests-body">?</button>
              <button type="button" class="panel-close" data-panel-close="goals" aria-label="Close quests">Close</button>
            </div>
            <div class="panel-body" id="quests-body">
              <div class="quests-list" data-quests-list></div>
            </div>
          </section>
        </section>
        <section class="hud-cluster hud-cluster--right" aria-label="Player status">
          <div class="stat-row stat-row--tokens">
            <span>Gym Tokens</span>
            <strong data-shakers>0</strong>
          </div>
          <div class="stat-row stat-row--steroids">
            <span>Steroids</span>
            <strong data-steroids>0</strong>
          </div>
          <div class="steroid-flavor">Instantly adds one level to a captured creature.</div>
          <div class="stat-row stat-row--repdex">
            <span>RepDex</span>
            <strong data-captured>0</strong>
          </div>
          <div class="stat-row stat-row--crew">
            <span>Crew</span>
            <strong data-crew-count>0/${ACTIVE_CREW_LIMIT}</strong>
          </div>
          <div class="stamina-wrap" aria-label="Stamina">
            <span>Stamina</span>
            <div class="stamina-track">
              <div class="stamina-fill" data-stamina></div>
            </div>
          </div>
        </section>
        <nav class="hud-menu-bar" aria-label="Game menus">
          <button type="button" class="hud-menu-button" data-menu-open="crew">Crew</button>
          <button type="button" class="hud-menu-button" data-menu-open="repdex">RepDex</button>
          <button type="button" class="hud-menu-button" data-menu-open="goals">Goals</button>
          <button type="button" class="hud-menu-button" data-menu-open="settings">Settings</button>
        </nav>
        <section class="repdex-panel hud-panel--collapsible" data-panel="repdex" aria-label="RepDex entries">
          <div class="panel-title">
            <span>RepDex</span>
            <button type="button" class="panel-toggle" data-panel-toggle="repdex" aria-expanded="true" aria-controls="repdex-body">?</button>
            <button type="button" class="panel-close" data-panel-close="repdex" aria-label="Close RepDex">Close</button>
          </div>
          <div class="panel-body" id="repdex-body">
            <div class="dex-list" data-dex-list></div>
          </div>
        </section>
        <section class="repdex-detail" data-repdex-detail hidden aria-label="RepDex creature detail">
          <button type="button" class="repdex-detail-close" data-repdex-detail-close aria-label="Close creature card">ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½</button>
          <h2 class="repdex-detail-title" data-repdex-detail-title>Creature</h2>
          <div class="repdex-detail-grid">
            <div class="repdex-detail-field"><span>Species</span><strong data-repdex-detail-species>Unknown</strong></div>
            <div class="repdex-detail-field"><span>Type</span><strong data-repdex-detail-type>Normal</strong></div>
            <div class="repdex-detail-field"><span>Rarity</span><strong data-repdex-detail-rarity>Normal</strong></div>
            <div class="repdex-detail-field repdex-detail-full"><span>Personality</span><strong data-repdex-detail-personality>ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½</strong></div>
            <div class="repdex-detail-field repdex-detail-full"><span>Favorite Workout</span><strong data-repdex-detail-fav-workout>ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½</strong></div>
            <div class="repdex-detail-field repdex-detail-full"><span>Caught</span><strong data-repdex-detail-count>0</strong></div>
          </div>
          <p class="repdex-detail-description" data-repdex-detail-description>Capture a creature to add details.</p>
          <div class="repdex-detail-odds" data-repdex-detail-odds></div>
          <p class="repdex-detail-flavor" data-repdex-detail-flavor>...</p>
        </section>
        <section class="crew-panel hud-panel--collapsible" data-panel="crew" aria-label="Crew buddies">
          <div class="panel-title">
            <span>Crew</span>
            <button type="button" class="panel-toggle" data-panel-toggle="crew" aria-expanded="true" aria-controls="crew-body">?</button>
            <button type="button" class="panel-close" data-panel-close="crew" aria-label="Close crew">Close</button>
          </div>
          <div class="panel-body" id="crew-body">
            <label class="crew-sort-control">
              <span>Sort</span>
              <select class="crew-sort-select" data-crew-sort>
                <option value="level">Level</option>
                <option value="rarity">Rarity</option>
                <option value="strength">Strength</option>
                <option value="recent" selected>Recently Caught</option>
              </select>
            </label>
            <div class="crew-section-label">Active Crew</div>
            <div class="crew-list" data-crew-list></div>
            <div class="crew-section-label crew-section-label--storage">Storage</div>
            <div class="storage-list" data-storage-list></div>
          </div>
        </section>
        <section class="crew-detail" data-crew-detail hidden aria-label="Crew creature detail">
          <button type="button" class="crew-detail-close" data-crew-detail-close aria-label="Close crew detail">ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½</button>
          <h2 class="crew-detail-title" data-crew-detail-title>Creature</h2>
          <div class="crew-detail-grid">
            <div class="crew-detail-field"><span>Species</span><strong data-crew-detail-species>Unknown</strong></div>
            <div class="crew-detail-field"><span>Type</span><strong data-crew-detail-type>Normal</strong></div>
            <div class="crew-detail-field"><span>Rarity</span><strong data-crew-detail-rarity>normal</strong></div>
            <div class="crew-detail-field"><span>Level</span><strong data-crew-detail-level>1</strong></div>
            <div class="crew-detail-field"><span>Strength</span><strong data-crew-detail-strength>0</strong></div>
            <div class="crew-detail-field"><span>Endurance</span><strong data-crew-detail-endurance>0</strong></div>
            <div class="crew-detail-field"><span>Focus</span><strong data-crew-detail-focus>0</strong></div>
            <div class="crew-detail-field"><span>Energy</span><strong data-crew-detail-energy>100</strong></div>
            <div class="crew-detail-field"><span>Caught</span><strong data-crew-detail-caught>ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½</strong></div>
            <div class="crew-detail-field crew-detail-field--wide">
              <span>Rename this buddy</span>
              <div class="crew-detail-rename">
                <input type="text" maxlength="22" data-crew-detail-rename-input />
                <button type="button" data-crew-detail-rename>Save</button>
              </div>
            </div>
            </div>
          <div class="crew-detail-actions">
            <button type="button" class="crew-detail-use" data-crew-detail-use>Use</button>
            <button type="button" class="crew-detail-release" data-crew-detail-release>Release</button>
          </div>
        </section>
        <section class="boss-panel" data-boss-panel hidden aria-label="Boss challenge">
          <div>
            <span data-boss-name>Boss</span>
            <strong data-boss-timer>0s</strong>
          </div>
          <span data-boss-stats>Power set</span>
          <button type="button" data-boss-challenge>Challenge</button>
        </section>
        <section class="boss-battle-panel" data-boss-battle-panel hidden aria-label="Boss battle">
          <div class="boss-battle-head">
            <span data-boss-battle-name>Boss Battle</span>
            <strong data-boss-battle-result>VS</strong>
          </div>
          <div class="boss-battle-meter" aria-hidden="true">
            <div data-boss-battle-meter></div>
          </div>
          <div class="boss-battle-scores" data-boss-battle-scores></div>
          <div class="boss-battle-log" data-boss-battle-log></div>
          <div class="boss-battle-rewards" data-boss-battle-rewards></div>
        </section>
        <section class="capture-result-card" data-capture-result hidden aria-label="Capture result">
          <button type="button" class="capture-result-card__close" data-capture-result-close aria-label="Close capture result">Skip</button>
          <div class="capture-result-card__content" data-capture-result-content></div>
          <div class="capture-result-card__actions">
            <button type="button" class="capture-result-card__button" data-capture-result-view-crew>View Crew</button>
            <button type="button" class="capture-result-card__button" data-capture-result-keep-playing>Keep Playing</button>
          </div>
        </section>
        <div class="toast" data-toast></div>
        <div class="input-status" data-input-status>Keyboard + Mouse</div>
        <button type="button" class="input-mode-toggle" data-input-mode>Keyboard + Mouse</button>
        <button type="button" class="settings-toggle" data-settings-open aria-expanded="false">Settings</button>
        <section class="settings-panel" data-settings-panel hidden aria-label="Settings">
          <div class="settings-head">
            <h2>Settings</h2>
            <button type="button" data-settings-close aria-label="Close settings">Close</button>
          </div>
          <label class="settings-control">
            <span>Music</span>
            <input type="range" min="0" max="100" step="5" data-settings-music />
            <strong data-settings-music-value>60</strong>
          </label>
          <label class="settings-control">
            <span>SFX</span>
            <input type="range" min="0" max="100" step="5" data-settings-sfx />
            <strong data-settings-sfx-value>75</strong>
          </label>
          <label class="settings-check">
            <input type="checkbox" data-settings-muted />
            <span>Mute</span>
          </label>
          <label class="settings-check">
            <input type="checkbox" data-settings-pixel />
            <span>Pixel filter</span>
          </label>
          <label class="settings-control">
            <span>Camera</span>
            <select data-settings-camera>
              <option value="close">Close</option>
              <option value="normal">Normal</option>
              <option value="far">Far</option>
            </select>
          </label>
          <label class="settings-check">
            <input type="checkbox" data-settings-reduced-motion />
            <span>Reduced motion</span>
          </label>
          <label class="settings-check">
            <input type="checkbox" data-settings-catch-odds />
            <span>Show catch odds</span>
          </label>
          <button type="button" class="settings-help" data-settings-help>Help / Tutorial</button>
          <button type="button" class="settings-customize" data-settings-customize>Customize Character</button>
          <details class="feedback-notes">
            <summary>Feedback Notes</summary>
            <ul>
              <li>Was the first capture goal clear?</li>
              <li>Did the catch odds and result screen make sense?</li>
              <li>Were touch, keyboard, and buttons easy to use?</li>
              <li>Which creature, boss, or menu felt confusing?</li>
              <li>Report browser, device, screen size, and any console errors.</li>
            </ul>
          </details>
          <button type="button" class="settings-reset-save" data-settings-reset-save>Reset Save</button>
        </section>
        <div class="control-hint" data-control-hint>WASD Move / Shift Sprint / Left Click Arm Wrestle / Right Click Use</div>
        <section class="tutorial-popup" data-tutorial-popup hidden>
          <div class="tutorial-popup__text" data-tutorial-text></div>
          <button type="button" class="tutorial-popup__skip" data-tutorial-skip>Skip Tutorial</button>
        </section>
        <div class="workout-prompt" data-workout-prompt hidden>
          <span data-workout-prompt-name>Workout station</span>
          <button type="button" data-workout-start>Use</button>
        </div>
        <div class="freeweight-prompt" data-freeweight-prompt hidden>
          <span data-freeweight-prompt-name>Free Weight</span>
          <button type="button" data-freeweight-action>Pick Up</button>
        </div>
        <div class="spot-callout spot-callout--floating" data-spot-callout hidden>
          <span data-spot-callout-text>Beast needs a spot.</span>
          <div class="spot-meter-stack">
            <button type="button" data-spot-buddy-now>Hold to Spot</button>
            <div class="spot-meter" aria-hidden="true">
              <div class="spot-meter-fill" data-spot-callout-meter-fill></div>
            </div>
          </div>
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
              <span data-vending-energy-meta>${VENDING_BALANCE.energyDrinkCost} token -> +${VENDING_BALANCE.energyDrinkStamina} stamina</span>
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
            <div class="creator-preview-wrap">
              <div class="creator-preview" data-character-preview aria-hidden="true"></div>
              <div class="creator-preview-controls">
                <button type="button" class="creator-preview-rotate" data-preview-front>Front View</button>
                <button type="button" class="creator-preview-rotate" data-preview-rotate-left>Rotate Left</button>
                <button type="button" class="creator-preview-rotate" data-preview-rotate-reset>Reset View</button>
                <button type="button" class="creator-preview-rotate" data-preview-rotate-right>Rotate Right</button>
                <button type="button" class="creator-preview-rotate" data-preview-back>Back View</button>
              </div>
            </div>
              <div class="creator-live-summary" data-creator-summary>
                Build: Athletic. Frame: Balanced. Focus: balanced proportions.
              </div>
          <div class="creator-panel">
          <div class="creator-head">
            <h1>Ralph's Swole Safari</h1>
            <span>Arm wrestle wild gym beasts. Build the strongest crew.</span>
            <small class="creator-version">Version ${GAME_VERSION}</small>
          </div>
            <div class="creator-event" data-creator-event>
              <span>Local Gym Event</span>
              <strong data-creator-event-name>${initialEvent.name}</strong>
              <small data-creator-event-bonus>${initialEvent.bonusLabel}</small>
            </div>
            <p class="creator-short-instruction">Move around. Find a creature. Arm wrestle to capture it.</p>
            <details class="creator-customize">
              <summary>Customize Character</summary>
            <div class="creator-group" aria-label="Hair">
              <div class="creator-label">Hair</div><p class="creator-helper">Changes the head silhouette and is easiest to inspect from Front or Back View.</p>
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
            <div class="creator-group" aria-label="Sex">
              <div class="creator-label">Sex</div><p class="creator-helper">Changes the base body proportions before frame and sliders are applied.</p>
              <div class="creator-options creator-options--frame">
                ${SEX_OPTIONS.map(
                  (option) => `
                    <button type="button" class="creator-choice creator-choice--frame" data-sex="${option.id}" aria-pressed="false" title="${option.description}">
                      <span>${option.label}</span>
                      <small>${option.description}</small>
                    </button>
                  `
                ).join('')}
              </div>
            </div>
            <div class="creator-group" aria-label="Skin tone">
              <div class="creator-label">Skin Tone</div><p class="creator-helper">Updates face, arms, shoulders, and muscle highlights immediately.</p>
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
              <div class="creator-label">Muscle</div><p class="creator-helper">Controls overall muscle mass, definition, and silhouette size.</p>
              <div class="creator-options creator-options--muscle">
                ${MUSCLE_BUILD_OPTIONS.map(
                  (option) => `
                    <button type="button" class="creator-choice creator-choice--muscle" data-muscle="${option.id}" aria-pressed="false" title="${option.description}">
                      <span>${option.label}</span>
                      <small>${option.description}</small>
                    </button>
                  `
                ).join('')}
              </div>
            </div>
            <div class="creator-group" aria-label="Frame">
              <div class="creator-label">Frame</div><p class="creator-helper">Changes shoulder, waist, hip, and height proportions.</p>
              <div class="creator-options creator-options--frame">
                ${FRAME_OPTIONS.map(
                  (option) => `
                    <button type="button" class="creator-choice creator-choice--frame" data-frame="${option.id}" aria-pressed="false" title="${option.description}">
                      <span>${option.label}</span>
                      <small>${option.description}</small>
                    </button>
                  `
                ).join('')}
              </div>
            </div>
            <div class="creator-group" aria-label="Body sizing">
              <div class="creator-label">Body Scale</div><p class="creator-helper">Fine-tunes shoulders, arms, chest, back, legs, glutes, thighs, and calves.</p>
              <div class="creator-sliders">
                ${BODY_SIZE_CONTROLS.map(
                  (control) => `
                    <label class="creator-slider">
                      <span>${control.label}</span>
                      <small>${control.description}</small>
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
            </details>
            <div class="creator-action-row">
              <button type="button" class="creator-customize-toggle" data-toggle-customize>Customize Character</button>
              <button type="button" class="creator-start" data-start-game>Start Game</button>
              <button type="button" class="creator-settings" data-creator-settings>Settings</button>
              <button type="button" class="creator-reset-save" data-reset-save>Reset Save</button>
            </div>
          </div>
        </section>
        <div class="touch-controls" data-touch-controls aria-label="Touch controls">
          <div class="touch-joystick" data-joystick aria-label="Move">
            <div class="touch-joystick-ring"></div>
            <div class="touch-joystick-knob" data-joystick-knob></div>
          </div>
          <div class="touch-actions">
            <button type="button" class="touch-action touch-action--interact" data-interact>Use</button>
            <button type="button" class="touch-action touch-action--sprint" data-sprint>Sprint</button>
            <button type="button" class="touch-action touch-action--catch" data-catch>Wrestle</button>
          </div>
        </div>
      </div>
    `;

    const canvasMount = root.querySelector<HTMLDivElement>('[data-canvas-mount]');
    const staminaFill = root.querySelector<HTMLDivElement>('[data-stamina]');
    const shakersValue = root.querySelector<HTMLSpanElement>('[data-shakers]');
    const steroidsValue = root.querySelector<HTMLSpanElement>('[data-steroids]');
    const capturedValue = root.querySelector<HTMLSpanElement>('[data-captured]');
    const crewCount = root.querySelector<HTMLSpanElement>('[data-crew-count]');
    const resetSaveButton = root.querySelector<HTMLButtonElement>('[data-reset-save]');
    const objective = root.querySelector<HTMLDivElement>('[data-objective]');
    const target = root.querySelector<HTMLDivElement>('[data-target]');
    const eventChip = root.querySelector<HTMLDivElement>('[data-event-chip]');
    const zoneChip = root.querySelector<HTMLDivElement>('[data-zone-chip]');
    const targetPreview = root.querySelector<HTMLDivElement>('[data-target-preview]');
    const targetPreviewName = root.querySelector<HTMLDivElement>('[data-target-preview-name]');
    const targetPreviewRarity = root.querySelector<HTMLDivElement>('[data-target-preview-rarity]');
    const targetPreviewChance = root.querySelector<HTMLDivElement>('[data-target-preview-chance]');
    const targetCaptureButton = root.querySelector<HTMLButtonElement>('[data-capture-action]');
    const goalsList = root.querySelector<HTMLDivElement>('[data-goals-list]');
    const goalsPanel = root.querySelector<HTMLElement>('.goals-panel[data-panel="goals"]');
    const goalsPanelToggle = root.querySelector<HTMLButtonElement>('[data-panel-toggle="goals"]');
    const goalsPanelBody = root.querySelector<HTMLDivElement>('[id="goals-body"]');
    const questsList = root.querySelector<HTMLDivElement>('[data-quests-list]');
    const questsPanel = root.querySelector<HTMLElement>('.quests-panel[data-panel="quests"]');
    const questsPanelToggle = root.querySelector<HTMLButtonElement>('[data-panel-toggle="quests"]');
    const questsPanelBody = root.querySelector<HTMLDivElement>('[id="quests-body"]');
    const crewSortSelect = root.querySelector<HTMLSelectElement>('[data-crew-sort]');
    const dexList = root.querySelector<HTMLDivElement>('[data-dex-list]');
    const repdexPanel = root.querySelector<HTMLElement>('.repdex-panel[data-panel="repdex"]');
    const repdexPanelToggle = root.querySelector<HTMLButtonElement>('[data-panel-toggle="repdex"]');
    const repdexPanelBody = root.querySelector<HTMLDivElement>('[id="repdex-body"]');
    const repDexDetail = root.querySelector<HTMLDivElement>('[data-repdex-detail]');
    const repDexDetailClose = root.querySelector<HTMLButtonElement>('[data-repdex-detail-close]');
    const repDexDetailTitle = root.querySelector<HTMLHeadingElement>('[data-repdex-detail-title]');
    const repDexDetailSpecies = root.querySelector<HTMLDivElement>('[data-repdex-detail-species]');
    const repDexDetailType = root.querySelector<HTMLDivElement>('[data-repdex-detail-type]');
    const repDexDetailRarity = root.querySelector<HTMLDivElement>('[data-repdex-detail-rarity]');
    const repDexDetailPersonality = root.querySelector<HTMLDivElement>('[data-repdex-detail-personality]');
    const repDexDetailFavoriteWorkout = root.querySelector<HTMLDivElement>('[data-repdex-detail-fav-workout]');
    const repDexDetailCount = root.querySelector<HTMLDivElement>('[data-repdex-detail-count]');
    const repDexDetailDescription = root.querySelector<HTMLDivElement>('[data-repdex-detail-description]');
    const repDexDetailOdds = root.querySelector<HTMLDivElement>('[data-repdex-detail-odds]');
    const repDexDetailFlavor = root.querySelector<HTMLDivElement>('[data-repdex-detail-flavor]');
    const crewPanel = root.querySelector<HTMLElement>('.crew-panel[data-panel="crew"]');
    const crewPanelToggle = root.querySelector<HTMLButtonElement>('[data-panel-toggle="crew"]');
    const crewPanelBody = root.querySelector<HTMLElement>('[id="crew-body"]');
    const crewDetail = root.querySelector<HTMLDivElement>('[data-crew-detail]');
    const crewDetailClose = root.querySelector<HTMLButtonElement>('[data-crew-detail-close]');
    const crewDetailTitle = root.querySelector<HTMLHeadingElement>('[data-crew-detail-title]');
    const crewDetailSpecies = root.querySelector<HTMLDivElement>('[data-crew-detail-species]');
    const crewDetailType = root.querySelector<HTMLDivElement>('[data-crew-detail-type]');
    const crewDetailRarity = root.querySelector<HTMLDivElement>('[data-crew-detail-rarity]');
    const crewDetailLevel = root.querySelector<HTMLDivElement>('[data-crew-detail-level]');
    const crewDetailStrength = root.querySelector<HTMLDivElement>('[data-crew-detail-strength]');
    const crewDetailEndurance = root.querySelector<HTMLDivElement>('[data-crew-detail-endurance]');
    const crewDetailFocus = root.querySelector<HTMLDivElement>('[data-crew-detail-focus]');
    const crewDetailEnergy = root.querySelector<HTMLDivElement>('[data-crew-detail-energy]');
    const crewDetailCaughtAt = root.querySelector<HTMLDivElement>('[data-crew-detail-caught]');
    const crewDetailNameInput = root.querySelector<HTMLInputElement>('[data-crew-detail-rename-input]');
    const crewDetailRenameButton = root.querySelector<HTMLButtonElement>('[data-crew-detail-rename]');
    const crewDetailUseSteroidButton = root.querySelector<HTMLButtonElement>('[data-crew-detail-use]');
    const crewDetailReleaseButton = root.querySelector<HTMLButtonElement>('[data-crew-detail-release]');
    const crewList = root.querySelector<HTMLDivElement>('[data-crew-list]');
    const storageList = root.querySelector<HTMLDivElement>('[data-storage-list]');
    const bossPanel = root.querySelector<HTMLDivElement>('[data-boss-panel]');
    const bossName = root.querySelector<HTMLSpanElement>('[data-boss-name]');
    const bossStats = root.querySelector<HTMLSpanElement>('[data-boss-stats]');
    const bossTimer = root.querySelector<HTMLSpanElement>('[data-boss-timer]');
    const bossBattlePanel = root.querySelector<HTMLDivElement>('[data-boss-battle-panel]');
    const bossBattleName = root.querySelector<HTMLSpanElement>('[data-boss-battle-name]');
    const bossBattleResult = root.querySelector<HTMLSpanElement>('[data-boss-battle-result]');
    const bossBattleMeter = root.querySelector<HTMLDivElement>('[data-boss-battle-meter]');
    const bossBattleScores = root.querySelector<HTMLDivElement>('[data-boss-battle-scores]');
    const bossBattleLog = root.querySelector<HTMLDivElement>('[data-boss-battle-log]');
    const bossBattleRewards = root.querySelector<HTMLDivElement>('[data-boss-battle-rewards]');
    const captureResultCard = root.querySelector<HTMLDivElement>('[data-capture-result]');
    const captureResultContent = root.querySelector<HTMLDivElement>('[data-capture-result-content]');
    const captureResultClose = root.querySelector<HTMLButtonElement>('[data-capture-result-close]');
    const captureResultViewCrew = root.querySelector<HTMLButtonElement>('[data-capture-result-view-crew]');
    const captureResultKeepPlaying = root.querySelector<HTMLButtonElement>('[data-capture-result-keep-playing]');
    const toast = root.querySelector<HTMLDivElement>('[data-toast]');
    const inputStatus = root.querySelector<HTMLDivElement>('[data-input-status]');
    const controlHint = root.querySelector<HTMLDivElement>('[data-control-hint]');
    const inputModeButton = root.querySelector<HTMLButtonElement>('[data-input-mode]');
    const settingsButton = root.querySelector<HTMLButtonElement>('[data-settings-open]');
    const settingsPanel = root.querySelector<HTMLDivElement>('[data-settings-panel]');
    const settingsCloseButton = root.querySelector<HTMLButtonElement>('[data-settings-close]');
    const settingsCustomizeButton = root.querySelector<HTMLButtonElement>('[data-settings-customize]');
    const menuCrewButton = root.querySelector<HTMLButtonElement>('[data-menu-open="crew"]');
    const menuRepDexButton = root.querySelector<HTMLButtonElement>('[data-menu-open="repdex"]');
    const menuGoalsButton = root.querySelector<HTMLButtonElement>('[data-menu-open="goals"]');
    const menuSettingsButton = root.querySelector<HTMLButtonElement>('[data-menu-open="settings"]');
    const panelCloseButtons = root.querySelectorAll<HTMLButtonElement>('[data-panel-close]');
    const settingsMusicInput = root.querySelector<HTMLInputElement>('[data-settings-music]');
    const settingsMusicValue = root.querySelector<HTMLSpanElement>('[data-settings-music-value]');
    const settingsSfxInput = root.querySelector<HTMLInputElement>('[data-settings-sfx]');
    const settingsSfxValue = root.querySelector<HTMLSpanElement>('[data-settings-sfx-value]');
    const settingsMuteInput = root.querySelector<HTMLInputElement>('[data-settings-muted]');
    const settingsPixelInput = root.querySelector<HTMLInputElement>('[data-settings-pixel]');
    const settingsCameraSelect = root.querySelector<HTMLSelectElement>('[data-settings-camera]');
    const settingsReducedInput = root.querySelector<HTMLInputElement>('[data-settings-reduced-motion]');
    const settingsCatchOddsInput = root.querySelector<HTMLInputElement>('[data-settings-catch-odds]');
    const settingsHelpButton = root.querySelector<HTMLButtonElement>('[data-settings-help]');
    const settingsResetSaveButton = root.querySelector<HTMLButtonElement>('[data-settings-reset-save]');
    const tutorialPopup = root.querySelector<HTMLDivElement>('[data-tutorial-popup]');
    const tutorialText = root.querySelector<HTMLDivElement>('[data-tutorial-text]');
    const tutorialSkip = root.querySelector<HTMLButtonElement>('[data-tutorial-skip]');
    const touchControls = root.querySelector<HTMLDivElement>('[data-touch-controls]');
    const characterCreator = root.querySelector<HTMLDivElement>('[data-character-creator]');
    const creatorPreviewMount = root.querySelector<HTMLDivElement>('[data-character-preview]');
    const creatorEvent = root.querySelector<HTMLDivElement>('[data-creator-event]');
    const creatorEventName = root.querySelector<HTMLDivElement>('[data-creator-event-name]');
    const creatorEventBonus = root.querySelector<HTMLDivElement>('[data-creator-event-bonus]');
    const previewFront = root.querySelector<HTMLButtonElement>('[data-preview-front]');
    const previewBack = root.querySelector<HTMLButtonElement>('[data-preview-back]');
    const previewRotateLeft = root.querySelector<HTMLButtonElement>('[data-preview-rotate-left]');
    const previewRotateRight = root.querySelector<HTMLButtonElement>('[data-preview-rotate-right]');
    const previewRotateReset = root.querySelector<HTMLButtonElement>('[data-preview-rotate-reset]');
    const creatorSummary = root.querySelector<HTMLDivElement>('[data-creator-summary]');
    const creatorCustomize = root.querySelector<HTMLDetailsElement>('.creator-customize');
    const creatorCustomizeToggleButton = root.querySelector<HTMLButtonElement>('[data-toggle-customize]');
    const creatorStartButton = root.querySelector<HTMLButtonElement>('[data-start-game]');
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
    const creatorSettingsButton = root.querySelector<HTMLButtonElement>('[data-creator-settings]');
    const workoutTitle = root.querySelector<HTMLHeadingElement>('[data-workout-title]');
    const workoutInstruction = root.querySelector<HTMLDivElement>('[data-workout-instruction]');
    const spotCallout = root.querySelector<HTMLDivElement>('[data-spot-callout]');
    const spotCalloutText = root.querySelector<HTMLSpanElement>('[data-spot-callout-text]');
    const spotCalloutButton = root.querySelector<HTMLButtonElement>('[data-spot-buddy-now]');
    const spotCalloutMeterFill = root.querySelector<HTMLDivElement>('[data-spot-callout-meter-fill]');
    const workoutMeterFill = root.querySelector<HTMLDivElement>('[data-workout-meter-fill]');
    const workoutCursor = root.querySelector<HTMLDivElement>('[data-workout-cursor]');
    const workoutScore = root.querySelector<HTMLDivElement>('[data-workout-score]');
    const workoutButtons = root.querySelector<HTMLDivElement>('[data-workout-buttons]');
    const creatorHairButtons = characterCreator?.querySelectorAll<HTMLButtonElement>('[data-hair]');
    const creatorSkinButtons = characterCreator?.querySelectorAll<HTMLButtonElement>('[data-skin]');
    const creatorSexButtons = characterCreator?.querySelectorAll<HTMLButtonElement>('[data-sex]');
    const creatorMuscleButtons = characterCreator?.querySelectorAll<HTMLButtonElement>('[data-muscle]');
    const creatorFrameButtons = characterCreator?.querySelectorAll<HTMLButtonElement>('[data-frame]');
    const creatorBodySizeInputs = characterCreator?.querySelectorAll<HTMLInputElement>('[data-body-size]');

    if (
      !canvasMount ||
      !staminaFill ||
      !shakersValue ||
      !steroidsValue ||
      !capturedValue ||
      !crewCount ||
      !objective ||
      !target ||
      !eventChip ||
      !zoneChip ||
      !targetPreview ||
      !targetPreviewName ||
      !targetPreviewRarity ||
      !targetPreviewChance ||
      !targetCaptureButton ||
      !goalsList ||
      !goalsPanel ||
      !goalsPanelToggle ||
      !goalsPanelBody ||
      !questsList ||
      !questsPanel ||
      !questsPanelToggle ||
      !questsPanelBody ||
      !crewSortSelect ||
      !repDexDetail ||
      !repDexDetailClose ||
      !repDexDetailTitle ||
      !repDexDetailSpecies ||
      !repDexDetailType ||
      !repDexDetailRarity ||
      !repDexDetailPersonality ||
      !repDexDetailFavoriteWorkout ||
      !repDexDetailCount ||
      !repDexDetailDescription ||
      !repDexDetailOdds ||
      !repDexDetailFlavor ||
      !repdexPanel ||
      !repdexPanelToggle ||
      !repdexPanelBody ||
      !crewDetail ||
      !crewDetailClose ||
      !crewDetailTitle ||
      !crewDetailSpecies ||
      !crewDetailType ||
      !crewDetailRarity ||
      !crewDetailLevel ||
      !crewDetailStrength ||
      !crewDetailEndurance ||
      !crewDetailFocus ||
      !crewDetailEnergy ||
      !crewDetailCaughtAt ||
      !crewDetailNameInput ||
      !crewDetailRenameButton ||
      !crewDetailUseSteroidButton ||
      !crewDetailReleaseButton ||
      !crewPanel ||
      !crewPanelToggle ||
      !crewPanelBody ||
      !dexList ||
      !crewList ||
      !storageList ||
      !bossPanel ||
      !bossName ||
      !bossStats ||
      !bossTimer ||
      !bossBattlePanel ||
      !bossBattleName ||
      !bossBattleResult ||
      !bossBattleMeter ||
      !bossBattleScores ||
      !bossBattleLog ||
      !bossBattleRewards ||
      !captureResultCard ||
      !captureResultContent ||
      !captureResultClose ||
      !captureResultViewCrew ||
      !captureResultKeepPlaying ||
      !toast ||
      !inputStatus ||
      !controlHint ||
      !inputModeButton ||
      !settingsButton ||
      !settingsPanel ||
      !settingsCloseButton ||
      !settingsCustomizeButton ||
      !menuCrewButton ||
      !menuRepDexButton ||
      !menuGoalsButton ||
      !menuSettingsButton ||
      !settingsMusicInput ||
      !settingsMusicValue ||
      !settingsSfxInput ||
      !settingsSfxValue ||
      !settingsMuteInput ||
      !settingsPixelInput ||
      !settingsCameraSelect ||
      !settingsReducedInput ||
      !settingsCatchOddsInput ||
      !settingsHelpButton ||
      !settingsResetSaveButton ||
      !tutorialPopup ||
      !tutorialText ||
      !tutorialSkip ||
      !touchControls ||
      !characterCreator ||
      !creatorPreviewMount ||
      !creatorEvent ||
      !creatorEventName ||
      !creatorEventBonus ||
      !previewFront ||
      !previewBack ||
      !workoutPrompt ||
      !workoutPromptName ||
      !freeWeightPrompt ||
      !freeWeightPromptName ||
      !freeWeightPromptButton ||
      !vendingPrompt ||
      !vendingPromptName ||
      !vendingPanel ||
      !vendingTitle ||
      !previewRotateLeft ||
      !previewRotateRight ||
      !previewRotateReset ||
      !creatorSummary ||
      !creatorCustomize ||
      !creatorCustomizeToggleButton ||
      !creatorStartButton ||
      !vendingEnergyMeta ||
      !vendingSnackMeta ||
      !vendingEnergyButton ||
      !vendingSnackButton ||
      !workoutPanel ||
      !creatorSettingsButton ||
      !workoutTitle ||
      !workoutInstruction ||
      !spotCallout ||
      !spotCalloutText ||
      !spotCalloutButton ||
      !spotCalloutMeterFill ||
      !workoutMeterFill ||
      !workoutCursor ||
      !workoutScore ||
      !workoutButtons ||
      !creatorHairButtons ||
      !creatorSkinButtons ||
      !creatorSexButtons ||
      !creatorMuscleButtons ||
      !creatorFrameButtons ||
      !resetSaveButton ||
      !creatorBodySizeInputs
    ) {
      throw new Error('HUD failed to initialize');
    }

    const versionLabel = document.createElement('div');
    versionLabel.className = 'settings-version-label';
    versionLabel.textContent = `Version ${GAME_VERSION}`;
    settingsResetSaveButton.insertAdjacentElement('beforebegin', versionLabel);

    const playtestReportButton = document.createElement('button');
    playtestReportButton.type = 'button';
    playtestReportButton.className = 'settings-copy-report';
    playtestReportButton.textContent = 'Copy Playtest Report';
    settingsResetSaveButton.insertAdjacentElement('beforebegin', playtestReportButton);

    this.canvasMount = canvasMount;
    this.canvasMount.tabIndex = -1;
    this.characterCreator = characterCreator;
    this.creatorPreviewMount = creatorPreviewMount;
    this.staminaFill = staminaFill;
    this.shakersValue = shakersValue;
    this.steroidsValue = steroidsValue;
    this.capturedValue = capturedValue;
    this.crewCount = crewCount;
    this.objective = objective;
    this.target = target;
    this.eventChip = eventChip;
    this.zoneChip = zoneChip;
    this.targetPreview = targetPreview;
    this.targetPreviewName = targetPreviewName;
    this.targetPreviewRarity = targetPreviewRarity;
    this.targetPreviewChance = targetPreviewChance;
    this.targetCaptureButton = targetCaptureButton;
    this.goalsList = goalsList;
    this.goalsPanel = goalsPanel;
    this.goalsPanelToggle = goalsPanelToggle;
    this.goalsPanelBody = goalsPanelBody;
    this.questsList = questsList;
    this.questsPanel = questsPanel;
    this.questsPanelToggle = questsPanelToggle;
    this.questsPanelBody = questsPanelBody;
    this.crewSortSelect = crewSortSelect;
    this.dexList = dexList;
    this.repdexPanel = repdexPanel;
    this.repdexPanelToggle = repdexPanelToggle;
    this.repdexPanelBody = repdexPanelBody;
    this.repDexDetail = repDexDetail;
    this.repDexDetailClose = repDexDetailClose;
    this.repDexDetailTitle = repDexDetailTitle;
    this.repDexDetailSpecies = repDexDetailSpecies;
    this.repDexDetailType = repDexDetailType;
    this.repDexDetailRarity = repDexDetailRarity;
    this.repDexDetailPersonality = repDexDetailPersonality;
    this.repDexDetailFavoriteWorkout = repDexDetailFavoriteWorkout;
    this.repDexDetailCount = repDexDetailCount;
    this.repDexDetailDescription = repDexDetailDescription;
    this.repDexDetailOdds = repDexDetailOdds;
    this.repDexDetailFlavor = repDexDetailFlavor;
    this.crewDetail = crewDetail;
    this.crewDetailClose = crewDetailClose;
    this.crewDetailTitle = crewDetailTitle;
    this.crewDetailSpecies = crewDetailSpecies;
    this.crewDetailType = crewDetailType;
    this.crewDetailRarity = crewDetailRarity;
    this.crewDetailLevel = crewDetailLevel;
    this.crewDetailStrength = crewDetailStrength;
    this.crewDetailEndurance = crewDetailEndurance;
    this.crewDetailFocus = crewDetailFocus;
    this.crewDetailEnergy = crewDetailEnergy;
    this.crewDetailCaughtAt = crewDetailCaughtAt;
    this.crewDetailNameInput = crewDetailNameInput;
    this.crewDetailRenameButton = crewDetailRenameButton;
    this.crewDetailUseSteroidButton = crewDetailUseSteroidButton;
    this.crewDetailReleaseButton = crewDetailReleaseButton;
    this.crewPanel = crewPanel;
    this.crewPanelToggle = crewPanelToggle;
    this.crewPanelBody = crewPanelBody;
    this.crewList = crewList;
    this.storageList = storageList;
    this.bossPanel = bossPanel;
    this.bossName = bossName;
    this.bossStats = bossStats;
    this.bossTimer = bossTimer;
    this.bossBattlePanel = bossBattlePanel;
    this.bossBattleName = bossBattleName;
    this.bossBattleResult = bossBattleResult;
    this.bossBattleMeter = bossBattleMeter;
    this.bossBattleScores = bossBattleScores;
    this.bossBattleLog = bossBattleLog;
    this.bossBattleRewards = bossBattleRewards;
    this.captureResultCard = captureResultCard;
    this.captureResultContent = captureResultContent;
    this.captureResultClose = captureResultClose;
    this.captureResultViewCrew = captureResultViewCrew;
    this.captureResultKeepPlaying = captureResultKeepPlaying;
    this.toast = toast;
    this.inputStatus = inputStatus;
    this.controlHint = controlHint;
    this.inputModeButton = inputModeButton;
    this.settingsButton = settingsButton;
    this.settingsPanel = settingsPanel;
    this.settingsCloseButton = settingsCloseButton;
    this.menuCrewButton = menuCrewButton;
    this.menuRepDexButton = menuRepDexButton;
    this.menuGoalsButton = menuGoalsButton;
    this.menuSettingsButton = menuSettingsButton;
    this.panelCloseButtons = panelCloseButtons;
    this.settingsMusicInput = settingsMusicInput;
    this.settingsMusicValue = settingsMusicValue;
    this.settingsSfxInput = settingsSfxInput;
    this.settingsSfxValue = settingsSfxValue;
    this.settingsMuteInput = settingsMuteInput;
    this.settingsPixelInput = settingsPixelInput;
    this.settingsCameraSelect = settingsCameraSelect;
    this.settingsReducedInput = settingsReducedInput;
    this.settingsCatchOddsInput = settingsCatchOddsInput;
    this.settingsHelpButton = settingsHelpButton;
    this.settingsResetSaveButton = settingsResetSaveButton;
    this.playtestReportButton = playtestReportButton;
    this.resetSaveButton = resetSaveButton;
    this.creatorEvent = creatorEvent;
    this.creatorEventName = creatorEventName;
    this.creatorEventBonus = creatorEventBonus;
    this.tutorialPopup = tutorialPopup;
    this.tutorialText = tutorialText;
    this.tutorialSkip = tutorialSkip;
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
    this.previewFront = previewFront;
    this.previewBack = previewBack;
    this.previewRotateLeft = previewRotateLeft;
    this.previewRotateRight = previewRotateRight;
    this.previewRotateReset = previewRotateReset;
    this.creatorSummary = creatorSummary;
    this.vendingEnergyMeta = vendingEnergyMeta;
    this.vendingSnackMeta = vendingSnackMeta;
    this.vendingEnergyButton = vendingEnergyButton;
    this.vendingSnackButton = vendingSnackButton;
    this.workoutPanel = workoutPanel;
    this.creatorCustomize = creatorCustomize;
    this.creatorCustomizeToggleButton = creatorCustomizeToggleButton;
    this.creatorStartButton = creatorStartButton;
    this.creatorSettingsButton = creatorSettingsButton;
    this.settingsCustomizeButton = settingsCustomizeButton;
    this.workoutTitle = workoutTitle;
    this.workoutInstruction = workoutInstruction;
    this.spotCallout = spotCallout;
    this.spotCalloutText = spotCalloutText;
    this.spotCalloutButton = spotCalloutButton;
    this.spotCalloutMeterFill = spotCalloutMeterFill;
    this.workoutMeterFill = workoutMeterFill;
    this.workoutCursor = workoutCursor;
    this.workoutScore = workoutScore;
    this.workoutButtons = workoutButtons;
    this.creatorHairButtons = creatorHairButtons;
    this.creatorSkinButtons = creatorSkinButtons;
    this.creatorSexButtons = creatorSexButtons;
    this.creatorMuscleButtons = creatorMuscleButtons;
    this.creatorFrameButtons = creatorFrameButtons;
    this.creatorBodySizeInputs = creatorBodySizeInputs;
    creatorBodySizeInputs.forEach((input) => {
      const key = input.dataset.bodySize;

      if (!key) {
        return;
      }

      const valueEl = characterCreator.querySelector<HTMLElement>(`[data-body-size-value="${key}"]`);

      if (valueEl) {
        this.creatorBodySizeValueElements.set(key as BodySizeKey, valueEl);
      }
    });
    this.bindCharacterCreator();
    this.bindWorkoutUi();
    this.bindFreeWeightUi();
    this.bindVendingUi();
    this.bindRepDexUi();
    this.bindCrewUi();
    this.bindBossUi();
    this.bindCaptureResultUi();
    this.bindInputModeUi();
    this.bindSettingsUi();
    this.bindDrawerUi();
    this.bindCreatureDetailDismissal();
    this.bindTutorialUi();
    this.bindMobilePanelToggle();
    this.bindPlaytestReportUi();
    this.applyDrawerVisibility();
    this.applyInputMode();
    this.applySettings();
    this.syncCreatorControls();
  }

  update(snapshot: WorldSnapshot, actions: ActionState, deltaSeconds: number): void {
    this.latestSnapshot = snapshot;
    this.updateProgressiveDisclosure(snapshot);
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
    this.renderedSteroidsValue = this.setText(
      this.steroidsValue,
      this.renderedSteroidsValue,
      String(snapshot.player.steroids)
    );
    this.availableSteroids = snapshot.player.steroids;
    this.renderedCapturedValue = this.setText(
      this.capturedValue,
      this.renderedCapturedValue,
      String(snapshot.player.capturedTotal)
    );
    this.renderedCrewCountValue = this.setText(
      this.crewCount,
      this.renderedCrewCountValue,
      snapshot.storage.length > 0
        ? `${snapshot.roster.length}/${snapshot.maxRosterSize} +${snapshot.storage.length}`
        : `${snapshot.roster.length}/${snapshot.maxRosterSize}`
    );
    this.renderedInputStatus = this.setText(
      this.inputStatus,
      this.renderedInputStatus,
      actions.inputLabel
    );
    this.setHidden(this.repDexDetail, this.root.classList.contains('game-root--creating'));
    this.setHidden(this.crewDetail, this.root.classList.contains('game-root--creating'));
    this.updateCurrentEvent(snapshot.currentEvent);
    this.updateCurrentZone(snapshot.currentZone);

    const carriedFreeWeight = snapshot.freeWeights.find((freeWeight) => freeWeight.status === 'carried');
    let targetText = 'No target';
    const hasCapturedForObjective =
      snapshot.player.capturedTotal > 0 || snapshot.roster.length > 0 || snapshot.storage.length > 0;
    let objectiveText = hasCapturedForObjective ? 'Find a wild gym beast and get close.' : 'Find your first creature.';
    let targetReady = false;
    let previewName = '';
    let previewRarity = '';
    let previewChance = '';
    let previewRarityLevel: BuddyDefinition['rarity'] = 'common';
    let showTargetPreview = false;
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
      const targetName = this.getBuddyDisplayName(definition, snapshot.nearestBuddy.buddy.displayName);
      const distance = snapshot.nearestBuddy.distance;
      const inRange = distance <= snapshot.captureRange;
      const chance = this.settings.showCatchOdds
        ? this.formatCatchChanceText(definition, snapshot.nearestBuddy.buddy)
        : '';
      targetText = inRange
        ? `Ready to wrestle: ${targetName}`
        : `${targetName} - ${distance.toFixed(1)}m`;
      objectiveText = inRange ? 'Arm Wrestle!' : `Get close to ${targetName}.`;
      targetReady = inRange;
      showTargetPreview = true;
      previewName = `${targetName} Lv. ${snapshot.nearestBuddy.buddy.level}`;
      previewRarity = this.getRarityDisplayName(definition.rarity);
      previewRarityLevel = definition.rarity;
      previewChance = chance;
    }

    this.renderedTarget = this.setText(this.target, this.renderedTarget, targetText);
    this.renderedObjective = this.setText(this.objective, this.renderedObjective, objectiveText);
    if (targetReady !== this.renderedTargetReady) {
      this.target.classList.toggle('target-chip--ready', targetReady);
      this.renderedTargetReady = targetReady;
    }

    if (showTargetPreview) {
      this.targetPreview.classList.remove('target-preview--hidden');
      this.renderedTargetPreviewName = this.setText(this.targetPreviewName, this.renderedTargetPreviewName, previewName);
      this.renderedTargetPreviewRarity = this.setText(
        this.targetPreviewRarity,
        this.renderedTargetPreviewRarity,
        previewRarity
      );
      this.setRarityBadgeClasses(this.targetPreviewRarity, previewRarityLevel, 'target-preview-rarity');
      this.renderedTargetPreviewChance = this.setText(
        this.targetPreviewChance,
        this.renderedTargetPreviewChance,
        previewChance
      );
    } else {
      this.targetPreview.classList.add('target-preview--hidden');
      this.renderedTargetPreviewName = '';
      this.renderedTargetPreviewRarity = '';
      this.renderedTargetPreviewChance = '';
      this.setRarityBadgeClasses(this.targetPreviewRarity, 'common', 'target-preview-rarity');
    }

    this.updateGoals(snapshot.goals);
    this.updateQuests(snapshot.activeQuests);

    const dexMarkup = snapshot.repDex
      .map(
        (entry) => `
          <div
            class="dex-row dex-row--${entry.definition.rarity} ${entry.count > 0 ? 'dex-row--caught' : ''}${this.isExoticBuddyDefinition(entry.definition) ? ' dex-row--exotic' : ''}"
            data-repdex-id="${entry.definition.id}"
            role="button"
            tabindex="0"
          >
            <div class="dex-row-main">
              <span class="dex-row-name">${this.getBuddyDisplayName(entry.definition)}</span>
              <span class="dex-row-meta">Species ${entry.definition.species}</span>
              ${this.renderRarityBadge(entry.definition.rarity)}
              <span class="dex-row-meta">Personality ${entry.definition.personalityTag}</span>
              <span class="dex-row-meta">${entry.count} caught ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½ Best Lv ${entry.highestLevel}</span>
            </div>
          </div>
        `
      )
      .join('');
    if (dexMarkup !== this.renderedDexMarkup) {
      this.dexList.innerHTML = dexMarkup;
      this.renderedDexMarkup = dexMarkup;
    }

    this.repDexEntriesById.clear();
    snapshot.repDex.forEach((entry) => {
      this.repDexEntriesById.set(entry.definition.id, entry);
    });

    this.rosterEntriesById.clear();
    this.storageEntriesById.clear();
    this.rosterNameById.clear();
    snapshot.roster.forEach((entry) => {
      const definition = getBuddyDefinition(entry.definitionId);
      this.rosterEntriesById.set(entry.rosterId, entry);
      this.rosterNameById.set(entry.rosterId, this.getBuddyDisplayName(definition, entry.displayName));
    });
    snapshot.storage.forEach((entry) => {
      const definition = getBuddyDefinition(entry.definitionId);
      this.storageEntriesById.set(entry.rosterId, entry);
      this.rosterNameById.set(entry.rosterId, this.getBuddyDisplayName(definition, entry.displayName));
    });

    const selectedCrewSort = this.resolveCrewSort(this.crewSortSelect.value);
    if (this.crewSort !== selectedCrewSort) {
      this.crewSort = selectedCrewSort;
      this.renderedCrewMarkup = '';
    }
    if (this.crewSortSelect.value !== this.crewSort) {
      this.crewSortSelect.value = this.crewSort;
    }

    const sortedRoster = this.sortCrewRoster(snapshot.roster);
    const crewMarkup = this.renderCrew(sortedRoster, snapshot.player.steroids);
    if (crewMarkup !== this.renderedCrewMarkup) {
      this.crewList.innerHTML = crewMarkup;
      this.renderedCrewMarkup = crewMarkup;
    }

    const storageMarkup = this.renderStorage(snapshot.storage, snapshot.roster.length < snapshot.maxRosterSize);
    if (storageMarkup !== this.renderedStorageMarkup) {
      this.storageList.innerHTML = storageMarkup;
      this.renderedStorageMarkup = storageMarkup;
    }

    if (
      this.activeCrewDetailId !== undefined &&
      !this.rosterEntriesById.has(this.activeCrewDetailId) &&
      !this.storageEntriesById.has(this.activeCrewDetailId)
    ) {
      this.closeCrewDetail();
    }
    const nearbyStationBusy = this.isWorkoutStationInUse(this.nearbyStation, snapshot);
    this.updateWorkoutStation(this.nearbyStation, nearbyStationBusy);

    if (nearbyStationBusy) {
      this.setHidden(this.freeWeightPrompt, true);
      this.setHidden(this.vendingPrompt, true);
      this.setHidden(this.workoutPrompt, true);
    } else {
      this.updateFreeWeightPrompt(snapshot);
    }

    this.updateSpotCallout(snapshot);
    this.updateSpotHoldInteraction(deltaSeconds);
    this.updateBossPanel(snapshot.activeBoss, snapshot.activeBossBattle);
    this.updateBossBattlePanel(snapshot.activeBossBattle);
    this.updateCaptureResult(deltaSeconds);
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
    const formattedMessage = this.formatToastMessage(message);
    if (this.toast.innerHTML !== formattedMessage) {
      this.toast.innerHTML = formattedMessage;
    }

    this.toastTimer = 1.55;
  }

  showCaptureResult(event: WorldEvent): void {
    this.openDrawer(undefined);
    if (
      event.type !== 'capture' ||
      event.captureStyle !== 'arm-wrestle' ||
      !event.buddy ||
      (event.result !== 'success' && event.result !== 'miss')
    ) {
      return;
    }

    const definition = getBuddyDefinition(event.buddy.definitionId);
    const rarity = event.captureRarity ?? definition.rarity;
    const displayName = event.captureDisplayName ?? this.getBuddyDisplayName(definition, event.buddy.displayName);
    const level = event.captureLevel ?? event.buddy.level;
    const chance = typeof event.chance === 'number' ? `${Math.round(event.chance * 100)}%` : '??';
    const success = event.result === 'success';
    const outcome = success
      ? event.captureDestination === 'storage'
        ? 'Sent to Storage'
        : 'Joined Active Crew'
      : 'It powered out!';
    const reaction = success
      ? event.flavorReactionLine ?? definition.reactionLines.victory
      : 'It powered out!';
    const toneClass = success ? 'capture-result-card--success' : 'capture-result-card--fail';
    const safeName = this.escapeHtml(displayName);
    const safeOutcome = this.escapeHtml(outcome);
    const safeReaction = this.escapeHtml(reaction);
    this.captureResultViewCrew.hidden = !success;
    this.captureResultKeepPlaying.textContent = success ? 'Keep Playing' : 'Try Again';
    const html = `
      <div class="capture-result-card__eyebrow">${success ? 'Captured' : 'Escaped'}</div>
      <h2>${safeName}</h2>
      <div class="capture-result-card__meta">
        <span>Lv ${level}</span>
        ${this.renderRarityBadge(rarity)}
        <span>Catch ${chance}</span>
      </div>
      <div class="capture-result-card__outcome">${safeOutcome}</div>
      <p>${safeReaction}</p>
    `;

    this.pendingCaptureResult = {
      delay: Math.max(0.2, (event.captureDuration ?? 1.8) - 0.08),
      html: `<div class="${toneClass}">${html}</div>`,
      visibleSeconds: success ? 2.55 : 2.05
    };
    this.hideCaptureResult();
  }

  private isExoticBuddyDefinition(definition: Pick<BuddyDefinition, 'rarity' | 'isExotic'>): boolean {
    return definition.rarity === 'exotic' || definition.isExotic === true;
  }

  private getRarityDisplayName(rarity: BuddyDefinition['rarity']): string {
    if (rarity === 'common') {
      return 'Common';
    }

    if (rarity === 'uncommon') {
      return 'Uncommon';
    }

    if (rarity === 'rare') {
      return 'Rare';
    }

    return 'Exotic';
  }

  private renderRarityBadge(rarity: BuddyDefinition['rarity']): string {
    return `<span class="rarity-badge rarity-badge--${rarity}">${this.getRarityDisplayName(rarity)}</span>`;
  }

  private setRarityBadgeClasses(
    element: HTMLElement,
    rarity: BuddyDefinition['rarity'],
    baseClass: string
  ): void {
    element.className = `${baseClass} rarity-badge rarity-badge--${rarity}`;
  }

  private formatToastMessage(message: string): string {
    const escaped = this.escapeHtml(message);
    return escaped.replace(
      /\[(COMMON|UNCOMMON|RARE|EXOTIC)\]/g,
      (_match, rarity: string) => {
        const normalized = rarity.toLowerCase() as BuddyDefinition['rarity'];
        return this.renderRarityBadge(normalized);
      }
    );
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private resolveCrewSort(value: string): CrewSortMode {
    return value === 'level' || value === 'rarity' || value === 'strength' || value === 'recent' ? value : 'recent';
  }

  private sortCrewRoster(roster: BuddyRosterEntry[]): BuddyRosterEntry[] {
    return [...roster].sort((left, right) => {
      const leftDefinition = getBuddyDefinition(left.definitionId);
      const rightDefinition = getBuddyDefinition(right.definitionId);

      if (this.crewSort === 'level') {
        if (left.level !== right.level) {
          return right.level - left.level;
        }
      } else if (this.crewSort === 'strength') {
        if (left.strength !== right.strength) {
          return right.strength - left.strength;
        }
      } else if (this.crewSort === 'rarity') {
        const leftRarity = RARITY_SORT_ORDER[leftDefinition.rarity] ?? 0;
        const rightRarity = RARITY_SORT_ORDER[rightDefinition.rarity] ?? 0;
        if (leftRarity !== rightRarity) {
          return rightRarity - leftRarity;
        }
      }

      const leftTime = left.capturedAt ?? 0;
      const rightTime = right.capturedAt ?? 0;
      if (leftTime !== rightTime) {
        return this.crewSort === 'recent' ? rightTime - leftTime : rightTime - leftTime;
      }

      return left.rosterId - right.rosterId;
    });
  }

  private getCrewCaughtLabel(entry: BuddyRosterEntry): string {
    if (!entry.capturedAt) {
      return 'Unknown';
    }

    const date = new Date(entry.capturedAt);
    if (Number.isNaN(date.getTime())) {
      return 'Unknown';
    }

    return `Caught ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  private getOwnedEntry(rosterId: number): BuddyRosterEntry | undefined {
    return this.rosterEntriesById.get(rosterId) ?? this.storageEntriesById.get(rosterId);
  }

  private openCrewDetail(entry: BuddyRosterEntry): void {
    const definition = getBuddyDefinition(entry.definitionId);
    const name = this.getBuddyDisplayName(definition, entry.displayName);
    const isExotic = this.isExoticBuddyDefinition(definition);
    this.closeRepDexDetail(false);
    this.lastCreatureDetailTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    this.activeCrewDetailId = entry.rosterId;
    this.crewDetailTitle.textContent = `${name}`;
    this.crewDetailSpecies.textContent = definition.species;
    this.crewDetailType.textContent = isExotic ? 'Exotic' : 'Normal';
    this.crewDetailRarity.textContent = this.getRarityDisplayName(definition.rarity);
    this.setRarityBadgeClasses(this.crewDetailRarity, definition.rarity, 'detail-rarity-badge');
    this.crewDetailLevel.textContent = `${entry.level}`;
    this.crewDetailStrength.textContent = `${entry.strength}`;
    this.crewDetailEndurance.textContent = `${entry.endurance}`;
    this.crewDetailFocus.textContent = `${entry.focus}`;
    this.crewDetailEnergy.textContent = `${Math.round(entry.energy)}%`;
    this.crewDetailCaughtAt.textContent = this.getCrewCaughtLabel(entry);
    this.crewDetailNameInput.value = entry.displayName ?? '';
    this.crewDetailUseSteroidButton.disabled = this.availableSteroids <= 0;
    this.crewDetailReleaseButton.disabled = false;
    this.crewDetail.hidden = false;
    this.root.classList.add('game-root--crew-detail-open');
  }

  private closeCrewDetail(restoreFocus = true): void {
    this.crewDetail.hidden = true;
    this.activeCrewDetailId = undefined;
    this.root.classList.remove('game-root--crew-detail-open');
    this.restoreCreatureDetailFocus(restoreFocus);
  }

  private updateGoals(goals: WorldSnapshot['goals']): void {
    const markup = `
      ${Object.entries(GOAL_TARGETS)
        .map(([goalId, target]) => {
          const typedGoalId = goalId as keyof typeof GOAL_TARGETS;
          const state = goals[typedGoalId];
          const progress = Math.min(state.progress, target);
          const complete = state.completed;
          const status = complete ? 'DONE' : `${progress}/${target}`;
          const rowClass = complete ? 'goal-row goal-row--done' : 'goal-row';
          const prefix = complete ? '? ' : '';

          return `
            <div class="${rowClass}">
              <span class="goal-row-title">${prefix}${GOAL_LABELS[typedGoalId]}</span>
              <span class="goal-row-status">${status}</span>
            </div>
          `;
        })
        .join('')}
    `.trim();

    if (markup !== this.renderedGoalsMarkup) {
      this.goalsList.innerHTML = markup;
      this.renderedGoalsMarkup = markup;
    }
  }

  private updateQuests(activeQuests: WorldSnapshot['activeQuests']): void {
    const markup = activeQuests.length > 0
      ? activeQuests
        .map(({ definition, state }) => {
          const progress = Math.min(definition.target, state.progress);
          const reward = [
            definition.reward.steroids ? `+${definition.reward.steroids} Steroids` : '',
            definition.reward.xp ? `+${definition.reward.xp} XP` : '',
            definition.reward.exoticSpawnBonus ? 'Spawn boost' : ''
          ]
            .filter(Boolean)
            .join(' / ');

          return `
            <div class="quest-row">
              <div class="quest-row-title">${this.escapeHtml(definition.title)}</div>
              <div class="quest-row-status">${progress}/${definition.target}</div>
              <div class="quest-row-description">${this.escapeHtml(definition.description)}</div>
              <div class="quest-row-reward">${this.escapeHtml(reward || 'Retro glory')}</div>
            </div>
          `;
        })
        .join('')
      : `
        <div class="quest-row quest-row--done">
          <div class="quest-row-title">All playtest quests complete</div>
          <div class="quest-row-description">Go flex on bosses and hunt exotics.</div>
        </div>
      `;

    if (markup !== this.renderedQuestsMarkup) {
      this.questsList.innerHTML = markup;
      this.renderedQuestsMarkup = markup;
    }
  }

  private getBuddyDisplayName(
    definition: Pick<BuddyDefinition, 'name' | 'rarity' | 'isExotic'>,
    displayName?: string
  ): string {
    const name = displayName ?? definition.name;
    return this.isExoticBuddyDefinition(definition) ? `${name} [EXOTIC]` : name;
  }

  private formatCatchChanceText(definition: BuddyDefinition, buddy: BuddyState): string {
    const chancePercent = Math.round(getArmWrestleCatchChance(buddy, definition) * 100);
    const catchLabel = this.isExoticBuddyDefinition(definition) ? 'Exotic Catch' : 'Catch';
    return `${catchLabel}: ${chancePercent}%`;
  }

  private getRepDexCaptureOdds(definition: BuddyDefinition): string {
    const levels = [1, 16, 26, 36];
    const labels = ['1-15', '16-25', '26-35', '36+'];
    const lines = levels.map((min, index) => {
      const fakeBuddy: BuddyState = {
        id: 0,
        definitionId: definition.id,
        bodyTraits: {
          chest: 1,
          wings: 1,
          glutes: 1,
          thighs: 1,
          calfs: 1
        },
        position: { x: 0, z: 0 },
        heading: 0,
        wanderHeading: 0,
        wanderTimer: 0,
        captured: false,
        respawnTimer: 0,
        dodgeTimer: 0,
        holdTimer: 0,
        ragdollTimer: 0,
        level: min,
        behavior: 'wander',
        behaviorTimer: 0,
        behaviorCooldown: 0
      };

      const chance = Math.round(getArmWrestleCatchChance(fakeBuddy, definition) * 100);
      return `<div>${labels[index]}: ${chance}%</div>`;
    });

    return lines.join('');
  }

  private getRepDexDescription(definition: BuddyDefinition): string {
    if (definition.description) {
      return definition.description;
    }

    if (this.isExoticBuddyDefinition(definition)) {
      return `${definition.name} is a mythic gym competitor built from a real-animal myth with a lot of dramatic flair.`;
    }

    return `${definition.name} is a ${definition.species} with exaggerated gym-ready muscles and a ridiculous competitive streak.`;
  }

  private getRepDexFlavor(definition: BuddyDefinition): string {
    if (definition.flavorText) {
      return definition.flavorText;
    }

    if (definition.mythicMetadata?.note) {
      return definition.mythicMetadata.note;
    }

    return this.isExoticBuddyDefinition(definition)
      ? 'Decked out in absurd glow and over-the-top energy, it wants a rematch before dessert.'
      : 'It only stopped mid-rep to judge your training pants and then charged your arm-wrestle range.';
  }

  private openRepDexDetail(entry: RepDexEntry): void {
    const definition = entry.definition;
    this.closeCrewDetail(false);
    this.lastCreatureDetailTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    this.repDexDetailTitle.textContent = this.getBuddyDisplayName(definition);
    this.repDexDetailSpecies.textContent = definition.species;
    this.repDexDetailType.textContent = this.isExoticBuddyDefinition(definition) ? 'Exotic' : 'Normal';
    this.repDexDetailRarity.textContent = this.getRarityDisplayName(definition.rarity);
    this.setRarityBadgeClasses(this.repDexDetailRarity, definition.rarity, 'detail-rarity-badge');
    this.repDexDetailPersonality.textContent = definition.personalityTag;
    this.repDexDetailFavoriteWorkout.textContent = definition.favoriteWorkout;
    this.repDexDetailCount.textContent = `${entry.count} caught ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½ Best Lv ${entry.highestLevel}`;
    this.repDexDetailDescription.textContent = this.getRepDexDescription(definition);
    this.repDexDetailOdds.innerHTML = `
      <div class="repdex-detail-odds-title">Catch odds by level</div>
      ${this.getRepDexCaptureOdds(definition)}
      <div class="repdex-detail-odds-title">Passive</div>
      <div>${definition.passive.name}: ${definition.passive.description}</div>
    `;
    this.repDexDetailFlavor.textContent = this.getRepDexFlavor(definition);
    this.repDexDetail.hidden = false;
    this.root.classList.add('game-root--repdex-detail-open');
  }

  private closeRepDexDetail(restoreFocus = true): void {
    this.repDexDetail.hidden = true;
    this.root.classList.remove('game-root--repdex-detail-open');
    this.restoreCreatureDetailFocus(restoreFocus);
  }

  private closeCreatureDetails(restoreFocus = true): boolean {
    const hadOpenDetail = !this.repDexDetail.hidden || !this.crewDetail.hidden;

    if (!this.repDexDetail.hidden) {
      this.repDexDetail.hidden = true;
      this.root.classList.remove('game-root--repdex-detail-open');
    }

    if (!this.crewDetail.hidden) {
      this.crewDetail.hidden = true;
      this.activeCrewDetailId = undefined;
      this.root.classList.remove('game-root--crew-detail-open');
    }

    if (hadOpenDetail) {
      this.restoreCreatureDetailFocus(restoreFocus);
    }

    return hadOpenDetail;
  }

  private restoreCreatureDetailFocus(restoreFocus: boolean): void {
    if (!restoreFocus) {
      return;
    }

    const focusTarget = this.lastCreatureDetailTrigger;
    this.lastCreatureDetailTrigger = undefined;
    window.requestAnimationFrame(() => {
      if (focusTarget?.isConnected) {
        focusTarget.focus({ preventScroll: true });
      } else {
        this.canvasMount.focus({ preventScroll: true });
      }
    });
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

  private updateCurrentEvent(event: WorldSnapshot['currentEvent']): void {
    if (event.name !== this.renderedEventName || event.bonusLabel !== this.renderedEventBonus) {
      this.eventChip.innerHTML = `
        <span>Today</span>
        <strong>${this.escapeHtml(event.name)}</strong>
        <small>${this.escapeHtml(event.bonusLabel)}</small>
      `;
      this.creatorEventName.textContent = event.name;
      this.creatorEventBonus.textContent = event.bonusLabel;
      this.creatorEvent.title = event.description;
      this.renderedEventName = event.name;
      this.renderedEventBonus = event.bonusLabel;
    }
  }

  private updateCurrentZone(zone: WorldSnapshot['currentZone']): void {
    if (zone.name !== this.renderedZoneName || zone.description !== this.renderedZoneDescription) {
      this.zoneChip.innerHTML = `
        <span>Zone</span>
        <strong>${this.escapeHtml(zone.name)}</strong>
        <small>${this.escapeHtml(zone.description)}</small>
      `;
      this.zoneChip.title = `${zone.name}: ${zone.description}`;
      this.renderedZoneName = zone.name;
      this.renderedZoneDescription = zone.description;
    }
  }

  private updateCaptureResult(deltaSeconds: number): void {
    if (this.pendingCaptureResult) {
      this.pendingCaptureResult.delay -= deltaSeconds;

      if (this.pendingCaptureResult.delay <= 0) {
        this.captureResultContent.innerHTML = this.pendingCaptureResult.html;
        this.captureResultCard.hidden = false;
        this.captureResultTimer = this.pendingCaptureResult.visibleSeconds;
        this.pendingCaptureResult = undefined;
      }
    }

    if (this.captureResultCard.hidden) {
      return;
    }

    this.captureResultTimer = Math.max(0, this.captureResultTimer - deltaSeconds);
    if (this.captureResultTimer <= 0) {
      this.hideCaptureResult(true);
    }
  }

  private hideCaptureResult(clearPending = false): void {
    this.captureResultCard.hidden = true;
    this.captureResultTimer = 0;
    this.closeCreatureDetails(false);

    if (clearPending) {
      this.pendingCaptureResult = undefined;
    }
  }

  getAppearance(): PlayerAppearance {
    return {
      ...this.appearance,
      body: {
        ...this.appearance.body
      }
    };
  }

  onAppearanceChange(callback: (appearance: PlayerAppearance) => void): void {
    this.appearanceListeners.push(callback);
    callback(this.getAppearance());
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

  onRosterStore(callback: (rosterId: number) => void): void {
    this.rosterStoreListeners.push(callback);
  }

  onRosterUseSteroid(callback: (rosterId: number) => void): void {
    this.rosterUseSteroidListeners.push(callback);
  }

  onRosterRename(callback: (rosterId: number, displayName?: string) => void): void {
    this.rosterRenameListeners.push(callback);
  }

  onStorageActivate(callback: (rosterId: number) => void): void {
    this.storageActivateListeners.push(callback);
  }

  onBossChallenge(callback: () => void): void {
    this.bossChallengeListeners.push(callback);
  }

  onCaptureAction(callback: () => void): void {
    this.captureActionListeners.push(callback);
  }

  onPreviewRotationChange(callback: (rotation: number) => void): void {
    this.previewRotationListeners.push(callback);
    callback(this.previewRotation);
  }

  onInputModeChange(callback: (mode: InputMode) => void): void {
    this.inputModeListeners.push(callback);
  }

  onResetSave(callback: () => void): void {
    this.resetSaveListeners.push(callback);
  }

  onSettingsChange(callback: (settings: GameSettings) => void): void {
    this.settingsChangeListeners.push(callback);
  }

  setSettings(settings: GameSettings, notify = false): void {
    this.settings = { ...settings };
    this.applySettings();

    if (notify) {
      this.settingsChangeListeners.forEach((callback) => callback({ ...this.settings }));
    }
  }

  getSettings(): GameSettings {
    return { ...this.settings };
  }

  onTutorialSkip(callback: () => void): void {
    this.tutorialSkipListeners.push(callback);
  }

  setTutorialStep(text: string): void {
    const shortText = this.getShortTutorialText(text);
    this.renderedTutorialText = this.setText(this.tutorialText, this.renderedTutorialText, shortText);
    this.setHidden(this.tutorialPopup, false);
  }

  hideTutorialPopup(): void {
    this.setHidden(this.tutorialPopup, true);
    this.renderedTutorialText = this.setText(this.tutorialText, this.renderedTutorialText, '');
  }

  getInputMode(): InputMode {
    return this.inputMode;
  }

  private setInputMode(mode: InputMode, notify = true): void {
    if (this.inputMode === mode) {
      return;
    }

    this.inputMode = mode;
    this.applyInputMode();

    if (notify) {
      this.inputModeListeners.forEach((callback) => callback(mode));
    }
  }

  private applyInputMode(): void {
    const isTouch = this.inputMode === 'touch';
    this.root.classList.toggle('game-root--touch-input', isTouch);
    this.controlHint.textContent = CONTROL_HINTS[this.inputMode];
    this.inputModeButton.textContent = SWITCH_MODE_BUTTON_LABELS[this.inputMode];
    this.inputModeButton.setAttribute(
      'aria-label',
      isTouch ? 'Switch to Keyboard + Mouse controls' : 'Switch to Touch controls'
    );
    this.inputModeButton.setAttribute('aria-pressed', String(isTouch));
  }

  private applySettings(): void {
    this.settingsMusicInput.value = String(this.settings.musicVolume);
    this.settingsMusicValue.textContent = String(this.settings.musicVolume);
    this.settingsSfxInput.value = String(this.settings.sfxVolume);
    this.settingsSfxValue.textContent = String(this.settings.sfxVolume);
    this.settingsMuteInput.checked = this.settings.muted;
    this.settingsPixelInput.checked = this.settings.pixelFilter;
    this.settingsCameraSelect.value = this.settings.cameraDistance;
    this.settingsReducedInput.checked = this.settings.reducedMotion;
    this.settingsCatchOddsInput.checked = this.settings.showCatchOdds;
    this.targetPreviewChance.hidden = !this.settings.showCatchOdds;
    this.root.classList.toggle('game-root--pixel-filter-off', !this.settings.pixelFilter);
    this.root.classList.toggle('game-root--reduced-motion', this.settings.reducedMotion);
  }

  private updateSettings(next: Partial<GameSettings>): void {
    this.settings = {
      ...this.settings,
      ...next
    };
    this.applySettings();
    this.settingsChangeListeners.forEach((callback) => callback({ ...this.settings }));
  }

  private openDrawer(drawer?: HudDrawer): void {
    this.closeCreatureDetails(false);
    this.activeDrawer = this.activeDrawer === drawer ? undefined : drawer;
    this.applyDrawerVisibility();
  }

  private updateProgressiveDisclosure(snapshot: WorldSnapshot): void {
    const rosterSnapshot = snapshot as WorldSnapshot & {
      roster?: BuddyRosterEntry[];
      storage?: BuddyRosterEntry[];
      repDex?: RepDexEntry[];
      boss?: BossState;
    };
    const activeCrewCount = rosterSnapshot.roster?.length ?? 0;
    const storageCount = rosterSnapshot.storage?.length ?? 0;
    const capturedTotal = snapshot.player.capturedTotal ?? 0;
    const hasCaptured = capturedTotal > 0 || activeCrewCount > 0 || storageCount > 0;
    const hasSteroids = (snapshot.player.steroids ?? 0) > 0;
    const storageUnlocked = storageCount > 0 || activeCrewCount >= ACTIVE_CREW_LIMIT;
    const captureActive = snapshot.captureCutsceneRemaining > 0;
    const hasExotic = Boolean(
      rosterSnapshot.repDex?.some((entry) => {
        const definition = entry.definition;
        return entry.count > 0 && (definition.rarity === 'exotic' || definition.isExotic);
      })
    );

    this.root.classList.toggle('game-root--has-captured', hasCaptured);
    this.root.classList.toggle('game-root--has-steroids', hasSteroids);
    this.root.classList.toggle('game-root--storage-unlocked', storageUnlocked);
    this.root.classList.toggle('game-root--has-exotic', hasExotic);
    this.root.classList.toggle('game-root--boss-active', Boolean(rosterSnapshot.boss));
    this.root.classList.toggle('game-root--capture-active', captureActive);

    if (captureActive && this.activeDrawer) {
      this.activeDrawer = undefined;
      this.applyDrawerVisibility();
    }

    if (captureActive) {
      this.closeCreatureDetails(false);
    }

    if (!hasCaptured && ['crew', 'repdex', 'goals'].includes(this.activeDrawer ?? '')) {
      this.activeDrawer = undefined;
      this.applyDrawerVisibility();
    }

    if (!hasCaptured && !this.renderedTargetReady) {
      this.renderedObjective = this.setText(
        this.objective,
        this.renderedObjective,
        'Find your first creature.'
      );
    }
  }

  private getShortTutorialText(text: string): string {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 96) {
      return normalized;
    }

    const [first, second] = normalized.split(/(?<=[.!?])\s+/);
    const shortened = [first, second].filter(Boolean).join(' ');
    return shortened.length <= 112 ? shortened : `${normalized.slice(0, 92).trim()}...`;
  }

  private applyDrawerVisibility(): void {
    const active = this.activeDrawer;
    const isSettingsOpen = active === 'settings';
    const isCrewOpen = active === 'crew';
    const isRepDexOpen = active === 'repdex';
    const isGoalsOpen = active === 'goals';

    this.root.classList.toggle('game-root--drawer-crew', isCrewOpen);
    this.root.classList.toggle('game-root--drawer-repdex', isRepDexOpen);
    this.root.classList.toggle('game-root--drawer-goals', isGoalsOpen);
    this.root.classList.toggle('game-root--drawer-settings', isSettingsOpen);
    this.setHidden(this.crewPanel, !isCrewOpen);
    this.setHidden(this.repdexPanel, !isRepDexOpen);
    this.setHidden(this.goalsPanel, !isGoalsOpen);
    this.setHidden(this.questsPanel, !isGoalsOpen);
    this.setHidden(this.settingsPanel, !isSettingsOpen);
    this.settingsButton.setAttribute('aria-expanded', String(isSettingsOpen));
    this.menuCrewButton.setAttribute('aria-pressed', String(isCrewOpen));
    this.menuRepDexButton.setAttribute('aria-pressed', String(isRepDexOpen));
    this.menuGoalsButton.setAttribute('aria-pressed', String(isGoalsOpen));
    this.menuSettingsButton.setAttribute('aria-pressed', String(isSettingsOpen));
  }

  private setSettingsPanelOpen(open: boolean): void {
    this.closeCreatureDetails(false);
    if (open) {
      this.activeDrawer = 'settings';
    } else if (this.activeDrawer === 'settings') {
      this.activeDrawer = undefined;
    }
    this.applyDrawerVisibility();
  }

  isWorkoutActive(): boolean {
    return Boolean(this.activeWorkout);
  }

  getActiveWorkoutStation(): WorkoutStation | undefined {
    return this.activeWorkout?.station;
  }

  isInteractionActive(): boolean {
    return Boolean(
      this.activeWorkout ||
        this.activeVending ||
        this.activeDrawer ||
        !this.captureResultCard.hidden ||
        this.pendingCaptureResult ||
        this.root.classList.contains('game-root--capture-active') ||
        (this.hasStarted && !this.characterCreator.hidden)
    );
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

  updateWorkoutStation(station?: WorkoutStation, stationInUse = false): void {
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
      stationInUse ||
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

  private isWorkoutStationInUse(station: WorkoutStation | undefined, snapshot: WorldSnapshot): boolean {
    if (!station) {
      return false;
    }

    return snapshot.roster.some(
      (entry) => entry.taskStationId === station.id && entry.status !== 'ready'
    );
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
    this.closeCreatureDetails(false);
    this.root.classList.remove('game-root--creating');
    this.root.classList.remove('game-root--customizing');
    this.characterCreator.hidden = true;
    this.creatorStartButton.textContent = this.hasStarted ? 'Done' : 'Start Game';
  }

  private openCharacterCreatorFromSettings(): void {
    this.closeCreatureDetails(false);
    this.openDrawer(undefined);
    this.root.classList.add('game-root--customizing');
    this.characterCreator.hidden = false;
    this.creatorCustomize.open = true;
    this.creatorStartButton.textContent = this.hasStarted ? 'Done' : 'Start Game';
    this.setPreviewRotation(-0.45);
  }

  private bindCharacterCreator(): void {
    this.creatorHairButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.setAppearance({ hair: button.dataset.hair as PlayerAppearance['hair'] });
      });
    });

    this.creatorSkinButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.setAppearance({ skinTone: button.dataset.skin as PlayerAppearance['skinTone'] });
      });
    });

    this.creatorSexButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.setAppearance({ sex: button.dataset.sex as PlayerAppearance['sex'] });
      });
    });

    this.creatorMuscleButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.setAppearance({ muscleBuild: button.dataset.muscle as PlayerAppearance['muscleBuild'] });
      });
    });

    this.creatorFrameButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.setAppearance({ frame: button.dataset.frame as PlayerAppearance['frame'] });
      });
    });

    this.creatorCustomizeToggleButton.addEventListener('click', () => {
      this.root.classList.add('game-root--customizing');
      this.creatorCustomize.open = true;
      this.setPreviewRotation(-0.45);
    });

    this.creatorCustomize.addEventListener('toggle', () => {
      this.root.classList.toggle('game-root--customizing', this.creatorCustomize.open);
    });

    this.previewFront.addEventListener('click', () => {
      this.setPreviewRotation(0);
    });

    this.previewBack.addEventListener('click', () => {
      this.setPreviewRotation(Math.PI);
    });

    this.previewRotateLeft.addEventListener('click', () => {
      this.rotatePreview(-PREVIEW_ROTATE_STEP);
    });

    this.previewRotateRight.addEventListener('click', () => {
      this.rotatePreview(PREVIEW_ROTATE_STEP);
    });

    this.previewRotateReset.addEventListener('click', () => {
      this.setPreviewRotation(-0.45);
    });

    this.creatorBodySizeInputs.forEach((input) => {
      input.addEventListener('input', () => {
        this.setBodySize(input.dataset.bodySize as BodySizeKey, Number(input.value));
      });
    });

    this.creatorStartButton.addEventListener('click', () => {
      const shouldStartGame = !this.hasStarted;
      this.hasStarted = true;
      this.closeCharacterCreator();
      if (shouldStartGame) {
        this.startListeners.forEach((callback) => callback());
      }
    });

    this.settingsCustomizeButton.addEventListener('click', () => {
      this.openCharacterCreatorFromSettings();
    });

    this.resetSaveButton.addEventListener('click', () => {
      if (!window.confirm('Reset your save data and start fresh?')) {
        return;
      }

      this.resetSaveListeners.forEach((callback) => callback());
    });
  }

  private bindInputModeUi(): void {
    this.bindMobilePress(this.inputModeButton, () => {
      const nextMode: InputMode = this.inputMode === 'keyboard-mouse' ? 'touch' : 'keyboard-mouse';
      this.setInputMode(nextMode);
    });
  }

  private bindPlaytestReportUi(): void {
    this.bindMobilePress(this.playtestReportButton, () => {
      void this.copyPlaytestReport();
    });

    window.addEventListener('error', (event) => {
      recordRuntimeError(event.message || event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      recordRuntimeError(event.reason);
    });
  }

  private async copyPlaytestReport(): Promise<void> {
    const report = this.buildPlaytestReport();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(report);
      } else {
        this.copyTextWithFallback(report);
      }

      this.showUtilityToast('Playtest report copied.');
    } catch (error) {
      recordRuntimeError(error);
      this.showUtilityToast('Could not copy report.');
    }
  }

  private copyTextWithFallback(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', 'true');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.select();
    const copied = document.execCommand('copy');
    textArea.remove();

    if (!copied) {
      throw new Error('Clipboard copy failed');
    }
  }

  private buildPlaytestReport(): string {
    const snapshot = this.latestSnapshot;
    const repDexTotal = snapshot?.repDex.length ?? 0;
    const repDexCaught = snapshot?.repDex.filter((entry) => entry.count > 0).length ?? 0;
    const repDexPercent = repDexTotal > 0 ? Math.round((repDexCaught / repDexTotal) * 100) : 0;
    const activeCrew = snapshot
      ? snapshot.roster
        .map((buddy, index) => {
          const definition = snapshot.repDex.find((entry) => entry.definition.id === buddy.definitionId)?.definition;
          const name = definition?.name ?? buddy.definitionId;
          const rarity = definition?.rarity ?? 'unknown';
          return `${index + 1}. ${name} Lv ${buddy.level} (${rarity}) STR ${buddy.strength} END ${buddy.endurance} FOC ${buddy.focus} XP ${buddy.xp}`;
        })
        .join('\n')
      : '';
    const activeQuestLines = snapshot?.activeQuests.length
      ? snapshot.activeQuests
        .map(({ definition, state }) => `- ${definition.title}: ${Math.min(state.progress, definition.target)}/${definition.target}`)
        .join('\n')
      : '- None';
    const recentKnownErrors = getRecentRuntimeErrors();
    const recentErrors = recentKnownErrors.length > 0
      ? recentKnownErrors.map((error, index) => `${index + 1}. ${error}`).join('\n')
      : 'None tracked this session';

    return [
      'Ralph Swole Safari Playtest Report',
      `Generated: ${new Date().toISOString()}`,
      `Game version: ${GAME_VERSION}`,
      `Save schema: ${SAVE_VERSION_LABEL}`,
      '',
      'Browser',
      `User agent: ${navigator.userAgent}`,
      `Viewport: ${window.innerWidth}x${window.innerHeight}`,
      `Screen: ${window.screen.width}x${window.screen.height}`,
      `Device pixel ratio: ${window.devicePixelRatio}`,
      '',
      'Save summary',
      snapshot
        ? [
            `Captured total: ${snapshot.player.capturedTotal}`,
            `Steroids: ${snapshot.player.steroids}`,
            `Stamina: ${Math.round(snapshot.player.stamina)}`,
            `Active crew: ${snapshot.roster.length}/${ACTIVE_CREW_LIMIT}`,
            `Storage: ${snapshot.storage.length}`,
            `Active boss: ${snapshot.activeBoss ? snapshot.activeBoss.name : 'none'}`,
            `Boss battle: ${snapshot.activeBossBattle ? snapshot.activeBossBattle.result : 'none'}`
          ].join('\n')
        : 'No world snapshot captured yet',
      '',
      'Active crew summary',
      activeCrew || 'None',
      '',
      'RepDex progress',
      `${repDexCaught}/${repDexTotal} caught (${repDexPercent}%)`,
      '',
      'Active quests',
      activeQuestLines,
      '',
      'Settings summary',
      [
        `Music volume: ${this.settings.musicVolume}`,
        `SFX volume: ${this.settings.sfxVolume}`,
        `Muted: ${this.settings.muted}`,
        `Pixel filter: ${this.settings.pixelFilter}`,
        `Camera distance: ${this.settings.cameraDistance}`,
        `Reduced motion: ${this.settings.reducedMotion}`,
        `Show catch odds: ${this.settings.showCatchOdds}`
      ].join('\n'),
      '',
      'Current zone/event',
      snapshot
        ? [
            `Zone: ${snapshot.currentZone.name}`,
            `Zone note: ${snapshot.currentZone.description}`,
            `Event: ${snapshot.currentEvent.name}`,
            `Event bonus: ${snapshot.currentEvent.bonusLabel}`
          ].join('\n')
        : 'No world snapshot captured yet',
      '',
      'Recent known errors',
      recentErrors,
      '',
      'Privacy note: this report omits raw localStorage data and custom creature nicknames.'
    ].join('\n');
  }

  private showUtilityToast(message: string): void {
    this.toast.textContent = message;
    this.toast.hidden = false;
    this.toast.classList.add('toast--visible');
    window.setTimeout(() => {
      this.toast.classList.remove('toast--visible');
    }, 1400);
  }

  private bindCreatureDetailDismissal(): void {
    window.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (this.closeCreatureDetails(true)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (this.activeDrawer) {
        this.openDrawer(undefined);
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (this.hasStarted && !this.characterCreator.hidden) {
        this.closeCharacterCreator();
        event.preventDefault();
        event.stopPropagation();
      }
    });

    this.root.addEventListener(
      'pointerdown',
      (event) => {
        if (this.repDexDetail.hidden && this.crewDetail.hidden) {
          return;
        }

        const target = event.target;
        if (!(target instanceof Node)) {
          return;
        }

        if (this.repDexDetail.contains(target) || this.crewDetail.contains(target)) {
          return;
        }

        this.closeCreatureDetails(false);
      },
      true
    );
  }

  private bindDrawerUi(): void {
    this.bindMobilePress(this.creatorSettingsButton, () => {
      this.openDrawer('settings');
    });
    this.bindMobilePress(this.menuCrewButton, () => {
      this.openDrawer('crew');
    });
    this.bindMobilePress(this.menuRepDexButton, () => {
      this.openDrawer('repdex');
    });
    this.bindMobilePress(this.menuGoalsButton, () => {
      this.openDrawer('goals');
    });
    this.bindMobilePress(this.menuSettingsButton, () => {
      this.openDrawer('settings');
    });
    this.panelCloseButtons.forEach((button) => {
      this.bindMobilePress(button, () => {
        this.openDrawer(undefined);
      });
    });
    this.bindMobilePress(this.captureResultViewCrew, () => {
      this.hideCaptureResult(true);
      this.openDrawer('crew');
    });
    this.bindMobilePress(this.captureResultKeepPlaying, () => {
      this.hideCaptureResult(true);
      this.openDrawer(undefined);
    });
    this.bindMobilePress(this.settingsHelpButton, () => {
      this.openDrawer(undefined);
      this.setTutorialStep('Move around. Find a creature. Check its odds. Arm wrestle to capture it.');
    });
  }

  private bindSettingsUi(): void {
    this.bindMobilePress(this.settingsButton, () => {
      this.setSettingsPanelOpen(this.settingsPanel.hidden);
    });

    this.bindMobilePress(this.settingsCloseButton, () => {
      this.setSettingsPanelOpen(false);
    });

    this.settingsMusicInput.addEventListener('input', () => {
      this.updateSettings({ musicVolume: Number(this.settingsMusicInput.value) });
    });

    this.settingsSfxInput.addEventListener('input', () => {
      this.updateSettings({ sfxVolume: Number(this.settingsSfxInput.value) });
    });

    this.settingsMuteInput.addEventListener('change', () => {
      this.updateSettings({ muted: this.settingsMuteInput.checked });
    });

    this.settingsPixelInput.addEventListener('change', () => {
      this.updateSettings({ pixelFilter: this.settingsPixelInput.checked });
    });

    this.settingsCameraSelect.addEventListener('change', () => {
      this.updateSettings({ cameraDistance: this.settingsCameraSelect.value as CameraDistanceSetting });
    });

    this.settingsReducedInput.addEventListener('change', () => {
      this.updateSettings({ reducedMotion: this.settingsReducedInput.checked });
    });

    this.settingsCatchOddsInput.addEventListener('change', () => {
      this.updateSettings({ showCatchOdds: this.settingsCatchOddsInput.checked });
    });

    this.bindMobilePress(this.settingsResetSaveButton, () => {
      if (!window.confirm('Reset your save data and start fresh?')) {
        return;
      }

      this.resetSaveListeners.forEach((callback) => callback());
    });
  }

  private bindTutorialUi(): void {
    this.bindMobilePress(this.tutorialSkip, () => {
      this.tutorialSkipListeners.forEach((callback) => callback());
    });
  }

  private bindMobilePanelToggle(): void {
    const mediaQuery = window.matchMedia('(max-width: 820px)');
    const panelMap: Array<{
      panel: HTMLElement;
      toggle: HTMLButtonElement;
      body: HTMLElement;
    }> = [
      {
        panel: this.repdexPanel,
        toggle: this.repdexPanelToggle,
        body: this.repdexPanelBody
      },
      {
        panel: this.crewPanel,
        toggle: this.crewPanelToggle,
        body: this.crewPanelBody
      },
      {
        panel: this.goalsPanel,
        toggle: this.goalsPanelToggle,
        body: this.goalsPanelBody
      },
      {
        panel: this.questsPanel,
        toggle: this.questsPanelToggle,
        body: this.questsPanelBody
      }
    ];

    const updateCollapsedState = (): void => {
      const isTouchDenseViewport = mediaQuery.matches;
      panelMap.forEach(({ panel, toggle, body }) => {
        this.setPanelCollapsed(panel, body, toggle, isTouchDenseViewport);
      });
    };

    const onMediaChange = (): void => {
      updateCollapsedState();
    };

    panelMap.forEach(({ panel, toggle, body }) => {
      this.bindMobilePress(toggle, () => {
        this.setPanelCollapsed(panel, body, toggle, !panel.classList.contains('hud-panel--collapsed'));
      });
    });

    updateCollapsedState();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onMediaChange);
    } else {
      mediaQuery.addListener(onMediaChange);
    }
  }

  private setPanelCollapsed(
    panel: HTMLElement,
    body: HTMLElement,
    toggle: HTMLButtonElement,
    collapsed: boolean
  ): void {
    panel.classList.toggle('hud-panel--collapsed', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    body.hidden = false;
    toggle.textContent = collapsed ? '?' : '?';
    if (collapsed) {
      body.classList.add('panel-body--collapsed');
      body.setAttribute('aria-hidden', 'true');
    } else {
      body.classList.remove('panel-body--collapsed');
      body.removeAttribute('aria-hidden');
    }
  }

  private bindMobilePress(button: HTMLButtonElement, handler: () => void): void {
    const run = (event?: Event) => {
      if (button.disabled) {
        return;
      }

      event?.preventDefault();
      handler();
    };

    button.addEventListener('click', run);
    button.addEventListener('touchend', run);
  }

  private rotatePreview(delta: number): void {
    this.setPreviewRotation(this.previewRotation + delta);
  }

  private setPreviewRotation(rotation: number): void {
    const twoPi = Math.PI * 2;
    const normalized = ((rotation % twoPi) + twoPi) % twoPi;
    this.previewRotation = normalized;
    this.previewRotationListeners.forEach((callback) => callback(this.previewRotation));
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

    const startSpotHold = () => {
      if (
        this.activeWorkout ||
        this.spotCallout.hidden ||
        this.spotCalloutButton.disabled ||
        this.spotTargetRosterId === undefined
      ) {
        return;
      }

      this.spotHoldActive = true;
      this.spotHoldProgress = 0;
      this.spotHoldTargetId = this.spotTargetRosterId;
      this.updateSpotMeterFill(0);
    };

    const endSpotHold = () => {
      this.stopSpotHold();
    };

    this.spotCalloutButton.addEventListener('pointerdown', (event) => {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }

      event.preventDefault();
      this.spotCalloutButton.setPointerCapture(event.pointerId);
      startSpotHold();
    });

    this.spotCalloutButton.addEventListener('pointerup', (event) => {
      if (this.spotCalloutButton.hasPointerCapture(event.pointerId)) {
        this.spotCalloutButton.releasePointerCapture(event.pointerId);
      }

      endSpotHold();
    });

    this.spotCalloutButton.addEventListener('pointercancel', () => {
      endSpotHold();
    });

    this.spotCalloutButton.addEventListener('pointerleave', () => {
      endSpotHold();
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

  private attemptSpot(targetRosterId?: number): void {
    if (this.activeWorkout || targetRosterId === undefined) {
      return;
    }

    this.rosterSpotListeners.forEach((callback) => callback(targetRosterId));
  }

  private updateSpotMeterFill(progress: number): void {
    const width = `${Math.round(progress * 100)}%`;
    if (this.renderedSpotMeterWidth !== width) {
      this.spotCalloutMeterFill.style.width = width;
      this.renderedSpotMeterWidth = width;
    }
  }

  private stopSpotHold(): void {
    this.spotHoldActive = false;
    this.spotHoldProgress = 0;
    this.spotHoldTargetId = undefined;
    this.updateSpotMeterFill(0);
  }

  private updateSpotHoldInteraction(deltaSeconds: number): void {
    if (!this.spotHoldActive) {
      return;
    }

    if (
      this.activeWorkout ||
      this.spotCallout.hidden ||
      this.spotCalloutButton.disabled ||
      this.spotHoldTargetId === undefined ||
      this.spotHoldTargetId !== this.spotTargetRosterId
    ) {
      this.stopSpotHold();
      return;
    }

    this.spotHoldProgress = Math.min(1, this.spotHoldProgress + deltaSeconds / SPOT_HOLD_DURATION);
    this.updateSpotMeterFill(this.spotHoldProgress);

    if (this.spotHoldProgress >= 1) {
      this.attemptSpot(this.spotHoldTargetId);
      this.stopSpotHold();
    }
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
    this.crewSortSelect.addEventListener('change', () => {
      this.crewSort = this.resolveCrewSort(this.crewSortSelect.value);
      this.renderedCrewMarkup = '';
    });

    this.bindMobilePress(this.crewDetailClose, () => {
      this.closeCrewDetail();
    });

    this.bindMobilePress(this.crewDetailRenameButton, () => {
      if (this.activeCrewDetailId === undefined) {
        return;
      }

      const rosterId = this.activeCrewDetailId;
      const target = this.getOwnedEntry(rosterId);
      if (!target) {
        return;
      }

      const inputName = this.crewDetailNameInput.value.trim();
      const definition = getBuddyDefinition(target.definitionId);
      const currentName = this.getBuddyDisplayName(definition, target.displayName);
      if (!inputName) {
        if (!window.confirm(`Clear custom name on ${currentName}?`)) {
          return;
        }
      }

      this.rosterRenameListeners.forEach((callback) => callback(rosterId, inputName));
      this.openCrewDetail({
        ...target,
        displayName: inputName.length > 0 ? inputName : undefined
      });
    });

    this.bindMobilePress(this.crewDetailUseSteroidButton, () => {
      if (this.activeCrewDetailId === undefined) {
        return;
      }

      const rosterId = this.activeCrewDetailId;
      const target = this.getOwnedEntry(rosterId);
      if (!target) {
        return;
      }

      const definition = getBuddyDefinition(target.definitionId);
      const name = this.getBuddyDisplayName(definition, target.displayName);
      const hasMore = this.availableSteroids > 0;
      if (!hasMore) {
        this.pushMessage('No steroids left. Hit workouts or vending machines for more.');
        return;
      }

      this.rosterUseSteroidListeners.forEach((callback) => callback(rosterId));
      this.openCrewDetail({
        ...target,
        displayName: target.displayName
      });
      this.crewDetailUseSteroidButton.disabled = true;
      this.pushMessage(`${name} got unreasonably swole!`);
    });

    this.bindMobilePress(this.crewDetailReleaseButton, () => {
      if (this.activeCrewDetailId === undefined) {
        return;
      }

      const rosterId = this.activeCrewDetailId;
      const target = this.getOwnedEntry(rosterId);
      if (!target) {
        return;
      }

      const definition = getBuddyDefinition(target.definitionId);
      const name = this.getBuddyDisplayName(definition, target.displayName);
      if (!window.confirm(`Release ${name} from your collection?`)) {
        return;
      }

      this.rosterRemoveListeners.forEach((callback) => callback(rosterId));
      this.closeCrewDetail();
    });

    this.crewList.addEventListener('click', (event) => {
      const target = event.target;

      if (!(target instanceof HTMLButtonElement)) {
        const row = target instanceof Element ? target.closest('.crew-row[data-roster-id]') : null;
        if (!(row instanceof HTMLElement)) {
          return;
        }

        const rosterId = Number(row.dataset.rosterId);
        const entry = this.rosterEntriesById.get(rosterId);
        if (!entry) {
          return;
        }

        this.openCrewDetail(entry);
        return;
      }

      const trainId = target.dataset.trainBuddy;
      const steroidId = target.dataset.useSteroid;
      const removeId = target.dataset.removeBuddy;
      const storeId = target.dataset.storeBuddy;

      if (trainId) {
        this.rosterTrainListeners.forEach((callback) => callback(Number(trainId)));
      }

      if (storeId) {
        const id = Number(storeId);
        this.rosterStoreListeners.forEach((callback) => callback(id));
        if (this.activeCrewDetailId === id) {
          this.closeCrewDetail();
        }
      }

      if (removeId) {
        const id = Number(removeId);
        const row = this.getOwnedEntry(id);
        if (row) {
          const name = this.getBuddyDisplayName(getBuddyDefinition(row.definitionId), row.displayName);
          if (!window.confirm(`Release ${name} from your collection?`)) {
            return;
          }
        }

        this.rosterRemoveListeners.forEach((callback) => callback(id));
        if (this.activeCrewDetailId === id) {
          this.closeCrewDetail();
        }
      }

      if (steroidId) {
        const rosterId = Number(steroidId);
        const name = this.rosterNameById.get(rosterId) ?? 'this buddy';
        if (!window.confirm(`Use Steroids on ${name}?`)) {
          return;
        }

        this.rosterUseSteroidListeners.forEach((callback) => callback(rosterId));
        if (this.activeCrewDetailId === rosterId) {
          const targetEntry = this.getOwnedEntry(rosterId);
          if (targetEntry) {
            this.openCrewDetail(targetEntry);
          }
        }
      }
    });

    this.storageList.addEventListener('click', (event) => {
      const target = event.target;

      if (!(target instanceof HTMLButtonElement)) {
        const row = target instanceof Element ? target.closest('.crew-row[data-storage-id]') : null;
        if (!(row instanceof HTMLElement)) {
          return;
        }

        const rosterId = Number(row.dataset.storageId);
        const entry = this.storageEntriesById.get(rosterId);
        if (!entry) {
          return;
        }

        this.openCrewDetail(entry);
        return;
      }

      const activateId = target.dataset.activateBuddy;
      const removeId = target.dataset.removeBuddy;

      if (activateId) {
        const id = Number(activateId);
        this.storageActivateListeners.forEach((callback) => callback(id));
        if (this.activeCrewDetailId === id) {
          this.closeCrewDetail();
        }
      }

      if (removeId) {
        const id = Number(removeId);
        const row = this.storageEntriesById.get(id);
        if (row) {
          const name = this.getBuddyDisplayName(getBuddyDefinition(row.definitionId), row.displayName);
          if (!window.confirm(`Release ${name} from your collection?`)) {
            return;
          }
        }

        this.rosterRemoveListeners.forEach((callback) => callback(id));
        if (this.activeCrewDetailId === id) {
          this.closeCrewDetail();
        }
      }
    });

    this.crewList.addEventListener('keydown', (event) => {
      if (!(event instanceof KeyboardEvent)) {
        return;
      }

      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const row = target.closest('.crew-row[data-roster-id]');
      const rosterId = row instanceof HTMLElement ? Number(row.dataset.rosterId) : NaN;
      if (!Number.isFinite(rosterId)) {
        return;
      }

      const entry = this.rosterEntriesById.get(rosterId);
      if (!entry) {
        return;
      }

      this.openCrewDetail(entry);
      event.preventDefault();
    });

    this.storageList.addEventListener('keydown', (event) => {
      if (!(event instanceof KeyboardEvent)) {
        return;
      }

      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const row = target.closest('.crew-row[data-storage-id]');
      const rosterId = row instanceof HTMLElement ? Number(row.dataset.storageId) : NaN;
      if (!Number.isFinite(rosterId)) {
        return;
      }

      const entry = this.storageEntriesById.get(rosterId);
      if (!entry) {
        return;
      }

      this.openCrewDetail(entry);
      event.preventDefault();
    });
  }

  private bindRepDexUi(): void {
    this.dexList.addEventListener('click', (event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const row = target.closest<HTMLDivElement>('.dex-row[data-repdex-id]');
      const definitionId = row?.dataset.repdexId;
      if (!definitionId) {
        return;
      }

      const entry = this.repDexEntriesById.get(definitionId);
      if (!entry) {
        return;
      }

      this.openRepDexDetail(entry);
    });

    this.dexList.addEventListener('keydown', (event) => {
      if (!(event instanceof KeyboardEvent)) {
        return;
      }

      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const row = target.closest<HTMLDivElement>('.dex-row[data-repdex-id]');
      const definitionId = row?.dataset.repdexId;

      if (!definitionId) {
        return;
      }

      const entry = this.repDexEntriesById.get(definitionId);
      if (!entry) {
        return;
      }

      this.openRepDexDetail(entry);
      event.preventDefault();
    });

    this.bindMobilePress(this.repDexDetailClose, () => {
      this.closeRepDexDetail();
    });
  }

  private bindBossUi(): void {
    this.root.querySelector<HTMLButtonElement>('[data-boss-challenge]')?.addEventListener('click', () => {
      this.bossChallengeListeners.forEach((callback) => callback());
    });
  }

  private bindCaptureResultUi(): void {
    this.bindMobilePress(this.targetCaptureButton, () => {
      this.closeCreatureDetails(false);
      this.openDrawer(undefined);
      this.captureActionListeners.forEach((callback) => callback());
    });

    this.bindMobilePress(this.captureResultClose, () => {
      this.hideCaptureResult(true);
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

  private renderCrew(roster: BuddyRosterEntry[], steroidsAvailable = 0): string {
    if (roster.length === 0) {
      return '<div class="crew-empty">No active crew. Activate storage or catch a beast.</div>';
    }

    return roster
      .map((entry) => {
        const definition = getBuddyDefinition(entry.definitionId);
        const displayName = this.getBuddyDisplayName(
          definition,
          entry.displayName
        );
        const exoticClass = this.isExoticBuddyDefinition(definition) ? ' crew-row--exotic' : '';
        const busy = entry.status !== 'ready';
        const progress =
          entry.taskDuration > 0
            ? Math.round(Math.max(0, Math.min(100, 100 - entry.taskTimer / entry.taskDuration * 100)))
            : Math.round(entry.energy);
        const xpRequired = getBuddyXpForNextLevel(entry.level);
        const xpProgress = Math.round(Math.max(0, Math.min(100, entry.xp / xpRequired * 100)));
        let status = `Energy ${Math.round(entry.energy)}`;

        if (entry.status === 'training') {
          status = `${entry.taskLabel ?? 'Training'} ${Math.ceil(entry.taskTimer)}s`;
        }

        if (entry.status === 'needs-spot') {
          status = `Needs spot ${Math.ceil(entry.taskTimer)}s`;
        }

        return `
          <div
            class="crew-row crew-row--${entry.status}${exoticClass}"
            role="button"
            tabindex="0"
            data-roster-id="${entry.rosterId}"
          >
            <div class="crew-main">
              <span>${displayName}</span>
              <strong>Lv ${entry.level}</strong>
            </div>
            <div class="crew-rarity-line">${this.renderRarityBadge(definition.rarity)}</div>
            <div class="crew-stats">
              <span>S${entry.strength}</span>
              <span>E${entry.endurance}</span>
              <span>F${entry.focus}</span>
            </div>
            <div class="crew-passive">Passive: ${definition.passive.name}</div>
            <div class="crew-meter" aria-hidden="true">
              <div style="width: ${progress}%"></div>
            </div>
            <div class="crew-xp-label">
              <span>XP</span>
              <strong>${entry.xp}/${xpRequired}</strong>
            </div>
            <div class="crew-meter crew-meter--xp" aria-hidden="true">
              <div style="width: ${xpProgress}%"></div>
            </div>
            <div class="crew-actions">
              <span>${status}</span>
              <button
                type="button"
                class="crew-steroid"
                data-use-steroid="${entry.rosterId}"
                ${steroidsAvailable <= 0 ? 'disabled' : ''}
              >Use</button>
              <button type="button" data-train-buddy="${entry.rosterId}" ${busy ? 'disabled' : ''}>Train</button>
              <button type="button" data-store-buddy="${entry.rosterId}" ${busy ? 'disabled' : ''}>Store</button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  private renderStorage(storage: BuddyRosterEntry[], canActivate: boolean): string {
    if (storage.length === 0) {
      return '<div class="crew-empty">Storage empty. Extra catches wait here.</div>';
    }

    return storage
      .map((entry) => {
        const definition = getBuddyDefinition(entry.definitionId);
        const displayName = this.getBuddyDisplayName(
          definition,
          entry.displayName
        );
        const exoticClass = this.isExoticBuddyDefinition(definition) ? ' crew-row--exotic' : '';
        const progress = Math.round(Math.max(0, Math.min(100, entry.energy)));
        const xpRequired = getBuddyXpForNextLevel(entry.level);
        const xpProgress = Math.round(Math.max(0, Math.min(100, entry.xp / xpRequired * 100)));
        return `
          <div
            class="crew-row crew-row--stored${exoticClass}"
            role="button"
            tabindex="0"
            data-storage-id="${entry.rosterId}"
          >
            <div class="crew-main">
              <span>${displayName}</span>
              <strong>Lv ${entry.level}</strong>
            </div>
            <div class="crew-rarity-line">${this.renderRarityBadge(definition.rarity)}</div>
            <div class="crew-stats">
              <span>S${entry.strength}</span>
              <span>E${entry.endurance}</span>
              <span>F${entry.focus}</span>
            </div>
            <div class="crew-passive">Stored: passive inactive</div>
            <div class="crew-meter" aria-hidden="true">
              <div style="width: ${progress}%"></div>
            </div>
            <div class="crew-xp-label">
              <span>XP</span>
              <strong>${entry.xp}/${xpRequired}</strong>
            </div>
            <div class="crew-meter crew-meter--xp" aria-hidden="true">
              <div style="width: ${xpProgress}%"></div>
            </div>
            <div class="crew-actions crew-actions--storage">
              <span>Storage box</span>
              <button type="button" data-activate-buddy="${entry.rosterId}" ${canActivate ? '' : 'disabled'}>
                ${canActivate ? 'Activate' : 'Full'}
              </button>
              <button type="button" class="crew-remove" data-remove-buddy="${entry.rosterId}">Release</button>
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
      this.stopSpotHold();
      return;
    }

    const target = this.findNearbySpotTarget(snapshot);

    this.spotTargetRosterId = target?.rosterId;

    if (!target) {
      this.setHidden(this.spotCallout, true);
      this.stopSpotHold();
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
    if (this.spotHoldActive && (!nearSpot || this.spotHoldTargetId !== target.rosterId)) {
      this.stopSpotHold();
    }
    const text = `${targetName} needs a spot on ${stationName} (${Math.ceil(target.taskTimer)}s)${
      stationDistance !== undefined ? ` - ${stationDistance.toFixed(1)}m` : ''
    }`;
    this.renderedSpotCalloutText = this.setText(
      this.spotCalloutText,
      this.renderedSpotCalloutText,
      text
    );
    this.spotCalloutButton.textContent = nearSpot ? 'Hold to Spot' : 'Move Closer';
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

  private updateBossPanel(boss?: BossState, battle?: WorldSnapshot['activeBossBattle']): void {
    if (!boss || battle || this.root.classList.contains('game-root--creating')) {
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

  private updateBossBattlePanel(battle?: WorldSnapshot['activeBossBattle']): void {
    if (!battle || this.root.classList.contains('game-root--creating')) {
      this.setHidden(this.bossBattlePanel, true);
      return;
    }

    const activeRound = battle.rounds[battle.activeRound] ?? battle.rounds[battle.rounds.length - 1];
    const progress = Math.round((1 - battle.timer / battle.duration) * 100);
    const resultText = battle.phase === 'result'
      ? battle.result === 'success'
        ? 'CREW WINS'
        : 'BOSS WINS'
      : 'VS';
    const scores = `Crew ${Math.round(battle.crewPower)} vs Boss ${Math.round(battle.bossPower)} - Win ${Math.round(battle.winChance * 100)}%`;
    const log = activeRound
      ? `${activeRound.label}: Crew ${Math.round(activeRound.crewScore)} / Boss ${Math.round(activeRound.bossScore)} - ${activeRound.winner === 'crew' ? 'crew takes the beat' : 'boss pushes back'}`
      : battle.message;
    const rewards = battle.result === 'success'
      ? `Win: +${battle.rewardSteroids} Steroid, +${battle.rewardXp} XP, exotic boost +${Math.round(battle.exoticBoostReward * 1000) / 10}%`
      : `Lose: -${battle.staminaCost} stamina. Progress stays safe.`;
    const meterWidth = `${Math.max(0, Math.min(100, progress))}%`;

    this.renderedBossBattleName = this.setText(
      this.bossBattleName,
      this.renderedBossBattleName,
      battle.boss.name
    );
    this.renderedBossBattleResult = this.setText(
      this.bossBattleResult,
      this.renderedBossBattleResult,
      resultText
    );
    this.renderedBossBattleScores = this.setText(
      this.bossBattleScores,
      this.renderedBossBattleScores,
      scores
    );
    this.renderedBossBattleLog = this.setText(
      this.bossBattleLog,
      this.renderedBossBattleLog,
      log
    );
    this.renderedBossBattleRewards = this.setText(
      this.bossBattleRewards,
      this.renderedBossBattleRewards,
      rewards
    );

    if (meterWidth !== this.renderedBossBattleMeter) {
      this.bossBattleMeter.style.width = meterWidth;
      this.renderedBossBattleMeter = meterWidth;
    }

    this.setHidden(this.bossBattlePanel, false);
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
    const staminaFull = snapshot.player.stamina >= STAMINA_BALANCE.fullThreshold;

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
      energyMeta = `Need ${machine.energyDrinkCost} token`;
    } else if (staminaFull) {
      energyMeta = 'Stamina full';
    } else {
      energyMeta = `${machine.energyDrinkCost} token -> +${machine.energyDrinkStamina} stamina`;
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
    const normalizedHair = appearance.hair
      ? normalizeManifestHairId(appearance.hair)
      : undefined;
    const normalizedSex = appearance.sex
      ? normalizeManifestSex(appearance.sex)
      : undefined;
    const normalizedFrame = appearance.frame
      ? normalizeBodyFrame(appearance.frame)
      : undefined;

    this.appearance = {
      ...this.appearance,
      ...appearance,
      sex: normalizedSex ?? this.appearance.sex,
      hair: normalizedHair ?? this.appearance.hair,
      frame: normalizedFrame ?? this.appearance.frame,
      body: {
        ...this.appearance.body,
        ...(appearance.body ?? {})
      }
    };
    this.syncCreatorControls();
    this.scheduleAppearanceNotifications();
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
    this.creatorHairButtons.forEach((button) => {
      const selected = button.dataset.hair === this.appearance.hair;
      button.classList.toggle('creator-choice--selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    this.creatorSkinButtons.forEach((button) => {
      const selected = button.dataset.skin === this.appearance.skinTone;
      button.classList.toggle('creator-choice--selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    this.creatorSexButtons.forEach((button) => {
      const selected = button.dataset.sex === this.appearance.sex;
      button.classList.toggle('creator-choice--selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    this.creatorMuscleButtons.forEach((button) => {
      const selected = button.dataset.muscle === this.appearance.muscleBuild;
      button.classList.toggle('creator-choice--selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    this.creatorFrameButtons.forEach((button) => {
      const selected = button.dataset.frame === this.appearance.frame;
      button.classList.toggle('creator-choice--selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    this.creatorBodySizeInputs.forEach((input) => {
      const key = input.dataset.bodySize as BodySizeKey;
      const value = this.appearance.body[key] ?? 1;
      const nextValue = value.toFixed(2);

      if (input.value !== nextValue) {
        input.value = nextValue;
      }

      const output = this.creatorBodySizeValueElements.get(key);

      if (output) {
        output.textContent = `${Math.round(value * 100)}%`;
      }
    });

    this.updateCreatorSummary();
  }

  private updateCreatorSummary(): void {
    const muscle = MUSCLE_BUILD_OPTIONS.find((option) => option.id === this.appearance.muscleBuild);
    const frame = FRAME_OPTIONS.find((option) => option.id === this.appearance.frame);
    const sex = SEX_OPTIONS.find((option) => option.id === this.appearance.sex);
    const buildFocus: Record<PlayerAppearance['muscleBuild'], string> = {
      lean: 'lean casual frame',
      beginner: 'smaller casual build',
      average: 'balanced everyday build',
      power: 'sporty powerful frame',
      toned: 'lean definition',
      athletic: 'sporty shoulders and capable legs',
      sculpted: 'clean sculpted muscle',
      muscular: 'wider shoulders, stronger arms, athletic torso',
      bodybuilder: 'big clean upper body, still stylized',
      elite: 'heroic swole silhouette'
    };
    const frameFocus: Record<PlayerAppearance['frame'], string> = {
      balanced: 'even proportions',
      tapered: 'wider shoulders and smaller waist',
      compact: 'shorter powerful stance',
      curved: 'stronger lower-body shape',
      power: 'thicker heroic torso and stable stance',
      athletic: 'sporty agile proportions',
      heavyweight: 'large grounded powerhouse frame',
      lean: 'tall crisp runner-like silhouette',
      voluptuous: 'fuller lower-body emphasis',
      pear: 'fuller hips and thighs'
    };
    const bodyFocus = BODY_SIZE_CONTROLS.filter((control) => {
      const value = this.appearance.body[control.id] ?? 1;
      return Math.abs(value - 1) >= 0.08;
    })
      .slice(0, 3)
      .map((control) => {
        const value = this.appearance.body[control.id] ?? 1;
        return value > 1 ? `${control.label.toLowerCase()} boosted` : `${control.label.toLowerCase()} leaner`;
      });
    const focus =
      bodyFocus.length > 0
        ? bodyFocus.join(', ')
        : `${buildFocus[this.appearance.muscleBuild]}, ${frameFocus[this.appearance.frame]}`;

    this.creatorSummary.innerHTML = `
      <strong>Build: ${muscle?.label ?? this.appearance.muscleBuild}</strong>
      <span>Frame: ${frame?.label ?? this.appearance.frame}</span>
      <span>Base: ${sex?.label ?? this.appearance.sex}</span>
      <span>Focus: ${focus}</span>
    `;
  }

  private scheduleAppearanceNotifications(): void {
    if (this.appearanceNotifyHandle !== null) {
      return;
    }

    this.appearanceNotifyHandle = requestAnimationFrame(() => {
      this.appearanceNotifyHandle = null;
      const snapshot = this.getAppearance();
      this.appearanceListeners.forEach((callback) => callback(snapshot));
    });
  }
}


