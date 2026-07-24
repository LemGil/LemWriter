import React, { useState } from 'react'
import { BookOpen, Plus, X } from 'lucide-react'

const BibleReferences = ({ references, onChange, color = 'blue' }) => {
  const [newRef, setNewRef] = useState('')
  const [newText, setNewText] = useState('')

  const colorMap = {
    brand: { bg: 'bg-brand-gold-pale/60', text: 'text-brand-ink', border: 'border-brand-gold/30', accent: 'bg-brand-gold-pale text-brand-gold-deep hover:bg-brand-gold', ring: 'focus:ring-brand-gold', label: 'text-brand-gold' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', accent: 'bg-blue-100 text-blue-700 hover:bg-blue-200', ring: 'focus:ring-blue-300', label: 'text-blue-600' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', accent: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200', ring: 'focus:ring-yellow-300', label: 'text-yellow-600' },
    green: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', accent: 'bg-green-100 text-green-700 hover:bg-green-200', ring: 'focus:ring-green-300', label: 'text-green-600' },
  }

  const c = colorMap[color] || colorMap.blue

  const addReference = () => {
    if (!newRef.trim()) return
    onChange([...references, { id: Date.now(), reference: newRef, text: newText }])
    setNewRef('')
    setNewText('')
  }

  const removeReference = (id) => {
    onChange(references.filter(r => r.id !== id))
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <BookOpen size={12} className={c.label} />
        <h4 className={`text-xs font-semibold uppercase ${c.label}`}>Referencias bíblicas</h4>
      </div>

      <div className="space-y-1.5 mb-3">
        <input
          value={newRef}
          onChange={e => setNewRef(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addReference()}
          placeholder="Referencia (Ej: Juan 3:16)"
          className={`w-full text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-1 ${c.ring}`}
        />
        <input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addReference()}
          placeholder="Texto del versículo (opcional)"
          className={`w-full text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-1 ${c.ring}`}
        />
        <button
          onClick={addReference}
          disabled={!newRef.trim()}
          className={`w-full text-xs py-1.5 rounded font-medium disabled:opacity-40 ${c.accent}`}
        >
          <Plus size={12} className="inline mr-1" />
          Agregar referencia
        </button>
      </div>

      <div className="space-y-1">
        {references.map(ref => (
          <div key={ref.id} className={`${c.bg} rounded px-2 py-1.5 text-xs`}>
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${c.text}`}>{ref.reference}</span>
              <button onClick={() => removeReference(ref.id)} className="text-gray-400 hover:text-red-500 shrink-0">
                <X size={12} />
              </button>
            </div>
            {ref.text && (
              <p className={`${c.text} opacity-75 mt-0.5 italic`}>{ref.text}</p>
            )}
          </div>
        ))}
        {references.length === 0 && (
          <p className="text-xs text-brand-ink-3 italic font-sans">Sin referencias aún</p>
        )}
      </div>
    </div>
  )
}

export default BibleReferences
