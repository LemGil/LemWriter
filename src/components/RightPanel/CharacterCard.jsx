import React, { useState } from 'react'
import { Users, Plus, X, ChevronDown, ChevronRight } from 'lucide-react'

const CharacterCard = ({ characters, onAdd, onDelete }) => {
  const [newChar, setNewChar] = useState({
    name: '', hebrew_greek_name: '', meaning: '', references: '', role: '', notes: ''
  })
  const [isAdding, setIsAdding] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  const addCharacter = () => {
    if (!newChar.name.trim()) return
    onAdd(newChar)
    setNewChar({ name: '', hebrew_greek_name: '', meaning: '', references: '', role: '', notes: '' })
    setIsAdding(false)
  }

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const roleOptions = [
    'Profeta', 'Rey', 'Apóstol', 'Patriarca', 'Juez',
    'Sacerdote', 'Guerrero', 'Siervo', 'Mártir', 'Otro'
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Users size={12} className="text-brand-gold" />
          <h4 className="text-xs font-semibold text-brand-gold uppercase font-sans">Personajes bíblicos</h4>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-xs px-2 py-0.5 rounded bg-brand-gold-pale text-brand-gold-deep hover:bg-brand-gold font-sans"
        >
          <Plus size={10} className="inline mr-0.5" />
          {isAdding ? 'Cancelar' : 'Nuevo'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-brand-gold-pale/60 rounded p-2 mb-3 space-y-1.5">
          <input
            value={newChar.name}
            onChange={e => setNewChar(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Nombre del personaje"
            className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold"
          />
          <div className="flex gap-1.5">
            <input
              value={newChar.hebrew_greek_name}
              onChange={e => setNewChar(prev => ({ ...prev, hebrew_greek_name: e.target.value }))}
              placeholder="Nombre hebreo/griego"
              className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold"
            />
            <input
              value={newChar.meaning}
              onChange={e => setNewChar(prev => ({ ...prev, meaning: e.target.value }))}
              placeholder="Significado"
              className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold"
            />
          </div>
          <select
            value={newChar.role}
            onChange={e => setNewChar(prev => ({ ...prev, role: e.target.value }))}
            className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold"
          >
            <option value="">Seleccionar rol...</option>
            {roleOptions.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <input
            value={newChar.references}
            onChange={e => setNewChar(prev => ({ ...prev, references: e.target.value }))}
            placeholder="Referencias bíblicas (separadas por coma)"
            className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold"
          />
          <textarea
            value={newChar.notes}
            onChange={e => setNewChar(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Notas adicionales..."
            rows={2}
            className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold resize-none"
          />
          <button
            onClick={addCharacter}
            disabled={!newChar.name.trim()}
            className="w-full text-xs py-1.5 rounded font-medium bg-brand-gold text-white hover:bg-brand-gold-deep disabled:opacity-40 font-sans"
          >
            Agregar personaje
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        {characters.map(char => (
          <div key={char.id} className="bg-brand-gold-pale/60 rounded text-xs">
            <button
              onClick={() => toggleExpand(char.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
            >
              {expandedId === char.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span className="font-semibold text-brand-ink font-serif">{char.name}</span>
              {char.role && (
                <span className="text-[10px] bg-brand-gold-pale text-brand-gold-deep px-1.5 py-0.5 rounded-full ml-auto font-sans">
                  {char.role}
                </span>
              )}
            </button>

            {expandedId === char.id && (
              <div className="px-2 pb-2 space-y-1 border-t border-brand-gold/20 pt-1.5">
                {char.hebrew_greek_name && (
                  <p className="text-brand-ink-2 font-serif"><span className="font-medium font-sans">Original:</span> {char.hebrew_greek_name}</p>
                )}
                {char.meaning && (
                  <p className="text-brand-ink-2 font-serif"><span className="font-medium font-sans">Significado:</span> {char.meaning}</p>
                )}
                {char.references && (
                  <p className="text-brand-ink-3 italic font-serif">{char.references}</p>
                )}
                {char.notes && (
                  <p className="text-brand-ink-3 opacity-75 font-serif">{char.notes}</p>
                )}
                <button
                  onClick={() => onDelete(char.id)}
                  className="text-[10px] text-red-500 hover:text-red-700 mt-1 font-sans"
                >
                  <X size={10} className="inline mr-0.5" />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        ))}
        {characters.length === 0 && !isAdding && (
          <p className="text-xs text-brand-ink-3 italic font-sans">Sin personajes aún</p>
        )}
      </div>
    </div>
  )
}

export default CharacterCard