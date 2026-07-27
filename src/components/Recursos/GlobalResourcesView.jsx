import React, { useState, useEffect, useCallback } from 'react'
import {
  BookOpen,
  Languages,
  User,
  Lightbulb,
  Quote,
  BookMarked,
  StickyNote,
  HelpCircle,
  Target,
  Search,
  X,
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  Library,
  CheckCircle,
  LayoutGrid,
  LayoutList,
  Columns,
} from 'lucide-react'
import { projectService } from '../../services/projectService'
import { RESOURCE_FORMATS } from '../../config/resourceFormats'

/* ─── Íconos y colores ─── */
const iconMap = { BookOpen, Languages, User, Lightbulb, Quote, BookMarked, StickyNote, HelpCircle, Target }

const typeColors = {
  pasaje_biblico: 'bg-blue-50 text-blue-700 border-blue-200',
  palabra_hebrea: 'bg-amber-50 text-amber-700 border-amber-200',
  palabra_griega: 'bg-amber-50 text-amber-700 border-amber-200',
  personaje_biblico: 'bg-green-50 text-green-700 border-green-200',
  ilustracion: 'bg-purple-50 text-purple-700 border-purple-200',
  cita_autor: 'bg-rose-50 text-rose-700 border-rose-200',
  concepto_teologico: 'bg-teal-50 text-teal-700 border-teal-200',
  nota_teologica: 'bg-orange-50 text-orange-700 border-orange-200',
  nota_estudio: 'bg-orange-50 text-orange-700 border-orange-200',
  pregunta_estudio: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  punto_estudio: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  tema_doctrinal: 'bg-violet-50 text-violet-700 border-violet-200',
}

/* ─── Campos del formulario por tipo ─── */
const fieldsByType = {
  pasaje_biblico: [
    { key: 'title', label: 'Título', placeholder: 'Ej: Salmo 23', required: true },
    { key: 'content', label: 'Texto', placeholder: 'El Señor es mi pastor...', type: 'textarea' },
    { key: 'reference', label: 'Referencia', placeholder: 'Salmo 23:1-6' },
    { key: 'bible_version', label: 'Versión', placeholder: 'RVR1960' },
  ],
  palabra_hebrea: [
    { key: 'title', label: 'Título', placeholder: 'Ej: Chesed', required: true },
    { key: 'original_word', label: 'Palabra original', placeholder: 'חֶסֶד' },
    { key: 'transliteration', label: 'Transliteración', placeholder: 'chesed' },
    { key: 'strongs_number', label: 'Strong\'s', placeholder: 'H2617' },
    { key: 'meaning', label: 'Significado', placeholder: 'Bondad, misericordia...' },
    { key: 'reference', label: 'Referencia', placeholder: 'Génesis 20:13' },
  ],
  palabra_griega: [
    { key: 'title', label: 'Título', placeholder: 'Ej: Agape', required: true },
    { key: 'original_word', label: 'Palabra original', placeholder: 'ἀγάπη' },
    { key: 'transliteration', label: 'Transliteración', placeholder: 'agape' },
    { key: 'strongs_number', label: 'Strong\'s', placeholder: 'G26' },
    { key: 'meaning', label: 'Significado', placeholder: 'Amor incondicional...' },
    { key: 'reference', label: 'Referencia', placeholder: 'Juan 3:16' },
  ],
  personaje_biblico: [
    { key: 'title', label: 'Nombre', placeholder: 'Ej: Moisés', required: true },
    { key: 'content', label: 'Descripción', placeholder: 'Líder de Israel...', type: 'textarea' },
    { key: 'reference', label: 'Referencia', placeholder: 'Éxodo 2-40' },
    { key: 'meaning', label: 'Significado del nombre', placeholder: 'Salvado del agua' },
    { key: 'notes', label: 'Notas', placeholder: 'Notas adicionales...', type: 'textarea' },
  ],
  cita_autor: [
    { key: 'title', label: 'Título', placeholder: 'Ej: Cita de Spurgeon', required: true },
    { key: 'content', label: 'Cita', placeholder: '"La oración es la llave..."', type: 'textarea' },
    { key: 'author', label: 'Autor', placeholder: 'C.H. Spurgeon' },
    { key: 'source', label: 'Fuente', placeholder: 'Libro, conferencia...' },
  ],
  concepto_teologico: [
    { key: 'title', label: 'Concepto', placeholder: 'Ej: Justificación', required: true },
    { key: 'content', label: 'Definición', placeholder: 'Acto de Dios por el cual...', type: 'textarea' },
    { key: 'reference', label: 'Referencia bíblica', placeholder: 'Romanos 5:1' },
    { key: 'notes', label: 'Notas', placeholder: 'Notas adicionales...', type: 'textarea' },
  ],
  nota_teologica: [
    { key: 'title', label: 'Título', placeholder: 'Ej: Nota sobre la Trinidad', required: true },
    { key: 'content', label: 'Contenido', placeholder: 'La doctrina de la Trinidad...', type: 'textarea' },
    { key: 'reference', label: 'Referencia', placeholder: 'Mateo 28:19' },
  ],
  nota_estudio: [
    { key: 'title', label: 'Título', placeholder: 'Ej: Contexto histórico', required: true },
    { key: 'content', label: 'Contenido', placeholder: 'En el primer siglo...', type: 'textarea' },
    { key: 'reference', label: 'Referencia', placeholder: 'Hechos 1-2' },
  ],
  pregunta_estudio: [
    { key: 'title', label: 'Pregunta', placeholder: '¿Qué enseña este pasaje?', required: true },
    { key: 'content', label: 'Respuesta', placeholder: 'Enseña que...', type: 'textarea' },
    { key: 'reference', label: 'Referencia', placeholder: 'Juan 3:16' },
  ],
  punto_estudio: [
    { key: 'title', label: 'Punto', placeholder: 'Punto clave del estudio', required: true },
    { key: 'content', label: 'Desarrollo', placeholder: 'Desarrollo del punto...', type: 'textarea' },
    { key: 'reference', label: 'Referencia', placeholder: 'Efesios 2:8-9' },
  ],
  tema_doctrinal: [
    { key: 'title', label: 'Tema', placeholder: 'Ej: La gracia de Dios', required: true },
    { key: 'content', label: 'Contenido', placeholder: 'La gracia es...', type: 'textarea' },
    { key: 'notes', label: 'Notas', placeholder: 'Notas adicionales...', type: 'textarea' },
  ],
  ilustracion: [
    { key: 'title', label: 'Título', placeholder: 'Ej: El pastor y las ovejas', required: true },
    { key: 'content', label: 'Ilustración', placeholder: 'Imagina que un pastor...', type: 'textarea' },
    { key: 'source', label: 'Fuente', placeholder: 'Autor, libro...' },
  ],
}

/* ─── Formulario vacío por defecto ─── */
const emptyForm = () => ({
  title: '', content: '', notes: '', reference: '', bible_version: '',
  original_word: '', transliteration: '', strongs_number: '', meaning: '',
  author: '', source: '', tags: '',
})

/* ═══════════════════ COMPONENTE ═══════════════════ */
const GlobalResourcesView = () => {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('todos')
  const [error, setError] = useState(null)

  // Modal CRUD
  const [showModal, setShowModal] = useState(false)
  const [editingResource, setEditingResource] = useState(null)
  const [formType, setFormType] = useState('pasaje_biblico')
  const [formData, setFormData] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // Confirmación de borrado
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Columnas
  const [cols, setCols] = useState(2)

  /* ─── Fetch ─── */
  const fetchResources = useCallback(async (query = '') => {
    setLoading(true)
    setError(null)
    try {
      const data = await projectService.searchResources(query)
      setResources(data || [])
    } catch (err) {
      console.error('Error al cargar recursos:', err)
      setError('No se pudieron cargar los recursos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchResources() }, [fetchResources])

  useEffect(() => {
    const timer = setTimeout(() => fetchResources(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, fetchResources])

  /* ─── Agrupar por tipo ─── */
  const grouped = resources.reduce((acc, r) => {
    const t = r.type || 'otro'
    if (!acc[t]) acc[t] = []
    acc[t].push(r)
    return acc
  }, {})

  const availableTypes = Object.keys(grouped).sort()
  const activeResources = activeTab === 'todos' ? resources : (grouped[activeTab] || [])

  /* ─── CRUD handlers ─── */
  const openAdd = (type) => {
    setEditingResource(null)
    setFormType(type || 'pasaje_biblico')
    setFormData(emptyForm())
    setShowModal(true)
  }

  const openEdit = (resource) => {
    setEditingResource(resource)
    setFormType(resource.type)
    setFormData({
      title: resource.title || '',
      content: resource.content || '',
      notes: resource.notes || '',
      reference: resource.reference || '',
      bible_version: resource.bible_version || '',
      original_word: resource.original_word || '',
      transliteration: resource.transliteration || '',
      strongs_number: resource.strongs_number || '',
      meaning: resource.meaning || '',
      author: resource.author || '',
      source: resource.source || '',
      tags: resource.tags || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.title.trim()) return
    setSaving(true)
    try {
      if (editingResource) {
        await projectService.updateResource(editingResource.id, formData)
      } else {
        await projectService.createResource({ type: formType, ...formData })
      }
      setShowModal(false)
      fetchResources(searchQuery)
    } catch (err) {
      console.error('Error al guardar:', err)
      alert('Error al guardar el recurso.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await projectService.deleteResource(deleteTarget.id)
      setDeleteTarget(null)
      fetchResources(searchQuery)
    } catch (err) {
      console.error('Error al borrar:', err)
    }
  }

  /* ─── Helpers UI ─── */
  const getIcon = (type) => {
    const fmt = RESOURCE_FORMATS[type]
    if (!fmt) return <FolderOpen size={16} />
    const Ic = iconMap[fmt.icon]
    return Ic ? <Ic size={16} /> : <FolderOpen size={16} />
  }

  const getTitle = (r) => r.title || RESOURCE_FORMATS[r.type]?.template(r)?.substring(0, 50) || 'Sin título'

  /* ─── Render ─── */
  return (
    <div className="flex-1 flex flex-col h-full theme-bg-secondary overflow-hidden">

      {/* ═══════ HEADER ═══════ */}
      <div className="border-b theme-border shrink-0">
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 flex items-center justify-center">
                <Library size={22} className="text-brand-gold" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-brand-ink font-serif">Recursos Globales</h1>
                <p className="text-xs text-brand-ink-3 font-sans mt-0.5">
                  Tu biblioteca personal de referencias bíblicas, palabras, personajes y más.
                  Organiza y reutiliza tus recursos en cualquier proyecto.
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 mb-4">
            <div className="flex items-center gap-1.5 text-xs font-sans text-brand-ink-3">
              <CheckCircle size={14} className="text-brand-gold" />
              <span className="font-medium text-brand-ink">{resources.length}</span> recurso{resources.length !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-sans text-brand-ink-3">
              <FolderOpen size={14} className="text-brand-gold" />
              <span className="font-medium text-brand-ink">{availableTypes.length}</span> tipo{availableTypes.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Búsqueda + botón agregar + columnas */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar recurso..."
                className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-brand-gold/30 bg-white theme-text font-sans focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-brand-gold-pale/40 text-brand-ink-3">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Selector de columnas */}
            <div className="flex items-center rounded-lg border theme-border overflow-hidden shrink-0">
              {[1, 2, 3].map((n) => (
                <button key={n} onClick={() => setCols(n)}
                  className={`px-2 py-2 text-xs font-sans transition-colors
                    ${cols === n
                      ? 'bg-brand-gold text-white'
                      : 'theme-bg text-brand-ink-3 hover:bg-brand-gold-pale/40'
                    }`}
                  title={`${n} columna${n > 1 ? 's' : ''}`}>
                  {n === 1 && <LayoutList size={14} />}
                  {n === 2 && <Columns size={14} />}
                  {n === 3 && <LayoutGrid size={14} />}
                </button>
              ))}
            </div>

            <button onClick={() => openAdd()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-brand-gold text-white font-sans hover:bg-brand-gold-deep transition-colors shrink-0">
              <Plus size={15} />
              Nuevo recurso
            </button>
          </div>
        </div>

        {/* ═══════ PESTAÑAS ═══════ */}
        <div className="flex flex-wrap px-6 gap-1 pb-2">
          <TabButton active={activeTab === 'todos'} onClick={() => setActiveTab('todos')}
            count={resources.length} icon={<Library size={14} />}>
            Todos
          </TabButton>
          {availableTypes.map((type) => {
            const fmt = RESOURCE_FORMATS[type]
            return (
              <TabButton key={type} active={activeTab === type} onClick={() => setActiveTab(type)}
                count={grouped[type].length} icon={getIcon(type)}>
                {fmt?.label || type}
              </TabButton>
            )
          })}
        </div>
      </div>

      {/* ═══════ CONTENIDO ═══════ */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && resources.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold" />
          </div>
        ) : error ? (
          <EmptyState message={error} action={<button onClick={() => fetchResources()}
            className="px-4 py-2 text-sm rounded-lg bg-brand-gold text-white font-sans hover:bg-brand-gold-deep transition-colors">Reintentar</button>} />
        ) : activeResources.length === 0 ? (
          <EmptyState
            message={searchQuery ? 'Sin resultados para esa búsqueda.' : 'No hay recursos en esta categoría.'}
            icon={<BookOpen size={48} className="text-brand-gold/30 mb-4" />}
            action={!searchQuery && (
              <button onClick={() => openAdd(activeTab === 'todos' ? 'pasaje_biblico' : activeTab)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-brand-gold text-white font-sans hover:bg-brand-gold-deep transition-colors">
                <Plus size={15} /> Agregar primer recurso
              </button>
            )}
          />
        ) : (
          <div className={`grid gap-3 ${cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {activeResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource}
                getIcon={getIcon} getTitle={getTitle}
                onEdit={() => openEdit(resource)}
                onDelete={() => setDeleteTarget(resource)} />
            ))}
          </div>
        )}
      </div>

      {/* ═══════ MODAL FORMULARIO ═══════ */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)} title={editingResource ? 'Editar recurso' : 'Nuevo recurso'}>
          {!editingResource && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-brand-ink font-sans mb-1">Tipo de recurso</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border theme-border theme-bg theme-text font-sans focus:outline-none focus:ring-2 focus:ring-brand-gold/30">
                {Object.entries(RESOURCE_FORMATS).map(([key, fmt]) => (
                  <option key={key} value={key}>{fmt.label}</option>
                ))}
              </select>
            </div>
          )}

          {(fieldsByType[formType] || []).map((field) => (
            <div key={field.key} className="mb-3">
              <label className="block text-xs font-medium text-brand-ink font-sans mb-1">
                {field.label} {field.required && <span className="text-red-400">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea value={formData[field.key]} rows={3}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-sm rounded-lg border theme-border theme-bg theme-text font-sans focus:outline-none focus:ring-2 focus:ring-brand-gold/30 resize-none" />
              ) : (
                <input type="text" value={formData[field.key]}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-sm rounded-lg border theme-border theme-bg theme-text font-sans focus:outline-none focus:ring-2 focus:ring-brand-gold/30" />
              )}
            </div>
          ))}

          <div className="flex justify-end gap-2 mt-5 pt-3 border-t theme-border">
            <button onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm rounded-lg border theme-border theme-text font-sans hover:bg-brand-gold-pale/40 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || !formData.title.trim()}
              className="px-4 py-2 text-sm rounded-lg bg-brand-gold text-white font-sans hover:bg-brand-gold-deep transition-colors disabled:opacity-50">
              {saving ? 'Guardando...' : editingResource ? 'Guardar cambios' : 'Crear recurso'}
            </button>
          </div>
        </Modal>
      )}

      {/* ═══════ CONFIRMACIÓN BORRADO ═══════ */}
      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)} title="Eliminar recurso">
          <p className="text-sm text-brand-ink font-sans mb-1">
            ¿Estás seguro de que quieres eliminar <strong>"{deleteTarget.title}"</strong>?
          </p>
          <p className="text-xs text-brand-ink-3 font-sans mb-5">Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-sm rounded-lg border theme-border theme-text font-sans hover:bg-brand-gold-pale/40 transition-colors">
              Cancelar
            </button>
            <button onClick={handleDelete}
              className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white font-sans hover:bg-red-600 transition-colors">
              Eliminar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ═══════ SUB-COMPONENTES ═══════ */

function TabButton({ active, onClick, count, icon, children }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-sans whitespace-nowrap border-b-2 transition-colors
        ${active
          ? 'border-brand-gold text-brand-gold font-medium'
          : 'border-transparent text-brand-ink-3 hover:text-brand-ink hover:border-brand-gold/30'
        }`}>
      {icon}
      {children}
      <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium
        ${active ? 'bg-brand-gold/15 text-brand-gold' : 'bg-brand-gold-pale/40 text-brand-ink-3'}`}>
        {count}
      </span>
    </button>
  )
}

function ResourceCard({ resource, getIcon, getTitle, onEdit, onDelete }) {
  const fmt = RESOURCE_FORMATS[resource.type]
  const typeLabel = fmt?.label || resource.type

  // Preview corto
  let preview = ''
  try {
    preview = fmt?.template(resource) || ''
    if (resource.title && preview.startsWith(resource.title)) preview = ''
    if (preview.length > 100) preview = preview.substring(0, 100) + '...'
  } catch { /* ignore */ }

  return (
    <div className="group p-3 rounded-lg border border-brand-gold/20 theme-card hover:border-brand-gold/30 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-brand-gold-pale/50 flex items-center justify-center shrink-0 mt-0.5">
          {getIcon(resource.type)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeColors[resource.type] || ''}`}>
              {typeLabel}
            </span>
            {resource.reference && (
              <span className="text-[10px] text-brand-ink-3 font-sans">{resource.reference}</span>
            )}
          </div>
          <h4 className="text-sm font-medium text-brand-ink font-serif truncate">{getTitle(resource)}</h4>
          {preview && (
            <p className="text-xs text-brand-ink-3 font-sans mt-0.5 line-clamp-2">{preview}</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit}
            className="p-1.5 rounded-md hover:bg-brand-gold-pale/60 text-brand-ink-3 hover:text-brand-ink transition-colors"
            title="Editar">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-md hover:bg-red-50 text-brand-ink-3 hover:text-red-500 transition-colors"
            title="Eliminar">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function Modal({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b theme-border shrink-0">
          <h2 className="text-base font-bold text-brand-ink font-serif">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-brand-gold-pale/40 text-brand-ink-3">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ message, icon, action }) {
  return (
    <div className="text-center py-16">
      {icon || <BookOpen size={48} className="text-brand-gold/30 mb-4" />}
      <h3 className="text-lg font-bold text-brand-ink font-serif mb-2">{message}</h3>
      {action}
    </div>
  )
}

export default GlobalResourcesView
