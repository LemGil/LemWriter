import React, { useState, useEffect, useRef } from 'react'
import { BookOpen, Users, StickyNote, Languages, Palette } from 'lucide-react'
import BibleReferences from './BibleReferences'
import CharacterCard from './CharacterCard'
import BibleWordsPanel from './BibleWordsPanel'
import { projectService } from '../../services/projectService'
import { BOOK_STYLES } from '../../config/bookStyles'

const tabs = [
  { id: 'references', label: 'Referencias', icon: BookOpen },
  { id: 'characters', label: 'Personajes', icon: Users },
  { id: 'words', label: 'Palabras', icon: Languages },
  { id: 'notes', label: 'Notas', icon: StickyNote },
  { id: 'style', label: 'Estilo', icon: Palette },
]

const BookPanel = ({ section, project, projectStyle, onSectionUpdate, onStyleChange, onResourceChange }) => {
  const [activeTab, setActiveTab] = useState('references')
  const [references, setReferences] = useState([])
  const [characters, setCharacters] = useState([])
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [selectedStyle, setSelectedStyle] = useState(projectStyle || 'manuscrito_clasico')

  useEffect(() => {
    if (projectStyle) {
      setSelectedStyle(projectStyle)
    }
  }, [projectStyle])

  const handleStyleChange = async (styleKey) => {
    setSelectedStyle(styleKey)
    if (project?.id) {
      try {
        await projectService.updateProject(project.id, { style: styleKey })
        if (onStyleChange) onStyleChange(styleKey)
      } catch (err) {
        console.error('Error actualizando estilo:', err)
      }
    }
  }

  useEffect(() => {
    const loadData = async () => {
      if (section?.id) {
        try {
          const sectionNotes = await projectService.getNotes(section.id)
          setNotes(sectionNotes)
        } catch (err) {
          console.error('Error cargando notas:', err)
        }
      }
      if (project?.id) {
        try {
          const projectCharacters = await projectService.getCharacters(project.id)
          setCharacters(projectCharacters)
        } catch (err) {
          console.error('Error cargando personajes:', err)
        }
      }
    }
    loadData()
  }, [section?.id, project?.id])

  useEffect(() => {
    if (section) {
      try {
        const parsed = section.bible_reference ? JSON.parse(section.bible_reference) : []
        setReferences(Array.isArray(parsed) ? parsed : [])
      } catch {
        setReferences([])
      }
      prevRefsCount.current = 0
    }
  }, [section?.id])

  const prevRefsCount = useRef(0)
  const prevCharsCount = useRef(0)

  const saveToResources = async (type, data) => {
    if (!project?.id) return
    try {
      const id = await projectService.createResource({ type, ...data })
      await projectService.addResourceToProject(project.id, id)
      onResourceChange?.()
    } catch (err) {
      console.error('Error guardando en resources:', err)
    }
  }

  const handleReferencesChange = async (newRefs) => {
    setReferences(newRefs)
    if (newRefs.length > prevRefsCount.current) {
      const added = newRefs[newRefs.length - 1]
      await saveToResources('pasaje_biblico', {
        title: added.reference,
        reference: added.reference,
        content: added.text || '',
      })
    }
    prevRefsCount.current = newRefs.length
    if (section?.id) {
      await projectService.updateSection(section.id, { bible_reference: JSON.stringify(newRefs) })
      if (onSectionUpdate) onSectionUpdate(section.id)
    }
  }

  const handleAddCharacter = async (charData) => {
    if (!project?.id) return
    const saved = await projectService.addCharacter(project.id, charData)
    setCharacters(prev => [...prev, saved])
    await saveToResources('personaje_biblico', {
      title: charData.name,
      content: charData.role || '',
      notes: charData.notes || '',
      reference: charData.references || '',
    })
  }

  const handleDeleteCharacter = async (charId) => {
    await projectService.deleteCharacter(charId)
    setCharacters(prev => prev.filter(c => c.id !== charId))
  }

  const addNote = async () => {
    if (!newNote.trim() || !section?.id) return
    const saved = await projectService.addNote(section.id, { content: newNote })
    setNotes(prev => [...prev, saved])
    setNewNote('')
    await saveToResources('nota_teologica', {
      title: newNote.slice(0, 60),
      content: newNote,
    })
  }

  const deleteNote = async (noteId) => {
    await projectService.deleteNote(noteId)
    setNotes(prev => prev.filter(n => n.id !== noteId))
  }

  return (
    <div className="h-full flex flex-col">

      <div className="flex border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-2 text-[10px] font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-libro text-libro'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            title={tab.label}
          >
            <tab.icon size={14} />
            <span className="mt-0.5 leading-tight">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-3">
        {activeTab === 'references' && (
          <BibleReferences
            references={references}
            onChange={handleReferencesChange}
            color="brand"
          />
        )}

        {activeTab === 'characters' && (
          <CharacterCard
            characters={characters}
            onAdd={handleAddCharacter}
            onDelete={handleDeleteCharacter}
          />
        )}

        {activeTab === 'words' && (
          <BibleWordsPanel
            projectId={project?.id}
            color="brand"
          />
        )}

        {activeTab === 'notes' && (
          <div>
            <h4 className="text-xs font-semibold text-brand-gold-deep uppercase mb-2 font-sans">Notas del capítulo</h4>
            <div className="flex gap-1 mb-3">
              <input
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
                placeholder="Escribir nota..."
                className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold"
              />
              <button onClick={addNote} className="text-xs bg-brand-gold-pale text-brand-gold-deep px-2 py-1 rounded hover:bg-brand-gold">
                +
              </button>
            </div>
            {notes.map(note => (
              <div key={note.id} className="flex items-start justify-between text-xs bg-brand-gold-pale/60 rounded px-2 py-1.5 mb-1">
                <span className="text-brand-ink font-serif">{note.content}</span>
                <button onClick={() => deleteNote(note.id)} className="text-brand-ink-3 hover:text-red-500 shrink-0 ml-2">
                  ×
                </button>
              </div>
            ))}
            {notes.length === 0 && (
              <p className="text-xs text-brand-ink-3 italic font-sans">Sin notas aún</p>
            )}
          </div>
        )}

        {activeTab === 'style' && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 mb-3">
              <Palette size={12} className="text-brand-gold" />
              <h4 className="text-xs font-semibold text-brand-gold uppercase font-sans">Estilo del Libro</h4>
            </div>
            <p className="text-[11px] text-brand-ink-3 mb-3 font-sans">
              Elige el formato editorial para la exportación del libro.
            </p>
            <div className="space-y-2">
              {Object.entries(BOOK_STYLES).map(([key, style]) => (
                <button
                  key={key}
                  onClick={() => handleStyleChange(key)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedStyle === key
                      ? 'border-brand-gold bg-brand-gold-pale'
                      : 'border-brand-gold/20 hover:border-brand-gold/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-brand-ink font-serif">{style.label}</p>
                      <p className="text-[10px] text-brand-ink-3 mt-0.5 font-sans">{style.description}</p>
                    </div>
                    {selectedStyle === key && (
                      <span className="w-4 h-4 rounded-full border-2 border-brand-gold flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-brand-gold" />
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-[10px] text-brand-ink-3 space-y-0.5 font-sans">
                    <div>
                      <span className="font-medium">Página:</span> {style.page.size} • {style.page.marginLeft} / {style.page.marginRight} &nbsp;|&nbsp;
                      <span className="font-medium">Cuerpo:</span> {style.typography.bodyFont} {style.typography.bodySize} &nbsp;|&nbsp;
                      <span className="font-medium">Interlineado:</span> {style.typography.lineHeight}
                    </div>
                    <div>
                      <span className="font-medium">Títulos:</span> {style.headings.h1.font} {style.headings.h1.size} &nbsp;|&nbsp;
                      <span className="font-medium">Citas:</span> {style.blockquotes.shortQuote.style} &nbsp;|&nbsp;
                      <span className="font-medium">Papel:</span> {style.page.paperColor}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookPanel