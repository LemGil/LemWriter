import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
  buildPrintCss,
  buildSeccionHtml,
  printSections,
  paginarEnCarta,
  LETTER_W,
  LETTER_H,
  MARGEN_CARTA,
} from '../../utils/printDocument';

// Vista previa paginada en hoja carta: una hoja visible a la vez,
// con navegación entre páginas y casilla por hoja para elegir cuáles imprimir.
// Los cortes de página son aproximados (la impresora real puede variar).
export default function PrintPreviewModal({ html, info, onCerrar }) {
  const textoPlano = (html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
  const tieneMedia = /<(img|video|svg|table|hr|canvas)\b/i.test(html || '');
  const vacia = !textoPlano && !tieneMedia;

  const css = useMemo(() => buildPrintCss(), []);
  const paginas = useMemo(() => {
    if (vacia) return [];
    const cuerpo = buildSeccionHtml(html, info);
    const lista = paginarEnCarta(cuerpo);
    // Si la medición no reparte nada (p. ej. una sola imagen), va en una hoja
    return lista.length ? lista : [cuerpo];
  }, [html, info, vacia]);

  const [pagina, setPagina] = useState(0);
  const [seleccion, setSeleccion] = useState(() => new Set(paginas.map((_, i) => i)));

  // Al abrir la vista (o cambiar de contenido), todas las páginas quedan
  // elegidas y se vuelve a la primera.
  const htmlPrevioRef = useRef(null);
  useEffect(() => {
    if (htmlPrevioRef.current !== html) {
      htmlPrevioRef.current = html;
      setPagina(0);
      setSeleccion(new Set(paginas.map((_, i) => i)));
    }
  }, [html, paginas]);

  const contRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const el = contRef.current;
    if (!el) return;
    const ajustar = () => {
      const w = el.clientWidth - 48;
      if (w > 0) setZoom(Math.max(0.2, Math.min(1, w / LETTER_W)));
    };
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const tecla = (e) => {
      if (e.key === 'Escape') onCerrar();
      else if (e.key === 'ArrowLeft') setPagina((p) => Math.max(0, p - 1));
      else if (e.key === 'ArrowRight') setPagina((p) => Math.min(paginas.length - 1, p + 1));
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar, paginas.length]);

  const alternarPagina = (i) =>
    setSeleccion((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  const todas = () => setSeleccion(new Set(paginas.map((_, i) => i)));
  const ninguna = () => setSeleccion(new Set());

  const srcDoc = useMemo(() => {
    if (!paginas.length) return '';
    return (
      '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
      css +
      '.lemwriter-print-hoja{background:#ffffff !important;color:#000000 !important;}' +
      '.lemwriter-hoja{width:' + LETTER_W + 'px;box-sizing:border-box;' +
      'padding:' + MARGEN_CARTA + 'px;background:#ffffff;}' +
      '</style></head><body class="lemwriter-print-hoja" style="margin:0">' +
      '<div class="lemwriter-hoja">' + (paginas[pagina] || '') + '</div></body></html>'
    );
  }, [css, paginas, pagina]);

  const imprimir = () => {
    const elegidas = paginas.filter((_, i) => seleccion.has(i));
    onCerrar();
    printSections(elegidas.map((h) => ({ html: h, info: null })));
  };

  const numero = info && info.numero > 0 ? info.numero : null;
  const total = info && info.total > 0 ? info.total : null;
  const titulo = info && info.titulo ? info.titulo : 'Sin título';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      onClick={onCerrar}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-[46rem] max-w-[94vw] max-h-[92vh] flex flex-col text-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b font-semibold flex items-center gap-2 flex-wrap">
          <span>🖨️ Vista previa</span>
          {numero && total && (
            <span className="font-normal text-sm text-gray-500">
              Sección {numero} de {total} · {titulo}
            </span>
          )}
        </div>
        <div className="px-4 py-2 border-b flex items-center gap-3 text-sm flex-wrap">
          <button
            className="px-2 py-1 rounded border disabled:opacity-40"
            disabled={pagina <= 0}
            onClick={() => setPagina((p) => Math.max(0, p - 1))}
          >
            ‹
          </button>
          <span className="text-gray-600">
            Página {paginas.length ? pagina + 1 : 0} de {paginas.length}
          </span>
          <button
            className="px-2 py-1 rounded border disabled:opacity-40"
            disabled={pagina >= paginas.length - 1}
            onClick={() => setPagina((p) => Math.min(paginas.length - 1, p + 1))}
          >
            ›
          </button>
          <label className="flex items-center gap-1.5 ml-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={seleccion.has(pagina)}
              onChange={() => alternarPagina(pagina)}
            />
            <span>Imprimir esta página</span>
          </label>
          <span className="ml-auto flex items-center gap-3">
            <button className="text-blue-600 hover:underline" onClick={todas}>
              Todas
            </button>
            <button className="text-blue-600 hover:underline" onClick={ninguna}>
              Ninguna
            </button>
          </span>
        </div>
        {paginas.length > 1 && (
          <div className="px-4 py-2 border-b flex flex-wrap gap-1 max-h-24 overflow-auto">
            {paginas.map((_, i) => (
              <button
                key={i}
                onClick={() => setPagina(i)}
                className={
                  'min-w-[2rem] px-1.5 py-0.5 rounded border text-xs ' +
                  (seleccion.has(i)
                    ? 'bg-blue-600 text-white border-blue-600 '
                    : 'bg-white text-gray-500 ') +
                  (i === pagina ? 'ring-2 ring-blue-300 font-bold' : '')
                }
                title={'Ir a la página ' + (i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
        <div ref={contRef} className="flex-1 overflow-auto p-4 bg-gray-100">
          {vacia ? (
            <p className="text-sm text-gray-500 text-center py-10">
              No hay contenido para imprimir.
            </p>
          ) : (
            <div
              className="mx-auto shadow-lg"
              style={{ width: LETTER_W * zoom, height: LETTER_H * zoom, overflow: 'hidden' }}
            >
              <iframe
                title={'Vista previa página ' + (pagina + 1)}
                srcDoc={srcDoc}
                style={{
                  width: LETTER_W,
                  height: LETTER_H,
                  zoom: zoom,
                  border: 0,
                  display: 'block',
                  background: '#ffffff',
                }}
              />
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
          <span className="mr-auto text-sm text-gray-500">
            {seleccion.size} de {paginas.length} págs.
          </span>
          <button className="px-3 py-1.5 rounded border text-sm" onClick={onCerrar}>
            Cancelar
          </button>
          <button
            className="px-3 py-1.5 rounded text-sm text-white bg-blue-600 disabled:opacity-40"
            onClick={imprimir}
            disabled={seleccion.size === 0}
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
