import { getTemplate } from '../templates/definitions'

let sectionCounter = 0

const generateSectionId = () => {
  sectionCounter += 1
  return `section-${Date.now()}-${sectionCounter}`
}

export const createProjectFromTemplate = (type, title, templateKey) => {
  const template = getTemplate(type, templateKey)

  if (!template) {
    return createDefaultProject(type, title)
  }

  const sections = template.structure.map((sectionDef, index) => ({
    id: generateSectionId(),
    type: sectionDef.type,
    title: sectionDef.title,
    content: template.defaultContent?.[sectionDef.type] || '',
    template_type: sectionDef.template_type || sectionDef.type,
    order_index: index,
    required: sectionDef.required || false,
    word_count: 0,
  }))

  return {
    id: `project-${Date.now()}`,
    type,
    title,
    template: templateKey,
    templateName: template.name,
    sections,
    designTokens: template.designTokens || {},
    smartRules: template.smartRules || {},
    panelConfig: template.panelConfig || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

const createDefaultProject = (type, title) => {
  const defaults = {
    book: [
      { type: 'portada', title: 'Portada', required: true },
      { type: 'dedicatoria', title: 'Dedicatoria', required: false },
      { type: 'prologo', title: 'Prólogo', required: false },
      { type: 'introduccion', title: 'Introducción', required: true },
      { type: 'conclusion', title: 'Conclusión', required: true },
      { type: 'bibliografia', title: 'Bibliografía', required: false },
    ],
    teaching: [
      { type: 'clase', title: 'Clase 1', required: true },
    ],
    devotional: [
      { type: 'dia', title: 'Día 1', required: true },
    ],
  }

  const sections = (defaults[type] || []).map((s, i) => ({
    id: generateSectionId(),
    ...s,
    content: '',
    template_type: s.type,
    order_index: i,
    word_count: 0,
  }))

  return {
    id: `project-${Date.now()}`,
    type,
    title,
    template: null,
    templateName: null,
    sections,
    designTokens: {},
    smartRules: {},
    panelConfig: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export const addSectionFromTemplate = (project, afterSectionId) => {
  const template = getTemplate(project.type, project.template)
  if (!template) return null

  const type = (project.type === 'libro' || project.type === 'book') ? 'capitulo' :
               (project.type === 'ensenanza' || project.type === 'teaching') ? 'clase' : 'dia'

  const existingCount = project.sections.filter(s => s.type === type).length
  const title = (project.type === 'libro' || project.type === 'book') ? `Capítulo ${existingCount + 1}` :
                (project.type === 'ensenanza' || project.type === 'teaching') ? `Clase ${existingCount + 1}` :
                `Día ${existingCount + 1}`

  const newSection = {
    id: generateSectionId(),
    type,
    title,
    content: template.defaultContent?.[type] || '',
    template_type: type,
    order_index: project.sections.length,
    required: false,
    word_count: 0,
  }

  return newSection
}

export const getDesignStyles = (project) => {
  const tokens = project?.designTokens
  if (!tokens) return {}

  return {
    '--editor-font-size': tokens.fontSize || '18px',
    '--editor-line-height': tokens.lineHeight || '1.8',
    '--editor-font-family': tokens.fontFamily || "'EB Garamond', serif",
    '--editor-heading-font': tokens.headingFont || tokens.fontFamily || "'EB Garamond', serif",
    '--editor-heading-weight': tokens.headingWeight || '700',
    '--editor-margin-top': tokens.margins?.top || '2cm',
    '--editor-margin-bottom': tokens.margins?.bottom || '2cm',
    '--editor-margin-left': tokens.margins?.left || '2.5cm',
    '--editor-margin-right': tokens.margins?.right || '2.5cm',
  }
}
