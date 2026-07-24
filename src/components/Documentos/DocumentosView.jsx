import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Upload,
  File,
  FileText,
  ExternalLink,
  Trash2,
  Clock,
  FolderOpen,
  Search,
  X,
  LayoutGrid,
  LayoutList,
  Columns,
  CheckCircle,
  FileImage,
  FileCode,
  FileSpreadsheet,
  FilePlus,
} from 'lucide-react'

/* ─── Configuración de tipos de archivo ─── */
const docTypeConfig = {
  docx: { label: 'Word', icon: FileText, color: 'bg-blue-50 text-blue-700 border-blue-200', gradient: 'from-blue-500 to-blue-600' },
  doc: { label: 'Word', icon: FileText, color: 'bg-blue-50 text-blue-700 border-blue-200', gradient: 'from-blue-500 to-blue-600' },
  pdf: { label: 'PDF', icon: File, color: 'bg-red-50 text-red-700 border-red-200', gradient: 'from-red-500 to-red-600' },
  md: { label: 'Markdown', icon: FileCode, color: 'bg-purple-50 text-purple-700 border-purple-200', gradient: 'from-purple-500 to-purple-600' },
  txt: { label: 'Texto', icon: FileText, color: 'bg-gray-50 text-gray-700 border-gray-200', gradient: 'from-gray-500 to-gray-600' },
  rtf: { label: 'RTF', icon: FileSpreadsheet, color: 'bg-amber-50 text-amber-700 border-amber-200', gradient: 'from-amber-500 to-amber-600' },
  odt: { label: 'ODT', icon: FileImage, color: 'bg-green-50 text-green-700 border-green-200', gradient: 'from-green-500 to-green-600' },
}

const getTypeConfig = (type) => docTypeConfig[type] || { label: type?.toUpperCase() || 'DOC', icon: File, color: 'bg-gray-50 text-gray-700 border-gray-200', gradient: 'from-gray-500 to-gray-600' }

/* ═══════════════════ COMPONENTE ═══════════════════ */
const DocumentosView = ({ onOpenDocument, refreshKey }) => {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [importingDoc, setImportingDoc] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('todos')
  const [cols, setCols] = useState(2)
  const [deleteTarget, setDeleteTarget] = useState(null)

  /* ─── Cargar documentos ─── */
  const loadDocuments = useCallback(async () => {
    if (!window.api?.document?.list) return
    setLoading(true)
    try {
      const docs = await window.api.document.list()
      setDocuments(docs || [])
    } catch {
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDocuments() }, [loadDocuments])

  /* ─── Recargar cuando refreshKey cambie ─── */
  useEffect(() => { if (refreshKey > 0) loadDocuments() }, [refreshKey, loadDocuments])

  /* ─── Agrupar por tipo ─── */
  const grouped = useMemo(() => {
    return documents.reduce((acc, doc) => {
      const t = doc.file_type || 'otro'
      if (!acc[t]) acc[t] = []
      acc[t].push(doc)
      return acc
    }, {})
  }, [documents])

  const availableTypes = Object.keys(grouped).sort()

  /* ─── Filtrar por búsqueda ─── */
  const filteredDocs = useMemo(() => {
    let list = activeTab === 'todos' ? documents : (grouped[activeTab] || [])
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(d => d.file_name?.toLowerCase().includes(q))
    }
    return list
  }, [documents, grouped, activeTab, searchQuery])

  /* ─── Importar documento ─── */
  const handleImportDocument = async () => {
    if (!window.api?.dialog?.openFile || !window.api?.document?.convert || !window.api?.document?.save) return
    setImportingDoc(true)
    try {
      const filePath = await window.api.dialog.openFile()
      if (!filePath) return
      const result = await window.api.document.convert(filePath)
      if (!result.success) {
        alert(`Error al convertir el archivo: ${result.error}`)
        return
      }
      const saved = await window.api.document.save({
        fileName: result.fileName,
        filePath: result.filePath,
        fileType: result.type,
        content: result.html,
        html: result.html
      })
      if (saved.success && onOpenDocument) {
        const full = await window.api.document.get(saved.id)
        if (full) onOpenDocument(full)
      } else {
        await loadDocuments()
      }
    } catch (e) {
      alert(`Error al abrir documento: ${e.message}`)
    } finally {
      setImportingDoc(false)
    }
  }

  /* ─── Crear documento nuevo ─── */
  const handleCreateDocument = async () => {
    if (!window.api?.document?.save) return
    const now = new Date()
    const name = `Documento nuevo ${now.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
    const emptyHtml = '<p></p>'
    try {
      const saved = await window.api.document.save({
        fileName: name,
        filePath: '',
        fileType: 'txt',
        content: '',
        html: emptyHtml
      })
      if (saved.success && onOpenDocument) {
        const full = await window.api.document.get(saved.id)
        if (full) onOpenDocument(full)
      } else {
        await loadDocuments()
      }
    } catch (e) {
      alert(`Error al crear documento: ${e.message}`)
    }
  }

  /* ─── Abrir documento ─── */
  const handleOpenDocument = async (doc) => {
    if (!window.api?.document?.get || !onOpenDocument) return
    try {
      const full = await window.api.document.get(doc.id)
      if (full) onOpenDocument(full)
    } catch { /* silently fail */ }
  }

  /* ─── Eliminar documento ─── */
  const handleDeleteDocument = async () => {
    if (!deleteTarget || !window.api?.document?.delete) return
    try {
      await window.api.document.delete(deleteTarget.id)
      setDeleteTarget(null)
      loadDocuments()
    } catch { /* silently fail */ }
  }

  /* ─── Formatear fecha ─── */
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now - d
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'Ahora'
    if (mins < 60) return `Hace ${mins} min`
    if (hours < 24) return `Hace ${hours}h`
    if (days < 7) return `Hace ${days}d`
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  /* ─── Render ─── */
  return (
        <div className="flex-1 flex flex-col h-full theme-bg-secondary overflow-hidden">

      {/* ═══════ HEADER ═══════ */}
      <div className="border-b theme-border shrink-0">
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-teal/20 to-brand-gold/10 flex items-center justify-center">
                <FolderOpen size={22} className="text-brand-teal" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-brand-ink font-serif">Documentos</h1>
                <p className="text-xs text-brand-ink-3 font-sans mt-0.5">
                  Importa archivos Word, PDF, Markdown o texto plano para consultarlos y editar su contenido.
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 mb-4">
            <div className="flex items-center gap-1.5 text-xs font-sans text-brand-ink-3">
              <CheckCircle size={14} className="text-brand-teal" />
              <span className="font-medium text-brand-ink">{documents.length}</span> documento{documents.length !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-sans text-brand-ink-3">
              <FolderOpen size={14} className="text-brand-teal" />
              <span className="font-medium text-brand-ink">{availableTypes.length}</span> tipo{availableTypes.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Búsqueda + columnas + importar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar documento..."
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
                      ? 'bg-brand-teal text-white'
                      : 'theme-bg text-brand-ink-3 hover:bg-brand-gold-pale/40'
                    }`}
                  title={`${n} columna${n > 1 ? 's' : ''}`}>
                  {n === 1 && <LayoutList size={14} />}
                  {n === 2 && <Columns size={14} />}
                  {n === 3 && <LayoutGrid size={14} />}
                </button>
              ))}
            </div>

            <button
              onClick={handleCreateDocument}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-brand-gold/20 bg-white theme-text font-sans hover:bg-brand-gold-pale/40 transition-colors shrink-0"
            >
              <FilePlus size={15} />
              Nuevo
            </button>
            <button
              onClick={handleImportDocument}
              disabled={importingDoc}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-brand-teal text-white font-sans hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
            >
              <Upload size={15} />
              {importingDoc ? 'Importando...' : 'Importar'}
            </button>
          </div>
        </div>

        {/* ═══════ PESTAÑAS ═══════ */}
        <div className="flex flex-wrap px-6 gap-1 pb-2">
          <TabButton active={activeTab === 'todos'} onClick={() => setActiveTab('todos')}
            count={documents.length} icon={<FolderOpen size={14} />}>
            Todos
          </TabButton>
          {availableTypes.map((type) => {
            const cfg = getTypeConfig(type)
            const Ic = cfg.icon
            return (
              <TabButton key={type} active={activeTab === type} onClick={() => setActiveTab(type)}
                count={grouped[type].length} icon={<Ic size={14} />}>
                {cfg.label}
              </TabButton>
            )
          })}
        </div>
      </div>

      {/* ═══════ CONTENIDO ═══════ */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold" />
          </div>
        ) : filteredDocs.length > 0 ? (
          <div className={`grid gap-3 ${cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {filteredDocs.map(doc => {
              const cfg = getTypeConfig(doc.file_type)
              const Ic = cfg.icon
              return (
                <div
                  key={doc.id}
                  onClick={() => handleOpenDocument(doc)}
                  className="group p-4 rounded-xl border border-brand-gold/20 bg-white hover:border-brand-gold/30 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br ${cfg.gradient} text-white`}>
                        <Ic size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-brand-ink text-sm truncate font-serif">{doc.file_name}</h4>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button title="Abrir documento"
                        className="p-1.5 text-brand-ink-3 hover:text-brand-teal hover:bg-brand-gold-pale rounded-md transition-colors">
                        <ExternalLink size={13} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(doc) }}
                        className="p-1.5 text-brand-ink-3 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Eliminar documento">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-brand-ink-3 font-sans">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(doc.opened_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText size={10} />
                      {doc.word_count?.toLocaleString() || 0} palabras
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Upload size={48} className="mx-auto text-brand-gold/30 mb-4" />
            <h3 className="text-lg font-bold text-brand-ink font-serif mb-2">
              {searchQuery ? 'Sin resultados' : 'No hay documentos importados'}
            </h3>
            <p className="text-sm text-brand-ink-3 font-sans mb-4 max-w-md mx-auto">
              {searchQuery
                ? 'No se encontraron documentos con ese nombre.'
                : 'Crea un documento nuevo para empezar a escribir, o importa un archivo existente.'}
            </p>
            {searchQuery ? (
              <button onClick={() => setSearchQuery('')}
                className="px-4 py-2 text-sm rounded-lg border border-brand-gold/20 bg-white theme-text font-sans hover:bg-brand-gold-pale/40 transition-colors">
                Limpiar búsqueda
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <button onClick={handleCreateDocument}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-brand-gold/20 bg-white theme-text rounded-lg hover:bg-brand-gold-pale/40 transition-colors text-sm font-medium font-sans">
                  <FilePlus size={16} />
                  Nuevo documento
                </button>
                <button onClick={handleImportDocument} disabled={importingDoc}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-teal text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50">
                  <Upload size={16} />
                  {importingDoc ? 'Importando...' : 'Importar archivo'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════ CONFIRMACIÓN BORRADO ═══════ */}
      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)} title="Eliminar documento">
          <p className="text-sm text-brand-ink font-sans mb-1">
            ¿Estás seguro de que quieres eliminar <strong>"{deleteTarget.file_name}"</strong>?
          </p>
          <p className="text-xs text-brand-ink-3 font-sans mb-5">Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-sm rounded-lg border theme-border theme-text font-sans hover:bg-brand-gold-pale/40 transition-colors">
              Cancelar
            </button>
            <button onClick={handleDeleteDocument}
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
          ? 'border-brand-teal text-brand-teal font-medium'
          : 'border-transparent text-brand-ink-3 hover:text-brand-ink hover:border-brand-teal/30'
        }`}>
      {icon}
      {children}
      <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium
        ${active ? 'bg-brand-teal/15 text-brand-teal' : 'bg-brand-gold-pale/40 text-brand-ink-3'}`}>
        {count}
      </span>
    </button>
  )
}

function Modal({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-5 py-4 border-b theme-border">
          <h2 className="text-base font-bold text-brand-ink font-serif">{title}</h2>
        </div>
        <div className="px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}

export default DocumentosView
