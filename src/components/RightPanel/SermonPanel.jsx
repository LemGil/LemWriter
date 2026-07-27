import React, { useState, useEffect, useRef } from 'react'
import { BookOpen, Target, HelpCircle, Languages } from 'lucide-react'
import BasePanel from './BasePanel'
import BibleReferences from './BibleReferences'
import { projectService } from '../../services/projectService'
import { saveToResources, parseBibleRef } from './panelUtils'

const tabs = [
  { id: 'text', label: 'Texto base', icon: BookOpen },
  { id: 'points', label: 'Puntos', icon: Target },
  { id: 'questions', label: 'Preguntas', icon: HelpCircle },
  { id: 'words', label: 'Palabras', icon: Languages },
]

const SermonPanel = ({ section, project, onResourceChange }) => {
  const [activeTab, setActiveTab] = useState('text')
  const [references, setReferences] = useState([])
  const [points, setPoints] = useState([])
  const [questions, setQuestions] = useState([])
  const [words, setWords] = useState([])
  const [newPoint, setNewPoint] = useState('')
  const [newQuestion, setNewQuestion] = useState('')
  const [newWord, setNewWord] = useState('')
  const [newWordLang, setNewWordLang] = useState('hebreo')
  const prevRefsCount = useRef(0)

  useEffect(() => {
    if (section) {
      const parsed = parseBibleRef(section)
      setReferences(parsed.references || [])
      setPoints(parsed.points || [])
      setQuestions(parsed.questions || [])
      setWords(parsed.words || [])
      prevRefsCount.current = 0
    }
  }, [section?.id])

  const saveSectionData = async (updates) => {
    if (!section?.id) return
    const current = { references, points, questions, words, ...updates }
    await projectService.updateSection(section.id, {
      bible_reference: JSON.stringify({
        references: current.references, points: current.points,
        questions: current.questions, words: current.words,
      }),
    })
  }

  const handleReferencesChange = (newRefs) => {
    setReferences(newRefs)
    if (newRefs.length > prevRefsCount.current) {
      const added = newRefs[newRefs.length - 1]
      saveToResources(project?.id, 'pasaje_biblico', {
        title: added.text || added.reference, reference: added.reference, content: added.text || '',
      }, onResourceChange)
    }
    prevRefsCount.current = newRefs.length
    saveSectionData({ references: newRefs })
  }

  const addPoint = async () => {
    if (!newPoint.trim()) return
    const updated = [...points, { id: Date.now(), text: newPoint }]
    setPoints(updated)
    setNewPoint('')
    await saveSectionData({ points: updated })
  }

  const removePoint = async (id) => {
    const updated = points.filter(p => p.id !== id)
    setPoints(updated)
    await saveSectionData({ points: updated })
  }

  const addQuestion = async () => {
    if (!newQuestion.trim()) return
    const updated = [...questions, { id: Date.now(), text: newQuestion }]
    setQuestions(updated)
    setNewQuestion('')
    await saveSectionData({ questions: updated })
  }

  const removeQuestion = async (id) => {
    const updated = questions.filter(q => q.id !== id)
    setQuestions(updated)
    await saveSectionData({ questions: updated })
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
    <BasePanel tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} accent="brand">
      {(tab) => {
        switch (tab) {
          case 'text':
            return (
              <div>
                <p className="text-[10px] text-brand-ink-3 mb-2 font-sans">Pasaje bíblico principal del sermón</p>
                <BibleReferences
                  references={references}
                  onChange={handleReferencesChange}
                  color="brand"
                  sectionContent={section?.content}
                  projectId={project?.id}
                />
              </div>
            )

          case 'points':
            return (
              <div>
                <h4 className="text-xs font-semibold text-brand-gold-deep uppercase mb-2 font-serif">Puntos del sermón</h4>
                <div className="flex gap-1 mb-3">
                  <input value={newPoint} onChange={e => setNewPoint(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addPoint()}
                    placeholder="Nuevo punto..."
                    className="flex-1 text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold" />
                  <button onClick={addPoint} className="text-xs bg-brand-gold-pale text-brand-gold-deep px-2 py-1 rounded hover:bg-brand-gold/30 font-sans">+</button>
                </div>
                {points.map((point, idx) => (
                  <div key={point.id} className="flex items-start gap-2 text-xs bg-brand-gold-pale/60 rounded px-2 py-1.5 mb-1">
                    <span className="font-bold text-brand-gold-deep shrink-0">{idx + 1}.</span>
                    <span className="text-brand-ink flex-1">{point.text}</span>
                    <button onClick={() => removePoint(point.id)} className="text-brand-ink-3 hover:text-red-500 shrink-0">×</button>
                  </div>
                ))}
                {points.length === 0 && <p className="text-xs text-brand-ink-3 italic font-sans">Sin puntos aún</p>}
              </div>
            )

          case 'questions':
            return (
              <div>
                <h4 className="text-xs font-semibold text-brand-gold-deep uppercase mb-2 font-serif">Preguntas de aplicación</h4>
                <div className="flex gap-1 mb-3">
                  <input value={newQuestion} onChange={e => setNewQuestion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addQuestion()}
                    placeholder="Nueva pregunta..."
                    className="flex-1 text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold" />
                  <button onClick={addQuestion} className="text-xs bg-brand-gold-pale text-brand-gold-deep px-2 py-1 rounded hover:bg-brand-gold/30 font-sans">+</button>
                </div>
                {questions.map((q, idx) => (
                  <div key={q.id} className="flex items-start gap-2 text-xs bg-brand-gold-pale/60 rounded px-2 py-1.5 mb-1">
                    <span className="font-bold text-brand-gold-deep shrink-0">{idx + 1}.</span>
                    <span className="text-brand-ink flex-1">{q.text}</span>
                    <button onClick={() => removeQuestion(q.id)} className="text-brand-ink-3 hover:text-red-500 shrink-0">×</button>
                  </div>
                ))}
                {questions.length === 0 && <p className="text-xs text-brand-ink-3 italic font-sans">Sin preguntas aún</p>}
              </div>
            )

          case 'words':
            return (
              <div>
                <h4 className="text-xs font-semibold text-brand-gold-deep uppercase mb-2 font-serif">Palabras clave</h4>
                <div className="flex gap-1 mb-3">
                  <select value={newWordLang} onChange={e => setNewWordLang(e.target.value)}
                    className="text-xs border rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold">
                    <option value="hebreo">Hebreo</option>
                    <option value="griego">Griego</option>
                  </select>
                  <input value={newWord} onChange={e => setNewWord(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addWord()}
                    placeholder="Palabra..."
                    className="flex-1 text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold" />
                  <button onClick={addWord} className="text-xs bg-brand-gold-pale text-brand-gold-deep px-2 py-1 rounded hover:bg-brand-gold/30 font-sans">+</button>
                </div>
                {words.map(w => (
                  <div key={w.id} className="flex items-center gap-2 text-xs bg-brand-gold-pale/60 rounded px-2 py-1.5 mb-1">
                    <span className="font-bold text-brand-gold-deep">{w.word}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${w.language === 'hebreo' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>{w.language}</span>
                    <button onClick={() => removeWord(w.id)} className="ml-auto text-brand-ink-3 hover:text-red-500 shrink-0">×</button>
                  </div>
                ))}
                {words.length === 0 && <p className="text-xs text-brand-ink-3 italic font-sans">Sin palabras aún</p>}
              </div>
            )

          default:
            return null
        }
      }}
    </BasePanel>
  )
}

export default SermonPanel
