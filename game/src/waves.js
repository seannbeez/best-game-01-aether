// AETHER FORGE — the wave director: builds each wave's roster, trickles
// enemies in from the arena edges, and calls the boss on every 5th wave.
// A wave clears when its roster is fully spawned and every foe is dead.

import { TUNE } from './config.js';
import { range } from './random.js';

export class WaveDirector {
  constructor() {
    this.wave = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.betweenWaves = 0;
    this.bossSpawned = false;
    this.boss = null;
  }

  reset() {
    this.wave = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.betweenWaves = 0;
    this.bossSpawned = false;
    this.boss = null;
  }

  get isBossWave() {
    return this.wave > 0 && this.wave % TUNE.bossEveryWaves === 0;
  }

  // Roster for a wave: wisps always, spitters from wave 2, splitters from
  // wave 3, brutes from wave 4; size grows ~20% a wave.
  buildRoster(wave, rng) {
    const count = Math.round(6 + wave * 2.2);
    const roster = [];
    for (let i = 0; i < count; i += 1) {
      const roll = rng();
      if (wave >= 4 && roll < 0.14) roster.push('brute');
      else if (wave >= 3 && roll < 0.32) roster.push('splitter');
      else if (wave >= 2 && roll < 0.55) roster.push('spitter');
      else roster.push('wisp');
    }
    return roster;
  }

  startWave(wave, rng) {
    this.wave = wave;
    this.spawnQueue = this.buildRoster(wave, rng);
    this.spawnTimer = 0.4;
    this.bossSpawned = false;
    this.boss = null;
  }

  startBossWave(wave, rng) {
    this.wave = wave;
    this.spawnQueue = this.buildRoster(wave, rng).slice(0, 6);
    this.spawnTimer = 0.4;
    this.bossSpawned = false;
    this.boss = null;
  }

  edgePoint(rng, arena) {
    const side = Math.floor(rng() * 4);
    const margin = 30;
    if (side === 0) return { x: range(rng, margin, arena.width - margin), y: margin };
    if (side === 1) return { x: range(rng, margin, arena.width - margin), y: arena.height - margin };
    if (side === 2) return { x: margin, y: range(rng, margin, arena.height - margin) };
    return { x: arena.width - margin, y: range(rng, margin, arena.height - margin) };
  }

  // Returns a spawn event ({ kind, x, y } or { boss: true }) or null.
  update(dt, rng, arena, enemyCount) {
    if (this.betweenWaves > 0) {
      this.betweenWaves -= dt;
      return null;
    }
    if (this.isBossWave && !this.bossSpawned && this.spawnQueue.length === 0) {
      this.bossSpawned = true;
      return { boss: true, x: arena.width / 2, y: 110 };
    }
    if (this.spawnQueue.length === 0) return null;
    // Keep at most 9 foes alive at once; the queue waits otherwise.
    if (enemyCount >= 9) return null;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(0.35, 0.9 - this.wave * 0.04);
      const kind = this.spawnQueue.shift();
      const point = this.edgePoint(rng, arena);
      return { kind, x: point.x, y: point.y };
    }
    return null;
  }

  get waveCleared() {
    return this.spawnQueue.length === 0 && !this.boss;
  }
}
