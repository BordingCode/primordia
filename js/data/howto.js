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
    intro: 'You built a protocell from three inventions — a Membrane, an RNA copier and protein Enzymes. Keep the colony alive and growing.',
    steps: [
      'Tap the pool to release <b>nutrients</b> (limited, refilling — the dots at the bottom). Cells drift to food, grow, and a well-fed cell <b>splits in two</b>.',
      'Spend <b>insight</b> (top-right ✦) on your three inventions — each does a real job: <b>Membrane</b> stops energy leaking out, <b>Enzymes</b> wring more energy from each meal, <b>RNA</b> makes cells divide sooner.',
      'Beware the <b>UV flares</b>: early Earth had no ozone, so raw ultraviolet sweeps the pool and drains every cell. A stronger <b>Membrane</b> is your shield.',
      'If a cell’s energy ring empties, it <b>dies</b>. Lose them all and you start again from one. Reach the target colony to bring the world to life.',
    ],
    tip: 'Membrane is your shield; Enzymes and RNA are your engine. Upgrade whichever is your weak link.',
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
