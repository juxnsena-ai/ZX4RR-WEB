/* =========================================================
   COMPARATIVA: radar, cifras, aceleración y vuelta simulada
   ========================================================= */
(function () {
  'use strict';
  const ZX = (window.ZX = window.ZX || {});
  ZX.ui = ZX.ui || {};

  const TRACK_D = 'M 90 292 L 400 292 C 470 292 520 276 548 232 C 572 192 560 150 520 140 C 480 130 458 160 430 178 C 395 200 352 196 336 166 C 318 132 340 100 382 92 C 440 80 520 84 552 60 C 578 40 560 18 520 18 L 170 22 C 110 24 66 46 62 92 C 58 140 112 152 136 186 C 156 216 132 250 96 254 C 62 258 50 292 90 292 Z';
  const TRACK_M = 3000, N = 720, G = 9.81;
  let els = {}, selected = ['cbr500', 'r7'], tab = 'lap';
  let track = null, race = null, speedMul = 8, radarAnim = null, radarPrev = null;

  const bikes = () => [ZX.BIKES[0]].concat(ZX.BIKES.filter((b) => selected.indexOf(b.id) >= 0));
  const power = (b) => (b.hpRam || b.hp) * 745.7 * 0.9;

  // ---------- Circuito ----------
  function buildTrack() {
    const svg = els.track;
    svg.innerHTML = '<path d="' + TRACK_D + '" fill="none" stroke="#1a2216" stroke-width="22" stroke-linejoin="round"/>' +
      '<path d="' + TRACK_D + '" fill="none" stroke="#2c3a26" stroke-width="16" stroke-linejoin="round"/>' +
      '<path id="trackPath" d="' + TRACK_D + '" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" stroke-dasharray="6 8"/>' +
      '<line x1="96" y1="279" x2="96" y2="305" stroke="#fff" stroke-width="4" stroke-dasharray="4 4"/>' +
      '<text x="104" y="320" fill="#95a291" font-family="Orbitron" font-size="11" font-weight="700">META</text><g id="trackDots"></g>';
    const path = svg.querySelector('#trackPath');
    const Lpx = path.getTotalLength(), k = TRACK_M / Lpx;
    const pts = [];
    for (let i = 0; i < N; i++) pts.push(path.getPointAtLength((i / N) * Lpx));
    const ds = TRACK_M / N;
    const vmax = new Float32Array(N);
    const K = 5;
    for (let i = 0; i < N; i++) {
      const a = pts[(i - K + N) % N], b = pts[i], c = pts[(i + K) % N];
      const ab = Math.hypot(b.x - a.x, b.y - a.y), bc = Math.hypot(c.x - b.x, c.y - b.y), ca = Math.hypot(a.x - c.x, a.y - c.y);
      const area = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
      const R = area < 1e-6 ? 1e9 : (ab * bc * ca) / (4 * area) * k;
      vmax[i] = Math.min(400 / 3.6, Math.sqrt(1.15 * G * R));
    }
    // suavizado (mínimo local) para evitar picos
    const vm = new Float32Array(N);
    for (let i = 0; i < N; i++) { let m = 1e9; for (let j = -3; j <= 3; j++) m = Math.min(m, vmax[(i + j + N) % N]); vm[i] = m; }
    track = { pts: pts, ds: ds, vmax: vm };
  }
  function lapProfile(b) {
    const m = b.kg + 75, P = power(b), ds = track.ds, vmax = track.vmax;
    const v = new Float32Array(N);
    let cur = 25;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < N; i++) {
        v[i] = Math.min(cur, vmax[i]);
        const a = Math.min(P / (m * Math.max(v[i], 3)), 0.95 * G) - (0.5 * 1.2 * 0.33 * v[i] * v[i]) / m - 0.015 * G;
        cur = Math.sqrt(Math.max(4, v[i] * v[i] + 2 * a * ds));
      }
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let i = N - 1; i >= 0; i--) {
        const lim = Math.sqrt(v[(i + 1) % N] * v[(i + 1) % N] + 2 * 1.05 * G * ds);
        if (v[i] > lim) v[i] = lim;
      }
    }
    const t = new Float32Array(N + 1);
    for (let i = 0; i < N; i++) t[i + 1] = t[i] + ds / ((v[i] + v[(i + 1) % N]) / 2);
    let top = 0; for (let i = 0; i < N; i++) top = Math.max(top, v[i]);
    return { v: v, t: t, T: t[N], top: top * 3.6 };
  }
  function fmtLap(s) { const m = Math.floor(s / 60); return m + ':' + (s - m * 60).toFixed(2).padStart(5, '0'); }

  function resetRace(start) {
    const list = bikes().map((b) => ({ b: b, p: lapProfile(b) }));
    race = { list: list, tau: 0, running: !!start, done: false, vMax: Math.max.apply(null, list.map((x) => x.p.top)) / 3.6 };
    els.dots.innerHTML = list.map((x, i) => '<circle r="' + (i === 0 ? 8 : 7) + '" fill="' + x.b.color + '" stroke="#050705" stroke-width="2.5" data-i="' + i + '"/>').join('');
    updateRace(0);
    els.lapStart.innerHTML = start ? '<i class="fa-solid fa-stop"></i> Detener' : '<i class="fa-solid fa-flag-checkered"></i> Iniciar vuelta';
  }
  function idxAt(p, tau) {
    let lo = 0, hi = N;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (p.t[mid] <= tau) lo = mid; else hi = mid - 1; }
    return Math.min(lo, N - 1);
  }
  function updateRace(dt) {
    if (!race || !track) return;
    if (race.running) race.tau += dt * speedMul;
    const circles = els.dots.querySelectorAll('circle');
    const state = race.list.map((x, i) => {
      const fin = race.tau >= x.p.T;
      const idx = fin ? N - 1 : idxAt(x.p, race.tau);
      const pt = fin ? track.pts[0] : track.pts[idx];
      circles[i].setAttribute('cx', pt.x.toFixed(1)); circles[i].setAttribute('cy', pt.y.toFixed(1));
      return { x: x, fin: fin, idx: idx, d: fin ? N + (1e4 - x.p.T) : idx, kmh: fin ? 0 : x.p.v[idx] * 3.6 };
    });
    const order = state.slice().sort((a, b) => b.d - a.d);
    const leader = race.list.reduce((m, x) => Math.min(m, x.p.T), 1e9);
    els.board.innerHTML = order.map((s, k) => {
      const t = s.fin ? fmtLap(s.x.p.T) + (k ? '<small>+' + (s.x.p.T - leader).toFixed(2) + ' s</small>' : '<small>Mejor vuelta</small>') : (race.tau > 0 ? Math.round(s.kmh) + ' km/h<small>' + Math.round(s.idx / N * 100) + ' %</small>' : '—');
      return '<div class="lb-row" style="--c:' + s.x.b.color + '"><span class="pos">' + (k + 1) + '</span><span><b>' + s.x.b.short + '</b><small>Punta ' + Math.round(s.x.p.top) + ' km/h</small></span><span class="t">' + t + '</span></div>';
    }).join('');
    if (race.running && state.every((s) => s.fin)) {
      race.running = false; race.done = true;
      els.lapStart.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Repetir vuelta';
      const w = order[0].x.b;
      ZX.toast(w.main ? '¡La ZX-4RR gana la vuelta simulada!' : w.short + ' gana la vuelta simulada');
    }
    drawLapChart();
  }
  function drawLapChart() {
    const c = els.lapCanvas, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth, h = c.clientHeight;
    if (!w || !h || !race) return;
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const vmax = Math.ceil(race.vMax * 3.6 / 50) * 50;
    g.strokeStyle = 'rgba(255,255,255,0.06)'; g.fillStyle = 'rgba(255,255,255,0.35)'; g.font = '600 10px Rajdhani, sans-serif';
    for (let s = 50; s < vmax; s += 50) { const y = h - 6 - (s / vmax) * (h - 14) + 0.5; g.beginPath(); g.moveTo(26, y); g.lineTo(w, y); g.stroke(); g.fillText(s, 2, y + 3); }
    race.list.forEach((x, i) => {
      const end = race.tau >= x.p.T ? N - 1 : idxAt(x.p, race.tau);
      if (race.tau <= 0 && !race.done) return;
      g.beginPath();
      for (let j = 0; j <= end; j++) { const X = 26 + (j / (N - 1)) * (w - 28), Y = h - 6 - (x.p.v[j] * 3.6 / vmax) * (h - 14); if (j) g.lineTo(X, Y); else g.moveTo(X, Y); }
      g.strokeStyle = x.b.color; g.lineWidth = i === 0 ? 2.4 : 1.6; g.globalAlpha = i === 0 ? 1 : 0.85; g.stroke(); g.globalAlpha = 1;
    });
  }

  // ---------- Radar ----------
  const AXES = [
    { name: 'POTENCIA', f: (b) => b.hp },
    { name: 'PAR', f: (b) => b.nm },
    { name: 'LIGEREZA', f: (b) => 1 / b.kg },
    { name: 'CV / KG', f: (b) => b.hp / b.kg },
    { name: 'RÉGIMEN', f: (b) => b.rpm }
  ];
  function radarValues() {
    const maxes = AXES.map((a) => Math.max.apply(null, ZX.BIKES.map(a.f)));
    return bikes().map((b) => ({ b: b, vals: AXES.map((a, i) => a.f(b) / maxes[i]) }));
  }
  function drawRadar(data) {
    const cx = 220, cy = 205, R = 140, n = AXES.length;
    const pt = (i, r) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return [cx + Math.cos(a) * R * r, cy + Math.sin(a) * R * r]; };
    let s = '';
    [0.25, 0.5, 0.75, 1].forEach((r) => { s += '<polygon points="' + AXES.map((_, i) => pt(i, r).join(',')).join(' ') + '" fill="none" stroke="rgba(255,255,255,' + (r === 1 ? 0.16 : 0.07) + ')"/>'; });
    AXES.forEach((a, i) => {
      const p = pt(i, 1), l = pt(i, 1.17);
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="rgba(255,255,255,0.08)"/>';
      s += '<text x="' + l[0] + '" y="' + (l[1] + 4) + '" text-anchor="middle">' + a.name + '</text>';
    });
    data.slice().reverse().forEach((d) => {
      const pts = d.vals.map((v, i) => pt(i, v).join(',')).join(' ');
      s += '<polygon points="' + pts + '" fill="' + d.b.color + '" fill-opacity="' + (d.b.main ? 0.22 : 0.08) + '" stroke="' + d.b.color + '" stroke-width="' + (d.b.main ? 2.6 : 1.6) + '" stroke-linejoin="round"/>';
      d.vals.forEach((v, i) => { const p = pt(i, v); s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (d.b.main ? 3.5 : 2.5) + '" fill="' + d.b.color + '"/>'; });
    });
    els.radar.innerHTML = s;
  }
  function renderRadar() {
    const target = radarValues();
    const from = radarPrev && radarPrev.length ? radarPrev : target.map((d) => ({ b: d.b, vals: d.vals.map(() => 0) }));
    const t0 = performance.now();
    cancelAnimationFrame(radarAnim);
    const stepA = (now) => {
      const k = Math.min(1, (now - t0) / 450), e = 1 - Math.pow(1 - k, 3);
      const cur = target.map((d) => {
        const f = from.find((x) => x.b.id === d.b.id);
        return { b: d.b, vals: d.vals.map((v, i) => (f ? f.vals[i] : 0) + (v - (f ? f.vals[i] : 0)) * e) };
      });
      drawRadar(cur);
      if (k < 1) radarAnim = requestAnimationFrame(stepA); else radarPrev = target;
    };
    radarAnim = requestAnimationFrame(stepA);
    els.legend.innerHTML = bikes().map((b) => '<span style="--c:' + b.color + '"><i></i>' + b.short + '</span>').join('');
  }

  // ---------- Barras ----------
  function barsHTML(groups) {
    return groups.map((g) => {
      const vals = g.rows.map((r) => r.v).filter((v) => v !== null);
      const max = Math.max.apply(null, vals);
      const best = g.neutral ? null : g.lower ? Math.min.apply(null, vals) : Math.max.apply(null, vals);
      return '<div class="bar-group"><h4>' + g.name + '<small>' + (g.neutral ? 'dato informativo' : g.lower ? 'menos es mejor' : 'más es mejor') + '</small></h4>' +
        g.rows.map((r) => '<div class="bar-row' + (r.v === best ? ' best' : '') + '" style="--c:' + r.b.color + '"><span>' + r.b.short + '</span><div class="bar-track"><i data-w="' + (r.v === null ? 0 : (r.v / max * 100)) + '"></i></div><b>' + (r.v === null ? '—' : g.fmt(r.v)) + '</b></div>').join('') + '</div>';
    }).join('');
  }
  function animateBars(box) {
    requestAnimationFrame(() => requestAnimationFrame(() => ZX.$$('.bar-track i', box).forEach((i) => { i.style.width = i.dataset.w + '%'; })));
  }
  function renderSpecs() {
    const L = bikes();
    const grp = (name, f, fmt, lower) => ({ name: name, lower: lower, fmt: fmt, rows: L.map((b) => ({ b: b, v: f(b) })) });
    els.bars.innerHTML = barsHTML([
      grp('Potencia máxima', (b) => b.hp, (v) => ZX.fmt(v, v % 1 ? 1 : 0) + ' CV'),
      grp('Par máximo', (b) => b.nm, (v) => ZX.fmt(v, v % 1 ? 1 : 0) + ' N·m'),
      grp('Peso en orden de marcha', (b) => b.kg, (v) => v + ' kg', true),
      grp('Relación peso / potencia', (b) => b.kg / b.hp, (v) => ZX.fmt(v, 2) + ' kg/CV', true),
      grp('Régimen de potencia máxima', (b) => b.rpm, (v) => ZX.fmt(v) + ' rpm'),
      Object.assign(grp('Cilindrada', (b) => b.cc, (v) => v + ' cm³'), { neutral: true })
    ]);
    animateBars(els.bars);
  }
  function accel(b) {
    const m = b.kg + 75, P = power(b);
    let v = 0, t = 0, t100 = null, t200 = null;
    const dt = 0.01;
    while (t < 90) {
      const a = Math.min(P / (m * Math.max(v, 1)), 0.9 * G) - (0.5 * 1.2 * 0.33 * v * v) / m - 0.015 * G;
      if (a < 0.02) break;
      v += a * dt; t += dt;
      if (t100 === null && v >= 100 / 3.6) t100 = t;
      if (t200 === null && v >= 200 / 3.6) t200 = t;
    }
    return { t100: t100, t200: t200, top: v * 3.6 };
  }
  function renderAccel() {
    const L = bikes().map((b) => ({ b: b, r: accel(b) }));
    const grp = (name, f, fmt, lower) => ({ name: name, lower: lower, fmt: fmt, rows: L.map((x) => ({ b: x.b, v: f(x.r) })) });
    els.accel.innerHTML = barsHTML([
      grp('0 – 100 km/h', (r) => r.t100, (v) => ZX.fmt(v, 2) + ' s', true),
      grp('0 – 200 km/h', (r) => r.t200, (v) => ZX.fmt(v, 1) + ' s', true),
      grp('Velocidad máxima estimada', (r) => r.top, (v) => Math.round(v) + ' km/h')
    ]) + '<p class="muted" style="font-size:12.5px">Estimación física simplificada (potencia, peso con piloto de 75 kg y resistencia aerodinámica). No son mediciones reales.</p>';
    animateBars(els.accel);
  }

  function setTab(t) {
    tab = t;
    ZX.$$('#cmpTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
    ZX.$$('#view-comparativa .cmp-page').forEach((p) => p.classList.toggle('active', p.dataset.page === t));
    if (t === 'specs') renderSpecs();
    if (t === 'accel') renderAccel();
    if (t === 'lap') requestAnimationFrame(drawLapChart);
  }
  function renderChips() {
    els.chips.innerHTML = ZX.BIKES.map((b) => '<button class="rival-chip' + (b.main ? ' main' : selected.indexOf(b.id) >= 0 ? ' on' : '') + '" data-id="' + b.id + '" style="--c:' + b.color + '"><i></i>' + b.short + '</button>').join('');
  }
  function refreshAll() {
    renderChips(); renderRadar();
    resetRace(false);
    if (tab === 'specs') renderSpecs();
    if (tab === 'accel') renderAccel();
  }

  ZX.ui.comparativa = {
    init() {
      els.chips = ZX.$('#rivalChips'); els.radar = ZX.$('#radar'); els.legend = ZX.$('#radarLegend');
      els.track = ZX.$('#track'); els.board = ZX.$('#lapBoard'); els.lapCanvas = ZX.$('#lapCanvas');
      els.lapStart = ZX.$('#lapStart'); els.bars = ZX.$('#barsBox'); els.accel = ZX.$('#accelBox');
      els.chips.addEventListener('click', (e) => {
        const b = e.target.closest('.rival-chip'); if (!b || b.classList.contains('main')) return;
        const id = b.dataset.id, i = selected.indexOf(id);
        if (i >= 0) selected.splice(i, 1);
        else { if (selected.length >= 3) { ZX.toast('Máximo 3 rivales a la vez', 'warn'); return; } selected.push(id); }
        refreshAll();
      });
      ZX.$('#cmpTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setTab(b.dataset.tab); });
      els.lapStart.addEventListener('click', () => {
        if (race && race.running) { race.running = false; els.lapStart.innerHTML = '<i class="fa-solid fa-play"></i> Continuar'; return; }
        if (race && !race.done && race.tau > 0) { race.running = true; els.lapStart.innerHTML = '<i class="fa-solid fa-stop"></i> Detener'; return; }
        resetRace(true);
      });
      const segSp = ZX.$('#lapSpeed');
      segSp.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; speedMul = +b.dataset.v; ZX.$$('button', segSp).forEach((x) => x.classList.toggle('on', x === b)); });
      ZX.$$('button', segSp).forEach((x) => x.classList.toggle('on', +x.dataset.v === speedMul));
      buildTrack();
      els.dots = els.track.querySelector('#trackDots');
      refreshAll();
      setTab('lap');
    },
    enter() { radarPrev = null; renderRadar(); setTab(tab); },
    leave() { if (race && race.running) { race.running = false; els.lapStart.innerHTML = '<i class="fa-solid fa-play"></i> Continuar'; } },
    frame(dt) { if (race && race.running) updateRace(dt); }
  };
})();
