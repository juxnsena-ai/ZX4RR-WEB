/* =========================================================
   CONFIGURADOR: colores, chasis, llantas, escapes y accesorios
   ========================================================= */
(function () {
  'use strict';
  const ZX = (window.ZX = window.ZX || {});
  ZX.ui = ZX.ui || {};

  let els = {}, tab = 'color';

  function usd(n) { return 'US$ ' + ZX.fmt(n); }
  function setTab(t) {
    tab = t;
    ZX.$$('#cfgTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
    ZX.$$('#cfgPanel .cfg-page').forEach((p) => p.classList.toggle('active', p.dataset.page === t));
  }

  function render() {
    const c = ZX.config;
    els.name.textContent = ZX.configName(c);
    ZX.$$('.swatch', els.presets).forEach((b) => b.classList.toggle('on', b.dataset.id === c.preset));
    els.p1.value = c.colors.p1; els.p2.value = c.colors.p2; els.p3.value = c.colors.p3;
    ZX.$$('.dot-opt', els.frame).forEach((b) => b.classList.toggle('on', b.dataset.id === c.frameId));
    ZX.$$('.dot-opt', els.wheel).forEach((b) => b.classList.toggle('on', b.dataset.id === c.wheelId));
    ZX.$$('.opt-card', els.exhaust).forEach((b) => b.classList.toggle('on', b.dataset.id === c.exhaust));
    ZX.$$('.acc', els.acc).forEach((b) => b.classList.toggle('on', !!c.acc[b.dataset.id]));
    const total = ZX.priceLines(c, ZX.store.get('basePrice', ZX.BASE_PRICE_USD)).reduce((s, l) => s + l.usd, 0);
    els.total.textContent = usd(total);
  }

  ZX.ui.configurador = {
    init() {
      els.name = ZX.$('#cfgName'); els.panel = ZX.$('#cfgPanel'); els.total = ZX.$('#cfgTotal');
      els.presets = ZX.$('#presetGrid'); els.frame = ZX.$('#frameDots'); els.wheel = ZX.$('#wheelDots');
      els.exhaust = ZX.$('#exhaustCards'); els.acc = ZX.$('#accList');
      els.p1 = ZX.$('#pick1'); els.p2 = ZX.$('#pick2'); els.p3 = ZX.$('#pick3');

      els.presets.innerHTML = ZX.PAINT_PRESETS.map((p) =>
        '<button class="swatch" data-id="' + p.id + '"><span class="sw-ball" style="background:conic-gradient(from 200deg,' + p.p1 + ' 0 55%,' + p.p2 + ' 55% 85%,' + p.p3 + ' 85%)"></span>' + p.name + '</button>').join('');
      els.frame.innerHTML = ZX.FRAME_COLORS.map((f) => '<button class="dot-opt" data-id="' + f.id + '" style="--c:' + f.hex + '"><i></i>' + f.name + '<em>' + (f.id === 'green' ? 'de serie' : '+US$ 180') + '</em></button>').join('');
      els.wheel.innerHTML = ZX.WHEEL_COLORS.map((w) => '<button class="dot-opt" data-id="' + w.id + '" style="--c:' + w.hex + '"><i></i>' + w.name + '<em>' + (w.id === 'black' ? 'de serie' : '+US$ 220') + '</em></button>').join('');
      els.exhaust.innerHTML = ZX.EXHAUSTS.map((x) => '<button class="opt-card" data-id="' + x.id + '"><span class="radio"></span><span><b>' + x.name + '</b><small>' + x.desc + '</small></span><em>' + (x.price ? '+' + usd(x.price) : 'Incluido') + '</em></button>').join('');
      els.acc.innerHTML = ZX.ACCESSORIES.map((a) => '<button class="acc" data-id="' + a.id + '"><i class="fa-solid ' + a.icon + '"></i><b>' + a.name + '</b><em>+' + usd(a.price) + '</em><span class="switch"></span></button>').join('');

      ZX.$('#cfgTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setTab(b.dataset.tab); });
      ZX.$('#cfgCam').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) ZX.viewer.preset(b.dataset.cam, 1.0); });
      els.presets.addEventListener('click', (e) => {
        const b = e.target.closest('.swatch'); if (!b) return;
        const p = ZX.PAINT_PRESETS.find((x) => x.id === b.dataset.id);
        ZX.setConfig({ preset: p.id, colors: { p1: p.p1, p2: p.p2, p3: p.p3 } });
      });
      [els.p1, els.p2, els.p3].forEach((inp, i) => inp.addEventListener('input', () => {
        const colors = Object.assign({}, ZX.config.colors);
        colors['p' + (i + 1)] = inp.value;
        ZX.setConfig({ preset: 'custom', colors: colors });
      }));
      els.frame.addEventListener('click', (e) => { const b = e.target.closest('.dot-opt'); if (b) ZX.setConfig({ frameId: b.dataset.id }); });
      els.wheel.addEventListener('click', (e) => {
        const b = e.target.closest('.dot-opt'); if (!b) return;
        ZX.setConfig({ wheelId: b.dataset.id });
        if (ZX.current === 'configurador') ZX.viewer.preset('lateral', 1.0);
      });
      els.exhaust.addEventListener('click', (e) => {
        const b = e.target.closest('.opt-card'); if (!b) return;
        ZX.setConfig({ exhaust: b.dataset.id });
        if (ZX.current === 'configurador') ZX.viewer.preset('lateral', 1.0);
      });
      els.acc.addEventListener('click', (e) => {
        const b = e.target.closest('.acc'); if (!b) return;
        const id = b.dataset.id, patch = {}; patch[id] = !ZX.config.acc[id];
        ZX.setConfig({ acc: patch });
      });
      ZX.configListeners.push(render);
      setTab('color');
      render();
    },
    enter() {
      ZX.viewer.cleanState(false);
      ZX.viewer.preset('config', 1.2);
      render();
      this.layout();
    },
    layout() {
      const st = ZX.$('#stage').getBoundingClientRect(), r = els.panel.getBoundingClientRect();
      if (window.innerWidth > 860) ZX.viewer.setSafeArea(0, Math.max(0, st.right - r.left + 8), 60, 0);
      else ZX.viewer.setSafeArea(0, 0, 70, Math.max(0, st.bottom - r.top + 6));
    }
  };
})();
