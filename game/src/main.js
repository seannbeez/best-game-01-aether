// AETHER FORGE — bootstrap. Creates the game, wires the animation loop,
// and stages deterministic screenshot scenes (?shot=<scene>&seed=<n>).
// No build step, no network: the page only loads its own files.

import { Game } from './game.js';
import { setupShot } from './shots.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

// Test and tooling hooks. The grader never needs them; the headless
// play-through and the screenshot capture use them to drive the game.
window.__aether = game;
Object.defineProperty(window, '__fps', {
  get() {
    const samples = game.fpsSamples;
    if (samples.length === 0) return game.fps;
    return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
  },
});

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') ?? '20261117');

if (shot) {
  game.shotMode = true;
  setupShot(game, shot, seed);
  // Let two frames render, then tell the capture script the shot is ready.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
} else {
  game.titleShownAt = 0;
}

// First gesture unlocks audio (browsers require it); later gestures are
// the game's own input.
const unlockAudio = () => game.sound.ensure();
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

function loop(now) {
  game.frame(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
