// LevelDirector: 12 campaign levels across 3 neon zones. Each level sets
// the chain speed, how many colours are in play, how many orbs must be
// cleared, and whether it is a boss level (armored + locked orbs, surges).
export const ZONES = [
  { name: 'Ember Ring', sky: 0x1a0533, fog: 0x2a0a4a, ground: 0x1e1030 },
  { name: 'Volt Reef', sky: 0x02182b, fog: 0x0a2a4a, ground: 0x0a1a2e },
  { name: 'Void Crown', sky: 0x160a2e, fog: 0x2e0a3a, ground: 0x1a0a24 },
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
