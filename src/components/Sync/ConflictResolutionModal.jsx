import React, { useEffect, useState } from 'react'
import { X, AlertTriangle, Cloud, Monitor, Copy, Check, Loader } from 'lucide-react'
import { syncService } from '../../services/syncService'

function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatFecha(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function countWords(text) {
  const t = stripHtml(text)
  return t ? t.split(/\s+/).length : 0
}

const RESOLUTIONS = [
  {
    id: 'keep_local',
    label: 'Quedarme con la mía',
    desc: 'Tu versión de este PC sobrescribe la nube.',
    icon: Monitor,
  },
  {
    id: 'keep_remote',
    label: 'Usar la de la nube',
    desc: 'Se adopta la versión de la nube en este PC.',
    icon: Cloud,
  },
  {
    id: 'keep_both',
    label: 'Conservar ambas',
    desc: 'La sección usa la nube y tu versión queda como sección aparte.',
    icon: Copy,
    onlySections: true,
  },
]

const ConflictResolutionModal = ({ onClose, onResolved }) => {
  const [conflicts, setConflicts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const list = await syncService.getPendingConflicts()
      setConflicts(list || [])
      if (list && list.length > 0 && !selectedId) setSelectedId(list[0].id)
      if (list && list.length === 0) setSelectedId(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selected = conflicts.find((c) => c.id === selectedId) || null

  const handleResolve = async (resolution) => {
    if (!selected || resolving) return
    setResolving(true)
    setError(null)
    try {
      const result = await syncService.resolveConflict(selected.id, resolution)
      if (!result.success) {
        setError(result.error || 'No se pudo resolver el conflicto')
        return
      }
      const remaining = conflicts.filter((c) => c.id !== selected.id)
      setConflicts(remaining)
      setSelectedId(remaining.length > 0 ? remaining[0].id : null)
      if (onResolved) onResolved()
      if (remaining.length === 0) onClose()
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-brand-ink font-serif flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Conflictos de sincronización
            {conflicts.length > 0 && (
              <span className="text-xs font-normal text-brand-ink-3">({conflicts.length} pendiente{conflicts.length !== 1 ? 's' : ''})</span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-0.5 rounded text-brand-ink-3 hover:text-brand-ink hover:bg-brand-gold-pale"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-brand-ink-3">
              <Loader size={20} className="animate-spin mr-2" />
              <span className="text-sm">Cargando conflictos…</span>
            </div>
          ) : conflicts.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-brand-ink-3">
              <Check size={28} className="text-green-600 mb-2" />
              <p className="text-sm">No hay conflictos pendientes. Todo sincronizado.</p>
            </div>
          ) : (
            <div className="flex gap-4">
              {/* Lista */}
              <div className="w-56 shrink-0 space-y-1">
                {conflicts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-2.5 rounded-lg border-2 transition-all ${
                      c.id === selectedId
                        ? 'border-brand-gold bg-brand-gold-pale'
                        : 'border-brand-gold/20 hover:border-brand-gold/40'
                    }`}
                  >
                    <p className="text-xs font-semibold text-brand-ink truncate">
                      {c.table_name === 'sections' ? c.title_local || c.title_remote : c.project_title || c.title_local}
                    </p>
                    <p className="text-[11px] text-brand-ink-3 truncate">
                      {c.table_name === 'sections' ? `Sección · ${c.project_title || ''}` : 'Proyecto'}
                    </p>
                  </button>
                ))}
              </div>

              {/* Detalle */}
              {selected && (
                <div className="flex-1 min-w-0 space-y-3">
                  <p className="text-xs text-brand-ink-3">
                    Esta {selected.table_name === 'sections' ? 'sección' : 'proyecto'} cambió en la nube
                    después de tu última sincronización, y tu versión local también es distinta.
                    Elige cuál conservar — la otra no se subirá.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-brand-gold/30 p-3">
                      <p className="text-xs font-semibold text-brand-teal flex items-center gap-1.5 mb-1">
                        <Monitor size={13} /> Tu versión (este PC)
                      </p>
                      <p className="text-xs font-medium text-brand-ink truncate">{selected.title_local || '—'}</p>
                      <p className="text-[11px] text-brand-ink-3 mb-2">
                        {formatFecha(selected.local_updated_at)} · {countWords(selected.content_local)} palabras
                      </p>
                      <p className="text-xs text-brand-ink-3 line-clamp-6 whitespace-pre-wrap">
                        {stripHtml(selected.content_local).slice(0, 600) || '—'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-brand-gold/30 p-3">
                      <p className="text-xs font-semibold text-brand-teal flex items-center gap-1.5 mb-1">
                        <Cloud size={13} /> Versión de la nube
                      </p>
                      <p className="text-xs font-medium text-brand-ink truncate">{selected.title_remote || '—'}</p>
                      <p className="text-[11px] text-brand-ink-3 mb-2">
                        {formatFecha(selected.remote_updated_at)} · {countWords(selected.content_remote)} palabras
                      </p>
                      <p className="text-xs text-brand-ink-3 line-clamp-6 whitespace-pre-wrap">
                        {stripHtml(selected.content_remote).slice(0, 600) || '—'}
                      </p>
                    </div>
                  </div>

                  {error && (
                    <p className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</p>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {RESOLUTIONS.filter((r) => !r.onlySections || selected.table_name === 'sections').map((r) => (
                      <button
                        key={r.id}
                        disabled={resolving}
                        onClick={() => handleResolve(r.id)}
                        className="flex flex-col items-center gap-1 p-3 rounded-lg border-2 border-brand-gold/20 hover:border-brand-gold hover:bg-brand-gold-pale/50 transition-all disabled:opacity-50"
                      >
                        <r.icon size={18} className="text-brand-gold-deep" />
                        <span className="text-xs font-semibold text-brand-ink">{r.label}</span>
                        <span className="text-[11px] text-brand-ink-3 text-center">{r.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConflictResolutionModal
