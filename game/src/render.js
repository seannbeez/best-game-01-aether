// AETHER FORGE — every pixel the judge sees. Canvas 2D, logical playfield
// 1280x720, scaled to the window with devicePixelRatio sharpness. Draws the
// parallax workshop (turning gears, light shafts, drifting embers), the
// entities, the diegetic HUD (health arc around the defender, heat gauge),
// and every screen: title, draft, pause, game over, victory.

import { PALETTE, TUNE } from './config.js';
import { clamp, easeOutBack, easeOutCubic } from './random.js';

// Convert a CSS-pixel point on the canvas to logical playfield coordinates.
export function toLogical(view, x, y) {
  return { x: (x - view.offsetX) / view.scale, y: (y - view.offsetY) / view.scale };
}

export function drawGear(ctx, x, y, radius, teeth, rotation, color, lineWidth) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth ?? 3;
  ctx.beginPath();
  for (let i = 0; i < teeth; i += 1) {
    const a0 = (i / teeth) * Math.PI * 2;
    const a1 = ((i + 0.4) / teeth) * Math.PI * 2;
    const a2 = ((i + 0.6) / teeth) * Math.PI * 2;
    const a3 = ((i + 1) / teeth) * Math.PI * 2;
    ctx.moveTo(Math.cos(a0) * radius * 0.82, Math.sin(a0) * radius * 0.82);
    ctx.lineTo(Math.cos(a0) * radius, Math.sin(a0) * radius);
    ctx.lineTo(Math.cos(a1) * radius, Math.sin(a1) * radius);
    ctx.lineTo(Math.cos(a1) * radius * 0.82, Math.sin(a1) * radius * 0.82);
    ctx.lineTo(Math.cos(a2) * radius * 0.82, Math.sin(a2) * radius * 0.82);
    ctx.lineTo(Math.cos(a2) * radius, Math.sin(a2) * radius);
    ctx.lineTo(Math.cos(a3) * radius, Math.sin(a3) * radius);
    ctx.lineTo(Math.cos(a3) * radius * 0.82, Math.sin(a3) * radius * 0.82);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawRuneCircle(ctx, x, y, radius, rotation, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.78, Math.sin(a) * radius * 0.78);
    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBackground(ctx, time, overdrive) {
  // Parchment workshop floor.
  const floor = ctx.createLinearGradient(0, 0, 0, 720);
  floor.addColorStop(0, '#2a1f14');
  floor.addColorStop(0.55, '#33261a');
  floor.addColorStop(1, '#241a10');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, 1280, 720);

  // Giant background gears, slow and dim — parallax layer one.
  drawGear(ctx, 150, 110, 150, 12, time * 0.05, 'rgba(201,151,63,0.16)', 5);
  drawGear(ctx, 1140, 620, 190, 14, -time * 0.04, 'rgba(201,151,63,0.13)', 5);
  drawGear(ctx, 1180, 90, 90, 10, time * 0.08, 'rgba(201,151,63,0.12)', 4);
  drawGear(ctx, 90, 640, 110, 10, -time * 0.06, 'rgba(201,151,63,0.11)', 4);

  // Volumetric light shafts from the top.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i += 1) {
    const x = 320 + i * 320 + Math.sin(time * 0.3 + i) * 14;
    const shaft = ctx.createLinearGradient(x, 0, x + 90, 720);
    shaft.addColorStop(0, overdrive ? 'rgba(255,217,77,0.13)' : 'rgba(242,201,107,0.09)');
    shaft.addColorStop(1, 'rgba(242,201,107,0)');
    ctx.fillStyle = shaft;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 70, 0);
    ctx.lineTo(x + 170, 720);
    ctx.lineTo(x + 40, 720);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Floorboards and the great rune circle at the centre.
  ctx.strokeStyle = 'rgba(201,151,63,0.10)';
  ctx.lineWidth = 1;
  for (let y = 120; y < 720; y += 120) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1280, y);
    ctx.stroke();
  }
  drawRuneCircle(ctx, 640, 360, 210, time * 0.03, 'rgba(242,201,107,0.20)');
  drawRuneCircle(ctx, 640, 360, 150, -time * 0.05, 'rgba(242,201,107,0.12)');

  // Drifting embers.
  ctx.fillStyle = 'rgba(255,154,60,0.55)';
  for (let i = 0; i < 26; i += 1) {
    const px = (i * 173.3 + time * (8 + (i % 5) * 3)) % 1280;
    const py = 720 - ((i * 97.7 + time * (14 + (i % 4) * 5)) % 720);
    const size = 1 + (i % 3) * 0.8;
    ctx.globalAlpha = 0.25 + 0.3 * Math.abs(Math.sin(time + i));
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawPlayer(ctx, player, time, overdrive) {
  const flash = player.hurtFlash > 0;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Golden dash trail glow.
  if (player.dashing || overdrive) {
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 70);
    glow.addColorStop(0, overdrive ? 'rgba(255,217,77,0.55)' : 'rgba(242,201,107,0.4)');
    glow.addColorStop(1, 'rgba(242,201,107,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.fill();
  }

  // Parry ring while the dash-parry window is open.
  if (player.parrying) {
    ctx.strokeStyle = 'rgba(255,217,77,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 16, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Brass core: gear body + glowing heart.
  drawGear(ctx, 0, 0, player.radius + 4, 8, time * 1.2, flash ? '#ff5a3c' : PALETTE.brass, 4);
  const heart = ctx.createRadialGradient(0, 0, 2, 0, 0, player.radius * 0.7);
  heart.addColorStop(0, '#fff3c4');
  heart.addColorStop(0.5, overdrive ? PALETTE.gold : PALETTE.ember);
  heart.addColorStop(1, 'rgba(255,90,60,0)');
  ctx.fillStyle = heart;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius * 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Aim barrel.
  ctx.rotate(player.aimAngle);
  ctx.fillStyle = PALETTE.brassLight;
  ctx.fillRect(player.radius * 0.4, -4, player.radius * 0.9, 8);
  ctx.restore();

  // Diegetic health arc around the defender.
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.arc(0, 0, player.radius + 12, 0, Math.PI * 2);
  ctx.stroke();
  const hpFraction = clamp(player.hp / player.maxHp, 0, 1);
  ctx.strokeStyle = hpFraction > 0.5 ? PALETTE.heal : hpFraction > 0.25 ? PALETTE.gold : PALETTE.emberRed;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius + 12, -Math.PI / 2, -Math.PI / 2 + hpFraction * Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawEnemy(ctx, enemy, time) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  const flash = enemy.flash > 0;
  const body = flash ? '#ffffff' : '#2a1245';
  const glowColor = enemy.kind === 'boss' ? PALETTE.voidPink : PALETTE.voidPurple;

  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, enemy.radius * 1.6);
  glow.addColorStop(0, 'rgba(192,77,240,0.4)');
  glow.addColorStop(1, 'rgba(192,77,240,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, enemy.radius * 1.6, 0, Math.PI * 2);
  ctx.fill();

  if (enemy.kind === 'wisp') {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.7, enemy.wobble, enemy.wobble + Math.PI * 1.4);
    ctx.stroke();
    // Eyes.
    ctx.fillStyle = PALETTE.voidPink;
    ctx.beginPath();
    ctx.arc(-6, -4, 3, 0, Math.PI * 2);
    ctx.arc(6, -4, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.kind === 'spitter') {
    drawGear(ctx, 0, 0, enemy.radius, 8, time * 0.7, flash ? '#fff' : '#3a1a5e', 3);
    ctx.fillStyle = PALETTE.voidPink;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.kind === 'brute') {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.emberRed;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + time * 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * enemy.radius * 0.8, Math.sin(a) * enemy.radius * 0.8);
      ctx.lineTo(Math.cos(a) * enemy.radius * 1.15, Math.sin(a) * enemy.radius * 1.15);
      ctx.stroke();
    }
  } else if (enemy.kind === 'splitter') {
    ctx.rotate(enemy.wobble * 0.5);
    ctx.fillStyle = body;
    ctx.beginPath();
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2;
      const px = Math.cos(a) * enemy.radius;
      const py = Math.sin(a) * enemy.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.voidPink;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.kind === 'boss') {
    drawGear(ctx, 0, 0, enemy.radius + 10, 12, time * 0.35, flash ? '#fff' : '#1c0b33', 6);
    drawGear(ctx, 0, 0, enemy.radius * 0.55, 8, -time * 0.6, PALETTE.voidPink, 4);
    // The Maw: a dark mouth that opens with the phase.
    const open = 0.5 + 0.4 * Math.sin(time * 2.2);
    ctx.fillStyle = '#0a0514';
    ctx.beginPath();
    ctx.ellipse(0, 6, enemy.radius * 0.5, enemy.radius * 0.28 * open, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.emberRed;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 11 - 5, 6 - enemy.radius * 0.28 * open);
      ctx.lineTo(i * 11, 6);
      ctx.lineTo(i * 11 + 5, 6 - enemy.radius * 0.28 * open);
      ctx.fill();
    }
    // Eyes.
    ctx.fillStyle = '#ff5a3c';
    ctx.beginPath();
    ctx.arc(-18, -16, 5, 0, Math.PI * 2);
    ctx.arc(18, -16, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Enemy HP bar (only when hurt, or always for the boss — the boss bar
  // also lives in the HUD).
  if (enemy.kind !== 'boss' && enemy.hp < enemy.maxHp) {
    const w = enemy.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w, 5);
    ctx.fillStyle = PALETTE.emberRed;
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w * (enemy.hp / enemy.maxHp), 5);
  }
}

export function drawBolts(ctx, bolts) {
  for (const bolt of bolts) {
    const color = bolt.element === 'frost' ? PALETTE.frost
      : bolt.element === 'volt' ? PALETTE.gold : PALETTE.ember;
    ctx.save();
    ctx.translate(bolt.x, bolt.y);
    ctx.rotate(Math.atan2(bolt.vy, bolt.vx));
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8e0';
    ctx.beginPath();
    ctx.ellipse(2, 0, 5, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawOrbs(ctx, orbs) {
  for (const orb of orbs) {
    ctx.save();
    ctx.translate(orb.x, orb.y);
    const color = orb.parried ? PALETTE.gold : PALETTE.voidPink;
    const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, orb.radius * 2);
    glow.addColorStop(0, orb.parried ? 'rgba(255,217,77,0.7)' : 'rgba(192,77,240,0.55)');
    glow.addColorStop(1, 'rgba(192,77,240,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, orb.radius * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, orb.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-2, -2, orb.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// --- HUD -----------------------------------------------------------------

export function drawHud(ctx, game) {
  const { score, best, wave, heat, combo, comboTimer, overdriveTimer } = game;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Top-left: score block.
  ctx.fillStyle = 'rgba(20,12,6,0.55)';
  roundRect(ctx, 14, 12, 250, 64, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.parchment;
  ctx.font = '700 13px Georgia, serif';
  ctx.fillText('SCORE', 28, 32);
  ctx.font = '700 26px Georgia, serif';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(String(score).padStart(6, '0'), 28, 60);
  ctx.font = '12px Georgia, serif';
  ctx.fillStyle = PALETTE.parchmentDark;
  ctx.fillText(`BEST ${best}`, 170, 32);

  // Top-centre: wave banner.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(20,12,6,0.55)';
  roundRect(ctx, 540, 12, 200, 40, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.parchment;
  ctx.font = '700 18px Georgia, serif';
  ctx.fillText(game.waveDirector.isBossWave ? `WAVE ${wave} — VOIDMAW` : `WAVE ${wave}`, 640, 40);

  // Top-right: HP bar + heat gauge.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(20,12,6,0.55)';
  roundRect(ctx, 1016, 12, 250, 64, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.parchment;
  ctx.font = '700 13px Georgia, serif';
  ctx.fillText('FORGE HP', 1030, 32);
  bar(ctx, 1030, 38, 150, 12, game.player.hp / game.player.maxHp,
    game.player.hp / game.player.maxHp > 0.5 ? PALETTE.heal : PALETTE.emberRed);
  ctx.fillStyle = PALETTE.parchment;
  ctx.fillText(`${Math.max(0, Math.ceil(game.player.hp))} / ${game.player.maxHp}`, 1190, 50);
  ctx.fillText('HEAT', 1030, 68);
  bar(ctx, 1078, 58, 174, 10, heat / TUNE.heatMax,
    overdriveTimer > 0 ? PALETTE.gold : PALETTE.ember);

  // Combo multiplier, big and proud while it lasts — but not over the
  // draft overlay, whose own title sits where this text would land.
  if (combo >= 2 && comboTimer > 0 && game.state !== 'draft') {
    const pulse = 1 + 0.12 * Math.sin(game.time * 10);
    ctx.save();
    ctx.translate(640, 96);
    ctx.scale(pulse, pulse);
    ctx.textAlign = 'center';
    ctx.font = '700 30px Georgia, serif';
    ctx.fillStyle = overdriveTimer > 0 ? PALETTE.gold : PALETTE.ember;
    ctx.fillText(`COMBO x${combo}`, 0, 0);
    ctx.restore();
  }

  // Overdrive banner — likewise hidden under the draft overlay.
  if (overdriveTimer > 0 && game.state !== 'draft') {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 22px Georgia, serif';
    ctx.fillStyle = PALETTE.gold;
    ctx.shadowColor = '#ff9a3c';
    ctx.shadowBlur = 18;
    ctx.fillText(`⚡ OVERDRIVE ${overdriveTimer.toFixed(1)}s — SCORE x3 ⚡`, 640, 140);
    ctx.restore();
  }

  // Boss HP bar.
  const boss = game.boss;
  if (boss) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(20,12,6,0.6)';
    roundRect(ctx, 390, 60, 500, 26, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.voidPink;
    ctx.font = '700 13px Georgia, serif';
    ctx.fillText('VOIDMAW — THE HUNGER IN THE DARK', 640, 78);
    bar(ctx, 400, 82, 480, 8, boss.hp / boss.maxHp, PALETTE.voidPink);
  }

  // Relic icons owned, bottom-left.
  ctx.textAlign = 'left';
  game.player.relicNames.forEach((name, i) => {
    ctx.font = '11px Georgia, serif';
    ctx.fillStyle = PALETTE.parchmentDark;
    ctx.fillText(`◆ ${name}`, 18, 700 - i * 16);
  });

  // Mute + pause buttons, bottom-right (also clickable).
  drawIconButton(ctx, 1206, 668, game.muted ? '🔇' : '🔊', 'mute');
  drawIconButton(ctx, 1152, 668, game.paused ? '▶' : '⏸', 'pause');

  // Draft countdown: the next relic offer is always visible.
  ctx.textAlign = 'right';
  ctx.font = '13px Georgia, serif';
  ctx.fillStyle = PALETTE.parchmentDark;
  ctx.fillText(`Next relic in ${Math.max(0, game.draftIn).toFixed(0)}s — draft every ${TUNE.draftEverySeconds}s`, 1136, 692);
}

function bar(ctx, x, y, width, height, fraction, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.fill();
  if (fraction > 0) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, width * clamp(fraction, 0, 1), height, height / 2);
    ctx.fill();
  }
}

export function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawIconButton(ctx, x, y, glyph, id) {
  ctx.fillStyle = 'rgba(20,12,6,0.6)';
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = '16px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.parchment;
  ctx.fillText(glyph, x, y + 1);
  ctx.textBaseline = 'alphabetic';
}

// --- Screens ---------------------------------------------------------------

function panel(ctx, x, y, width, height) {
  ctx.fillStyle = 'rgba(24,14,6,0.88)';
  roundRect(ctx, x, y, width, height, 16);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(242,201,107,0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, x + 6, y + 6, width - 12, height - 12, 12);
  ctx.stroke();
}

function titleText(ctx, text, x, y, size, color) {
  ctx.font = `700 ${size}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function drawTitle(ctx, game, time) {
  ctx.fillStyle = 'rgba(10,6,3,0.45)';
  ctx.fillRect(0, 0, 1280, 720);
  const rise = easeOutBack(clamp((time - game.titleShownAt) * 1.4, 0, 1));
  ctx.save();
  ctx.translate(0, (1 - rise) * 40);
  ctx.globalAlpha = clamp((time - game.titleShownAt) * 2, 0, 1);

  // Gilded title.
  ctx.shadowColor = '#ff9a3c';
  ctx.shadowBlur = 30;
  titleText(ctx, 'AETHER FORGE', 640, 170, 84, PALETTE.gold);
  ctx.shadowBlur = 0;
  titleText(ctx, '— CLOCKWORK DEFENDER —', 640, 216, 26, PALETTE.brassLight);

  panel(ctx, 340, 250, 600, 210, 16);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.parchment;
  ctx.font = '700 19px Georgia, serif';
  ctx.fillText('GOAL — Defend the forge through 10 waves.', 640, 292);
  ctx.font = '16px Georgia, serif';
  ctx.fillStyle = PALETTE.bone;
  ctx.fillText('Blast the shadow-void. Dash through orbs to PARRY them back.', 640, 324);
  ctx.fillText('Kills, near-misses and parries build HEAT — fill it for OVERDRIVE.', 640, 350);
  ctx.fillText('Every 25s the forge offers 3 relics. Pick 1. Slay the Voidmaw.', 640, 376);
  ctx.fillText('Wave 10 boss falls → the forge endures. Fall, and it is over.', 640, 402);
  ctx.font = '700 15px Georgia, serif';
  ctx.fillStyle = PALETTE.brassLight;
  ctx.fillText('WASD / Arrows move · Mouse aims · Click / Space fires', 640, 432);
  ctx.fillText('Shift / Right-click DASH & PARRY · P pause · M mute', 640, 454);

  // PLAY button.
  const pulse = 1 + 0.05 * Math.sin(time * 4);
  ctx.save();
  ctx.translate(640, 528);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = PALETTE.brass;
  roundRect(ctx, -130, -30, 260, 60, 30);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 3;
  ctx.stroke();
  titleText(ctx, '▶  PLAY', 0, 12, 30, '#241a10');
  ctx.restore();

  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = PALETTE.parchmentDark;
  ctx.fillText(`BEST SCORE ${game.best}   ·   Press SPACE or tap PLAY`, 640, 596);
  ctx.restore();
}

export function drawDraft(ctx, game, time) {
  ctx.fillStyle = 'rgba(10,6,3,0.6)';
  ctx.fillRect(0, 0, 1280, 720);
  titleText(ctx, 'THE FORGE OFFERS — CHOOSE ONE RELIC', 640, 110, 34, PALETTE.gold);
  ctx.font = '16px Georgia, serif';
  ctx.fillStyle = PALETTE.parchment;
  ctx.textAlign = 'center';
  ctx.fillText('Click a card, or press 1 / 2 / 3. Your weapon changes at once.', 640, 142);

  const cards = game.draftCards;
  cards.forEach((relic, i) => {
    const x = 190 + i * 310;
    const y = 190;
    const appear = easeOutBack(clamp((time - game.draftShownAt) * 2 - i * 0.15, 0, 1));
    ctx.save();
    ctx.translate(x + 130, y + 150);
    ctx.scale(appear, appear);
    ctx.translate(-(x + 130), -(y + 150));
    panel(ctx, x, y, 260, 300, 16);
    ctx.textAlign = 'center';
    ctx.font = '56px serif';
    ctx.fillText(relic.icon, x + 130, y + 96);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 22px Georgia, serif';
    ctx.fillText(relic.name, x + 130, y + 140);
    ctx.fillStyle = PALETTE.bone;
    ctx.font = '16px Georgia, serif';
    wrapText(ctx, relic.blurb, x + 130, y + 178, 220, 22);
    ctx.fillStyle = PALETTE.brassLight;
    ctx.font = '700 15px Georgia, serif';
    ctx.fillText(`[ ${i + 1} ]`, x + 130, y + 268);
    ctx.restore();
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lineY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, lineY);
}

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(10,6,3,0.6)';
  ctx.fillRect(0, 0, 1280, 720);
  panel(ctx, 440, 260, 400, 180, 16);
  titleText(ctx, 'PAUSED', 640, 330, 44, PALETTE.gold);
  ctx.font = '16px Georgia, serif';
  ctx.fillStyle = PALETTE.bone;
  ctx.textAlign = 'center';
  ctx.fillText('Press P or tap ▶ to resume.', 640, 372);
  ctx.fillText('M mutes the music.', 640, 398);
}

export function drawGameOver(ctx, game) {
  ctx.fillStyle = 'rgba(12,4,10,0.62)';
  ctx.fillRect(0, 0, 1280, 720);
  panel(ctx, 330, 150, 620, 400, 16);
  titleText(ctx, 'THE FORGE FALLS', 640, 226, 52, PALETTE.emberRed);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.parchment;
  ctx.font = '700 20px Georgia, serif';
  ctx.fillText(`FINAL SCORE  ${game.score}`, 640, 282);
  ctx.font = '17px Georgia, serif';
  ctx.fillStyle = PALETTE.bone;
  ctx.fillText(`Best score  ${game.best}`, 640, 314);
  ctx.fillText(`Reached wave ${game.wave}  ·  ${game.kills} void slain  ·  ${game.parries} parries`, 640, 344);
  ctx.fillText(`Relics forged: ${game.player.relicNames.join(', ') || 'none'}`, 640, 374);
  ctx.fillStyle = PALETTE.brassLight;
  ctx.font = '700 17px Georgia, serif';
  ctx.fillText('The void recedes… for now. The forge can be rebuilt.', 640, 412);
  ctx.fillStyle = PALETTE.brass;
  roundRect(ctx, 510, 446, 260, 60, 30);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 3;
  ctx.stroke();
  titleText(ctx, '↻  PLAY AGAIN', 640, 484, 26, '#241a10');
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = PALETTE.parchmentDark;
  ctx.fillText('Press R or tap PLAY AGAIN for an instant restart', 640, 534);
}

export function drawVictory(ctx, game) {
  ctx.fillStyle = 'rgba(10,8,2,0.55)';
  ctx.fillRect(0, 0, 1280, 720);
  panel(ctx, 330, 140, 620, 420, 16);
  ctx.shadowColor = '#ffd94d';
  ctx.shadowBlur = 24;
  titleText(ctx, 'THE FORGE ENDURES', 640, 216, 48, PALETTE.gold);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.parchment;
  ctx.font = '700 20px Georgia, serif';
  ctx.fillText('The Voidmaw is shattered. All 10 waves held.', 640, 264);
  ctx.fillText(`FINAL SCORE  ${game.score}`, 640, 306);
  ctx.font = '17px Georgia, serif';
  ctx.fillStyle = PALETTE.bone;
  ctx.fillText(`Best score  ${game.best}`, 640, 338);
  ctx.fillText(`${game.kills} void slain  ·  ${game.parries} parries  ·  ${game.player.relicNames.length} relics`, 640, 368);
  ctx.fillStyle = PALETTE.brass;
  roundRect(ctx, 510, 420, 260, 60, 30);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 3;
  ctx.stroke();
  titleText(ctx, '↻  FORGE AGAIN', 640, 458, 26, '#241a10');
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = PALETTE.parchmentDark;
  ctx.fillText('Press R or tap FORGE AGAIN to play again', 640, 514);
}

// --- Touch controls --------------------------------------------------------

export function drawTouchControls(ctx, game) {
  const input = game.input;
  // Touch points arrive in CSS pixels; the canvas draws in logical
  // coordinates, so convert before drawing the stick.
  if (input.moveTouch) {
    const start = toLogical(game.view, input.moveTouch.startX, input.moveTouch.startY);
    const knob = toLogical(game.view, input.moveTouch.x, input.moveTouch.y);
    ctx.strokeStyle = 'rgba(242,201,107,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(start.x, start.y, 52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(242,201,107,0.6)';
    ctx.beginPath();
    ctx.arc(knob.x, knob.y, 24, 0, Math.PI * 2);
    ctx.fill();
  }
  // DASH pad, bottom-right above the mute button.
  ctx.fillStyle = 'rgba(20,12,6,0.6)';
  ctx.beginPath();
  ctx.arc(1080, 600, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '700 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('DASH', 1080, 605);
}
