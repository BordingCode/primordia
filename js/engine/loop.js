// loop.js — fixed-timestep update + render-on-raf.
export function createLoop({ update, render, step = 1 / 60, maxFrame = 0.25 }) {
  let last = 0, acc = 0, raf = 0, running = false;
  function frame(now) {
    if (!running) return;
    const t = now / 1000;
    let dt = last ? t - last : step;
    last = t;
    if (dt > maxFrame) dt = maxFrame;
    acc += dt;
    let steps = 0;
    while (acc >= step && steps < 5) { update(step); acc -= step; steps++; }
    render(dt);
    raf = requestAnimationFrame(frame);
  }
  return {
    start() { if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}
