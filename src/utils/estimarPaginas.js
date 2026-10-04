// Estima cuántas páginas tamaño Carta ocuparía un HTML con la maquetación
// de impresión (@page margin 2cm). Mide el contenido renderizado en un
// bloque oculto con el ancho útil de la hoja; usa caché por contenido para
// no medir de más. Devuelve 0 si el contenido está vacío.
const ANCHO_UTIL_PX = 665; // Carta 8.5in (816px) menos 2cm + 2cm de margen
const ALTO_UTIL_PX = 905;  // Carta 11in (1056px) menos 2cm + 2cm de margen
const MAX_CACHE = 500;
const cache = new Map();

const ESTILOS_MEDIDOR = `
#lemwriter-medidor-paginas{position:fixed;left:-10000px;top:0;width:__ANCHO__px;visibility:hidden;pointer-events:none;font-family:'EB Garamond',Georgia,serif;font-size:18px;line-height:1.8;color:#000;background:#fff;overflow-wrap:break-word}
#lemwriter-medidor-paginas h1{font-size:2em;font-weight:700;margin:.67em 0}
#lemwriter-medidor-paginas h2{font-size:1.5em;font-weight:700;margin:.75em 0}
#lemwriter-medidor-paginas h3{font-size:1.17em;font-weight:700;margin:.83em 0}
#lemwriter-medidor-paginas p{margin:1em 0}
#lemwriter-medidor-paginas ul,#lemwriter-medidor-paginas ol{margin:1em 0;padding-left:40px}
#lemwriter-medidor-paginas blockquote{margin:1em 40px}
#lemwriter-medidor-paginas img{max-width:100%;height:auto}
#lemwriter-medidor-paginas table{border-collapse:collapse;max-width:100%}
`.replace('__ANCHO__', String(ANCHO_UTIL_PX));

function medidor() {
  let el = document.getElementById('lemwriter-medidor-paginas');
  if (!el) {
    const st = document.createElement('style');
    st.id = 'lemwriter-medidor-estilos';
    st.textContent = ESTILOS_MEDIDOR;
    document.head.appendChild(st);
    el = document.createElement('div');
    el.id = 'lemwriter-medidor-paginas';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  return el;
}

export function estimarPaginas(html) {
  if (typeof document === 'undefined') return 0;
  if (!html || !html.replace(/<[^>]*>/g, '').trim()) return 0;
  const key = html.length + '|' + html.slice(0, 400);
  if (cache.has(key)) return cache.get(key);
  const el = medidor();
  el.innerHTML = html;
  const pags = Math.max(1, Math.ceil(el.scrollHeight / ALTO_UTIL_PX));
  if (cache.size >= MAX_CACHE) cache.clear();
  cache.set(key, pags);
  return pags;
}

export function limpiarCachePaginas() { cache.clear(); }
