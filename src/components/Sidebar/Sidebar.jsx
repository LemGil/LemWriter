import React, { useState, useEffect, useRef } from 'react'
import { Search, Filter, Plus, BookOpen, Pencil, Check, X } from 'lucide-react'
import BookTree from './BookTree'
import TeachingTree from './TeachingTree'
import DevotionalTree from './DevotionalTree'
import { getTemplate } from '../../templates/definitions'
import { RESOURCE_FORMATS } from '../../config/resourceFormats'
import { projectService } from '../../services/projectService'
import useAppStore from '../../stores/appStore'

const typeLabels = {
  libro: { label: 'Libro', color: 'text-libro', bg: 'bg-brand-teal-pale', icon: '📚' },
  book: { label: 'Libro', color: 'text-libro', bg: 'bg-brand-teal-pale', icon: '📚' },
  ensenanza: { label: 'Enseñanza', color: 'text-ensenanza', bg: 'bg-brand-gold-pale', icon: '📖' },
  teaching: { label: 'Enseñanza', color: 'text-ensenanza', bg: 'bg-brand-gold-pale', icon: '📖' },
  devocional: { label: 'Devocional', color: 'text-devocional', bg: 'bg-devocional/10', icon: '🙏' },
  devotional: { label: 'Devocional', color: 'text-devocional', bg: 'bg-devocional/10', icon: '🙏' },
  estudio: { label: 'Estudio Bíblico', color: 'text-brand-ink-2', bg: 'bg-brand-cream', icon: '🔍' },
  study: { label: 'Estudio Bíblico', color: 'text-brand-ink-2', bg: 'bg-brand-cream', icon: '🔍' },
  sermon: { label: 'Sermón', color: 'text-brand-gold', bg: 'bg-brand-gold-shine', icon: '🎙️' },
  video: { label: 'Video', color: 'text-brand-teal-mid', bg: 'bg-brand-teal-pale', icon: '🎬' },
}

const typeFilterOptions = [
  { value: '', label: 'Todos' },
  ...Object.entries(RESOURCE_FORMATS).map(([key, fmt]) => ({
    value: key,
    label: fmt.label,
  })),
]

const Sidebar = ({ projectType, projectId, sections, activeSection, onSelectSection, onAddSection, onAddSectionFromTemplate, onRenameSection, onDeleteSection, projectTitle, templateKey, onInsertResource, resourceRefreshKey }) => {
  const collapsed = useAppStore((s) => s.isLeftCollapsed)
  const [activeTab, setActiveTab] = useState('structure')
  const [resources, setResources] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [resourceRefresh, setResourceRefresh] = useState(0)
  const [editingResource, setEditingResource] = useState(null)
  const [editForm, setEditForm] = useState({})

  const typeInfo = typeLabels[projectType] || typeLabels.book
  const template = getTemplate(projectType, templateKey)

  useEffect(() => {
    if (!projectId || activeTab !== 'resources') return

    if (searchQuery || typeFilter) {
      projectService.searchResources(searchQuery, typeFilter).then(setResources).catch(() => setResources([]))
    } else {
      projectService.getProjectResources(projectId).then(setResources).catch(() => setResources([]))
    }
  }, [projectId, activeTab, resourceRefresh, searchQuery, typeFilter, resourceRefreshKey])

  const startEdit = (r) => {
    setEditingResource(r.id)
    setEditForm({ title: r.title || '', content: r.content || '', reference: r.reference || '', notes: r.notes || '' })
  }

  const cancelEdit = () => {
    setEditingResource(null)
    setEditForm({})
  }

  const saveEdit = async (r) => {
    const updates = {}
    if (editForm.title !== (r.title || '')) updates.title = editForm.title
    if (editForm.content !== (r.content || '')) updates.content = editForm.content
    if (editForm.reference !== (r.reference || '')) updates.reference = editForm.reference
    if (editForm.notes !== (r.notes || '')) updates.notes = editForm.notes
    if (Object.keys(updates).length > 0) {
      await projectService.updateResource(r.id, updates)
      setResourceRefresh(k => k + 1)
    }
    setEditingResource(null)
    setEditForm({})
  }

  const handleAddSection = () => {
    if (onAddSectionFromTemplate) {
      onAddSectionFromTemplate()
      return
    }

    const now = Date.now()

    if (projectType === 'book' || projectType === 'libro') {
      const chapterNum = sections.filter(s => s.type === 'capitulo').length + 1
      const template = getTemplate('book', templateKey)
      const defaultContent = template?.defaultContent?.capitulo || ''
      onAddSection({
        id: `sec-${now}`,
        type: 'capitulo',
        title: `Capítulo ${chapterNum}`,
        content: defaultContent,
        template_type: 'expositivo',
        order_index: sections.length,
      })
    } else if (projectType === 'teaching' || projectType === 'ensenanza') {
      const entryNum = sections.length + 1
      const template = getTemplate('teaching', templateKey)
      const defaultContent = template?.defaultContent?.clase || ''
      onAddSection({
        id: `entry-${now}`,
        type: 'clase',
        title: `Clase ${entryNum}`,
        content: defaultContent,
        template_type: 'clase',
        order_index: sections.length,
      })
    } else if (projectType === 'estudio' || projectType === 'study') {
      const entryNum = sections.length + 1
      const template = getTemplate('study', templateKey)
      const defaultContent = template?.defaultContent?.punto || ''
      onAddSection({
        id: `entry-${now}`,
        type: 'punto',
        title: `Punto ${entryNum}`,
        content: defaultContent,
        template_type: 'punto',
        order_index: sections.length,
      })
    } else if (projectType === 'sermon') {
      const entryNum = sections.length + 1
      const template = getTemplate('sermon', templateKey)
      const defaultContent = template?.defaultContent?.sermon || ''
      onAddSection({
        id: `entry-${now}`,
        type: 'sermon',
        title: `Sermón ${entryNum}`,
        content: defaultContent,
        order_index: sections.length,
      })
    } else if (projectType === 'video') {
      const entryNum = sections.length + 1
      const template = getTemplate('video', templateKey)
      const defaultContent = template?.defaultContent?.video_largo || ''
      onAddSection({
        id: `entry-${now}`,
        type: 'video_largo',
        title: `Video ${entryNum}`,
        content: defaultContent,
        order_index: sections.length,
      })
    } else {
      const entryNum = sections.length + 1
      const template = getTemplate('devotional', templateKey)
      const defaultContent = template?.defaultContent?.dia || ''
      onAddSection({
        id: `entry-${now}`,
        type: 'dia',
        title: `Día ${entryNum}`,
        content: defaultContent,
        template_type: 'devocional',
        order_index: sections.length,
      })
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className={`px-3 py-3 border-b ${typeInfo.bg} ${collapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center gap-2 ${collapsed ? 'flex-col gap-1' : ''}`}>
          <span className={`${collapsed ? 'text-2xl' : 'text-lg'}`}>{typeInfo.icon}</span>
          {!collapsed && (
            <div className="min-w-0">
              <p className={`text-xs font-semibold uppercase tracking-wide ${typeInfo.color}`}>
                {typeInfo.label}
              </p>
              <p className="text-sm font-medium theme-text truncate">{projectTitle}</p>
              {template && (
                <p className="text-[10px] text-brand-ink-3 truncate font-sans">{template.name}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={`flex border-b ${collapsed ? 'flex-col items-center py-2' : ''}`}>
        <button
          onClick={() => setActiveTab('structure')}
          className={`flex-1 text-xs font-semibold py-2 border-b-2 transition-colors font-sans ${
            activeTab === 'structure'
              ? 'border-brand-gold text-brand-teal'
              : 'border-transparent text-brand-ink-3 hover:text-brand-ink'
          } ${collapsed ? 'p-2 border-b-0 border-r-2' : ''}`}
          title="Estructura"
        >
          {collapsed ? <BookOpen size={16} /> : 'Estructura'}
        </button>
        <button
          onClick={() => {
            setActiveTab('resources')
            setResourceRefresh(k => k + 1)
          }}
          className={`flex-1 text-xs font-semibold py-2 border-b-2 transition-colors font-sans ${
            activeTab === 'resources'
              ? 'border-brand-gold text-brand-teal'
              : 'border-transparent text-brand-ink-3 hover:text-brand-ink'
          } ${collapsed ? 'p-2 border-b-0 border-r-2' : ''}`}
          title="Recursos"
        >
          {collapsed ? <Search size={16} /> : 'Recursos'}
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`flex-1 text-xs font-semibold py-2 border-b-2 transition-colors font-sans ${
            activeTab === 'progress'
              ? 'border-brand-gold text-brand-teal'
              : 'border-transparent text-brand-ink-3 hover:text-brand-ink'
          } ${collapsed ? 'p-2 border-b-0 border-r-2' : ''}`}
          title="Progreso"
        >
          {collapsed ? <Check size={16} /> : 'Progreso'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {collapsed ? (
          <>
            {activeTab === 'structure' && (
              <div className="flex flex-col items-center py-3 gap-2">
                {sections.length === 0 && (
                  <span className="text-[10px] text-brand-ink-3 font-sans">—</span>
                )}
                {sections.map((sec) => {
                  const sectionTypeIcon = {
                    portada: '📘', dedicatoria: '💝', prologo: '📜',
                    introduccion: '🔍', capitulo: '📄', conclusion: '🏁',
                    bibliografia: '📚', apendice: '📎', clase: '📖',
                    dia: '📅', punto: '📌', sermon: '🎙️',
                    video_largo: '🎬',
                  }[sec.type] || '📋';

                  return (
                    <button
                      key={sec.id}
                      onClick={() => onSelectSection(sec.id)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all ${
                        activeSection === sec.id
                          ? 'bg-brand-gold/20 ring-1 ring-brand-gold'
                          : 'hover:bg-brand-ink-3/10'
                      }`}
                      title={sec.title}
                    >
                      {sectionTypeIcon}
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="relative">
                  <Search size={18} className="theme-text-muted" />
                  {resources.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand-gold text-white text-[8px] flex items-center justify-center font-bold">
                      {resources.length > 9 ? '9+' : resources.length}
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-brand-ink-3 font-sans text-center leading-tight px-1">
                  {resources.length === 1 ? '1 recurso' : `${resources.length} recursos`}
                </span>
              </div>
            )}

            {activeTab === 'progress' && (
              <div className="flex flex-col items-center py-6 gap-2">
                {(() => {
                  const completedSections = sections.filter(s => {
                    const text = s.content?.replace(/<[^>]*>/g, '') || ''
                    return text.trim().length > 100
                  })
                  const total = sections.length
                  const completedCount = completedSections.length
                  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0
                  const circumference = 2 * Math.PI * 16
                  const offset = circumference - (pct / 100) * circumference
                  return (
                    <>
                      <svg width="40" height="40" viewBox="0 0 40 40" className="transform -rotate-90">
                        <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="3"
                          className="text-brand-gold/20" />
                        <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="3"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          className="text-brand-gold transition-all duration-500" />
                      </svg>
                      <span className="text-[10px] font-bold text-brand-gold font-sans -mt-8">{pct}%</span>
                      <span className="text-[9px] text-brand-ink-3 font-sans mt-6">{completedCount}/{total}</span>
                    </>
                  )
                })()}
              </div>
            )}
          </>
        ) : (
          <>
            {activeTab === 'structure' && (
              <>
                {(projectType === 'book' || projectType === 'libro') && (
                  <BookTree
                    sections={sections}
                    activeSection={activeSection}
                    onSelectSection={onSelectSection}
                    onAddChapter={handleAddSection}
                    onRenameSection={onRenameSection}
                    onDeleteSection={onDeleteSection}
                  />
                )}
                {(projectType === 'teaching' || projectType === 'ensenanza' || projectType === 'estudio' || projectType === 'study') && (
                  <TeachingTree
                    sections={sections}
                    activeSection={activeSection}
                    onSelectSection={onSelectSection}
                    onAddSection={handleAddSection}
                    onRenameSection={onRenameSection}
                    onDeleteSection={onDeleteSection}
                  />
                )}
                {(projectType === 'devotional' || projectType === 'devocional') && (
                  <DevotionalTree
                    sections={sections}
                    activeSection={activeSection}
                    onSelectSection={onSelectSection}
                    onAddSection={handleAddSection}
                    onRenameSection={onRenameSection}
                    onDeleteSection={onDeleteSection}
                  />
                )}
                {(projectType === 'sermon') && (
                  <TeachingTree
                    sections={sections}
                    activeSection={activeSection}
                    onSelectSection={onSelectSection}
                    onAddSection={handleAddSection}
                    onRenameSection={onRenameSection}
                    onDeleteSection={onDeleteSection}
                    icon={() => <span className="text-base">🎙️</span>}
                    title="Sermones"
                    addLabel="Agregar sermón"
                  />
                )}
                {(projectType === 'video') && (
                  <TeachingTree
                    sections={sections}
                    activeSection={activeSection}
                    onSelectSection={onSelectSection}
                    onAddSection={handleAddSection}
                    onRenameSection={onRenameSection}
                    icon={() => <span className="text-base">🎬</span>}
                    title="Videos"
                    addLabel="Agregar video"
                  />
                )}
              </>
            )}

            {activeTab === 'resources' && (
              <div className="p-2 space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-brand-ink-3" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar recurso..."
                    className="w-full text-xs border rounded pl-7 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-gold"
                  />
                </div>

                <div className="relative">
                  <Filter size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-brand-ink-3" />
                  <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    className="w-full text-xs border rounded pl-7 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-gold appearance-none bg-white"
                  >
                    {typeFilterOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  {resources.length === 0 && (
                    <p className="text-xs text-brand-ink-3 italic px-2 py-4 text-center font-sans">
                      {searchQuery || typeFilter ? 'Sin resultados' : 'Sin recursos aún'}
                    </p>
                  )}
                  {resources.map(r => {
                    const fmt = RESOURCE_FORMATS[r.type]
                    const isEditing = editingResource === r.id
                    return (
                      <div key={r.id} className="p-2 rounded hover:bg-brand-gold-pale group">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              value={editForm.title}
                              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                              placeholder="Título"
                              className="w-full text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold"
                            />
                            <textarea
                              value={editForm.content}
                              onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
                              placeholder="Contenido"
                              rows={2}
                              className="w-full text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold resize-none"
                            />
                            <input
                              value={editForm.reference}
                              onChange={e => setEditForm(f => ({ ...f, reference: e.target.value }))}
                              placeholder="Referencia"
                              className="w-full text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-gold"
                            />
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => saveEdit(r)} className="p-0.5 rounded text-green-600 hover:bg-green-50" title="Guardar">
                                <Check size={12} />
                              </button>
                              <button onClick={cancelEdit} className="p-0.5 rounded text-gray-400 hover:bg-gray-100" title="Cancelar">
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-brand-ink truncate">{r.title}</p>
                              <p className="text-[10px] text-brand-ink-3 font-sans">{fmt?.label || r.type}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => onInsertResource?.(r)}
                                title="Agregar al texto"
                                className="p-0.5 rounded text-brand-ink-3 hover:text-brand-teal hover:bg-brand-gold-pale"
                              >
                                <BookOpen size={12} />
                              </button>
                              <button
                                onClick={() => startEdit(r)}
                                title="Editar recurso"
                                className="p-0.5 rounded text-brand-ink-3 hover:text-brand-gold-deep hover:bg-brand-gold-pale"
                              >
                                <Pencil size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'progress' && (
              <div className="p-3 space-y-4">
                {(() => {
                  const sectionTypeLabel = projectType === 'book' || projectType === 'libro' ? 'Capítulos' :
                    projectType === 'teaching' || projectType === 'ensenanza' ? 'Clases' :
                    projectType === 'devotional' || projectType === 'devocional' ? 'Días' :
                    projectType === 'study' || projectType === 'estudio' ? 'Puntos' :
                    projectType === 'sermon' ? 'Sermones' :
                    projectType === 'video' ? 'Videos' : 'Secciones'

                  const sectionTypeLabel_singular = projectType === 'book' || projectType === 'libro' ? 'capítulo' :
                    projectType === 'teaching' || projectType === 'ensenanza' ? 'clase' :
                    projectType === 'devotional' || projectType === 'devocional' ? 'día' :
                    projectType === 'study' || projectType === 'estudio' ? 'punto' :
                    projectType === 'sermon' ? 'sermón' :
                    projectType === 'video' ? 'video' : 'sección'

                  const completedSections = sections.filter(s => {
                    const text = s.content?.replace(/<[^>]*>/g, '') || ''
                    return text.trim().length > 100
                  })
                  const totalWords = sections.reduce((acc, s) => {
                    const text = s.content?.replace(/<[^>]*>/g, '') || ''
                    return acc + text.split(/\s+/).filter(w => w).length
                  }, 0)
                  const progressPercent = sections.length > 0 ? Math.round((completedSections.length / sections.length) * 100) : 0

                  return (
                    <>
                      <div>
                        <h4 className="text-xs font-semibold text-brand-gold-deep uppercase mb-2 font-serif">Progreso</h4>
                        <div className="bg-brand-gold-pale rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-brand-teal">{sectionTypeLabel}</span>
                            <span className="text-xs font-bold text-brand-teal">
                              {completedSections.length} / {sections.length}
                            </span>
                          </div>
                          <div className="w-full bg-brand-gold/30 rounded-full h-2">
                            <div
                              className="bg-brand-gold h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-brand-gold-deep mt-1">{progressPercent}% completado</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-brand-gold-pale/50 rounded p-2 text-center">
                          <p className="text-lg font-bold text-brand-ink font-serif">{sections.length}</p>
                          <p className="text-[10px] text-brand-ink-3 font-sans">Total {sectionTypeLabel_singular}s</p>
                        </div>
                        <div className="bg-brand-gold-pale/50 rounded p-2 text-center">
                          <p className="text-lg font-bold text-brand-ink font-serif">{totalWords.toLocaleString()}</p>
                          <p className="text-[10px] text-brand-ink-3 font-sans">Palabras totales</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h5 className="text-xs font-semibold text-brand-gold-deep uppercase font-serif">Detalle por {sectionTypeLabel_singular}</h5>
                        {sections.length === 0 && (
                          <p className="text-xs text-brand-ink-3 italic font-sans">Sin secciones aún</p>
                        )}
                        {sections.map((sec) => {
                          const text = sec.content?.replace(/<[^>]*>/g, '') || ''
                          const words = text.split(/\s+/).filter(w => w).length
                          const isComplete = text.trim().length > 100
                          return (
                            <div key={sec.id} className="flex items-center gap-2 text-xs py-1">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${isComplete ? 'bg-green-500' : 'bg-brand-gold/40'}`} />
                              <span className="truncate flex-1 text-brand-ink font-serif">{sec.title}</span>
                              <span className="text-brand-ink-3 font-sans">{words} palabras</span>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )
                })()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Sidebar
