/**
 * Botón flotante de WhatsApp — Proyecto Polaris
 *
 * Widget único e idéntico en todas las páginas. Al hacer clic abre un panel de
 * chat simulado (guion fijo, sin IA): el visitante cuenta en qué necesita ayuda,
 * deja nombre y correo, se guarda el lead en polaris-api (/whatsapp-lead) y se
 * abre WhatsApp con el mensaje ya escrito.
 */
(function () {
  'use strict';

  var WHATSAPP_NUMBER = '14782260715';
  var API_LEAD_URL = 'https://polaris-api.llcsandtrademarks.workers.dev/whatsapp-lead';

  var TEXTO_BIENVENIDA = 'Hola, bienvenido a Proyecto Polaris. Cuéntame en qué puedo ayudarte.';
  var TEXTO_PASO_DATOS = 'Perfecto. Te paso con un especialista — dime tu nombre y tu correo electrónico para pasarle tus datos completos y te conectamos enseguida por WhatsApp.';
  // Mismo texto que el checkbox de contacto.html (obligatorio en ambos formularios).
  var TEXTO_CONSENTIMIENTO = 'Acepto recibir comunicaciones a esta dirección. Puedes cancelar con un click en cualquier momento';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Tiempo que se muestra el indicador de "escribiendo…" antes del mensaje de bienvenida.
  var RETRASO_BIENVENIDA_MS = 2000;

  var mensajeCliente = '';

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

  // Estilos del panel de chat. Van inyectados desde aquí (y no en shared.css)
  // para que el panel nunca se vea sin estilo si shared.css sigue en caché.
  function inyectarEstilos() {
    var css =
      '.wa-chat-panel{position:fixed;right:20px;bottom:76px;width:340px;max-width:calc(100vw - 32px);max-height:min(560px,calc(100vh - 110px));display:none;flex-direction:column;background:#f0f2f5;border-radius:14px;box-shadow:0 10px 32px rgba(0,0,0,.35);overflow:hidden;z-index:10000;font-family:"DM Sans",Arial,sans-serif;font-size:14px;line-height:1.4;color:#111}' +
      '.wa-chat-panel.wa-abierto{display:flex}' +
      '.wa-chat-panel.wa-stack-cal{bottom:136px;max-height:min(560px,calc(100vh - 170px))}' +
      '.wa-chat-panel.wa-stack-cal-ref{bottom:216px;max-height:min(560px,calc(100vh - 250px))}' +
      '.wa-chat-head{display:flex;align-items:center;justify-content:space-between;background:#25D366;color:#fff;padding:12px 14px;font-weight:700;font-size:14px}' +
      '.wa-chat-close{background:none;border:0;color:#fff;font-size:18px;line-height:1;cursor:pointer;padding:2px 4px}' +
      '.wa-chat-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px}' +
      '.wa-msg{max-width:85%;padding:8px 12px;border-radius:12px;word-wrap:break-word;overflow-wrap:anywhere;white-space:pre-wrap}' +
      '.wa-msg-bot{align-self:flex-start;background:#fff;border:1px solid #e2e5e9;border-top-left-radius:4px}' +
      '.wa-msg-user{align-self:flex-end;background:#d9fdd3;border-top-right-radius:4px}' +
      '.wa-typing{display:flex;align-items:center;gap:4px;padding:12px 14px}' +
      '.wa-typing span{width:7px;height:7px;border-radius:50%;background:#9aa0a6;animation:wa-rebote 1.2s infinite ease-in-out}' +
      '.wa-typing span:nth-child(2){animation-delay:.2s}.wa-typing span:nth-child(3){animation-delay:.4s}' +
      '@keyframes wa-rebote{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-4px);opacity:1}}' +
      '.wa-chat-input{display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid #e2e5e9}' +
      '.wa-chat-input textarea{flex:1;resize:none;border:1px solid #ccd0d5;border-radius:10px;padding:8px 10px;font:inherit;font-size:14px;max-height:90px}' +
      '.wa-chat-input textarea:focus,.wa-form input[type=text],.wa-form input[type=email]{outline:none}' +
      '.wa-chat-input textarea:focus,.wa-form input:focus{border-color:#25D366;box-shadow:0 0 0 2px rgba(37,211,102,.25)}' +
      '.wa-btn{background:#25D366;color:#fff;border:0;border-radius:10px;padding:8px 14px;font:inherit;font-size:14px;font-weight:700;cursor:pointer}' +
      '.wa-btn:disabled{opacity:.5;cursor:not-allowed}' +
      '.wa-form{align-self:stretch;background:#fff;border:1px solid #e2e5e9;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px}' +
      '.wa-form label.wa-campo{display:flex;flex-direction:column;gap:3px;font-size:12px;font-weight:700;color:#333}' +
      '.wa-form input[type=text],.wa-form input[type=email]{border:1px solid #ccd0d5;border-radius:8px;padding:8px 10px;font:inherit;font-size:14px;font-weight:400}' +
      '.wa-form .wa-error{color:#d32f2f;font-size:11px;font-weight:400;display:none}' +
      '.wa-form .wa-error.wa-visible{display:block}' +
      '.wa-consent{display:flex;flex-direction:row;align-items:flex-start;gap:8px;font-size:12px;font-weight:400;line-height:18px;color:#000;cursor:pointer}' +
      '.wa-consent input{margin:2px 0 0;flex-shrink:0;width:16px;height:16px;accent-color:#25D366}' +
      '.wa-final a{color:#128C7E;font-weight:700}' +
      '@media (max-width:600px){.wa-chat-panel{right:16px;bottom:64px}.wa-chat-panel.wa-stack-cal{bottom:124px}.wa-chat-panel.wa-stack-cal-ref{bottom:204px}}';
    var estilo = document.createElement('style');
    estilo.textContent = css;
    document.head.appendChild(estilo);
  }

  function crearElemento(etiqueta, clase, texto) {
    var el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function construirEnlaceWhatsApp(nombre, email) {
    var texto = 'Hola, soy ' + nombre + ' (' + email + '). ' + mensajeCliente;
    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(texto);
  }

  function crearBoton() {
    var claseApilado = obtenerClaseApilado();

    var enlace = document.createElement('a');
    enlace.className = 'wa-float-btn';
    if (claseApilado) {
      enlace.classList.add(claseApilado);
    }
    enlace.href = '#';
    enlace.setAttribute('role', 'button');
    enlace.setAttribute('aria-label', 'Contactar por WhatsApp');
    enlace.setAttribute('aria-expanded', 'false');

    enlace.innerHTML =
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      '<path fill="#ffffff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>' +
      '</svg>' +
      '<span>Contáctanos</span>';

    document.body.appendChild(enlace);
    return { boton: enlace, claseApilado: claseApilado };
  }

  function crearPanel(claseApilado, boton) {
    var panel = crearElemento('div', 'wa-chat-panel');
    if (claseApilado) {
      panel.classList.add(claseApilado);
    }
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Chat con Proyecto Polaris');

    var cabecera = crearElemento('div', 'wa-chat-head');
    cabecera.appendChild(crearElemento('span', '', 'Proyecto Polaris'));
    var cerrar = crearElemento('button', 'wa-chat-close', '✕');
    cerrar.type = 'button';
    cerrar.setAttribute('aria-label', 'Cerrar chat');
    cabecera.appendChild(cerrar);

    var cuerpo = crearElemento('div', 'wa-chat-body');
    cuerpo.setAttribute('aria-live', 'polite');

    var filaInput = crearElemento('div', 'wa-chat-input');
    var campoMensaje = document.createElement('textarea');
    campoMensaje.rows = 1;
    campoMensaje.maxLength = 1000;
    campoMensaje.placeholder = 'Escribe tu mensaje…';
    campoMensaje.setAttribute('aria-label', 'Tu mensaje');
    var enviar = crearElemento('button', 'wa-btn', 'Enviar');
    enviar.type = 'button';
    filaInput.appendChild(campoMensaje);
    filaInput.appendChild(enviar);

    panel.appendChild(cabecera);
    panel.appendChild(cuerpo);
    panel.appendChild(filaInput);
    document.body.appendChild(panel);

    var iniciado = false;
    var yaEnvio = false;
    var bienvenidaLista = false;

    function agregarMensaje(clase, texto) {
      var burbuja = crearElemento('div', 'wa-msg ' + clase, texto);
      cuerpo.appendChild(burbuja);
      cuerpo.scrollTop = cuerpo.scrollHeight;
      return burbuja;
    }

    function abrir() {
      panel.classList.add('wa-abierto');
      boton.setAttribute('aria-expanded', 'true');
      if (!iniciado) {
        iniciado = true;
        // Indicador de "escribiendo…" (solo antes del primer mensaje del bot).
        var escribiendo = crearElemento('div', 'wa-msg wa-msg-bot wa-typing');
        escribiendo.setAttribute('aria-label', 'Escribiendo…');
        for (var i = 0; i < 3; i++) escribiendo.appendChild(document.createElement('span'));
        cuerpo.appendChild(escribiendo);
        setTimeout(function () {
          escribiendo.remove();
          agregarMensaje('wa-msg-bot', TEXTO_BIENVENIDA);
          bienvenidaLista = true;
        }, RETRASO_BIENVENIDA_MS);
      }
      if (!yaEnvio) campoMensaje.focus();
    }

    function cerrarPanel() {
      panel.classList.remove('wa-abierto');
      boton.setAttribute('aria-expanded', 'false');
    }

    // Paso 5: el lead se guarda (fire-and-forget), se dispara la conversión de
    // Google Ads y se abre WhatsApp con el mensaje prerellenado.
    function conectarPorWhatsApp(nombre, email, formulario) {
      var enlaceWa = construirEnlaceWhatsApp(nombre, email);

      // a) Fire-and-forget: si tarda o falla, no bloquea el paso siguiente.
      try {
        fetch(API_LEAD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: nombre, email: email, mensaje: mensajeCliente, pagina_origen: location.href }),
          keepalive: true
        }).catch(function () {});
      } catch (e) {}

      // b) Conversión de Google Ads "Contacto WhatsApp".
      if (typeof gtag !== 'undefined') {
        gtag('event', 'conversion', {
          'send_to': ['AW-18177147225/CPkqCJDNpe4cENmCxdtD', 'G-DN126T6ZDC']
        });
      }

      // d) Abrir WhatsApp (wa.me abre la app en móvil y WhatsApp Web/escritorio en desktop).
      window.open(enlaceWa, '_blank', 'noopener');

      // e) Estado final con el mismo enlace como alternativa clicable.
      formulario.remove();
      var estadoFinal = crearElemento('div', 'wa-msg wa-msg-bot wa-final');
      estadoFinal.appendChild(document.createTextNode('Listo, te hemos abierto WhatsApp. Si no se abrió, '));
      var alternativa = crearElemento('a', '', 'haz clic aquí');
      alternativa.href = enlaceWa;
      alternativa.target = '_blank';
      alternativa.rel = 'noopener';
      estadoFinal.appendChild(alternativa);
      cuerpo.appendChild(estadoFinal);
      cuerpo.scrollTop = cuerpo.scrollHeight;
    }

    function mostrarFormulario() {
      var formulario = crearElemento('form', 'wa-form');
      formulario.noValidate = true;

      var etiquetaNombre = crearElemento('label', 'wa-campo', 'Nombre');
      var campoNombre = document.createElement('input');
      campoNombre.type = 'text';
      campoNombre.autocomplete = 'name';
      campoNombre.maxLength = 120;
      etiquetaNombre.appendChild(campoNombre);

      var etiquetaEmail = crearElemento('label', 'wa-campo', 'Correo electrónico');
      var campoEmail = document.createElement('input');
      campoEmail.type = 'email';
      campoEmail.autocomplete = 'email';
      campoEmail.maxLength = 200;
      etiquetaEmail.appendChild(campoEmail);
      var errorEmail = crearElemento('span', 'wa-error', 'Escribe un correo válido.');
      etiquetaEmail.appendChild(errorEmail);

      var etiquetaConsent = crearElemento('label', 'wa-consent');
      var casilla = document.createElement('input');
      casilla.type = 'checkbox';
      etiquetaConsent.appendChild(casilla);
      etiquetaConsent.appendChild(crearElemento('span', '', TEXTO_CONSENTIMIENTO));

      var botonConectar = crearElemento('button', 'wa-btn', 'Conectar por WhatsApp');
      botonConectar.type = 'submit';
      botonConectar.disabled = true;

      formulario.appendChild(etiquetaNombre);
      formulario.appendChild(etiquetaEmail);
      formulario.appendChild(etiquetaConsent);
      formulario.appendChild(botonConectar);

      function completo() {
        return campoNombre.value.trim() !== '' && EMAIL_RE.test(campoEmail.value.trim()) && casilla.checked;
      }
      function actualizar() {
        botonConectar.disabled = !completo();
      }
      campoNombre.addEventListener('input', actualizar);
      campoEmail.addEventListener('input', function () {
        actualizar();
        errorEmail.classList.remove('wa-visible');
      });
      campoEmail.addEventListener('blur', function () {
        var v = campoEmail.value.trim();
        if (v !== '' && !EMAIL_RE.test(v)) errorEmail.classList.add('wa-visible');
      });
      casilla.addEventListener('change', actualizar);

      formulario.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!completo() || botonConectar.disabled) return;
        botonConectar.disabled = true;
        conectarPorWhatsApp(campoNombre.value.trim(), campoEmail.value.trim(), formulario);
      });

      cuerpo.appendChild(formulario);
      cuerpo.scrollTop = cuerpo.scrollHeight;
      campoNombre.focus();
    }

    // Pasos 2 y 3: el mensaje libre del cliente se guarda y el bot pide los datos.
    function enviarMensaje() {
      var texto = campoMensaje.value.trim();
      if (texto === '' || yaEnvio || !bienvenidaLista) return;
      yaEnvio = true;
      mensajeCliente = texto;
      agregarMensaje('wa-msg-user', texto);
      campoMensaje.value = '';
      filaInput.style.display = 'none';
      setTimeout(function () {
        agregarMensaje('wa-msg-bot', TEXTO_PASO_DATOS);
        mostrarFormulario();
      }, 500);
    }

    boton.addEventListener('click', function (e) {
      e.preventDefault();
      if (panel.classList.contains('wa-abierto')) cerrarPanel(); else abrir();
    });
    cerrar.addEventListener('click', cerrarPanel);
    enviar.addEventListener('click', enviarMensaje);
    campoMensaje.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviarMensaje();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('wa-abierto')) cerrarPanel();
    });
  }

  function iniciar() {
    inyectarEstilos();
    var creado = crearBoton();
    crearPanel(creado.claseApilado, creado.boton);
  }

  iniciar();
})();
