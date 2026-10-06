/* =========================================================
   SIMULACIÓN: motor + moto (simplificada, con fines ilustrativos)
   Compartida por el sonido, el cockpit TFT, el hero y la animación 3D.
   ========================================================= */
(function () {
  'use strict';
  const ZX = (window.ZX = window.ZX || {});

  // Desarrollos ilustrativos (no son los valores oficiales)
  const GEARS = [0, 2.92, 2.06, 1.66, 1.42, 1.26, 1.14];
  const PRIMARY = 2.03;
  const FINAL = 3.29;
  const WHEEL_R = 0.312;
  const MASS = 189 + 75; // moto + piloto
  const IDLE = 1300;
  const LIMIT = 16000;
  const SHIFT_LIGHT = 14500;

  // Curva de par aproximada (N·m en el cigüeñal)
  const TQ = [[0, 0], [1000, 14], [3000, 20], [5000, 25], [7000, 28.5], [9000, 32], [11000, 36], [13000, 39], [14500, 37.3], [15500, 34], [16500, 30]];
  function torqueAt(rpm) {
    if (rpm <= TQ[0][0]) return TQ[0][1];
    for (let i = 1; i < TQ.length; i++) {
      if (rpm <= TQ[i][0]) {
        const a = TQ[i - 1], b = TQ[i];
        return a[1] + (b[1] - a[1]) * (rpm - a[0]) / (b[0] - a[0]);
      }
    }
    return TQ[TQ.length - 1][1];
  }

  const listeners = {};
  const sim = (ZX.sim = {
    GEARS, PRIMARY, FINAL, WHEEL_R, IDLE, LIMIT, SHIFT_LIGHT, torqueAt,
    on: false, starting: false,
    rpm: 0, gear: 0, speed: 0,            // speed en m/s
    throttleInput: 0, throttle: 0, brake: 0,
    mode: 'sport', power: 'F', ktrc: 1,
    riderPower: 'F', riderKtrc: 1,
    surface: 'dry',
    tc: 0, slip: 0, abs: 0,
    limiter: false, cutT: 0, qsCut: 0,
    odo: 1287.4, trip: 0, fuel: 1, temp: 32,
    distance: 0,

    on_(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    emit(ev, data) { (listeners[ev] || []).forEach(function (f) { f(data); }); },

    kmh() { return this.speed * 3.6; },
    ratio(g) { return PRIMARY * GEARS[g === undefined ? this.gear : g] * FINAL; },
    wheelRpmEq(g) {
      const gg = g === undefined ? this.gear : g;
      if (!gg) return 0;
      return this.speed / WHEEL_R * 60 / (2 * Math.PI) * this.ratio(gg);
    },

    setMode(m) {
      this.mode = m;
      const d = ZX.RIDE_MODES[m];
      if (m === 'rider') { this.power = this.riderPower; this.ktrc = this.riderKtrc; }
      else { this.power = d.power; this.ktrc = d.ktrc; }
      this.emit('mode', m);
    },
    setRider(power, ktrc) {
      if (power) this.riderPower = power;
      if (ktrc !== undefined && ktrc !== null) this.riderKtrc = ktrc;
      if (this.mode === 'rider') { this.power = this.riderPower; this.ktrc = this.riderKtrc; }
      this.emit('mode', this.mode);
    },

    start(quick) {
      if (this.on || this.starting) return;
      if (quick) { this.on = true; this.rpm = IDLE + 400; this.emit('start', { quick: true }); return; }
      this.starting = true;
      this.emit('starter');
      const self = this;
      setTimeout(function () {
        self.starting = false; self.on = true; self.rpm = IDLE + 1400;
        self.emit('start', { quick: false });
      }, 950);
    },
    stop() {
      if (!this.on && !this.starting) return;
      this.on = false; this.starting = false; this.throttleInput = 0;
      this.emit('stop');
    },
    toggle() { if (this.on || this.starting) this.stop(); else this.start(false); },

    shiftUp() {
      if (!this.on) { this.emit('warn', 'Arranca el motor primero'); return; }
      if (this.gear >= 6) { this.emit('warn', 'Ya estás en 6.ª'); return; }
      if (this.gear === 0) {
        this.gear = 1; this.emit('shift', { dir: 1, qs: false, gear: 1 }); return;
      }
      const qs = this.throttle > 0.15 && this.rpm > 2500;
      if (qs) this.qsCut = 0.065;
      this.gear++;
      this.emit('shift', { dir: 1, qs: qs, gear: this.gear });
    },
    shiftDown() {
      if (!this.on) { this.emit('warn', 'Arranca el motor primero'); return; }
      if (this.gear === 0) return;
      if (this.gear === 1) {
        if (this.speed < 3) { this.gear = 0; this.emit('shift', { dir: -1, qs: false, gear: 0 }); }
        else this.emit('warn', 'Para poner punto muerto, frena casi por completo');
        return;
      }
      const newRpm = this.wheelRpmEq(this.gear - 1);
      if (newRpm > LIMIT - 300) { this.emit('overrev'); this.emit('warn', 'Reducción bloqueada: el motor se pasaría de vueltas'); return; }
      this.gear--;
      this.emit('shift', { dir: -1, qs: true, blip: this.throttle < 0.25, gear: this.gear });
    },
    neutral() {
      if (this.speed < 3) { this.gear = 0; this.emit('shift', { dir: 0, gear: 0 }); }
      else this.emit('warn', 'Frena antes de poner punto muerto');
    },

    update(dt) {
      dt = Math.min(dt, 0.05);
      const prevThrottle = this.throttle;
      const target = this.on ? this.throttleInput : 0;
      const resp = this.mode === 'rain' || this.power === 'L' ? 7 : 13;
      this.throttle += (target - this.throttle) * Math.min(1, dt * resp);
      if (this.throttle < 0.001) this.throttle = 0;

      // cortes (limitador / quickshifter)
      let thr = this.throttle;
      if (this.qsCut > 0) { this.qsCut -= dt; thr = 0; }
      if (this.cutT > 0) { this.cutT -= dt; thr = 0; }
      this.limiter = false;

      const pMul = this.power === 'L' ? 0.8 : 1;
      const shaped = this.power === 'L' ? Math.pow(thr, 1.35) : thr;

      // fuerzas resistentes
      const v = this.speed;
      const fDrag = 0.5 * 1.2 * 0.36 * v * v;
      const fRoll = v > 0.05 ? 0.015 * MASS * 9.81 : 0;
      const grip = this.surface === 'dry' ? 1.15 : 0.6;
      const brakeDemand = this.brake * 1.1 * MASS * 9.81;
      const brakeMax = grip * MASS * 9.81 * 0.95;
      const fBrake = Math.min(brakeDemand, brakeMax);
      this.abs = (brakeDemand > brakeMax && v > 1) ? 1 : Math.max(0, this.abs - dt * 4);

      if (!this.on) {
        this.rpm = Math.max(0, this.rpm - 5200 * dt);
        this.speed = Math.max(0, v - (fDrag + fRoll + fBrake) / MASS * dt);
        this.tc = Math.max(0, this.tc - dt * 3);
        this.slip *= 0.9;
        this._odometer(dt);
        this.temp += (25 - this.temp) * dt * 0.01;
        return;
      }

      if (this.gear === 0) {
        // Punto muerto: el motor sube y baja libre
        const tgt = IDLE + shaped * pMul * (LIMIT + 600 - IDLE);
        if (tgt > this.rpm) this.rpm = Math.min(tgt, this.rpm + (4000 + 24000 * shaped) * dt);
        else this.rpm = Math.max(tgt, this.rpm - 9500 * dt);
        this.speed = Math.max(0, v - (fDrag + fRoll + fBrake) / MASS * dt);
        this.tc = Math.max(0, this.tc - dt * 3);
        this.slip *= 0.9;
      } else {
        const ratio = this.ratio();
        const eq = this.wheelRpmEq();
        const launch = IDLE + 500 + shaped * 5200;
        const clutchSlipping = eq < launch;
        let T = torqueAt(Math.max(this.rpm, 800)) * shaped * pMul;
        if (thr < 0.04) T = -(3 + this.rpm / 2600); // freno motor
        let fDrive;
        if (clutchSlipping) {
          this.rpm += (launch - this.rpm) * Math.min(1, dt * 7);
          fDrive = Math.max(0, T) * ratio * 0.9 / WHEEL_R;
        } else {
          fDrive = T * ratio * 0.9 / WHEEL_R;
        }

        // Tracción y KTRC
        const fMax = grip * MASS * 9.81 * 0.62;
        let slipTarget = 0;
        let tcTarget = 0;
        if (fDrive > fMax) {
          if (this.ktrc > 0) {
            const allow = [0, 1.07, 1.0, 0.88][this.ktrc];
            const lim = fMax * allow;
            tcTarget = Math.min(1, (fDrive - lim) / fDrive * 2.4 + 0.25);
            fDrive = Math.min(fDrive, lim);
            slipTarget = [0, 0.07, 0.035, 0.01][this.ktrc];
          } else {
            slipTarget = Math.min(0.6, (fDrive / fMax - 1) * 1.6 + 0.08);
            fDrive = fMax * 0.82;
          }
        } else if (this.ktrc === 3 && fDrive > fMax * 0.88 && thr > 0.1) {
          // nivel 3 interviene antes de llegar al límite
          tcTarget = 0.3;
          fDrive = Math.min(fDrive, fMax * 0.88);
        }
        this.tc += (tcTarget - this.tc) * Math.min(1, dt * (tcTarget > this.tc ? 14 : 4));
        this.slip += (slipTarget - this.slip) * Math.min(1, dt * 6);

        const a = (fDrive - fDrag - fRoll - fBrake) / MASS;
        this.speed = Math.max(0, v + a * dt);
        if (!clutchSlipping) {
          const want = this.wheelRpmEq() * (1 + this.slip);
          this.rpm += (want - this.rpm) * Math.min(1, dt * 18);
        }
        if (this.speed < 0.3 && thr < 0.04) this.rpm += (IDLE - this.rpm) * Math.min(1, dt * 4);
        if (this.rpm < IDLE * 0.85) this.rpm = IDLE * 0.85;
      }

      // Limitador
      if (this.rpm >= LIMIT) {
        this.rpm = LIMIT - 120 * Math.random();
        this.cutT = 0.055;
        this.limiter = true;
        this.emit('limiter');
      }

      // Petardeo al cortar gas desde alto régimen
      if (prevThrottle > 0.55 && this.throttle < 0.12 && this.rpm > 8500) this.emit('pops', { rpm: this.rpm });

      // Temperatura y combustible (cosmético)
      const tTarget = 72 + (this.rpm / LIMIT) * 26 + (this.speed < 2 ? 8 : -6);
      this.temp += (tTarget - this.temp) * dt * 0.05;
      this.fuel = Math.max(0.05, this.fuel - (0.000004 + this.throttle * 0.00004) * dt * 60);
      this._odometer(dt);
    },
    _odometer(dt) {
      const d = this.speed * dt;
      this.distance += d;
      this.odo += d / 1000;
      this.trip += d / 1000;
    }
  });

  sim.setMode('sport');
})();
