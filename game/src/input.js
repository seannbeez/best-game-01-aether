// AETHER FORGE — unified input: keyboard + mouse + touch.
// Touch: left half of the screen is a virtual move stick, right half aims
// and fires toward the touch point; two on-canvas buttons fire Dash and
// (during a draft) pick a relic. The game reads only this class.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    // Edge-triggered presses (P, M, Space, R, 1/2/3): a tap shorter than
    // one frame must not be lost when keyup lands before the next frame
    // polls the key set, so keydown also records a timestamped press.
    this.queued = new Map(); // code -> performance.now() of the keydown
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.mouseClicked = false;
    this.consumedClick = false;

    // Touch state.
    this.moveTouch = null; // { id, startX, startY, x, y }
    this.aimTouch = null; // { id, startX, startY, x, y }
    this.touchDashQueued = false;
    this.touchFireHeld = false;
    this.tapped = null; // { x, y } — a quick tap, consumed by the game
    this.touchActive = false;

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      this.queued.set(event.code, performance.now());
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });

    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = event.clientX - rect.left;
      this.mouseY = event.clientY - rect.top;
    });
    canvas.addEventListener('mousedown', (event) => {
      this.mouseDown = true;
      this.mouseClicked = true;
      const rect = canvas.getBoundingClientRect();
      this.mouseX = event.clientX - rect.left;
      this.mouseY = event.clientY - rect.top;
      if (event.button === 2) this.rightClicked = true;
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    canvas.addEventListener('touchstart', (event) => {
      event.preventDefault();
      this.touchActive = true;
      const rect = canvas.getBoundingClientRect();
      for (const touch of event.changedTouches) {
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        if (x < rect.width * 0.45 && this.moveTouch === null) {
          this.moveTouch = { id: touch.identifier, startX: x, startY: y, x, y };
        } else if (this.aimTouch === null) {
          this.aimTouch = { id: touch.identifier, startX: x, startY: y, x, y };
          this.touchFireHeld = true;
        }
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', (event) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      for (const touch of event.changedTouches) {
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        if (this.moveTouch && touch.identifier === this.moveTouch.id) {
          this.moveTouch.x = x;
          this.moveTouch.y = y;
        } else if (this.aimTouch && touch.identifier === this.aimTouch.id) {
          this.aimTouch.x = x;
          this.aimTouch.y = y;
        }
      }
    }, { passive: false });
    const endTouch = (event) => {
      for (const touch of event.changedTouches) {
        if (this.moveTouch && touch.identifier === this.moveTouch.id) {
          const moved = Math.hypot(
            this.moveTouch.x - this.moveTouch.startX,
            this.moveTouch.y - this.moveTouch.startY,
          );
          if (moved < 12) this.tapped = { x: this.moveTouch.startX, y: this.moveTouch.startY };
          this.moveTouch = null;
        } else if (this.aimTouch && touch.identifier === this.aimTouch.id) {
          // A quick tap on the aim half is a tap too: without this, taps
          // on the on-screen DASH pad (and on draft cards) never reached
          // the game, because only the move stick ever recorded a tap.
          const moved = Math.hypot(
            this.aimTouch.x - this.aimTouch.startX,
            this.aimTouch.y - this.aimTouch.startY,
          );
          if (moved < 12) this.tapped = { x: this.aimTouch.startX, y: this.aimTouch.startY };
          this.aimTouch = null;
          this.touchFireHeld = false;
        }
      }
    };
    canvas.addEventListener('touchend', endTouch);
    canvas.addEventListener('touchcancel', endTouch);
  }

  // Movement vector, normalised, from keys or the touch stick.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (this.moveTouch) {
      const dx = (this.moveTouch.x - this.moveTouch.startX) / 48;
      const dy = (this.moveTouch.y - this.moveTouch.startY) / 48;
      x += Math.max(-1, Math.min(1, dx));
      y += Math.max(-1, Math.min(1, dy));
    }
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    return { x, y };
  }

  // Aim point in canvas CSS pixels: mouse, or the aim touch.
  aimPoint() {
    if (this.aimTouch) return { x: this.aimTouch.x, y: this.aimTouch.y };
    return { x: this.mouseX, y: this.mouseY };
  }

  firing() {
    return this.mouseDown || this.keys.has('Space') || this.touchFireHeld;
  }

  dashPressed() {
    const pressed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')
      || this.rightClicked === true || this.touchDashQueued;
    this.rightClicked = false;
    this.touchDashQueued = false;
    return pressed;
  }

  // An edge-triggered press: true once per keydown, even when the key was
  // released before the next frame. A press older than 250 ms is stale —
  // it must not fire in a state the player entered long after tapping.
  pressed(code) {
    const at = this.queued.get(code);
    if (at === undefined) return false;
    this.queued.delete(code);
    return performance.now() - at < 250;
  }

  clicked() {
    if (!this.mouseClicked && !this.tapped) return null;
    const point = this.tapped ?? { x: this.mouseX, y: this.mouseY };
    this.mouseClicked = false;
    this.tapped = null;
    return point;
  }

  // Called by the renderer when a touch lands inside the on-screen DASH pad.
  queueTouchDash() {
    this.touchDashQueued = true;
  }
}
