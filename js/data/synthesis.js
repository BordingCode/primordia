// synthesis.js — the curated synthesis tree from molecules → building blocks → polymers → protocell.
// Reagents combine UNDER A CONDITION (energy). Same reagents + different energy = no reaction.
// Every recipe is real, curated origin-of-life chemistry.

export const ENERGIES = [
  { id: 'none',      name: 'No energy',          glyph: '∅', color: '#8aa0c0' },
  { id: 'lightning', name: 'Lightning',          glyph: '⚡', color: '#9ad7ff' },
  { id: 'uv',        name: 'UV light',           glyph: '☀', color: '#c9a8ff' },
  { id: 'heat',      name: 'Hydrothermal heat',  glyph: '♨', color: '#ff9a5c' },
];

// Building blocks, polymers, and the protocell. `kind` drives visuals/grouping.
export const ITEMS = {
  HCN:          { id: 'HCN', name: 'Hydrogen cyanide', abbr: 'HCN', formula: 'HCN', color: '#b6f0ff', kind: 'block',
                  riddle: 'A spark through methane and ammonia breeds this little poison — yet five of it spell a letter of the code.',
                  fact: 'HCN — hydrogen cyanide. Forms when lightning strikes methane and ammonia. The feedstock for life’s bases.' },
  glycine:      { id: 'glycine', name: 'Glycine', abbr: 'Gly', formula: 'C₂H₅NO₂', color: '#8ef0d0', kind: 'block',
                  riddle: 'The smallest of the twenty letters that spell proteins, first born in Miller’s flask.',
                  fact: 'Glycine — the simplest amino acid. Produced abundantly in the 1953 Miller–Urey spark experiment.' },
  alanine:      { id: 'alanine', name: 'Alanine', abbr: 'Ala', formula: 'C₃H₇NO₂', color: '#7fe6b8', kind: 'block',
                  riddle: 'Glycine’s slightly larger cousin, also sparked from the early air.',
                  fact: 'Alanine — a second amino acid produced in the Miller–Urey experiment.' },
  formaldehyde: { id: 'formaldehyde', name: 'Formaldehyde', abbr: 'CH₂O', formula: 'CH₂O', color: '#ffd9a8', kind: 'block',
                  riddle: 'Sunlight on air and water makes this simple sting; gather five and warm them into a sugar.',
                  fact: 'Formaldehyde — made by UV light acting on CO₂ and water. The seed of sugars.' },
  ribose:       { id: 'ribose', name: 'Ribose', abbr: 'Rib', formula: 'C₅H₁₀O₅', color: '#ffe06b', kind: 'block',
                  riddle: 'Five breaths of formaldehyde, warmed, coil into the sugar that backbones RNA.',
                  fact: 'Ribose — a 5-carbon sugar from the formose reaction. The “R” in RNA.' },
  adenine:      { id: 'adenine', name: 'Adenine', abbr: 'Ade', formula: 'C₅H₅N₅', color: '#ff8fbf', kind: 'block',
                  riddle: 'Five of that little poison, warmed together, spell the first letter of the genetic code.',
                  fact: 'Adenine — a base of DNA & RNA. Remarkably, it is exactly five HCN molecules joined together (Oró, 1961).' },
  fatty_acid:   { id: 'fatty_acid', name: 'Fatty acid', abbr: 'Lipid', formula: '~C₁₂', color: '#ffc27a', kind: 'block',
                  riddle: 'Carbon and hydrogen drawn long in a vent’s heat — one end loves water, the other flees it.',
                  fact: 'A fatty acid — a long carbon chain with a water-loving head. The stuff of the first membranes.' },
  phosphate:    { id: 'phosphate', name: 'Phosphate', abbr: 'PO₄', formula: 'PO₄', color: '#ffb24d', kind: 'block',
                  riddle: 'Phosphorus dressed in oxygen — the spark of ATP and the rails of the genetic ladder.',
                  fact: 'Phosphate — phosphorus bound to oxygen. Life’s energy currency and the backbone of RNA/DNA.' },
  protein:      { id: 'protein', name: 'Protein', abbr: 'Prot', color: '#54d7ff', kind: 'polymer',
                  riddle: 'Thread amino acids together, shedding water at each knot, and a worker of the cell is born.',
                  fact: 'A protein — amino acids linked by peptide bonds (each releasing water). Life’s machines and catalysts.' },
  nucleotide:   { id: 'nucleotide', name: 'Nucleotide', abbr: 'Nuc', color: '#9ad0ff', kind: 'polymer',
                  riddle: 'Sugar, base and phosphate clasped as one — a single letter ready to be written.',
                  fact: 'A nucleotide — ribose + a base + phosphate. The letter from which RNA is written.' },
  rna:          { id: 'rna', name: 'RNA', abbr: 'RNA', color: '#8ef0d0', kind: 'polymer',
                  riddle: 'Chain the letters and they both carry the message and fold to do the work — the first life may have been only this.',
                  fact: 'RNA — a chain of nucleotides. In the RNA-world hypothesis it both stored information and catalysed reactions: it could copy itself.' },
  membrane:     { id: 'membrane', name: 'Membrane', abbr: '◯', color: '#7fd0ff', kind: 'polymer',
                  riddle: 'Set the lipids loose in water and they will, untouched, wrap themselves into a hollow sphere.',
                  fact: 'A lipid bilayer — fatty acids self-assemble in water into a hollow vesicle. The first boundary between life and non-life.' },
  protocell:    { id: 'protocell', name: 'Protocell', abbr: '⬭', color: '#a8ffe0', kind: 'cell',
                  riddle: 'A bubble holding a self-copying thread and a worker or two — not quite alive, not quite not.',
                  fact: 'A protocell — a membrane enclosing RNA and proteins. The very threshold of life.' },
};

// reagents are multisets keyed by molecule id (recipes.js) OR item id (above) OR element symbol.
export const SYNTH = [
  { reagents: { CH4: 1, NH3: 1 },            energy: 'lightning', product: 'HCN',
    note: 'Lightning splits methane and ammonia and they recombine into hydrogen cyanide.' },
  { reagents: { CH4: 1, NH3: 1, H2O: 1 },    energy: 'lightning', product: 'glycine',
    note: 'The Miller–Urey reaction: a spark through the early atmosphere yields amino acids.' },
  { reagents: { CH4: 1, NH3: 1, CO2: 1 },    energy: 'lightning', product: 'alanine',
    note: 'Another Miller–Urey product — a second amino acid.' },
  { reagents: { CO2: 1, H2O: 1 },            energy: 'uv',        product: 'formaldehyde',
    note: 'Ultraviolet light drives CO₂ and water to formaldehyde.' },
  { reagents: { HCN: 5 },                    energy: 'heat',      product: 'adenine',
    note: 'Five hydrogen cyanides condense into adenine — a real prebiotic route (Oró, 1961).' },
  { reagents: { formaldehyde: 5 },           energy: 'heat',      product: 'ribose',
    note: 'The formose reaction: formaldehyde oligomerises into sugars including ribose.' },
  { reagents: { CO2: 1, H2: 1 },             energy: 'heat',      product: 'fatty_acid',
    note: 'At hydrothermal vents, CO₂ and hydrogen build long fatty-acid chains.' },
  { reagents: { P: 1, O2: 1 },               energy: 'heat',      product: 'phosphate',
    note: 'Phosphorus oxidises into phosphate, life’s energy and information currency.' },
  { reagents: { glycine: 2, alanine: 1 },    energy: 'heat',      product: 'protein',
    note: 'Heat on a mineral surface links amino acids by peptide bonds, shedding water.' },
  { reagents: { ribose: 1, adenine: 1, phosphate: 1 }, energy: 'none', product: 'nucleotide',
    note: 'Sugar, base and phosphate join into a single nucleotide.' },
  { reagents: { nucleotide: 3 },             energy: 'heat',      product: 'rna',
    note: 'Nucleotides polymerise into a strand of RNA that can copy itself.' },
  { reagents: { fatty_acid: 3, H2O: 1 },     energy: 'none',      product: 'membrane',
    note: 'In water, fatty acids spontaneously self-assemble into a membrane.' },
  { reagents: { membrane: 1, rna: 1, protein: 1 }, energy: 'none', product: 'protocell',
    note: 'A membrane wraps RNA and proteins: the first protocell.' },
];

export function item(id) { return ITEMS[id] || null; }
export function energy(id) { return ENERGIES.find(e => e.id === id); }

function eq(a, b) {
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(k => a[k] === b[k]);
}
function isSubset(part, whole) {
  return Object.keys(part).every(k => (whole[k] || 0) >= part[k]) &&
         Object.keys(part).length > 0;
}

// Returns { status, recipe?, product? }
// status: 'ok' | 'wrong-energy' | 'incomplete' | 'none' | 'empty'
export function synthMatch(counts, energyId) {
  if (!counts || Object.keys(counts).length === 0) return { status: 'empty' };
  const exact = SYNTH.find(r => eq(r.reagents, counts));
  if (exact) {
    if (exact.energy === energyId) return { status: 'ok', recipe: exact, product: exact.product };
    return { status: 'wrong-energy', recipe: exact };
  }
  // partial: the player is on the way to some recipe
  const partial = SYNTH.find(r => isSubset(counts, r.reagents) && !eq(r.reagents, counts));
  if (partial) return { status: 'incomplete' };
  return { status: 'none' };
}

// every product id, for codex / objective listing in synthesis order
export const SYNTH_PRODUCTS = SYNTH.map(r => r.product);
