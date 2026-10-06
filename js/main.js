/* =========================================================
   CONTROLADOR PRINCIPAL: navegación, bucle, teclado, sonido
   ========================================================= */
(function () {
  'use strict';
  const ZX = (window.ZX = window.ZX || {});
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  ZX.$ = $; ZX.$$ = $$;
  ZX.ui = ZX.ui || {};
  ZX.capture = function (el, e) { try { el.setPointerCapture(e.pointerId); } catch (err) { /* puntero no capturable */ } };

  const VIEWS = ['inicio', 'despiece', 'cockpit', 'configurador', 'comparativa', 'cotizacion', 'ficha'];
  const STAGE = { inicio: 'showcase', despiece: 'explore', configurador: 'config' };
  const ENGINE_VIEWS = ['inicio', 'despiece', 'cockpit'];
  let current = null, pendingOpts = null;

  // ---------- Almacenamiento local seguro ----------
  ZX.store = {
    get(k, def) { try { const v = localStorage.getItem('zx4rr.' + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem('zx4rr.' + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  };

  // ---------- Avisos ----------
  ZX.toast = function (msg, type) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = msg;
    box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; }, 2300);
    setTimeout(() => el.remove(), 2700);
  };

  // ---------- Formato ----------
  ZX.fmt = function (n, dec) {
    return Number(n).toLocaleString('es-ES', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0, useGrouping: true });
  };

  // ---------- Configuración compartida (configurador ↔ cotización ↔ ficha) ----------
  function defaultConfig() {
    const p = ZX.PAINT_PRESETS[0];
    return {
      preset: p.id, colors: { p1: p.p1, p2: p.p2, p3: p.p3 },
      frameId: 'green', wheelId: 'black', exhaust: 'stock',
      acc: { screen: false, cowl: false, sliders: false, tankpad: false, stripes: false, axle: false }
    };
  }
  function resolved(cfg) {
    const fr = ZX.FRAME_COLORS.find((f) => f.id === cfg.frameId) || ZX.FRAME_COLORS[0];
    const wh = ZX.WHEEL_COLORS.find((w) => w.id === cfg.wheelId) || ZX.WHEEL_COLORS[0];
    return { colors: cfg.colors, frame: fr.hex, wheel: wh.hex, exhaust: cfg.exhaust, acc: cfg.acc };
  }
  ZX.configListeners = [];
  ZX.setConfig = function (patch) {
    const c = ZX.config;
    if (patch.acc) { c.acc = Object.assign({}, c.acc, patch.acc); delete patch.acc; }
    Object.assign(c, patch);
    ZX.viewer.applyConfig(resolved(c));
    ZX.store.set('config', c);
    ZX.configVersion = (ZX.configVersion || 0) + 1;
    ZX.configListeners.forEach((f) => f(c));
  };
  ZX.configName = function (cfg) {
    const p = ZX.PAINT_PRESETS.find((x) => x.id === cfg.preset);
    return p ? p.name : 'Personalizado';
  };
  // Desglose de precio en USD (valores ilustrativos)
  ZX.priceLines = function (cfg, base) {
    const lines = [{ label: 'Kawasaki Ninja ZX-4RR', sub: 'Precio base de referencia', usd: base }];
    lines.push(cfg.preset === 'custom'
      ? { label: 'Pintura personalizada', sub: 'Combinación de colores a medida', usd: 350 }
      : { label: 'Color ' + ZX.configName(cfg), sub: 'Decoración de catálogo', usd: 0 });
    const fr = ZX.FRAME_COLORS.find((f) => f.id === cfg.frameId);
    lines.push({ label: 'Chasis ' + fr.name.toLowerCase(), sub: cfg.frameId === 'green' ? 'Acabado de serie' : 'Pintura de chasis opcional', usd: cfg.frameId === 'green' ? 0 : 180 });
    const wh = ZX.WHEEL_COLORS.find((w) => w.id === cfg.wheelId);
    lines.push({ label: 'Llantas ' + wh.name.toLowerCase(), sub: cfg.wheelId === 'black' ? 'Acabado de serie' : 'Llantas en color', usd: cfg.wheelId === 'black' ? 0 : 220 });
    const ex = ZX.EXHAUSTS.find((e) => e.id === cfg.exhaust);
    lines.push({ label: 'Escape: ' + ex.name, sub: ex.desc, usd: ex.price });
    ZX.ACCESSORIES.forEach((a) => { if (cfg.acc[a.id]) lines.push({ label: a.name, sub: 'Accesorio', usd: a.price }); });
    return lines;
  };

  // ---------- Navegación ----------
  ZX.go = function (view, opts) {
    if (VIEWS.indexOf(view) < 0) return;
    if (location.hash !== '#' + view) { pendingOpts = opts || null; location.hash = view; }
    else show(view, opts);
  };
  function route() {
    let v = location.hash.replace('#', '');
    if (VIEWS.indexOf(v) < 0) v = 'inicio';
    const o = pendingOpts; pendingOpts = null;
    show(v, o);
  }
  function show(view, opts) {
    const ui = ZX.ui[view];
    if (current === view) { if (opts && ui && ui.enter) ui.enter(opts); return; }
    const prev = current;
    if (prev && ZX.ui[prev] && ZX.ui[prev].leave) ZX.ui[prev].leave();
    current = view;
    ZX.current = view;
    document.body.dataset.view = view;
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + view));
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.go === view));
    const stage = STAGE[view] || 'off';
    document.body.dataset.stage = stage === 'off' ? 'off' : 'on';
    ZX.viewer.setMode(stage);
    if (ENGINE_VIEWS.indexOf(view) < 0 && (ZX.sim.on || ZX.sim.starting)) ZX.sim.stop();
    if (ui && ui.enter) ui.enter(opts || {});
    requestAnimationFrame(() => { if (ZX.ui[view] && ZX.ui[view].layout) ZX.ui[view].layout(); });
  }
  ZX.relayout = function () { const ui = ZX.ui[current]; if (ui && ui.layout) ui.layout(); };

  // ---------- Modales ----------
  ZX.openModal = function (el) { el.hidden = false; };
  ZX.closeModal = function (el) { el.hidden = true; };
  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) { e.preventDefault(); ZX.go(go.dataset.go); return; }
    const close = e.target.closest('[data-close]');
    if (close) { const m = close.closest('.modal'); if (m) { ZX.closeModal(m); if (m.onclose) m.onclose(); } return; }
    if (e.target.classList && e.target.classList.contains('modal')) { ZX.closeModal(e.target); if (e.target.onclose) e.target.onclose(); }
  });

  // ---------- Arranque ----------
  ZX.boot = function () {
    try {
      ZX.audio = new ZX.EngineAudio();
      ZX.viewer = ZX.createViewer($('#stage'));
    } catch (err) {
      console.error(err);
      $('#ldMsg').innerHTML = 'No se pudo iniciar el visor 3D en este navegador.<br>Prueba con una versión reciente de Chrome, Edge, Firefox o Safari.';
      return;
    }
    ZX.config = Object.assign(defaultConfig(), ZX.store.get('config', {}));
    if (!ZX.config.acc) ZX.config.acc = defaultConfig().acc;
    ZX.viewer.applyConfig(resolved(ZX.config));

    VIEWS.forEach((v) => { const ui = ZX.ui[v]; if (ui && ui.init) ui.init(); });

    // Sonido ligado a la simulación
    const sim = ZX.sim, audio = ZX.audio;
    sim.on_('starter', () => { audio.ensure(); audio.starter(); });
    sim.on_('shift', (d) => { audio.shift(d.qs); if (d.dir < 0 && d.blip && audio.alive) audio.pops(2); });
    sim.on_('pops', () => audio.pops());
    sim.on_('warn', (m) => { if (current !== 'cockpit') ZX.toast(m, 'warn'); });

    // Silencio
    const muteBtn = $('#muteBtn');
    function setMuted(m) {
      audio.setMuted(m);
      muteBtn.classList.toggle('off', m);
      muteBtn.innerHTML = m ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
      ZX.store.set('muted', m);
    }
    ZX.setMuted = setMuted;
    muteBtn.addEventListener('click', () => setMuted(!audio.muted));
    if (ZX.store.get('muted', false)) setMuted(true);

    // Indicador de motor encendido
    const pill = $('#enginePill'), epRpm = $('#epRpm');
    $('#epStop').addEventListener('click', () => sim.stop());

    // Guía rápida
    const help = $('#helpModal');
    $('#helpBtn').addEventListener('click', () => ZX.openModal(help));

    // Teclado
    const typing = (e) => { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable); };
    window.addEventListener('keydown', (e) => {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const ui = ZX.ui[current];
      if (ui && ui.key && ui.key(e, true) === true) { e.preventDefault(); return; }
      if (e.repeat) return;
      if (/^Digit[1-7]$/.test(e.code)) { ZX.go(VIEWS[+e.code.slice(5) - 1]); return; }
      if (e.key === 'm' || e.key === 'M') { setMuted(!audio.muted); return; }
      if (e.key === '?') { ZX.openModal(help); return; }
      if (e.key === 'Escape') { $$('.modal').forEach((m) => { if (!m.hidden) { ZX.closeModal(m); if (m.onclose) m.onclose(); } }); }
    });
    window.addEventListener('keyup', (e) => {
      if (typing(e)) return;
      const ui = ZX.ui[current];
      if (ui && ui.key && ui.key(e, false) === true) e.preventDefault();
    });

    // Pausar el sonido si la pestaña queda oculta
    document.addEventListener('visibilitychange', () => {
      if (!audio.ctx) return;
      if (document.hidden) audio.ctx.suspend(); else audio.ctx.resume();
    });

    // Redibujar decoración cuando cargan las fuentes
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('900 64px Orbitron'), document.fonts.load('800 64px Orbitron'), document.fonts.load('700 20px Rajdhani')])
        .then(() => ZX.viewer.bike.redrawLivery()).catch(() => {});
    }

    window.addEventListener('resize', () => ZX.relayout());
    window.addEventListener('hashchange', route);
    route();

    // Bucle principal
    let last = performance.now(), pillT = 0;
    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      sim.update(dt);
      audio.update(sim);
      ZX.viewer.frame(dt, sim);
      const ui = ZX.ui[current];
      if (ui && ui.frame) ui.frame(dt);
      pillT += dt;
      if (pillT > 0.08) {
        pillT = 0;
        const showPill = sim.on || sim.starting;
        if (pill.hidden === showPill) pill.hidden = !showPill;
        if (showPill) epRpm.textContent = ZX.fmt(Math.round(sim.rpm / 50) * 50);
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    setTimeout(() => {
      $('#loader').classList.add('done');
      if (!ZX.store.get('helpSeen', false)) { ZX.openModal(help); ZX.store.set('helpSeen', true); }
    }, 350);
  };

  // Si Three.js no llega a cargar (sin conexión o CDN bloqueado)
  setTimeout(() => {
    if (!ZX.viewer) {
      const m = document.getElementById('ldMsg');
      if (m) m.innerHTML = 'No se pudo cargar el motor 3D.<br>Revisa tu conexión a internet y recarga la página.';
    }
  }, 15000);
})();
