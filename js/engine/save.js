// save.js — localStorage persistence for progress.
const KEY = 'primordia.save.v1';

const DEFAULT = {
  discoveredElements: ['H'],     // you always start with hydrogen
  discoveredMolecules: [],
  discoveredItems: [],           // building blocks, polymers, protocell
  insight: 0,
  hintsUsed: {},                 // id -> tier of hint revealed
  scene: 'forge',
  introSeen: false,
  benchReached: false,
  labReached: false,
  cellReached: false,
  colonyReached: false,          // stable protocell colony achieved
  lifeBegun: false,              // world finale triggered
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
