// AETHER FORGE — juice in a box: particle bursts, shockwave rings, golden
// trails, floating damage / combo numbers and hit sparks. One flat array,
// capped so a busy fight can never allocate without bound.

export class Particles {
  constructor() {
    this.list = [];
    this.max = 420;
  }

  burst(x, y, color, count, speed, life, size) {
    for (let i = 0; i < count; i += 1) {
      if (this.list.length >= this.max) return;
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.3 + Math.random() * 0.7);
      this.list.push({
        kind: 'spark',
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: life * (0.6 + Math.random() * 0.6),
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.8),
        color,
        drag: 0.9,
      });
    }
  }

  ring(x, y, color, maxRadius) {
    if (this.list.length >= this.max) return;
    this.list.push({
      kind: 'ring', x, y, radius: 6, maxRadius, life: 0.45, maxLife: 0.45, color,
    });
  }

  trail(x, y, color, size) {
    if (this.list.length >= this.max) return;
    this.list.push({
      kind: 'trail', x, y, vx: 0, vy: 0, life: 0.35, maxLife: 0.35, size, color,
    });
  }

  text(x, y, message, color, size) {
    if (this.list.length >= this.max) return;
    this.list.push({
      kind: 'text', x, y, vy: -46, life: 0.9, maxLife: 0.9, message, color, size: size ?? 15,
    });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i -= 1) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.list.splice(i, 1);
        continue;
      }
      if (p.kind === 'spark') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= Math.pow(p.drag, dt * 60);
        p.vy *= Math.pow(p.drag, dt * 60);
      } else if (p.kind === 'ring') {
        p.radius = p.maxRadius * (1 - p.life / p.maxLife);
      } else if (p.kind === 'text') {
        p.y += p.vy * dt;
      }
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      const alpha = Math.max(0, p.life / p.maxLife);
      if (p.kind === 'spark' || p.kind === 'trail') {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'ring') {
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * alpha + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'text') {
        ctx.globalAlpha = Math.min(1, alpha * 1.6);
        ctx.fillStyle = p.color;
        ctx.font = `700 ${p.size}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.message, p.x, p.y);
      }
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.list.length = 0;
  }
}
