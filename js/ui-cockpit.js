/* =========================================================
   COCKPIT: pantalla TFT simulada, controles y telemetría
   ========================================================= */
(function () {
  'use strict';
  const ZX = (window.ZX = window.ZX || {});
  ZX.ui = ZX.ui || {};

  let sim, els = {}, hist = [], histT = 0, msgT = 0, keys = {}, thrDrag = false, thrPointer = 0, flashT = 0, kqsT = 0;
  const HIST_N = 360;

  function buildTach() {
    const svg = els.tach, N = 64, W = 640;
    let off = '', on = '', ticks = '';
    for (let i = 0; i < N; i++) {
      const x = 6 + i * (W - 12) / N, w = (W - 12) / N - 3;
      const h = 26 + Math.pow(i / (N - 1), 1.7) * 92;
      const y = 122 - h;
      const r = (i + 0.5) / N * 16000;
      const col = r > 15000 ? '#ff4545' : r > 12500 ? '#ffb22e' : '#6BCB1F';
      off += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="1.5" fill="currentColor" opacity="0.1"/>';
      on += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="1.5" fill="' + col + '"/>';
    }
    for (let k = 0; k <= 16; k += 2) {
      const x = 6 + (k / 16) * (W - 12);
      ticks += '<text x="' + x.toFixed(1) + '" y="144" text-anchor="' + (k === 0 ? 'start' : k === 16 ? 'end' : 'middle') + '"' + (k >= 15 ? ' style="fill:#ff4545;opacity:1"' : '') + '>' + k + '</text>';
    }
    svg.innerHTML = '<defs><clipPath id="tachClip"><rect id="tachClipRect" x="0" y="0" width="0" height="150"/></clipPath></defs>' +
      '<g>' + off + '</g><g clip-path="url(#tachClip)">' + on + '</g>' + ticks;
    els.clip = svg.querySelector('#tachClipRect');
  }

  function setSeg(seg, v) { ZX.$$('button', seg).forEach((b) => b.classList.toggle('on', b.dataset.v === String(v))); }
  function syncModes() {
    ZX.$$('#modeGrid button').forEach((b) => b.classList.toggle('on', b.dataset.mode === sim.mode));
    els.modeDesc.textContent = ZX.RIDE_MODES[sim.mode].desc;
    els.riderBox.classList.toggle('locked', sim.mode !== 'rider');
    setSeg(els.segPower, sim.mode === 'rider' ? sim.riderPower : sim.power);
    setSeg(els.segKtrc, sim.mode === 'rider' ? sim.riderKtrc : sim.ktrc);
    els.tMode.textContent = ZX.RIDE_MODES[sim.mode].name;
    els.tPower.textContent = 'POWER ' + sim.power;
    els.tKtrc.textContent = sim.ktrc ? 'KTRC ' + sim.ktrc : 'KTRC OFF';
    els.tKtrc.style.opacity = sim.ktrc ? '' : '0.45';
  }
  function message(txt) { els.msg.textContent = txt; els.msg.classList.add('show'); msgT = 1.8; }

  function throttleFromPointer(e) {
    const r = els.thrTrack.getBoundingClientRect();
    thrPointer = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
  }
  function updateThrottleInput() {
    const k = keys.thr ? 1 : 0;
    sim.throttleInput = Math.max(k, thrDrag ? thrPointer : 0);
    sim.brake = keys.brake ? 1 : 0;
    els.brakeBtn.classList.toggle('pressed', !!keys.brake);
  }
  function holdButton(btn, name) {
    const down = (e) => { e.preventDefault(); ZX.audio.ensure(); keys[name] = true; updateThrottleInput(); ZX.capture(btn, e); };
    const up = () => { keys[name] = false; updateThrottleInput(); };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
  }
  function pressFx(btn) { btn.classList.add('pressed'); setTimeout(() => btn.classList.remove('pressed'), 140); }

  function drawTele() {
    const c = els.tele, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1;
    for (let i = 1; i < 4; i++) { const y = Math.round(h * i / 4) + 0.5; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const n = hist.length; if (n < 2) return;
    const dx = w / (HIST_N - 1), x0 = w - (n - 1) * dx;
    // KTRC como barras
    g.fillStyle = 'rgba(255,178,46,0.55)';
    for (let i = 0; i < n; i++) { const t = hist[i].tc; if (t > 0.05) { const bh = t * h * 0.35; g.fillRect(x0 + i * dx - dx / 2, h - bh, dx + 0.5, bh); } }
    const line = (key, max, col, lw) => {
      g.beginPath();
      for (let i = 0; i < n; i++) { const x = x0 + i * dx, y = h - 4 - (hist[i][key] / max) * (h - 10); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke();
    };
    line('thr', 1, 'rgba(61,139,255,0.9)', 1.5);
    line('kmh', 240, '#ffffff', 2);
    line('rpm', 16000, '#6BCB1F', 2);
    g.font = '600 11px Rajdhani, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.4)';
    g.fillText('16k rpm · 240 km/h', 6, 12);
  }

  ZX.ui.cockpit = {
    init() {
      sim = ZX.sim;
      ['tach', 'tSpeed', 'tRpm', 'tGear', 'tMode', 'tPower', 'tKtrc', 'tKqs', 'tTc', 'tSlip', 'tAbs', 'tFuel', 'tTemp', 'tOdo', 'tTrip', 'tClock'].forEach((id) => { els[id] = ZX.$('#' + (id === 'tach' ? 'tTach' : id)); });
      els.tft = ZX.$('#tft'); els.msg = ZX.$('#tMsg');
      els.start = ZX.$('#startBtn'); els.thrTrack = ZX.$('#thrTrack'); els.thrFill = ZX.$('#thrFill'); els.thrKnob = ZX.$('#thrKnob');
      els.modeDesc = ZX.$('#modeDesc'); els.riderBox = ZX.$('#riderBox');
      els.segPower = ZX.$('#segPower'); els.segKtrc = ZX.$('#segKtrc');
      els.brakeBtn = ZX.$('#brakeBtn'); els.tele = ZX.$('#teleCanvas');
      buildTach();

      els.start.addEventListener('click', () => { ZX.audio.ensure(); sim.toggle(); });
      ZX.$('#shUp').addEventListener('click', (e) => { ZX.audio.ensure(); sim.shiftUp(); pressFx(e.currentTarget); });
      ZX.$('#shDown').addEventListener('click', (e) => { ZX.audio.ensure(); sim.shiftDown(); pressFx(e.currentTarget); });
      ZX.$('#shN').addEventListener('click', (e) => { sim.neutral(); pressFx(e.currentTarget); });
      holdButton(els.brakeBtn, 'brake');

      els.thrTrack.addEventListener('pointerdown', (e) => { ZX.audio.ensure(); thrDrag = true; ZX.capture(els.thrTrack, e); throttleFromPointer(e); updateThrottleInput(); });
      els.thrTrack.addEventListener('pointermove', (e) => { if (thrDrag) { throttleFromPointer(e); updateThrottleInput(); } });
      const thrUp = () => { thrDrag = false; updateThrottleInput(); };
      els.thrTrack.addEventListener('pointerup', thrUp);
      els.thrTrack.addEventListener('pointercancel', thrUp);

      ZX.$('#modeGrid').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { sim.setMode(b.dataset.mode); message('MODO ' + ZX.RIDE_MODES[b.dataset.mode].name); } });
      els.segPower.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) sim.setRider(b.dataset.v, null); });
      els.segKtrc.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) sim.setRider(null, +b.dataset.v); });
      const segS = ZX.$('#segSurface');
      segS.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; sim.surface = b.dataset.v; setSeg(segS, sim.surface); message(sim.surface === 'wet' ? 'ASFALTO MOJADO · MENOS AGARRE' : 'ASFALTO SECO'); });
      setSeg(segS, sim.surface);
      const segT = ZX.$('#segTheme');
      segT.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; els.tft.dataset.theme = b.dataset.v; setSeg(segT, b.dataset.v); });
      setSeg(segT, 'dark');
      const vol = ZX.$('#volRange');
      const setVol = () => { vol.style.setProperty('--p', vol.value + '%'); ZX.audio.setVolume(vol.value / 100); ZX.store.set('vol', +vol.value); };
      vol.value = ZX.store.get('vol', 70); setVol();
      vol.addEventListener('input', setVol);

      sim.on_('mode', syncModes);
      sim.on_('warn', (m) => { if (ZX.current === 'cockpit') message(m.toUpperCase()); });
      sim.on_('shift', (d) => { if (d.qs) { els.tKqs.classList.add('flash'); kqsT = 0.25; } });
      sim.on_('starter', () => { els.start.classList.add('cranking'); });
      sim.on_('start', () => { els.start.classList.remove('cranking'); });
      syncModes();
    },
    enter() { drawTele(); },
    leave() { keys = {}; thrDrag = false; updateThrottleInput(); },
    frame(dt) {
      const on = sim.on || sim.starting;
      els.tft.classList.toggle('is-on', on);
      els.start.classList.toggle('on', sim.on);
      els.start.querySelector('b').textContent = sim.on ? 'STOP' : 'START';
      const kmh = Math.round(sim.kmh());
      els.tSpeed.textContent = kmh;
      els.tRpm.textContent = ZX.fmt(Math.round(sim.rpm / 50) * 50);
      els.tGear.textContent = sim.gear ? sim.gear : 'N';
      els.clip.setAttribute('width', (Math.min(1, sim.rpm / 16000) * 640).toFixed(1));
      const shift = sim.on && sim.rpm > sim.SHIFT_LIGHT;
      flashT += dt;
      els.tft.classList.toggle('shift-flash', shift && (flashT % 0.16) < 0.08);
      els.tTc.classList.toggle('show', sim.tc > 0.12);
      els.tSlip.classList.toggle('show', sim.ktrc === 0 && sim.slip > 0.12);
      els.tAbs.classList.toggle('show', sim.abs > 0.2);
      if (kqsT > 0) { kqsT -= dt; if (kqsT <= 0) els.tKqs.classList.remove('flash'); }
      els.tFuel.style.width = Math.round(sim.fuel * 100) + '%';
      els.tTemp.textContent = Math.round(sim.temp);
      els.tOdo.textContent = Math.floor(sim.odo);
      els.tTrip.textContent = sim.trip.toFixed(1);
      const d = new Date();
      els.tClock.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      const t = sim.throttle * 100;
      els.thrFill.style.height = t + '%';
      els.thrKnob.style.bottom = t + '%';
      if (msgT > 0) { msgT -= dt; if (msgT <= 0) els.msg.classList.remove('show'); }
      histT += dt;
      if (histT >= 1 / 30) {
        histT = 0;
        hist.push({ rpm: sim.rpm, kmh: sim.kmh(), thr: sim.throttle, tc: Math.max(sim.tc, sim.ktrc === 0 ? sim.slip : 0) });
        if (hist.length > HIST_N) hist.shift();
        drawTele();
      }
    },
    key(e, down) {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') { if (down) ZX.audio.ensure(); keys.thr = down; updateThrottleInput(); return true; }
      if (k === 's' || e.key === 'ArrowDown') { keys.brake = down; updateThrottleInput(); return true; }
      if (!down || e.repeat) return (k === 'e' || k === 'q' || k === 'n' || e.code === 'Space') ? true : false;
      if (k === 'e') { sim.shiftUp(); pressFx(ZX.$('#shUp')); return true; }
      if (k === 'q') { sim.shiftDown(); pressFx(ZX.$('#shDown')); return true; }
      if (k === 'n') { sim.neutral(); return true; }
      if (e.code === 'Space') { ZX.audio.ensure(); sim.toggle(); return true; }
      return false;
    }
  };
})();
