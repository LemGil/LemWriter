import React, { useState, useEffect } from 'react'
import { BookOpen, Heart, Clock, PenTool } from 'lucide-react'
import { projectService } from '../../services/projectService'

const DevotionalPanel = ({ section, wordCount, collapsed }) => {
  const [verse, setVerse] = useState({ reference: '', text: '' })
  const [prayer, setPrayer] = useState('')
  const [application, setApplication] = useState('')

  useEffect(() => {
    if (section) {
      try {
        const parsed = section.bible_reference ? JSON.parse(section.bible_reference) : {}
        setVerse(parsed.verse || { reference: '', text: '' })
        setPrayer(parsed.prayer || '')
        setApplication(parsed.application || '')
      } catch {
        setVerse({ reference: '', text: '' })
        setPrayer('')
        setApplication('')
      }
    }
  }, [section?.id])

  const saveData = async (updates) => {
    if (!section?.id) return
    const current = { verse, prayer, application, ...updates }
    await projectService.updateSection(section.id, {
      bible_reference: JSON.stringify({
        verse: current.verse,
        prayer: current.prayer,
        application: current.application,
      }),
    })
  }

  const handleVerseChange = (field, value) => {
    const updated = { ...verse, [field]: value }
    setVerse(updated)
    saveData({ verse: updated })
  }

  const handlePrayerChange = (value) => {
    setPrayer(value)
    saveData({ prayer: value })
  }

  const handleApplicationChange = (value) => {
    setApplication(value)
    saveData({ application: value })
  }

  const readingTime = Math.ceil((wordCount || 0) / 200)

  return (
    <div className="h-full flex flex-col p-3 space-y-4">
      {collapsed ? (
        <div className="flex flex-col items-center py-2">
          <BookOpen size={20} className="text-devocional" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <BookOpen size={12} className="text-devocional" />
            <h4 className="text-xs font-semibold text-devocional uppercase">Meditación Diaria</h4>
          </div>

          <div className="flex items-center gap-2 text-xs bg-green-50 text-green-800 p-2 rounded">
            <Clock size={12} />
            <span className="font-medium">Tiempo de lectura: {readingTime} min</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <BookOpen size={10} className="text-devocional" />
              <h4 className="text-xs font-semibold text-devocional uppercase">Versículo del día</h4>
            </div>
            <input
              value={verse.reference}
              onChange={e => handleVerseChange('reference', e.target.value)}
              placeholder="Referencia (Ej: Salmo 23:1)"
              className="w-full text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-300"
            />
            <textarea
              value={verse.text}
              onChange={e => handleVerseChange('text', e.target.value)}
              placeholder="Texto del versículo..."
              rows={2}
              className="w-full text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-300 resize-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Heart size={10} className="text-devocional" />
              <h4 className="text-xs font-semibold text-devocional uppercase">Oración sugerida</h4>
            </div>
            <textarea
              value={prayer}
              onChange={e => handlePrayerChange(e.target.value)}
              placeholder="Escribe una oración de guía..."
              rows={3}
              className="w-full text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-300 resize-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <PenTool size={10} className="text-devocional" />
              <h4 className="text-xs font-semibold text-devocional uppercase">Aplicación personal</h4>
            </div>
            <textarea
              value={application}
              onChange={e => handleApplicationChange(e.target.value)}
              placeholder="¿Cómo aplicar esto hoy?"
              rows={4}
              className="w-full text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-300 resize-none"
            />
          </div>
        </>
      )}
    </div>
  )
}

export default DevotionalPanel