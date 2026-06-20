import type { ActionState } from '../types';

type MoveDirection = 'up' | 'down' | 'left' | 'right';

const DEAD_ZONE = 0.18;

function applyDeadZone(value: number): number {
  return Math.abs(value) < DEAD_ZONE ? 0 : value;
}

function clampAxis(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

export class InputController {
  private readonly keys = new Set<string>();
  private readonly virtualDirections = new Set<MoveDirection>();
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

      if ((event.code === 'Space' || event.code === 'KeyE') && !event.repeat) {
        this.catchQueued = true;
        event.preventDefault();
      }

      if (event.code === 'KeyE' && !event.repeat) {
        this.interactQueued = true;
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
    });

    window.addEventListener('gamepadconnected', (event) => {
      this.lastInputLabel = event.gamepad.id || 'Gamepad';
    });
  }

  bindTouchControls(root: HTMLElement): void {
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
      });
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

    const gamepad = this.getPrimaryGamepad();
    let gamepadConnected = false;
    let gamepadCatch = false;
    let gamepadInteract = false;
    let gamepadReset = false;
    let sprintHeld = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

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
