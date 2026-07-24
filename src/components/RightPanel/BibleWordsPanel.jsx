import React, { useState, useEffect } from 'react'
import { Languages, Plus, X } from 'lucide-react'
import { projectService } from '../../services/projectService'

const BibleWordsPanel = ({ projectId, color = 'blue' }) => {
  const [words, setWords] = useState([])
  const [newWord, setNewWord] = useState({ word: '', language: 'hebreo', transliteration: '', meaning: '', reference: '' })
  const [isAdding, setIsAdding] = useState(false)

  const colorMap = {
    brand: { bg: 'bg-brand-gold-pale/60', text: 'text-brand-ink', accent: 'bg-brand-gold-pale text-brand-gold-deep hover:bg-brand-gold', ring: 'focus:ring-brand-gold', label: 'text-brand-gold', border: 'border-brand-gold/30' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-800', accent: 'bg-blue-100 text-blue-700 hover:bg-blue-200', ring: 'focus:ring-blue-300', label: 'text-blue-600', border: 'border-blue-200' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-800', accent: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200', ring: 'focus:ring-yellow-300', label: 'text-yellow-600', border: 'border-yellow-200' },
  }

  const c = colorMap[color] || colorMap.blue

  const loadWords = async () => {
    if (!projectId) return
    try {
      const resources = await projectService.getProjectResources(projectId)
      setWords(resources.filter(r => r.type === 'palabra_hebrea' || r.type === 'palabra_griega'))
    } catch {
      setWords([])
    }
  }

  useEffect(() => {
    loadWords()
  }, [projectId])

  const addWord = async () => {
    if (!newWord.word.trim() || !projectId) return
    try {
      const resourceId = await projectService.createResource({
        type: newWord.language === 'hebreo' ? 'palabra_hebrea' : 'palabra_griega',
        title: newWord.word,
        original_word: newWord.word,
        transliteration: newWord.transliteration,
        meaning: newWord.meaning,
        reference: newWord.reference,
      })
      await projectService.addResourceToProject(projectId, resourceId)
      setNewWord({ word: '', language: 'hebreo', transliteration: '', meaning: '', reference: '' })
      setIsAdding(false)
      loadWords()
    } catch (error) {
      console.error('Error en addWord:', error);
    }
  }

  const removeWord = async (id) => {
    try {
      await projectService.deleteResource(id)
      setWords(prev => prev.filter(w => w.id !== id))
    } catch (err) {
      console.error('Error eliminando palabra:', err)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Languages size={12} className={c.label} />
          <h4 className={`text-xs font-semibold uppercase ${c.label}`}>Palabras hebreo/griego</h4>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={`text-xs px-2 py-0.5 rounded ${c.accent}`}
        >
          <Plus size={10} className="inline mr-0.5" />
          {isAdding ? 'Cancelar' : 'Nueva'}
        </button>
      </div>

      {isAdding && (
        <div className={`${c.bg} rounded p-2 mb-3 space-y-1.5`}>
          <div className="flex gap-1.5">
            <select
              value={newWord.language}
              onChange={e => setNewWord(prev => ({ ...prev, language: e.target.value }))}
              className={`text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 ${c.ring}`}
            >
              <option value="hebreo">Hebreo</option>
              <option value="griego">Griego</option>
            </select>
            <input
              value={newWord.word}
              onChange={e => setNewWord(prev => ({ ...prev, word: e.target.value }))}
              placeholder="Palabra original"
              className={`flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 ${c.ring}`}
            />
          </div>
          <input
            value={newWord.transliteration}
            onChange={e => setNewWord(prev => ({ ...prev, transliteration: e.target.value }))}
            placeholder="Transliteración (Ej: shalom)"
            className={`w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 ${c.ring}`}
          />
          <input
            value={newWord.meaning}
            onChange={e => setNewWord(prev => ({ ...prev, meaning: e.target.value }))}
            placeholder="Significado"
            className={`w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 ${c.ring}`}
          />
          <input
            value={newWord.reference}
            onChange={e => setNewWord(prev => ({ ...prev, reference: e.target.value }))}
            placeholder="Referencia (Ej: Génesis 1:1)"
            className={`w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 ${c.ring}`}
          />
          <button
            type="button"
            onClick={addWord}
            disabled={!newWord.word.trim()}
            className={`w-full text-xs py-1.5 rounded font-medium disabled:opacity-40 ${c.accent}`}
          >
            Agregar palabra
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        {words.map(w => (
          <div key={w.id} className={`${c.bg} rounded px-2 py-1.5 text-xs`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`font-bold text-sm ${c.text}`}>{w.original_word}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${w.type === 'palabra_hebrea' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {w.type === 'palabra_hebrea' ? 'hebreo' : 'griego'}
                </span>
              </div>
              <button onClick={() => removeWord(w.id)} className="text-gray-400 hover:text-red-500">
                <X size={12} />
              </button>
            </div>
            {w.transliteration && (
              <p className={`${c.text} opacity-75 italic`}>→ {w.transliteration}</p>
            )}
            {w.meaning && (
              <p className={`${c.text} mt-0.5`}><span className="font-medium">Significado:</span> {w.meaning}</p>
            )}
            {w.reference && (
              <p className={`${c.text} opacity-60 text-[10px] mt-0.5`}>{w.reference}</p>
            )}
          </div>
        ))}
        {words.length === 0 && !isAdding && (
          <p className="text-xs text-brand-ink-3 italic font-sans">Sin palabras aún</p>
        )}
      </div>
    </div>
  )
}

export default BibleWordsPanel
