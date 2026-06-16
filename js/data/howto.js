// howto.js — plain-language "how this stage works" guides. These teach the PROCESS
// (what you actually do in the game), separate from the science hints in learn.js.
// Shown automatically the first time you enter a stage, and reopenable with the ? button.

export const HOWTO = {
  forge: {
    title: 'Stellar Forge',
    intro: 'You are inside a star, building the elements of life from raw nuclei.',
    steps: [
      'Drag a glowing nucleus from the tray at the bottom into the central <b>core</b>.',
      'Gravity pulls everything in the core together. When the right nuclei meet, they <b>fuse</b> into a heavier element with a flash.',
      'Start simple: drag <b>two hydrogens</b> together and they become helium.',
      'Then pile up heavier nuclei to climb toward <b>carbon, oxygen and nitrogen</b> — your goals are listed in the panel.',
    ],
    tip: 'Stuck on one element? Tap <b>“Learn”</b> on its goal for a clue about how it forms.',
  },
  bench: {
    title: 'The Bench',
    intro: 'Here you snap atoms together into the first molecules.',
    steps: [
      'Drag atoms from the tray and bring them <b>close together</b> — they snap into bonds on their own.',
      'Every atom wants a set number of bonds (the <b>×1, ×2…</b> under each tray atom). An atom still missing bonds <b>glows and pulses</b> — it is “hungry”.',
      'A molecule is finished only when <b>no atom is hungry</b>. Put two hydrogens on an oxygen and watch them all go calm — that’s water.',
      'Too many atoms? The leftovers stay hungry — drag them away. The <b>✕</b> button clears the table.',
    ],
    tip: 'Tap <b>“Learn”</b> on a molecule to be reminded how many bonds each atom wants.',
  },
  lab: {
    title: 'Synthesis Lab',
    intro: 'Now you combine whole molecules into the building blocks of life.',
    steps: [
      'Tap an ingredient at the bottom to load it into a <b>slot</b> around the reactor. Tap a loaded slot to clear it.',
      'Pick an <b>energy source</b> — lightning, UV, heat, or none. <b>This matters:</b> the same ingredients react differently (or not at all) depending on the energy.',
      'Tap the <b>REACT</b> circle in the middle.',
      'If nothing forms, the game tells you <b>why</b> — “wrong energy” or “something missing” is a clue, not a dead end. Adjust and try again.',
    ],
    tip: 'Tap <b>“Learn”</b> on a goal to learn which reaction and which energy made it in real life.',
  },
  cell: {
    title: 'First Life',
    intro: 'You’ve built a protocell — now keep it alive long enough to multiply.',
    steps: [
      'Your protocell drifts in the pool, slowly <b>burning energy</b>. If it runs out, it <b>dies</b>.',
      'Tap anywhere in the pool to release <b>nutrients</b>. Your supply is limited and refills slowly (the dots at the bottom).',
      'Cells drift toward food and eat it. A <b>well-fed cell grows and splits in two</b>.',
      'Keep the <b>whole colony</b> fed as it grows. Reach the target number of cells to bring the world to life.',
    ],
    tip: 'Spread food where the cells are, and don’t let your nutrient dots run all the way out.',
  },
  world: {
    title: 'The World',
    intro: 'This planet grows out of everything you make.',
    steps: [
      'Every molecule you discover changes the world — its <b>air and oceans</b> build up over time.',
      'Once your colony takes hold, tap the planet to spread <b>photosynthetic life</b>. It greens the world and breathes out <b>oxygen</b>.',
      'But that oxygen is <b>poison</b> to early life. As it builds, it triggers the <b>Great Oxygenation</b> — a real planet-wide die-off — before a hardy, oxygen-breathing world recovers.',
    ],
    tip: 'Keep tapping through the oxygen crisis — life adapts, and the world comes back greener and bluer.',
  },
};
