import React, { useState, useEffect, useRef } from 'react'
import { BookOpen, Clapperboard, StickyNote, Languages } from 'lucide-react'
import BibleReferences from './BibleReferences'
import { projectService } from '../../services/projectService'

const tabs = [
  { id: 'references', label: 'Referencias', icon: BookOpen },
  { id: 'scenes', label: 'Escenas', icon: Clapperboard },
  { id: 'notes', label: 'Notas', icon: StickyNote },
  { id: 'words', label: 'Palabras', icon: Languages },
]

const VideoPanel = ({ section, project, onResourceChange }) => {
  const [activeTab, setActiveTab] = useState('references')
  const [references, setReferences] = useState([])
  const [scenes, setScenes] = useState([])
  const [notes, setNotes] = useState('')
  const [words, setWords] = useState([])
  const [newSceneTitle, setNewSceneTitle] = useState('')
  const [newSceneDuration, setNewSceneDuration] = useState('')
  const [newWord, setNewWord] = useState('')
  const [newWordLang, setNewWordLang] = useState('hebreo')
  const prevRefsCount = useRef(0)

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

  useEffect(() => {
    if (section) {
      try {
        const parsed = section.bible_reference ? JSON.parse(section.bible_reference) : {}
        setReferences(parsed.references || [])
        setScenes(parsed.scenes || [])
        setNotes(parsed.notes || '')
        setWords(parsed.words || [])
      } catch {
        setReferences([])
        setScenes([])
        setNotes('')
        setWords([])
      }
      prevRefsCount.current = 0
    }
  }, [section?.id])

  const saveSectionData = async (updates) => {
    if (!section?.id) return
    const current = { references, scenes, notes, words, ...updates }
    await projectService.updateSection(section.id, {
      bible_reference: JSON.stringify({
        references: current.references,
        scenes: current.scenes,
        notes: current.notes,
        words: current.words,
      }),
    })
  }

  const handleReferencesChange = (newRefs) => {
    setReferences(newRefs)
    if (newRefs.length > prevRefsCount.current) {
      const added = newRefs[newRefs.length - 1]
      saveToResources('pasaje_biblico', {
        title: added.text || added.reference,
        reference: added.reference,
        content: added.text || '',
      })
    }
    prevRefsCount.current = newRefs.length
    saveSectionData({ references: newRefs })
  }

  const addScene = async () => {
    if (!newSceneTitle.trim()) return
    const updated = [...scenes, {
      id: Date.now(),
      title: newSceneTitle,
      duration: newSceneDuration || '',
      description: '',
    }]
    setScenes(updated)
    setNewSceneTitle('')
    setNewSceneDuration('')
    await saveSectionData({ scenes: updated })
  }

  const removeScene = async (id) => {
    const updated = scenes.filter(s => s.id !== id)
    setScenes(updated)
    await saveSectionData({ scenes: updated })
  }

  const updateSceneDescription = async (id, description) => {
    const updated = scenes.map(s =>
      s.id === id ? { ...s, description } : s
    )
    setScenes(updated)
    await saveSectionData({ scenes: updated })
  }

  const addWord = async () => {
    if (!newWord.trim()) return
    const word = { id: Date.now(), word: newWord, language: newWordLang }
    const updated = [...words, word]
    setWords(updated)
    setNewWord('')
    await saveSectionData({ words: updated })
  }

  const removeWord = async (id) => {
    const updated = words.filter(w => w.id !== id)
    setWords(updated)
    await saveSectionData({ words: updated })
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
                ? 'border-brand-teal text-brand-teal'
                : 'border-transparent text-brand-ink-3 hover:text-brand-ink'
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

        {activeTab === 'scenes' && (
          <div>
            <h4 className="text-xs font-semibold text-brand-teal uppercase mb-2 font-sans">Escenas del video</h4>
            <div className="flex gap-1 mb-2">
              <input
                value={newSceneTitle}
                onChange={e => setNewSceneTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addScene()}
                placeholder="Título de escena..."
                className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold"
              />
            </div>
            <div className="flex gap-1 mb-3">
              <input
                value={newSceneDuration}
                onChange={e => setNewSceneDuration(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addScene()}
                placeholder="Duración (ej. 2:30)"
                className="w-24 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold"
              />
              <button onClick={addScene} className="text-xs bg-brand-teal text-white px-2 py-1 rounded hover:bg-brand-teal/80 font-sans">
                + Agregar
              </button>
            </div>
            {scenes.map((scene, idx) => (
              <div key={scene.id} className="bg-brand-gold-pale/60 rounded px-2 py-2 mb-1.5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-brand-teal shrink-0">{idx + 1}.</span>
                    <span className="text-xs font-medium text-brand-ink">{scene.title}</span>
                    {scene.duration && (
                      <span className="text-[10px] bg-brand-teal/10 text-brand-teal px-1 rounded">{scene.duration}</span>
                    )}
                  </div>
                  <button onClick={() => removeScene(scene.id)} className="text-brand-ink-3 hover:text-red-500 text-xs shrink-0 ml-1">
                    ×
                  </button>
                </div>
                <textarea
                  value={scene.description || ''}
                  onChange={e => updateSceneDescription(scene.id, e.target.value)}
                  placeholder="Descripción visual, texto en pantalla..."
                  className="w-full text-[10px] mt-1 bg-white/60 border border-brand-gold/20 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold resize-none"
                  rows={2}
                />
              </div>
            ))}
            {scenes.length === 0 && (
              <p className="text-xs text-brand-ink-3 italic font-sans">Sin escenas aún</p>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div>
            <h4 className="text-xs font-semibold text-brand-teal uppercase mb-2 font-sans">Notas de producción</h4>
            <textarea
              value={notes}
              onChange={e => {
                setNotes(e.target.value)
                saveSectionData({ notes: e.target.value })
              }}
              placeholder="Duración total, locación, equipo necesario, estilo visual..."
              className="w-full text-xs border border-brand-gold/20 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-gold resize-none min-h-[120px]"
            />
          </div>
        )}

        {activeTab === 'words' && (
          <div>
            <h4 className="text-xs font-semibold text-brand-teal uppercase mb-2 font-sans">Palabras clave</h4>
            <div className="flex gap-1 mb-3">
              <select
                value={newWordLang}
                onChange={e => setNewWordLang(e.target.value)}
                className="text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold"
              >
                <option value="hebreo">Hebreo</option>
                <option value="griego">Griego</option>
              </select>
              <input
                value={newWord}
                onChange={e => setNewWord(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addWord()}
                placeholder="Palabra..."
                className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold"
              />
              <button onClick={addWord} className="text-xs bg-brand-teal text-white px-2 py-1 rounded hover:bg-brand-teal/80 font-sans">
                +
              </button>
            </div>
            {words.map(w => (
              <div key={w.id} className="flex items-center gap-2 text-xs bg-brand-gold-pale/60 rounded px-2 py-1.5 mb-1">
                <span className="font-bold text-brand-teal">{w.word}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${w.language === 'hebreo' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {w.language}
                </span>
                <button onClick={() => removeWord(w.id)} className="ml-auto text-brand-ink-3 hover:text-red-500 shrink-0">
                  ×
                </button>
              </div>
            ))}
            {words.length === 0 && (
              <p className="text-xs text-brand-ink-3 italic font-sans">Sin palabras aún</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoPanel
