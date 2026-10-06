/* =========================================================
   FICHA TÉCNICA: diagrama de dimensiones + datos por categoría
   ========================================================= */
(function () {
  'use strict';
  const ZX = (window.ZX = window.ZX || {});
  ZX.ui = ZX.ui || {};

  let els = {}, tab = 'motor', snapVersion = -1;
  const W = 1400, H = 640;

  function setTab(t) {
    tab = t;
    ZX.$$('button', els.tabs).forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    const sec = ZX.SPECS.find((s) => s.id === t);
    els.grid.innerHTML = sec.rows.map((r) => '<div class="sp-card' + (r[2] ? ' hl' : '') + '"><small>' + r[0] + '</small><b>' + r[1] + '</b></div>').join('');
    els.grid.style.animation = 'none'; void els.grid.offsetWidth; els.grid.style.animation = '';
  }

  function dims(project) {
    const P = (x, y) => project(x, y, 0);
    const ground = P(0, 0).y;
    let s = '';
    const hLine = (x1, x2, y, label, sub) => {
      const a = P(x1, y), b = P(x2, y);
      s += '<line class="ext" x1="' + a.x + '" y1="' + ground + '" x2="' + a.x + '" y2="' + (a.y - 10) + '"/>';
      s += '<line class="ext" x1="' + b.x + '" y1="' + ground + '" x2="' + b.x + '" y2="' + (b.y - 10) + '"/>';
      s += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" marker-start="url(#arr)" marker-end="url(#arr)"/>';
      s += '<text x="' + (a.x + b.x) / 2 + '" y="' + (a.y - 14) + '" text-anchor="middle">' + label + '</text>';
      if (sub) s += '<text class="sub" x="' + (a.x + b.x) / 2 + '" y="' + (a.y + 32) + '" text-anchor="middle">' + sub + '</text>';
    };
    const vLine = (x, y1, y2, label, sub, anchor) => {
      const a = P(x, y1), b = P(x, y2);
      s += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" marker-start="url(#arr)" marker-end="url(#arr)"/>';
      const tx = a.x + (anchor === 'end' ? -12 : 12);
      s += '<text x="' + tx + '" y="' + ((a.y + b.y) / 2) + '" text-anchor="' + (anchor || 'start') + '">' + label + '</text>';
      if (sub) s += '<text class="sub" x="' + tx + '" y="' + ((a.y + b.y) / 2 + 28) + '" text-anchor="' + (anchor || 'start') + '">' + sub + '</text>';
    };
    s += '<defs><marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9" style="stroke:none;fill:#6BCB1F"/></marker></defs>';
    s += '<line class="ext" x1="0" y1="' + ground + '" x2="' + W + '" y2="' + ground + '"/>';
    hLine(-1.0, 0.99, 1.2, '1.990 mm', 'Largo total');
    hLine(-0.69, 0.69, -0.075, '1.380 mm', 'Distancia entre ejes');
    vLine(1.08, 0, 1.105, '1.110 mm', 'Alto', 'start');
    vLine(-0.2, 0, 0.795, '800 mm', 'Asiento', 'end');
    vLine(0.17, 0, 0.14, '135 mm', 'Libre al suelo', 'start');
    return s;
  }

  ZX.ui.ficha = {
    init() {
      els.tabs = ZX.$('#spTabs'); els.grid = ZX.$('#spGrid'); els.img = ZX.$('#spImg'); els.svg = ZX.$('#spSvg');
      els.tabs.innerHTML = ZX.SPECS.map((s) => '<button data-t="' + s.id + '"><i class="fa-solid ' + s.icon + '"></i><span>' + s.name + '</span></button>').join('');
      els.tabs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setTab(b.dataset.t); });
      setTab(tab);
    },
    enter() {
      if (snapVersion !== ZX.configVersion || !els.img.src) {
        snapVersion = ZX.configVersion;
        ZX.viewer.cleanState(true);
        const r = ZX.viewer.sideSnapshot(W, H);
        els.img.src = r.url;
        els.svg.innerHTML = dims(r.project);
      }
    }
  };
})();
