/* =========================================================
   MODELO 3D PROCEDURAL DE LA NINJA ZX-4RR
   80 piezas independientes construidas con geometría de Three.js
   (sin archivos externos). Unidades: metros.
   Ejes: +X hacia delante, +Y arriba, +Z lado derecho del piloto.
   ========================================================= */
(function () {
  'use strict';
  const ZX = (window.ZX = window.ZX || {});

  ZX.buildBike = function () {
    const T = window.THREE;
    const U = window.THREE_ADDONS;
    const PI = Math.PI, DEG = PI / 180;
    const V3 = (x, y, z) => new T.Vector3(x, y, z || 0);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // ---------- Geometría de referencia ----------
    const FA = V3(0.69, 0.300, 0);          // eje delantero
    const RA = V3(-0.69, 0.312, 0);         // eje trasero
    const RAKE = 23.5 * DEG;
    const FD = V3(-Math.sin(RAKE), Math.cos(RAKE), 0); // eje de la horquilla
    const FN = V3(Math.cos(RAKE), Math.sin(RAKE), 0);  // perpendicular hacia delante
    const forkPt = (L, z) => V3(FA.x + FD.x * L, FA.y + FD.y * L, z || 0);
    const steerPt = (L) => V3(FA.x + FD.x * L - FN.x * 0.03, FA.y + FD.y * L - FN.y * 0.03, 0);
    const C = V3(0.12, 0.40, 0);            // eje del cigüeñal
    const TILT = 25 * DEG;                  // inclinación de los cilindros
    const CYL_AX = V3(Math.sin(TILT), Math.cos(TILT), 0);
    const ZC = [-0.105, -0.035, 0.035, 0.105]; // cilindros 1..4 (de izquierda a derecha)
    const CR = 0.0196, RL = 0.12;           // radio de manivela (carrera/2) y biela
    const IN_SHAFT = V3(0.015, 0.43, 0), OUT_SHAFT = V3(-0.055, 0.36, 0);
    const FS = V3(-0.055, 0.36, -0.118);    // piñón de ataque
    const RS = V3(RA.x, RA.y, -0.118);      // corona

    // ---------- Texturas generadas ----------
    function canvasTex(w, h, draw, repeat) {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      draw(cv.getContext('2d'), w, h);
      const tx = new T.CanvasTexture(cv);
      tx.colorSpace = T.SRGBColorSpace;
      if (repeat) { tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.repeat.set(repeat[0], repeat[1]); }
      tx.anisotropy = 8;
      return tx;
    }
    const finTex = canvasTex(64, 64, (c, w, h) => {
      c.fillStyle = '#3a3e42'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#111315';
      for (let x = 0; x < w; x += 4) c.fillRect(x, 0, 2, h);
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(0, 30, w, 3);
    }, [6, 2]);
    const carbonTex = canvasTex(64, 64, (c, w, h) => {
      c.fillStyle = '#16181b'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) {
        const odd = ((x + y) / 8) % 2;
        const g = c.createLinearGradient(x, y, x + 8, y + 8);
        g.addColorStop(0, odd ? '#2c3036' : '#1b1e22'); g.addColorStop(1, odd ? '#16181b' : '#30353b');
        c.fillStyle = g; c.fillRect(x, y, 8, 8);
      }
    }, [4, 4]);

    // Decoración (livery) en coordenadas laterales de la moto
    const LIV = { X0: -0.92, Y0: 0.08, W: 2.04, H: 1.12, w: 2048, h: 1124 };
    function liveryTex() {
      const cv = document.createElement('canvas'); cv.width = LIV.w; cv.height = LIV.h;
      const tx = new T.CanvasTexture(cv);
      tx.colorSpace = T.SRGBColorSpace;
      tx.repeat.set(1 / LIV.W, 1 / LIV.H);
      tx.offset.set(-LIV.X0 / LIV.W, -LIV.Y0 / LIV.H);
      tx.anisotropy = 8;
      return { cv, tx };
    }
    const livR = liveryTex(), livL = liveryTex();
    function lum(hex) {
      const c = new T.Color(hex);
      return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    }
    function drawLivery(L, col, mirrored) {
      const ctx = L.cv.getContext('2d');
      const W = LIV.w, H = LIV.h, S = W / LIV.W;
      const px = (x) => (x - LIV.X0) / LIV.W * W;
      const py = (y) => (1 - (y - LIV.Y0) / LIV.H) * H;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = col.p1; ctx.fillRect(0, 0, W, H);
      // brillo suave superior
      const gr = ctx.createLinearGradient(0, py(1.0), 0, py(0.5));
      gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      const low = [[1.25, 0.73], [0.80, 0.72], [0.55, 0.60], [0.30, 0.52], [0.05, 0.50], [-0.20, 0.70], [-0.50, 0.79], [-0.98, 0.88]];
      ctx.beginPath(); ctx.moveTo(px(1.25), py(0));
      low.forEach((p) => ctx.lineTo(px(p[0]), py(p[1])));
      ctx.lineTo(px(-0.98), py(0)); ctx.closePath();
      ctx.fillStyle = col.p2; ctx.fill();
      function stroke(off, w, color) {
        ctx.beginPath();
        low.forEach((p, i) => { const X = px(p[0]), Y = py(p[1] + off); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
        ctx.lineWidth = w * S; ctx.strokeStyle = color; ctx.lineJoin = 'round'; ctx.stroke();
      }
      stroke(0.024, 0.013, col.p3);
      stroke(0.05, 0.005, col.p3);
      // franja diagonal en el carenado
      ctx.beginPath();
      ctx.moveTo(px(0.64), py(0.815)); ctx.lineTo(px(0.675), py(0.80));
      ctx.lineTo(px(0.45), py(0.69)); ctx.lineTo(px(0.40), py(0.695));
      ctx.closePath(); ctx.fillStyle = col.p3; ctx.fill();
      // textos
      function text(str, x, y, size, color, weight) {
        ctx.save();
        ctx.translate(px(x), py(y));
        if (mirrored) ctx.scale(-1, 1);
        ctx.transform(1, 0, -0.24, 1, 0, 0);
        ctx.font = weight + ' ' + Math.round(size * S) + 'px Orbitron, Rajdhani, Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = color; ctx.fillText(str, 0, 0);
        ctx.restore();
      }
      const onP1 = lum(col.p1) > 0.4 ? col.p2 : (lum(col.p3) > 0.4 ? col.p3 : '#ffffff');
      const onP2 = lum(col.p2) < 0.3 ? (lum(col.p1) > 0.25 ? col.p1 : col.p3) : col.p3;
      text('Ninja', 0.215, 0.60, 0.072, onP1, '900');
      text('ZX-4RR', 0.2, 0.452, 0.028, onP2, '800');
      text('ZX-4RR', -0.52, 0.765, 0.026, onP2, '800');
      L.tx.needsUpdate = true;
    }

    const tftCv = document.createElement('canvas'); tftCv.width = 512; tftCv.height = 300;
    const tftTex = new T.CanvasTexture(tftCv); tftTex.colorSpace = T.SRGBColorSpace;
    function drawTFT(s) {
      const c = tftCv.getContext('2d');
      const W = 512, H = 300;
      c.fillStyle = '#040605'; c.fillRect(0, 0, W, H);
      const on = s && (s.on || s.starting);
      if (!on) {
        c.fillStyle = '#6BCB1F'; c.font = '900 52px Orbitron, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('ZX-4RR', W / 2, H / 2 - 10);
        c.fillStyle = '#4b5a46'; c.font = '600 20px Rajdhani, Arial'; c.fillText('KAWASAKI NINJA', W / 2, H / 2 + 38);
      } else {
        const r = Math.min(1, s.rpm / 16000);
        for (let i = 0; i < 40; i++) {
          const x = 20 + i * 11.8, hgt = 20 + i * 1.6;
          const lit = i / 40 < r;
          c.fillStyle = lit ? (i > 35 ? '#ff3b3b' : i > 30 ? '#ffb22e' : '#6BCB1F') : '#18201a';
          c.fillRect(x, 90 - hgt, 8, hgt);
        }
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = '#ffffff'; c.font = '900 110px Orbitron, Arial';
        c.fillText(String(Math.round(s.speed * 3.6)), 200, 190);
        c.fillStyle = '#6BCB1F'; c.font = '900 120px Orbitron, Arial';
        c.fillText(s.gear ? String(s.gear) : 'N', 420, 185);
        c.fillStyle = '#9aa696'; c.font = '700 22px Rajdhani, Arial';
        c.fillText('km/h', 200, 262);
        c.fillText((ZX.RIDE_MODES[s.mode] || {}).name || '', 420, 262);
      }
      tftTex.needsUpdate = true;
    }

    // ---------- Materiales ----------
    const M = {};
    const std = (o, role) => { const m = new T.MeshStandardMaterial(o); if (role) m.userData.role = role; return m; };
    const phys = (o, role) => { const m = new T.MeshPhysicalMaterial(o); if (role) m.userData.role = role; return m; };
    M.paint1 = phys({ color: '#5fbf1e', metalness: 0.35, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 }, 'paint1');
    M.paint1DS = M.paint1.clone(); M.paint1DS.side = T.DoubleSide;
    M.paint2 = phys({ color: '#111214', metalness: 0.4, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.12 }, 'paint2');
    M.liveryR = phys({ color: '#ffffff', map: livR.tx, metalness: 0.35, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 }, 'livery');
    M.liveryL = phys({ color: '#ffffff', map: livL.tx, metalness: 0.35, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 }, 'livery');
    M.frame = std({ color: '#5fbf1e', metalness: 0.55, roughness: 0.32 }, 'frame');
    M.wheel = std({ color: '#121314', metalness: 0.55, roughness: 0.38 }, 'wheel');
    M.wheelDS = M.wheel.clone(); M.wheelDS.side = T.DoubleSide;
    M.stripe = std({ color: '#5fbf1e', metalness: 0.3, roughness: 0.4 }, 'paint1');
    M.engine = std({ color: '#26292d', metalness: 0.6, roughness: 0.5 });
    M.engineHi = std({ color: '#4a4f56', metalness: 0.8, roughness: 0.38 });
    M.alu = std({ color: '#c3c8ce', metalness: 1, roughness: 0.3 });
    M.aluDark = std({ color: '#6b7178', metalness: 1, roughness: 0.38 });
    M.steel = std({ color: '#d5d8dc', metalness: 1, roughness: 0.2 });
    M.chrome = std({ color: '#ffffff', metalness: 1, roughness: 0.07 });
    M.header = std({ color: '#c8b496', metalness: 1, roughness: 0.28 });
    M.black = std({ color: '#0d0e0f', metalness: 0.1, roughness: 0.65 });
    M.blackGloss = std({ color: '#0b0c0d', metalness: 0.3, roughness: 0.25 });
    M.rubber = std({ color: '#151515', metalness: 0, roughness: 0.92 });
    M.gold = std({ color: '#d4a12a', metalness: 1, roughness: 0.26 });
    M.copper = std({ color: '#b87333', metalness: 1, roughness: 0.32 });
    M.friction = std({ color: '#6d4a2e', metalness: 0.15, roughness: 0.85 });
    M.disc = std({ color: '#c9ccd1', metalness: 1, roughness: 0.22, side: T.DoubleSide });
    M.caliper = std({ color: '#c9a13a', metalness: 0.9, roughness: 0.3 });
    M.spring = std({ color: '#e8b500', metalness: 0.5, roughness: 0.35 });
    M.chain = std({ color: '#8a9097', metalness: 1, roughness: 0.35 });
    M.seat = std({ color: '#1b1c1d', metalness: 0, roughness: 0.86 });
    M.swing = std({ color: '#2b2e33', metalness: 0.7, roughness: 0.4 });
    M.subframe = std({ color: '#1c1e21', metalness: 0.6, roughness: 0.45 });
    M.glass = phys({ color: '#3a4652', metalness: 0, roughness: 0.04, transparent: true, opacity: 0.4, side: T.DoubleSide, depthWrite: false });
    M.glassDark = phys({ color: '#101418', metalness: 0, roughness: 0.04, transparent: true, opacity: 0.66, side: T.DoubleSide, depthWrite: false });
    M.lens = std({ color: '#e8f7ff', emissive: '#d8f2ff', emissiveIntensity: 2.2, metalness: 0, roughness: 0.2 });
    M.tailLight = std({ color: '#3a0000', emissive: '#ff1a1a', emissiveIntensity: 1.8 });
    M.amber = std({ color: '#5a3000', emissive: '#ff9900', emissiveIntensity: 1.2 });
    M.radiator = std({ color: '#ffffff', map: finTex, metalness: 0.6, roughness: 0.5 });
    M.carbon = std({ color: '#ffffff', map: carbonTex, metalness: 0.4, roughness: 0.28 });
    M.titanium = std({ color: '#a7b0bb', metalness: 1, roughness: 0.22 });
    M.tiBlue = std({ color: '#7181c4', metalness: 1, roughness: 0.25 });
    M.blueAnod = std({ color: '#2a62d6', metalness: 0.8, roughness: 0.3 });
    M.redPlug = std({ color: '#b3261e', metalness: 0.3, roughness: 0.5 });
    M.tft = std({ color: '#000000', emissive: '#ffffff', emissiveMap: tftTex, emissiveIntensity: 1, roughness: 0.25 });
    M.screenBlack = std({ color: '#050505', metalness: 0.2, roughness: 0.3 });

    // ---------- Utilidades de geometría ----------
    function mesh(geo, mat, noShadow) {
      const m = new T.Mesh(geo, mat);
      m.castShadow = !noShadow; m.receiveShadow = true;
      return m;
    }
    function at(o, x, y, z) { o.position.set(x, y, z || 0); return o; }
    function box(w, h, d, mat) { return mesh(new T.BoxGeometry(w, h, d), mat); }
    function rbox(w, h, d, r, mat, seg) { return mesh(new U.RoundedBoxGeometry(w, h, d, seg || 3, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)), mat); }
    function cylY(r1, r2, h, mat, seg) { return mesh(new T.CylinderGeometry(r1, r2, h, seg || 24), mat); }
    function cylZ(r, h, mat, seg) { const g = new T.CylinderGeometry(r, r, h, seg || 24); g.rotateX(PI / 2); return mesh(g, mat); }
    function cylX(r, h, mat, seg) { const g = new T.CylinderGeometry(r, r, h, seg || 24); g.rotateZ(PI / 2); return mesh(g, mat); }
    function sphere(r, mat) { return mesh(new T.SphereGeometry(r, 14, 10), mat); }
    function orient(o, a, b) {
      const dir = new T.Vector3().subVectors(b, a);
      o.position.copy(a).addScaledVector(dir, 0.5);
      o.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.normalize());
      return o;
    }
    function strut(a, b, r, mat, seg) {
      return orient(mesh(new T.CylinderGeometry(r, r, a.distanceTo(b), seg || 12), mat), a, b);
    }
    function boxBetween(a, b, w, d, mat) {
      return orient(mesh(new T.BoxGeometry(w, a.distanceTo(b), d), mat), a, b);
    }
    function alongY(a, b) { // grupo con origen en a y eje Y hacia b
      const g = new T.Group(); g.position.copy(a);
      g.quaternion.setFromUnitVectors(V3(0, 1, 0), new T.Vector3().subVectors(b, a).normalize());
      return g;
    }
    function tube(pts, r, mat, segs, radial, closed) {
      const curve = new T.CatmullRomCurve3(pts, !!closed, 'centripetal');
      return mesh(new T.TubeGeometry(curve, segs || 48, r, radial || 10, !!closed), mat);
    }
    function helix(rad, tr, y0, y1, turns, mat) {
      const pts = [];
      const n = Math.round(turns * 24);
      for (let i = 0; i <= n; i++) {
        const t = i / n, a = t * turns * 2 * PI;
        pts.push(V3(Math.cos(a) * rad, y0 + (y1 - y0) * t, Math.sin(a) * rad));
      }
      return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), n * 2, tr, 6, false), mat);
    }
    function smoothShape(pts, n) {
      const c = new T.CatmullRomCurve3(pts.map((p) => V3(p[0], p[1], 0)), true, 'centripetal');
      return new T.Shape(c.getSpacedPoints(n || 96).slice(0, -1).map((v) => new T.Vector2(v.x, v.y)));
    }
    function polyShape(pts) { return new T.Shape(pts.map((p) => new T.Vector2(p[0], p[1]))); }
    function slot(cx, cy, w, h, ang) {
      const c = Math.cos(ang), s = Math.sin(ang);
      return new T.Path([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => new T.Vector2(cx + x * c - y * s, cy + x * s + y * c)));
    }
    function circlePath(cx, cy, r) { const p = new T.Path(); p.absarc(cx, cy, r, 0, PI * 2, true); return p; }
    function extrude(shape, depth, bevel, bevelSeg, opt) {
      opt = opt || {};
      const g = new T.ExtrudeGeometry(shape, {
        depth: depth, bevelEnabled: bevel > 0, bevelThickness: bevel,
        bevelSize: opt.bevelSize !== undefined ? opt.bevelSize : bevel * 0.8,
        bevelSegments: bevelSeg || 3, curveSegments: opt.curveSegments || 16, steps: 1
      });
      g.translate(0, 0, -depth / 2);
      if (opt.zfn) {
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, opt.zfn(p.getX(i), p.getY(i), p.getZ(i)));
      }
      // toCreasedNormals agrupa vértices a 0,01 unidades: escalamos para trabajar en décimas de mm
      g.scale(1000, 1000, 1000);
      const out = U.toCreasedNormals(g, opt.crease !== undefined ? opt.crease : 0.7);
      out.scale(0.001, 0.001, 0.001);
      return out;
    }
    function gearShape(r, teeth, td, holeR, holes, holeRing, holeSize) {
      const s = new T.Shape(), n = teeth * 4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * PI * 2, k = i % 4;
        const rr = k === 0 || k === 1 ? r : r - td;
        if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      if (holeR) s.holes.push(circlePath(0, 0, holeR));
      for (let j = 0; j < (holes || 0); j++) {
        const a = (j / holes) * PI * 2;
        s.holes.push(circlePath(Math.cos(a) * holeRing, Math.sin(a) * holeRing, holeSize));
      }
      return s;
    }
    function gear(r, teeth, depth, mat, holeR, holes, holeRing, holeSize) {
      const g = new T.ExtrudeGeometry(gearShape(r, teeth, Math.max(0.003, r * 0.09), holeR, holes, holeRing, holeSize), { depth: depth, bevelEnabled: false, curveSegments: 12 });
      g.translate(0, 0, -depth / 2);
      return mesh(g, mat);
    }
    function petalDisc(R, rIn, petals, mat) {
      const s = new T.Shape(), n = petals * 24;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * PI * 2;
        const k = Math.abs(Math.cos((a * petals) / 2));
        const rr = R - 0.009 * (1 - Math.pow(k, 0.35));
        if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      s.holes.push(circlePath(0, 0, rIn));
      const ring = (R + rIn) / 2, nh = Math.round(petals * 1.5);
      for (let j = 0; j < nh; j++) {
        const a = (j / nh) * PI * 2 + 0.1;
        s.holes.push(circlePath(Math.cos(a) * ring, Math.sin(a) * ring, 0.0035));
      }
      const g = new T.ExtrudeGeometry(s, { depth: 0.005, bevelEnabled: false, curveSegments: 8 });
      g.translate(0, 0, -0.0025);
      return mesh(g, mat);
    }
    function carrier(rOut, rIn, mat) {
      const s = new T.Shape(); s.absarc(0, 0, rOut, 0, PI * 2, false);
      s.holes.push(circlePath(0, 0, rIn));
      for (let j = 0; j < 5; j++) {
        const a = (j / 5) * PI * 2;
        s.holes.push(circlePath(Math.cos(a) * (rOut + rIn) / 2, Math.sin(a) * (rOut + rIn) / 2, (rOut - rIn) * 0.28));
      }
      const g = new T.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: false, curveSegments: 24 });
      g.translate(0, 0, -0.004);
      return mesh(g, mat);
    }
    function shell(center, widthFn, dropK, nu, nv) { // superficie fina (cúpula)
      const pos = [], idx = [];
      const curve = new T.CatmullRomCurve3(center.map((p) => V3(p[0], p[1], 0)), false, 'centripetal');
      for (let j = 0; j <= nv; j++) {
        const v = j / nv, p = curve.getPoint(v), w = widthFn(v);
        for (let i = 0; i <= nu; i++) {
          const u = i / nu, z = (u - 0.5) * w;
          pos.push(p.x - Math.abs(z) * 0.12 * (1 - v), p.y - dropK * z * z, z);
        }
      }
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setIndex(idx); g.computeVertexNormals();
      return g;
    }

    // ---------- Registro de piezas ----------
    const root = new T.Group(); root.name = 'ZX4RR';
    const parts = [], byId = {}, A = {};
    function part(id, sys, opts, build) {
      const g = new T.Group(); g.name = id;
      if (opts.pos) g.position.copy(opts.pos);
      if (opts.rotZ) g.rotation.z = opts.rotZ;
      const inner = new T.Group(); g.add(inner);
      build(inner, g);
      const ex = opts.ex ? (opts.ex.isVector3 ? opts.ex : V3(opts.ex[0], opts.ex[1], opts.ex[2])) : V3(0, 0, 0);
      g.userData = { id: id, sys: sys, ex: ex, stage: opts.stage || 0, inner: inner, base: g.position.clone(), manual: V3(0, 0, 0), info: ZX.PART_INFO[id] || { n: id, d: '', s: [], t: '' } };
      root.add(g); parts.push(g); byId[id] = g;
      return g;
    }
    const CYL = { pos: C, rotZ: -TILT };
    const axEx = (k, extra) => { const v = CYL_AX.clone().multiplyScalar(k); if (extra) v.add(V3(extra[0], extra[1], extra[2])); return v; };

    /* ================= MOTOR ================= */
    part('carter', 'motor', { ex: [0, -0.14, 0], stage: 2 }, (g) => {
      g.add(at(rbox(0.32, 0.25, 0.36, 0.045, M.engine), 0.13, 0.355, 0));
      g.add(at(rbox(0.21, 0.25, 0.22, 0.04, M.engine), -0.04, 0.37, 0));
      g.add(at(box(0.325, 0.006, 0.364, M.engineHi), 0.13, 0.40, 0));
      for (let i = 0; i < 5; i++) g.add(at(cylZ(0.006, 0.37, M.aluDark, 8), 0.0 + i * 0.065, 0.25, 0));
    });
    part('carterAceite', 'motor', { ex: [0, -0.32, 0], stage: 2 }, (g) => {
      g.add(at(rbox(0.26, 0.055, 0.25, 0.02, M.engineHi), 0.10, 0.215, 0));
      g.add(at(cylY(0.012, 0.012, 0.012, M.alu, 6), 0.05, 0.185, 0));
    });
    part('bloque', 'motor', Object.assign({ ex: axEx(0.40), stage: 2 }, CYL), (g) => {
      g.add(at(rbox(0.13, 0.12, 0.345, 0.012, M.engine), 0, 0.145, 0));
      for (let i = 0; i < 4; i++) g.add(at(box(0.134, 0.004, 0.349, M.engineHi), 0, 0.103 + i * 0.028, 0));
    });
    part('culata', 'motor', Object.assign({ ex: axEx(0.53), stage: 2 }, CYL), (g) => {
      g.add(at(rbox(0.16, 0.08, 0.35, 0.012, M.aluDark), 0, 0.245, 0));
      ZC.forEach((z) => {
        g.add(at(cylX(0.017, 0.022, M.aluDark), 0.088, 0.235, z));
        g.add(at(cylX(0.018, 0.022, M.aluDark), -0.088, 0.25, z));
      });
    });
    part('tapaValvulas', 'motor', Object.assign({ ex: axEx(0.88), stage: 2 }, CYL), (g) => {
      g.add(at(rbox(0.145, 0.04, 0.33, 0.016, M.engine), 0, 0.305, 0));
      g.add(at(box(0.034, 0.004, 0.29, M.stripe), 0.035, 0.3255, 0));
      [-0.15, 0.15].forEach((z) => [-0.055, 0.055].forEach((x) => g.add(at(cylY(0.006, 0.006, 0.006, M.alu, 8), x, 0.327, z))));
    });
    part('bobinas', 'motor', Object.assign({ ex: axEx(1.02), stage: 2 }, CYL), (g) => {
      ZC.forEach((z) => {
        g.add(at(cylY(0.0105, 0.0105, 0.055, M.black), 0, 0.352, z));
        g.add(at(rbox(0.032, 0.018, 0.026, 0.005, M.blackGloss), 0, 0.384, z));
        g.add(at(cylY(0.004, 0.004, 0.012, M.redPlug, 8), -0.018, 0.384, z));
      });
      g.add(at(cylZ(0.005, 0.3, M.black, 8), -0.02, 0.39, 0));
    });
    part('valvulas', 'motor', Object.assign({ ex: axEx(0.68), stage: 3 }, CYL), (g) => {
      ZC.forEach((z) => [-0.022, 0.022].forEach((x) => [-0.012, 0.012].forEach((dz) => {
        g.add(at(cylY(0.0095, 0.0095, 0.002, M.steel, 16), x, 0.209, z + dz));
        g.add(at(cylY(0.0022, 0.0022, 0.045, M.steel, 8), x, 0.232, z + dz));
        g.add(at(cylY(0.0065, 0.0065, 0.016, M.spring, 10), x, 0.248, z + dz));
      })));
    });
    function cam(id, x, ex) {
      part(id, 'motor', Object.assign({ ex: ex, stage: 3 }, CYL), (g) => {
        const spin = new T.Group(); spin.position.set(x, 0.268, 0); g.add(spin);
        spin.add(cylZ(0.0095, 0.33, M.steel, 12));
        ZC.forEach((z, ci) => [-0.012, 0.012].forEach((dz) => {
          const lobe = rbox(0.03, 0.019, 0.008, 0.006, M.steel, 2);
          lobe.position.set(0, 0, z + dz);
          lobe.rotation.z = (ci % 2 ? PI / 2 : 0) + (x > 0 ? 0.6 : -0.6);
          spin.add(lobe);
        }));
        spin.add(at(gear(0.024, 22, 0.006, M.aluDark), 0, 0, 0.158));
        A[id] = spin;
      });
    }
    cam('levaAdm', -0.028, axEx(0.78, [-0.06, 0, 0]));
    cam('levaEsc', 0.028, axEx(0.78, [0.06, 0, 0]));
    for (let i = 0; i < 4; i++) {
      part('piston' + (i + 1), 'motor', Object.assign({ ex: axEx(0.27), stage: 3 }, CYL), (g) => {
        g.add(at(cylY(0.0285, 0.0285, 0.03, M.alu, 28), 0, 0.002, ZC[i]));
        [0.011, 0.006].forEach((y) => { const t = mesh(new T.TorusGeometry(0.0286, 0.0011, 4, 28), M.steel); t.rotation.x = PI / 2; t.position.set(0, y, ZC[i]); g.add(t); });
        g.add(at(cylZ(0.006, 0.05, M.steel, 10), 0, 0, ZC[i]));
      });
      part('biela' + (i + 1), 'motor', Object.assign({ ex: axEx(0.14), stage: 3 }, CYL), (g) => {
        g.add(at(cylZ(0.017, 0.014, M.steel, 18), 0, 0, ZC[i]));
        g.add(at(box(0.012, RL - 0.02, 0.01, M.steel), 0, RL / 2, ZC[i]));
        g.add(at(cylZ(0.009, 0.012, M.steel, 14), 0, RL, ZC[i]));
      });
    }
    part('ciguenal', 'motor', Object.assign({ ex: [0.34, -0.18, 0], stage: 3 }, CYL), (g) => {
      g.add(cylZ(0.013, 0.42, M.steel, 16));
      ZC.forEach((z, i) => {
        const top = i === 0 || i === 3;
        [-0.013, 0.013].forEach((dz) => {
          const cg = new T.CylinderGeometry(0.04, 0.04, 0.008, 24, 1, false, top ? 1.5 * PI : 0.5 * PI, PI);
          cg.rotateX(PI / 2);
          const cw = mesh(cg, M.engineHi); cw.position.z = z + dz; g.add(cw);
          g.add(at(box(0.022, CR + 0.012, 0.008, M.engineHi), 0, top ? CR / 2 : -CR / 2, z + dz));
        });
        g.add(at(cylZ(0.0115, 0.02, M.chrome, 12), 0, top ? CR : -CR, z));
      });
      g.add(at(gear(0.042, 34, 0.012, M.aluDark), 0, 0, 0.2));
    });
    function shaft(id, pos, radii, ex) {
      part(id, 'motor', { pos: pos, ex: ex, stage: 3 }, (g) => {
        g.add(at(cylZ(0.009, id === 'ejeSecundario' ? 0.25 : 0.24, M.steel, 12), 0, 0, -0.005));
        radii.forEach((r, k) => g.add(at(gear(r, Math.max(10, Math.round(r * 620)), 0.011, k % 2 ? M.steel : M.alu, 0.009), 0, 0, -0.075 + k * 0.03)));
      });
    }
    const GR = [2.92, 2.06, 1.66, 1.42, 1.26, 1.14];
    shaft('ejePrimario', IN_SHAFT, GR.map((g) => 0.094 / (1 + g)), [-0.24, 0.04, 0]);
    shaft('ejeSecundario', OUT_SHAFT, GR.map((g) => 0.094 * g / (1 + g)), [-0.32, -0.16, 0]);
    part('embrague', 'motor', { pos: V3(IN_SHAFT.x, IN_SHAFT.y, 0.165), ex: [0, 0, 0.28], stage: 3 }, (g) => {
      g.add(at(gear(0.07, 64, 0.034, M.aluDark, 0.061), 0, 0, 0));
      for (let i = 0; i < 8; i++) g.add(at(cylZ(0.058, 0.0032, i % 2 ? M.steel : M.friction, 36), 0, 0, -0.014 + i * 0.004));
      g.add(at(cylZ(0.05, 0.006, M.alu, 36), 0, 0, 0.02));
      for (let j = 0; j < 5; j++) { const a = (j / 5) * PI * 2; g.add(at(cylZ(0.006, 0.014, M.spring, 8), Math.cos(a) * 0.03, Math.sin(a) * 0.03, 0.028)); }
    });
    part('tapaEmbrague', 'motor', { ex: [0, 0, 0.44], stage: 2 }, (g) => {
      g.add(at(cylZ(0.085, 0.03, M.engine, 40), IN_SHAFT.x, IN_SHAFT.y, 0.195));
      const cap = mesh(new T.SphereGeometry(0.085, 36, 12, 0, PI * 2, 0, PI / 2), M.engine);
      cap.rotation.x = PI / 2; cap.scale.y = 0.28; cap.position.set(IN_SHAFT.x, IN_SHAFT.y, 0.21); g.add(cap);
      g.add(at(cylZ(0.03, 0.008, M.alu, 28), IN_SHAFT.x, IN_SHAFT.y, 0.234));
      for (let j = 0; j < 8; j++) { const a = (j / 8) * PI * 2; g.add(at(cylZ(0.0045, 0.006, M.alu, 6), IN_SHAFT.x + Math.cos(a) * 0.078, IN_SHAFT.y + Math.sin(a) * 0.078, 0.212)); }
    });
    part('alternador', 'motor', { pos: V3(C.x, C.y, -0.195), ex: [0, 0, -0.28], stage: 3 }, (g) => {
      g.add(cylZ(0.05, 0.026, M.steel, 32));
      for (let j = 0; j < 12; j++) { const a = (j / 12) * PI * 2; g.add(at(box(0.012, 0.016, 0.02, M.copper), Math.cos(a) * 0.032, Math.sin(a) * 0.032, -0.004)); }
      g.add(at(cylZ(0.015, 0.03, M.aluDark, 16), 0, 0, 0.01));
    });
    part('tapaAlternador', 'motor', { ex: [0, 0, -0.44], stage: 2 }, (g) => {
      g.add(at(cylZ(0.066, 0.026, M.engine, 36), C.x, C.y, -0.207));
      const cap = mesh(new T.SphereGeometry(0.066, 32, 10, 0, PI * 2, 0, PI / 2), M.engine);
      cap.rotation.x = -PI / 2; cap.scale.y = 0.32; cap.position.set(C.x, C.y, -0.22); g.add(cap);
      g.add(at(cylZ(0.024, 0.006, M.alu, 24), C.x, C.y, -0.242));
    });
    part('arranque', 'motor', { ex: [-0.16, 0.12, -0.32], stage: 2 }, (g) => {
      g.add(at(cylZ(0.026, 0.1, M.black, 20), 0.03, 0.52, -0.06));
      g.add(at(cylZ(0.027, 0.02, M.alu, 20), 0.03, 0.52, -0.115));
      g.add(at(cylY(0.006, 0.006, 0.02, M.redPlug, 8), 0.03, 0.55, -0.03));
    });
    part('filtroAceite', 'motor', { ex: [0.24, -0.16, 0.26], stage: 2 }, (g) => {
      const f = cylY(0.033, 0.033, 0.065, M.blueAnod, 24);
      f.position.set(0.305, 0.27, 0.15); f.rotation.z = -1.0; g.add(f);
      const b = cylY(0.036, 0.036, 0.01, M.aluDark, 24);
      b.position.set(0.28, 0.285, 0.15); b.rotation.z = -1.0; g.add(b);
    });

    /* ============ ADMISIÓN / ESCAPE / REFRIGERACIÓN ============ */
    part('radiador', 'admision', { ex: [0.40, 0.06, 0], stage: 1 }, (g) => {
      const r = new T.Group(); r.position.set(0.375, 0.585, 0); r.rotation.z = 0.2; g.add(r);
      r.add(box(0.03, 0.265, 0.33, [M.radiator, M.radiator, M.engine, M.engine, M.engine, M.engine]));
      [-1, 1].forEach((s) => r.add(at(box(0.036, 0.275, 0.025, M.alu), 0, 0, 0.175 * s)));
      r.add(at(box(0.036, 0.018, 0.33, M.aluDark), 0, 0.14, 0));
      r.add(at(cylX(0.008, 0.02, M.alu, 8), 0.02, 0.14, 0.12));
      g.add(tube([V3(0.40, 0.46, 0.17), V3(0.36, 0.42, 0.17), V3(0.30, 0.40, 0.165)], 0.012, M.black, 16, 8));
      g.add(tube([V3(0.355, 0.71, -0.17), V3(0.31, 0.68, -0.16), V3(0.27, 0.64, -0.13)], 0.012, M.black, 16, 8));
    });
    part('ventilador', 'admision', { ex: [0.24, 0.06, 0], stage: 2 }, (g) => {
      const f = new T.Group(); f.position.set(0.345, 0.59, 0); f.rotation.z = 0.2; g.add(f);
      const ring = mesh(new T.TorusGeometry(0.1, 0.006, 8, 40), M.black); ring.rotation.y = PI / 2; f.add(ring);
      const spin = new T.Group(); f.add(spin);
      spin.add(cylX(0.022, 0.02, M.black, 16));
      for (let j = 0; j < 7; j++) {
        const b = box(0.004, 0.085, 0.028, M.black);
        const a = (j / 7) * PI * 2;
        b.position.set(0, Math.cos(a) * 0.055, Math.sin(a) * 0.055);
        b.rotation.x = -a; b.rotation.y = 0.5;
        spin.add(b);
      }
      [-1, 1].forEach((s) => f.add(at(box(0.01, 0.2, 0.012, M.black), 0, 0, 0.1 * s)));
      A.fan = spin;
    });
    part('ramAir', 'admision', { ex: [0.30, 0.66, 0], stage: 1 }, (g) => {
      g.add(tube([V3(1.0, 0.718, 0), V3(0.86, 0.735, 0), V3(0.70, 0.77, -0.03), V3(0.55, 0.80, -0.075), V3(0.43, 0.815, -0.075), V3(0.32, 0.81, -0.04), V3(0.27, 0.80, 0)], 0.028, M.black, 64, 12));
      g.add(at(rbox(0.03, 0.032, 0.05, 0.008, M.black), 1.03, 0.712, 0));
      const grid = box(0.004, 0.024, 0.04, M.aluDark); grid.position.set(1.046, 0.712, 0); g.add(grid);
    });
    part('cajaAire', 'admision', { ex: [-0.06, 0.46, 0], stage: 1 }, (g) => {
      g.add(at(rbox(0.25, 0.1, 0.24, 0.025, M.black), 0.20, 0.79, 0));
      g.add(at(box(0.18, 0.012, 0.18, M.engineHi), 0.20, 0.735, 0));
    });
    part('cuerposAcel', 'admision', { ex: [-0.1, 0.30, 0], stage: 1 }, (g) => {
      ZC.forEach((z) => {
        g.add(strut(V3(0.148, 0.655, z), V3(0.165, 0.735, z), 0.017, M.alu, 16));
        g.add(at(cylY(0.019, 0.019, 0.01, M.black, 16), 0.155, 0.69, z));
        g.add(strut(V3(0.13, 0.69, z), V3(0.165, 0.705, z), 0.005, M.black, 8));
      });
      g.add(at(cylZ(0.007, 0.3, M.aluDark, 8), 0.128, 0.69, 0));
    });
    part('colectores', 'admision', { ex: [0.32, -0.26, 0], stage: 1 }, (g) => {
      ZC.forEach((z) => {
        const p0 = (function () { const l = 0.088, h = 0.235; return V3(C.x + l * Math.cos(TILT) + h * Math.sin(TILT), C.y - l * Math.sin(TILT) + h * Math.cos(TILT), z); })();
        g.add(tube([p0, V3(0.322, 0.54, z), V3(0.338, 0.43, z * 0.97), V3(0.325, 0.30, z * 0.9), V3(0.27, 0.205, z * 0.75), V3(0.15, 0.172, z * 0.5), V3(0.03, 0.17, z * 0.3)], 0.016, M.header, 64, 12));
      });
    });
    part('precamara', 'admision', { ex: [0, -0.34, 0], stage: 1 }, (g) => {
      g.add(at(rbox(0.2, 0.065, 0.15, 0.025, M.engine), -0.05, 0.175, 0.02));
      g.add(at(box(0.14, 0.004, 0.12, M.aluDark), -0.05, 0.209, 0.02));
    });
    part('silenciador', 'admision', { ex: [-0.30, -0.12, 0.42], stage: 1 }, (g) => {
      g.add(tube([V3(-0.13, 0.18, 0.06), V3(-0.19, 0.19, 0.12), V3(-0.245, 0.205, 0.185)], 0.022, M.header, 24, 10));
      const a = V3(-0.245, 0.205, 0.19), b = V3(-0.49, 0.29, 0.19);
      const len = a.distanceTo(b);
      const mk = () => { const gr = alongY(a, b); g.add(gr); return gr; };
      // Original: hexagonal negro
      const s1 = mk(); s1.userData.exhaust = 'stock';
      s1.add(at(cylY(0.066, 0.072, len * 0.9, M.black, 6), 0, len * 0.47, 0));
      s1.add(at(cylY(0.06, 0.066, 0.025, M.aluDark, 6), 0, len * 0.93, 0));
      s1.add(at(cylY(0.022, 0.022, 0.05, M.chrome, 16), 0, len * 0.98, 0));
      // Titanio
      const s2 = mk(); s2.userData.exhaust = 'ti'; s2.visible = false;
      s2.add(at(cylY(0.022, 0.026, 0.06, M.tiBlue, 16), 0, 0.03, 0));
      s2.add(at(cylY(0.064, 0.064, len * 0.95, M.titanium, 32), 0, len * 0.54, 0));
      s2.add(at(cylY(0.05, 0.064, 0.04, M.carbon, 32), 0, len * 1.03, 0));
      s2.add(at(cylY(0.02, 0.02, 0.03, M.tiBlue, 16), 0, len * 1.06, 0));
      // Carbono racing ovalado
      const s3 = mk(); s3.userData.exhaust = 'carbon'; s3.visible = false;
      const body = cylY(0.07, 0.07, len * 0.72, M.carbon, 32); body.position.y = len * 0.42; body.scale.x = 0.72; s3.add(body);
      const cap3 = cylY(0.07, 0.072, 0.03, M.titanium, 32); cap3.position.y = len * 0.8; cap3.scale.x = 0.72; s3.add(cap3);
      s3.add(at(cylY(0.024, 0.024, 0.06, M.titanium, 16), 0, len * 0.84, 0));
      // abrazadera
      g.add(strut(V3(-0.40, 0.3, 0.19), V3(-0.40, 0.45, 0.17), 0.008, M.aluDark, 8));
      A.exhaust = [s1, s2, s3];
    });

    /* ================= CHASIS ================= */
    part('chasis', 'chasis', { ex: [0, 0, 0], stage: 1 }, (g) => {
      g.add(strut(steerPt(0.485), steerPt(0.675), 0.027, M.frame, 20));
      [-1, 1].forEach((s) => {
        const N1 = V3(0.405, 0.862, 0.035 * s), N2 = V3(0.455, 0.765, 0.035 * s), T1 = V3(0.24, 0.835, 0.115 * s), T2 = V3(0.03, 0.80, 0.125 * s),
          T3 = V3(-0.11, 0.745, 0.13 * s), B1 = V3(0.31, 0.63, 0.18 * s), B2 = V3(0.10, 0.61, 0.183 * s), P1 = V3(-0.07, 0.60, 0.17 * s);
        [[N1, T1], [N2, T1], [N2, B1], [T1, B1], [T1, B2], [T1, T2], [B1, B2], [T2, B2], [T2, T3], [B2, P1], [T2, P1], [T3, P1]].forEach((p) => g.add(strut(p[0], p[1], 0.0115, M.frame)));
        [N1, N2, T1, T2, T3, B1, B2, P1].forEach((p) => g.add(at(sphere(0.0135, M.frame), p.x, p.y, p.z)));
        g.add(at(rbox(0.085, 0.23, 0.016, 0.012, M.frame), -0.085, 0.515, 0.172 * s));
        g.add(boxBetween(B1, V3(0.27, 0.49, 0.17 * s), 0.03, 0.01, M.frame));
        g.add(at(cylZ(0.016, 0.012, M.aluDark, 16), -0.10, 0.44, 0.182 * s));
      });
      g.add(strut(V3(-0.11, 0.745, -0.13), V3(-0.11, 0.745, 0.13), 0.011, M.frame));
      g.add(strut(V3(-0.07, 0.60, -0.17), V3(-0.07, 0.60, 0.17), 0.012, M.frame));
    });
    part('subchasis', 'chasis', { ex: [-0.32, 0.16, 0], stage: 1 }, (g) => {
      [-1, 1].forEach((s) => {
        const S0 = V3(-0.11, 0.745, 0.125 * s), S1 = V3(-0.67, 0.865, 0.06 * s), S2 = V3(-0.07, 0.6, 0.16 * s), S3 = V3(-0.45, 0.77, 0.085 * s);
        [[S0, S1], [S2, S3], [S3, S1], [S0, S3]].forEach((p) => g.add(strut(p[0], p[1], 0.009, M.subframe)));
      });
      g.add(strut(V3(-0.67, 0.865, -0.06), V3(-0.67, 0.865, 0.06), 0.009, M.subframe));
      g.add(strut(V3(-0.42, 0.81, -0.1), V3(-0.42, 0.81, 0.1), 0.008, M.subframe));
    });
    part('basculante', 'chasis', { ex: [-0.26, -0.13, 0], stage: 1 }, (g) => {
      const sh = polyShape([[-0.06, 0.49], [-0.40, 0.428], [-0.70, 0.348], [-0.725, 0.31], [-0.70, 0.278], [-0.40, 0.36], [-0.10, 0.39], [-0.055, 0.44]]);
      [-1, 1].forEach((s) => {
        g.add(at(mesh(extrude(sh, 0.034, 0.007, 2, { bevelSize: 0.006, crease: 0.5 }), M.swing), 0, 0, 0.15 * s));
        g.add(at(rbox(0.05, 0.035, 0.012, 0.004, M.aluDark), -0.70, 0.312, 0.172 * s));
      });
      g.add(at(cylZ(0.026, 0.36, M.aluDark), -0.10, 0.44, 0));
      g.add(at(rbox(0.06, 0.055, 0.3, 0.01, M.swing), -0.29, 0.42, 0));
      g.add(at(rbox(0.22, 0.012, 0.03, 0.004, M.black), -0.32, 0.415, -0.128));
    });
    part('deposito', 'chasis', { ex: [-0.22, 0.6, 0], stage: 0 }, (g) => {
      const geo = extrude(smoothShape([[0.41, 0.83], [0.395, 0.875], [0.31, 0.905], [0.18, 0.908], [0.07, 0.875], [-0.01, 0.83], [-0.035, 0.80], [0.02, 0.79], [0.2, 0.80], [0.34, 0.81]]), 0.2, 0.06, 5,
        { bevelSize: 0.04, zfn: (x, y, z) => z * (0.6 + 0.4 * clamp((x + 0.07) / 0.3, 0, 1)) * (0.86 + 0.14 * clamp((0.95 - y) / 0.12, 0, 1)) });
      g.add(mesh(geo, [M.liveryR, M.paint1]));
      g.add(at(cylY(0.034, 0.034, 0.008, M.aluDark, 28), 0.25, 0.948, 0));
      const pad = rbox(0.11, 0.007, 0.15, 0.003, M.carbon); pad.position.set(0.03, 0.905, 0); pad.rotation.z = 0.55; pad.userData.acc = 'tankpad'; pad.visible = false; g.add(pad);
    });
    part('asientoPiloto', 'chasis', { ex: [-0.26, 0.47, 0], stage: 0 }, (g) => {
      g.add(mesh(extrude(smoothShape([[-0.005, 0.79], [-0.06, 0.778], [-0.2, 0.772], [-0.31, 0.78], [-0.335, 0.8], [-0.34, 0.775], [-0.3, 0.755], [-0.12, 0.748], [-0.01, 0.76]]), 0.16, 0.025, 4,
        { bevelSize: 0.02, zfn: (x, y, z) => z * (0.7 + 0.3 * clamp(-x / 0.15, 0, 1)) }), M.seat));
    });
    part('asientoPasajero', 'chasis', { ex: [-0.52, 0.58, 0], stage: 0 }, (g) => {
      const seat = mesh(extrude(smoothShape([[-0.37, 0.85], [-0.46, 0.866], [-0.565, 0.888], [-0.595, 0.882], [-0.575, 0.858], [-0.47, 0.842], [-0.385, 0.83]]), 0.1, 0.022, 3, { bevelSize: 0.018 }), M.seat);
      seat.userData.acc = 'seatStock'; g.add(seat);
      const cowl = mesh(extrude(smoothShape([[-0.36, 0.855], [-0.45, 0.89], [-0.56, 0.925], [-0.615, 0.915], [-0.6, 0.87], [-0.47, 0.845], [-0.38, 0.83]]), 0.11, 0.03, 4,
        { bevelSize: 0.025, zfn: (x, y, z) => z * (0.55 + 0.45 * clamp((x + 0.62) / 0.2, 0, 1)) }), [M.paint1, M.paint1]);
      cowl.userData.acc = 'cowl'; cowl.visible = false; g.add(cowl);
    });
    part('estriberasPiloto', 'chasis', { ex: [-0.10, -0.22, 0], stage: 1 }, (g) => {
      [-1, 1].forEach((s) => {
        g.add(at(mesh(extrude(polyShape([[-0.16, 0.43], [-0.05, 0.53], [0.0, 0.52], [-0.02, 0.47], [-0.11, 0.41]]), 0.008, 0.003, 1, { bevelSize: 0.003 }), M.alu), 0, 0, 0.19 * s));
        g.add(at(cylZ(0.011, 0.075, M.aluDark), -0.13, 0.445, 0.225 * s));
        g.add(at(cylZ(0.0135, 0.05, M.rubber), -0.13, 0.445, 0.24 * s));
        const tipY = s > 0 ? 0.41 : 0.435;
        g.add(boxBetween(V3(-0.1, 0.45, 0.206 * s), V3(0.0, tipY, 0.21 * s), 0.012, 0.008, M.aluDark));
        g.add(at(cylZ(0.009, 0.035, M.aluDark), 0.0, tipY, 0.225 * s));
      });
    });
    part('estriberasPasajero', 'chasis', { ex: [-0.30, -0.16, 0], stage: 1 }, (g) => {
      [-1, 1].forEach((s) => {
        g.add(boxBetween(V3(-0.45, 0.77, 0.09 * s), V3(-0.40, 0.54, 0.165 * s), 0.03, 0.008, M.alu));
        g.add(at(cylZ(0.01, 0.07, M.aluDark), -0.40, 0.535, 0.2 * s));
        g.add(at(cylZ(0.012, 0.045, M.rubber), -0.40, 0.535, 0.215 * s));
      });
    });
    part('caballete', 'chasis', { ex: [0, -0.26, -0.32], stage: 1 }, (g) => {
      g.add(strut(V3(-0.02, 0.33, -0.17), V3(-0.31, 0.30, -0.19), 0.011, M.black));
      g.add(at(rbox(0.05, 0.012, 0.03, 0.004, M.black), -0.32, 0.297, -0.19));
      g.add(at(cylZ(0.014, 0.03, M.aluDark), -0.02, 0.33, -0.17));
    });

    /* ================= SUSPENSIÓN ================= */
    ['Der', 'Izq'].forEach((side) => {
      const s = side === 'Der' ? 1 : -1;
      part('horquilla' + side, 'suspension', { ex: [0.34, 0.1, 0.44 * s], stage: 1 }, (g) => {
        const z = 0.105 * s;
        g.add(strut(forkPt(0.035, z), forkPt(0.345, z), 0.0185, M.chrome, 20));
        g.add(strut(forkPt(0.3, z), forkPt(0.705, z), 0.0265, M.gold, 24));
        g.add(strut(forkPt(0.3, z), forkPt(0.32, z), 0.028, M.aluDark, 24));
        g.add(strut(forkPt(0.705, z), forkPt(0.722, z), 0.019, M.aluDark, 16));
        g.add(strut(forkPt(0.722, z), forkPt(0.73, z), 0.008, M.redPlug, 8));
        const br = rbox(0.065, 0.085, 0.045, 0.01, M.black); br.position.copy(forkPt(0.03, z)); br.rotation.z = RAKE; g.add(br);
        g.add(at(cylZ(0.012, 0.05, M.aluDark, 12), FA.x, FA.y, z + 0.01 * s));
      });
    });
    part('tijaSup', 'suspension', { ex: [0.32, 0.46, 0], stage: 1 }, (g) => {
      const b = rbox(0.085, 0.022, 0.29, 0.01, M.aluDark); b.position.copy(forkPt(0.672).addScaledVector(FN, -0.012)); b.rotation.z = RAKE; g.add(b);
      const nut = cylY(0.02, 0.02, 0.012, M.alu); nut.position.copy(steerPt(0.69)); nut.rotation.z = RAKE; g.add(nut);
    });
    part('tijaInf', 'suspension', { ex: [0.32, 0.24, 0], stage: 1 }, (g) => {
      const b = rbox(0.095, 0.034, 0.29, 0.012, M.aluDark); b.position.copy(forkPt(0.5).addScaledVector(FN, -0.015)); b.rotation.z = RAKE; g.add(b);
      g.add(strut(steerPt(0.5), steerPt(0.69), 0.012, M.steel));
    });
    part('amortiguador', 'suspension', { ex: [-0.1, 0.12, 0.46], stage: 1 }, (g) => {
      const a = V3(-0.03, 0.585, 0), b = V3(-0.275, 0.525, 0), len = a.distanceTo(b);
      const gr = alongY(a, b); g.add(gr);
      gr.add(at(cylY(0.022, 0.022, len * 0.55, M.aluDark), 0, len * 0.29, 0));
      gr.add(at(cylY(0.008, 0.008, len * 0.5, M.chrome), 0, len * 0.72, 0));
      gr.add(helix(0.028, 0.0045, len * 0.12, len * 0.86, 7, M.spring));
      gr.add(at(cylY(0.031, 0.031, 0.008, M.alu), 0, len * 0.12, 0));
      gr.add(at(cylY(0.031, 0.031, 0.008, M.alu), 0, len * 0.86, 0));
      gr.add(at(cylY(0.016, 0.016, len * 0.33, M.gold), 0.036, len * 0.28, 0));
      gr.add(at(cylZ(0.011, 0.03, M.aluDark), 0, 0, 0));
      gr.add(at(cylZ(0.011, 0.03, M.aluDark), 0, len, 0));
    });
    part('bieletas', 'suspension', { ex: [-0.15, -0.14, 0.46], stage: 1 }, (g) => {
      const B = V3(-0.275, 0.525, 0), S = V3(-0.3, 0.455, 0), F = V3(-0.2, 0.47, 0);
      [-1, 1].forEach((s) => g.add(boxBetween(B.clone().setZ(0.021 * s), S.clone().setZ(0.021 * s), 0.024, 0.008, M.aluDark)));
      g.add(boxBetween(S, F, 0.03, 0.03, M.aluDark));
      [B, S, F].forEach((p) => g.add(at(cylZ(0.008, 0.055, M.steel, 10), p.x, p.y, 0)));
    });

    /* ============ RUEDAS, FRENOS Y TRANSMISIÓN FINAL ============ */
    function rim(g, R, W, hubW) {
      g.add(mesh(new T.CylinderGeometry(R - 0.006, R - 0.006, W, 64, 1, true).rotateX(PI / 2), M.wheelDS));
      [-1, 1].forEach((s) => { const t = mesh(new T.TorusGeometry(R, 0.0065, 8, 72), M.wheel); t.position.z = (W / 2) * s; g.add(t); });
      g.add(cylZ(0.05, hubW, M.wheel, 28));
      g.add(cylZ(0.016, hubW + 0.01, M.aluDark, 12));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * PI * 2 + 0.3;
        [-0.12, 0.12].forEach((d) => {
          g.add(boxBetween(V3(Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0), V3(Math.cos(a + d) * (R - 0.01), Math.sin(a + d) * (R - 0.01), 0), 0.015, 0.022, M.wheel));
        });
      }
      [-1, 1].forEach((s) => { const t = mesh(new T.TorusGeometry(R - 0.012, 0.0028, 6, 72), M.stripe); t.position.z = (W / 2 - 0.004) * s; t.userData.acc = 'stripes'; t.visible = false; g.add(t); });
    }
    part('llantaDel', 'frenos', { pos: FA, ex: [0.6, 0, 0], stage: 1 }, (g) => {
      rim(g, 0.215, 0.09, 0.15);
      [-1, 1].forEach((s) => { const p = cylZ(0.019, 0.03, M.black, 16); p.position.z = 0.135 * s; p.userData.acc = 'axle'; p.visible = false; g.add(p); });
      A.wheelF = g;
    });
    part('neumaticoDel', 'frenos', { pos: FA, ex: [1.02, 0, 0], stage: 1 }, (g) => {
      const t = mesh(new T.TorusGeometry(0.255, 0.045, 28, 90), M.rubber); t.scale.z = 1.33; g.add(t);
      A.tireF = g;
    });
    part('llantaTras', 'frenos', { pos: RA, ex: [-0.56, 0, 0], stage: 1 }, (g) => {
      rim(g, 0.215, 0.115, 0.17);
      g.add(at(cylZ(0.06, 0.02, M.aluDark, 24), 0, 0, -0.095));
      [-1, 1].forEach((s) => { const p = cylZ(0.019, 0.03, M.black, 16); p.position.z = 0.2 * s; p.userData.acc = 'axle'; p.visible = false; g.add(p); });
      A.wheelR = g;
    });
    part('neumaticoTras', 'frenos', { pos: RA, ex: [-1.0, 0, 0], stage: 1 }, (g) => {
      const t = mesh(new T.TorusGeometry(0.262, 0.05, 28, 90), M.rubber); t.scale.z = 1.6; g.add(t);
      A.tireR = g;
    });
    ['Der', 'Izq'].forEach((side) => {
      const s = side === 'Der' ? 1 : -1;
      part('disco' + side, 'frenos', { pos: FA, ex: [0.6, 0, 0.32 * s], stage: 1 }, (g) => {
        g.add(at(petalDisc(0.145, 0.103, 12, M.disc), 0, 0, 0.077 * s));
        g.add(at(carrier(0.104, 0.05, M.aluDark), 0, 0, 0.077 * s));
        for (let j = 0; j < 8; j++) { const a = (j / 8) * PI * 2; g.add(at(cylZ(0.006, 0.01, M.alu, 8), Math.cos(a) * 0.103, Math.sin(a) * 0.103, 0.077 * s)); }
        A['disc' + side] = g;
      });
      part('pinza' + side, 'frenos', { pos: FA, ex: [0.52, 0.08, 0.5 * s], stage: 1 }, (g) => {
        const ang = 133 * DEG;
        const cg = new T.Group(); cg.position.set(Math.cos(ang) * 0.124, Math.sin(ang) * 0.124, 0.077 * s); cg.rotation.z = ang + PI / 2; g.add(cg);
        cg.add(rbox(0.105, 0.04, 0.05, 0.012, M.caliper));
        cg.add(at(box(0.07, 0.006, 0.054, M.black), 0, 0.016, 0));
        [-0.035, 0.035].forEach((x) => cg.add(at(cylY(0.007, 0.007, 0.03, M.aluDark, 8), x, -0.03, 0.02 * s)));
      });
    });
    part('discoTras', 'frenos', { pos: RA, ex: [-0.56, 0, 0.32], stage: 1 }, (g) => {
      g.add(at(petalDisc(0.11, 0.07, 10, M.disc), 0, 0, 0.088));
      g.add(at(carrier(0.071, 0.04, M.aluDark), 0, 0, 0.088));
      A.discR = g;
    });
    part('pinzaTras', 'frenos', { pos: RA, ex: [-0.46, -0.08, 0.46], stage: 1 }, (g) => {
      const ang = -35 * DEG;
      const cg = new T.Group(); cg.position.set(Math.cos(ang) * 0.092, Math.sin(ang) * 0.092, 0.088); cg.rotation.z = ang + PI / 2; g.add(cg);
      cg.add(rbox(0.07, 0.035, 0.04, 0.01, M.caliper));
      g.add(boxBetween(V3(0, 0, 0.1), V3(Math.cos(ang) * 0.09, Math.sin(ang) * 0.09, 0.1), 0.025, 0.008, M.aluDark));
    });
    part('corona', 'frenos', { pos: RS, ex: [-0.56, 0, -0.34], stage: 1 }, (g) => {
      g.add(gear(0.106, 46, 0.007, M.aluDark, 0.045, 5, 0.075, 0.016));
      A.rearSprocket = g;
    });
    part('pinon', 'frenos', { pos: FS, ex: [0, -0.05, -0.42], stage: 2 }, (g) => {
      g.add(gear(0.038, 14, 0.008, M.steel, 0.011));
      g.add(cylZ(0.014, 0.016, M.aluDark, 12));
      A.frontSprocket = g;
    });
    // Cadena animada (eslabones instanciados)
    let chainCurve = null, chainLen = 0, chainMesh = null;
    part('cadena', 'frenos', { ex: [-0.26, -0.06, -0.52], stage: 1 }, (g) => {
      const pts = [];
      const r1 = 0.042, r2 = 0.11;
      for (let i = 0; i < 72; i++) {
        const a = (i / 72) * PI * 2;
        pts.push([FS.x + Math.cos(a) * r1, FS.y + Math.sin(a) * r1]);
        pts.push([RS.x + Math.cos(a) * r2, RS.y + Math.sin(a) * r2]);
      }
      // envolvente convexa (monotone chain)
      pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      const lower = [], upper = [];
      pts.forEach((p) => { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); });
      for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
      const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
      // re-muestreo uniforme
      const res = [];
      for (let i = 0; i < hull.length; i++) {
        const a = hull[i], b = hull[(i + 1) % hull.length];
        const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const n = Math.max(1, Math.ceil(d / 0.012));
        for (let k = 0; k < n; k++) res.push(V3(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, FS.z));
      }
      chainCurve = new T.CatmullRomCurve3(res, true, 'centripetal');
      chainLen = chainCurve.getLength();
      const n = Math.round(chainLen / 0.0159);
      chainMesh = new T.InstancedMesh(new T.BoxGeometry(0.016, 0.009, 0.013), M.chain, n);
      chainMesh.castShadow = true; chainMesh.receiveShadow = true;
      g.add(chainMesh);
    });
    const _q = new T.Quaternion(), _m = new T.Matrix4(), _s = V3(1, 1, 1), _x = V3(1, 0, 0);
    function updateChain(phase) {
      if (!chainMesh) return;
      const n = chainMesh.count;
      for (let i = 0; i < n; i++) {
        let u = (i / n + phase) % 1; if (u < 0) u += 1;
        const p = chainCurve.getPointAt(u), t = chainCurve.getTangentAt(u);
        _q.setFromUnitVectors(_x, t);
        _m.compose(p, _q, _s);
        chainMesh.setMatrixAt(i, _m);
      }
      chainMesh.instanceMatrix.needsUpdate = true;
    }
    updateChain(0);
    chainMesh.computeBoundingBox(); chainMesh.computeBoundingSphere();

    /* ================= CARROCERÍA ================= */
    part('carenadoFrontal', 'carroceria', { ex: [0.64, 0.22, 0], stage: 0 }, (g) => {
      const geo = extrude(smoothShape([[1.03, 0.73], [0.99, 0.765], [0.92, 0.805], [0.82, 0.86], [0.72, 0.905], [0.63, 0.933], [0.565, 0.942], [0.535, 0.915], [0.545, 0.85], [0.575, 0.79], [0.62, 0.735], [0.7, 0.695], [0.8, 0.672], [0.9, 0.668], [0.97, 0.683], [1.015, 0.705]], 120), 0.3, 0.02, 3,
        { bevelSize: 0.014, zfn: (x, y, z) => z * (0.42 + 0.58 * clamp((1.02 - x) / 0.4, 0, 1)) * (0.9 + 0.1 * clamp((y - 0.67) / 0.1, 0, 1)) });
      g.add(mesh(geo, [M.liveryR, M.paint1]));
      // rebaje negro alrededor de los faros
      [-1, 1].forEach((s) => {
        const r = rbox(0.05, 0.05, 0.075, 0.012, M.blackGloss); r.position.set(0.985, 0.733, 0.048 * s); r.rotation.set(0, -0.5 * s, 0.35); g.add(r);
      });
    });
    part('cupula', 'carroceria', { ex: [0.58, 0.56, 0], stage: 0 }, (g) => {
      const c1 = [[0.875, 0.842], [0.78, 0.905], [0.68, 0.99], [0.6, 1.082]];
      const s1 = mesh(shell(c1, (v) => 0.28 - 0.07 * v, 1.2, 16, 20), M.glass, true); s1.userData.acc = 'screenStock'; g.add(s1);
      const c2 = [[0.875, 0.842], [0.77, 0.915], [0.66, 1.03], [0.575, 1.13]];
      const s2 = mesh(shell(c2, (v) => 0.29 - 0.07 * v, 1.1, 16, 20), M.glassDark, true); s2.userData.acc = 'screen'; s2.visible = false; g.add(s2);
    });
    ['Der', 'Izq'].forEach((side) => {
      const s = side === 'Der' ? 1 : -1;
      part('lateral' + side, 'carroceria', { ex: [0.1, s > 0 ? 0.02 : 0.12, s > 0 ? 0.95 : -0.85], stage: 0 }, (g) => {
        const sh = smoothShape([[0.66, 0.845], [0.55, 0.795], [0.34, 0.765], [0.13, 0.705], [0.0, 0.625], [-0.035, 0.545], [0.02, 0.465], [0.17, 0.405], [0.35, 0.39], [0.41, 0.44], [0.47, 0.56], [0.56, 0.69]]);
        sh.holes.push(slot(0.43, 0.665, 0.1, 0.014, 35 * DEG), slot(0.40, 0.615, 0.085, 0.013, 35 * DEG));
        const geo = extrude(sh, 0.01, 0.006, 2, { bevelSize: 0.005, zfn: (x, y, z) => z - s * (0.035 * Math.pow((y - 0.62) / 0.23, 2) + 0.03 * clamp((x - 0.45) / 0.2, 0, 1)) });
        g.add(at(mesh(geo, [s > 0 ? M.liveryR : M.liveryL, M.paint1]), 0, 0, 0.2 * s));
        const sl = cylZ(0.022, 0.07, M.black, 20); sl.position.set(0.17, 0.635, 0.222 * s); sl.userData.acc = 'sliders'; sl.visible = false; g.add(sl);
      });
    });
    part('quilla', 'carroceria', { ex: [0.26, -0.34, 0], stage: 0 }, (g) => {
      g.add(mesh(extrude(smoothShape([[0.43, 0.43], [0.4, 0.31], [0.33, 0.215], [0.22, 0.16], [0.05, 0.145], [-0.07, 0.165], [-0.065, 0.225], [0.06, 0.265], [0.22, 0.315], [0.33, 0.385]]), 0.3, 0.03, 3,
        { bevelSize: 0.022, zfn: (x, y, z) => z * (0.55 + 0.45 * clamp((y - 0.15) / 0.25, 0, 1)) }), [M.liveryR, M.paint2]));
    });
    part('guardabarrosDel', 'carroceria', { pos: FA, ex: [0.86, 0.32, 0], stage: 0 }, (g) => {
      const geo = new T.CylinderGeometry(0.335, 0.335, 0.125, 48, 1, true, 115 * DEG, 125 * DEG); geo.rotateX(PI / 2);
      g.add(mesh(geo, M.paint1DS));
      [-1, 1].forEach((s) => g.add(at(box(0.06, 0.03, 0.04, M.black), -0.125, 0.29, 0.082 * s)));
    });
    part('colin', 'carroceria', { ex: [-0.56, 0.32, 0], stage: 0 }, (g) => {
      g.add(mesh(extrude(smoothShape([[-0.17, 0.775], [-0.3, 0.815], [-0.45, 0.85], [-0.62, 0.89], [-0.78, 0.94], [-0.8, 0.925], [-0.74, 0.875], [-0.6, 0.815], [-0.46, 0.765], [-0.32, 0.725], [-0.2, 0.72]]), 0.17, 0.03, 4,
        { bevelSize: 0.022, zfn: (x, y, z) => z * (0.3 + 0.7 * clamp((x + 0.81) / 0.45, 0, 1)) }), [M.liveryR, M.paint1]));
    });
    part('portamatricula', 'carroceria', { ex: [-0.82, -0.06, 0], stage: 0 }, (g) => {
      g.add(boxBetween(V3(-0.6, 0.765, 0), V3(-0.78, 0.655, 0), 0.06, 0.012, M.black));
      const plate = box(0.004, 0.1, 0.15, M.steel); plate.position.set(-0.792, 0.605, 0); plate.rotation.z = -0.25; g.add(plate);
      [-1, 1].forEach((s) => {
        g.add(strut(V3(-0.765, 0.69, 0.03 * s), V3(-0.77, 0.69, 0.09 * s), 0.004, M.black, 6));
        g.add(at(cylX(0.009, 0.03, M.amber, 12), -0.775, 0.69, 0.095 * s));
      });
    });
    part('retrovisores', 'carroceria', { ex: [0.42, 0.46, 0], stage: 0 }, (g) => {
      [-1, 1].forEach((s) => {
        g.add(strut(V3(0.66, 0.905, 0.14 * s), V3(0.635, 0.955, 0.205 * s), 0.007, M.black, 8));
        const h = rbox(0.05, 0.045, 0.11, 0.015, M.blackGloss); h.position.set(0.625, 0.965, 0.235 * s); h.rotation.y = -0.15 * s; g.add(h);
        const mir = box(0.004, 0.034, 0.09, M.chrome); mir.position.set(0.598, 0.965, 0.235 * s); mir.rotation.y = -0.15 * s; g.add(mir);
      });
    });

    /* ============ ELECTRÓNICA Y MANDOS ============ */
    part('faros', 'electronica', { ex: [1.08, 0.1, 0], stage: 1 }, (g) => {
      [-1, 1].forEach((s) => {
        const l = rbox(0.012, 0.022, 0.055, 0.005, M.lens); l.position.set(1.008, 0.736, 0.047 * s); l.rotation.set(0, -0.5 * s, 0.35); l.castShadow = false; g.add(l);
        const d = rbox(0.008, 0.006, 0.05, 0.002, M.lens); d.position.set(1.0, 0.758, 0.05 * s); d.rotation.set(0, -0.5 * s, 0.35); d.castShadow = false; g.add(d);
      });
    });
    part('pilotoTrasero', 'electronica', { ex: [-0.98, 0.32, 0], stage: 1 }, (g) => {
      const l = rbox(0.022, 0.026, 0.1, 0.008, M.tailLight); l.position.set(-0.815, 0.935, 0); l.rotation.z = 0.35; l.castShadow = false; g.add(l);
    });
    part('tft', 'electronica', { ex: [0.3, 0.64, 0], stage: 1 }, (g) => {
      const bez = rbox(0.022, 0.094, 0.15, 0.01, M.blackGloss); bez.position.set(0.502, 0.983, 0); bez.rotation.z = -0.55; g.add(bez);
      const scr = box(0.006, 0.072, 0.124, [M.screenBlack, M.tft, M.screenBlack, M.screenBlack, M.screenBlack, M.screenBlack]);
      scr.position.set(0.502 - 0.0092 * Math.cos(0.55), 0.983 + 0.0092 * Math.sin(0.55), 0); scr.rotation.z = -0.55; g.add(scr);
      g.add(strut(V3(0.52, 0.94, 0), V3(0.47, 0.88, 0), 0.008, M.black, 8));
    });
    part('ecu', 'electronica', { ex: [-0.46, 0.34, 0], stage: 1 }, (g) => {
      g.add(at(rbox(0.11, 0.022, 0.08, 0.006, M.aluDark), -0.46, 0.8, 0));
      g.add(at(box(0.02, 0.012, 0.05, M.black), -0.405, 0.8, 0));
    });
    part('bateria', 'electronica', { ex: [-0.26, 0.32, -0.28], stage: 1 }, (g) => {
      g.add(at(rbox(0.075, 0.1, 0.12, 0.006, M.black), -0.3, 0.7, 0));
      g.add(at(box(0.012, 0.01, 0.012, M.redPlug), -0.29, 0.755, 0.04));
      g.add(at(box(0.012, 0.01, 0.012, M.engineHi), -0.29, 0.755, -0.04));
    });
    part('abs', 'electronica', { ex: [-0.15, 0.28, 0.32], stage: 1 }, (g) => {
      g.add(at(rbox(0.07, 0.06, 0.075, 0.008, M.alu), -0.17, 0.66, 0.06));
      g.add(at(rbox(0.05, 0.035, 0.05, 0.006, M.black), -0.17, 0.705, 0.06));
      g.add(tube([V3(-0.14, 0.67, 0.09), V3(0.0, 0.72, 0.12), V3(0.3, 0.78, 0.13), V3(0.46, 0.8, 0.12)], 0.003, M.black, 40, 6));
    });
    part('kqs', 'electronica', { ex: [0, -0.06, -0.42], stage: 1 }, (g) => {
      const a = V3(-0.02, 0.44, -0.205), b = V3(-0.045, 0.385, -0.14);
      g.add(strut(a, b, 0.0045, M.steel, 8));
      g.add(strut(a.clone().lerp(b, 0.3), a.clone().lerp(b, 0.65), 0.011, M.blueAnod, 14));
      g.add(strut(V3(-0.045, 0.385, -0.14), V3(-0.045, 0.385, -0.11), 0.01, M.aluDark, 10));
    });
    ['Der', 'Izq'].forEach((side) => {
      const s = side === 'Der' ? 1 : -1;
      part('manillar' + side, 'electronica', { ex: [0.28, 0.32, 0.38 * s], stage: 1 }, (g) => {
        const P = forkPt(0.615, 0.105 * s), E = V3(P.x - 0.06, P.y - 0.025, 0.335 * s);
        const cl = cylY(0.031, 0.031, 0.035, M.aluDark, 20); cl.position.copy(P); cl.rotation.z = RAKE; g.add(cl);
        g.add(strut(P, E, 0.011, M.aluDark));
        g.add(strut(P.clone().lerp(E, 0.58), E, 0.017, M.rubber, 16));
        g.add(strut(E, E.clone().add(V3(-0.004, -0.002, 0.022 * s)), 0.016, M.aluDark, 16));
        g.add(strut(P.clone().lerp(E, 0.25).add(V3(0.055, -0.004, 0)), E.clone().add(V3(0.05, -0.01, -0.01 * s)), 0.005, M.alu, 8));
        if (s > 0) {
          g.add(at(rbox(0.034, 0.03, 0.05, 0.008, M.black), P.x - 0.01, P.y + 0.012, 0.165));
          g.add(at(cylY(0.014, 0.014, 0.028, M.glassDark, 16), P.x - 0.015, P.y + 0.045, 0.165));
          g.add(at(rbox(0.04, 0.036, 0.04, 0.008, M.black), P.x - 0.03, P.y - 0.012, 0.235));
        } else {
          g.add(at(rbox(0.045, 0.04, 0.045, 0.01, M.black), P.x - 0.025, P.y - 0.008, -0.225));
          g.add(at(rbox(0.03, 0.026, 0.04, 0.008, M.black), P.x - 0.005, P.y + 0.01, -0.165));
        }
      });
    });

    /* ================= ANIMACIÓN MECÁNICA ================= */
    const camPhases = { levaAdm: 0, levaEsc: 0.4 };
    let chainPhase = 0, lastWheelR = 0;
    function animate(st) {
      const th = st.crank;
      for (let i = 0; i < 4; i++) {
        const phi = th + (i === 0 || i === 3 ? 0 : PI);
        const sx = CR * Math.sin(phi), cy = CR * Math.cos(phi);
        const pinY = cy + Math.sqrt(RL * RL - sx * sx);
        byId['piston' + (i + 1)].userData.inner.position.y = pinY;
        const rod = byId['biela' + (i + 1)].userData.inner;
        rod.position.set(sx, cy, 0);
        rod.rotation.z = Math.atan2(sx, pinY - cy);
      }
      byId.ciguenal.userData.inner.rotation.z = -th;
      A.levaAdm.rotation.z = -th / 2 + camPhases.levaAdm;
      A.levaEsc.rotation.z = -th / 2 + camPhases.levaEsc;
      const inA = th / 2.03;
      byId.ejePrimario.userData.inner.rotation.z = inA;
      byId.embrague.userData.inner.rotation.z = inA;
      const gr = GR[Math.max(0, (st.gear || 1) - 1)];
      byId.ejeSecundario.userData.inner.rotation.z = -inA / gr;
      byId.alternador.userData.inner.rotation.z = -th;
      if (A.fan) A.fan.rotation.x = st.fan || 0;
      const wf = -st.wheelF, wr = -st.wheelR;
      byId.llantaDel.userData.inner.rotation.z = wf;
      byId.neumaticoDel.userData.inner.rotation.z = wf;
      byId.discoDer.userData.inner.rotation.z = wf;
      byId.discoIzq.userData.inner.rotation.z = wf;
      byId.llantaTras.userData.inner.rotation.z = wr;
      byId.neumaticoTras.userData.inner.rotation.z = wr;
      byId.discoTras.userData.inner.rotation.z = wr;
      byId.corona.userData.inner.rotation.z = wr;
      byId.pinon.userData.inner.rotation.z = wr * (0.106 / 0.038);
      if (st.wheelR !== lastWheelR) {
        chainPhase = (st.wheelR * 0.11) / chainLen;
        updateChain(chainPhase);
        lastWheelR = st.wheelR;
      }
    }
    animate({ crank: 0.6, wheelF: 0, wheelR: 0, gear: 1, fan: 0 });

    /* ============ OPTIMIZACIÓN: fusionar mallas estáticas de cada pieza ============ */
    // Dentro de cada pieza, las mallas que comparten material se funden en una sola
    // (menos llamadas de dibujo). Se respetan grupos animados, accesorios y variantes.
    [A.levaAdm, A.levaEsc, A.fan].forEach((g) => { if (g) g.userData.anim = true; });
    const _inv = new T.Matrix4(), _rel = new T.Matrix4();
    function mergePart(p) {
      const inner = p.userData.inner;
      inner.updateMatrixWorld(true);
      _inv.copy(inner.matrixWorld).invert();
      const buckets = new Map();
      inner.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
        for (let a = o; a && a !== inner; a = a.parent) if (a.userData.acc || a.userData.exhaust || a.userData.anim) return;
        const key = o.material.uuid + '|' + o.castShadow;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(o);
      });
      buckets.forEach((list) => {
        if (list.length < 2) return;
        const geos = list.map((m) => {
          const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
          g.applyMatrix4(_rel.multiplyMatrices(_inv, m.matrixWorld));
          Object.keys(g.attributes).forEach((k) => { if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k); });
          if (!g.attributes.normal) g.computeVertexNormals();
          if (!g.attributes.uv) g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
          g.clearGroups();
          return g;
        });
        const merged = U.mergeGeometries(geos, false);
        if (!merged) return;
        const mm = new T.Mesh(merged, list[0].material);
        mm.castShadow = list[0].castShadow; mm.receiveShadow = true;
        inner.add(mm);
        list.forEach((m) => m.parent.remove(m));
      });
    }
    if (U.mergeGeometries) parts.forEach(mergePart);

    /* ================= FINALIZAR ================= */
    // Materiales propios por pieza (para resaltar / hacer transparente sin afectar a otras)
    const roleMats = {};
    function own(m) {
      const c = m.clone();
      c.userData = Object.assign({}, m.userData, {
        baseEmissive: c.emissive ? c.emissive.clone() : null,
        baseEI: c.emissiveIntensity, baseOpacity: c.opacity,
        baseTransparent: c.transparent, baseDepthWrite: c.depthWrite
      });
      if (c.userData.role) (roleMats[c.userData.role] = roleMats[c.userData.role] || []).push(c);
      return c;
    }
    parts.forEach((p) => {
      const mats = [];
      p.traverse((o) => {
        if (o.isMesh) {
          o.material = Array.isArray(o.material) ? o.material.map(own) : own(o.material);
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.push(m));
          o.userData.partId = p.userData.id;
        }
      });
      p.userData.mats = mats;
    });
    root.updateMatrixWorld(true);
    const _b = new T.Box3();
    parts.forEach((p) => {
      _b.setFromObject(p);
      const c = _b.getCenter(V3());
      p.userData.homeWorld = c.clone();
      p.userData.center = p.worldToLocal(c.clone());
      p.userData.size = _b.getSize(V3()).length();
      p.userData.index = parts.indexOf(p);
    });

    // ---------- API pública del modelo ----------
    let liveryColors = { p1: '#5fbf1e', p2: '#111214', p3: '#f2f4f5' };
    function redrawLivery() { drawLivery(livR, liveryColors, false); drawLivery(livL, liveryColors, true); }
    redrawLivery();
    drawTFT(null);

    const setRole = (role, hex) => (roleMats[role] || []).forEach((m) => m.color.set(hex));
    const INVERSE = { screen: 'screenStock', cowl: 'seatStock' };

    return {
      root: root, parts: parts, byId: byId, ZC: ZC,
      redrawLivery: redrawLivery,
      setColors(c) { liveryColors = { p1: c.p1, p2: c.p2, p3: c.p3 }; setRole('paint1', c.p1); setRole('paint2', c.p2); redrawLivery(); },
      setFrame(hex) { setRole('frame', hex); },
      setWheel(hex) { setRole('wheel', hex); },
      setExhaust(id) { (A.exhaust || []).forEach((g) => { g.visible = g.userData.exhaust === id; }); },
      setAccessory(id, on) {
        root.traverse((o) => {
          if (o.userData.acc === id) o.visible = on;
          if (INVERSE[id] && o.userData.acc === INVERSE[id]) o.visible = !on;
        });
      },
      drawTFT: drawTFT,
      animate: animate // ángulo de cigüeñal, ruedas, ventilador y cadena
    };
  };
})();
