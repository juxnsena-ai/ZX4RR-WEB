/* =========================================================
   INICIO: moto 3D girando, puntos interactivos y botón de acelerar
   ========================================================= */
(function () {
  'use strict';
  const ZX = (window.ZX = window.ZX || {});
  ZX.ui = ZX.ui || {};

  let pressed = false, idleTimer = null, els = {};

  function press(e) {
    if (e) e.preventDefault();
    if (pressed) return;
    pressed = true;
    ZX.audio.ensure();
    const sim = ZX.sim;
    clearTimeout(idleTimer);
    if (!sim.on) sim.start(true);
    if (sim.gear !== 0 && sim.speed < 3) sim.gear = 0;
    sim.throttleInput = 1;
    els.btn.classList.add('on');
  }
  function release() {
    if (!pressed) return;
    pressed = false;
    ZX.sim.throttleInput = 0;
    els.btn.classList.remove('on');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (ZX.current === 'inicio' && !pressed) ZX.sim.stop(); }, 6000);
  }

  ZX.ui.inicio = {
    init() {
      els.btn = ZX.$('#revBtn');
      els.rpm = ZX.$('#heroRpm');
      els.bar = ZX.$('#heroRpmBar');
      els.copy = ZX.$('#view-inicio .hero-copy');
      els.btn.addEventListener('pointerdown', (e) => { ZX.capture(els.btn, e); press(e); });
      els.btn.addEventListener('pointerup', release);
      els.btn.addEventListener('pointercancel', release);
      els.btn.addEventListener('lostpointercapture', release);
      els.btn.addEventListener('contextmenu', (e) => e.preventDefault());
      ZX.viewer.on('hotspot', (id) => ZX.go('despiece', { select: id }));
    },
    enter() {
      ZX.viewer.cleanState(false);
      ZX.viewer.preset('hero', 1.2);
      this.layout();
    },
    layout() {
      const r = els.copy.getBoundingClientRect();
      const st = ZX.$('#stage').getBoundingClientRect();
      if (window.innerWidth > 860) ZX.viewer.setSafeArea(Math.max(0, r.right - st.left + 10), 0, 0, 0);
      else ZX.viewer.setSafeArea(0, 0, 0, Math.max(0, st.bottom - r.top + 8));
    },
    leave() { release(); clearTimeout(idleTimer); },
    frame() {
      const s = ZX.sim;
      els.rpm.textContent = ZX.fmt(Math.round(s.rpm / 10) * 10);
      els.bar.style.width = Math.min(100, s.rpm / 160) + '%';
    },
    key(e, down) {
      if (e.code !== 'Space') return false;
      if (down) { if (!e.repeat) press(); } else release();
      return true;
    }
  };
})();
