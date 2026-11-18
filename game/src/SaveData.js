// SaveData: localStorage persistence — best score, campaign progress,
// coins and shop purchases. All reads are guarded so a corrupt or missing
// store never breaks the game.
const KEY = 'crimson-widow-neon-spiral-v1';

export function loadSave() {
  const fallback = { best: 0, level: 1, coins: 0, owned: [], endlessBest: 0, muted: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...fallback };
    const data = JSON.parse(raw);
    return { ...fallback, ...data, owned: Array.isArray(data.owned) ? data.owned : [] };
  } catch {
    return { ...fallback };
  }
}

export function storeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage full/blocked: play on */ }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
