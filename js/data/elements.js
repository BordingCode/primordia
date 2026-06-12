// elements.js — the real building blocks. CHNOPS + He.
// Colours are a luminous/bioluminescent take on CPK conventions.
// `valence` = number of covalent bond slots the atom wants filled.

export const ELEMENTS = {
  H:  { sym: 'H',  name: 'Hydrogen',   z: 1,  valence: 1, mass: 1,
        color: '#dff3ff', glow: '#9fe6ff', r: 15,
        fact: 'The first and simplest element. Forged in the Big Bang, it makes up ~90% of all atoms in the universe.' },
  He: { sym: 'He', name: 'Helium',     z: 2,  valence: 0, mass: 4,
        color: '#ffe9b0', glow: '#ffd66b', r: 17,
        fact: 'A noble gas — its electron shell is full, so it refuses to bond. Born when two hydrogen nuclei fuse inside stars.' },
  C:  { sym: 'C',  name: 'Carbon',     z: 6,  valence: 4, mass: 12,
        color: '#7d8aa0', glow: '#54d7ff', r: 22,
        fact: 'The backbone of all life. With four bonds it builds endless chains and rings. Forged by the triple-alpha process in dying stars.' },
  N:  { sym: 'N',  name: 'Nitrogen',   z: 7,  valence: 3, mass: 14,
        color: '#7fa8ff', glow: '#5c8cff', r: 20,
        fact: 'Essential to amino acids and DNA. Made in stars by the CNO cycle. 78% of the air you breathe is N₂.' },
  O:  { sym: 'O',  name: 'Oxygen',     z: 8,  valence: 2, mass: 16,
        color: '#ff8f7a', glow: '#ff5c5c', r: 21,
        fact: 'Greedy for electrons. Forms water, carbon dioxide, and the air that complex life needs. Forged when carbon fuses with helium.' },
  P:  { sym: 'P',  name: 'Phosphorus', z: 15, valence: 5, mass: 31,
        color: '#ffb24d', glow: '#ff9a3d', r: 24,
        fact: 'The energy currency of life (ATP) and the spine of DNA. Scattered into space by supernovae.' },
  S:  { sym: 'S',  name: 'Sulfur',     z: 16, valence: 2, mass: 32,
        color: '#ffe26b', glow: '#ffd23d', r: 23,
        fact: 'Folds proteins and powered the first microbes at deep-sea vents. Forged in massive stars.' },
};

export const ELEMENT_LIST = Object.keys(ELEMENTS);

export function el(sym) { return ELEMENTS[sym]; }
