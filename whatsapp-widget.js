/**
 * Botón flotante de WhatsApp — Proyecto Polaris
 *
 * Widget único e idéntico en todas las páginas. Al hacer clic abre un panel de
 * chat simulado (guion fijo, sin IA): el visitante elige qué le trae por aquí
 * (botones; «Otro» pide un texto validado), deja nombre y correo, puede añadir
 * algo más y elige entre WhatsApp (se guarda el lead en /whatsapp-lead y se abre
 * wa.me) o email (/contacto).
 */
(function () {
  'use strict';

  var WHATSAPP_NUMBER = '14782260715';
  var API_LEAD_URL = 'https://polaris-api.llcsandtrademarks.workers.dev/whatsapp-lead';
  var API_CONTACTO_URL = 'https://polaris-api.llcsandtrademarks.workers.dev/contacto';

  var TEXTO_BIENVENIDA = 'Hola, bienvenido a Proyecto Polaris. Cuéntame en qué puedo ayudarte.';
  var TEXTO_PREGUNTA = '¿Qué te trae por aquí?';
  var OPCIONES = [
    { id: 'ya', etiqueta: 'Ya tengo una LLC' },
    { id: 'crear', etiqueta: 'Quiero crear una LLC' },
    { id: 'otro', etiqueta: 'Otro' }
  ];
  var TEXTO_PASO_OTRO = 'Cuéntanos con detalle qué necesitas o por qué nos contactas.';
  var TEXTO_PASO_DATOS = 'Perfecto. Para que el especialista tenga tus datos, dime tu nombre y tu correo electrónico.';
  var TEXTO_PASO_EXTRA = 'Ok, te conecto con un especialista. ¿Quieres añadir algo antes de que te conecte?';
  var ETQ_WA_VACIO = 'No, conéctame ya';
  var ETQ_WA_TEXTO = 'Enviar y conectar con un experto por WhatsApp';
  var ETQ_EMAIL_VACIO = 'No, conéctame por email';
  var ETQ_EMAIL_TEXTO = 'Enviar y conectar por email';
  // Valores del select tipo_consulta de contacto.html.
  var TIPO_CONSULTA = { ya: 'ayuda-llc', crear: 'abrir-llc', otro: 'contacto' };
  // Máximo del campo mensaje de contacto.html (maxlength).
  var MENSAJE_MAX = 1024;
  // Mismo texto que el checkbox de contacto.html (obligatorio en ambos formularios).
  var TEXTO_CONSENTIMIENTO = 'Acepto recibir comunicaciones a esta dirección. Puedes cancelar con un click en cualquier momento';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Tiempo que se muestra el indicador de "escribiendo…" antes del mensaje de bienvenida.
  var RETRASO_BIENVENIDA_MS = 2000;

  var mensajeCliente = '';

  // Estilos del panel de chat. Van inyectados desde aquí (y no en shared.css)
  // para que el panel nunca se vea sin estilo si shared.css sigue en caché.
  function inyectarEstilos() {
    var css =
      '.wa-chat-panel{position:fixed;right:20px;bottom:76px;width:340px;max-width:calc(100vw - 32px);max-height:min(560px,calc(100vh - 110px));display:none;flex-direction:column;background:#f0f2f5;border-radius:14px;box-shadow:0 10px 32px rgba(0,0,0,.35);overflow:hidden;z-index:10000;font-family:"DM Sans",Arial,sans-serif;font-size:14px;line-height:1.4;color:#111}' +
      '.wa-chat-panel.wa-abierto{display:flex}' +
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
      '.wa-btn-secundario{background:none;border:1px solid #ccd0d5;color:#54656f;border-radius:10px;padding:6px 14px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}' +
      '.wa-btn-secundario:disabled{opacity:.5;cursor:not-allowed}' +
      '.wa-btn-secundario:not(:disabled):hover{border-color:#25D366;color:#128C7E}' +
      '.wa-form{align-self:stretch;background:#fff;border:1px solid #e2e5e9;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px}' +
      '.wa-form label.wa-campo{display:flex;flex-direction:column;gap:3px;font-size:12px;font-weight:700;color:#333}' +
      '.wa-form input[type=text],.wa-form input[type=email]{border:1px solid #ccd0d5;border-radius:8px;padding:8px 10px;font:inherit;font-size:14px;font-weight:400}' +
      '.wa-form .wa-error{color:#d32f2f;font-size:11px;font-weight:400;display:none}' +
      '.wa-form .wa-error.wa-visible{display:block}' +
      '.wa-consent{display:flex;flex-direction:row;align-items:flex-start;gap:8px;font-size:12px;font-weight:400;line-height:18px;color:#000;cursor:pointer}' +
      '.wa-consent input{margin:2px 0 0;flex-shrink:0;width:16px;height:16px;accent-color:#25D366}' +
      '.wa-final a{color:#128C7E;font-weight:700}' +
      '.wa-opciones{align-self:stretch;display:flex;flex-direction:column;gap:8px}' +
      '.wa-chip{width:100%;min-height:44px;background:#fff;border:1.5px solid #25D366;color:#128C7E;border-radius:10px;padding:10px 14px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;text-align:center}' +
      '.wa-chip:not(:disabled):hover{background:#e8fbef}' +
      '.wa-chip:disabled{opacity:.5;cursor:not-allowed}' +
      '.wa-extra{align-self:stretch;background:#fff;border:1px solid #e2e5e9;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px}' +
      '.wa-extra textarea{resize:none;border:1px solid #ccd0d5;border-radius:8px;padding:8px 10px;font:inherit;font-size:14px;outline:none}' +
      '.wa-extra textarea:focus{border-color:#25D366;box-shadow:0 0 0 2px rgba(37,211,102,.25)}' +
      '.wa-extra .wa-btn,.wa-extra .wa-btn-secundario,.wa-form .wa-btn{min-height:44px}' +
      '.wa-extra .wa-btn-secundario{padding:8px 14px;font-size:13px}' +
      '.wa-error-otro{display:none;background:#fff;color:#d32f2f;font-size:11px;padding:0 12px 8px}' +
      '.wa-error-otro.wa-visible{display:block}' +
      '@media (max-width:600px){.wa-chat-panel{right:16px;bottom:64px}}';
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
    var enlace = document.createElement('a');
    enlace.className = 'wa-float-btn';
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
    return enlace;
  }

  function crearPanel(boton) {
    var panel = crearElemento('div', 'wa-chat-panel');
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

    // La barra de texto solo se muestra si el visitante elige «Otro».
    var filaInput = crearElemento('div', 'wa-chat-input');
    filaInput.style.display = 'none';
    var campoMensaje = document.createElement('textarea');
    campoMensaje.rows = 1;
    campoMensaje.maxLength = 1000;
    campoMensaje.placeholder = 'Escribe tu mensaje…';
    campoMensaje.setAttribute('aria-label', 'Tu mensaje');
    var enviar = crearElemento('button', 'wa-btn', 'Enviar');
    enviar.type = 'button';
    enviar.disabled = true;
    filaInput.appendChild(campoMensaje);
    filaInput.appendChild(enviar);
    var errorOtro = crearElemento('div', 'wa-error-otro');
    errorOtro.setAttribute('role', 'alert');

    panel.appendChild(cabecera);
    panel.appendChild(cuerpo);
    panel.appendChild(filaInput);
    panel.appendChild(errorOtro);
    document.body.appendChild(panel);

    var iniciado = false;
    var opcionElegida = false;   // evita elegir dos veces en el paso A
    var textoOtro = '';
    var tipoOpcion = '';         // 'ya' | 'crear' | 'otro'
    var datosNombre = '';
    var datosEmail = '';
    var envioBloqueado = false;  // evita doble envío en el paso D
    var ultimoExtraMostrado = null;

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
          mostrarPregunta();
        }, RETRASO_BIENVENIDA_MS);
      }
    }

    function cerrarPanel() {
      panel.classList.remove('wa-abierto');
      boton.setAttribute('aria-expanded', 'false');
    }

    function mostrarEstadoFinal(nodoOFrase) {
      var estadoFinal = crearElemento('div', 'wa-msg wa-msg-bot wa-final');
      if (typeof nodoOFrase === 'string') estadoFinal.textContent = nodoOFrase;
      else estadoFinal.appendChild(nodoOFrase);
      cuerpo.appendChild(estadoFinal);
      cuerpo.scrollTop = cuerpo.scrollHeight;
      return estadoFinal;
    }

    // ---- Paso A: pregunta inicial con tres botones ----
    function mostrarPregunta() {
      agregarMensaje('wa-msg-bot', TEXTO_PREGUNTA);
      var contenedor = crearElemento('div', 'wa-opciones');
      var chips = [];
      OPCIONES.forEach(function (op) {
        var chip = crearElemento('button', 'wa-chip', op.etiqueta);
        chip.type = 'button';
        chip.addEventListener('click', function () {
          if (opcionElegida) return;
          opcionElegida = true;
          chips.forEach(function (c) { c.disabled = true; });
          tipoOpcion = op.id;
          agregarMensaje('wa-msg-user', op.etiqueta);
          if (op.id === 'otro') pedirDetalleOtro(); else pasarADatos();
        });
        chips.push(chip);
        contenedor.appendChild(chip);
      });
      cuerpo.appendChild(contenedor);
      cuerpo.scrollTop = cuerpo.scrollHeight;
    }

    function pedirDetalleOtro() {
      setTimeout(function () {
        agregarMensaje('wa-msg-bot', TEXTO_PASO_OTRO);
        filaInput.style.display = '';
        campoMensaje.focus();
      }, 500);
    }

    function actualizarEnvioOtro() {
      var r = validarMensajeOtro(campoMensaje.value);
      enviar.disabled = !r.ok;
      if (!r.ok && campoMensaje.value.trim() !== '') {
        errorOtro.textContent = r.motivo;
        errorOtro.classList.add('wa-visible');
      } else {
        errorOtro.textContent = '';
        errorOtro.classList.remove('wa-visible');
      }
      return r;
    }

    function enviarOtro() {
      if (tipoOpcion !== 'otro' || textoOtro !== '') return;
      var r = actualizarEnvioOtro();
      if (!r.ok) return;
      textoOtro = campoMensaje.value.trim();
      agregarMensaje('wa-msg-user', textoOtro);
      campoMensaje.value = '';
      enviar.disabled = true;
      filaInput.style.display = 'none';
      errorOtro.classList.remove('wa-visible');
      pasarADatos();
    }

    // ---- Paso B: nombre + correo + consentimiento (no se envía nada aún) ----
    function pasarADatos() {
      setTimeout(function () {
        agregarMensaje('wa-msg-bot', TEXTO_PASO_DATOS);
        mostrarFormulario();
      }, 500);
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

      var botonContinuar = crearElemento('button', 'wa-btn', 'Continuar');
      botonContinuar.type = 'submit';
      botonContinuar.disabled = true;

      formulario.appendChild(etiquetaNombre);
      formulario.appendChild(etiquetaEmail);
      formulario.appendChild(etiquetaConsent);
      formulario.appendChild(botonContinuar);

      function completo() {
        return campoNombre.value.trim() !== '' && EMAIL_RE.test(campoEmail.value.trim()) && casilla.checked;
      }
      function actualizar() {
        botonContinuar.disabled = !completo();
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
        if (!completo() || botonContinuar.disabled) return;
        botonContinuar.disabled = true;
        datosNombre = campoNombre.value.trim();
        datosEmail = campoEmail.value.trim();
        formulario.remove();
        agregarMensaje('wa-msg-user', datosNombre);
        setTimeout(mostrarPasoExtra, 500);
      });

      cuerpo.appendChild(formulario);
      cuerpo.scrollTop = cuerpo.scrollHeight;
      campoNombre.focus();
    }

    // ---- Paso C: ¿algo más que añadir? (opcional, sin validación) ----
    function mostrarPasoExtra() {
      agregarMensaje('wa-msg-bot', TEXTO_PASO_EXTRA);
      var bloque = crearElemento('div', 'wa-extra');
      var campoExtra = document.createElement('textarea');
      campoExtra.rows = 3;
      campoExtra.maxLength = 1000;
      campoExtra.placeholder = 'Escribe aquí si quieres añadir algo…';
      campoExtra.setAttribute('aria-label', 'Algo más que añadir (opcional)');
      var botonWa = crearElemento('button', 'wa-btn', ETQ_WA_VACIO);
      botonWa.type = 'button';
      var botonEmail = crearElemento('button', 'wa-btn-secundario', ETQ_EMAIL_VACIO);
      botonEmail.type = 'button';
      bloque.appendChild(campoExtra);
      bloque.appendChild(botonWa);
      bloque.appendChild(botonEmail);

      function hayTexto() { return campoExtra.value.trim() !== ''; }
      function etiquetar() {
        botonWa.textContent = hayTexto() ? ETQ_WA_TEXTO : ETQ_WA_VACIO;
        botonEmail.textContent = hayTexto() ? ETQ_EMAIL_TEXTO : ETQ_EMAIL_VACIO;
      }
      function bloquear(estado) {
        botonWa.disabled = estado;
        botonEmail.disabled = estado;
        campoExtra.disabled = estado;
      }
      campoExtra.addEventListener('input', etiquetar);

      // Desactiva todo al instante (evita doble envío) y compone el mensaje.
      function preparar() {
        if (envioBloqueado) return false;
        envioBloqueado = true;
        bloquear(true);
        var extra = campoExtra.value.trim();
        if (extra !== '' && extra !== ultimoExtraMostrado) {
          agregarMensaje('wa-msg-user', extra);
          ultimoExtraMostrado = extra;
        }
        mensajeCliente = componerMensaje(extra);
        return true;
      }

      botonWa.addEventListener('click', function () {
        if (!preparar()) return;
        conectarPorWhatsApp(datosNombre, datosEmail, bloque);
      });
      botonEmail.addEventListener('click', function () {
        if (!preparar()) return;
        contactarPorEmail(datosNombre, datosEmail, bloque, botonEmail, function () {
          envioBloqueado = false;
          bloquear(false);
          etiquetar();
        });
      });

      cuerpo.appendChild(bloque);
      cuerpo.scrollTop = cuerpo.scrollHeight;
      campoExtra.focus();
    }

    function componerMensaje(extra) {
      var linea = 'Consulta: ';
      if (tipoOpcion === 'ya') linea += 'Ya tiene una LLC';
      else if (tipoOpcion === 'crear') linea += 'Quiere crear una LLC';
      else linea += 'Otro' + (textoOtro ? ': ' + textoOtro : '');
      if (extra) linea += '\nDetalle adicional: ' + extra;
      return linea.slice(0, MENSAJE_MAX);
    }

    // ---- Paso D (camino WhatsApp): el lead se guarda (fire-and-forget), se dispara la
    // conversión de Google Ads y se abre WhatsApp con el mensaje prerellenado.
    function conectarPorWhatsApp(nombre, email, bloque) {
      var enlaceWa = construirEnlaceWhatsApp(nombre, email);

      // a) Fire-and-forget: si tarda o falla, no bloquea el paso siguiente.
      try {
        fetch(API_LEAD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: nombre, email: email, mensaje: mensajeCliente, pagina_origen: location.href, origen_captura: origenCaptura() }),
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
      bloque.remove();
      var frase = document.createTextNode('Listo, te hemos abierto WhatsApp. Si no se abrió, ');
      var alternativa = crearElemento('a', '', 'haz clic aquí');
      alternativa.href = enlaceWa;
      alternativa.target = '_blank';
      alternativa.rel = 'noopener';
      var contenedor = document.createDocumentFragment();
      contenedor.appendChild(frase);
      contenedor.appendChild(alternativa);
      mostrarEstadoFinal(contenedor);
    }

    // Paso D (camino email): envía la consulta a /contacto (mismo endpoint que contacto.html), sin
    // abrir WhatsApp ni disparar su conversión de Google Ads. Espera la respuesta real (no
    // fire-and-forget) porque el estado final depende de si el envío funcionó o no.
    function contactarPorEmail(nombre, email, bloque, botonEmail, reactivar) {
      botonEmail.textContent = 'Enviando…';
      fetch(API_CONTACTO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_consulta: TIPO_CONSULTA[tipoOpcion] || '',
          email: email,
          nombre: nombre,
          empresa: '',
          pais: '',
          mensaje: mensajeCliente,
          ref_source: '',
          origen_captura: origenCaptura()
        })
      })
        .then(function (res) {
          if (!res.ok) throw new Error('http ' + res.status);
          bloque.remove();
          mostrarEstadoFinal('Listo, hemos enviado tu consulta por email. Te responderemos lo antes posible.');
        })
        .catch(function () {
          reactivar();
          agregarMensaje('wa-msg-bot', 'No se pudo enviar tu consulta por email. Prueba de nuevo o usa el botón de WhatsApp.');
        });
    }

    boton.addEventListener('click', function (e) {
      e.preventDefault();
      if (panel.classList.contains('wa-abierto')) cerrarPanel(); else abrir();
    });
    cerrar.addEventListener('click', cerrarPanel);
    enviar.addEventListener('click', enviarOtro);
    campoMensaje.addEventListener('input', actualizarEnvioOtro);
    campoMensaje.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviarOtro();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('wa-abierto')) cerrarPanel();
    });
  }

  // Validación del texto libre de «Otro». Pura y sin dependencias.
  var PALABRAS_RELLENO = ('hola holaa ola buenas buenos dias dia tardes noches buen hey ey saludos que tal como estas estan info informacion ' +
    'quiero necesito por favor ayuda ayudarme consulta pregunta gracias ok vale test prueba un una el la me mi podeis podrian pueden puedes').split(' ');
  var MOTIVO_CORTO = 'Cuéntanos un poco más: qué necesitas y en qué podemos ayudarte.';

  function validarMensajeOtro(texto) {
    var t = String(texto == null ? '' : texto).trim();
    if (t.length < 25) return { ok: false, motivo: MOTIVO_CORTO };

    var norm = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    var palabras = norm.split(' ').filter(function (p) { return /\p{L}/u.test(p); });
    if (palabras.length < 5) return { ok: false, motivo: MOTIVO_CORTO };

    var distintas = {};
    palabras.forEach(function (p) { distintas[p] = true; });
    if (Object.keys(distintas).length < 3) return { ok: false, motivo: 'Escribe una frase con sentido para que podamos ayudarte.' };

    var noEspacios = t.replace(/\s/g, '');
    var letras = (noEspacios.match(/\p{L}/gu) || []).length;
    if (letras / noEspacios.length < 0.6) return { ok: false, motivo: 'Escribe tu consulta con palabras, por favor.' };

    var sospechoso = /(.)\1{3,}/u.test(norm) || /k{3,}/.test(norm) || /(?:xd){2,}/.test(norm) ||
      palabras.some(function (p) {
        return p.length > 25 || p === 'lol' || /^(?:ja|je|ji|ha|he){2,}$/.test(p);
      });
    if (sospechoso) return { ok: false, motivo: 'Parece que el mensaje no es una consulta real. Cuéntanos qué necesitas.' };

    var todoRelleno = palabras.every(function (p) { return PALABRAS_RELLENO.indexOf(p) !== -1; });
    if (todoRelleno) return { ok: false, motivo: 'Dinos qué necesitas en concreto (por ejemplo: crear una LLC, renovarla, registrar una marca…).' };

    return { ok: true, motivo: '' };
  }

  // ---- Origen del visitante (clic de campaña / referrer / página de entrada) ----
  // Solo sessionStorage (clave polaris_origen_v1); ni cookies ni localStorage ni terceros. No envía nada por sí
  // mismo: los envíos a /contacto y /whatsapp-lead añaden window.PolarisOrigen.get() como origen_captura.
  // Todo va en try/catch: sessionStorage puede lanzar o venir vacío y la página debe funcionar igual.
  var ORIGEN_CLAVE = 'polaris_origen_v1';
  var ORIGEN_PARAMS = ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var ORIGEN_VALOR_MAX = 150;

  function limpiarValorOrigen(v) {
    if (typeof v !== 'string') return '';
    return v.replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ').split(String.fromCharCode(8232)).join(' ').split(String.fromCharCode(8233)).join(' ').trim().slice(0, ORIGEN_VALOR_MAX).trim();
  }

  function leerOrigenGuardado() {
    try {
      var crudo = window.sessionStorage.getItem(ORIGEN_CLAVE);
      if (!crudo) return null;
      var o = JSON.parse(crudo);
      return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
    } catch (e) {
      return null;
    }
  }

  // Host del referrer solo si es de OTRO host distinto del propio (sin "www." en la comparación); sin ruta ni query.
  function hostReferrerExterno() {
    try {
      var ref = document.referrer;
      if (!ref) return '';
      var u = new URL(ref);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
      var sinWww = function (h) { return String(h).toLowerCase().replace(/^www\./, ''); };
      if (!u.hostname || sinWww(u.hostname) === sinWww(location.hostname)) return '';
      return limpiarValorOrigen(u.hostname);
    } catch (e) {
      return '';
    }
  }

  function capturarOrigen() {
    try {
      var params = new URLSearchParams(location.search);
      var registro = {};
      var hayCampana = false;
      for (var i = 0; i < ORIGEN_PARAMS.length; i++) {
        var valor = limpiarValorOrigen(params.get(ORIGEN_PARAMS[i]) || '');
        if (valor) { registro[ORIGEN_PARAMS[i]] = valor; hayCampana = true; }
      }
      if (!hayCampana && leerOrigenGuardado()) return;
      var host = hostReferrerExterno();
      if (host) registro.referrer = host;
      var landing = limpiarValorOrigen(location.pathname);
      if (landing) registro.landing = landing;
      window.sessionStorage.setItem(ORIGEN_CLAVE, JSON.stringify(registro));
    } catch (e) {}
  }

  window.PolarisOrigen = {
    get: function () {
      return leerOrigenGuardado();
    }
  };

  function origenCaptura() {
    try {
      return window.PolarisOrigen.get() || undefined;
    } catch (e) {
      return undefined;
    }
  }

  function iniciar() {
    capturarOrigen();
    inyectarEstilos();
    crearPanel(crearBoton());
  }

  // Solo para pruebas locales; en producción no existe.
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    window.__PolarisWidgetTest = { validarMensajeOtro: validarMensajeOtro };
  }

  iniciar();
})();
