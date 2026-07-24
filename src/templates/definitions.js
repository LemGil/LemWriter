export const TEMPLATE_TYPES = {
  BOOK: 'book',
  TEACHING: 'teaching',
  DEVOCIONAL: 'devotional',
  STUDY: 'study',
}

export const templates = {
  book: {
    'classic-novel': {
      name: 'Libro Clásico',
      description: 'Narrativa, ensayo o contenido general',
      icon: '📚',
      projectType: 'book',
      structure: [
        { type: 'portada', title: 'Portada', required: true },
        { type: 'dedicatoria', title: 'Dedicatoria', required: false },
        { type: 'prologo', title: 'Prólogo', required: false },
        { type: 'introduccion', title: 'Introducción', required: true },
        { type: 'capitulo', title: 'Capítulo 1', required: true },
        { type: 'capitulo', title: 'Capítulo 2', required: true },
        { type: 'conclusion', title: 'Conclusión', required: true },
        { type: 'bibliografia', title: 'Bibliografía', required: false },
      ],
      defaultContent: {
        capitulo: '',
      },
      designTokens: {
        fontSize: '18px',
        lineHeight: '1.8',
        fontFamily: "'EB Garamond', serif",
        margins: { top: '2cm', bottom: '2cm', left: '2.5cm', right: '2.5cm' },
        headingFont: "'EB Garamond', serif",
        headingWeight: '700',
        pageWidth: '6in',
        pageHeight: '9in',
      },
      smartRules: {
        chapterLength: { min: 1500, max: 5000, warnAt: 4000 },
        requireIntroduction: true,
        requireConclusion: true,
        styleConsistency: true,
      },
      panelConfig: {
        tabs: ['references', 'characters', 'words', 'notes', 'progress'],
        showWordCount: true,
        showReadingTime: false,
        showProgressBar: true,
      },
    },
    'teaching-series': {
      name: 'Libro de Enseñanza Bíblica',
      description: 'Material formativo o devocional estructurado',
      icon: '📖',
      projectType: 'book',
      structure: [
        { type: 'portada', title: 'Portada', required: true },
        { type: 'introduccion', title: 'Introducción a la Serie', required: true },
        { type: 'capitulo', title: 'Clase 1: Título de la Clase', required: true, template_type: 'clase' },
        { type: 'capitulo', title: 'Clase 2: Título de la Clase', required: true, template_type: 'clase' },
        { type: 'conclusion', title: 'Conclusión de la Serie', required: true },
      ],
      defaultContent: {
        capitulo: '<h3>Texto Base</h3><p></p><h3>Objetivo</h3><p></p><h3>Introducción</h3><p></p><h3>Punto 1</h3><p></p><h3>Punto 2</h3><p></p><h3>Aplicación</h3><p></p><h3>Preguntas de Reflexión</h3><p></p><h3>Conclusión</h3><p></p>',
      },
      designTokens: {
        fontSize: '16px',
        lineHeight: '1.6',
        fontFamily: "'Inter', sans-serif",
        margins: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' },
        headingFont: "'Inter', sans-serif",
        headingWeight: '600',
        pageWidth: '6in',
        pageHeight: '9in',
      },
      smartRules: {
        requireObjective: true,
        requireApplication: true,
        requireQuestions: true,
        requireBibleReference: true,
        minWordsPerClass: 500,
        maxWordsPerClass: 3000,
      },
      panelConfig: {
        tabs: ['references', 'points', 'questions', 'words'],
        showWordCount: true,
        showReadingTime: false,
        showProgressBar: false,
      },
    },
    'bible-commentary': {
      name: 'Comentario Bíblico',
      description: 'Estudio técnico de un pasaje bíblico',
      icon: '🔍',
      projectType: 'book',
      structure: [
        { type: 'portada', title: 'Portada', required: true },
        { type: 'introduccion', title: 'Introducción General', required: true },
        { type: 'capitulo', title: 'Comentario: Génesis 1', required: true, template_type: 'comentario' },
        { type: 'capitulo', title: 'Comentario: Génesis 2', required: true, template_type: 'comentario' },
        { type: 'bibliografia', title: 'Bibliografía de Estudio', required: true },
      ],
      defaultContent: {
        capitulo: '<h3>Texto Base</h3><p></p><h3>Contexto Histórico</h3><p></p><h3>Análisis Exegético</h3><p></p><h3>Referencias Cruzadas</h3><p></p><h3>Estudio de Palabras</h3><p></p><h3>Aplicación Teológica</h3><p></p>',
      },
      designTokens: {
        fontSize: '14px',
        lineHeight: '1.7',
        fontFamily: "'Merriweather', serif",
        margins: { top: '2cm', bottom: '2cm', left: '2.5cm', right: '2.5cm' },
        headingFont: "'Merriweather', serif",
        headingWeight: '700',
        pageWidth: '6in',
        pageHeight: '9in',
      },
      smartRules: {
        exegesisFocus: true,
        crossReferenceRequired: true,
        wordStudyRequired: true,
        minWordsPerPassage: 800,
      },
      panelConfig: {
        tabs: ['references', 'words', 'characters', 'exegesis'],
        showWordCount: true,
        showReadingTime: false,
        showProgressBar: false,
      },
    },
    'biography': {
      name: 'Biografía',
      description: 'Biografía ministerial — vida y legado de un siervo de Dios',
      icon: '👤',
      projectType: 'book',
      structure: [
        { type: 'portada', title: 'Portada', required: true },
        { type: 'dedicatoria', title: 'Dedicatoria', required: false },
        { type: 'prologo', title: 'Prólogo', required: false },
        { type: 'introduccion', title: 'Introducción', required: true },
        { type: 'capitulo', title: 'Capítulo 1: Orígenes y Juventud', required: true },
        { type: 'capitulo', title: 'Capítulo 2: Llamado y Ministerio', required: true },
        { type: 'capitulo', title: 'Capítulo 3: Pruebas y Victorias', required: true },
        { type: 'capitulo', title: 'Capítulo 4: Legado', required: true },
        { type: 'conclusion', title: 'Conclusión', required: true },
        { type: 'apendice', title: 'Apéndice — Línea de Tiempo', required: false },
        { type: 'bibliografia', title: 'Bibliografía', required: true },
      ],
      defaultContent: {
        capitulo: '<h3>Contexto Histórico</h3><p></p><h3>Desarrollo</h3><p></p><h3>Lecciones para el Ministerio</h3><p></p><h3>Referencias</h3><p></p>',
      },
      designTokens: {
        fontSize: '18px',
        lineHeight: '1.8',
        fontFamily: "'EB Garamond', serif",
        margins: { top: '2cm', bottom: '2cm', left: '2.5cm', right: '2.5cm' },
        headingFont: "'EB Garamond', serif",
        headingWeight: '700',
        pageWidth: '6in',
        pageHeight: '9in',
      },
      smartRules: {
        chapterLength: { min: 1200, max: 4000, warnAt: 3500 },
        requireIntroduction: true,
        requireConclusion: true,
        styleConsistency: true,
      },
      panelConfig: {
        tabs: ['references', 'characters', 'notes', 'words'],
        showWordCount: true,
        showReadingTime: false,
        showProgressBar: true,
      },
    },
  },
  teaching: {
    'teaching-basic': {
      name: 'Clase Bíblica',
      description: 'Clase individual con estructura completa',
      icon: '📖',
      projectType: 'teaching',
      structure: [
        { type: 'clase', title: 'Clase 1', required: true },
        { type: 'clase', title: 'Clase 2', required: true },
      ],
      defaultContent: {
        clase: '<h3>Texto Base</h3><p></p><h3>Objetivo</h3><p></p><h3>Introducción</h3><p></p><h3>Punto 1</h3><p></p><h3>Punto 2</h3><p></p><h3>Aplicación</h3><p></p><h3>Preguntas de Reflexión</h3><p></p><h3>Conclusión</h3><p></p>',
      },
      designTokens: {
        fontSize: '16px',
        lineHeight: '1.6',
        fontFamily: "'Inter', sans-serif",
        margins: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' },
        headingFont: "'Inter', sans-serif",
        headingWeight: '600',
      },
      smartRules: {
        requireObjective: true,
        requireApplication: true,
        requireQuestions: true,
        requireBibleReference: true,
        maxWordsPerClass: 3000,
      },
      panelConfig: {
        tabs: ['references', 'points', 'questions', 'words'],
        showWordCount: true,
        showReadingTime: false,
      },
    },
    'sermon': {
      name: 'Sermón',
      description: 'Serie de sermones predicables con estructura homilética',
      icon: '🎙️',
      projectType: 'teaching',
      structure: [
        { type: 'clase', title: 'Sermón 1', required: true, template_type: 'sermon' },
        { type: 'clase', title: 'Sermón 2', required: true, template_type: 'sermon' },
        { type: 'clase', title: 'Sermón 3', required: true, template_type: 'sermon' },
      ],
      defaultContent: {
        clase: '<h3>Texto Base</h3><p></p><h3>Introducción</h3><p></p><h3>Gancho</h3><p></p><h3>Punto Principal</h3><p></p><h3>Ilustración</h3><p></p><h3>Aplicación</h3><p></p><h3>Llamado</h3><p></p><h3>Oración</h3><p></p>',
      },
      designTokens: {
        fontSize: '16px',
        lineHeight: '1.6',
        fontFamily: "'Inter', sans-serif",
        margins: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' },
        headingFont: "'Inter', sans-serif",
        headingWeight: '600',
      },
      smartRules: {
        requireObjective: true,
        requireApplication: true,
        maxWordsPerClass: 4000,
      },
      panelConfig: {
        tabs: ['references', 'points', 'questions', 'words'],
        showWordCount: true,
        showReadingTime: false,
      },
    },
  },
  devotional: {
    'devotional-daily': {
      name: 'Devocional Diario',
      description: 'Reflexión breve para lectura diaria',
      icon: '🙏',
      projectType: 'devotional',
      structure: [
        { type: 'dia', title: 'Día 1', required: true },
        { type: 'dia', title: 'Día 2', required: true },
      ],
      defaultContent: {
        dia: '<h3>Versículo del Día</h3><p></p><h3>Historia de Apertura</h3><p></p><h3>Reflexión</h3><p></p><h3>Aplicación Personal</h3><p></p><h3>Oración Sugerida</h3><p></p>',
      },
      designTokens: {
        fontSize: '16px',
        lineHeight: '1.8',
        fontFamily: "'Inter', sans-serif",
        margins: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' },
        headingFont: "'Inter', sans-serif",
        headingWeight: '600',
      },
      smartRules: {
        requireVerse: true,
        requirePrayer: true,
        requireApplication: true,
        maxWords: 600,
        readingTimeTarget: '4 min',
      },
      panelConfig: {
        tabs: ['verse', 'prayer', 'application'],
        showWordCount: true,
        showReadingTime: true,
      },
    },
  },
  sermon: {
    'sermon-default': {
      name: 'Sermón',
      projectType: 'sermon',
      structure: [{ type: 'sermon', title: 'Sermón', required: true }],
      defaultContent: {
        sermon: '<h3>Texto Base</h3><p></p><h3>Introducción</h3><p></p><h3>Gancho</h3><p></p><h3>Punto</h3><p></p><h3>Ilustración</h3><p></p><h3>Aplicación</h3><p></p><h3>Llamado</h3><p></p><h3>Conclusión</h3><p></p><h3>Oración</h3><p></p>'
      }
    }
  },
  video: {
    'video-largo': {
      name: 'Video Largo',
      projectType: 'video',
      structure: [{ type: 'video_largo', title: 'Video', required: true }],
      defaultContent: {
        video_largo: '<h3>Gancho Inicial</h3><p></p><h3>Texto Base</h3><p></p><h3>Introducción</h3><p></p><h3>Punto</h3><p></p><h3>Ilustración</h3><p></p><h3>Aplicación</h3><p></p><h3>Llamado a la Acción</h3><p></p><h3>Cierre</h3><p></p>'
      }
    },
    'video-corto': {
      name: 'Video Corto',
      projectType: 'video',
      structure: [{ type: 'video_corto', title: 'Video', required: true }],
      defaultContent: {
        video_corto: '<h3>Hook</h3><p></p><h3>Idea Central</h3><p></p><h3>Desarrollo</h3><p></p><h3>Cierre</h3><p></p><h3>Texto en Pantalla</h3><p></p>'
      }
    }
  },
  study: {
    'study-basic': {
      name: 'Estudio Bíblico',
      description: 'Estudio de pasajes bíblicos con estructura de análisis y aplicación',
      icon: '🔍',
      projectType: 'study',
      structure: [
        { type: 'texto_base', title: 'Texto Base', required: true },
        { type: 'punto', title: 'Punto 1', required: true },
        { type: 'punto', title: 'Punto 2', required: true },
        { type: 'aplicacion', title: 'Aplicación', required: true },
        { type: 'oracion', title: 'Oración', required: false },
      ],
      defaultContent: {
        texto_base: '<h3>Pasaje Bíblico</h3><p></p>',
        punto: '<h3>Punto</h3><p></p>',
        aplicacion: '<h3>Aplicación Personal</h3><p></p>',
        oracion: '<h3>Oración</h3><p></p>',
      },
      designTokens: {
        fontSize: '18px',
        lineHeight: '1.8',
        fontFamily: "'EB Garamond', serif",
        margins: { top: '2cm', bottom: '2cm', left: '2.5cm', right: '2.5cm' },
        headingFont: "'Inter', sans-serif",
        headingWeight: '600',
        pageWidth: '6in',
        pageHeight: '9in',
      },
      smartRules: {
        requireBibleReference: true,
        requireApplication: true,
        requirePrayer: true,
        maxWords: 2000,
        minWords: 300,
      },
      panelConfig: {
        tabs: ['references', 'characters', 'words', 'notes'],
        showWordCount: true,
        showReadingTime: true,
      },
    },
  },
}

const normalizeType = (type) => {
  if (type === 'libro') return 'book'
  if (type === 'ensenanza') return 'teaching'
  if (type === 'devocional') return 'devotional'
  if (type === 'estudio') return 'study'
  return type
}

export const getTemplates = (projectType) => {
  return templates[normalizeType(projectType)] || {}
}

export const getTemplate = (projectType, templateKey) => {
  return templates[normalizeType(projectType)]?.[templateKey] || null
}

export const getAllTemplates = () => {
  const all = []
  Object.entries(templates).forEach(([type, typeTemplates]) => {
    Object.entries(typeTemplates).forEach(([key, template]) => {
      all.push({ ...template, key, type })
    })
  })
  return all
}

export const getTemplateKeys = (projectType) => {
  return Object.keys(templates[projectType] || {})
}
