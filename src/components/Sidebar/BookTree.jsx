import React, { useState, useRef, useEffect } from 'react'
import { ChevronRight, ChevronDown, Plus, ChevronUp, GripVertical } from 'lucide-react'

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

const FRONT_TYPES = ['portada', 'dedicatoria', 'prologo', 'introduccion']
const BACK_TYPES = ['conclusion', 'bibliografia', 'apendice']

const getGroup = (type) =>
  FRONT_TYPES.includes(type) ? 'front' : type === 'capitulo' ? 'chapters' : BACK_TYPES.includes(type) ? 'back' : 'other'

const BookTree = ({ sections, activeSection, onSelectSection, onAddChapter, onRenameSection, onDeleteSection, onReorderSection }) => {
  const [expandedGroups, setExpandedGroups] = useState({
    front: true,
    chapters: true,
    back: true,
  })
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)
  const draggedIdRef = useRef(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [invalidDropTooltip, setInvalidDropTooltip] = useState({ show: false, x: 0, y: 0 })

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

  // Índice global (en `sections`) del elemento DOM bajo el cursor de arrastre.
  // El orden de los nodos renderizados == orden de `sections`, así que contar
  // filas cuyo centro queda antes del objetivo da la posición de inserción.
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

  const handleDragStart = (e, section) => {
    draggedIdRef.current = section.id
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', section.id)
    // Expandir todos los grupos para que el índice de drop sea estable
    setExpandedGroups({ front: true, chapters: true, back: true, other: true })
  }

  const handleDragOver = (e, section) => {
    if (!draggedIdRef.current || draggedIdRef.current === section.id) return
    const draggedSection = sections.find(s => s.id === draggedIdRef.current)
    if (!draggedSection || getGroup(draggedSection.type) !== getGroup(section.type)) {
      // Mostrar tooltip de drop inválido
      setInvalidDropTooltip({
        show: true,
        x: e.clientX + 10,
        y: e.clientY + 10
      })
      return
    }
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
    const groupSections = sections.filter(s => getGroup(s.type) === getGroup(section.type))
    const from = groupSections.findIndex(s => s.id === section.id)
    const to = from + (direction === 'up' ? -1 : 1)
    if (to < 0 || to >= groupSections.length) return
    onReorderSection(section.id, sections.indexOf(groupSections[to]))
  }

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

  const renderSection = (section) => {
    const group = sections.filter(s => getGroup(s.type) === getGroup(section.type))
    const idx = group.findIndex(s => s.id === section.id)
    const canUp = idx > 0
    const canDown = idx < group.length - 1
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
        className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 rounded transition-colors group cursor-pointer ${
          activeSection === section.id
            ? 'bg-blue-100 text-blue-800 font-medium'
            : 'text-gray-700 hover:bg-gray-100'
        } ${isDragging ? 'opacity-50' : ''} ${isDropTarget ? 'ring-2 ring-blue-400' : ''}`}
      >
        <span className="text-base shrink-0 cursor-grab active:cursor-grabbing" title="Arrastrar para reordenar">
          <GripVertical size={14} className="text-gray-300 hover:text-gray-500" />
        </span>
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

export default BookTree