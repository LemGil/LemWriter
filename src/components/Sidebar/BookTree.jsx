import React, { useState, useRef, useEffect } from 'react'
import { ChevronRight, ChevronDown, Plus } from 'lucide-react'

const sectionIcons = {
  portada: '📖',
  dedicatoria: '💌',
  prologo: '📜',
  introduccion: '📝',
  capitulo: '📑',
  conclusion: '✅',
  bibliografia: '📚',
  apendice: '📎',
  tabla_contenidos: '📋',
  dia: '📅',
}

const getSectionIcon = (type) => sectionIcons[type] || '📄'

const BookTree = ({ sections, activeSection, onSelectSection, onAddChapter, onRenameSection, onDeleteSection }) => {
  const [expandedGroups, setExpandedGroups] = useState({
    front: true,
    chapters: true,
    back: true,
  })
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)

  const handleDelete = async (e, sectionId) => {
    e.stopPropagation()
    if (window.confirm('¿Eliminar esta sección?')) {
      const result = await window.api.sections.deleteSection(sectionId)
      if (result.success && onDeleteSection) {
        onDeleteSection(sectionId)
      }
    }
  }

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  const KNOWN_TYPES = ['portada', 'dedicatoria', 'prologo', 'introduccion', 'capitulo', 'conclusion', 'bibliografia', 'apendice']
  const frontMatter = sections.filter(s => ['portada', 'dedicatoria', 'prologo', 'introduccion'].includes(s.type))
  const chapters = sections.filter(s => s.type === 'capitulo')
  const backMatter = sections.filter(s => ['conclusion', 'bibliografia', 'apendice'].includes(s.type))
  const otherSections = sections.filter(s => !KNOWN_TYPES.includes(s.type))

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }))
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
    <div
      key={section.id}
      role="button"
      tabIndex={0}
      onClick={() => onSelectSection(section.id)}
      onDoubleClick={() => handleDoubleClick(section)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectSection(section.id) }}
      className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 rounded transition-colors group cursor-pointer ${
        activeSection === section.id
          ? 'bg-blue-100 text-blue-800 font-medium'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <span className="text-base shrink-0">{getSectionIcon(section.type)}</span>
      {editingId === section.id ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={() => handleConfirmRename(section.id)}
          onKeyDown={e => handleKeyDown(e, section.id)}
          onClick={e => e.stopPropagation()}
          className="min-w-0 flex-1 text-sm bg-white border border-blue-400 rounded px-1 outline-none"
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
      {/* Materias previas */}
      <div className="mb-1">
        <button
          onClick={() => toggleGroup('front')}
          className="w-full flex items-center gap-1 px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:bg-gray-100"
        >
          {expandedGroups.front ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Materias previas
        </button>
        {expandedGroups.front && (
          <div className="ml-2">
            {frontMatter.map(renderSection)}
          </div>
        )}
      </div>

      {/* Capítulos */}
      <div className="mb-1">
        <div className="flex items-center justify-between px-3 py-1">
          <button
            onClick={() => toggleGroup('chapters')}
            className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:bg-gray-100"
          >
            {expandedGroups.chapters ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Capítulos
          </button>
          <button
            onClick={onAddChapter}
            className="p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
            title="Agregar capítulo"
          >
            <Plus size={14} />
          </button>
        </div>
        {expandedGroups.chapters && (
          <div className="ml-2">
            {chapters.length === 0 && (
              <p className="text-xs text-gray-400 italic px-3 py-1">Sin capítulos</p>
            )}
            {chapters.map(renderSection)}
          </div>
        )}
      </div>

      {/* Materias finales */}
      <div className="mb-1">
        <button
          onClick={() => toggleGroup('back')}
          className="w-full flex items-center gap-1 px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:bg-gray-100"
        >
          {expandedGroups.back ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Materias finales
        </button>
        {expandedGroups.back && (
          <div className="ml-2">
            {backMatter.map(renderSection)}
          </div>
        )}
      </div>

      {/* Otras secciones */}
      {otherSections.length > 0 && (
        <div className="mb-1">
          <button
            onClick={() => toggleGroup('other')}
            className="w-full flex items-center gap-1 px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:bg-gray-100"
          >
            {expandedGroups.other ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Otras secciones ({otherSections.length})
          </button>
          {expandedGroups.other !== false && (
            <div className="ml-2">
              {otherSections.map(renderSection)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BookTree