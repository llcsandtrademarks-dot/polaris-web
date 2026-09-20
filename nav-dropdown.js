// Menús "Servicios" / "Herramientas" del header: hover + click en escritorio,
// acordeón expandible dentro del menú hamburguesa en móvil.
(function () {
  function closeAllDropdowns(except) {
    document.querySelectorAll('.nav-dropdown.open').forEach(function (el) {
      if (el === except) return;
      el.classList.remove('open');
      var btn = el.querySelector('.nav-dropdown-toggle');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }

  document.querySelectorAll('.nav-dropdown-toggle').forEach(function (btn) {
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var parent = btn.closest('.nav-dropdown');
      if (!parent) return;
      var willOpen = !parent.classList.contains('open');
      closeAllDropdowns(willOpen ? parent : null);
      parent.classList.toggle('open', willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    });
  });

  document.addEventListener('click', function () { closeAllDropdowns(null); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllDropdowns(null);
  });

  // Acordeón de submenús dentro del menú móvil (hamburguesa)
  document.querySelectorAll('.mobile-submenu-toggle').forEach(function (btn) {
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function () {
      var parent = btn.closest('.mobile-submenu');
      if (!parent) return;
      var willOpen = !parent.classList.contains('open');
      parent.classList.toggle('open', willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    });
  });

  // Resalta el enlace de la página actual en el header (header.html es el
  // mismo en todas las páginas, así que la marca "activo" se hace en JS
  // comparando cada href del menú con la URL actual).
  (function highlightActiveNavLink() {
    // Ruta completa normalizada (no solo el nombre de archivo — "index.html"
    // existe tanto en la raíz como en /blog/, así que comparar solo el
    // nombre marcaría "Noticias" como activo estando en la portada).
    function normalize(pathname) {
      return pathname.replace(/\/(index\.html)?$/, '/index.html');
    }
    var here = normalize(window.location.pathname);
    document.querySelectorAll('.nav-links a, .nav-dropdown-menu a, .mobile-menu a, .mobile-submenu-panel a').forEach(function (a) {
      var hrefPath = normalize(new URL(a.getAttribute('href'), window.location.href).pathname);
      if (hrefPath !== here) return;
      a.classList.add('active');
      var dropdown = a.closest('.nav-dropdown');
      if (dropdown) {
        var toggle = dropdown.querySelector('.nav-dropdown-toggle');
        if (toggle) toggle.classList.add('active');
      }
    });
  })();

  // Intro del menú móvil: la primera vez que se carga cualquier página del
  // sitio en una sesión de navegador (solo en viewport móvil), el menú
  // hamburguesa se abre solo, se queda abierto 0.5s, se cierra solo, y el
  // botón parpadea una vez al cerrarse — para que el visitante note que ahí
  // vive la navegación. Una sola vez por sesión (sessionStorage).
  //
  // Una página puede personalizarlo definiendo, ANTES de cargar este script,
  //   window.polarisMenuIntro = {
  //     delay: 1000,          // ms de espera antes de abrir el menú (defecto 700, desde que corre el script)
  //     afterLoad: true,      // contar el delay desde que la página termina de cargar (evento load)
  //     gate: Promise|null,   // si hay una promesa, se espera a que se resuelva (p. ej. cierre de un popup) y entonces se cuenta el delay
  //     keepButtonWhite: true // tras el parpadeo, el botón se queda con fondo blanco (clase nav-hamburger-highlight)
  //   };
  // Sin esa config (todas las demás páginas) el comportamiento es el de siempre.
  (function mobileMenuIntro() {
    var MOBILE_QUERY = '(max-width: 768px)';
    var STORAGE_KEY = 'menuIntroShown';
    var cfg = window.polarisMenuIntro || null;
    var opts = cfg || {};
    var menu = document.getElementById('mobileMenu');
    var hamburger = document.querySelector('.nav-hamburger');
    if (!menu || !hamburger) return;

    function highlight() {
      if (opts.keepButtonWhite) hamburger.classList.add('nav-hamburger-highlight');
    }

    var alreadyShown = false;
    try {
      if (!window.matchMedia(MOBILE_QUERY).matches) return;
      alreadyShown = !!sessionStorage.getItem(STORAGE_KEY);
      // Con config de página, la marca se pone al EMPEZAR la animación (así, si el
      // visitante recarga mientras el popup sigue abierto, la intro no se pierde).
      // Sin config: se marca ya, antes de animar, como siempre.
      if (!alreadyShown && !cfg) sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
      // sessionStorage puede no estar disponible (modo privado estricto, etc.)
      return;
    }
    if (alreadyShown) { highlight(); return; } // intro ya vista: el botón se mantiene destacado

    function run() {
      // Si el visitante ya cambió a desktop, no interferimos.
      if (!window.matchMedia(MOBILE_QUERY).matches) return;
      if (cfg) { try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) {} }
      menu.classList.add('open');
      setTimeout(function () {
        menu.classList.remove('open');
        hamburger.classList.add('nav-hamburger-blink');
        var finished = false;
        function finish() {
          if (finished) return;
          finished = true;
          hamburger.classList.remove('nav-hamburger-blink');
          hamburger.removeEventListener('animationend', finish);
          highlight();
        }
        hamburger.addEventListener('animationend', finish);
        // Respaldo: si el navegador no emite animationend (pestaña en segundo plano,
        // "reducir movimiento"...), se cierra igualmente tras la duración del parpadeo.
        setTimeout(finish, 600);
      }, 500);
    }

    var delay = typeof opts.delay === 'number' ? opts.delay : 700;
    function schedule() { setTimeout(run, delay); }

    function afterLoad(cb) {
      if (opts.afterLoad && document.readyState !== 'complete') window.addEventListener('load', cb);
      else cb();
    }

    if (opts.gate && typeof opts.gate.then === 'function') {
      // Espera al cierre del popup (o lo que resuelva la promesa) y entonces cuenta el delay.
      opts.gate.then(function () { afterLoad(schedule); });
    } else {
      afterLoad(schedule);
    }
  })();
})();
