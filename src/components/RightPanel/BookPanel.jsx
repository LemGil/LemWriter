import React, { useState, useEffect, useRef } from 'react'
import { BookOpen, Users, StickyNote, Languages, Palette } from 'lucide-react'
import BasePanel from './BasePanel'
import BibleReferences from './BibleReferences'
import CharacterCard from './CharacterCard'
import BibleWordsPanel from './BibleWordsPanel'
import { projectService } from '../../services/projectService'
import { BOOK_STYLES } from '../../config/bookStyles'
import { saveToResources, parseRefsArray } from './panelUtils'

const tabs = [
  { id: 'references', label: 'Referencias', icon: BookOpen },
  { id: 'characters', label: 'Personajes', icon: Users },
  { id: 'words', label: 'Palabras', icon: Languages },
  { id: 'notes', label: 'Notas', icon: StickyNote },
  { id: 'style', label: 'Estilo', icon: Palette },
]

const BookPanel = ({ section, project, projectStyle, onSectionUpdate, onStyleChange, onResourceChange, collapsed }) => {
  const [activeTab, setActiveTab] = useState('references')
  const [references, setReferences] = useState([])
  const [characters, setCharacters] = useState([])
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [selectedStyle, setSelectedStyle] = useState(projectStyle || 'manuscrito_clasico')

  useEffect(() => {
    if (projectStyle) setSelectedStyle(projectStyle)
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
          setNotes(await projectService.getNotes(section.id))
        } catch (err) { console.error('Error cargando notas:', err) }
      }
      if (project?.id) {
        try {
          setCharacters(await projectService.getCharacters(project.id))
        } catch (err) { console.error('Error cargando personajes:', err) }
      }
    }
    loadData()
  }, [section?.id, project?.id])

  useEffect(() => {
    setReferences(parseRefsArray(section))
    prevRefsCount.current = 0
  }, [section?.id])

  const prevRefsCount = useRef(0)

  const handleReferencesChange = async (newRefs) => {
    setReferences(newRefs)
    if (newRefs.length > prevRefsCount.current) {
      const added = newRefs[newRefs.length - 1]
      await saveToResources(project?.id, 'pasaje_biblico', {
        title: added.reference, reference: added.reference, content: added.text || '',
      }, onResourceChange)
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
    await saveToResources(project.id, 'personaje_biblico', {
      title: charData.name, content: charData.role || '',
      notes: charData.notes || '', reference: charData.references || '',
    }, onResourceChange)
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
    await saveToResources(project?.id, 'nota_teologica', {
      title: newNote.slice(0, 60), content: newNote,
    }, onResourceChange)
  }

  const deleteNote = async (noteId) => {
    await projectService.deleteNote(noteId)
    setNotes(prev => prev.filter(n => n.id !== noteId))
  }

  return (
    <BasePanel tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} accent="libro" collapsed={collapsed}>
      {(tab) => {
        switch (tab) {
          case 'references':
            return (
              <BibleReferences
                references={references}
                onChange={handleReferencesChange}
                color="brand"
                sectionContent={section?.content}
                projectId={project?.id}
              />
            )

          case 'characters':
            return (
              <CharacterCard
                characters={characters}
                onAdd={handleAddCharacter}
                onDelete={handleDeleteCharacter}
              />
            )

          case 'words':
            return (
              <BibleWordsPanel projectId={project?.id} color="brand" />
            )

          case 'notes':
            return (
              <div>
                <h4 className="text-xs font-semibold text-brand-gold-deep uppercase mb-2 font-serif">Notas del capítulo</h4>
                <div className="flex gap-1 mb-3">
                  <input
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addNote()}
                    placeholder="Escribir nota..."
                    className="flex-1 text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold"
                  />
                  <button onClick={addNote} className="text-xs bg-brand-gold-pale text-brand-gold-deep px-2 py-1 rounded hover:bg-brand-gold">+</button>
                </div>
                {notes.map(note => (
                  <div key={note.id} className="flex items-start justify-between text-xs bg-brand-gold-pale/60 rounded px-2 py-1.5 mb-1">
                    <span className="text-brand-ink font-serif">{note.content}</span>
                    <button onClick={() => deleteNote(note.id)} className="text-brand-ink-3 hover:text-red-500 shrink-0 ml-2">×</button>
                  </div>
                ))}
                {notes.length === 0 && <p className="text-xs text-brand-ink-3 italic font-sans">Sin notas aún</p>}
              </div>
            )

          case 'style':
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 mb-3">
                  <Palette size={12} className="text-brand-gold" />
                  <h4 className="text-xs font-semibold text-brand-gold uppercase font-serif">Estilo del Libro</h4>
                </div>
                <p className="text-[11px] text-brand-ink-3 mb-3 font-sans">Elige el formato editorial para la exportación del libro.</p>
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
            )

          default:
            return null
        }
      }}
    </BasePanel>
  )
}

export default BookPanel
