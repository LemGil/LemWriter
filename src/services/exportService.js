import { BOOK_STYLES } from '../config/bookStyles'

function hasContent(section) {
  if (!section.content) return false
  const stripped = section.content.replace(/<[^>]*>/g, '').trim()
  return stripped.length > 0
}

function filterSections(sections) {
  return (sections || []).filter(s => s.is_visible !== 0 && hasContent(s))
}

export const exportService = {
  async exportPDF(project, sections, styleKey) {
    const style = BOOK_STYLES[styleKey]
    if (!style) throw new Error('Estilo no encontrado')
    const filtered = filterSections(sections)
    const path = await window.api.export.pdf(project, filtered, style)
    return path
  },

  async exportDOCX(project, sections, styleKey) {
    const style = BOOK_STYLES[styleKey]
    if (!style) throw new Error('Estilo no encontrado')
    const filtered = filterSections(sections)
    const path = await window.api.export.docx(project, filtered, style)
    return path
  },

  async exportEPUB(project, sections, styleKey) {
    const style = BOOK_STYLES[styleKey]
    if (!style) throw new Error('Estilo no encontrado')
    const filtered = filterSections(sections)
    const path = await window.api.export.epub(project, filtered, style)
    return path
  },
}
