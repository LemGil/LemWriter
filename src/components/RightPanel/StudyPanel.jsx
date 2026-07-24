import React, { useState, useEffect, useRef } from 'react'
import { BookOpen, Users, Languages, StickyNote, HelpCircle, Target, Lightbulb } from 'lucide-react'
import BibleReferences from './BibleReferences'
import CharacterCard from './CharacterCard'
import BibleWordsPanel from './BibleWordsPanel'
import { projectService } from '../../services/projectService'

const tabs = [
  { id: 'references', label: 'Pasajes', icon: BookOpen },
  { id: 'characters', label: 'Personajes', icon: Users },
  { id: 'words', label: 'Palabras', icon: Languages },
  { id: 'notes', label: 'Notas', icon: StickyNote },
  { id: 'questions', label: 'Preguntas', icon: HelpCircle },
  { id: 'points', label: 'Puntos', icon: Target },
  { id: 'themes', label: 'Temas', icon: Lightbulb },
]

const StudyPanel = ({ project, section, onSectionUpdate, onResourceChange }) => {
  const [activeTab, setActiveTab] = useState('references')
  const [references, setReferences] = useState([])
  const [characters, setCharacters] = useState([])
  const [words, setWords] = useState([])
  const [sectionNotes, setSectionNotes] = useState([])
  const [questions, setQuestions] = useState([])
  const [points, setPoints] = useState([])
  const [themes, setThemes] = useState([])
  const [newNoteText, setNewNoteText] = useState('')
  const [newQuestionText, setNewQuestionText] = useState('')
  const [newPointText, setNewPointText] = useState('')
  const [isAddingTheme, setIsAddingTheme] = useState(false)
  const [newThemeTitle, setNewThemeTitle] = useState('')
  const [newThemeContent, setNewThemeContent] = useState('')
  const [isAddingWord, setIsAddingWord] = useState(false)
  const [newWord, setNewWord] = useState({ word: '', language: 'hebreo', transliteration: '', meaning: '', reference: '' })

  const prevRefsCount = useRef(0)
  const prevQuestionsCount = useRef(0)
  const prevPointsCount = useRef(0)

  const saveToResources = async (type, data) => {
    if (!project?.id) return
    try {
      const id = await projectService.createResource({ type, ...data })
      await projectService.addResourceToProject(project.id, id)
      onResourceChange?.()
    } catch (err) {
      console.error('Error saving resource:', err)
    }
  }

  const saveSectionBibleRef = async (updates) => {
    if (!section?.id) return
    const current = {
      references,
      questions,
      points,
      notes: sectionNotes,
      ...updates,
    }
    await projectService.updateSection(section.id, {
      bible_reference: JSON.stringify({
        references: current.references,
        questions: current.questions,
        points: current.points,
      }),
    })
    if (onSectionUpdate) onSectionUpdate(section.id)
  }

  useEffect(() => {
    if (!project?.id) return
    const loadAll = async () => {
      try {
        const res = await projectService.getProjectResources(project.id)
        setWords(res.filter(r => r.type === 'palabra_hebrea' || r.type === 'palabra_griega'))
        setThemes(res.filter(r => r.type === 'tema_doctrinal'))
      } catch (err) {
        console.error('Error loading resources:', err)
      }
      try {
        const projectCharacters = await projectService.getCharacters(project.id)
        setCharacters(projectCharacters)
      } catch (err) {
        console.error('Error loading characters:', err)
      }
    }
    loadAll()
  }, [project?.id])

  useEffect(() => {
    if (!section?.id) return
    const parsed = (() => {
      try { return section.bible_reference ? JSON.parse(section.bible_reference) : {} }
      catch { return {} }
    })()
    setReferences(parsed.references || [])
    setQuestions(parsed.questions || [])
    setPoints(parsed.points || [])
    prevRefsCount.current = (parsed.references || []).length
    prevQuestionsCount.current = (parsed.questions || []).length
    prevPointsCount.current = (parsed.points || []).length

    const loadNotes = async () => {
      try {
        const notes = await projectService.getNotes(section.id)
        setSectionNotes(notes)
      } catch (err) {
        console.error('Error loading notes:', err)
      }
    }
    loadNotes()
  }, [section?.id])

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
    await saveSectionBibleRef({ references: newRefs })
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
    if (!newNoteText.trim() || !section?.id) return
    const saved = await projectService.addNote(section.id, { content: newNoteText })
    setSectionNotes(prev => [...prev, saved])
    setNewNoteText('')
    await saveToResources('nota_estudio', {
      title: newNoteText.slice(0, 60),
      content: newNoteText,
    })
  }

  const deleteNote = async (noteId) => {
    await projectService.deleteNote(noteId)
    setSectionNotes(prev => prev.filter(n => n.id !== noteId))
  }

  const addQuestion = async () => {
    if (!newQuestionText.trim()) return
    const updated = [...questions, { id: Date.now(), text: newQuestionText }]
    setQuestions(updated)
    setNewQuestionText('')
    await saveToResources('pregunta_estudio', {
      title: newQuestionText.slice(0, 60),
      content: newQuestionText,
    })
    await saveSectionBibleRef({ questions: updated })
  }

  const deleteQuestion = async (qId) => {
    const updated = questions.filter(q => q.id !== qId)
    setQuestions(updated)
    await saveSectionBibleRef({ questions: updated })
  }

  const addPoint = async () => {
    if (!newPointText.trim()) return
    const updated = [...points, { id: Date.now(), text: newPointText }]
    setPoints(updated)
    setNewPointText('')
    await saveToResources('punto_estudio', {
      title: newPointText.slice(0, 60),
      content: newPointText,
    })
    await saveSectionBibleRef({ points: updated })
  }

  const deletePoint = async (pId) => {
    const updated = points.filter(p => p.id !== pId)
    setPoints(updated)
    await saveSectionBibleRef({ points: updated })
  }

  const addTheme = async () => {
    if (!newThemeTitle.trim() || !project?.id) return
    await saveToResources('tema_doctrinal', {
      title: newThemeTitle,
      content: newThemeContent || '',
    })
    setNewThemeTitle('')
    setNewThemeContent('')
    setIsAddingTheme(false)
    const res = await projectService.getProjectResources(project.id)
    setThemes(res.filter(r => r.type === 'tema_doctrinal'))
  }

  const deleteTheme = async (tId) => {
    await projectService.deleteResource(tId)
    setThemes(prev => prev.filter(t => t.id !== tId))
  }

  const addWord = async () => {
    if (!newWord.word.trim() || !project?.id) return
    const wordType = newWord.language === 'hebreo' ? 'palabra_hebrea' : 'palabra_griega'
    await saveToResources(wordType, {
      title: newWord.word,
      content: newWord.meaning || '',
      notes: JSON.stringify({ transliteration: newWord.transliteration }),
      reference: newWord.reference || '',
    })
    setNewWord({ word: '', language: 'hebreo', transliteration: '', meaning: '', reference: '' })
    setIsAddingWord(false)
    const res = await projectService.getProjectResources(project.id)
    setWords(res.filter(r => r.type === 'palabra_hebrea' || r.type === 'palabra_griega'))
  }

  const deleteWord = async (wordId) => {
    await projectService.deleteResource(wordId)
    setWords(prev => prev.filter(w => w.id !== wordId))
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-2 text-[10px] font-medium border-b-2 transition-colors min-w-[40px] ${
              activeTab === tab.id
                ? 'border-brand-gold text-brand-teal'
                : 'border-transparent text-brand-ink-3 hover:text-brand-ink'
            }`}
            title={tab.label}
          >
            <tab.icon size={14} />
            <span className="mt-0.5 leading-tight truncate max-w-full">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-3">
        {activeTab === 'references' && (
          <div>
            <BibleReferences
              references={references}
              onChange={handleReferencesChange}
              color="brand"
            />
            {references.length > 0 && (
              <div className="mt-3 pt-3 border-t theme-border">
                <p className="text-[10px] text-brand-ink-3 font-sans">{references.length} pasaje(s) en esta sección</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'characters' && (
            <CharacterCard
              characters={characters.map(c => ({
                id: c.id,
                name: c.name,
                hebrew_greek_name: c.hebrew_greek_name || '',
                meaning: c.meaning || '',
                role: c.role || '',
                references: c.references || '',
                notes: c.notes || '',
              }))}
            onAdd={handleAddCharacter}
            onDelete={(charId) => handleDeleteCharacter(charId)}
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
            <h4 className="text-xs font-semibold text-brand-gold-deep uppercase mb-2 font-sans">Notas de estudio</h4>
            <div className="flex gap-1 mb-3">
              <input
                value={newNoteText}
                onChange={e => setNewNoteText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addNote() }}
                placeholder="Escribir nota..."
                className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold"
              />
              <button onClick={addNote} className="text-xs bg-brand-gold-pale text-brand-gold-deep px-2 py-1 rounded hover:bg-brand-gold">
                +
              </button>
            </div>
            {sectionNotes.map(note => (
              <div key={note.id} className="flex items-start justify-between text-xs bg-brand-gold-pale/60 rounded px-2 py-1.5 mb-1">
                <span className="text-brand-ink font-serif">{note.content}</span>
                <button onClick={() => deleteNote(note.id)} className="text-brand-ink-3 hover:text-red-500 shrink-0 ml-2">
                  ×
                </button>
              </div>
            ))}
            {sectionNotes.length === 0 && (
              <p className="text-xs text-brand-ink-3 italic font-sans">Sin notas aún</p>
            )}
          </div>
        )}

        {activeTab === 'questions' && (
          <div>
            <h4 className="text-xs font-semibold text-brand-gold-deep uppercase mb-2 font-sans">Preguntas de reflexión</h4>
            <div className="flex gap-1 mb-3">
              <input
                value={newQuestionText}
                onChange={e => setNewQuestionText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addQuestion() }}
                placeholder="Nueva pregunta..."
                className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold"
              />
              <button onClick={addQuestion} className="text-xs bg-brand-gold-pale text-brand-gold-deep px-2 py-1 rounded hover:bg-brand-gold">
                +
              </button>
            </div>
            {questions.map((q, idx) => (
              <div key={q.id} className="flex items-start gap-2 text-xs bg-brand-gold-pale/60 rounded px-2 py-1.5 mb-1">
                <span className="font-bold text-brand-teal shrink-0">{idx + 1}.</span>
                <span className="text-brand-ink flex-1 font-serif">{q.text}</span>
                <button onClick={() => deleteQuestion(q.id)} className="text-brand-ink-3 hover:text-red-500 shrink-0">
                  ×
                </button>
              </div>
            ))}
            {questions.length === 0 && (
              <p className="text-xs text-brand-ink-3 italic font-sans">Sin preguntas aún</p>
            )}
          </div>
        )}

        {activeTab === 'points' && (
          <div>
            <h4 className="text-xs font-semibold text-brand-gold-deep uppercase mb-2 font-sans">Puntos clave</h4>
            <div className="flex gap-1 mb-3">
              <input
                value={newPointText}
                onChange={e => setNewPointText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addPoint() }}
                placeholder="Nuevo punto..."
                className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold"
              />
              <button onClick={addPoint} className="text-xs bg-brand-gold-pale text-brand-gold-deep px-2 py-1 rounded hover:bg-brand-gold">
                +
              </button>
            </div>
            {points.map((p, idx) => (
              <div key={p.id} className="flex items-start gap-2 text-xs bg-brand-gold-pale/60 rounded px-2 py-1.5 mb-1">
                <span className="font-bold text-brand-teal shrink-0">{idx + 1}.</span>
                <span className="text-brand-ink flex-1 font-serif">{p.text}</span>
                <button onClick={() => deletePoint(p.id)} className="text-brand-ink-3 hover:text-red-500 shrink-0">
                  ×
                </button>
              </div>
            ))}
            {points.length === 0 && (
              <p className="text-xs text-brand-ink-3 italic font-sans">Sin puntos aún</p>
            )}
          </div>
        )}

        {activeTab === 'themes' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-brand-gold-deep uppercase font-sans">Temas doctrinales</h4>
              <button
                onClick={() => setIsAddingTheme(!isAddingTheme)}
                className="text-xs px-2 py-0.5 rounded bg-brand-gold-pale text-brand-gold-deep hover:bg-brand-gold font-sans"
              >
                {isAddingTheme ? 'Cancelar' : '+ Nuevo'}
              </button>
            </div>

            {isAddingTheme && (
              <div className="bg-brand-gold-pale/60 rounded p-2 mb-3 space-y-1.5">
                <input
                  value={newThemeTitle}
                  onChange={e => setNewThemeTitle(e.target.value)}
                  placeholder="Título del tema..."
                  className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold"
                />
                <textarea
                  value={newThemeContent}
                  onChange={e => setNewThemeContent(e.target.value)}
                  placeholder="Descripción o notas..."
                  rows={3}
                  className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold resize-none"
                />
                <button
                  onClick={addTheme}
                  disabled={!newThemeTitle.trim()}
                  className="w-full text-xs py-1.5 rounded font-medium bg-brand-gold text-white hover:bg-brand-gold-deep disabled:opacity-40"
                >
                  Agregar tema
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              {themes.map(t => (
                <div key={t.id} className="bg-brand-gold-pale/60 rounded px-2 py-1.5">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold text-brand-ink font-serif">{t.title}</span>
                    <button onClick={() => deleteTheme(t.id)} className="text-brand-ink-3 hover:text-red-500 shrink-0 ml-2">
                      ×
                    </button>
                  </div>
                  {t.content && (
                    <p className="text-xs text-brand-ink-2 mt-0.5 font-serif">{t.content}</p>
                  )}
                </div>
              ))}
              {themes.length === 0 && !isAddingTheme && (
                <p className="text-xs text-brand-ink-3 italic font-sans">Sin temas aún</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StudyPanel
