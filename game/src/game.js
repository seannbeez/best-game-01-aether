// AETHER FORGE — the Game: state machine, fixed-step loop, collisions,
// heat / combo / Overdrive, the relic draft, waves and the boss, scoring,
// hit-stop, screen shake and near-miss / parry detection. Rendering lives
// in render.js; this file owns what happens, not what it looks like.

import { TUNE, PALETTE } from './config.js';
import { clamp, mulberry32 } from './random.js';
import { ForgeDefender } from './player.js';
import { BoltPool, OrbPool } from './bullets.js';
import { Particles } from './particles.js';
import { makeEnemy, makeBoss, updateEnemy, updateBoss } from './enemies.js';
import { WaveDirector } from './waves.js';
import { rollDraft, applyRelic } from './relics.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import {
  drawBackground, drawPlayer, drawEnemy, drawBolts, drawOrbs,
  drawHud, drawTitle, drawDraft, drawPause, drawGameOver, drawVictory,
  drawTouchControls, toLogical,
} from './render.js';

const STEP = 1 / 60;
const BEST_KEY = 'aether-forge-best';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.sound = new SoundEngine();
    this.particles = new Particles();
    this.bolts = new BoltPool();
    this.orbs = new OrbPool();
    this.player = new ForgeDefender(640, 460);
    this.waveDirector = new WaveDirector();
    this.rng = Math.random;
    this.enemies = [];
    this.boss = null;
    this.motes = [];

    this.state = 'title';
    this.paused = false;
    this.muted = false;
    this.time = 0;
    this.titleShownAt = 0;
    this.draftShownAt = 0;
    this.draftCards = [];
    this.draftIn = TUNE.draftEverySeconds;
    this.score = 0;
    this.best = 0;
    this.wave = 0;
    this.kills = 0;
    this.parries = 0;
    this.heat = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.overdriveTimer = 0;
    this.hitStop = 0;
    this.shake = 0;
    this.waveBanner = 0;
    this.waveBannerText = '';
    this.waveBonusAwarded = false;
    this.freezeSim = false;
    this.shotMode = false;
    this.view = { scale: 1, offsetX: 0, offsetY: 0, width: 1280, height: 720 };
    this.accumulator = 0;
    this.lastFrame = 0;
    this.frameCount = 0;
    this.fps = 60;
    this.fpsSamples = [];
    this.attract = [];
    this.stateEnteredAt = 0;

    try {
      this.best = Number(window.localStorage.getItem(BEST_KEY) ?? 0) || 0;
    } catch {
      this.best = 0;
    }

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssWidth = this.canvas.clientWidth || 1280;
    const cssHeight = this.canvas.clientHeight || 720;
    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round(cssHeight * dpr);
    const scale = Math.min(cssWidth / TUNE.arenaWidth, cssHeight / TUNE.arenaHeight);
    this.view = {
      scale,
      offsetX: (cssWidth - TUNE.arenaWidth * scale) / 2,
      offsetY: (cssHeight - TUNE.arenaHeight * scale) / 2,
      width: cssWidth,
      height: cssHeight,
      dpr,
    };
  }

  startRun() {
    this.player.reset(640, 460);
    this.enemies = [];
    this.boss = null;
    this.motes = [];
    this.bolts.clear();
    this.orbs.clear();
    this.particles.clear();
    this.waveDirector.reset();
    this.score = 0;
    this.wave = 0;
    this.kills = 0;
    this.parries = 0;
    this.heat = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.overdriveTimer = 0;
    this.hitStop = 0;
    this.shake = 0;
    this.draftIn = TUNE.draftEverySeconds;
    this.paused = false;
    this.waveBonusAwarded = false;
    this.freezeSim = false;
    this.state = 'playing';
    this.stateEnteredAt = this.time;
    this.startWave(1);
  }

  startWave(number) {
    this.wave = number;
    if (number % TUNE.bossEveryWaves === 0) {
      this.waveDirector.startBossWave(number, this.rng);
      this.waveBannerText = `WAVE ${number} — THE VOIDMAW STIRS`;
    } else {
      this.waveDirector.startWave(number, this.rng);
      this.waveBannerText = `WAVE ${number}`;
    }
    this.waveBanner = 2.2;
  }

  saveBest() {
    if (this.score > this.best) {
      this.best = this.score;
      try {
        window.localStorage.setItem(BEST_KEY, String(this.best));
      } catch {
        // Private mode: the best score simply does not persist.
      }
    }
  }

  // --- main loop -----------------------------------------------------------
  frame(now) {
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000 || 0);
    this.lastFrame = now;
    this.frameCount += 1;
    if (this.frameCount % 30 === 0) {
      this.fps = Math.round(1 / Math.max(dt, 0.001));
      this.fpsSamples.push(this.fps);
      if (this.fpsSamples.length > 40) this.fpsSamples.shift();
    }

    if (!this.freezeSim) {
      this.accumulator += dt;
      let steps = 0;
      while (this.accumulator >= STEP && steps < 5) {
        this.update(STEP);
        this.accumulator -= STEP;
        steps += 1;
      }
      if (steps === 5) this.accumulator = 0;
    }
    this.render();
  }

  update(dt) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 26);
    this.waveBanner = Math.max(0, this.waveBanner - dt);
    this.particles.update(dt);

    if (this.state === 'title') {
      this.updateAttract(dt);
      this.handleTitleInput();
      return;
    }
    if (this.state === 'draft') {
      this.handleDraftInput();
      return;
    }
    if (this.state === 'gameover' || this.state === 'victory') {
      this.handleEndInput();
      return;
    }
    if (this.paused) {
      if (this.input.pressed('KeyP')) this.paused = false;
      const click = this.input.clicked();
      if (click && this.hitPauseButton(click)) this.paused = false;
      return;
    }

    // Global keys.
    if (this.input.pressed('KeyP')) {
      this.paused = true;
      return;
    }
    if (this.input.pressed('KeyM')) this.toggleMute();
    const click = this.input.clicked();
    if (click) this.handleHudClick(click);

    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }

    // Player.
    const move = this.input.moveVector();
    const aimCss = this.input.aimPoint();
    const aim = toLogical(this.view, aimCss.x, aimCss.y);
    const wantFire = this.input.firing();
    const wantDash = this.input.dashPressed();
    const leftTrail = this.player.update(
      dt, move, aim.x, aim.y, wantDash, wantFire,
      { width: TUNE.arenaWidth, height: TUNE.arenaHeight },
      (player) => this.fireVolley(player),
      () => this.sound.blip(300, 0.12, 'sine', 0.1),
    );
    if (leftTrail) {
      this.particles.trail(this.player.x, this.player.y, PALETTE.gold, 5);
    }

    // Draft countdown.
    this.draftIn -= dt;
    if (this.draftIn <= 0 && this.state === 'playing') {
      this.openDraft();
      return;
    }

    // Overdrive + combo timers.
    if (this.overdriveTimer > 0) {
      this.overdriveTimer -= dt;
      if (this.overdriveTimer <= 0) {
        this.sound.setOverdrive(false);
        this.heat = 0;
      }
    } else {
      this.heat = Math.max(0, this.heat - TUNE.heatDecayPerSecond * dt);
    }
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    this.updateCombat(dt);
    this.updateWaves(dt);
    this.updateMotes(dt);

    // Death / victory checks.
    if (!this.player.alive && this.state === 'playing') {
      this.state = 'gameover';
      this.stateEnteredAt = this.time;
      this.saveBest();
      this.sound.gameOver();
      this.sound.setOverdrive(false);
      this.particles.burst(this.player.x, this.player.y, PALETTE.emberRed, 60, 420, 1.1, 5);
      this.particles.ring(this.player.x, this.player.y, PALETTE.emberRed, 190);
      this.shake = 14;
    }
  }

  updateCombat(dt) {
    const player = this.player;

    // Spawn director.
    const spawn = this.waveDirector.update(
      dt, this.rng,
      { width: TUNE.arenaWidth, height: TUNE.arenaHeight },
      this.enemies.length + (this.boss ? 1 : 0),
    );
    if (spawn) {
      if (spawn.boss) {
        this.boss = makeBoss(spawn.x, spawn.y, this.wave);
        this.waveDirector.boss = this.boss;
        this.sound.bossRoar();
        this.shake = 10;
        this.waveBannerText = 'THE VOIDMAW AWAKENS';
        this.waveBanner = 2.2;
      } else {
        this.enemies.push(makeEnemy(spawn.kind, spawn.x, spawn.y, this.rng, this.wave));
      }
    }

    // Enemies.
    for (const enemy of this.enemies) {
      const step = enemy.slowTimer > 0 ? dt * 0.5 : dt;
      if (enemy.slowTimer > 0) enemy.slowTimer -= dt;
      updateEnemy(enemy, step, player, this.orbs, this.time);
    }
    if (this.boss) {
      updateBoss(this.boss, dt, player, this.orbs, (x, y) => {
        this.enemies.push(makeEnemy('wisp', x + 40, y + 40, this.rng, this.wave));
      });
    }

    // Bolts vs enemies.
    this.bolts.update(dt, { width: TUNE.arenaWidth, height: TUNE.arenaHeight });
    for (let i = this.bolts.bolts.length - 1; i >= 0; i -= 1) {
      const bolt = this.bolts.bolts[i];
      let consumed = false;
      for (const target of [...this.enemies, ...(this.boss ? [this.boss] : [])]) {
        if (bolt.hitIds.has(target.id)) continue;
        const dx = bolt.x - target.x;
        const dy = bolt.y - target.y;
        const reach = bolt.radius + target.radius;
        if (dx * dx + dy * dy < reach * reach) {
          bolt.hitIds.add(target.id);
          this.damageEnemy(target, bolt.damage, bolt);
          this.particles.burst(bolt.x, bolt.y, '#ffd94d', 6, 180, 0.35, 3);
          if (bolt.pierce > 0) {
            bolt.pierce -= 1;
          } else {
            consumed = true;
          }
          break;
        }
      }
      if (consumed) this.bolts.remove(bolt);
    }

    // Orbs: parry, near-miss, and hits.
    this.orbs.update(dt, { width: TUNE.arenaWidth, height: TUNE.arenaHeight });
    for (let i = this.orbs.orbs.length - 1; i >= 0; i -= 1) {
      const orb = this.orbs.orbs[i];
      const dx = orb.x - player.x;
      const dy = orb.y - player.y;
      const distSq = dx * dx + dy * dy;
      if (player.tryParry(orb.x, orb.y)) {
        this.orbs.remove(orb);
        this.parryOrb(orb);
        continue;
      }
      const hitReach = orb.radius + player.radius;
      if (distSq < hitReach * hitReach) {
        this.orbs.remove(orb);
        if (player.takeHit(orb.damage)) {
          this.sound.hit();
          this.shake = 8;
          this.combo = 0;
          this.particles.burst(player.x, player.y, PALETTE.emberRed, 18, 300, 0.6, 4);
        }
        continue;
      }
      if (!orb.nearMissed && distSq < TUNE.nearMissRadius * TUNE.nearMissRadius) {
        orb.nearMissed = true;
        this.addHeat(TUNE.heatPerNearMiss);
        this.particles.text(player.x, player.y - 34, 'NEAR MISS +HEAT', PALETTE.frost, 13);
      }
    }

    // Touch damage from enemies.
    for (const enemy of [...this.enemies, ...(this.boss ? [this.boss] : [])]) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const reach = enemy.radius + player.radius - 4;
      if (dx * dx + dy * dy < reach * reach) {
        if (player.takeHit(enemy.touchDamage)) {
          this.sound.hit();
          this.shake = 9;
          this.combo = 0;
          // Shove the enemy back so one touch is not a death spiral.
          const dist = Math.hypot(dx, dy) || 1;
          enemy.x += (dx / dist) * 40;
          enemy.y += (dy / dist) * 40;
        }
      }
    }

    // Dead enemies.
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      if (this.enemies[i].hp <= 0) this.killEnemy(this.enemies[i], i);
    }
    if (this.boss && this.boss.hp <= 0) this.killBoss();
  }

  updateWaves(dt) {
    if (this.state !== 'playing') return;
    if (!this.waveDirector.waveCleared || this.enemies.length !== 0 || this.boss) return;
    // The spawn director owns the between-waves countdown; this method only
    // pays the clear bonus once and opens the next wave when it elapses.
    if (!this.waveBonusAwarded) {
      this.waveBonusAwarded = true;
      this.waveDirector.betweenWaves = 2.5;
      const bonus = TUNE.waveClearBonus + this.wave * 25;
      this.addScore(bonus, 640, 300, `WAVE CLEAR +${bonus}`);
      this.player.heal(8);
      return;
    }
    if (this.waveDirector.betweenWaves <= 0) {
      this.waveBonusAwarded = false;
      this.startWave(this.wave + 1);
    }
  }

  updateMotes(dt) {
    const player = this.player;
    for (let i = this.motes.length - 1; i >= 0; i -= 1) {
      const mote = this.motes[i];
      mote.life -= dt;
      const dx = player.x - mote.x;
      const dy = player.y - mote.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < player.magnetRadius) {
        mote.x += (dx / dist) * 520 * dt;
        mote.y += (dy / dist) * 520 * dt;
      } else {
        mote.x += mote.vx * dt;
        mote.y += mote.vy * dt;
        mote.vx *= 0.98;
        mote.vy *= 0.98;
      }
      if (dist < 30) {
        this.addScore(mote.value, mote.x, mote.y, null);
        this.motes.splice(i, 1);
        continue;
      }
      if (mote.life <= 0) this.motes.splice(i, 1);
    }
  }

  // --- combat helpers ------------------------------------------------------
  fireVolley(player) {
    const spread = player.shotsPerVolley > 1 ? 0.16 : 0;
    const count = player.shotsPerVolley;
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * spread;
      const angle = player.aimAngle + offset;
      const muzzle = player.radius + 10;
      this.bolts.fire(
        player.x + Math.cos(angle) * muzzle,
        player.y + Math.sin(angle) * muzzle,
        angle,
        player.boltDamage * (this.overdriveTimer > 0 ? 1.5 : 1),
        player.element,
        player.boltPierce,
        player.boltChains,
        TUNE.boltSpeed,
      );
    }
    this.sound.shoot();
  }

  damageEnemy(target, damage, bolt) {
    target.hp -= damage;
    target.flash = 0.12;
    if (bolt && bolt.element === 'frost') target.slowTimer = 1.2;
    this.sound.hit();
  }

  killEnemy(enemy, index) {
    this.enemies.splice(index, 1);
    this.kills += 1;
    this.combo += 1;
    this.comboTimer = TUNE.comboWindow;
    this.addHeat(TUNE.heatPerKill);
    if (this.combo > 0 && this.combo % 5 === 0) {
      this.sound.comboChime(this.combo);
      this.particles.text(enemy.x, enemy.y - 24, `COMBO x${this.combo}`, PALETTE.gold, 18);
    }
    const value = Math.round(enemy.score * (this.overdriveTimer > 0 ? 3 : 1)
      * (this.player.scoreBonus ?? 1));
    this.addScore(value, enemy.x, enemy.y, `+${value}`);
    this.particles.burst(enemy.x, enemy.y, '#c04df0', 22, 300, 0.7, 4);
    this.particles.burst(enemy.x, enemy.y, '#ff9a3c', 10, 200, 0.5, 3);
    this.particles.ring(enemy.x, enemy.y, '#c04df0', 70);
    this.sound.explosion();
    if (enemy.kind === 'brute') {
      this.hitStop = 0.06;
      this.shake = Math.max(this.shake, 7);
    }
    // Ember Heart: the kill bursts and scorches nearby foes.
    if (this.player.element === 'ember') {
      for (const other of this.enemies) {
        if (other === enemy) continue;
        const dx = other.x - enemy.x;
        const dy = other.y - enemy.y;
        if (dx * dx + dy * dy < 110 * 110) {
          other.hp -= Math.round(this.player.boltDamage * 0.6);
          other.flash = 0.12;
        }
      }
    }
    // Chain Coil: the killing bolt leaps to nearby foes.
    if (this.player.boltChains > 0) {
      let chained = 0;
      const near = [...this.enemies]
        .filter((other) => other !== enemy)
        .sort((a, b) => {
          const da = (a.x - enemy.x) ** 2 + (a.y - enemy.y) ** 2;
          const db = (b.x - enemy.x) ** 2 + (b.y - enemy.y) ** 2;
          return da - db;
        });
      for (const other of near) {
        if (chained >= this.player.boltChains) break;
        const dx = other.x - enemy.x;
        const dy = other.y - enemy.y;
        if (dx * dx + dy * dy > 240 * 240) break;
        other.hp -= this.player.boltDamage;
        other.flash = 0.12;
        this.particles.burst(other.x, other.y, PALETTE.gold, 8, 220, 0.4, 3);
        chained += 1;
      }
    }
    // Splitters burst into two wisps.
    if (enemy.kind === 'splitter') {
      for (const offset of [-26, 26]) {
        const wisp = makeEnemy('wisp', enemy.x + offset, enemy.y, this.rng, this.wave);
        this.enemies.push(wisp);
      }
    }
    // Score motes scatter; the Lodestone relic pulls them in from afar.
    for (let i = 0; i < 3; i += 1) {
      const angle = (i / 3) * Math.PI * 2 + this.rng() * 0.8;
      this.motes.push({
        x: enemy.x, y: enemy.y,
        vx: Math.cos(angle) * 90, vy: Math.sin(angle) * 90,
        value: 10, life: 5,
      });
    }
  }

  killBoss() {
    const boss = this.boss;
    this.boss = null;
    this.waveDirector.boss = null;
    this.kills += 1;
    this.combo += 1;
    this.comboTimer = TUNE.comboWindow;
    this.addScore(TUNE.scoreBoss, boss.x, boss.y, `+${TUNE.scoreBoss}`);
    this.particles.burst(boss.x, boss.y, '#c04df0', 80, 480, 1.2, 6);
    this.particles.burst(boss.x, boss.y, '#ffd94d', 40, 380, 1.0, 5);
    this.particles.ring(boss.x, boss.y, '#ffd94d', 260);
    this.sound.explosion();
    this.hitStop = 0.12;
    this.shake = 16;
    if (this.wave >= TUNE.victoryWave) {
      this.state = 'victory';
      this.stateEnteredAt = this.time;
      this.saveBest();
      this.sound.victory();
      this.sound.setOverdrive(false);
    } else {
      this.waveBannerText = 'VOIDMAW SHATTERED';
      this.waveBanner = 2.2;
    }
  }

  parryOrb(orb) {
    this.parries += 1;
    this.addHeat(TUNE.heatPerParry);
    this.sound.parry();
    this.particles.ring(this.player.x, this.player.y, PALETTE.gold, 90);
    this.particles.text(this.player.x, this.player.y - 40, 'PARRY!', PALETTE.gold, 20);
    // The parried orb flies back as a golden bolt at the nearest foe.
    const targets = [...this.enemies, ...(this.boss ? [this.boss] : [])];
    if (targets.length > 0) {
      let nearest = targets[0];
      let nearestDist = Infinity;
      for (const target of targets) {
        const dist = (target.x - this.player.x) ** 2 + (target.y - this.player.y) ** 2;
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = target;
        }
      }
      const angle = Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x);
      this.bolts.fire(this.player.x, this.player.y, angle, 30, 'volt', 0, 0, 900);
    }
    this.addScore(25, this.player.x, this.player.y - 56, '+25');
  }

  addHeat(amount) {
    if (this.overdriveTimer > 0) return;
    this.heat = clamp(this.heat + amount * this.player.heatGain, 0, TUNE.heatMax);
    if (this.heat >= TUNE.heatMax) {
      this.overdriveTimer = TUNE.overdriveDuration;
      this.sound.setOverdrive(true);
      this.sound.overdriveStart();
      this.particles.ring(this.player.x, this.player.y, PALETTE.gold, 200);
      this.particles.text(this.player.x, this.player.y - 52, 'OVERDRIVE!', PALETTE.gold, 26);
      this.shake = 8;
    }
  }

  addScore(value, x, y, label) {
    this.score += value;
    if (label && x !== null && x !== undefined) {
      this.particles.text(x, y, label, PALETTE.gold, 15);
    }
  }

  openDraft() {
    this.draftCards = rollDraft(this.rng, this.player.relicNames.map((name) => {
      const found = { 'Twin Gears': 'twin-gears', 'Overclock Spring': 'overclock', 'Heavy Ordnance': 'heavy-ordnance', 'Chain Coil': 'chain-coil', 'Piercing Runes': 'piercing-runes', 'Frost Core': 'frost-core', 'Ember Heart': 'ember-heart', 'Aegis Plating': 'aegis-plating', Lodestone: 'lodestone', 'Heat Sink': 'heat-sink', 'Quicksilver Dash': 'quick-dash', 'Gilded Core': 'gilded-core' };
      return found[name] ?? name;
    }));
    this.state = 'draft';
    this.draftShownAt = this.time;
    this.sound.draft();
  }

  pickRelic(index) {
    const relic = this.draftCards[index];
    if (!relic) return;
    applyRelic(this.player, relic);
    this.sound.relicPick();
    this.particles.text(this.player.x, this.player.y - 44, relic.name.toUpperCase(), PALETTE.gold, 20);
    this.particles.ring(this.player.x, this.player.y, PALETTE.gold, 120);
    this.draftCards = [];
    this.draftIn = TUNE.draftEverySeconds;
    this.state = 'playing';
  }

  toggleMute() {
    this.muted = !this.muted;
    this.sound.setMuted(this.muted);
  }

  // --- attract mode (title background) --------------------------------------
  updateAttract(dt) {
    if (this.attract.length < 5) {
      const kinds = ['wisp', 'wisp', 'spitter', 'splitter'];
      const kind = kinds[this.attract.length % kinds.length];
      this.attract.push(makeEnemy(kind, 150 + this.attract.length * 200, 500, Math.random, 1));
    }
    const centre = { x: 640, y: 360 };
    // A dummy orb pool: attract-mode spitters must not fire real orbs into
    // the live pool while the title is showing.
    const dummyOrbs = { fire() {} };
    for (const enemy of this.attract) {
      updateEnemy(enemy, dt, centre, dummyOrbs, this.time);
      // Keep the drifters roaming the edges instead of piling up at the
      // centre behind the title panel.
      const dx = enemy.x - centre.x;
      const dy = enemy.y - centre.y;
      if (dx * dx + dy * dy < 90 * 90) {
        enemy.x = 60 + Math.random() * 1160;
        enemy.y = Math.random() < 0.5 ? 50 : 670;
      }
    }
  }

  handleTitleInput() {
    if (this.input.pressed('Space') || this.input.pressed('Enter')) {
      this.sound.ensure();
      this.startRun();
      return;
    }
    const click = this.input.clicked();
    if (click) {
      const point = toLogical(this.view, click.x, click.y);
      if (point.x > 510 && point.x < 770 && point.y > 498 && point.y < 558) {
        this.sound.ensure();
        this.startRun();
      }
    }
  }

  handleDraftInput() {
    for (const code of ['Digit1', 'Digit2', 'Digit3']) {
      if (this.input.pressed(code)) {
        this.pickRelic(Number(code.slice(-1)) - 1);
        return;
      }
    }
    const click = this.input.clicked();
    if (!click) return;
    const point = toLogical(this.view, click.x, click.y);
    for (let i = 0; i < 3; i += 1) {
      const x = 190 + i * 310;
      if (point.x > x && point.x < x + 260 && point.y > 190 && point.y < 490) {
        this.pickRelic(i);
        return;
      }
    }
  }

  handleEndInput() {
    if (this.input.pressed('KeyR') || this.input.pressed('Enter') || this.input.pressed('Space')) {
      this.startRun();
      return;
    }
    const click = this.input.clicked();
    if (!click) return;
    const point = toLogical(this.view, click.x, click.y);
    const y = this.state === 'victory' ? 420 : 446;
    if (point.x > 510 && point.x < 770 && point.y > y && point.y < y + 60) {
      this.startRun();
    }
  }

  handleHudClick(click) {
    const point = toLogical(this.view, click.x, click.y);
    if (Math.hypot(point.x - 1206, point.y - 668) < 24) {
      this.toggleMute();
      return;
    }
    if (Math.hypot(point.x - 1152, point.y - 668) < 24) {
      this.paused = true;
      return;
    }
    if (this.input.touchActive && Math.hypot(point.x - 1080, point.y - 600) < 48) {
      this.input.queueTouchDash();
    }
  }

  hitPauseButton(click) {
    const point = toLogical(this.view, click.x, click.y);
    return Math.hypot(point.x - 1152, point.y - 668) < 24;
  }

  // --- render ----------------------------------------------------------------
  render() {
    const ctx = this.ctx;
    const view = this.view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#120a1e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const scale = view.scale * view.dpr;
    const shakeX = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const shakeY = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    ctx.setTransform(
      scale, 0, 0, scale,
      (view.offsetX + shakeX) * view.dpr,
      (view.offsetY + shakeY) * view.dpr,
    );

    drawBackground(ctx, this.time, this.overdriveTimer > 0);

    if (this.state === 'title') {
      for (const enemy of this.attract) drawEnemy(ctx, enemy, this.time);
      drawTitle(ctx, this, this.time);
      return;
    }

    drawBolts(ctx, this.bolts.bolts);
    drawOrbs(ctx, this.orbs.orbs);
    for (const enemy of this.enemies) drawEnemy(ctx, enemy, this.time);
    if (this.boss) drawEnemy(ctx, this.boss, this.time);
    this.drawMotes(ctx);
    drawPlayer(ctx, this.player, this.time, this.overdriveTimer > 0);
    this.particles.draw(ctx);
    drawHud(ctx, this);

    if (this.waveBanner > 0 && this.state === 'playing') {
      const alpha = clamp(this.waveBanner / 0.6, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.font = '700 40px Georgia, serif';
      ctx.fillStyle = PALETTE.gold;
      ctx.shadowColor = '#ff9a3c';
      ctx.shadowBlur = 22;
      ctx.fillText(this.waveBannerText, 640, 240);
      ctx.restore();
    }

    if (this.input.touchActive) drawTouchControls(ctx, this);
    if (this.state === 'draft') drawDraft(ctx, this, this.time);
    if (this.paused && this.state === 'playing') drawPause(ctx);
    if (this.state === 'gameover') drawGameOver(ctx, this);
    if (this.state === 'victory') drawVictory(ctx, this);
  }

  drawMotes(ctx) {
    for (const mote of this.motes) {
      ctx.save();
      ctx.translate(mote.x, mote.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }
  }
}
