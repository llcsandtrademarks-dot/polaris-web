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
  (function mobileMenuIntro() {
    var MOBILE_QUERY = '(max-width: 768px)';
    var STORAGE_KEY = 'menuIntroShown';
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
      if (!window.matchMedia(MOBILE_QUERY).matches) return;
      // Se marca ya como "mostrado" antes de animar, para no repetirlo si el
      // visitante recarga rápido durante los 0.5s que el menú está abierto.
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
      // sessionStorage puede no estar disponible (modo privado estricto, etc.)
      return;
    }

    var menu = document.getElementById('mobileMenu');
    var hamburger = document.querySelector('.nav-hamburger');
    if (!menu || !hamburger) return;

    setTimeout(function () {
      // Si el visitante ya cambió a desktop o abrió/cerró el menú a mano,
      // no interferimos.
      if (!window.matchMedia(MOBILE_QUERY).matches) return;
      menu.classList.add('open');
      setTimeout(function () {
        menu.classList.remove('open');
        hamburger.classList.add('nav-hamburger-blink');
        hamburger.addEventListener('animationend', function onEnd() {
          hamburger.classList.remove('nav-hamburger-blink');
          hamburger.removeEventListener('animationend', onEnd);
        });
      }, 500);
    }, 700);
  })();
})();
