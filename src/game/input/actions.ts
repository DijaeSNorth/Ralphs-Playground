import type { ActionState } from '../types';

type MoveDirection = 'up' | 'down' | 'left' | 'right';

const DEAD_ZONE = 0.18;
const TOUCH_DEAD_ZONE = 0.08;
const TOUCH_STICK_RADIUS = 54;
const TOUCH_MOVE_LERP_IN = 0.16;
const TOUCH_MOVE_LERP_OUT = 0.22;
const DESKTOP_INPUT_LABEL = 'Keyboard + Mouse';
const TOUCH_INPUT_LABEL = 'Touch';
const KEYBOARD_INPUT_LABEL = 'Keyboard + Mouse';

export type InputMode = 'keyboard-mouse' | 'touch';

function clampAxis(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function hasMoveInput(x: number, z: number): boolean {
  return Math.hypot(x, z) > 0.01;
}

function applyRadialDeadZone(x: number, z: number, deadZone: number): { x: number; z: number } {
  const magnitude = Math.hypot(x, z);

  if (magnitude <= deadZone) {
    return { x: 0, z: 0 };
  }

  const scaledMagnitude = Math.min(1, (magnitude - deadZone) / (1 - deadZone));
  const scale = scaledMagnitude / magnitude;
  return {
    x: x * scale,
    z: z * scale
  };
}

export class InputController {
  private readonly keys = new Set<string>();
  private readonly virtualDirections = new Set<MoveDirection>();
  private virtualAxis = { x: 0, z: 0 };
  private virtualSprintHeld = false;
  private smoothedTouchAxis = { x: 0, z: 0 };
  private catchQueued = false;
  private interactQueued = false;
  private resetQueued = false;
  private previousGamepadCatch = false;
  private previousGamepadInteract = false;
  private previousGamepadReset = false;
  private lastInputLabel = DESKTOP_INPUT_LABEL;
  private mode: InputMode = 'keyboard-mouse';

  constructor() {
    window.addEventListener('keydown', (event) => {
      if (this.mode !== 'keyboard-mouse') {
        return;
      }

      this.keys.add(event.code);

      if (event.code === 'Space' && !event.repeat) {
        this.catchQueued = true;
        this.lastInputLabel = DESKTOP_INPUT_LABEL;
        event.preventDefault();
      }

      if (event.code === 'KeyE' && !event.repeat) {
        this.interactQueued = true;
        this.lastInputLabel = DESKTOP_INPUT_LABEL;
        event.preventDefault();
      }

      if (event.code === 'KeyR' && !event.repeat) {
        this.resetQueued = true;
        this.lastInputLabel = DESKTOP_INPUT_LABEL;
      }

      if (
        event.code === 'KeyW' ||
        event.code === 'KeyA' ||
        event.code === 'KeyS' ||
        event.code === 'KeyD' ||
        event.code === 'ShiftLeft' ||
        event.code === 'ShiftRight' ||
        event.code.startsWith('Arrow')
      ) {
        this.lastInputLabel = DESKTOP_INPUT_LABEL;
      }

      if (event.code.startsWith('Arrow')) {
        event.preventDefault();
      }
    });

    window.addEventListener('keyup', (event) => {
      if (this.mode !== 'keyboard-mouse') {
        return;
      }

      this.keys.delete(event.code);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.virtualDirections.clear();
      this.virtualAxis = { x: 0, z: 0 };
      this.virtualSprintHeld = false;
    });

    window.addEventListener('gamepadconnected', () => {
      this.previousGamepadCatch = false;
      this.previousGamepadInteract = false;
      this.previousGamepadReset = false;
    });
  }

  bindMouseControls(surface: HTMLElement): void {
    surface.addEventListener('pointerdown', (event) => {
      if (this.mode !== 'keyboard-mouse') {
        return;
      }

      if (event.pointerType !== 'mouse') {
        return;
      }

      if (event.button === 0) {
        this.catchQueued = true;
        this.lastInputLabel = DESKTOP_INPUT_LABEL;
        event.preventDefault();
      }

      if (event.button === 2) {
        this.interactQueued = true;
        this.lastInputLabel = DESKTOP_INPUT_LABEL;
        event.preventDefault();
      }
    });

    surface.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
  }

  bindTouchControls(root: HTMLElement): void {
    const joystick = root.querySelector<HTMLDivElement>('[data-joystick]');
    const joystickKnob = root.querySelector<HTMLDivElement>('[data-joystick-knob]');

    if (joystick && joystickKnob) {
      const resetJoystick = () => {
        this.virtualAxis = { x: 0, z: 0 };
        joystickKnob.style.transform = 'translate(-50%, -50%)';
      };

      const updateJoystick = (event: PointerEvent) => {
        if (this.mode !== 'touch') {
          return;
        }

        event.preventDefault();
        const rect = joystick.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const rawX = event.clientX - centerX;
        const rawY = event.clientY - centerY;
        const distance = Math.hypot(rawX, rawY);
        const scale = distance > TOUCH_STICK_RADIUS ? TOUCH_STICK_RADIUS / distance : 1;
        const x = rawX * scale;
        const y = rawY * scale;

        this.virtualAxis = applyRadialDeadZone(
          x / TOUCH_STICK_RADIUS,
          y / TOUCH_STICK_RADIUS,
          TOUCH_DEAD_ZONE
        );
        joystickKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        this.lastInputLabel = 'Touch';
      };

      const activate = (event: PointerEvent) => {
        if (this.mode !== 'touch') {
          return;
        }

        joystick.setPointerCapture(event.pointerId);
        updateJoystick(event);
      };

      const release = (event: PointerEvent) => {
        if (this.mode !== 'touch') {
          return;
        }

        event.preventDefault();
        resetJoystick();

        if (joystick.hasPointerCapture(event.pointerId)) {
          joystick.releasePointerCapture(event.pointerId);
        }
      };

      joystick.addEventListener('pointerdown', activate);
      joystick.addEventListener('pointermove', updateJoystick);
      joystick.addEventListener('pointerup', release);
      joystick.addEventListener('pointercancel', release);
    }

    root.querySelectorAll<HTMLButtonElement>('[data-move]').forEach((button) => {
      const direction = button.dataset.move as MoveDirection;

      const activate = (event: PointerEvent) => {
        if (this.mode !== 'touch') {
          return;
        }

        event.preventDefault();
        this.virtualDirections.add(direction);
        button.setPointerCapture(event.pointerId);
      };

      const release = (event: PointerEvent) => {
        if (this.mode !== 'touch') {
          return;
        }

        event.preventDefault();
        this.virtualDirections.delete(direction);

        if (button.hasPointerCapture(event.pointerId)) {
          button.releasePointerCapture(event.pointerId);
        }
      };

      button.addEventListener('pointerdown', activate);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('pointerleave', release);
    });

    root.querySelectorAll<HTMLButtonElement>('[data-catch]').forEach((button) => {
      button.addEventListener('pointerdown', (event) => {
        if (this.mode !== 'touch') {
          return;
        }

        event.preventDefault();
        this.catchQueued = true;
        this.lastInputLabel = 'Touch';
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-sprint]').forEach((button) => {
      const activate = (event: PointerEvent) => {
        if (this.mode !== 'touch') {
          return;
        }

        event.preventDefault();
        this.virtualSprintHeld = true;
        this.lastInputLabel = 'Touch';
        button.setPointerCapture(event.pointerId);
      };

      const release = (event: PointerEvent) => {
        if (this.mode !== 'touch') {
          return;
        }

        event.preventDefault();
        this.virtualSprintHeld = false;

        if (button.hasPointerCapture(event.pointerId)) {
          button.releasePointerCapture(event.pointerId);
        }
      };

      button.addEventListener('pointerdown', activate);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('pointerleave', release);
    });
  }

  setInputMode(mode: InputMode): void {
    if (this.mode === mode) {
      return;
    }

    this.mode = mode;
    this.keys.clear();
    this.virtualDirections.clear();
    this.virtualAxis = { x: 0, z: 0 };
    this.virtualSprintHeld = false;
    this.catchQueued = false;
    this.interactQueued = false;
    this.resetQueued = false;
    this.smoothedTouchAxis = { x: 0, z: 0 };
    this.lastInputLabel = mode === 'touch' ? TOUCH_INPUT_LABEL : KEYBOARD_INPUT_LABEL;
    this.previousGamepadCatch = false;
    this.previousGamepadInteract = false;
    this.previousGamepadReset = false;
  }

  private approach(current: number, target: number, amount: number): number {
    return current + (target - current) * clampAxis(amount);
  }

  getInputMode(): InputMode {
    return this.mode;
  }

  read(): ActionState {
    let keyboardX = 0;
    let keyboardZ = 0;

    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
      keyboardX -= 1;
    }

    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
      keyboardX += 1;
    }

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
      keyboardZ -= 1;
    }

    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
      keyboardZ += 1;
    }

    let touchX = 0;
    let touchZ = 0;

    if (this.virtualDirections.has('left')) {
      touchX -= 1;
    }

    if (this.virtualDirections.has('right')) {
      touchX += 1;
    }

    if (this.virtualDirections.has('up')) {
      touchZ -= 1;
    }

    if (this.virtualDirections.has('down')) {
      touchZ += 1;
    }

    if (this.virtualAxis.x !== 0 || this.virtualAxis.z !== 0) {
      touchX = this.virtualAxis.x;
      touchZ = this.virtualAxis.z;
    }

    const keyboardMoving = hasMoveInput(keyboardX, keyboardZ);
    const touchMoving = hasMoveInput(touchX, touchZ);
    const touchMode = this.mode === 'touch';
    let moveX = touchMode && touchMoving ? touchX : keyboardX;
    let moveZ = touchMode && touchMoving ? touchZ : keyboardZ;
    const gamepad = this.getPrimaryGamepad();
    const gamepadConnected = Boolean(gamepad);
    let gamepadCatch = false;
    let gamepadInteract = false;
    let gamepadReset = false;
    let gamepadMoving = false;
    let sprintHeld =
      this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.virtualSprintHeld;

    if (gamepad) {
      let { x: gamepadMoveX, z: gamepadMoveZ } = applyRadialDeadZone(
        gamepad.axes[0] ?? 0,
        gamepad.axes[1] ?? 0,
        DEAD_ZONE
      );

      if (!hasMoveInput(gamepadMoveX, gamepadMoveZ)) {
        gamepadMoveX = 0;
        gamepadMoveZ = 0;
      }

      if (gamepad.buttons[14]?.pressed) {
        gamepadMoveX -= 1;
      }

      if (gamepad.buttons[15]?.pressed) {
        gamepadMoveX += 1;
      }

      if (gamepad.buttons[12]?.pressed) {
        gamepadMoveZ -= 1;
      }

      if (gamepad.buttons[13]?.pressed) {
        gamepadMoveZ += 1;
      }

      const gamepadSprint = (gamepad.buttons[7]?.value ?? 0) > 0.35 || gamepad.buttons[5]?.pressed === true;
      gamepadCatch = gamepad.buttons[0]?.pressed === true || (gamepad.buttons[6]?.value ?? 0) > 0.5;
      gamepadInteract = gamepad.buttons[2]?.pressed === true;
      gamepadReset = gamepad.buttons[8]?.pressed === true;
      gamepadMoving = hasMoveInput(gamepadMoveX, gamepadMoveZ);

      if (gamepadMoving && !(touchMode ? touchMoving : keyboardMoving)) {
        moveX = gamepadMoveX;
        moveZ = gamepadMoveZ;
        this.lastInputLabel = gamepad.id || 'Gamepad';
      }

      if (gamepadSprint && !(touchMode ? touchMoving : keyboardMoving)) {
        sprintHeld = true;
        this.lastInputLabel = gamepad.id || 'Gamepad';
      }

      if (gamepadCatch || gamepadInteract || gamepadReset) {
        this.lastInputLabel = gamepad.id || 'Gamepad';
      }
    }

    const catchPressed = this.catchQueued || (gamepadCatch && !this.previousGamepadCatch);
    const interactPressed =
      this.interactQueued || (gamepadInteract && !this.previousGamepadInteract);
    const resetPressed = this.resetQueued || (gamepadReset && !this.previousGamepadReset);
    const isTouchInput = this.mode === 'touch';
    const isTouchMove = this.mode === 'touch' && hasMoveInput(touchX, touchZ);
    const touchLerp = isTouchMove ? TOUCH_MOVE_LERP_IN : TOUCH_MOVE_LERP_OUT;
    const shouldUseTouchMovement = isTouchInput && !(gamepadMoving && !(touchMode ? touchMoving : keyboardMoving));

    if (shouldUseTouchMovement) {
      this.smoothedTouchAxis = {
        x: this.approach(this.smoothedTouchAxis.x, isTouchMove ? touchX : 0, touchLerp),
        z: this.approach(this.smoothedTouchAxis.z, isTouchMove ? touchZ : 0, touchLerp)
      };

      moveX = this.smoothedTouchAxis.x;
      moveZ = this.smoothedTouchAxis.z;
    }

    this.catchQueued = false;
    this.interactQueued = false;
    this.resetQueued = false;
    this.previousGamepadCatch = gamepadCatch;
    this.previousGamepadInteract = gamepadInteract;
    this.previousGamepadReset = gamepadReset;

    const magnitude = Math.hypot(moveX, moveZ);

    if (magnitude > 1) {
      moveX /= magnitude;
      moveZ /= magnitude;
    }

    return {
      moveX: clampAxis(moveX),
      moveZ: clampAxis(moveZ),
      catchPressed,
      interactPressed,
      sprintHeld,
      resetPressed,
      isTouchInput,
      inputLabel: gamepadConnected ? 'Gamepad' : this.lastInputLabel,
      gamepadConnected
    };
  }

  private getPrimaryGamepad(): Gamepad | undefined {
    const gamepads = navigator.getGamepads?.() ?? [];

    for (const gamepad of gamepads) {
      if (gamepad?.connected) {
        return gamepad;
      }
    }

    return undefined;
  }
}
