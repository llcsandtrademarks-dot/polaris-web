#!/usr/bin/env node
/**
 * build-layout.js — inyecta el header y footer únicos del sitio en cada página HTML.
 *
 * USO:
 *   node build-layout.js
 *
 * Ejecutar antes de cada commit que toque header.html, footer.html, o el
 * menú/pie de cualquier página — así todas las páginas quedan sincronizadas
 * con las mismas dos fuentes.
 *
 * QUÉ HACE:
 *   1. Lee header.html y footer.html (en la raíz del repo). Son plantillas con
 *      dos placeholders de ruta relativa:
 *        {{ROOT}}     -> prefijo hacia la raíz del sitio ('' en páginas raíz,
 *                        '../' en páginas dentro de blog/, etc. según la
 *                        profundidad real de cada archivo).
 *        {{BLOGHOME}} -> ruta relativa hacia blog/index.html desde cada página.
 *   2. Recorre todas las páginas .html del sitio.
 *   3. En cada una, sustituye el bloque marcado con
 *        <!-- HEADER:START --> ... <!-- HEADER:END -->
 *      y el marcado con
 *        <!-- FOOTER:START --> ... <!-- FOOTER:END -->
 *      Si una página todavía no tiene esos marcadores (primera vez que se
 *      ejecuta el script sobre ella), localiza el <nav>...</nav> +
 *      .mobile-menu existentes para el header, y el <footer>...</footer>
 *      existente para el footer, y los envuelve con los marcadores.
 *   3b. Igual con la zona <!-- FONTS:START --> ... <!-- FONTS:END --> del <head>
 *      (preconnect + <link> único de Google Fonts). El bloque vive en la
 *      constante FONTS_BLOCK de este script: para añadir/quitar una familia
 *      tipográfica, se edita ahí y se ejecuta el script. La primera vez en
 *      cada página elimina los <link> sueltos de fonts.googleapis.com /
 *      fonts.gstatic.com y pone el bloque en su lugar.
 *   3c. Igual con la barra Trustpilot superior, zona
 *      <!-- TRUSTPILOT-BAR:START --> ... <!-- TRUSTPILOT-BAR:END -->. Su HTML vive
 *      en la constante TP_BAR_BLOCK de este script (ahí se cambia la URL de
 *      estrellas si la puntuación cambia). OJO: solo actúa en las páginas que YA
 *      llevan la barra (o sus marcadores). Las páginas transaccionales/legales
 *      (admin, factura*, pagos, privacidad, términos, etc.) no la llevan a
 *      propósito y el script no se la añade. Para dársela a una página nueva,
 *      basta con poner los marcadores vacíos justo después de <body ...>.
 *   4. Se asegura además de que la página cargue <script src="/nav-dropdown.js">.
 *      Varias páginas (admin.html, factura*.html, los artículos de blog) tenían
 *      el HTML del menú desplegable pero NO el script, así que los desplegables
 *      y la animación del menú móvil no hacían nada. Si falta, se añade justo
 *      antes de </body>.
 *   5. Artículos de blog (blog/*.html salvo blog/index.html): inyecta la
 *      columna lateral "Artículos recientes" en la zona
 *        <!-- RELATED:START --> ... <!-- RELATED:END -->
 *      colocada justo después del <div class="legal-content"> del artículo. La
 *      lista sale de las tarjetas de blog/index.html (única fuente de verdad:
 *      título, fecha y enlace), ordenada de más reciente a más antigua, sin el
 *      propio artículo y con un máximo de RELATED_MAX tarjetas. NO se edita a
 *      mano por página. Para publicar un artículo nuevo: crear la página, añadir
 *      su tarjeta a blog/index.html y ejecutar este script — todos los artículos
 *      se actualizan solos. Estilos: bloque "ARTÍCULOS RECIENTES" de shared.css.
 *
 * PÁGINAS EXCLUIDAS A PROPÓSITO (no se tocan):
 *   Las 4 son solo un redirect instantáneo (meta-refresh + JS) a un dominio
 *   externo distinto — no tienen contenido ni header/footer real que inyectar.
 *
 * Para añadir una página nueva al sitio: simplemente créala con un <nav> y un
 * <footer> cualquiera (o copia uno de otra página) y ejecuta este script —
 * quedará alineada automáticamente.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;

const EXCLUDED = new Set([
  path.join(ROOT_DIR, 'header.html'),
  path.join(ROOT_DIR, 'footer.html'),
]);

const SKIP_DIRS = new Set(['.git', 'node_modules']);

function listHtmlFiles(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      listHtmlFiles(path.join(dir, entry.name), out);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function toUrlPath(p) {
  return p.split(path.sep).join('/');
}

// Encuentra el índice justo después del cierre de la etiqueta que abre en
// openIdx (el '<' de p.ej. "<nav>" o "<div class=...>"), contando aperturas y
// cierres de esa misma etiqueta para no cortar en medio de un div anidado.
function findTagEnd(html, openIdx, tagName) {
  const re = new RegExp('<(/?)' + tagName + '(\\s[^>]*)?>', 'gi');
  re.lastIndex = openIdx;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    if (m[1] === '/') {
      depth--;
      if (depth === 0) return m.index + m[0].length;
    } else {
      depth++;
    }
  }
  return -1;
}

function upsertBlock(html, { startMarker, endMarker, openTagRegex, tagName, newInner, file }) {
  const markerBlockRe = new RegExp(
    startMarker.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') +
      '[\\s\\S]*?' +
      endMarker.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'),
  );
  const newBlock = `${startMarker}\n${newInner}\n${endMarker}`;

  if (markerBlockRe.test(html)) {
    return html.replace(markerBlockRe, newBlock);
  }

  const openMatch = openTagRegex.exec(html);
  if (!openMatch) {
    throw new Error(`No se encontró <${tagName}> ni marcadores ${startMarker} en ${file}`);
  }
  const startIdx = openMatch.index;
  const endIdx = findTagEnd(html, startIdx, tagName);
  if (endIdx === -1) {
    throw new Error(`No se pudo cerrar <${tagName}> correctamente en ${file}`);
  }
  return html.slice(0, startIdx) + newBlock + html.slice(endIdx);
}

function buildHeaderInner(html, template, ROOT, BLOGHOME, file) {
  const rendered = template.split('{{ROOT}}').join(ROOT).split('{{BLOGHOME}}').join(BLOGHOME).trim();

  // El header cubre <nav>...</nav> seguido de <div class="mobile-menu">...</div>.
  // Si ya existen los marcadores HEADER:START/END los usamos directamente.
  const markerRe = /<!-- HEADER:START -->[\s\S]*?<!-- HEADER:END -->/;
  if (markerRe.test(html)) {
    return html.replace(markerRe, `<!-- HEADER:START -->\n${rendered}\n<!-- HEADER:END -->`);
  }

  const navRe = /<nav(\s[^>]*)?>/i;
  const navMatch = navRe.exec(html);
  if (!navMatch) {
    throw new Error(`No se encontró <nav> ni marcadores HEADER:START en ${file}`);
  }
  const navStart = navMatch.index;
  const navEnd = findTagEnd(html, navStart, 'nav');
  if (navEnd === -1) throw new Error(`No se pudo cerrar <nav> en ${file}`);

  // Justo después del </nav> debe venir el <div class="mobile-menu">...
  const mobileMenuRe = /<div\s+class="mobile-menu"[^>]*>/i;
  mobileMenuRe.lastIndex = navEnd;
  const mmSearch = html.slice(navEnd, navEnd + 400);
  const mmMatch = mobileMenuRe.exec(mmSearch);
  if (!mmMatch) {
    throw new Error(`No se encontró el .mobile-menu justo después de </nav> en ${file}`);
  }
  const mmStart = navEnd + mmMatch.index;
  const mmEnd = findTagEnd(html, mmStart, 'div');
  if (mmEnd === -1) throw new Error(`No se pudo cerrar .mobile-menu en ${file}`);

  const newBlock = `<!-- HEADER:START -->\n${rendered}\n<!-- HEADER:END -->`;
  return html.slice(0, navStart) + newBlock + html.slice(mmEnd);
}

function buildFooterInner(html, template, ROOT, BLOGHOME, file) {
  const rendered = template.split('{{ROOT}}').join(ROOT).split('{{BLOGHOME}}').join(BLOGHOME).trim();

  const markerRe = /<!-- FOOTER:START -->[\s\S]*?<!-- FOOTER:END -->/;
  if (markerRe.test(html)) {
    return html.replace(markerRe, `<!-- FOOTER:START -->\n${rendered}\n<!-- FOOTER:END -->`);
  }

  const footerRe = /<footer(\s[^>]*)?>/i;
  const footerMatch = footerRe.exec(html);
  if (!footerMatch) {
    throw new Error(`No se encontró <footer> ni marcadores FOOTER:START en ${file}`);
  }
  const footerStart = footerMatch.index;
  const footerEnd = findTagEnd(html, footerStart, 'footer');
  if (footerEnd === -1) throw new Error(`No se pudo cerrar <footer> en ${file}`);

  const newBlock = `<!-- FOOTER:START -->\n${rendered}\n<!-- FOOTER:END -->`;
  return html.slice(0, footerStart) + newBlock + html.slice(footerEnd);
}

// Bloque único de tipografías (Google Fonts) que se inyecta en el <head> de todas
// las páginas. Plus Jakarta Sans = titulares por defecto (var(--font-heading) en
// shared.css), Playfair Display = solo el logo del nav (fijo en .nav-logo),
// DM Sans = cuerpo.
const FONTS_BLOCK = [
  '<link crossorigin href="https://fonts.gstatic.com" rel="preconnect"/>',
  '<link href="https://fonts.googleapis.com" rel="preconnect"/>',
  '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&amp;family=Plus+Jakarta+Sans:wght@400;600;700;800&amp;family=DM+Sans:wght@400;500;600;700&amp;display=swap" rel="stylesheet"/>',
].join('\n');

function buildFonts(html, file) {
  const newBlock = `<!-- FONTS:START -->\n${FONTS_BLOCK}\n<!-- FONTS:END -->`;

  const markerRe = /<!-- FONTS:START -->[\s\S]*?<!-- FONTS:END -->/;
  if (markerRe.test(html)) {
    return html.replace(markerRe, () => newBlock);
  }

  // Primera ejecución: localizar los <link> hardcodeados de Google Fonts
  // (preconnect a gstatic/googleapis + la hoja css2), poner el bloque donde
  // estaba el primero y quitar los demás.
  const linkRe = /<link\b[^>]*fonts\.(?:googleapis|gstatic)\.com[^>]*>[ \t]*\r?\n?/gi;
  const matches = [...html.matchAll(linkRe)];
  if (matches.length === 0) {
    throw new Error(`No se encontraron <link> de Google Fonts ni marcadores FONTS:START en ${file}`);
  }
  let out = '';
  let cursor = 0;
  matches.forEach((m, i) => {
    out += html.slice(cursor, m.index);
    if (i === 0) out += newBlock + '\n';
    cursor = m.index + m[0].length;
  });
  out += html.slice(cursor);
  return out;
}

// Barra Trustpilot superior. La URL de estrellas es estática (no se actualiza
// sola): si cambia la puntuación, se edita aquí y se ejecuta el script.
const TP_BAR_BLOCK = [
  '<div class="tp-badge-bar">',
  '<a href="https://es.trustpilot.com/review/proyecto-polaris.com" rel="noopener" target="_blank">',
  '<img alt="Trustpilot" height="24" src="https://images-static.trustpilot.com/api/stars/5/128x24.png" width="128"/>',
  '<span>Lee lo que dicen de nosotros en <span class="tp-brand">Trustpilot</span></span>',
  '</a>',
  '</div>',
].join('\n');

function buildTpBar(html) {
  const newBlock = `<!-- TRUSTPILOT-BAR:START -->\n${TP_BAR_BLOCK}\n<!-- TRUSTPILOT-BAR:END -->`;

  const markerRe = /<!-- TRUSTPILOT-BAR:START -->[\s\S]*?<!-- TRUSTPILOT-BAR:END -->/;
  if (markerRe.test(html)) return html.replace(markerRe, () => newBlock);

  // Primera ejecución: envolver la barra hardcodeada existente. Si la página
  // no tiene barra, se deja tal cual (no se le añade).
  const barRe = /<div class="tp-badge-bar">[\s\S]*?<\/div>/;
  if (!barRe.test(html)) return html;
  return html.replace(barRe, () => newBlock);
}

// El header (dropdowns, acordeón móvil, resaltado del enlace activo, intro del
// menú) depende de nav-dropdown.js. Si la página no lo carga, lo añade justo
// antes de </body>, junto a whatsapp-widget.js si ya está.
function ensureNavScript(html, file) {
  if (/src=["']\/?nav-dropdown\.js["']/i.test(html)) return html;
  const bodyCloseIdx = html.lastIndexOf('</body>');
  if (bodyCloseIdx === -1) {
    throw new Error(`No se encontró </body> para añadir nav-dropdown.js en ${file}`);
  }
  const tag = '<script src="/nav-dropdown.js" defer></script>\n';
  return html.slice(0, bodyCloseIdx) + tag + html.slice(bodyCloseIdx);
}

// ---- Artículos recientes (sidebar de los artículos del blog) ----------------

// Máximo de tarjetas en la columna lateral (todas las demás si hay menos).
const RELATED_MAX = 5;
const BLOG_DIR = path.join(ROOT_DIR, 'blog');
const BLOG_INDEX = path.join(BLOG_DIR, 'index.html');
const MONTHS_ES = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };

// Lee las tarjetas de blog/index.html: { href, title, date (texto), ts }.
// Ordena de más reciente a más antigua; si dos comparten fecha (o no se puede
// leer), se respeta el orden en que aparecen en el índice.
function loadBlogPosts() {
  const html = fs.readFileSync(BLOG_INDEX, 'utf8');
  const cardRe = /<a class="srv-card" href="([^"]+)">([\s\S]*?)<\/a>/g;
  const posts = [];
  let m;
  while ((m = cardRe.exec(html))) {
    const title = /<p class="srv-card-title">([\s\S]*?)<\/p>/.exec(m[2]);
    const meta = /<p class="srv-card-meta">([\s\S]*?)<\/p>/.exec(m[2]);
    if (!title || !meta) {
      throw new Error(`Tarjeta sin título o fecha en blog/index.html (${m[1]})`);
    }
    const date = meta[1].split('·')[0].trim();
    const dm = /^(\d{1,2})\s+([a-záéíóú]{3})\w*\.?\s+(\d{4})$/i.exec(date);
    const mon = dm ? MONTHS_ES[dm[2].toLowerCase()] : undefined;
    if (!dm || mon === undefined) {
      throw new Error(`Fecha ilegible "${date}" en la tarjeta ${m[1]} de blog/index.html`);
    }
    posts.push({ href: m[1], title: title[1].trim(), date, ts: Date.UTC(+dm[3], mon, +dm[1]), order: posts.length });
  }
  posts.sort((a, b) => b.ts - a.ts || a.order - b.order);
  return posts;
}

function isBlogArticle(file) {
  return path.dirname(file) === BLOG_DIR && path.basename(file).toLowerCase() !== 'index.html';
}

function buildRelated(html, file, posts) {
  const self = path.basename(file);
  const others = posts.filter((p) => p.href !== self).slice(0, RELATED_MAX);
  const cards = others.map((p) =>
    [
      `<a class="related-card" href="${p.href}">`,
      `<span class="related-card-date">${p.date}</span>`,
      `<span class="related-card-title">${p.title}</span>`,
      '</a>',
    ].join('\n'),
  );
  const inner = cards.length
    ? ['<aside class="related-posts" aria-label="Artículos recientes">', '<p class="related-title">Artículos recientes</p>', ...cards, '</aside>'].join('\n')
    : '';
  const newBlock = `<!-- RELATED:START -->\n${inner}\n<!-- RELATED:END -->`;

  const markerRe = /<!-- RELATED:START -->[\s\S]*?<!-- RELATED:END -->/;
  if (markerRe.test(html)) return html.replace(markerRe, () => newBlock);

  // Primera ejecución: colocar el bloque justo después del cierre del
  // <div class="legal-content"> (dentro de la misma <section>).
  const openMatch = /<div class="legal-content">/.exec(html);
  if (!openMatch) {
    throw new Error(`No se encontró <div class="legal-content"> ni marcadores RELATED:START en ${file}`);
  }
  const endIdx = findTagEnd(html, openMatch.index, 'div');
  if (endIdx === -1) throw new Error(`No se pudo cerrar .legal-content en ${file}`);
  return html.slice(0, endIdx) + '\n' + newBlock + html.slice(endIdx);
}

function main() {
  const headerTemplate = fs.readFileSync(path.join(ROOT_DIR, 'header.html'), 'utf8');
  const footerTemplate = fs.readFileSync(path.join(ROOT_DIR, 'footer.html'), 'utf8');
  const blogPosts = loadBlogPosts();

  const allHtml = listHtmlFiles(ROOT_DIR, []);
  const targets = allHtml.filter((f) => !EXCLUDED.has(f));

  let changed = 0;
  for (const file of targets) {
    const fileDir = path.dirname(file);
    const rootRel = toUrlPath(path.relative(fileDir, ROOT_DIR));
    const ROOT = rootRel === '' ? '' : rootRel + '/';
    const blogHomeAbs = path.join(ROOT_DIR, 'blog', 'index.html');
    const BLOGHOME = toUrlPath(path.relative(fileDir, blogHomeAbs));

    const before = fs.readFileSync(file, 'utf8');
    let after = before;
    after = (function () {
      try {
        let html = buildFonts(after, file);
        html = buildTpBar(html);
        html = buildHeaderInner(html, headerTemplate, ROOT, BLOGHOME, file);
        html = buildFooterInner(html, footerTemplate, ROOT, BLOGHOME, file);
        html = ensureNavScript(html, file);
        if (isBlogArticle(file)) html = buildRelated(html, file, blogPosts);
        return html;
      } catch (err) {
        console.error(`✗ ${toUrlPath(path.relative(ROOT_DIR, file))}: ${err.message}`);
        process.exitCode = 1;
        return after;
      }
    })();

    if (after !== before) {
      fs.writeFileSync(file, after, 'utf8');
      changed++;
      console.log(`✓ ${toUrlPath(path.relative(ROOT_DIR, file))}`);
    }
  }

  console.log(`\n${changed}/${targets.length} páginas actualizadas.`);
}

main();
