// AETHER FORGE: CLOCKWORK DEFENDER — every tuning number in one place.
// Warm brass/parchment palette vs. the shadow void. All speeds are in
// pixels per second, all times in seconds; the simulation steps at 60 Hz.

export const TUNE = {
  // Arena (logical playfield; the canvas scales to fit the window).
  arenaWidth: 1280,
  arenaHeight: 720,

  // The Forge Defender.
  playerRadius: 22,
  playerSpeed: 320,
  playerMaxHp: 100,
  playerFireInterval: 0.22,
  boltSpeed: 760,
  boltDamage: 12,
  boltRadius: 6,
  dashSpeed: 980,
  dashTime: 0.16,
  dashCooldown: 1.1,
  parryWindow: 0.22,
  dashInvulnerable: 0.3,

  // Heat / combo / Overdrive.
  heatPerKill: 9,
  heatPerParry: 14,
  heatPerNearMiss: 4,
  heatMax: 100,
  heatDecayPerSecond: 3.5,
  overdriveDuration: 8,
  comboWindow: 3.0,

  // Waves and drafting.
  draftEverySeconds: 25,
  bossEveryWaves: 5,
  victoryWave: 10,
  waveClearBonus: 250,

  // Scoring.
  scoreWisp: 50,
  scoreSpitter: 80,
  scoreBrute: 150,
  scoreSplitter: 90,
  scoreBoss: 1500,
  nearMissRadius: 70,
};

export const PALETTE = {
  parchment: '#e8d5a8',
  parchmentDark: '#c9ae72',
  brass: '#c9973f',
  brassLight: '#f2c96b',
  brassDark: '#8a6420',
  copper: '#b56a32',
  ink: '#241a10',
  inkSoft: '#4a3a22',
  void: '#120a1e',
  voidPurple: '#5b2a86',
  voidPink: '#c04df0',
  ember: '#ff9a3c',
  emberRed: '#ff5a3c',
  gold: '#ffd94d',
  heal: '#7ddc8a',
  frost: '#7fd4ff',
  bone: '#f4ead2',
};

// Elemental flavours for chained reactions. Each bolt carries one element;
// matching chains pay out bonus damage and a coloured burst.
export const ELEMENTS = {
  ember: { color: '#ff9a3c', name: 'Ember' },
  frost: { color: '#7fd4ff', name: 'Frost' },
  volt: { color: '#ffe14d', name: 'Volt' },
};
