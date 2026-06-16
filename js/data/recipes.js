// recipes.js — the auditable chemistry table. Every entry is real.
// FUSION: nuclear reactions inside stars (Stellar Forge scene).
// MOLECULES: covalent compounds you assemble on the Bench (validated by formula + full valence).

// ---- Stellar nucleosynthesis (curated, real chains) ----
// inputs: array of element symbols smashed together; out: produced element.
export const FUSION = [
  { in: ['H', 'H'],            out: 'He', name: 'Proton–proton chain',
    note: 'Hydrogen nuclei fuse, step by step, into helium — the reaction that powers the Sun.' },
  { in: ['He', 'He', 'He'],   out: 'C',  name: 'Triple-alpha process',
    note: 'Three helium nuclei collide almost simultaneously to make carbon. It only happens in the cores of aging stars.' },
  { in: ['C', 'He'],          out: 'O',  name: 'Alpha capture',
    note: 'Carbon captures a helium nucleus to become oxygen.' },
  { in: ['C', 'H'],           out: 'N',  name: 'CNO cycle',
    note: 'Carbon catalyses hydrogen burning and, along the way, nitrogen is forged.' },
  { in: ['O', 'O'],           out: 'P',  name: 'Oxygen burning',
    note: 'In the late, frantic burning stages of a massive star, oxygen fuses into heavier elements — among them a little phosphorus.' },
  { in: ['P', 'H'],           out: 'S',  name: 'Proton capture',
    note: 'Deep in a massive star, phosphorus catches a single proton — a hydrogen nucleus — and turns into sulfur.' },
];

// ---- Molecules (Era 2: the early-Earth atmosphere & ocean) ----
// formula: required atom counts. A built cluster matches when its atom multiset
// equals `formula` AND every atom's valence is fully satisfied (no dangling bonds).
export const MOLECULES = [
  { id: 'H2',  name: 'Hydrogen gas',   formula: { H: 2 },        tier: 1,
    riddle: 'Two of the lightest, holding hands. The most common molecule in the cosmos.',
    fact: 'H₂ — two hydrogen atoms sharing a single bond. The most abundant molecule in the universe.' },
  { id: 'O2',  name: 'Oxygen gas',     formula: { O: 2 },        tier: 1,
    riddle: 'A double-bonded pair you cannot live without — yet early Earth had almost none.',
    fact: 'O₂ — a double bond between two oxygens. It only filled our skies after life invented photosynthesis.' },
  { id: 'N2',  name: 'Nitrogen gas',   formula: { N: 2 },        tier: 1,
    riddle: 'Bound by a triple bond so strong that almost nothing can break it. It fills the sky.',
    fact: 'N₂ — held by a triple bond, one of the strongest in nature. It makes up 78% of the atmosphere.' },
  { id: 'H2O', name: 'Water',          formula: { H: 2, O: 1 },  tier: 2,
    riddle: 'One greedy atom, two tiny partners, bent at an angle. The cradle of all life.',
    fact: 'H₂O — one oxygen bonded to two hydrogens at a 104.5° angle. Its bent shape makes it the universal solvent of life.' },
  { id: 'CO2', name: 'Carbon dioxide', formula: { C: 1, O: 2 },  tier: 2,
    riddle: 'A carbon flanked by two double-bonded partners, straight as an arrow. Volcanoes breathe it out.',
    fact: 'CO₂ — O=C=O, a straight molecule. The raw carbon that photosynthesis will one day turn into sugar.' },
  { id: 'CH4', name: 'Methane',        formula: { C: 1, H: 4 },  tier: 2,
    riddle: 'A carbon hugging four small partners in a perfect pyramid. Swamp gas, and a brick of early life.',
    fact: 'CH₄ — a carbon with four hydrogens in a tetrahedron. A key ingredient of the primordial atmosphere.' },
  { id: 'NH3', name: 'Ammonia',        formula: { N: 1, H: 3 },  tier: 2,
    riddle: 'Three small partners and a lone pair, sharp to the nose. It will lend its nitrogen to life.',
    fact: 'NH₃ — nitrogen with three hydrogens and a lone pair. The nitrogen source for the first amino acids.' },
  { id: 'H2S', name: 'Hydrogen sulfide', formula: { S: 1, H: 2 }, tier: 2,
    riddle: 'A sulfur cradling two small partners — the rotten-egg breath of volcanoes that fed the very first microbes.',
    fact: 'H₂S — hydrogen sulfide. It pours from deep-sea vents, and the earliest microbes drew their energy from it long before oxygen existed.' },
];

export function moleculeByFormula(counts) {
  const key = (o) => Object.keys(o).sort().map(k => k + o[k]).join('');
  const target = key(counts);
  return MOLECULES.find(m => key(m.formula) === target) || null;
}

export function fusionFor(symbols) {
  const norm = (a) => a.slice().sort().join(',');
  const target = norm(symbols);
  return FUSION.find(f => norm(f.in) === target) || null;
}
