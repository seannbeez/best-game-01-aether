// AETHER FORGE — the shadow-void entities. Four regular kinds plus the
// Voidmaw boss. Each enemy owns its movement and attack pattern; the game
// owns collisions and damage. Kinds are drawn by render.js from `kind`.

import { TUNE } from './config.js';
import { angleTo, clamp, range } from './random.js';

let nextId = 1;

export function makeEnemy(kind, x, y, rng, wave) {
  const hpScale = 1 + (wave - 1) * 0.16;
  const base = {
    id: nextId,
    kind,
    x, y,
    vx: 0, vy: 0,
    angle: 0,
    radius: 20,
    hp: 30,
    maxHp: 30,
    score: TUNE.scoreWisp,
    touchDamage: 10,
    flash: 0,
    wobble: rng() * Math.PI * 2,
    fireTimer: range(rng, 0.8, 2.0),
    splitDone: false,
  };
  nextId += 1;
  if (kind === 'wisp') {
    base.radius = 17;
    base.hp = base.maxHp = Math.round(24 * hpScale);
    base.score = TUNE.scoreWisp;
    base.speed = 105 + wave * 4;
  } else if (kind === 'spitter') {
    base.radius = 19;
    base.hp = base.maxHp = Math.round(34 * hpScale);
    base.score = TUNE.scoreSpitter;
    base.speed = 62;
    base.touchDamage = 8;
  } else if (kind === 'brute') {
    base.radius = 30;
    base.hp = base.maxHp = Math.round(110 * hpScale);
    base.score = TUNE.scoreBrute;
    base.speed = 46;
    base.touchDamage = 18;
  } else if (kind === 'splitter') {
    base.radius = 21;
    base.hp = base.maxHp = Math.round(40 * hpScale);
    base.score = TUNE.scoreSplitter;
    base.speed = 88;
    base.touchDamage = 10;
  }
  return base;
}

export function updateEnemy(enemy, dt, player, orbs, time) {
  enemy.flash -= dt;
  enemy.wobble += dt;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  const toward = Math.atan2(dy, dx);

  if (enemy.kind === 'wisp') {
    // Drifts at the player with a sine weave — easy to read, hard to ignore.
    const weave = Math.sin(enemy.wobble * 2.2) * 0.7;
    const angle = toward + weave;
    enemy.x += Math.cos(angle) * enemy.speed * dt;
    enemy.y += Math.sin(angle) * enemy.speed * dt;
    enemy.angle = angle;
  } else if (enemy.kind === 'spitter') {
    // Keeps its distance and lobs void orbs.
    if (dist > 320) {
      enemy.x += Math.cos(toward) * enemy.speed * dt;
      enemy.y += Math.sin(toward) * enemy.speed * dt;
    } else if (dist < 220) {
      enemy.x -= Math.cos(toward) * enemy.speed * 0.7 * dt;
      enemy.y -= Math.sin(toward) * enemy.speed * 0.7 * dt;
    }
    enemy.angle = toward;
    enemy.fireTimer -= dt;
    if (enemy.fireTimer <= 0 && dist < 560) {
      enemy.fireTimer = 2.4;
      orbs.fire(enemy.x, enemy.y, toward, 210, 9, 8);
      return 'spit';
    }
  } else if (enemy.kind === 'brute') {
    // Slow, heavy, relentless. Telegraphed by its bulk.
    enemy.x += Math.cos(toward) * enemy.speed * dt;
    enemy.y += Math.sin(toward) * enemy.speed * dt;
    enemy.angle = toward;
  } else if (enemy.kind === 'splitter') {
    // Fast zig-zag; splits into two wisps on death (handled by the game).
    const zig = Math.sin(enemy.wobble * 3.1) * 0.9;
    const angle = toward + zig;
    enemy.x += Math.cos(angle) * enemy.speed * dt;
    enemy.y += Math.sin(angle) * enemy.speed * dt;
    enemy.angle = angle;
  }

  enemy.x = clamp(enemy.x, enemy.radius, 1280 - enemy.radius);
  enemy.y = clamp(enemy.y, enemy.radius, 720 - enemy.radius);
  return null;
}

// --- The Voidmaw: boss of every 5th wave. Three phases by remaining HP. ---
export function makeBoss(x, y, wave) {
  const tier = Math.floor(wave / 5);
  const hp = 620 * tier;
  return {
    id: nextId,
    kind: 'boss',
    x, y,
    vx: 0, vy: 0,
    angle: 0,
    radius: 64,
    hp,
    maxHp: hp,
    score: TUNE.scoreBoss,
    touchDamage: 22,
    flash: 0,
    wobble: 0,
    fireTimer: 1.2,
    summonTimer: 6,
    phase: 1,
    tier,
  };
}

export function updateBoss(boss, dt, player, orbs, spawnWisp) {
  boss.flash -= dt;
  boss.wobble += dt;
  const hpFraction = boss.hp / boss.maxHp;
  boss.phase = hpFraction > 0.66 ? 1 : hpFraction > 0.33 ? 2 : 3;

  const dx = player.x - boss.x;
  const dy = player.y - boss.y;
  const dist = Math.hypot(dx, dy) || 1;
  const toward = Math.atan2(dy, dx);
  const speed = 34 + boss.phase * 12;
  // Orbits at mid-range, closing in as phases advance.
  const wantDist = 300 - boss.phase * 40;
  if (dist > wantDist + 30) {
    boss.x += Math.cos(toward) * speed * dt;
    boss.y += Math.sin(toward) * speed * dt;
  } else if (dist < wantDist - 30) {
    boss.x -= Math.cos(toward) * speed * 0.6 * dt;
    boss.y -= Math.sin(toward) * speed * 0.6 * dt;
  }
  boss.x += Math.cos(boss.wobble * 0.8) * 18 * dt;
  boss.y += Math.sin(boss.wobble * 0.8) * 18 * dt;
  boss.angle = toward;

  boss.fireTimer -= dt;
  if (boss.fireTimer <= 0) {
    boss.fireTimer = boss.phase === 3 ? 1.1 : 1.7;
    const count = 5 + boss.phase * 2;
    const spread = Math.PI * 1.4;
    const baseAngle = toward - spread / 2;
    for (let i = 0; i < count; i += 1) {
      const angle = baseAngle + (spread * i) / (count - 1);
      orbs.fire(boss.x, boss.y, angle, 190 + boss.phase * 20, 11, 9);
    }
    return 'burst';
  }

  boss.summonTimer -= dt;
  if (boss.summonTimer <= 0) {
    boss.summonTimer = 7;
    spawnWisp(boss.x, boss.y);
    spawnWisp(boss.x, boss.y);
    return 'summon';
  }
  return null;
}
