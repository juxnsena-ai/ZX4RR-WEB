/* =========================================================
   DESPIECE 3D: panel de control, lista de piezas, ficha y minijuego
   ========================================================= */
(function () {
  'use strict';
  const ZX = (window.ZX = window.ZX || {});
  ZX.ui = ZX.ui || {};

  let V, els = {}, order = [], visited = false, gameTimer = 0, gameKind = null;

  const GAMES = [
    { id: 'express', icon: 'fa-bolt', name: 'Exprés', desc: 'Las 10 piezas más grandes', ids: ['lateralDer', 'lateralIzq', 'carenadoFrontal', 'deposito', 'asientoPiloto', 'colin', 'llantaDel', 'neumaticoDel', 'silenciador', 'horquillaDer'] },
    { id: 'frenos', icon: 'fa-circle-dot', name: 'Ruedas y frenos', desc: 'Llantas, discos, pinzas y cadena', sys: 'frenos' },
    { id: 'carroceria', icon: 'fa-shield-halved', name: 'Carrocería', desc: 'Carenados, cúpula, colín…', sys: 'carroceria' },
    { id: 'motor', icon: 'fa-gear', name: 'Motor completo', desc: 'Pistones, bielas, levas, caja…', sys: 'motor', xray: true },
    { id: 'todo', icon: 'fa-motorcycle', name: 'Moto completa', desc: 'Las 80 piezas. Para expertos', all: true }
  ];

  function setPressed(btn, v) { btn.setAttribute('aria-pressed', v ? 'true' : 'false'); }
  function setTab(t) {
    ZX.$$('#dzTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
    ZX.$$('#dzLeft .dz-page').forEach((p) => p.classList.toggle('active', p.dataset.page === t));
  }
  function rangeFill(r) { r.style.setProperty('--p', r.value + '%'); }
  const sysOf = (id) => V.byId[id].userData.sys;
  const color = (sys) => ZX.SYSTEMS[sys].color;

  function buildChips() {
    const counts = {};
    V.parts.forEach((p) => { counts[p.userData.sys] = (counts[p.userData.sys] || 0) + 1; });
    let html = '<button class="sys-chip on" data-sys="" style="--c:#ECF0EA"><i></i>Todos <small>' + V.parts.length + '</small></button>';
    Object.keys(ZX.SYSTEMS).forEach((k) => {
      html += '<button class="sys-chip" data-sys="' + k + '" style="--c:' + color(k) + '"><i></i>' + ZX.SYSTEMS[k].name + ' <small>' + counts[k] + '</small></button>';
    });
    els.chips.innerHTML = html;
    els.chips.addEventListener('click', (e) => {
      const b = e.target.closest('.sys-chip'); if (!b) return;
      V.setFilter(b.dataset.sys || null);
      if (b.dataset.sys && V.S.explodeTarget < 0.3) { V.setExplode(0.55); syncRange(0.55); }
    });
  }
  function syncChips() {
    ZX.$$('.sys-chip', els.chips).forEach((b) => b.classList.toggle('on', (b.dataset.sys || null) === V.S.filter));
  }

  function buildList() {
    order = [];
    let html = '';
    Object.keys(ZX.SYSTEMS).forEach((k) => {
      html += '<div class="pl-group" data-g="' + k + '" style="--c:' + color(k) + '"><i class="fa-solid ' + ZX.SYSTEMS[k].icon + '"></i>' + ZX.SYSTEMS[k].name + '</div>';
      V.parts.filter((p) => p.userData.sys === k).forEach((p) => {
        order.push(p.userData.id);
        p.userData.code = '#' + String(order.length).padStart(3, '0');
        html += '<button class="pl-item" data-id="' + p.userData.id + '" style="--c:' + color(k) + '"><small>' + p.userData.code + '</small>' + p.userData.info.n + '</button>';
      });
    });
    els.list.innerHTML = html;
    els.list.addEventListener('click', (e) => {
      const b = e.target.closest('.pl-item'); if (!b) return;
      const id = b.dataset.id;
      if (V.S.isolated) V.isolate(id); else V.select(id, { focus: true });
    });
    els.list.addEventListener('pointerover', (e) => { const b = e.target.closest('.pl-item'); V.hoverExt(b ? b.dataset.id : null); });
    els.list.addEventListener('pointerleave', () => V.hoverExt(null));
  }
  function filterList(q) {
    q = (q || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const groups = {};
    ZX.$$('.pl-item', els.list).forEach((b) => {
      const name = b.textContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const show = !q || name.indexOf(q) >= 0;
      b.hidden = !show;
      if (show) groups[sysOf(b.dataset.id)] = true;
    });
    ZX.$$('.pl-group', els.list).forEach((g) => { g.hidden = !groups[g.dataset.g]; });
  }

  function showDetail(id) {
    ZX.$$('.pl-item.on', els.list).forEach((b) => b.classList.remove('on'));
    if (!id) { els.right.hidden = true; return; }
    const p = V.byId[id], u = p.userData, info = u.info, sys = ZX.SYSTEMS[u.sys];
    const item = els.list.querySelector('[data-id="' + id + '"]');
    if (item) { item.classList.add('on'); item.scrollIntoView({ block: 'nearest' }); }
    els.right.style.setProperty('--c', sys.color);
    ZX.$('#pdSys').textContent = sys.name;
    ZX.$('#pdCode').textContent = 'PIEZA ' + u.code;
    ZX.$('#pdName').textContent = info.n;
    ZX.$('#pdDesc').textContent = info.d;
    ZX.$('#pdSpecs').innerHTML = (info.s || []).map((s) => '<div><span>' + s[0] + '</span><b>' + s[1] + '</b></div>').join('');
    ZX.$('#pdTip').textContent = info.t || '';
    ZX.$('#pdPos').textContent = (order.indexOf(id) + 1) + ' / ' + order.length;
    ZX.$('#pdIsolate').innerHTML = V.S.isolated === id ? '<i class="fa-solid fa-compress"></i> Ver todo' : '<i class="fa-solid fa-expand"></i> Aislar';
    els.right.hidden = false;
    if (window.innerWidth <= 860) els.left.classList.add('collapsed');
    ZX.ui.despiece.layout();
  }
  function step(dir) {
    const cur = V.S.selected || order[0];
    let list = order;
    if (V.S.filter) list = order.filter((id) => sysOf(id) === V.S.filter);
    let i = list.indexOf(cur);
    i = (i + dir + list.length) % list.length;
    if (V.S.isolated) V.isolate(list[i]); else V.select(list[i], { focus: true });
  }

  function syncRange(v) {
    els.range.value = Math.round(v * 100);
    rangeFill(els.range);
    els.val.textContent = Math.round(v * 100) + '%';
  }

  // ---------- Minijuego ----------
  function bestKey(kind) { return 'best.' + kind; }
  function fmtTime(s) { const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + String(r).padStart(2, '0'); }
  function openGameMenu() {
    const body = ZX.$('#gameModalBody');
    body.innerHTML = '<h2><i class="fa-solid fa-puzzle-piece" style="color:var(--green)"></i> Arma la moto</h2>' +
      '<p class="muted">Las piezas saldrán volando por la pantalla. Arrástralas hasta su sitio: encajan solas al acercarlas. ¡Contra el reloj!</p>' +
      '<div class="game-opts">' + GAMES.map((g) => {
        const n = idsFor(g).length;
        const best = ZX.store.get(bestKey(g.id), null);
        return '<button class="game-opt" data-g="' + g.id + '"><i class="fa-solid ' + g.icon + '"></i><span><b>' + g.name + ' · ' + n + ' piezas</b><small>' + g.desc + '</small></span><em>' + (best ? 'Récord ' + fmtTime(best) : '') + '</em></button>';
      }).join('') + '</div>';
    ZX.openModal(els.modal);
    body.querySelectorAll('.game-opt').forEach((b) => b.addEventListener('click', () => { ZX.closeModal(els.modal); startGame(b.dataset.g); }));
  }
  function idsFor(g) {
    if (g.ids) return g.ids;
    if (g.all) return V.parts.map((p) => p.userData.id);
    return V.parts.filter((p) => p.userData.sys === g.sys).map((p) => p.userData.id);
  }
  function startGame(kind) {
    const g = GAMES.find((x) => x.id === kind);
    gameKind = kind;
    ZX.audio.ensure();
    els.right.hidden = true;
    document.body.classList.add('game-on');
    V.setSafeArea(0, 0, 0, 0);
    V.startGame(idsFor(g));
    if (g.xray) V.setXray(true);
    els.hud.hidden = false;
    const best = ZX.store.get(bestKey(kind), null);
    ZX.$('#ghBest').textContent = best ? fmtTime(best) : '—';
    gameTimer = 0;
    updateHud(0, idsFor(g).length);
  }
  function updateHud(placed, total) {
    ZX.$('#ghCount').textContent = placed + '/' + total;
    ZX.$('#ghBar').style.width = (total ? placed / total * 100 : 0) + '%';
  }
  function stopGame(assemble) {
    V.endGame(assemble);
    V.setXray(false);
    els.hud.hidden = true;
    document.body.classList.remove('game-on');
    gameKind = null;
    ZX.ui.despiece.layout();
  }
  function onGame(ev) {
    if (ev.type === 'snap') {
      ZX.audio.ui('snap');
      updateHud(ev.placed, ev.total);
      const b = document.createElement('div'); b.className = 'snap-burst'; b.style.left = ev.x + 'px'; b.style.top = ev.y + 'px';
      const t = document.createElement('div'); t.className = 'snap-txt'; t.style.left = ev.x + 'px'; t.style.top = ev.y + 'px';
      t.textContent = '¡ENCAJA!';
      document.body.append(b, t);
      setTimeout(() => { b.remove(); t.remove(); }, 950);
    } else if (ev.type === 'win') {
      ZX.audio.ui('win');
      const kind = gameKind;
      const prev = ZX.store.get(bestKey(kind), null);
      const record = !prev || ev.secs < prev;
      if (record) ZX.store.set(bestKey(kind), ev.secs);
      stopGame(false);
      ZX.$('#gameModalBody').innerHTML = '<h2 style="text-align:center">¡Moto armada! <i class="fa-solid fa-flag-checkered" style="color:var(--green)"></i></h2>' +
        '<div class="win-time">' + fmtTime(ev.secs) + '</div>' +
        '<p class="muted" style="text-align:center;margin-bottom:18px">' + ev.total + ' piezas colocadas' + (record ? ' · <b class="g">¡Nuevo récord!</b>' : ' · Récord: ' + fmtTime(prev)) + '</p>' +
        '<div class="btn-row"><button class="btn" id="gwAgain"><i class="fa-solid fa-rotate-right"></i> Jugar otra vez</button><button class="btn btn-primary" data-close>Seguir explorando</button></div>';
      ZX.openModal(els.modal);
      ZX.$('#gwAgain').addEventListener('click', () => { ZX.closeModal(els.modal); openGameMenu(); });
    }
  }

  ZX.ui.despiece = {
    init() {
      V = ZX.viewer;
      els.left = ZX.$('#dzLeft'); els.right = ZX.$('#dzRight');
      els.range = ZX.$('#explodeRange'); els.val = ZX.$('#explodeVal');
      els.chips = ZX.$('#sysChips'); els.list = ZX.$('#partList');
      els.hud = ZX.$('#gameHud'); els.modal = ZX.$('#gameModal');
      els.iso = ZX.$('#isoBar'); els.hint = ZX.$('#dzHint');
      buildChips(); buildList();
      ZX.$('#dzTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setTab(b.dataset.tab); });
      setTab('ctl');

      // Explosión
      els.range.addEventListener('input', () => {
        const v = els.range.value / 100;
        V.S.explodeDragging = true; V.setExplode(v, true);
        rangeFill(els.range); els.val.textContent = els.range.value + '%';
      });
      els.range.addEventListener('change', () => { V.S.explodeDragging = false; });
      ZX.$('#btnExplode').addEventListener('click', () => { V.setExplode(1); V.preset('explotada', 1.2); });
      ZX.$('#btnAssemble').addEventListener('click', () => { V.setExplode(0); V.resetManual(); if (!V.S.isolated) V.preset('tresCuartos', 1.0); });

      // Herramientas
      const tX = ZX.$('#tXray'), tL = ZX.$('#tLabels'), tA = ZX.$('#tAnim');
      tX.addEventListener('click', () => { V.setXray(!V.S.xray); setPressed(tX, V.S.xray); });
      tL.addEventListener('click', () => { V.setLabels(!V.S.labels); setPressed(tL, V.S.labels); });
      tA.addEventListener('click', () => { V.setAnimEngine(!V.S.animEngine); setPressed(tA, V.S.animEngine); });
      ZX.$('#tReset').addEventListener('click', () => {
        if (V.anyManual()) { V.resetManual(); ZX.toast('Piezas de vuelta a su sitio'); } else ZX.toast('Todas las piezas ya están en su sitio');
      });
      ZX.$('#camSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) V.preset(b.dataset.cam, 1.0); });
      els.search = ZX.$('#partSearch');
      els.search.addEventListener('input', () => filterList(els.search.value));
      ZX.$('#dzSheet').addEventListener('click', () => els.left.classList.toggle('collapsed'));

      // Ficha de pieza
      ZX.$('#dzClose').addEventListener('click', () => { V.select(null); if (V.S.isolated) V.isolate(null); });
      ZX.$('#pdIsolate').addEventListener('click', () => { const id = V.S.selected; V.isolate(V.S.isolated === id ? null : id); });
      ZX.$('#pdFocus').addEventListener('click', () => { if (V.S.selected) V.focusPart(V.S.selected); });
      ZX.$('#pdReturn').addEventListener('click', () => { if (V.S.selected) V.returnPart(V.S.selected); });
      ZX.$('#pdPrev').addEventListener('click', () => step(-1));
      ZX.$('#pdNext').addEventListener('click', () => step(1));
      ZX.$('#isoExit').addEventListener('click', () => V.isolate(null));

      V.on('select', (id) => showDetail(id));
      V.on('filter', () => syncChips());
      V.on('hover', (id) => {
        ZX.$$('.pl-item.hl', els.list).forEach((b) => b.classList.remove('hl'));
        if (id) { const b = els.list.querySelector('[data-id="' + id + '"]'); if (b) b.classList.add('hl'); }
      });
      V.on('isolate', (id) => {
        els.iso.hidden = !id;
        if (id) ZX.$('#isoName').textContent = V.byId[id].userData.info.n;
        if (V.S.selected) showDetail(V.S.selected);
      });
      V.on('dragstart', () => { els.hint.style.opacity = '0'; });

      // Juego
      ZX.$('#btnGame').addEventListener('click', openGameMenu);
      ZX.$('#ghHint').addEventListener('click', () => { if (!V.gameHint()) ZX.toast('No quedan piezas'); });
      ZX.$('#ghQuit').addEventListener('click', () => { stopGame(true); ZX.toast('Moto ensamblada automáticamente'); });
      V.on('game', onGame);
      rangeFill(els.range);
    },
    enter(opts) {
      V.restoreExplore();
      syncRange(V.S.explodeTarget);
      syncChips();
      setPressed(ZX.$('#tXray'), V.S.xray); setPressed(ZX.$('#tLabels'), V.S.labels); setPressed(ZX.$('#tAnim'), V.S.animEngine);
      if (opts && opts.select) {
        V.select(opts.select);
        V.setExplode(Math.max(V.S.explodeTarget, 0.35)); syncRange(V.S.explodeTarget);
        V.focusPart(opts.select);
      } else if (!visited) {
        V.preset('tresCuartos', 1.0);
        setTimeout(() => {
          if (ZX.current === 'despiece' && V.S.explodeTarget === 0 && !V.S.selected) { V.setExplode(0.4); syncRange(0.4); V.preset('tresCuartos', 1.4); }
        }, 900);
      }
      visited = true;
      showDetail(V.S.selected);
      els.iso.hidden = !V.S.isolated;
      this.layout();
    },
    layout() {
      if (gameKind) { V.setSafeArea(0, 0, 0, 0); return; }
      const st = ZX.$('#stage').getBoundingClientRect();
      if (window.innerWidth > 860) {
        const l = els.left.getBoundingClientRect().right - st.left + 8;
        const r = els.right.hidden ? 0 : st.right - els.right.getBoundingClientRect().left + 8;
        V.setSafeArea(l, r, 0, 0);
      } else {
        const b = els.left.classList.contains('collapsed') ? 60 : st.bottom - els.left.getBoundingClientRect().top;
        V.setSafeArea(0, 0, 0, Math.max(0, b));
      }
    },
    leave() {
      if (gameKind) stopGame(true);
      V.S.explodeDragging = false;
      V.saveExplore();
      V.hoverExt(null);
    },
    frame(dt) {
      if (!V.S.explodeDragging && Math.abs(els.range.value / 100 - V.S.explode) > 0.004) syncRange(V.S.explode);
      if (gameKind && V.S.game.active) {
        gameTimer += dt;
        ZX.$('#ghTime').textContent = fmtTime((performance.now() - V.S.game.t0) / 1000);
      }
    },
    key(e, down) {
      if (!down || e.repeat) return false;
      if (e.key === 'Escape') {
        if (!els.modal.hidden) return false;
        if (V.S.isolated) { V.isolate(null); return true; }
        if (V.S.selected) { V.select(null); return true; }
        return false;
      }
      if (gameKind) return false;
      const k = e.key.toLowerCase();
      if (k === 'x') { ZX.$('#tXray').click(); return true; }
      if (k === 'l') { ZX.$('#tLabels').click(); return true; }
      if (k === 'e') { V.setExplode(V.S.explodeTarget > 0.5 ? 0 : 1); return true; }
      if (k === 'r') { ZX.$('#tReset').click(); return true; }
      if (e.key === 'ArrowRight') { step(1); return true; }
      if (e.key === 'ArrowLeft') { step(-1); return true; }
      return false;
    }
  };
})();
