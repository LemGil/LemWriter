import { BOOK_STYLES } from '../config/bookStyles'

function hasContent(section) {
  if (!section.content) return false
  // Una sección con solo imagen sí tiene contenido exportable
  if (/<img(\s[^>]*)?>/i.test(section.content)) return true
  const stripped = section.content.replace(/<[^>]*>/g, '').trim()
  return stripped.length > 0
}

// ── webp → PNG con canvas ──────────────────────────────────────
// Chromium (renderer) sí decodifica webp; el proceso main de Electron no
// puede vía nativeImage, así que la conversión se hace aquí antes de exportar.
function webpDataUriToPng(dataUri) {
  return new Promise((resolve) => {
    const img = new Image()
    const done = (ok) => {
      if (!ok) { resolve(dataUri); return }
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        if (!canvas.width || !canvas.height) { resolve(dataUri); return }
        canvas.getContext('2d').drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch (e) {
        console.warn('[export] no se pudo convertir webp a PNG:', e.message)
        resolve(dataUri)
      }
    }
    img.onload = () => done(true)
    img.onerror = () => done(false)
    img.src = dataUri
  })
}

// Detecta el tipo real de un data URI por firma binaria (los primeros bytes
// decodificados). El MIME declarado puede mentir: p. ej. un webp guardado
// como .jpg llega como data:image/jpeg aunque sus bytes sean webp.
function sniffDataUriType(dataUri) {
  try {
    const comma = dataUri.indexOf(',')
    if (comma === -1) return null
    const bin = atob(dataUri.slice(comma + 1, comma + 45))
    const c = (i) => bin.charCodeAt(i)
    if (c(0) === 0xFF && c(1) === 0xD8 && c(2) === 0xFF) return 'jpg'
    if (bin.slice(0, 4) === '\x89PNG') return 'png'
    if (bin.slice(0, 3) === 'GIF') return 'gif'
    if (bin.slice(0, 2) === 'BM') return 'bmp'
    if (bin.slice(0, 4) === 'RIFF' && bin.slice(8, 12) === 'WEBP') return 'webp'
  } catch (e) { /* ignorar */ }
  return null
}

// Convierte a PNG las imágenes que Word/Electron no soportan (webp),
// aunque vengan declaradas con otro MIME (p. ej. webp renombrado a .jpg).
async function convertUnsupportedImages(html) {
  if (!html || html.indexOf('data:image/') === -1) return html
  const matches = html.match(/data:image\/[\w+.-]+;base64,[^"' \t\n>]+/gi) || []
  const seen = {}
  let out = html
  for (const src of matches) {
    if (seen[src]) continue
    seen[src] = true
    if (sniffDataUriType(src) !== 'webp') continue
    // Reescribir el MIME al tipo real para que Chromium lo decodifique
    const webpUri = src.replace(/^data:image\/[\w+.-]+;/i, 'data:image/webp;')
    const png = await webpDataUriToPng(webpUri)
    if (png && png !== webpUri) out = out.split(src).join(png)
  }
  return out
}

async function prepareSections(sections, convertImages = false) {
  let list = sections || []
  if (convertImages) {
    list = await Promise.all(
      list.map(async (s) => ({ ...s, content: await convertUnsupportedImages(s.content) }))
    )
  }
  return filterSections(list)
}

function filterSections(sections) {
  return (sections || []).filter(s => s.is_visible !== 0 && hasContent(s))
}

export const exportService = {
  async exportPDF(project, sections, styleKey, sectionId = null) {
    const style = BOOK_STYLES[styleKey]
    if (!style) throw new Error('Estilo no encontrado')
    const filtered = await prepareSections(sections)
    const path = await window.api.export.pdf(project, filtered, style, sectionId)
    return path
  },

  async exportDOCX(project, sections, styleKey) {
    const style = BOOK_STYLES[styleKey]
    if (!style) throw new Error('Estilo no encontrado')
    // Word no acepta webp: convertir a PNG antes de enviar al proceso main
    const filtered = await prepareSections(sections, true)
    const path = await window.api.export.docx(project, filtered, style)
    return path
  },

  async exportEPUB(project, sections, styleKey) {
    const style = BOOK_STYLES[styleKey]
    if (!style) throw new Error('Estilo no encontrado')
    const filtered = await prepareSections(sections)
    const path = await window.api.export.epub(project, filtered, style)
    return path
  },
}

// Exportados para pruebas
export { convertUnsupportedImages, webpDataUriToPng, sniffDataUriType }
