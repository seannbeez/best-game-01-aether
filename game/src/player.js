// AETHER FORGE — the Forge Defender: a brass clockwork core the player steers
// around the workshop floor. It aims with the mouse, fires aether bolts,
// and dashes — dashing through an enemy orb parries it back as a golden bolt.
// Relics (see relics.js) mutate these numbers; this class owns the math.

import { TUNE } from './config.js';
import { clamp } from './random.js';

export class ForgeDefender {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = TUNE.playerRadius;
    this.hp = TUNE.playerMaxHp;
    this.maxHp = TUNE.playerMaxHp;
    this.aimAngle = -Math.PI / 2;
    this.fireTimer = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashAngle = 0;
    this.invulnerableTimer = 0;
    this.parryTimer = 0;
    this.hurtFlash = 0;
    this.trailTimer = 0;

    // Relic-mutated stats (base values come from TUNE; relics add on top).
    this.shotsPerVolley = 1;
    this.boltDamage = TUNE.boltDamage;
    this.fireInterval = TUNE.playerFireInterval;
    this.boltPierce = 0;
    this.boltChains = 0;
    this.boltRicochet = 0;
    this.magnetRadius = 90;
    this.element = 'ember';
    this.heatGain = 1;
    this.dashCooldownBonus = 1;
    this.scoreBonus = 1;
    this.relicNames = [];
    this.moving = false;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.hp = TUNE.playerMaxHp;
    this.maxHp = TUNE.playerMaxHp;
    this.aimAngle = -Math.PI / 2;
    this.fireTimer = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.invulnerableTimer = 0;
    this.parryTimer = 0;
    this.hurtFlash = 0;
    this.shotsPerVolley = 1;
    this.boltDamage = TUNE.boltDamage;
    this.fireInterval = TUNE.playerFireInterval;
    this.boltPierce = 0;
    this.boltChains = 0;
    this.boltRicochet = 0;
    this.magnetRadius = 90;
    this.element = 'ember';
    this.heatGain = 1;
    // Relic multipliers must reset with the run: without this, a relic
    // picked in one run (Quicksilver Dash, Gilded Core) silently carried
    // into the next run after an instant restart.
    this.dashCooldownBonus = 1;
    this.scoreBonus = 1;
    this.relicNames = [];
  }

  get alive() {
    return this.hp > 0;
  }

  get dashing() {
    return this.dashTimer > 0;
  }

  get parrying() {
    return this.parryTimer > 0;
  }

  update(dt, move, aimX, aimY, wantDash, wantFire, arena, onFire, onDash) {
    this.aimAngle = Math.atan2(aimY - this.y, aimX - this.x);
    this.fireTimer -= dt;
    this.dashCooldown -= dt;
    this.invulnerableTimer -= dt;
    this.parryTimer -= dt;
    this.hurtFlash -= dt;
    this.moving = move.x !== 0 || move.y !== 0;

    if (wantDash && this.dashCooldown <= 0 && !this.dashing) {
      this.dashTimer = TUNE.dashTime;
      this.dashCooldown = TUNE.dashCooldown * (this.dashCooldownBonus ?? 1);
      this.dashAngle = this.moving
        ? Math.atan2(move.y, move.x)
        : this.aimAngle;
      this.invulnerableTimer = Math.max(this.invulnerableTimer, TUNE.dashInvulnerable);
      this.parryTimer = TUNE.parryWindow;
      if (onDash) onDash();
    }

    if (this.dashing) {
      this.dashTimer -= dt;
      this.x += Math.cos(this.dashAngle) * TUNE.dashSpeed * dt;
      this.y += Math.sin(this.dashAngle) * TUNE.dashSpeed * dt;
    } else {
      const speed = TUNE.playerSpeed;
      this.x += move.x * speed * dt;
      this.y += move.y * speed * dt;
    }

    const margin = this.radius + 6;
    this.x = clamp(this.x, margin, arena.width - margin);
    this.y = clamp(this.y, margin, arena.height - margin);

    if (wantFire && this.fireTimer <= 0) {
      this.fireTimer = this.fireInterval;
      if (onFire) onFire(this);
    }

    // Golden trail puffs while dashing.
    this.trailTimer -= dt;
    if (this.dashing && this.trailTimer <= 0) {
      this.trailTimer = 0.02;
      return true;
    }
    return false;
  }

  takeHit(damage) {
    if (this.invulnerableTimer > 0 || !this.alive) return false;
    this.hp -= damage;
    this.hurtFlash = 0.25;
    this.invulnerableTimer = 0.55;
    return true;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  // Dash-parry: an enemy orb touching the defender mid-dash is deflected.
  // Returns true when the orb was parried (the caller turns it gold).
  tryParry(orbX, orbY) {
    if (!this.parrying) return false;
    const dx = orbX - this.x;
    const dy = orbY - this.y;
    return dx * dx + dy * dy < (this.radius + 26) * (this.radius + 26);
  }
}
