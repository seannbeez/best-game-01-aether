// AETHER FORGE — projectile pools. Player bolts (brass, elemental) and the
// void's orbs (purple, hostile). Pools are fixed arrays reused across the
// run, so combat never allocates in the hot loop.

export class BoltPool {
  constructor() {
    this.bolts = [];
  }

  fire(x, y, angle, damage, element, pierce, chains, speed) {
    this.bolts.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 6,
      damage,
      element,
      pierce,
      chains,
      life: 1.6,
      hitIds: new Set(),
    });
  }

  update(dt, arena) {
    for (let i = this.bolts.length - 1; i >= 0; i -= 1) {
      const b = this.bolts[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > arena.width + 20
        || b.y < -20 || b.y > arena.height + 20) {
        this.bolts.splice(i, 1);
      }
    }
  }

  remove(bolt) {
    const index = this.bolts.indexOf(bolt);
    if (index >= 0) this.bolts.splice(index, 1);
  }

  clear() {
    this.bolts.length = 0;
  }
}

export class OrbPool {
  constructor() {
    this.orbs = [];
  }

  fire(x, y, angle, speed, damage, radius) {
    this.orbs.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: radius ?? 8,
      damage,
      life: 6,
      parried: false,
    });
  }

  update(dt, arena) {
    for (let i = this.orbs.length - 1; i >= 0; i -= 1) {
      const o = this.orbs[i];
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.life -= dt;
      if (o.life <= 0 || o.x < -30 || o.x > arena.width + 30
        || o.y < -30 || o.y > arena.height + 30) {
        this.orbs.splice(i, 1);
      }
    }
  }

  remove(orb) {
    const index = this.orbs.indexOf(orb);
    if (index >= 0) this.orbs.splice(index, 1);
  }

  clear() {
    this.orbs.length = 0;
  }
}
