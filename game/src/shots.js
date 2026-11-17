// AETHER FORGE — deterministic screenshot scenes. The game reads
// ?shot=<scene>&seed=<n> and this module stages that exact scene with a
// seeded generator and a fixed simulated time, then the game freezes the
// simulation and raises window.__shotReady. Scenes:
//   title    — attract mode behind the gilded title overlay
//   play     — mid-fight, wave 3, HUD, combo and heat visible
//   draft    — the relic draft: 3 cards over a live fight
//   overdrive— Overdrive state, golden trails, boss bar
//   gameover — the fall screen with score, stats and PLAY AGAIN

import { mulberry32, range } from './random.js';
import { makeEnemy, makeBoss } from './enemies.js';
import { rollDraft } from './relics.js';
import { TUNE } from './config.js';

function scatterFoes(game, rng, count) {
  for (let i = 0; i < count; i += 1) {
    const kinds = ['wisp', 'wisp', 'spitter', 'splitter', 'brute'];
    const kind = kinds[Math.floor(rng() * kinds.length)];
    const enemy = makeEnemy(
      kind,
      range(rng, 90, 1190),
      range(rng, 120, 620),
      rng,
      game.wave,
    );
    enemy.hp = Math.round(enemy.maxHp * range(rng, 0.45, 0.95));
    game.enemies.push(enemy);
  }
}

function seedBolts(game, rng, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = range(rng, -Math.PI, Math.PI);
    game.bolts.fire(
      game.player.x + Math.cos(angle) * range(rng, 40, 260),
      game.player.y + Math.sin(angle) * range(rng, 40, 200),
      angle,
      game.player.boltDamage,
      game.player.element,
      0,
      0,
      TUNE.boltSpeed,
    );
  }
}

export function setupShot(game, scene, seed) {
  const rng = mulberry32(seed);
  game.startRun();
  game.state = 'playing';
  game.time = 0;

  if (scene === 'title') {
    game.state = 'title';
    game.titleShownAt = 0;
    game.time = 1.6;
    // Seed the attract-mode drifters directly: the frozen sim never runs
    // updateAttract, so the title shot needs its wisps placed by hand.
    const kinds = ['wisp', 'wisp', 'spitter', 'splitter', 'brute'];
    for (let i = 0; i < 5; i += 1) {
      const enemy = makeEnemy(
        kinds[i],
        200 + i * 180,
        480 + Math.sin(i * 1.3) * 60,
        rng,
        1,
      );
      game.attract.push(enemy);
    }
    return;
  }

  if (scene === 'play') {
    game.wave = 3;
    game.score = 2840;
    game.combo = 7;
    game.comboTimer = 2.4;
    game.heat = 62;
    game.kills = 41;
    game.player.x = 640;
    game.player.y = 420;
    game.player.aimAngle = -0.5;
    game.player.relicNames = ['Twin Gears', 'Overclock Spring'];
    game.player.shotsPerVolley = 2;
    scatterFoes(game, rng, 7);
    seedBolts(game, rng, 5);
    game.orbs.fire(420, 300, 0.6, 210, 9, 8);
    game.orbs.fire(860, 240, 2.4, 210, 9, 8);
    game.particles.burst(760, 300, '#ff9a3c', 22, 260, 0.7, 4);
    game.particles.ring(760, 300, '#ffd94d', 90);
    game.particles.text(760, 260, '+150', '#ffd94d', 20);
    // startRun staged the wave-1 banner; a frozen play shot must not
    // show "WAVE 1" over a wave-3 fight.
    game.waveBanner = 0;
    game.time = 0;
    game.freezeSim = true;
    return;
  }

  if (scene === 'draft') {
    game.wave = 4;
    game.score = 5120;
    game.combo = 4;
    game.comboTimer = 1.8;
    game.heat = 88;
    game.kills = 73;
    game.player.x = 640;
    game.player.y = 500;
    game.player.relicNames = ['Twin Gears', 'Chain Coil', 'Aegis Plating'];
    game.player.shotsPerVolley = 2;
    game.player.boltChains = 1;
    scatterFoes(game, rng, 5);
    game.draftCards = rollDraft(mulberry32(seed + 7), ['twin-gears', 'chain-coil']);
    game.state = 'draft';
    game.draftShownAt = 0;
    game.time = 1.2;
    game.freezeSim = true;
    return;
  }

  if (scene === 'overdrive') {
    game.wave = 5;
    game.score = 9480;
    game.combo = 12;
    game.comboTimer = 2.8;
    game.heat = 100;
    game.overdriveTimer = 6.4;
    game.kills = 118;
    game.player.x = 560;
    game.player.y = 400;
    game.player.aimAngle = -0.3;
    game.player.relicNames = ['Twin Gears', 'Chain Coil', 'Overclock Spring', 'Heat Sink'];
    game.player.shotsPerVolley = 2;
    game.player.boltChains = 1;
    game.boss = makeBoss(880, 260, 5);
    game.boss.hp = Math.round(game.boss.maxHp * 0.62);
    scatterFoes(game, rng, 4);
    seedBolts(game, rng, 8);
    game.particles.burst(700, 330, '#ffd94d', 30, 320, 0.8, 4);
    game.particles.ring(880, 260, '#c04df0', 130);
    game.particles.text(700, 290, 'x12 COMBO', '#ffd94d', 22);
    // Same stale-banner fix as the play scene: startRun staged "WAVE 1".
    game.waveBanner = 0;
    game.time = 0;
    game.freezeSim = true;
    return;
  }

  if (scene === 'gameover') {
    game.wave = 6;
    game.score = 12740;
    game.kills = 164;
    game.parries = 9;
    game.best = 12740;
    game.player.hp = 0;
    game.player.relicNames = ['Twin Gears', 'Chain Coil', 'Aegis Plating', 'Heavy Ordnance'];
    game.state = 'gameover';
    game.time = 0;
    game.freezeSim = true;
    return;
  }

  // Unknown scene: fall back to the title.
  game.state = 'title';
  game.titleShownAt = 0;
}
