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
})();
