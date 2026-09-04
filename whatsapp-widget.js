/**
 * Botón flotante de WhatsApp — Proyecto Polaris
 *
 * Lee el atributo data-wa-categoria del <body> para construir un mensaje
 * predefinido y muestra un botón flotante que abre WhatsApp con ese mensaje.
 */
(function () {
  'use strict';

  var WHATSAPP_NUMBER = '14782260715';

  var MENSAJES_POR_CATEGORIA = {
    'llc': 'Hola, he visto vuestra web y quiero más información sobre: LLC',
    'marca': 'Hola, he visto vuestra web y quiero más información sobre: registro de marca',
    'neutra': 'Hola, he visto vuestra web y quiero más información sobre: ',
    'oferta-precio-maximo': 'Hola, he visto vuestra oferta de precio máximo para la LLC y quiero más información.',
    'oferta-llc-marca': 'Hola, he visto vuestra oferta de LLC y marca y quiero más información.'
  };

  function construirMensaje() {
    var categoria = document.body.getAttribute('data-wa-categoria');
    if (!categoria || !MENSAJES_POR_CATEGORIA.hasOwnProperty(categoria)) {
      categoria = 'neutra';
    }
    return MENSAJES_POR_CATEGORIA[categoria];
  }

  // Determina si el botón debe apilarse por encima de otros widgets
  // flotantes ya presentes en la página (#cal-widget, #ref-widget-wrap),
  // mirando el DOM real en vez de asumir una lista fija de páginas.
  function obtenerClaseApilado() {
    var hayCalendario = !!document.getElementById('cal-widget');
    var hayReferidos = !!document.getElementById('ref-widget-wrap');
    if (hayCalendario && hayReferidos) return 'wa-stack-cal-ref';
    if (hayCalendario) return 'wa-stack-cal';
    return '';
  }

  function crearBoton() {
    var mensaje = construirMensaje();
    var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(mensaje);

    var enlace = document.createElement('a');
    enlace.className = 'wa-float-btn';
    var claseApilado = obtenerClaseApilado();
    if (claseApilado) {
      enlace.classList.add(claseApilado);
    }
    enlace.href = url;
    enlace.target = '_blank';
    enlace.rel = 'noopener';
    enlace.setAttribute('aria-label', 'Contactar por WhatsApp');

    enlace.innerHTML =
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      '<path fill="#ffffff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>' +
      '</svg>' +
      '<span>Contáctanos</span>';

    enlace.addEventListener('click', function() {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'conversion', {
          'send_to': 'AW-18177147225/CPkqCJDNpe4cENmCxdtD'
        });
      }
    });

    document.body.appendChild(enlace);
  }

  crearBoton();
})();
