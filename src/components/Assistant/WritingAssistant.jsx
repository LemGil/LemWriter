import React, { useState, useEffect } from 'react'
import { Lightbulb, X, ChevronUp, ChevronDown, AlertTriangle, Info, Sparkles, Bot, MessageCircle } from 'lucide-react'
import { validateSection, getReadingTimeLabel } from '../../templates/validationEngine'

const WritingAssistant = ({ projectType, wordCount, section, sections, project, onOpenChat }) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isExpanded, setIsExpanded] = useState(true)
  const [dismissed, setDismissed] = useState([])

  const templateWarnings = (project && section) ? validateSection(project, section) : []
  const filteredWarnings = templateWarnings.filter(w => !dismissed.includes(w.category + w.type))

  const getMessage = () => {
    if (filteredWarnings.length > 0) {
      return filteredWarnings[0]
    }

    if (projectType === 'libro' || projectType === 'book') {
      if (wordCount > 3000) {
        return {
          type: 'warning',
          category: 'length',
          message: `Este capítulo supera las ${wordCount.toLocaleString()} palabras. Considera dividirlo en secciones más pequeñas.`,
        }
      }
      if (wordCount > 0 && wordCount < 50) {
        return {
          type: 'info',
          category: 'start',
          message: 'Este capítulo está empezando. Sigue escribiendo para desarrollar el contenido.',
        }
      }
    }

    if (projectType === 'ensenanza' || projectType === 'teaching') {
      if (wordCount > 0 && wordCount < 50) {
        return {
          type: 'info',
          category: 'start',
          message: 'Una clase bíblica típica incluye: Texto base, Objetivo, Puntos, Aplicación y Preguntas.',
        }
      }
    }

    if (projectType === 'devocional' || projectType === 'devotional') {
      if (wordCount > 0 && wordCount < 50) {
        return {
          type: 'info',
          category: 'start',
          message: 'Un devocional incluye: Versículo del día, Reflexión breve, Aplicación personal y Oración.',
        }
      }
    }

    if (projectType === 'estudio' || projectType === 'study') {
      if (wordCount > 0 && wordCount < 50) {
        return {
          type: 'info',
          category: 'start',
          message: 'Un estudio bíblico incluye: Texto base, Puntos de análisis, Aplicación personal y Oración.',
        }
      }
    }

    if (projectType === 'sermon') {
      if (wordCount > 0 && wordCount < 50) {
        return {
          type: 'info',
          category: 'start',
          message: 'Un sermón incluye: Texto base, Gancho, Punto principal, Ilustración, Aplicación y Llamado.',
        }
      }
      if (wordCount > 3000) {
        return {
          type: 'warning',
          category: 'length',
          message: `Este sermón supera las ${wordCount.toLocaleString()} palabras. Considera reducir el contenido para mantener la atención.`,
        }
      }
    }

    if (projectType === 'video') {
      if (wordCount > 0 && wordCount < 50) {
        return {
          type: 'info',
          category: 'start',
          message: 'Un video incluye: Gancho inicial, Texto base, Punto central, Ilustración visual y Llamado a la acción.',
        }
      }
    }

    return null
  }

  const message = getMessage()

  useEffect(() => {
    setDismissed([])
  }, [section?.id])

  if (!message || !isVisible) {
    return (
      <button
        onClick={onOpenChat}
        className="fixed bottom-4 right-4 z-50 p-3 bg-brand-gold text-white rounded-full shadow-lg hover:opacity-90 transition-opacity"
        title="Abrir chat con IA"
      >
        <MessageCircle size={20} />
      </button>
    )
  }

  const typeStyles = {
    warning: 'bg-brand-gold-pale border-brand-gold/50',
    error: 'bg-red-50 border-red-200',
    info: 'bg-brand-teal-pale border-brand-teal/30',
    suggestion: 'bg-brand-gold-shine border-brand-gold-deep/30',
  }

  const typeTextColors = {
    warning: 'text-brand-gold-deep',
    error: 'text-red-800',
    info: 'text-brand-teal',
    suggestion: 'text-brand-gold-deep',
  }

  const typeIcons = {
    warning: <AlertTriangle size={14} className="text-brand-gold" />,
    error: <AlertTriangle size={14} className="text-red-600" />,
    info: <Info size={14} className="text-brand-teal" />,
    suggestion: <Sparkles size={14} className="text-brand-gold" />,
  }

  const handleDismiss = () => {
    setDismissed(prev => [...prev, message.category + message.type])
  }

  const readingTime = project?.panelConfig?.showReadingTime ? getReadingTimeLabel(wordCount) : null

  return (
    <div className="fixed bottom-12 right-4 z-50 w-80">
      <div className={`${typeStyles[message.type]} border rounded-lg shadow-lg overflow-hidden`}>
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <Lightbulb size={14} className={typeTextColors[message.type]} />
            <span className={`text-xs font-semibold uppercase ${typeTextColors[message.type]}`}>
              Asistente
            </span>
          </div>
          <div className="flex items-center gap-1">
            {readingTime && (
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded mr-1">
                ~{readingTime} lectura
              </span>
            )}
            <button
              onClick={onOpenChat}
              className="p-0.5 hover:bg-black/5 rounded"
              title="Preguntar a IA"
            >
              <Bot size={12} className="text-purple-600" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-0.5 hover:bg-black/5 rounded"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-0.5 hover:bg-black/5 rounded"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="px-3 pb-3">
            <div className="flex items-start gap-2">
              {typeIcons[message.type]}
              <p className={`text-xs leading-relaxed ${typeTextColors[message.type]}`}>
                {message.message}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="mt-2 text-[10px] opacity-60 hover:opacity-100"
            >
              Descartar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default WritingAssistant
