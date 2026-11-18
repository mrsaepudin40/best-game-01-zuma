// LevelDirector: 12 campaign levels across 3 neon zones. Each level sets
// the chain speed, how many colours are in play, how many orbs must be
// cleared, and whether it is a boss level (armored + locked orbs, surges).
export const ZONES = [
  // Bright, colourful palettes: floor is [light, deep, accent] for the
  // painted arena texture; sky/fog are rich mid-tones, never near-black.
  { name: 'Ember Ring', sky: 0xa16207, fog: 0xd97706, ground: 0x7c2d12, floor: ['#fbbf24', '#ea580c', '#facc15'] },
  { name: 'Volt Reef', sky: 0x0e7490, fog: 0x06b6d4, ground: 0x0f766e, floor: ['#2dd4bf', '#0d9488', '#22d3ee'] },
  { name: 'Void Crown', sky: 0x7e22ce, fog: 0xa855f7, ground: 0x581c87, floor: ['#c084fc', '#7c3aed', '#f0abfc'] },
];

export function levelConfig(level) {
  const zone = ZONES[Math.min(2, Math.floor((level - 1) / 4))];
  const boss = level % 4 === 0;
  return {
    level, zone, boss,
    speed: 1.35 + level * 0.16 + (boss ? 0.35 : 0),
    colours: Math.min(10, 3 + Math.ceil(level * 0.6)),
    totalOrbs: 26 + level * 4,
    spawnInterval: Math.max(0.7, 1.25 - level * 0.04),
    armored: boss ? 6 + level : Math.floor(level / 3),
    locked: boss ? 4 : 0,
    surgeEvery: boss ? 9 : 0,
    par: 60 + level * 25,
  };
}
export const TOTAL_LEVELS = 12;
