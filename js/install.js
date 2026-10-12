/* =========================================================
   INSTALAR COMO APP (PWA): Android, iPhone/iPad y ordenador
   - Android / Chrome / Edge: usa el aviso de instalación del navegador.
   - iPhone / iPad: muestra los pasos de "Añadir a pantalla de inicio".
   ========================================================= */
(function () {
  'use strict';
  const ZX = (window.ZX = window.ZX || {});
  let deferred = null;

  const ua = navigator.userAgent || '';
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);
  const isIOSSafari = isIOS && /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
  const isStandalone = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

  // El navegador avisa de que la app se puede instalar (Android, Chrome, Edge)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    document.body.classList.add('can-install');
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    document.body.classList.add('app-installed');
    const m = document.getElementById('installModal');
    if (m) m.hidden = true;
    if (ZX.toast) ZX.toast('¡App instalada! Ya la tienes en tu pantalla de inicio');
  });

  // Registrar el service worker (solo funciona servido por http/https)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }

  function step(icon, html) {
    return '<li><span class="ins-ico"><i class="' + icon + '"></i></span><span>' + html + '</span></li>';
  }
  function guide() {
    if (isIOS) {
      const intro = isIOSSafari
        ? '<p class="muted">En iPhone y iPad la app se instala desde <b>Safari</b> en 3 pasos:</p>'
        : '<p class="muted">En iPhone y iPad abre esta página en <b>Safari</b> (o usa el botón Compartir de tu navegador) y sigue estos pasos:</p>';
      return intro + '<ol class="ins-steps">' +
        step('fa-solid fa-arrow-up-from-bracket', 'Toca el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba), abajo o arriba de la pantalla.') +
        step('fa-regular fa-square-plus', 'Desliza y elige <b>"Añadir a pantalla de inicio"</b>.') +
        step('fa-solid fa-check', 'Pulsa <b>"Añadir"</b>. El ícono <b>ZX-4RR</b> aparecerá en tu pantalla como una app más.') +
        '</ol>';
    }
    if (isAndroid) {
      return '<p class="muted">Si no apareció el aviso de instalación, hazlo desde el menú de Chrome:</p><ol class="ins-steps">' +
        step('fa-solid fa-ellipsis-vertical', 'Toca el menú <b>⋮</b> (arriba a la derecha).') +
        step('fa-solid fa-mobile-screen-button', 'Elige <b>"Instalar aplicación"</b> o <b>"Añadir a pantalla principal"</b>.') +
        step('fa-solid fa-check', 'Confirma con <b>"Instalar"</b>. La app aparecerá con el ícono <b>ZX-4RR</b>.') +
        '</ol>';
    }
    return '<p class="muted">En el ordenador puedes instalarla con Chrome o Edge:</p><ol class="ins-steps">' +
      step('fa-solid fa-display', 'Busca el ícono de <b>instalar</b> (una pantalla con una flecha) a la derecha de la barra de direcciones.') +
      step('fa-solid fa-ellipsis-vertical', 'O abre el menú <b>⋮</b> / <b>…</b> y elige <b>"Instalar Ninja ZX-4RR"</b> (en Edge: Aplicaciones → Instalar este sitio como aplicación).') +
      step('fa-solid fa-mobile-screen-button', 'En el móvil: Android con Chrome o iPhone con Safari → "Añadir a pantalla de inicio".') +
      '</ol>';
  }

  ZX.install = async function () {
    if (isStandalone()) { if (ZX.toast) ZX.toast('Ya estás usando la app instalada'); return; }
    if (deferred) {
      const d = deferred;
      deferred = null;
      document.body.classList.remove('can-install');
      try {
        d.prompt();
        const choice = await d.userChoice;
        if (choice && choice.outcome !== 'accepted' && ZX.toast) ZX.toast('Puedes instalarla cuando quieras desde este botón');
      } catch (err) { openGuide(); }
      return;
    }
    openGuide();
  };
  function openGuide() {
    const m = document.getElementById('installModal');
    document.getElementById('installBody').innerHTML = guide();
    m.hidden = false;
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (isStandalone()) document.body.classList.add('app-installed');
    document.querySelectorAll('[data-install]').forEach((b) => b.addEventListener('click', () => ZX.install()));
  });
})();
