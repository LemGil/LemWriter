// Paquete de academia para la app del estudiante (Academia del Espíritu) — LemWriter PC.
//
// Puerto del módulo del LemWriter móvil (src/lib/paqueteEstudiante.ts +
// htmlToMarkdown de src/lib/folderStore.ts), con los MISMOS formatos:
//
//   { "tipo": "paquete-academia", "formato": 1, "generada": "2026-10-31",
//     "academia": { "id": "lemgil-14", "numero": "Nº 14", "titulo": "...",
//                   "autor": "LemGil Apóstol",
//                   "codigos": [{ "id": "lemgil-14-c1", "titulo": "...",
//                                 "subtitulo": "", "cuerpo": "markdown" }],
//                   "cierre": "" } }
//
// El maestro asigna a mano el IDENTIFICADOR (autor + número, ej. «lemgil-14»):
// con él la app del estudiante reconoce la academia — mismo identificador →
// actualiza el contenido y conserva el progreso; identificador nuevo →
// academia nueva. Cada sección del proyecto se vuelve un código, en orden;
// el cuerpo es el markdown de la sección (htmlToMarkdown), que es lo que el
// lector de la app del estudiante sabe mostrar.

// ─── Conversión HTML → Markdown ─────────────────────────────────────────────
// Cubre lo que genera el editor (Tiptap): h1-h4, p, strong, em, u, ol, ul,
// blockquote/callouts, enlaces, hr. Color y resaltado (span con style) se
// conservan como HTML en línea dentro del .md (el editor lo recupera al
// abrir y el lector de la app lo tolera).

const TIPO_A_CALLOUT = {
  biblia: 'quote',
  idea: 'idea',
  aplicacion: 'tip',
  nota: 'note',
}
const CALLOUT_TITULO = {
  biblia: 'Pasaje Bíblico',
  idea: 'Idea / Ilustración',
  aplicacion: 'Aplicación Práctica',
  nota: 'Nota Ministerial',
}

// ─── Numeración de listas ───────────────────────────────────────────────────
// El estilo de la lista viaja en el .md con su propio marcador
// (I. / i. / A. / a.), para que se lea bien en cualquier editor de texto.

function romano(n) {
  const tabla = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let r = ''
  for (const [v, s] of tabla) {
    while (n >= v) {
      r += s
      n -= v
    }
  }
  return r
}

function letras(n) {
  // 1→A, 26→Z, 27→AA
  let r = ''
  while (n > 0) {
    r = String.fromCharCode(65 + ((n - 1) % 26)) + r
    n = Math.floor((n - 1) / 26)
  }
  return r
}

function marcadorNumeracion(estilo, i) {
  switch (estilo) {
    case 'upper-roman':
      return `${romano(i)}.`
    case 'lower-roman':
      return `${romano(i).toLowerCase()}.`
    case 'upper-alpha':
      return `${letras(i)}.`
    case 'lower-alpha':
      return `${letras(i).toLowerCase()}.`
    default:
      return `${i}.`
  }
}

function stripTags(html) {
  return (html || '').replace(/<[^>]+>/g, '')
}

// ─── Alineación de párrafos ─────────────────────────────────────────────────
// El editor (Tiptap TextAlign) guarda la alineación como
// style="text-align: justify|center|right" en <p>/<h1-4>. El .md la conserva
// con un marcador discreto al final de la línea:
//   Mi párrafo justificado. <!-- alinear: justify -->
// «left» no se marca (es el defecto).

/** Extrae la alineación de los atributos de un tag; '' si no hay o es el defecto. */
function alinearDeAttrs(attrs) {
  const m = /text-align\s*:\s*(center|right|justify|left)/i.exec(attrs || '')
  if (!m) return ''
  const v = m[1].toLowerCase()
  return v === 'left' ? '' : v
}

export function htmlToMarkdown(html, _interno = false) {
  if (!html) return ''
  // Proteger spans con style (color/resaltado) antes de quitar etiquetas
  const spans = []
  let md = html.replace(/<span([^>]*)>([\s\S]*?)<\/span>/gi, (m, attrs, inner) => {
    if (/style=/i.test(attrs)) {
      spans.push(m)
      return `\u0001${spans.length - 1}\u0002`
    }
    return inner
  })
  // Proteger <mark> (resaltado de Tiptap): si no, el limpiador genérico
  // lo borraría y el resaltado se perdería al reabrir
  md = md.replace(/<mark([^>]*)>([\s\S]*?)<\/mark>/gi, (m) => {
    spans.push(m)
    return `\u0001${spans.length - 1}\u0002`
  })

  md = md.replace(/<blockquote([^>]*)>([\s\S]*?)<\/blockquote>/gi, (_m, attrs, inner) => {
    const texto = htmlToMarkdown(inner, true).trim()
    const tipo =
      (/data-callout-type=["'](\w+)["']/i.exec(attrs) || [])[1] ||
      (/callout-(\w+)/i.exec(attrs) || [])[1]
    const callout = tipo ? TIPO_A_CALLOUT[tipo] : undefined
    const header = callout ? `> [!${callout}] ${CALLOUT_TITULO[tipo]}\n` : ''
    return header + texto.split('\n').map((l) => `> ${l}`).join('\n') + '\n\n'
  })

  md = md.replace(/<hr\s*\/?>/gi, '\n---\n\n')
  md = md.replace(/<h1([^>]*)>([\s\S]*?)<\/h1>/gi, (_m, attrs, t) => {
    const textoH = stripTags(t).trim()
    if (!textoH) return ''
    const alH = alinearDeAttrs(attrs)
    return `# ${textoH}` + (alH ? `\u0003${alH}\u0004` : '') + '\n\n'
  })
  md = md.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (_m, attrs, t) => {
    const textoH = stripTags(t).trim()
    if (!textoH) return ''
    const alH = alinearDeAttrs(attrs)
    return `## ${textoH}` + (alH ? `\u0003${alH}\u0004` : '') + '\n\n'
  })
  md = md.replace(/<h3([^>]*)>([\s\S]*?)<\/h3>/gi, (_m, attrs, t) => {
    const textoH = stripTags(t).trim()
    if (!textoH) return ''
    const alH = alinearDeAttrs(attrs)
    return `### ${textoH}` + (alH ? `\u0003${alH}\u0004` : '') + '\n\n'
  })
  md = md.replace(/<h4([^>]*)>([\s\S]*?)<\/h4>/gi, (_m, attrs, t) => {
    const textoH = stripTags(t).trim()
    if (!textoH) return ''
    const alH = alinearDeAttrs(attrs)
    return `#### ${textoH}` + (alH ? `\u0003${alH}\u0004` : '') + '\n\n'
  })

  md = md.replace(/<ol([^>]*)>([\s\S]*?)<\/ol>/gi, (_m, attrs, inner) => {
    const estilo = (/data-list-style=["']([\w-]+)["']/i.exec(attrs) || [])[1] || 'decimal'
    let i = 0
    return (
      inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_2, item) => {
        i++
        return `${marcadorNumeracion(estilo, i)} ${stripTags(htmlToMarkdown(item, true)).trim()}\n`
      }) + '\n'
    )
  })
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m, inner) => {
    return (
      inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_2, item) => {
        return `- ${stripTags(htmlToMarkdown(item, true)).trim()}\n`
      }) + '\n'
    )
  })

  md = md.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, t) => `[${stripTags(t)}](${href})`)
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_m, t) => `**${stripTags(t)}**`)
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (_m, t) => `**${stripTags(t)}**`)
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_m, t) => `*${stripTags(t)}*`)
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, (_m, t) => `*${stripTags(t)}*`)
  md = md.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, (_m, t) => `<u>${stripTags(t)}</u>`)
  md = md.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (_m, attrs, t) => {
    const texto = t.trim()
    if (!texto) return ''
    const al = alinearDeAttrs(attrs)
    // Marcador temporal: el comentario final se escribe al cierre de la
    // llamada externa (el limpiador genérico de tags lo borraría antes).
    return texto + (al ? `\u0003${al}\u0004` : '') + '\n\n'
  })
  md = md.replace(/<br\s*\/?>/gi, '\n')
  md = md.replace(/<[^>]+>/g, '')
  md = md
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  // Restaurar spans protegidos
  md = md.replace(/\u0001(\d+)\u0002/g, (_m, i) => spans[Number(i)] || '')
  md = md.replace(/\n{3,}/g, '\n\n')
  if (!_interno) {
    md = md.replace(/\u0003(center|right|justify)\u0004/g, ' <!-- alinear: $1 -->')
  }
  return md.trim()
}

// ─── Identificador de la academia ───────────────────────────────────────────

/** Autor sugerido por defecto (el maestro puede cambiarlo). */
export const AUTOR_POR_DEFECTO = 'LemGil Apóstol'

/**
 * Normaliza lo que el maestro escribió como identificador: minúsculas,
 * sin acentos, espacios y guiones bajos → «-», solo letras/números/«-».
 * Ej.: «LemGil 14» → «lemgil-14»; « Mi Academia 2 » → «mi-academia-2».
 */
export function normalizarIdentificador(texto) {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Un identificador válido: grupos de letras/números unidos por «-». */
export function esIdentificadorValido(id) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id ?? '')
}

/**
 * Número visible de la academia, derivado del identificador:
 * «lemgil-14» → «Nº 14». Sin número al final → '' (la app del estudiante
 * la ordena al final de la lista).
 */
export function numeroVisibleDesdeId(id) {
  const m = /(\d+)$/.exec(id ?? '')
  return m ? `Nº ${parseInt(m[1], 10)}` : ''
}

// ─── Construcción del paquete ───────────────────────────────────────────────
// Secciones de entrada: { titulo, contenidoHtml, order_index? } — el orden
// del arreglo manda; si traen order_index, se ordena por él como en el móvil.

/**
 * Revisa los datos antes de generar el paquete. Devuelve el mensaje de
 * error listo para mostrar, o null si todo está bien.
 */
export function validarDatosPaquete(opts) {
  const id = (opts.identificador ?? '').trim()
  if (!id) {
    return 'Escribe el identificador de la academia (autor + número, ej. lemgil-14). Tú lo asignas a mano: con él la app del estudiante reconoce la academia y la ordena.'
  }
  if (!esIdentificadorValido(id)) {
    return 'El identificador solo puede llevar letras minúsculas, números y guiones (ej. lemgil-14). Sin espacios ni acentos.'
  }
  if (!(opts.titulo ?? '').trim()) {
    return 'El proyecto necesita un título: será el nombre de la academia en la app del estudiante.'
  }
  const conTexto = (opts.secciones ?? []).filter((s) => htmlToMarkdown(s.contenidoHtml ?? '').trim().length > 0)
  if (conTexto.length === 0) {
    return 'Este proyecto no tiene secciones con texto todavía: escribe al menos una para generar el paquete.'
  }
  return null
}

/**
 * Construye el paquete listo para serializar. Las secciones vacías se
 * omiten (se avisa en `omitidas`); los códigos quedan en el orden del
 * proyecto y con ids «<identificador>-c1», «-c2», ... — la posición es
 * la que conserva el progreso del estudiante al actualizar.
 */
export function construirPaquete(opts) {
  const id = (opts.identificador ?? '').trim()
  const ordenadas = [...(opts.secciones ?? [])].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
  )
  const codigos = []
  let omitidas = 0
  for (const s of ordenadas) {
    const cuerpo = htmlToMarkdown(s.contenidoHtml ?? '').trim()
    if (!cuerpo) {
      omitidas++
      continue
    }
    codigos.push({
      id: `${id}-c${codigos.length + 1}`,
      titulo: (s.titulo ?? '').trim() || `Código ${codigos.length + 1}`,
      subtitulo: '',
      cuerpo,
    })
  }
  const autor = (opts.autor ?? '').trim()
  const paquete = {
    tipo: 'paquete-academia',
    formato: 1,
    generada: opts.fecha ?? new Date().toISOString().slice(0, 10),
    academia: {
      id,
      numero: numeroVisibleDesdeId(id),
      titulo: (opts.titulo ?? '').trim(),
      ...(autor ? { autor } : {}),
      ...(opts.nivel ? { nivel: opts.nivel.nombre, nivelOrden: opts.nivel.orden } : {}),
      codigos,
      cierre: '',
    },
  }
  return { paquete, omitidas }
}

export function serializarPaquete(paquete) {
  return JSON.stringify(paquete, null, 1)
}

/** Nombre del archivo del paquete: «lemgil-14.json». */
export function nombreArchivoPaquete(paquete) {
  return `${paquete.academia.id}.json`
}
