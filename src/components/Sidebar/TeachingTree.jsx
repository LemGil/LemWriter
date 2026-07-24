import React, { useState, useRef, useEffect } from 'react'
import { ChevronRight, ChevronDown, Plus, BookOpen, GraduationCap } from 'lucide-react'

const TeachingTree = ({ sections, activeSection, onSelectSection, onAddSection, onRenameSection, icon: HeaderIcon, title = 'Estudio actual', addLabel = 'Agregar clase' }) => {
  const Icon = HeaderIcon || GraduationCap
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

  const renderSection = (section) => (
    <button
      key={section.id}
      onClick={() => onSelectSection(section.id)}
      onDoubleClick={() => handleDoubleClick(section)}
      className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 rounded transition-colors group ${
        activeSection === section.id
          ? 'bg-yellow-100 text-yellow-800 font-medium'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <BookOpen size={14} className="text-yellow-600 shrink-0" />
      {editingId === section.id ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={() => handleConfirmRename(section.id)}
          onKeyDown={e => handleKeyDown(e, section.id)}
          onClick={e => e.stopPropagation()}
          className="min-w-0 flex-1 text-sm bg-white border border-yellow-400 rounded px-1 outline-none"
        />
      ) : (
        <span className="truncate">{section.title}</span>
      )}
    </button>
  )

  const seriesGroups = []
  const currentSeries = { title, sections: [] }

  sections.forEach(section => {
    currentSeries.sections.push(section)
  })

  if (currentSeries.sections.length > 0) {
    seriesGroups.push(currentSeries)
  }

  return (
    <div className="py-2">
      {seriesGroups.length === 0 && (
        <div className="px-3 py-4 text-center">
          <Icon size={24} className="mx-auto text-gray-300 mb-2" />
          <p className="text-xs text-gray-400">Nueva sección</p>
          <button
            onClick={onAddSection}
            className="mt-2 text-xs text-yellow-600 hover:text-yellow-700 font-medium"
          >
            + Agregar primera sección
          </button>
        </div>
      )}

      {seriesGroups.map((series, idx) => (
        <div key={idx} className="mb-1">
          <button
            onClick={() => toggleGroup('main')}
            className="w-full flex items-center gap-1 px-3 py-1 text-xs font-semibold text-yellow-700 uppercase tracking-wide hover:bg-yellow-50"
          >
            {expandedGroups.main ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Icon size={12} />
            {series.title}
          </button>

          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-xs text-gray-400">{series.sections.length} secciones</span>
            <button
              onClick={onAddSection}
              className="p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
              title="Agregar clase"
            >
              <Plus size={14} />
            </button>
          </div>

          {expandedGroups.main !== false && (
            <div className="ml-2">
              {series.sections.map(renderSection)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default TeachingTree
