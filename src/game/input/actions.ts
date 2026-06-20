import type { ActionState } from '../types';

type MoveDirection = 'up' | 'down' | 'left' | 'right';

const DEAD_ZONE = 0.18;
const TOUCH_DEAD_ZONE = 0.08;
const TOUCH_STICK_RADIUS = 54;

function applyDeadZone(value: number): number {
  return Math.abs(value) < DEAD_ZONE ? 0 : value;
}

function applyTouchDeadZone(value: number): number {
  return Math.abs(value) < TOUCH_DEAD_ZONE ? 0 : value;
}

function clampAxis(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

export class InputController {
  private readonly keys = new Set<string>();
  private readonly virtualDirections = new Set<MoveDirection>();
  private virtualAxis = { x: 0, z: 0 };
  private virtualSprintHeld = false;
  private catchQueued = false;
  private interactQueued = false;
  private resetQueued = false;
  private previousGamepadCatch = false;
  private previousGamepadInteract = false;
  private previousGamepadReset = false;
  private lastInputLabel = 'Keyboard';

  constructor() {
    window.addEventListener('keydown', (event) => {
      this.keys.add(event.code);

      if (event.code === 'Space' && !event.repeat) {
        this.catchQueued = true;
        event.preventDefault();
      }

      if (event.code === 'KeyE' && !event.repeat) {
        this.interactQueued = true;
        event.preventDefault();
      }

      if (event.code === 'KeyR' && !event.repeat) {
        this.resetQueued = true;
      }

      if (event.code.startsWith('Arrow')) {
        event.preventDefault();
      }
    });

    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.virtualDirections.clear();
      this.virtualAxis = { x: 0, z: 0 };
      this.virtualSprintHeld = false;
    });

    window.addEventListener('gamepadconnected', (event) => {
      this.lastInputLabel = event.gamepad.id || 'Gamepad';
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

        this.virtualAxis = {
          x: applyTouchDeadZone(x / TOUCH_STICK_RADIUS),
          z: applyTouchDeadZone(y / TOUCH_STICK_RADIUS)
        };
        joystickKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        this.lastInputLabel = 'Touch';
      };

      const activate = (event: PointerEvent) => {
        joystick.setPointerCapture(event.pointerId);
        updateJoystick(event);
      };

      const release = (event: PointerEvent) => {
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
        event.preventDefault();
        this.virtualDirections.add(direction);
        button.setPointerCapture(event.pointerId);
      };

      const release = (event: PointerEvent) => {
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
        event.preventDefault();
        this.catchQueued = true;
        this.lastInputLabel = 'Touch';
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-sprint]').forEach((button) => {
      const activate = (event: PointerEvent) => {
        event.preventDefault();
        this.virtualSprintHeld = true;
        this.lastInputLabel = 'Touch';
        button.setPointerCapture(event.pointerId);
      };

      const release = (event: PointerEvent) => {
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

  read(): ActionState {
    let moveX = 0;
    let moveZ = 0;

    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft') || this.virtualDirections.has('left')) {
      moveX -= 1;
    }

    if (this.keys.has('KeyD') || this.keys.has('ArrowRight') || this.virtualDirections.has('right')) {
      moveX += 1;
    }

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp') || this.virtualDirections.has('up')) {
      moveZ -= 1;
    }

    if (this.keys.has('KeyS') || this.keys.has('ArrowDown') || this.virtualDirections.has('down')) {
      moveZ += 1;
    }

    if (this.virtualAxis.x !== 0 || this.virtualAxis.z !== 0) {
      moveX = this.virtualAxis.x;
      moveZ = this.virtualAxis.z;
    }

    const gamepad = this.getPrimaryGamepad();
    let gamepadConnected = false;
    let gamepadCatch = false;
    let gamepadInteract = false;
    let gamepadReset = false;
    let sprintHeld =
      this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.virtualSprintHeld;

    if (gamepad) {
      gamepadConnected = true;
      this.lastInputLabel = gamepad.id || 'Gamepad';

      const axisX = applyDeadZone(gamepad.axes[0] ?? 0);
      const axisZ = applyDeadZone(gamepad.axes[1] ?? 0);

      if (axisX !== 0 || axisZ !== 0) {
        moveX = axisX;
        moveZ = axisZ;
      }

      if (gamepad.buttons[14]?.pressed) {
        moveX -= 1;
      }

      if (gamepad.buttons[15]?.pressed) {
        moveX += 1;
      }

      if (gamepad.buttons[12]?.pressed) {
        moveZ -= 1;
      }

      if (gamepad.buttons[13]?.pressed) {
        moveZ += 1;
      }

      sprintHeld ||= (gamepad.buttons[7]?.value ?? 0) > 0.35 || gamepad.buttons[5]?.pressed === true;
      gamepadCatch = gamepad.buttons[0]?.pressed === true || (gamepad.buttons[6]?.value ?? 0) > 0.5;
      gamepadInteract = gamepad.buttons[2]?.pressed === true;
      gamepadReset = gamepad.buttons[8]?.pressed === true;
    }

    const catchPressed = this.catchQueued || (gamepadCatch && !this.previousGamepadCatch);
    const interactPressed =
      this.interactQueued || (gamepadInteract && !this.previousGamepadInteract);
    const resetPressed = this.resetQueued || (gamepadReset && !this.previousGamepadReset);

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
