const n = (v) => (v == null ? '' : v)

const joinFields = (r, fields, sep = '. ') =>
  fields.map(f => n(r[f])).filter(Boolean).join(sep)

export const RESOURCE_FORMATS = {

  pasaje_biblico: {
    label: 'Pasaje Bíblico',
    icon: 'BookOpen',
    template: (r) => {
      let t = `"${n(r.content)}"`
      if (r.reference) t += ` (${n(r.reference)}`
      if (r.bible_version) t += `, ${n(r.bible_version)}`
      if (r.reference) t += `)`
      return t
    },
    tiptapMark: 'italic',
    wrapElement: 'blockquote',
  },

  palabra_hebrea: {
    label: 'Palabra Hebrea',
    icon: 'Languages',
    template: (r) => {
      let t = n(r.original_word)
      const parts = []
      if (r.transliteration) parts.push(n(r.transliteration))
      if (r.strongs_number) parts.push(n(r.strongs_number))
      if (parts.length) t += ` (${parts.join(', ')})`
      if (r.meaning) t += `: "${n(r.meaning)}"`
      if (r.reference) t += `. Referencia: ${n(r.reference)}`
      return t
    },
    tiptapMark: 'bold',
    wrapElement: 'inline',
  },

  palabra_griega: {
    label: 'Palabra Griega',
    icon: 'Languages',
    template: (r) => {
      let t = n(r.original_word)
      const parts = []
      if (r.transliteration) parts.push(n(r.transliteration))
      if (r.strongs_number) parts.push(n(r.strongs_number))
      if (parts.length) t += ` (${parts.join(', ')})`
      if (r.meaning) t += `: "${n(r.meaning)}"`
      if (r.reference) t += `. Referencia: ${n(r.reference)}`
      return t
    },
    tiptapMark: 'bold',
    wrapElement: 'inline',
  },

  personaje_biblico: {
    label: 'Personaje Bíblico',
    icon: 'User',
    template: (r) => {
      const parts = []
      if (r.title) parts.push(`<strong>${n(r.title)}</strong>`)
      if (r.content) parts.push(n(r.content))
      if (r.reference) parts.push(`Ref: ${n(r.reference)}`)
      if (r.meaning) parts.push(n(r.meaning))
      if (r.notes) parts.push(n(r.notes))
      return parts.join('. ')
    },
    tiptapMark: null,
    wrapElement: 'inline',
  },

  ilustracion: {
    label: 'Ilustración',
    icon: 'Lightbulb',
    template: (r) => joinFields(r, ['content', 'source']),
    tiptapMark: null,
    wrapElement: 'paragraph',
  },

  cita_autor: {
    label: 'Cita de Autor',
    icon: 'Quote',
    template: (r) => {
      let t = `"${n(r.content)}"`
      const parts = []
      if (r.author) parts.push(n(r.author))
      if (r.source) parts.push(n(r.source))
      if (parts.length) t += ` — ${parts.join(', ')}`
      return t
    },
    tiptapMark: 'italic',
    wrapElement: 'blockquote',
  },

  concepto_teologico: {
    label: 'Concepto Teológico',
    icon: 'BookMarked',
    template: (r) => {
      const parts = []
      if (r.title) parts.push(`<strong>${n(r.title)}</strong>`)
      if (r.content) parts.push(n(r.content))
      if (r.reference) parts.push(`Ref: ${n(r.reference)}`)
      if (r.notes) parts.push(n(r.notes))
      return parts.join('. ')
    },
    tiptapMark: null,
    wrapElement: 'inline',
  },

  nota_teologica: {
    label: 'Nota Teológica',
    icon: 'StickyNote',
    template: (r) => {
      const text = n(r.content || r.title)
      return text ? `📝 ${text}` : ''
    },
    tiptapMark: null,
    wrapElement: 'blockquote',
  },

  nota_estudio: {
    label: 'Nota de Estudio',
    icon: 'StickyNote',
    template: (r) => {
      const text = n(r.content || r.title)
      return text ? `📝 ${text}` : ''
    },
    tiptapMark: null,
    wrapElement: 'blockquote',
  },

  pregunta_estudio: {
    label: 'Pregunta de Estudio',
    icon: 'HelpCircle',
    template: (r) => {
      const text = n(r.content || r.title)
      return text ? `❓ ${text}` : ''
    },
    tiptapMark: null,
    wrapElement: 'paragraph',
  },

  punto_estudio: {
    label: 'Punto de Estudio',
    icon: 'Target',
    template: (r) => {
      const text = n(r.content || r.title)
      return text ? `🎯 ${text}` : ''
    },
    tiptapMark: null,
    wrapElement: 'paragraph',
  },

  tema_doctrinal: {
    label: 'Tema Doctrinal',
    icon: 'Lightbulb',
    template: (r) => {
      const parts = []
      if (r.title) parts.push(`<strong>${n(r.title)}</strong>`)
      if (r.content) parts.push(n(r.content))
      if (r.notes) parts.push(n(r.notes))
      return parts.join('. ')
    },
    tiptapMark: null,
    wrapElement: 'inline',
  },
};

export function resourceToHTML(r) {
  const fmt = RESOURCE_FORMATS[r.type]
  if (!fmt) return r.title || ''

  let text = fmt.template(r) || r.title

  if (fmt.tiptapMark === 'bold') text = `<strong>${text}</strong>`
  else if (fmt.tiptapMark === 'italic') text = `<em>${text}</em>`

  if (fmt.wrapElement === 'blockquote') text = `<blockquote>${text}</blockquote>`
  else if (fmt.wrapElement === 'paragraph') text = `<p>${text}</p>`

  return text
}
