import { getTemplate } from '../templates/definitions'

export const validateSection = (project, section) => {
  if (!project || !section) return []

  const template = getTemplate(project.type, project.template)
  if (!template || !template.smartRules) return []

  const rules = template.smartRules
  const content = section.content || ''
  const plainText = content.replace(/<[^>]*>/g, '').trim()
  const wordCount = plainText === '' ? 0 : plainText.split(/\s+/).length
  const warnings = []

  if ((project.type === 'libro' || project.type === 'book') && template.key === 'classic-novel') {
    if (section.type === 'capitulo') {
      if (rules.chapterLength) {
        if (wordCount > rules.chapterLength.max) {
          warnings.push({
            type: 'warning',
            category: 'structure',
            message: `Este capítulo tiene ${wordCount.toLocaleString()} palabras. El máximo recomendado es ${rules.chapterLength.max.toLocaleString()}. Considera dividirlo.`,
          })
        } else if (wordCount > rules.chapterLength.warnAt && wordCount <= rules.chapterLength.max) {
          warnings.push({
            type: 'info',
            category: 'structure',
            message: `Este capítulo tiene ${wordCount.toLocaleString()} palabras. Se acerca al límite de ${rules.chapterLength.max.toLocaleString()}.`,
          })
        } else if (wordCount > 0 && wordCount < rules.chapterLength.min) {
          warnings.push({
            type: 'info',
            category: 'structure',
            message: `Este capítulo tiene ${wordCount.toLocaleString()} palabras. El mínimo recomendado es ${rules.chapterLength.min.toLocaleString()}.`,
          })
        }
      }
    }
  }

  if ((project.type === 'libro' || project.type === 'book') && template.key === 'teaching-series') {
    if (section.type === 'capitulo') {
      const hasObjective = /objetivo|propósito|meta/i.test(plainText)
      const hasApplication = /aplicación|aplicar|práctica|ejercicio|practicar/i.test(plainText)
      const hasQuestions = /pregunta|reflexión|reflexionar|discusión/i.test(plainText)
      const hasVerse = /versículo|versiculo|capítulo|capitulo|\d+\s*:\d+|[Jj]uan|\Mateo|\Marcos|\Lucas|\Romanos|\Efesios|\Filipenses|\1\s+Corintios|\2\s+Corintios|\Hebreos|\Santiago|\1\s+Pedro|\2\s+Pedro|\1\s+Juan|\2\s+Juan|\3\s+Juan|\Judas|\Apocalipsis|\Génesis|\Éxodo|\Levítico|\Números|\Deuteronomio|\Josué|\Jueces|\Rut|\1\s+Samuel|\2\s+Samuel|\1\s+Reyes|\2\s+Reyes|\1\s+Crónicas|\2\s+Crónicas|\Esdras|\Nehemías|\Ester|\Job|\Salmos|\Proverbios|\Eclesiastés|\Cantar|\Isaías|\Jeremías|\Lamentaciones|\Ezequiel|\Daniel|\Oseas|\Joel|\Amós|\Abdías|\Jonás|\Miqueas|\Nahúm|\Habacuc|\Sofonías|\Hageo|\Zacarías|\Malaquías/i.test(plainText)

      if (rules.requireObjective && wordCount > 100 && !hasObjective) {
        warnings.push({
          type: 'suggestion',
          category: 'content',
          message: 'Esta clase no tiene un objetivo definido. Agrega una sección "Objetivo" al inicio.',
        })
      }

      if (rules.requireApplication && wordCount > 200 && !hasApplication) {
        warnings.push({
          type: 'suggestion',
          category: 'content',
          message: 'Aún no has agregado una aplicación práctica. Incluye una sección "Aplicación" con acciones concretas.',
        })
      }

      if (rules.requireQuestions && wordCount > 200 && !hasQuestions) {
        warnings.push({
          type: 'suggestion',
          category: 'content',
          message: 'Faltan preguntas de reflexión. Agrega una sección "Preguntas" para facilitar la discusión.',
        })
      }

      if (rules.requireBibleReference && wordCount > 50 && !hasVerse) {
        warnings.push({
          type: 'suggestion',
          category: 'content',
          message: 'No se detectó una referencia bíblica. Asegúrate de incluir el texto base.',
        })
      }

      if (rules.maxWordsPerClass && wordCount > rules.maxWordsPerClass) {
        warnings.push({
          type: 'warning',
          category: 'length',
          message: `La clase tiene ${wordCount.toLocaleString()} palabras. El máximo recomendado es ${rules.maxWordsPerClass.toLocaleString()} para una clase.`,
        })
      }
    }
  }

  if ((project.type === 'libro' || project.type === 'book') && template.key === 'bible-commentary') {
    if (section.type === 'capitulo') {
      const hasCrossRef = /referencia|cruzada|cf\.|cp\.|ver\.|comparar/i.test(plainText)
      const hasExegesis = /exégesis|exegesis|análisis|analisis|contexto|histórico|historico/i.test(plainText)
      const hasWordStudy = /hebreo|griego|palabra|término|termino|significado|lengua original/i.test(plainText)

      if (rules.crossReferenceRequired && wordCount > 200 && !hasCrossRef) {
        warnings.push({
          type: 'suggestion',
          category: 'content',
          message: 'Este comentario no tiene referencias cruzadas. Agrega una sección "Referencias Cruzadas" con textos relacionados.',
        })
      }

      if (rules.exegesisFocus && wordCount > 200 && !hasExegesis) {
        warnings.push({
          type: 'suggestion',
          category: 'content',
          message: 'Falta análisis exegético. Incluye una sección "Análisis Exegético" o "Contexto Histórico".',
        })
      }

      if (rules.wordStudyRequired && wordCount > 200 && !hasWordStudy) {
        warnings.push({
          type: 'suggestion',
          category: 'content',
          message: 'No se detectó estudio de palabras. Agrega una sección "Estudio de Palabras" con términos en hebreo/griego.',
        })
      }

      if (rules.minWordsPerPassage && wordCount > 0 && wordCount < rules.minWordsPerPassage) {
        warnings.push({
          type: 'info',
          category: 'length',
          message: `El comentario tiene ${wordCount.toLocaleString()} palabras. Para un estudio completo se recomienda al menos ${rules.minWordsPerPassage.toLocaleString()}.`,
        })
      }
    }
  }

  if (project.type === 'ensenanza' || project.type === 'teaching') {
    const hasObjective = /objetivo|propósito|meta/i.test(plainText)
    const hasApplication = /aplicación|aplicar|práctica|ejercicio/i.test(plainText)
    const hasQuestions = /pregunta|reflexión|reflexionar/i.test(plainText)

    if (rules.requireObjective && wordCount > 100 && !hasObjective) {
      warnings.push({
        type: 'suggestion',
        category: 'content',
        message: 'Esta clase no tiene un objetivo definido. Agrega una sección "Objetivo".',
      })
    }

    if (rules.requireApplication && wordCount > 200 && !hasApplication) {
      warnings.push({
        type: 'suggestion',
        category: 'content',
        message: 'Aún no has agregado una aplicación práctica.',
      })
    }

    if (rules.requireQuestions && wordCount > 200 && !hasQuestions) {
      warnings.push({
        type: 'suggestion',
        category: 'content',
        message: 'Faltan preguntas de reflexión.',
      })
    }
  }

  if (project.type === 'estudio' || project.type === 'study') {
    const hasVerse = /versículo|versiculo|capítulo|capitulo|\d+\s*:\d+|[Jj]uan|\Mateo|\Marcos|\Lucas|\Romanos|\Efesios|\Filipenses|\Génesis|\Éxodo|\Salmos|\Proverbios|\Isaías|\Jeremías|\Apocalipsis/i.test(plainText)
    const hasApplication = /aplicación|aplicar|práctica|hoy|implementar/i.test(plainText)
    const hasPrayer = /oración|oracion|orar|señor|padre celestial/i.test(plainText)

    if (rules.requireBibleReference && wordCount > 30 && !hasVerse) {
      warnings.push({
        type: 'suggestion',
        category: 'content',
        message: 'No se detectó una referencia bíblica. Incluye el pasaje o texto base del estudio.',
      })
    }

    if (rules.requireApplication && wordCount > 150 && !hasApplication) {
      warnings.push({
        type: 'suggestion',
        category: 'content',
        message: 'Aún no has agregado una aplicación práctica. Piensa cómo aplicar este pasaje a la vida diaria.',
      })
    }

    if (rules.requirePrayer && wordCount > 150 && !hasPrayer) {
      warnings.push({
        type: 'suggestion',
        category: 'content',
        message: 'Falta la oración de cierre. Agrega una oración relacionada con el tema estudiado.',
      })
    }

    if (rules.maxWords && wordCount > rules.maxWords) {
      warnings.push({
        type: 'warning',
        category: 'length',
        message: `Este estudio tiene ${wordCount.toLocaleString()} palabras. El máximo recomendado es ${rules.maxWords.toLocaleString()}.`,
      })
    }

    if (rules.minWords && wordCount > 0 && wordCount < rules.minWords) {
      warnings.push({
        type: 'info',
        category: 'length',
        message: `Este estudio tiene ${wordCount.toLocaleString()} palabras. Para un análisis completo se recomienda al menos ${rules.minWords.toLocaleString()}.`,
      })
    }
  }

  if (project.type === 'devocional' || project.type === 'devotional') {
    const hasVerse = /versículo|versiculo|\d+\s*:\d+/i.test(plainText)
    const hasPrayer = /oración|oracion|orar|señor|padre celestial/i.test(plainText)
    const hasApplication = /aplicación|aplicar|práctica|hoy|puedes|podemos/i.test(plainText)

    if (rules.requireVerse && wordCount > 20 && !hasVerse) {
      warnings.push({
        type: 'suggestion',
        category: 'content',
        message: 'No se detectó el versículo del día. Incluye la referencia bíblica.',
      })
    }

    if (rules.requirePrayer && wordCount > 100 && !hasPrayer) {
      warnings.push({
        type: 'suggestion',
        category: 'content',
        message: 'Falta la oración sugerida. Agrega una sección "Oración".',
      })
    }

    if (rules.requireApplication && wordCount > 100 && !hasApplication) {
      warnings.push({
        type: 'suggestion',
        category: 'content',
        message: 'Agrega una aplicación personal concreta para el lector.',
      })
    }

    if (rules.maxWords && wordCount > rules.maxWords) {
      warnings.push({
        type: 'warning',
        category: 'length',
        message: `El devocional tiene ${wordCount.toLocaleString()} palabras. Un devocional suele ser más breve (${rules.maxWords} palabras máximo).`,
      })
    }
  }

  return warnings
}

export const validateProject = (project) => {
  const template = getTemplate(project.type, project.template)
  if (!template) return []

  const allWarnings = []

  const requiredSections = template.structure.filter(s => s.required)
  const existingTypes = project.sections.map(s => s.type)

  requiredSections.forEach(req => {
    const count = project.sections.filter(s => s.type === req.type).length
    if (count === 0) {
      allWarnings.push({
        type: 'error',
        category: 'structure',
        message: `Falta la sección requerida: ${req.title}`,
      })
    }
  })

  project.sections.forEach(section => {
    const sectionWarnings = validateSection(project, section)
    sectionWarnings.forEach(w => {
      allWarnings.push({ ...w, sectionId: section.id, sectionTitle: section.title })
    })
  })

  return allWarnings
}

export const getReadingTime = (wordCount) => {
  const wordsPerMinute = 200
  const minutes = Math.ceil(wordCount / wordsPerMinute)
  return minutes
}

export const getReadingTimeLabel = (wordCount) => {
  const minutes = getReadingTime(wordCount)
  if (minutes <= 2) return '2 min'
  if (minutes <= 4) return '4 min'
  if (minutes <= 6) return '6 min'
  return `${minutes} min`
}
