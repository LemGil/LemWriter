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
}

const getSectionIcon = (type) => sectionIcons[type] || '📄'

const BookTree = ({ sections, activeSection, onSelectSection, onAddChapter, onRenameSection }) => {
  const [expandedGroups, setExpandedGroups] = useState({
    front: true,
    chapters: true,
    back: true,
  })
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  const frontMatter = sections.filter(s => ['portada', 'dedicatoria', 'prologo', 'introduccion'].includes(s.type))
  const chapters = sections.filter(s => s.type === 'capitulo')
  const backMatter = sections.filter(s => ['conclusion', 'bibliografia', 'apendice'].includes(s.type))

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
    <button
      key={section.id}
      onClick={() => onSelectSection(section.id)}
      onDoubleClick={() => handleDoubleClick(section)}
      className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 rounded transition-colors group ${
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
        <span className="truncate">{section.title}</span>
      )}
    </button>
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
    </div>
  )
}

export default BookTree