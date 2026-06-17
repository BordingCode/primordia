// quiz.js — conceptual quick-checks + spaced-review content for Primordia.
// Every distractor is a real, documented misconception (vetted by the science checker);
// each option's "why" corrects it, so it teaches even when picked.

export const QUIZ_ORDER = ['forge', 'bench', 'lab', 'cell', 'world'];

export const QUIZ = {
  forge: [
    { q: 'The carbon in your bones and the oxygen you breathe — where were these atoms actually made?',
      options: [
        { t: 'Inside stars, by squashing lighter nuclei together (fusion).', correct: true, why: 'Yes! Every carbon, oxygen and nitrogen atom was fused in the heart of a star and scattered when it died. You really are made of star-stuff.' },
        { t: 'Here on Earth, when the planet first formed and cooled.', why: 'Nope — Earth can’t build new elements. It only inherited atoms that stars had already forged long before the planet existed.' },
        { t: 'All at once in the Big Bang, like everything else.', why: 'The Big Bang made mostly hydrogen and helium — almost nothing heavier. Carbon, oxygen and the rest had to wait for stars to forge them.' },
      ] },
    { q: 'Why can’t a small, cool star forge heavy elements like a giant, blazing-hot one can?',
      options: [
        { t: 'Fusing heavier nuclei needs far more heat and crushing pressure to force them together.', correct: true, why: 'Right — heavier nuclei push back harder, so only the hottest, densest stellar cores can slam them into fusing.' },
        { t: 'Small stars simply run out of hydrogen before they get the chance.', why: 'It’s not about running out — even with fuel left, a cool core never reaches the temperature and pressure heavy fusion demands.' },
        { t: 'Heavy elements are heavier, so gravity stops them rising up to fuse.', why: 'Fusion isn’t about elements “rising” — it’s nuclei colliding hard enough to merge, which takes extreme heat and pressure, not lightness.' },
      ] },
  ],
  bench: [
    { q: 'When two atoms “bond”, what’s really holding them together?',
      options: [
        { t: 'They share electrons, and the shared electrons pull both nuclei in.', correct: true, why: 'Exactly — a covalent bond is a shared pair of electrons sitting between the two atoms, tugging on both at once.' },
        { t: 'A tiny stick of “bond glue” sets between them and holds them in place.', why: 'There’s no glue or stick — that’s just how model kits draw it. The bond IS the shared electrons, not a separate sticky thing.' },
        { t: 'Their nuclei snap together like two fridge magnets.', why: 'Nuclei are all positive, so they actually repel. It’s the shared electrons in between — not the nuclei — that do the holding.' },
      ] },
    { q: 'Oxygen wants 2 bonds and hydrogen wants 1. So why is water H₂O — two hydrogens — and not one?',
      options: [
        { t: 'One hydrogen fills only one of oxygen’s two bond slots, so you need a second to fill them both.', correct: true, why: 'Right! Oxygen has two “hands” to fill. Each hydrogen takes one, so it takes two to leave nothing hungry.' },
        { t: 'Water just happens to be written H₂O by tradition; one H would bond fine too.', why: 'Not tradition — a single H would leave one of oxygen’s bond slots empty and unstable. The formula is forced by the bonding.' },
        { t: 'Oxygen is bigger, so it needs two hydrogens to physically cover its surface.', why: 'It’s not about covering surface area — it’s bond count. Oxygen needs exactly two bonds filled, so exactly two hydrogens.' },
      ] },
  ],
  lab: [
    { q: 'You’ve got the exact ingredients for hydrogen cyanide in the flask. You mix them and… nothing. Why?',
      options: [
        { t: 'Right ingredients, wrong conditions — they need a violent jolt of energy (lightning) to react.', correct: true, why: 'Yes! Stable gases just drift past each other. It takes a spark of lightning to rip them apart so the pieces can recombine.' },
        { t: 'If the ingredients are correct, a reaction always happens on its own eventually.', why: 'Not true — many correct mixes do nothing without an energy source. Conditions are as essential as the ingredients themselves.' },
        { t: 'You must have the wrong ingredients; the right ones always react instantly.', why: 'The ingredients are right. What’s missing is energy — without lightning, UV or heat, stable molecules simply won’t react.' },
      ] },
    { q: 'When two building blocks link into a chain, what gets squeezed out at the joint — and what drives it?',
      options: [
        { t: 'A water molecule is squeezed out, and it takes energy (like heat) to drive the linking.', correct: true, why: 'Right — building chains sheds a water at every link (“dehydration synthesis”), and that uphill step needs an energy source.' },
        { t: 'Nothing is lost; the two pieces just snap together for free.', why: 'Not free — each new bond expels a water and is energetically uphill. That’s why these links need energy to form.' },
        { t: 'A bubble of hydrogen gas is released as the two pieces fuse.', why: 'It’s water (H₂O) that leaves, not hydrogen gas. Linking building blocks is dehydration — it sheds water, not H₂.' },
      ] },
  ],
  cell: [
    { q: 'A campfire grows, “eats” wood, gives off heat and spreads. Is fire alive?',
      options: [
        { t: 'No — it has no cell or membrane and can’t copy itself; it just spreads a chemical reaction.', correct: true, why: 'Right. Life needs a container, a metabolism AND a way to replicate. Fire spreads, but it isn’t a living thing.' },
        { t: 'Yes — it eats, grows and moves, so it ticks the boxes for life.', why: 'Growing and “eating” aren’t enough. Fire has no membrane and can’t reproduce its own kind — so it isn’t alive.' },
        { t: 'Yes — anything that uses energy and changes its surroundings is alive.', why: 'Lots of non-living things use energy (engines, storms). Life needs a cell, a metabolism and replication together.' },
      ] },
    { q: 'Your protocell forms at last. What’s the LEAST it needs to count as a living cell?',
      options: [
        { t: 'A wall to hold it together, a way to use energy, and a way to copy itself.', correct: true, why: 'Yes — membrane, metabolism and replication. Miss any one and it’s just chemistry, not life.' },
        { t: 'Just a blob of the right chemicals all mixed together in one spot.', why: 'A puddle of the right molecules isn’t alive. Without a membrane, an energy cycle and a copier, it’s only a mixture.' },
        { t: 'Mostly just a wall — once it’s wrapped up, it’s basically alive.', why: 'A membrane alone is an empty bubble. It also needs a metabolism to power it and a copier (RNA) to reproduce.' },
      ] },
  ],
  world: [
    { q: 'Early life began breathing out oxygen. For the creatures already living back then, that oxygen was…',
      options: [
        { t: 'A deadly poison — it killed off most of the life that existed at the time.', correct: true, why: 'Right. The first oxygen-makers triggered the Great Oxidation — a planet-wide die-off of the older, oxygen-hating life.' },
        { t: 'An instant gift — life everywhere thrived the moment oxygen appeared.', why: 'The opposite, at first. Early life had no defence against oxygen; it was toxic and caused one of Earth’s first mass extinctions.' },
        { t: 'Completely harmless — oxygen has always been safe for every living thing.', why: 'Not always. Oxygen is highly reactive; to the early world it was a poison, long before anything evolved to use it.' },
      ] },
    { q: 'Where did all the oxygen in our air originally come from?',
      options: [
        { t: 'It was breathed out as waste by tiny photosynthetic life.', correct: true, why: 'Yes — microbes like cyanobacteria drank sunlight and released oxygen as waste, slowly filling the sky over billions of years.' },
        { t: 'It was there in the air from the moment Earth formed.', why: 'No — early Earth’s air had almost no free oxygen. It only built up after photosynthetic life invented it.' },
        { t: 'It bubbled up out of volcanoes with the other gases.', why: 'Volcanoes pump out CO₂, water vapour and sulfur gases — not free oxygen. The O₂ came from living things, not eruptions.' },
      ] },
  ],
};
