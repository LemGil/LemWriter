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

async function convertWebpImages(html) {
  if (!html || html.indexOf('data:image/webp') === -1) return html
  const matches = html.match(/data:image\/webp;base64,[^"' \t\n>]+/gi) || []
  const seen = {}
  let out = html
  for (const src of matches) {
    if (seen[src]) continue
    seen[src] = true
    const png = await webpDataUriToPng(src)
    if (png && png !== src) out = out.split(src).join(png)
  }
  return out
}

async function prepareSections(sections, convertWebp = false) {
  let list = sections || []
  if (convertWebp) {
    list = await Promise.all(
      list.map(async (s) => ({ ...s, content: await convertWebpImages(s.content) }))
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
export { convertWebpImages, webpDataUriToPng }
