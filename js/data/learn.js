// learn.js — "Learn about it" hints. These TEACH the real science and nudge toward the
// solution WITHOUT printing the exact recipe (that's what the paid "Reveal" is for).
// Keyed by element symbol (Forge), molecule id (Bench), item id (Lab), or stage id.

export const LEARN = {
  // ---- Forge: how each element is really made ----
  He: 'Helium is the ash of burning hydrogen. In a star’s core, the lightest element is crushed together until it fuses into something heavier. Gather hydrogen in the core and let gravity press it in.',
  C:  'Carbon can’t form from a simple pair — it needs a rare three-way pile-up of helium nuclei deep inside an aging star (the “triple-alpha” process). So make helium first, then crowd several of them together.',
  N:  'Nitrogen is forged in the CNO cycle, where carbon helps a star burn hydrogen. Try bringing carbon together with the lightest element of all.',
  O:  'Oxygen is born when carbon swallows a helium nucleus. You’ll need both of them in the core at once.',
  P:  'Phosphorus is forged in massive stars when oxygen nuclei are crushed into one another. Bring oxygen together with oxygen.',
  S:  'Sulfur sits higher on the “alpha ladder” — heavier nuclei capturing helium one after another. Try feeding helium to oxygen.',

  // ---- Bench: reason it out from valence ----
  H2:  'The simplest molecule there is: two atoms that each want a single bond, quietly satisfying each other.',
  O2:  'On its own, oxygen has no choice but to pair up. Each oxygen wants two bonds — so a lone pair must share a double bond to be content.',
  N2:  'Nitrogen craves three bonds. A lone pair of nitrogens can only satisfy each other by sharing all three — the strongest everyday bond there is.',
  H2O: 'Oxygen wants two bonds; each hydrogen offers just one. Ask yourself — how many hydrogens does it take to leave no bond unfilled?',
  CO2: 'Carbon wants four bonds, each oxygen wants two. A single carbon can satisfy a pair of oxygens — but only if every link is doubled.',
  CH4: 'Carbon wants four bonds; each hydrogen offers one. Count how many hydrogens it takes to fill carbon completely.',
  NH3: 'Nitrogen wants three bonds; each hydrogen offers one. How many hydrogens leave nitrogen satisfied?',
  H2S: 'Sulfur sits just below oxygen and behaves like it here — it wants two bonds. Two little partners are enough.',

  // ---- Lab: the real reaction + conditions, without the exact list ----
  HCN:          'A violent electrical jolt through the simplest carbon gas and the simplest nitrogen gas tears them apart — and the fragments recombine into this little poison.',
  glycine:      'This is the heart of the famous 1953 experiment: a bolt of lightning through a flask of early-Earth gases — the carbon one, the nitrogen one — and water. Amino acids appear.',
  alanine:      'Made the same way as its cousin glycine, by sparking the early air — but try swapping the water for a different carbon-bearing gas.',
  formaldehyde: 'Ultraviolet sunlight can split carbon dioxide and water apart and recombine them into this simple seed of sugars.',
  adenine:      'Astonishing but true: this DNA letter is nothing but that same little poison repeated — several copies, coaxed together with heat.',
  ribose:       'Warm a small crowd of that simple sugar-seed and the pieces link into a real five-carbon sugar (the formose reaction).',
  fatty_acid:   'In the heat of deep-sea vents, carbon dioxide and hydrogen are welded into long, greasy chains.',
  phosphate:    'Phosphorus only becomes useful to life once it’s clothed in oxygen — and that takes heat.',
  protein:      'Proteins are amino acids strung together, each link squeezing out a water — which needs heat. Use the amino acids you’ve already made.',
  nucleotide:   'A single genetic “letter” is three parts clicked together: a sugar, a base, and a phosphate. No extra energy required.',
  rna:          'String several genetic letters into a chain, with a little heat, and you get a strand that can carry — and copy — information.',
  membrane:     'Lipids are two-faced: one end loves water, the other flees it. Drop enough of them into water and they wrap themselves into a hollow shell, all on their own.',
  protocell:    'Life’s three inventions, brought together: a container to hold things in, a copier to carry information, and a worker to do jobs. You’ve already made all three.',

  // ---- Stage challenges ----
  cell:  'Protocells burn energy just to stay alive, and die if it runs out. Feeding them lets them grow, and a well-fed cell splits in two. The catch: your nutrient drops are limited and every new cell is another mouth — so feed steadily and never let the pool run dry.',
  world: 'Life, once it takes hold, spreads on its own — but slowly. The cells that learn to drink sunlight (photosynthesis) breathe out oxygen and let green life bloom across the planet. Give it time, and lend a hand by tapping where you’d like life to take root.',
};

export function learnFor(id) { return LEARN[id] || null; }
