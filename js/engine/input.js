// input.js — unified pointer (mouse + touch) with drag, in CSS pixels.
export function createInput(target) {
  const state = {
    x: 0, y: 0, down: false, justDown: false, justUp: false,
    dragId: null, // scene-owned handle for what's being dragged
  };
  const listeners = { down: [], move: [], up: [] };

  function pos(e) {
    const rect = target.getBoundingClientRect();
    const p = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  }
  function onDown(e) {
    const { x, y } = pos(e); state.x = x; state.y = y;
    state.down = true; state.justDown = true;
    listeners.down.forEach(f => f(state));
    e.preventDefault();
  }
  function onMove(e) {
    const { x, y } = pos(e); state.x = x; state.y = y;
    listeners.move.forEach(f => f(state));
    if (state.down) e.preventDefault();
  }
  function onUp(e) {
    const { x, y } = pos(e); state.x = x; state.y = y;
    state.down = false; state.justUp = true;
    listeners.up.forEach(f => f(state));
    state.dragId = null;
  }

  target.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  target.addEventListener('touchstart', onDown, { passive: false });
  target.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onUp);

  return {
    state,
    on(evt, fn) { listeners[evt].push(fn); },
    endFrame() { state.justDown = false; state.justUp = false; },
  };
}
