import React, { useState, useRef, useEffect } from 'react'
import { ChevronRight, ChevronDown, Plus, Heart, ChevronUp, GripVertical } from 'lucide-react'

const DevotionalTree = ({ sections, activeSection, onSelectSection, onAddSection, onRenameSection, onDeleteSection, onReorderSection }) => {
  const [expandedGroups, setExpandedGroups] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)
  const draggedIdRef = useRef(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [invalidDropTooltip, setInvalidDropTooltip] = useState({ show: false, x: 0, y: 0 })

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

  // Índice global (en `sections`) del elemento DOM bajo el cursor de arrastre.
  const computeDropIndex = (targetEl) => {
    const midTarget = targetEl.getBoundingClientRect().top + targetEl.offsetHeight / 2
    let index = 0
    const rows = document.querySelectorAll('[data-section-row]')
    for (const row of rows) {
      if (row === targetEl) break
      const midRow = row.getBoundingClientRect().top + row.offsetHeight / 2
      if (midRow < midTarget) index += 1
    }
    return index
  }

  // Lista única: todas las secciones pertenecen al mismo grupo.
  const handleDragStart = (e, section) => {
    draggedIdRef.current = section.id
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', section.id)
    setExpandedGroups({ main: true })
  }

  const handleDragOver = (e, section) => {
    if (!draggedIdRef.current || draggedIdRef.current === section.id) return
    // Lista única: todas las secciones pertenecen al mismo grupo.
    setInvalidDropTooltip({ show: false, x: 0, y: 0 })
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(section.id)
  }

  const handleDrop = (e, section) => {
    e.preventDefault()
    const draggedId = draggedIdRef.current
    draggedIdRef.current = null
    setDragOverId(null)
    if (!draggedId || draggedId === section.id) return
    const targetIndex = computeDropIndex(e.currentTarget)
    onReorderSection(draggedId, targetIndex)
  }

  const handleDragEnd = () => {
    draggedIdRef.current = null
    setDragOverId(null)
    setInvalidDropTooltip({ show: false, x: 0, y: 0 })
  }

  const handleMove = (e, section, direction) => {
    e.stopPropagation()
    const from = sections.findIndex(s => s.id === section.id)
    const to = from + (direction === 'up' ? -1 : 1)
    if (to < 0 || to >= sections.length) return
    onReorderSection(section.id, to)
  }

  const renderEntry = (section) => {
    const idx = sections.findIndex(s => s.id === section.id)
    const canUp = idx > 0
    const canDown = idx < sections.length - 1
    const isDragging = draggedIdRef.current === section.id
    const isDropTarget = dragOverId === section.id

    return (
      <div
        key={section.id}
        data-section-row
        role="button"
        tabIndex={0}
        draggable
        onClick={() => onSelectSection(section.id)}
        onDoubleClick={() => handleDoubleClick(section)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectSection(section.id) }}
        onDragStart={(e) => handleDragStart(e, section)}
        onDragOver={(e) => handleDragOver(e, section)}
        onDrop={(e) => handleDrop(e, section)}
        onDragEnd={handleDragEnd}
        className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-1 rounded transition-colors group cursor-pointer ${
          activeSection === section.id
            ? 'bg-green-100 text-green-800 font-medium'
            : 'text-gray-700 hover:bg-gray-100'
        } ${isDragging ? 'opacity-50' : ''} ${isDropTarget ? 'ring-2 ring-green-400' : ''}`}
      >
        <span className="text-base shrink-0 cursor-grab active:cursor-grabbing" title="Arrastrar para reordenar">
          <GripVertical size={14} className="text-gray-300 hover:text-gray-500" />
        </span>
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
          <span className="truncate flex-1 min-w-0">{section.title}</span>
        )}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => handleMove(e, section, 'up')}
            disabled={!canUp}
            className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
            title="Subir sección"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={(e) => handleMove(e, section, 'down')}
            disabled={!canDown}
            className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
            title="Bajar sección"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={(e) => handleDelete(e, section.id)}
            className="p-1 text-gray-400 hover:text-red-500 transition-opacity"
            title="Eliminar sección"
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

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
      {invalidDropTooltip.show && (
        <div
          className="fixed z-50 px-2 py-1 text-xs bg-gray-900 text-white rounded shadow-lg pointer-events-none"
          style={{ left: invalidDropTooltip.x, top: invalidDropTooltip.y }}
        >
          Solo se puede mover dentro del mismo grupo
        </div>
      )}
    </div>
  )
}

export default DevotionalTree