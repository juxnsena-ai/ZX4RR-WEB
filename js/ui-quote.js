/* =========================================================
   COTIZACIÓN INFORMATIVA (sin pagos ni reservas)
   ========================================================= */
(function () {
  'use strict';
  const ZX = (window.ZX = window.ZX || {});
  ZX.ui = ZX.ui || {};

  let els = {}, imgVersion = -1, imgUrl = '';

  function cur() {
    const id = ZX.store.get('currency', 'USD');
    const base = ZX.CURRENCIES.find((c) => c.id === id) || ZX.CURRENCIES[0];
    const rates = ZX.store.get('rates', {});
    return { id: base.id, symbol: base.symbol, rate: rates[base.id] !== undefined ? rates[base.id] : base.rate };
  }
  function money(usd) { const c = cur(); return c.symbol + ' ' + ZX.fmt(Math.round(usd * c.rate)); }
  function lines() {
    const base = ZX.store.get('basePrice', ZX.BASE_PRICE_USD);
    const L = ZX.priceLines(ZX.config, base);
    if (ZX.store.get('fees', false)) L.push({ label: 'Matrícula y documentos', sub: 'Estimación del 6 % del precio base', usd: Math.round(base * 0.06) });
    return L;
  }

  function render() {
    const c = ZX.config, L = lines();
    els.lines.innerHTML = L.map((l) => '<div class="qt-line' + (l.usd ? '' : ' zero') + '"><span>' + l.label + '<small>' + l.sub + '</small></span><b>' + (l.usd ? money(l.usd) : 'Incluido') + '</b></div>').join('');
    els.total.textContent = money(L.reduce((s, l) => s + l.usd, 0));
    const fr = ZX.FRAME_COLORS.find((f) => f.id === c.frameId), wh = ZX.WHEEL_COLORS.find((w) => w.id === c.wheelId);
    const ex = ZX.EXHAUSTS.find((e) => e.id === c.exhaust);
    const accs = ZX.ACCESSORIES.filter((a) => c.acc[a.id]).map((a) => a.name);
    els.conf.innerHTML =
      '<div><small>Decoración</small><b><i style="--c:' + c.colors.p1 + '"></i><i style="--c:' + c.colors.p2 + '"></i><i style="--c:' + c.colors.p3 + '"></i>' + ZX.configName(c) + '</b></div>' +
      '<div><small>Chasis / llantas</small><b><i style="--c:' + fr.hex + '"></i>' + fr.name + ' · <i style="--c:' + wh.hex + '"></i>' + wh.name + '</b></div>' +
      '<div><small>Escape</small><b>' + ex.name + '</b></div>' +
      '<div><small>Accesorios</small><b>' + (accs.length ? accs.length + ' seleccionados' : 'Ninguno') + '</b></div>';
    const cc = cur();
    els.cur.value = cc.id;
    els.rate.value = cc.rate;
    els.rate.disabled = cc.id === 'USD';
    els.base.value = ZX.store.get('basePrice', ZX.BASE_PRICE_USD);
    els.fees.checked = ZX.store.get('fees', false);
  }
  function summaryText() {
    const c = ZX.config, L = lines();
    const out = ['COTIZACIÓN INFORMATIVA · Kawasaki Ninja ZX-4RR', ''];
    L.forEach((l) => out.push('• ' + l.label + ': ' + (l.usd ? money(l.usd) : 'incluido')));
    out.push('', 'TOTAL ESTIMADO: ' + money(L.reduce((s, l) => s + l.usd, 0)));
    out.push('Decoración: ' + ZX.configName(c) + ' (' + c.colors.p1 + ', ' + c.colors.p2 + ', ' + c.colors.p3 + ')');
    out.push('', 'Valores ilustrativos. Esta página no vende ni procesa pagos; consulta un concesionario oficial Kawasaki.');
    return out.join('\n');
  }

  ZX.ui.cotizacion = {
    init() {
      els.lines = ZX.$('#qtLines'); els.total = ZX.$('#qtTotal'); els.conf = ZX.$('#qtConf'); els.img = ZX.$('#qtImg');
      els.cur = ZX.$('#qtCur'); els.rate = ZX.$('#qtRate'); els.base = ZX.$('#qtBase'); els.fees = ZX.$('#qtFees');
      els.cur.innerHTML = ZX.CURRENCIES.map((c) => '<option value="' + c.id + '">' + c.id + ' · ' + c.symbol + '</option>').join('');
      els.cur.addEventListener('change', () => { ZX.store.set('currency', els.cur.value); render(); });
      els.rate.addEventListener('input', () => {
        const v = parseFloat(els.rate.value); if (!(v > 0)) return;
        const r = ZX.store.get('rates', {}); r[cur().id] = v; ZX.store.set('rates', r);
        render();
      });
      els.base.addEventListener('input', () => { const v = parseFloat(els.base.value); if (v >= 0) { ZX.store.set('basePrice', v); render(); } });
      els.fees.addEventListener('change', () => { ZX.store.set('fees', els.fees.checked); render(); });
      ZX.$('#qtCopy').addEventListener('click', () => {
        const txt = summaryText();
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => ZX.toast('Resumen copiado'), () => ZX.toast('No se pudo copiar', 'warn'));
        else ZX.toast('Tu navegador no permite copiar automáticamente', 'warn');
      });
      ZX.$('#qtPrint').addEventListener('click', () => window.print());
      ZX.$('#qtImgBtn').addEventListener('click', () => {
        if (!imgUrl) return;
        const a = document.createElement('a'); a.href = imgUrl; a.download = 'mi-ninja-zx4rr.png';
        document.body.appendChild(a); a.click(); a.remove();
      });
      ZX.configListeners.push(() => { if (ZX.current === 'cotizacion') render(); });
    },
    enter() {
      render();
      if (imgVersion !== ZX.configVersion || !imgUrl) {
        imgVersion = ZX.configVersion;
        ZX.viewer.cleanState(true);
        imgUrl = ZX.viewer.snapshot(1400, 860, 'config');
        els.img.src = imgUrl;
      }
    }
  };
})();
