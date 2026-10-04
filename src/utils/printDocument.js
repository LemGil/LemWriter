// Utilidad de impresión para LemWriter Desktop.
// Inserta el contenido en un contenedor temporal dentro de la misma ventana,
// oculta el resto de la app solo durante la impresión (reglas @media print
// en index.css) y limpia al terminar.
//
// buildPrintDocument() genera el mismo contenido como documento HTML autónomo
// para la vista previa (iframe): lo que se ve es lo que sale en el papel.
import { estimarPaginas } from './estimarPaginas';

const PRINT_EXTRA_CSS = `
.lemwriter-print-encabezado { border-bottom: 2px solid #000; margin-bottom: 1em; padding-bottom: 0.5em; }
.lemwriter-print-num { font-size: 0.85em; color: #555; text-transform: uppercase; letter-spacing: 0.08em; }
.lemwriter-print-titulo { font-size: 1.6em; font-weight: bold; margin: 0.2em 0; }
.lemwriter-print-pags { font-size: 0.85em; color: #555; }
.lemwriter-print-salto { page-break-before: always; }
`;

// Notas al pie: <span data-footnote text="..."> -> [1], [2]... + lista final.
function prepararHtml(html) {
  const cont = document.createElement('div');
  cont.innerHTML = html;
  const notas = [];
  cont.querySelectorAll('span[data-footnote]').forEach((sp) => {
    const n = notas.length + 1;
    const txt = sp.getAttribute('text') || '';
    const mark = document.createElement('sup');
    mark.className = 'lemwriter-marca-nota';
    mark.textContent = '[' + n + ']';
    sp.replaceWith(mark);
    if (txt.trim()) notas.push({ n, txt });
  });
  let htmlFinal = cont.innerHTML;
  if (notas.length) {
    htmlFinal += '<hr><div class="lemwriter-notas-pie"><p><strong>Notas:</strong></p>' +
      notas.map((x) => '<p>[' + x.n + '] ' + escapeHtml(x.txt) + '</p>').join('') +
      '</div>';
  }
  return htmlFinal;
}

// Encabezado "Sección N de M" con título y páginas estimadas.
function encabezadoSeccion(info, html) {
  if (!info || !(info.numero > 0) || !(info.total > 0)) return '';
  const pags = estimarPaginas(html);
  return (
    '<div class="lemwriter-print-encabezado">' +
    '<div class="lemwriter-print-num">Sección ' + info.numero + ' de ' + info.total + '</div>' +
    (info.titulo ? '<div class="lemwriter-print-titulo">' + escapeHtml(info.titulo) + '</div>' : '') +
    (pags > 0 ? '<div class="lemwriter-print-pags">~' + pags + ' página' + (pags === 1 ? '' : 's') + '</div>' : '') +
    '</div>'
  );
}

// Recoge el CSS de la app para que lo impreso se vea como en el editor.
function recogerCssApp() {
  let css = '';
  try {
    for (const sheet of document.styleSheets) {
      try { for (const rule of sheet.cssRules) css += rule.cssText + '\n'; }
      catch (e) { /* hoja externa: se omite */ }
    }
  } catch (e) { /* sin acceso a los estilos */ }
  return css;
}

// CSS completo de impresión (app + extras). Exportado para la vista previa.
export function buildPrintCss() {
  return recogerCssApp() + PRINT_EXTRA_CSS;
}

// HTML interior de los bloques listos para imprimir (encabezado + notas).
// Exportado para la vista previa.
// HTML de una sección (encabezado + cuerpo) SIN el contenedor de bloque,
// para que la vista previa pueda repartirlo bloque a bloque al paginar.
export function buildSeccionHtml(html, info) {
  return encabezadoSeccion(info, html) + prepararHtml(html);
}

export function buildBloquesHtml(bloques) {
  const partes = (bloques || []).map((b, i) => {
    const enc = encabezadoSeccion(b.info, b.html);
    const cuerpo = prepararHtml(b.html);
    const salto = i > 0 ? ' lemwriter-print-salto' : '';
    return '<div class="lemwriter-print-bloque' + salto + '">' + enc + cuerpo + '</div>';
  });
  return partes.join('');
}

// Documento HTML autónomo con el contenido a imprimir.
// Es lo que muestra la vista previa: idéntico a lo que sale en el papel.
export function buildPrintDocument(bloques) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<style>' + buildPrintCss() +
    '.lemwriter-print-hoja{background:#ffffff !important;color:#000000 !important;}' +
    '</style></head><body class="lemwriter-print-hoja">' +
    buildBloquesHtml(bloques) + '</body></html>';
}

// Geometría de la hoja carta (a 96 dpi) para la vista previa paginada.
export const LETTER_W = 816;      // 8.5in
export const LETTER_H = 1056;     // 11in
export const MARGEN_CARTA = 76;   // ~20mm
const CARTA_CONT_W = LETTER_W - MARGEN_CARTA * 2; // 664
const CARTA_CONT_H = LETTER_H - MARGEN_CARTA * 2; // 904

// Reparte el HTML en páginas tamaño carta y devuelve un array con el HTML de
// cada página. Mide con el CSS real de impresión en un contenedor oculto.
// Los cortes son aproximados: la impresora real puede variar ligeramente.
// Evita que un título quede huérfano al final de una página.
export function paginarEnCarta(htmlCuerpo) {
  const med = document.createElement('div');
  med.style.cssText = 'position:fixed;left:-99999px;top:0;width:' + LETTER_W + 'px;visibility:hidden;';
  med.innerHTML = '<style>' + buildPrintCss() + '</style>' +
    '<div style="width:' + LETTER_W + 'px;box-sizing:border-box;padding:' + MARGEN_CARTA + 'px;">' +
    '<div class="lemwriter-med-pagina"></div></div>';
  document.body.appendChild(med);
  try {
    const tmp = document.createElement('div');
    tmp.innerHTML = htmlCuerpo || '';
    const pagina = med.querySelector('.lemwriter-med-pagina');
    const esEncabezado = (n) => n && n.nodeType === 1 && /^H[1-6]$/.test(n.tagName);
    const paginas = [];
    const nodos = Array.from(tmp.childNodes);
    for (const nodo of nodos) {
      pagina.appendChild(nodo);
      if (pagina.offsetHeight > CARTA_CONT_H) {
        pagina.removeChild(nodo);
        // Si la página quedó terminando en un título, se pasa a la siguiente
        const hijos = pagina.childNodes;
        let extra = null;
        if (hijos.length && esEncabezado(hijos[hijos.length - 1])) {
          extra = hijos[hijos.length - 1];
          pagina.removeChild(extra);
        }
        if (pagina.childNodes.length) paginas.push(pagina.innerHTML);
        pagina.innerHTML = '';
        if (extra) pagina.appendChild(extra);
        pagina.appendChild(nodo);
      }
    }
    if (pagina.childNodes.length) paginas.push(pagina.innerHTML);
    return paginas;
  } finally {
    if (med.parentNode) med.parentNode.removeChild(med);
  }
}

function imprimirHtml(htmlFinal) {
  const root = document.createElement('div');
  root.id = 'lemwriter-print-root';
  root.innerHTML = '<style>' + buildPrintCss() + '</style>' + htmlFinal;
  document.body.appendChild(root);
  document.body.classList.add('lemwriter-printing');

  const limpiar = () => {
    document.body.classList.remove('lemwriter-printing');
    if (root.parentNode) root.parentNode.removeChild(root);
    window.removeEventListener('afterprint', limpiar);
  };
  window.addEventListener('afterprint', limpiar);
  // Seguridad: si afterprint no se dispara, limpiar al minuto
  setTimeout(() => { if (document.body.contains(root)) limpiar(); }, 60000);

  window.focus();
  window.print();
}

// Imprime varios bloques; cada uno empieza en página nueva (salvo el primero).
// bloques: [{ html, info: { numero, total, titulo } }]
function printBloques(bloques) {
  imprimirHtml(buildBloquesHtml(bloques));
}

// Imprime la sección actual del editor.
export function printEditorContent(editor, info) {
  if (!editor) return;
  const html = editor.getHTML();
  if (!html.replace(/<[^>]*>/g, '').trim()) {
    alert('No hay contenido para imprimir.');
    return;
  }
  printBloques([{ html, info }]);
}

// Imprime las secciones indicadas.
// secciones: [{ html, info: { numero, total, titulo } }]
export function printSections(secciones) {
  const validas = (secciones || []).filter(
    (b) => b && b.html && b.html.replace(/<[^>]*>/g, '').trim()
  );
  if (!validas.length) {
    alert('No hay contenido para imprimir.');
    return;
  }
  printBloques(validas);
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
