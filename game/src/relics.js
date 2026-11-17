// AETHER FORGE — relics: the micro-roguelite draft. Every 25 seconds the
// forge offers 3 relics; the player picks 1. Each relic visibly changes the
// weapon (more bolts, chains, pierce, elements) or the defender (plating,
// magnet, heat). Synergies are intentional: chains + volt, pierce + twin.

export const RELICS = [
  {
    id: 'twin-gears',
    name: 'Twin Gears',
    icon: '⚙',
    blurb: '+1 bolt per volley, in a spread.',
    apply(player) { player.shotsPerVolley += 1; },
  },
  {
    id: 'overclock',
    name: 'Overclock Spring',
    icon: '⏱',
    blurb: 'Fire 25% faster.',
    apply(player) { player.fireInterval *= 0.75; },
  },
  {
    id: 'heavy-ordnance',
    name: 'Heavy Ordnance',
    icon: '🔨',
    blurb: '+45% bolt damage.',
    apply(player) { player.boltDamage = Math.round(player.boltDamage * 1.45); },
  },
  {
    id: 'chain-coil',
    name: 'Chain Coil',
    icon: '⚡',
    blurb: 'Bolts chain to +1 nearby foe. Synergy: Volt.',
    apply(player) { player.boltChains += 1; player.element = 'volt'; },
  },
  {
    id: 'piercing-runes',
    name: 'Piercing Runes',
    icon: '➶',
    blurb: 'Bolts pierce +1 enemy.',
    apply(player) { player.boltPierce += 1; },
  },
  {
    id: 'frost-core',
    name: 'Frost Core',
    icon: '❄',
    blurb: 'Bolts slow foes they hit. Element: Frost.',
    apply(player) { player.element = 'frost'; player.boltDamage += 3; },
  },
  {
    id: 'ember-heart',
    name: 'Ember Heart',
    icon: '🔥',
    blurb: '+6 damage, bolts burst on kill. Element: Ember.',
    apply(player) { player.element = 'ember'; player.boltDamage += 6; },
  },
  {
    id: 'aegis-plating',
    name: 'Aegis Plating',
    icon: '🛡',
    blurb: '+30 max HP and heal 30 now.',
    apply(player) { player.maxHp += 30; player.heal(30); },
  },
  {
    id: 'lodestone',
    name: 'Lodestone',
    icon: '🧲',
    blurb: 'Score motes fly to you from much further.',
    apply(player) { player.magnetRadius += 160; },
  },
  {
    id: 'heat-sink',
    name: 'Heat Sink',
    icon: '🌡',
    blurb: 'Heat builds 60% faster — Overdrive sooner.',
    apply(player) { player.heatGain *= 1.6; },
  },
  {
    id: 'quick-dash',
    name: 'Quicksilver Dash',
    icon: '💨',
    blurb: 'Dash recharges 45% faster.',
    apply(player) { player.dashCooldownBonus = (player.dashCooldownBonus ?? 1) * 0.55; },
  },
  {
    id: 'gilded-core',
    name: 'Gilded Core',
    icon: '👑',
    blurb: 'Score +25% from now on.',
    apply(player) { player.scoreBonus = (player.scoreBonus ?? 1) * 1.25; },
  },
];

// Roll 3 distinct relics the player does not already own (repeats allowed for
// stackable ones once the pool runs dry). Seeded so a shot can be fixed.
export function rollDraft(rng, ownedIds) {
  const fresh = RELICS.filter((relic) => !ownedIds.includes(relic.id));
  const pool = fresh.length >= 3 ? fresh : RELICS;
  const chosen = [];
  const bag = [...pool];
  while (chosen.length < 3 && bag.length > 0) {
    const index = Math.floor(rng() * bag.length);
    chosen.push(bag.splice(index, 1)[0]);
  }
  return chosen;
}

export function applyRelic(player, relic) {
  relic.apply(player);
  player.relicNames.push(relic.name);
}
