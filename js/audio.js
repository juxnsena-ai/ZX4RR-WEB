/* =========================================================
   SONIDO: sintetizador de un 4 cilindros en línea (Web Audio API)
   Frecuencia de encendido = rpm / 60 × 2  (4 cilindros, 4 tiempos)
   ========================================================= */
(function () {
  'use strict';
  const ZX = (window.ZX = window.ZX || {});

  function shaperCurve(amount) {
    const n = 2048, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
    }
    return curve;
  }

  function EngineAudio() {
    this.ctx = null;
    this.volume = 0.7;
    this.muted = false;
    this.alive = false;
  }

  EngineAudio.prototype.ensure = function () {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { this.ctx = new AC(); } catch (e) { return false; }
      this._build();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  };

  EngineAudio.prototype._build = function () {
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4;
    comp.attack.value = 0.003; comp.release.value = 0.12;
    this.master.connect(comp); comp.connect(c.destination);

    // ----- cadena del motor -----
    this.engGain = c.createGain(); this.engGain.gain.value = 0;
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.Q.value = 0.9; this.lp.frequency.value = 600;
    this.peak = c.createBiquadFilter(); this.peak.type = 'peaking'; this.peak.frequency.value = 1500; this.peak.Q.value = 1.1; this.peak.gain.value = 5;
    this.hp = c.createBiquadFilter(); this.hp.type = 'highpass'; this.hp.frequency.value = 38;
    this.shaper = c.createWaveShaper(); this.shaper.curve = shaperCurve(2.2); this.shaper.oversample = '2x';
    this.mix = c.createGain(); this.mix.gain.value = 0.55;
    this.mix.connect(this.shaper); this.shaper.connect(this.lp); this.lp.connect(this.peak);
    this.peak.connect(this.hp); this.hp.connect(this.engGain); this.engGain.connect(this.master);

    // Onda de encendido con armónicos (timbre "aullador")
    const H = [0, 1, 0.72, 0.52, 0.46, 0.32, 0.27, 0.2, 0.17, 0.12, 0.1, 0.08, 0.065, 0.05, 0.04, 0.03, 0.025];
    const real = new Float32Array(H.length), imag = new Float32Array(H.length);
    for (let i = 1; i < H.length; i++) { imag[i] = H[i] * (i % 3 === 0 ? -1 : 1); }
    const wave = c.createPeriodicWave(real, imag);

    this.oFire = c.createOscillator(); this.oFire.setPeriodicWave(wave);
    this.gFire = c.createGain(); this.gFire.gain.value = 0.55;
    this.oFire.connect(this.gFire); this.gFire.connect(this.mix);

    this.oRev = c.createOscillator(); this.oRev.type = 'sawtooth';
    this.gRev = c.createGain(); this.gRev.gain.value = 0.2;
    this.oRev.connect(this.gRev); this.gRev.connect(this.mix);

    this.oHigh = c.createOscillator(); this.oHigh.type = 'square';
    this.gHigh = c.createGain(); this.gHigh.gain.value = 0.035;
    this.oHigh.connect(this.gHigh); this.gHigh.connect(this.mix);

    // Ruido de admisión
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    this.noise = c.createBufferSource(); this.noise.buffer = buf; this.noise.loop = true;
    this.bp = c.createBiquadFilter(); this.bp.type = 'bandpass'; this.bp.Q.value = 1.6; this.bp.frequency.value = 800;
    this.gNoise = c.createGain(); this.gNoise.gain.value = 0;
    this.noise.connect(this.bp); this.bp.connect(this.gNoise); this.gNoise.connect(this.engGain);

    // Ráfaga corta para petardeos y clics
    const plen = Math.floor(c.sampleRate * 0.06);
    const pb = c.createBuffer(1, plen, c.sampleRate);
    const pd = pb.getChannelData(0);
    for (let i = 0; i < plen; i++) pd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / plen, 3);
    this.popBuf = pb;

    const t = c.currentTime;
    this.oFire.start(t); this.oRev.start(t); this.oHigh.start(t); this.noise.start(t);
    this.alive = true;
  };

  EngineAudio.prototype.setVolume = function (v) {
    this.volume = v;
    if (this.master && !this.muted) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  };
  EngineAudio.prototype.setMuted = function (m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.05);
  };

  // Llamado en cada fotograma con el estado de la simulación
  EngineAudio.prototype.update = function (s) {
    if (!this.alive) return;
    const c = this.ctx, t = c.currentTime;
    const on = s.on;
    const rpm = Math.max(on ? 700 : 0, s.rpm);
    const fire = Math.max(20, rpm / 60 * 2);
    const thr = s.throttle;
    const k = 0.018;
    this.oFire.frequency.setTargetAtTime(fire, t, k);
    this.oRev.frequency.setTargetAtTime(fire / 2, t, k);
    this.oHigh.frequency.setTargetAtTime(fire * 2.01, t, k);
    this.bp.frequency.setTargetAtTime(500 + fire * 2.2, t, 0.03);
    const r = rpm / 16000;
    this.lp.frequency.setTargetAtTime(Math.min(16000, 280 + fire * 4.2 + thr * 2600), t, 0.03);
    this.peak.frequency.setTargetAtTime(900 + fire * 1.6, t, 0.05);
    this.gRev.gain.setTargetAtTime(0.26 - r * 0.14, t, 0.05);
    let g = on ? (0.2 + thr * 0.42 + r * 0.22) : 0;
    const cut = (s.cutT > 0 || s.qsCut > 0) && on;
    if (cut) g *= 0.12;
    if (on && thr < 0.04 && rpm > 4000) g *= 0.72; // retención
    this.engGain.gain.setTargetAtTime(g, t, cut ? 0.004 : (on ? 0.025 : 0.25));
    this.gNoise.gain.setTargetAtTime(on ? thr * 0.16 * (0.35 + r) : 0, t, 0.04);
  };

  EngineAudio.prototype._burst = function (when, freq, q, gain, rate) {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.popBuf; src.playbackRate.value = rate || 1;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(when);
  };

  // Petardeo al cortar gas
  EngineAudio.prototype.pops = function (n) {
    if (!this.alive) return;
    const t = this.ctx.currentTime;
    n = n || 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      this._burst(t + 0.06 + Math.random() * 0.55, 180 + Math.random() * 380, 0.9, 0.9 + Math.random() * 0.8, 0.7 + Math.random() * 0.5);
    }
  };

  // Clic del cambio (con o sin quickshifter)
  EngineAudio.prototype.shift = function (qs) {
    if (!this.alive) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.09);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.13);
    this._burst(t, 2400, 2, 0.25, 1.6);
    if (qs) this._burst(t + 0.02, 300, 1, 0.6, 0.8);
  };

  // Motor de arranque
  EngineAudio.prototype.starter = function () {
    if (!this.alive) return;
    const c = this.ctx, t = c.currentTime, dur = 0.95;
    const o = c.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(14, t); o.frequency.linearRampToValueAtTime(26, t + dur);
    const w = c.createOscillator(); w.type = 'sawtooth';
    w.frequency.setValueAtTime(130, t); w.frequency.linearRampToValueAtTime(230, t + dur);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.05);
    g.gain.setValueAtTime(0.5, t + dur - 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    const gw = c.createGain(); gw.gain.value = 0.06;
    o.connect(lp); w.connect(gw); gw.connect(lp); lp.connect(g); g.connect(this.master);
    o.start(t); w.start(t); o.stop(t + dur + 0.1); w.stop(t + dur + 0.1);
  };

  // Sonidos de interfaz
  EngineAudio.prototype.ui = function (type) {
    if (!this.alive) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(this.master);
    if (type === 'snap') {
      o.type = 'triangle'; o.frequency.setValueAtTime(660, t); o.frequency.exponentialRampToValueAtTime(1320, t + 0.08);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.start(t); o.stop(t + 0.25);
      this._burst(t, 3000, 3, 0.15, 2);
    } else if (type === 'win') {
      [523, 659, 784, 1046].forEach((f, i) => {
        const oo = c.createOscillator(), gg = c.createGain();
        oo.type = 'triangle'; oo.frequency.value = f; oo.connect(gg); gg.connect(this.master);
        const tt = t + i * 0.11;
        gg.gain.setValueAtTime(0.0001, tt); gg.gain.exponentialRampToValueAtTime(0.3, tt + 0.01); gg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.35);
        oo.start(tt); oo.stop(tt + 0.4);
      });
      o.start(t); o.stop(t + 0.01);
    } else {
      o.type = 'sine'; o.frequency.value = type === 'tick' ? 1800 : 900;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.start(t); o.stop(t + 0.07);
    }
  };

  ZX.EngineAudio = EngineAudio;
})();
