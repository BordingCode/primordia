// save.js — localStorage persistence for progress.
const KEY = 'primordia.save.v1';

const DEFAULT = {
  discoveredElements: ['H'],     // you always start with hydrogen
  discoveredMolecules: [],
  discoveredItems: [],           // building blocks, polymers, protocell
  asidesFound: [],               // off-path "curiosities" found by experimenting
  experiments: 0,                // count of reactions the player has run (curiosity meter)
  insight: 0,
  hintsUsed: {},                 // id -> tier of hint revealed
  predictMode: true,             // default ON: guess the outcome before each reaction (toggle off in menu)
  coachSeen: {},                 // one-time coaching toasts already shown
  sandboxUnlocked: false,        // bought with insight — frees every stage & reagent
  sandbox: false,                // sandbox mode currently on
  coloniesLost: 0,               // protocell colonies that perished (a real setback count)
  cellUpgrades: { membrane: 0, protein: 0, rna: 0 },  // extra levels bought for each invention (Cell)
  oxygenCrisisSeen: false,       // the Great Oxygenation die-off has fired once (World)
  scene: 'forge',
  introSeen: false,
  howtoSeen: {},                 // sceneId -> true once the "how it works" guide was shown
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
