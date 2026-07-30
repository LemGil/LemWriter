import React, { useState, useRef, useEffect } from 'react'
import { ChevronRight, ChevronDown, Plus, Heart } from 'lucide-react'

const DevotionalTree = ({ sections, activeSection, onSelectSection, onAddSection, onRenameSection, onDeleteSection }) => {
  const [expandedGroups, setExpandedGroups] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  const toggleGroup = (id) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleDelete = async (e, sectionId) => {
    e.stopPropagation()
    if (window.confirm('¿Eliminar esta sección?')) {
      const result = await window.api.sections.deleteSection(sectionId)
      if (result.success && onDeleteSection) {
        onDeleteSection(sectionId)
      }
    }
  }

  const handleDoubleClick = (section) => {
    setEditingId(section.id)
    setEditValue(section.title)
  }

  const handleConfirmRename = (sectionId) => {
    const trimmed = editValue.trim()
    if (trimmed && onRenameSection) {
      onRenameSection(sectionId, trimmed)
    }
    setEditingId(null)
  }

  const handleCancelRename = () => {
    setEditingId(null)
  }

  const handleKeyDown = (e, sectionId) => {
    if (e.key === 'Enter') handleConfirmRename(sectionId)
    if (e.key === 'Escape') handleCancelRename()
  }

  const renderEntry = (section) => (
    <div
      key={section.id}
      role="button"
      tabIndex={0}
      onClick={() => onSelectSection(section.id)}
      onDoubleClick={() => handleDoubleClick(section)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectSection(section.id) }}
      className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 rounded transition-colors group cursor-pointer ${
        activeSection === section.id
          ? 'bg-green-100 text-green-800 font-medium'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <Heart size={14} className="text-green-600 shrink-0" />
      {editingId === section.id ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={() => handleConfirmRename(section.id)}
          onKeyDown={e => handleKeyDown(e, section.id)}
          onClick={e => e.stopPropagation()}
          className="min-w-0 flex-1 text-sm bg-white border border-green-400 rounded px-1 outline-none"
        />
      ) : (
        <span className="truncate flex-1">{section.title}</span>
      )}
      <button
        onClick={(e) => handleDelete(e, section.id)}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
        title="Eliminar sección"
      >
        ✕
      </button>
    </div>
  )

  return (
    <div className="py-2">
      {sections.length === 0 && (
        <div className="px-3 py-4 text-center">
          <Heart size={24} className="mx-auto text-gray-300 mb-2" />
          <p className="text-xs text-gray-400">Nueva colección devocional</p>
          <button
            onClick={onAddSection}
            className="mt-2 text-xs text-green-600 hover:text-green-700 font-medium"
          >
            + Agregar primera entrada
          </button>
        </div>
      )}

      {sections.length > 0 && (
        <div className="mb-1">
          <button
            onClick={() => toggleGroup('main')}
            className="w-full flex items-center gap-1 px-3 py-1 text-xs font-semibold text-green-700 uppercase tracking-wide hover:bg-green-50"
          >
            {expandedGroups.main ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Heart size={12} />
            Devocionales
          </button>

          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-xs text-gray-400">{sections.length} entradas</span>
            <button
              onClick={onAddSection}
              className="p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
              title="Agregar entrada"
            >
              <Plus size={14} />
            </button>
          </div>

          {expandedGroups.main !== false && (
            <div className="ml-2">
              {sections.map(renderEntry)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DevotionalTree
