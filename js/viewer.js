/* =========================================================
   VISOR 3D: escena, cámara, interacción, despiece y minijuego
   ========================================================= */
(function () {
  'use strict';
  const ZX = (window.ZX = window.ZX || {});

  ZX.createViewer = function (container) {
    const T = window.THREE, A = window.THREE_ADDONS;
    const PI = Math.PI;
    const V3 = (x, y, z) => new T.Vector3(x, y, z || 0);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    // ---------- Render ----------
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false; // las sombras se recalculan solo cuando algo se mueve
    let shadowDirty = 2;
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    container.appendChild(canvas);

    const labelRenderer = new A.CSS2DRenderer();
    labelRenderer.domElement.className = 'label-layer';
    container.appendChild(labelRenderer.domElement);

    const scene = new T.Scene();
    const pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new A.RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.62;

    const camera = new T.PerspectiveCamera(30, 1, 0.03, 60);
    camera.position.set(2.55, 1.15, 2.75);
    const controls = new A.OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.58, 0);
    controls.minDistance = 0.35;
    controls.maxDistance = 8;
    controls.maxPolarAngle = PI * 0.54;
    controls.screenSpacePanning = true;
    controls.rotateSpeed = 0.8;

    // ---------- Luces ----------
    scene.add(new T.HemisphereLight(0xe8ffe0, 0x0a0c0a, 0.5));
    const key = new T.DirectionalLight(0xffffff, 2.3);
    key.position.set(2.4, 4.2, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -2.4, right: 2.4, top: 2.4, bottom: -2.4, near: 0.5, far: 12 });
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
    scene.add(key);
    const rim = new T.DirectionalLight(0x8cff4a, 1.4); rim.position.set(-3, 2.2, -2.4); scene.add(rim);
    const fill = new T.DirectionalLight(0x9fc4ff, 0.55); fill.position.set(-2, 1.2, 3); scene.add(fill);

    // ---------- Suelo ----------
    const shadowFloor = new T.Mesh(new T.PlaneGeometry(14, 14), new T.ShadowMaterial({ opacity: 0.55 }));
    shadowFloor.rotation.x = -PI / 2; shadowFloor.receiveShadow = true;
    scene.add(shadowFloor);
    const gridCv = document.createElement('canvas'); gridCv.width = gridCv.height = 1024;
    (function () {
      const c = gridCv.getContext('2d'), N = 1024, m = N / 6.4;
      c.clearRect(0, 0, N, N);
      c.strokeStyle = 'rgba(107,203,31,0.55)'; c.lineWidth = 1;
      for (let i = 0; i <= 6.4 / 0.25; i++) {
        const p = Math.round(i * 0.25 * m) + 0.5;
        c.beginPath(); c.moveTo(p, 0); c.lineTo(p, N); c.stroke();
        c.beginPath(); c.moveTo(0, p); c.lineTo(N, p); c.stroke();
      }
      c.globalCompositeOperation = 'destination-in';
      const g = c.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
      g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(0.55, 'rgba(0,0,0,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, N, N);
      c.globalCompositeOperation = 'source-over';
      const g2 = c.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N * 0.3);
      g2.addColorStop(0, 'rgba(107,203,31,0.16)'); g2.addColorStop(1, 'rgba(107,203,31,0)');
      c.fillStyle = g2; c.fillRect(0, 0, N, N);
    })();
    const gridTex = new T.CanvasTexture(gridCv); gridTex.colorSpace = T.SRGBColorSpace; gridTex.anisotropy = 8;
    const floor = new T.Mesh(new T.CircleGeometry(3.2, 96), new T.MeshBasicMaterial({ map: gridTex, transparent: true, depthWrite: false }));
    floor.rotation.x = -PI / 2; floor.position.y = 0.0015;
    scene.add(floor);

    // ---------- Moto ----------
    const bike = ZX.buildBike();
    scene.add(bike.root);
    const parts = bike.parts, byId = bike.byId;
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    bike.root.traverse((o) => {
      if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.anisotropy = maxAniso; });
    });
    parts.forEach((p) => { p.traverse((o) => { if (o.isMesh) o.userData.cs = o.castShadow; }); });

    // ---------- Estado ----------
    const S = {
      mode: 'showcase', running: true,
      explode: 0, explodeTarget: 0, explodeDragging: false, lift: 0.22,
      filter: null, xray: false, labels: false, animEngine: false,
      hover: null, hoverExt: null, selected: null, isolated: null,
      safe: { l: 0, r: 0, t: 0, b: 0 }, zoomTarget: 1,
      crank: 0, wheelF: 0, wheelR: 0, fan: 0, tftT: 0,
      game: { active: false, ids: new Set(), placed: new Set(), t0: 0 }
    };
    const listeners = {};
    const on = (ev, fn) => (listeners[ev] = listeners[ev] || []).push(fn);
    const emit = (ev, d) => (listeners[ev] || []).forEach((f) => f(d));
    const XRAY = new Set(['deposito', 'asientoPiloto', 'asientoPasajero', 'carenadoFrontal', 'cupula', 'lateralDer', 'lateralIzq', 'quilla', 'colin', 'guardabarrosDel', 'retrovisores', 'portamatricula']);
    const sysColor = (sys) => (ZX.SYSTEMS[sys] || {}).color || '#6BCB1F';

    // ---------- Apariencia de piezas ----------
    function setGlow(p, color, k) {
      const key = color ? color + k : '';
      if (p.userData.glowKey === key) return;
      p.userData.glowKey = key;
      p.userData.mats.forEach((m) => {
        if (!m.emissive) return;
        if (color) { m.emissive.set(color); m.emissiveIntensity = k; }
        else { m.emissive.copy(m.userData.baseEmissive); m.emissiveIntensity = m.userData.baseEI; }
      });
    }
    function setOpacity(p, o) {
      if (p.userData.opacity === o) return;
      p.userData.opacity = o;
      p.userData.mats.forEach((m) => {
        const bo = m.userData.baseOpacity, bt = m.userData.baseTransparent;
        if (o >= 0.999) {
          m.opacity = bo; m.depthWrite = m.userData.baseDepthWrite;
          if (m.transparent !== bt) { m.transparent = bt; m.needsUpdate = true; }
        } else {
          m.opacity = bo * o; m.depthWrite = false;
          if (!m.transparent) { m.transparent = true; m.needsUpdate = true; }
        }
      });
      p.traverse((o2) => { if (o2.isMesh) o2.castShadow = o >= 0.5 ? o2.userData.cs : false; });
    }
    function partOpacity(p) {
      const u = p.userData;
      if (S.isolated) return u.id === S.isolated ? 1 : 0;
      let o = 1;
      if (S.filter && u.sys !== S.filter) o = 0.07;
      if (S.xray && XRAY.has(u.id) && u.sys !== S.filter) o = Math.min(o, 0.1);
      return o;
    }
    function refreshVisual() {
      shadowDirty = 2;
      parts.forEach((p) => {
        const u = p.userData;
        const o = partOpacity(p);
        p.visible = o > 0;
        if (o > 0) setOpacity(p, o);
        if (u.id === S.selected) setGlow(p, sysColor(u.sys), 0.5);
        else if (u.id === S.hover || u.id === S.hoverExt) setGlow(p, sysColor(u.sys), 0.28);
        else setGlow(p, null);
      });
      updateLabels();
    }

    // ---------- Etiquetas CSS2D ----------
    const tipEl = document.createElement('div'); tipEl.className = 'part-tip';
    const tip = new A.CSS2DObject(tipEl); tip.visible = false; tip.center.set(0.5, 1.35); scene.add(tip);
    const markerEl = document.createElement('div'); markerEl.className = 'home-marker';
    const marker = new A.CSS2DObject(markerEl); marker.visible = false; scene.add(marker);
    const labelObjs = {};
    function updateLabels() {
      parts.forEach((p) => {
        const u = p.userData;
        const show = S.labels && p.visible && (u.opacity === undefined || u.opacity >= 0.5) && S.mode === 'explore' && !S.game.active;
        if (show && !labelObjs[u.id]) {
          const el = document.createElement('div'); el.className = 'part-label';
          el.style.setProperty('--c', sysColor(u.sys));
          el.textContent = u.info.n;
          const lo = new A.CSS2DObject(el); lo.position.copy(u.center); p.add(lo);
          labelObjs[u.id] = lo;
        }
        if (labelObjs[u.id]) labelObjs[u.id].visible = show;
      });
    }
    const HOTSPOTS = [
      { id: 'culata', label: 'Motor 4 cilindros · 399 cm³' },
      { id: 'horquillaDer', label: 'Horquilla Showa SFF-BP' },
      { id: 'pinzaDer', label: 'Frenos radiales monobloque' },
      { id: 'tft', label: 'Pantalla TFT 4,3"' },
      { id: 'amortiguador', label: 'Showa BFRC lite' },
      { id: 'silenciador', label: 'Escape corto lateral' },
      { id: 'ramAir', label: 'Toma Ram Air' }
    ];
    const hotspots = HOTSPOTS.map((h, i) => {
      const el = document.createElement('button');
      el.className = 'hotspot'; el.type = 'button';
      el.style.animationDelay = (i * 0.25) + 's';
      el.innerHTML = '<span class="hs-dot"></span><span class="hs-label">' + h.label + '</span>';
      el.addEventListener('click', (e) => { e.stopPropagation(); emit('hotspot', h.id); });
      const o = new A.CSS2DObject(el);
      const p = byId[h.id];
      o.position.copy(p.userData.center);
      p.add(o);
      return o;
    });
    function setHotspots(v) { hotspots.forEach((h) => { h.visible = v; }); }

    // ---------- Cámara ----------
    const PRESETS = {
      hero: { t: [0.02, 0.56, 0], p: [2.6, 1.12, 2.75] },
      tresCuartos: { t: [0, 0.6, 0], p: [2.35, 1.2, 2.65] },
      lateral: { t: [0, 0.58, 0], p: [0, 0.62, 3.7] },
      lateralIzq: { t: [0, 0.58, 0], p: [0, 0.62, -3.7] },
      frontal: { t: [0, 0.6, 0], p: [3.7, 0.78, 0] },
      trasera: { t: [0, 0.6, 0], p: [-3.7, 0.85, 0] },
      superior: { t: [0, 0.5, 0], p: [0.01, 4.1, 0.02] },
      explotada: { t: [0.05, 0.86, 0], p: [3.15, 3.35, 4.45] },
      config: { t: [0, 0.6, 0], p: [2.25, 1.0, 2.95] },
      game: { t: [0, 0.6, 0], p: [2.1, 1.35, 3.2] }
    };
    let fly = null;
    function flyTo(target, pos, dur) {
      const fo = camera.position.clone().sub(controls.target), to = pos.clone().sub(target);
      const s1 = new T.Spherical().setFromVector3(fo), s2 = new T.Spherical().setFromVector3(to);
      let dth = s2.theta - s1.theta;
      if (dth > PI) dth -= 2 * PI; if (dth < -PI) dth += 2 * PI;
      fly = { t: 0, dur: dur === undefined ? 1.0 : dur, ft: controls.target.clone(), tt: target.clone(), s1: s1, s2: s2, dth: dth };
      if (fly.dur === 0) stepFly(0);
    }
    const _sp = new T.Spherical();
    function stepFly(dt) {
      if (!fly) return;
      fly.t += dt;
      const k = fly.dur ? ease(clamp(fly.t / fly.dur, 0, 1)) : 1;
      controls.target.lerpVectors(fly.ft, fly.tt, k);
      _sp.set(fly.s1.radius + (fly.s2.radius - fly.s1.radius) * k, fly.s1.phi + (fly.s2.phi - fly.s1.phi) * k, fly.s1.theta + fly.dth * k);
      camera.position.setFromSpherical(_sp).add(controls.target);
      if (k >= 1) fly = null;
    }
    function preset(name, dur) {
      const p = PRESETS[name]; if (!p) return;
      const t = V3(p.t[0], p.t[1], p.t[2]), pos = V3(p.p[0], p.p[1], p.p[2]);
      if (S.mode === 'explore' && name !== 'explotada' && name !== 'game') {
        // con la moto desarmada, la cámara se aleja y sube para encuadrar todas las piezas
        const e = S.explodeTarget;
        pos.sub(t).multiplyScalar(1 + 0.6 * e);
        t.y += 0.3 * e;
        pos.add(t);
      }
      flyTo(t, pos, dur);
    }
    let idleT = 0, autoWanted = false;
    controls.addEventListener('start', () => { fly = null; idleT = 0; controls.autoRotate = false; });
    controls.addEventListener('end', () => { idleT = 0; });

    // Centro de la pieza en su posición final (según la explosión objetivo, no la actual)
    function targetCenter(p) {
      const u = p.userData, e = S.explodeTarget;
      const k = e > 0 ? ease(clamp((e - u.stage * 0.16) / 0.52, 0, 1)) : 0;
      const c = u.center.clone().applyQuaternion(p.quaternion);
      c.add(u.base).addScaledVector(u.ex, k).add(u.manual);
      c.y += S.lift * ease(clamp(e * 1.6, 0, 1));
      return c;
    }
    function focusPart(id) {
      const p = byId[id]; if (!p) return;
      const c = targetCenter(p);
      const dist = clamp(p.userData.size * 2.1 + 0.45, 0.75, 4.5);
      const dir = camera.position.clone().sub(controls.target).normalize();
      flyTo(c, c.clone().addScaledVector(dir, dist), 0.9);
    }

    // ---------- Tamaño / zona segura ----------
    function applyViewOffset() {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      const sx = (S.safe.l - S.safe.r) / 2, sy = (S.safe.t - S.safe.b) / 2;
      if (sx || sy) camera.setViewOffset(w, h, -sx, -sy, w, h); else camera.clearViewOffset();
      // Zoom para que la moto (≈2 m × 1,25 m vista a ~3,7 m) quepa en la zona libre entre paneles
      const aw = Math.max(1, w - S.safe.l - S.safe.r), ah = Math.max(1, h - S.safe.t - S.safe.b);
      const k = 3.7 * Math.tan((camera.fov / 2) * PI / 180);
      S.zoomTarget = clamp(Math.min(k * aw / (h * 1.0), k * ah / (h * 0.62)), 0.3, 1.0);
      camera.updateProjectionMatrix();
    }
    function resize() {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      labelRenderer.setSize(w, h);
      camera.aspect = w / h;
      applyViewOffset();
    }
    new ResizeObserver(resize).observe(container);
    resize();
    function setSafeArea(l, r, t, b) { S.safe = { l: l || 0, r: r || 0, t: t || 0, b: b || 0 }; applyViewOffset(); }

    // ---------- Selección por rayo ----------
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    function setNdc(x, y) { const r = canvas.getBoundingClientRect(); ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); }
    function shown(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
    function pick(x, y) {
      setNdc(x, y);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObject(bike.root, true);
      for (let i = 0; i < hits.length; i++) {
        const o = hits[i].object, id = o.userData.partId;
        if (!id || !shown(o)) continue;
        const p = byId[id];
        if (p.userData.opacity !== undefined && p.userData.opacity < 0.5) continue;
        return { part: p, point: hits[i].point };
      }
      return null;
    }
    const pointer = { x: 0, y: 0, dirty: false, inside: false };
    canvas.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.dirty = true; pointer.inside = true; });
    canvas.addEventListener('pointerleave', () => { pointer.inside = false; pointer.dirty = true; });

    // ---------- Arrastre de piezas ----------
    let drag = null;
    function gameLocked(id) { const g = S.game; return g.active && (!g.ids.has(id) || g.placed.has(id)); }
    container.addEventListener('pointerdown', (e) => {
      if (S.mode !== 'explore' || e.button !== 0 || e.target !== canvas) return;
      const hit = pick(e.clientX, e.clientY);
      if (!hit) return;
      const id = hit.part.userData.id;
      if (gameLocked(id)) return;
      controls.enabled = false;
      fly = null;
      drag = {
        part: hit.part, x: e.clientX, y: e.clientY, started: false,
        plane: new T.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(V3()), hit.point),
        start: hit.point.clone(), startManual: hit.part.userData.manual.clone()
      };
      window.addEventListener('pointermove', onDragMove);
      window.addEventListener('pointerup', onDragEnd);
      window.addEventListener('pointercancel', onDragEnd);
    }, true);
    const _hp = V3();
    function onDragMove(e) {
      if (!drag) return;
      if (!drag.started) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
        drag.started = true;
        container.classList.add('is-dragging');
        const id = drag.part.userData.id;
        S.hover = id; refreshVisual();
        if (S.game.active) { marker.position.copy(drag.part.userData.homeWorld).add(bike.root.position); marker.visible = true; }
        emit('dragstart', id);
      }
      setNdc(e.clientX, e.clientY);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(drag.plane, _hp)) drag.part.userData.manual.copy(drag.startManual).add(_hp.sub(drag.start));
    }
    function onDragEnd() {
      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', onDragEnd);
      window.removeEventListener('pointercancel', onDragEnd);
      controls.enabled = true;
      if (!drag) return;
      const d = drag; drag = null;
      container.classList.remove('is-dragging');
      marker.visible = false;
      const id = d.part.userData.id;
      if (!d.started) { select(id); return; }
      emit('dragend', id);
      if (S.game.active) gameCheck(d.part);
    }
    canvas.addEventListener('dblclick', (e) => {
      if (S.mode !== 'explore' || S.game.active) return;
      const hit = pick(e.clientX, e.clientY);
      if (hit) isolate(hit.part.userData.id);
    });

    // ---------- Animaciones de offsets manuales ----------
    const tweens = [];
    function tweenManual(p, to, dur) {
      for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].p === p) tweens.splice(i, 1);
      tweens.push({ p: p, from: p.userData.manual.clone(), to: to.clone(), t: 0, dur: dur || 0.6 });
    }
    function stepTweens(dt) {
      for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i];
        tw.t += dt;
        const k = ease(clamp(tw.t / tw.dur, 0, 1));
        tw.p.userData.manual.lerpVectors(tw.from, tw.to, k);
        if (k >= 1) tweens.splice(i, 1);
      }
    }

    // ---------- Acciones públicas ----------
    function select(id, opts) {
      S.selected = id || null;
      refreshVisual();
      if (id && opts && opts.focus) focusPart(id);
      emit('select', S.selected);
    }
    function hoverExt(id) { if (S.hoverExt === id) return; S.hoverExt = id; refreshVisual(); }
    function isolate(id) {
      S.isolated = id || null;
      if (id) { S.selected = id; focusPart(id); controls.autoRotate = true; controls.autoRotateSpeed = 1.2; }
      else { controls.autoRotate = false; }
      refreshVisual();
      emit('isolate', S.isolated);
      emit('select', S.selected);
    }
    function setFilter(sys) { S.filter = sys || null; refreshVisual(); emit('filter', S.filter); }
    function setXray(v) { S.xray = !!v; refreshVisual(); }
    function setLabels(v) { S.labels = !!v; refreshVisual(); }
    function setAnimEngine(v) { S.animEngine = !!v; }
    function setExplode(v, immediate) { S.explodeTarget = clamp(v, 0, 1); if (immediate) S.explode = S.explodeTarget; }
    function resetManual() { parts.forEach((p) => { if (p.userData.manual.lengthSq() > 1e-8) tweenManual(p, V3(0, 0, 0), 0.7); }); }
    function anyManual() { return parts.some((p) => p.userData.manual.lengthSq() > 1e-8); }

    // Estado del despiece (se recuerda al cambiar de sección)
    let saved = null;
    function saveExplore() {
      saved = { explode: S.explodeTarget, filter: S.filter, xray: S.xray, labels: S.labels, isolated: S.isolated, selected: S.selected,
        manual: parts.map((p) => p.userData.manual.clone()) };
    }
    function cleanState(instant) {
      S.filter = null; S.xray = false; S.isolated = null; S.selected = null; S.hover = null; S.hoverExt = null;
      S.explodeTarget = 0; if (instant) S.explode = 0;
      tweens.length = 0;
      parts.forEach((p) => { if (instant) p.userData.manual.set(0, 0, 0); else if (p.userData.manual.lengthSq() > 1e-8) tweenManual(p, V3(0, 0, 0), 0.8); });
      refreshVisual();
    }
    function restoreExplore() {
      if (!saved) return;
      S.explodeTarget = saved.explode; S.filter = saved.filter; S.xray = saved.xray; S.labels = saved.labels;
      S.isolated = saved.isolated; S.selected = saved.selected;
      parts.forEach((p, i) => { if (saved.manual[i].lengthSq() > 1e-8) tweenManual(p, saved.manual[i], 0.8); });
      refreshVisual();
    }

    function setMode(m) {
      S.mode = m;
      S.running = m !== 'off';
      autoWanted = m === 'showcase' || m === 'config';
      controls.autoRotate = autoWanted;
      controls.autoRotateSpeed = m === 'showcase' ? 0.55 : 0.3;
      if (m !== 'explore') { S.hover = null; tip.visible = false; canvas.style.cursor = ''; }
      setHotspots(m === 'showcase');
      refreshVisual();
    }

    // ---------- Minijuego: arma la moto ----------
    const toScreen = (v) => { const r = canvas.getBoundingClientRect(); const p = v.clone().project(camera); return { x: (p.x + 1) / 2 * r.width + r.left, y: (1 - p.y) / 2 * r.height + r.top }; };
    function startGame(ids) {
      const g = S.game;
      cleanState(true);
      S.labels = false;
      g.active = true; g.ids = new Set(ids); g.placed = new Set(); g.t0 = performance.now();
      const pr = PRESETS.game;
      controls.target.set(pr.t[0], pr.t[1], pr.t[2]); camera.position.set(pr.p[0], pr.p[1], pr.p[2]); fly = null;
      controls.autoRotate = false;
      controls.update(); camera.updateMatrixWorld(); applyViewOffset();
      const arr = ids.slice().sort(() => Math.random() - 0.5);
      arr.forEach((id, i) => {
        const p = byId[id];
        const a = (i / arr.length) * PI * 2 + Math.random() * 0.25;
        const home = p.userData.homeWorld.clone();
        const hp = home.clone().project(camera);
        const n = V3(Math.cos(a) * (0.56 + Math.random() * 0.14), Math.sin(a) * (0.48 + Math.random() * 0.14), hp.z);
        if (Math.abs(n.x) < 0.45 && n.y > 0.25) n.y = 0.18 + Math.random() * 0.08; // no tapar el marcador
        n.y = clamp(n.y, -0.62, 0.5);
        const w = n.unproject(camera);
        p.userData.manual.copy(w.sub(home));
      });
      refreshVisual();
      emit('game', { type: 'start', total: g.ids.size });
    }
    function gameCheck(p) {
      const g = S.game, id = p.userData.id;
      if (!g.ids.has(id) || g.placed.has(id)) return;
      const home = p.userData.homeWorld.clone().add(bike.root.position);
      const cur = home.clone().add(p.userData.manual);
      const a = toScreen(cur), b = toScreen(home);
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 60 || cur.distanceTo(home) < 0.09) {
        tweenManual(p, V3(0, 0, 0), 0.22);
        g.placed.add(id);
        S.hover = null; refreshVisual();
        emit('game', { type: 'snap', id: id, x: b.x, y: b.y, placed: g.placed.size, total: g.ids.size });
        if (g.placed.size === g.ids.size) {
          const secs = (performance.now() - g.t0) / 1000;
          g.active = false;
          emit('game', { type: 'win', secs: secs, total: g.ids.size });
        }
      } else {
        emit('game', { type: 'miss', id: id, dist: d });
      }
    }
    function gameHint() {
      const g = S.game; if (!g.active) return null;
      const left = [...g.ids].filter((id) => !g.placed.has(id));
      if (!left.length) return null;
      const id = left[Math.floor(Math.random() * left.length)];
      marker.position.copy(byId[id].userData.homeWorld).add(bike.root.position);
      marker.visible = true;
      S.hoverExt = id; refreshVisual();
      setTimeout(() => { if (!drag) marker.visible = false; if (S.hoverExt === id) { S.hoverExt = null; refreshVisual(); } }, 1800);
      return id;
    }
    function endGame(assemble) {
      const g = S.game;
      g.active = false;
      marker.visible = false;
      if (assemble) parts.forEach((p) => { if (p.userData.manual.lengthSq() > 1e-8) tweenManual(p, V3(0, 0, 0), 0.9); });
      refreshVisual();
    }

    // ---------- Configuración visual ----------
    function applyConfig(cfg) {
      bike.setColors(cfg.colors);
      bike.setFrame(cfg.frame);
      bike.setWheel(cfg.wheel);
      bike.setExhaust(cfg.exhaust);
      Object.keys(cfg.acc).forEach((k) => bike.setAccessory(k, cfg.acc[k]));
      shadowDirty = 2;
    }

    // ---------- Capturas ----------
    function withSize(w, h, fn) {
      const prevPR = renderer.getPixelRatio();
      const prev = renderer.getSize(new T.Vector2());
      const tipV = tip.visible;
      floor.visible = false; tip.visible = false;
      const hs = hotspots.map((h) => h.visible);
      setHotspots(false);
      updateTransforms();
      bike.root.position.x = 0; bike.root.position.z = 0;
      bike.root.updateMatrixWorld(true);
      renderer.shadowMap.needsUpdate = true;
      shadowDirty = 2;
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      let out;
      try { out = fn(); } finally {
        renderer.setPixelRatio(prevPR);
        renderer.setSize(prev.x, prev.y, false);
        floor.visible = true; tip.visible = tipV;
        hotspots.forEach((h, i) => { h.visible = hs[i]; });
      }
      return out;
    }
    function snapshot(w, h, presetName) {
      return withSize(w || 1200, h || 760, () => {
        const pr = PRESETS[presetName || 'config'];
        const cam = new T.PerspectiveCamera(28, (w || 1200) / (h || 760), 0.03, 60);
        cam.position.set(pr.p[0], pr.p[1], pr.p[2]); cam.lookAt(pr.t[0], pr.t[1], pr.t[2]);
        renderer.render(scene, cam);
        return canvas.toDataURL('image/png');
      });
    }
    function sideSnapshot(w, h) {
      return withSize(w, h, () => {
        const span = 2.35, hh = span * h / w;
        const cam = new T.OrthographicCamera(-span / 2, span / 2, hh / 2, -hh / 2, 0.1, 20);
        cam.position.set(0.02, 0.56, 6); cam.lookAt(0.02, 0.56, 0); cam.updateMatrixWorld();
        renderer.render(scene, cam);
        const url = canvas.toDataURL('image/png');
        const project = (x, y, z) => { const p = V3(x, y, z).project(cam); return { x: (p.x + 1) / 2 * w, y: (1 - p.y) / 2 * h }; };
        return { url: url, project: project };
      });
    }

    // ---------- Bucle por fotograma ----------
    const _c = V3();
    function updateTransforms() {
      const e = S.explode;
      bike.root.position.y = S.lift * ease(clamp(e * 1.6, 0, 1));
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i], u = p.userData;
        let k = 0;
        if (e > 0) k = ease(clamp((e - u.stage * 0.16) / 0.52, 0, 1));
        p.position.copy(u.base).addScaledVector(u.ex, k).add(u.manual);
      }
    }
    // Calidad adaptativa: si el equipo va lento, baja la resolución interna
    const Q = { acc: 0, n: 0, pr: renderer.getPixelRatio(), lowered: false };
    function adapt(dt) {
      Q.acc += dt; Q.n++;
      if (Q.n < 90) return;
      const avg = Q.acc / Q.n; Q.acc = 0; Q.n = 0;
      if (avg > 0.028 && Q.pr > 1) { Q.pr = Math.max(1, Q.pr - 0.25); renderer.setPixelRatio(Q.pr); resize(); }
      if (avg > 0.034 && !Q.lowered) { Q.lowered = true; key.shadow.mapSize.set(1024, 1024); if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; } shadowDirty = 2; }
    }
    let lastExplode = -1;
    function frame(dt, sim) {
      if (!S.running) return;
      adapt(dt);
      // Explosión
      if (!S.explodeDragging) S.explode += (S.explodeTarget - S.explode) * Math.min(1, dt * 4.2);
      if (Math.abs(S.explode - S.explodeTarget) < 1e-4) S.explode = S.explodeTarget;
      if (S.explode !== lastExplode || tweens.length || drag || sim.on) shadowDirty = Math.max(shadowDirty, 1);
      lastExplode = S.explode;
      stepTweens(dt);
      updateTransforms();
      // Mecánica animada
      const rpm = sim.on ? sim.rpm : (S.animEngine ? 1500 : 0);
      S.crank += (rpm / 60) * 2 * PI * dt / 40;
      S.wheelF += (sim.speed / 0.3) * dt;
      S.wheelR += (sim.speed / 0.312) * dt;
      if (sim.on) S.fan += dt * (sim.temp > 92 ? 30 : 6);
      bike.animate({ crank: S.crank, wheelF: S.wheelF, wheelR: S.wheelR, gear: sim.gear || 1, fan: S.fan });
      if (sim.on && S.mode === 'showcase') {
        const amp = 0.0005 + (sim.rpm / 16000) * 0.0016;
        bike.root.position.x = (Math.random() - 0.5) * amp;
        bike.root.position.z = (Math.random() - 0.5) * amp * 0.6;
      } else { bike.root.position.x = 0; bike.root.position.z = 0; }
      S.tftT += dt;
      if (S.tftT > 0.12) { S.tftT = 0; if (sim.on || sim.starting || bike._tftOn) { bike.drawTFT(sim); bike._tftOn = sim.on || sim.starting; } }

      // Cámara
      stepFly(dt);
      if (Math.abs(camera.zoom - S.zoomTarget) > 0.001) { camera.zoom += (S.zoomTarget - camera.zoom) * Math.min(1, dt * 5); camera.updateProjectionMatrix(); }
      if (autoWanted && !controls.autoRotate && !drag && !S.isolated) { idleT += dt; if (idleT > 6) controls.autoRotate = true; }
      controls.update();

      // Hover
      if (S.mode === 'explore' && pointer.dirty && !drag) {
        pointer.dirty = false;
        const hit = pointer.inside ? pick(pointer.x, pointer.y) : null;
        let id = hit ? hit.part.userData.id : null;
        if (id && gameLocked(id)) id = null;
        if (id !== S.hover) {
          S.hover = id; refreshVisual();
          canvas.style.cursor = id ? 'grab' : '';
          if (id) {
            const u = byId[id].userData;
            tipEl.innerHTML = '<b>' + u.info.n + '</b><span style="color:' + sysColor(u.sys) + '">' + ZX.SYSTEMS[u.sys].name + '</span>';
          }
          emit('hover', id);
        }
      }
      const hid = drag ? drag.part.userData.id : S.hover;
      if (hid && S.mode === 'explore') {
        const p = byId[hid];
        tip.position.copy(p.localToWorld(_c.copy(p.userData.center)));
        tip.visible = true;
      } else tip.visible = false;

      if (shadowDirty > 0) { renderer.shadowMap.needsUpdate = true; shadowDirty--; }
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    }

    return {
      scene: scene, camera: camera, controls: controls, renderer: renderer, bike: bike, parts: parts, byId: byId, S: S,
      on: on, frame: frame, setMode: setMode, setSafeArea: setSafeArea, preset: preset, focusPart: focusPart,
      setExplode: setExplode, setFilter: setFilter, setXray: setXray, setLabels: setLabels, setAnimEngine: setAnimEngine,
      select: select, hoverExt: hoverExt, isolate: isolate, resetManual: resetManual, anyManual: anyManual,
      saveExplore: saveExplore, restoreExplore: restoreExplore, cleanState: cleanState,
      startGame: startGame, endGame: endGame, gameHint: gameHint,
      applyConfig: applyConfig, snapshot: snapshot, sideSnapshot: sideSnapshot, resize: resize,
      returnPart(id) { const p = byId[id]; if (p) tweenManual(p, V3(0, 0, 0), 0.6); }
    };
  };
})();
