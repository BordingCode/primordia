// save.js — localStorage persistence for progress.
const KEY = 'primordia.save.v1';

const DEFAULT = {
  discoveredElements: ['H'],     // you always start with hydrogen
  discoveredMolecules: [],
  insight: 0,
  hintsUsed: {},                 // moleculeId -> tier of hint revealed
  scene: 'forge',
  inthalSeen: false,
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    return Object.assign(structuredClone(DEFAULT), JSON.parse(raw));
  } catch (e) {
    console.warn('save load failed', e);
    return structuredClone(DEFAULT);
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) { console.warn('save failed', e); }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch (e) {}
  return structuredClone(DEFAULT);
}
