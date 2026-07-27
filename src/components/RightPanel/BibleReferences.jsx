import React, { useState } from 'react'
import { BookOpen, Plus, X, SearchCheck, Loader2, Check, AlertTriangle } from 'lucide-react'

const BibleReferences = ({ references, onChange, color = 'blue', sectionContent, projectId }) => {
  const [newRef, setNewRef] = useState('')
  const [newText, setNewText] = useState('')
  const [detecting, setDetecting] = useState(false)
  const [detectResults, setDetectResults] = useState(null)
  const [detectError, setDetectError] = useState(null)

  const colorMap = {
    brand: { bg: 'bg-brand-gold-pale/60', text: 'text-brand-ink', border: 'border-brand-gold/30', accent: 'bg-brand-gold-pale text-brand-gold-deep hover:bg-brand-gold', ring: 'focus:ring-brand-gold', label: 'text-brand-gold' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', accent: 'bg-blue-100 text-blue-700 hover:bg-blue-200', ring: 'focus:ring-blue-300', label: 'text-blue-600' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', accent: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200', ring: 'focus:ring-yellow-300', label: 'text-yellow-600' },
    green: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', accent: 'bg-green-100 text-green-700 hover:bg-green-200', ring: 'focus:ring-green-300', label: 'text-green-600' },
  }

  const c = colorMap[color] || colorMap.blue

  const addReference = () => {
    if (!newRef.trim()) return
    onChange([...references, { id: Date.now() + Math.random(), reference: newRef, text: newText }])
    setNewRef('')
    setNewText('')
  }

  const removeReference = (id) => {
    onChange(references.filter(r => r.id !== id))
  }

  const handleDetect = async () => {
    if (!sectionContent?.trim()) {
      setDetectError('No hay contenido en esta sección para analizar')
      return
    }

    setDetecting(true)
    setDetectError(null)
    setDetectResults(null)

    try {
      const resultado = await window.api.ai.extractReferences({
        text: sectionContent,
        projectId,
      })

      if (!resultado.success) {
        setDetectError(resultado.error || 'Error al analizar')
        return
      }

      if (!resultado.references || resultado.references.length === 0) {
        setDetectError('No se encontraron referencias bíblicas en el texto')
        return
      }

      // Preparar resultados con estado editable
      setDetectResults(
        resultado.references.map((ref, i) => ({
          ...ref,
          _localId: i,
          _confirmada: false,
          _rangoIncierto: ref.versiculo_final == null,
        }))
      )
    } catch (err) {
      setDetectError(`Error: ${err.message}`)
    } finally {
      setDetecting(false)
    }
  }

  const confirmarDetectada = async (ref) => {
    const refStr = `${ref.libro} ${ref.capitulo}:${ref.versiculo}${ref.versiculo_final ? '-' + ref.versiculo_final : ''}`

    // Verificar si ya existe en la lista actual
    const yaExiste = references.some(r => r.reference === refStr)
    if (yaExiste) {
      // Marcar como confirmada pero sin agregar duplicado
      setDetectResults(prev =>
        prev.map(r => r._localId === ref._localId ? { ...r, _confirmada: true, _duplicada: true } : r)
      )
      // Si era la última, limpiar
      const unconfirmedCount = detectResults ? detectResults.filter(r => !r._confirmada).length : 0
      if (unconfirmedCount <= 1) {
        setTimeout(() => setDetectResults(null), 1500)
      }
      return
    }

    // Buscar el texto real del versículo en la BD offline
    let text = ''
    try {
      const verseText = await window.api.bible.getVerse({
        libro: ref.libro,
        capitulo: ref.capitulo,
        versiculo: ref.versiculo,
        versiculoFinal: ref.versiculo_final,
      })
      if (verseText) text = verseText
    } catch (e) {
      console.warn('[BibleReferences] Error al buscar texto:', e)
    }

    // Agregar a la lista de referencias del panel (con texto verificado)
    onChange([...references, { id: Date.now() + Math.random(), reference: refStr, text }])

    // Marcar como confirmada localmente
    setDetectResults(prev =>
      prev.map(r => r._localId === ref._localId ? { ...r, _confirmada: true } : r)
    )

    // Si era la última sin confirmar, limpiar resultados tras breve pausa
    const unconfirmedCount = detectResults ? detectResults.filter(r => !r._confirmada).length : 0
    if (unconfirmedCount <= 1) {
      setTimeout(() => setDetectResults(null), 800)
    }
  }

  const todasConfirmadas = detectResults?.length > 0 && detectResults.every(r => r._confirmada)

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <BookOpen size={12} className={c.label} />
        <h4 className={`text-xs font-semibold uppercase ${c.label}`}>Referencias bíblicas</h4>
      </div>

      {/* Input manual */}
      <div className="space-y-1.5 mb-2">
        <input
          value={newRef}
          onChange={e => setNewRef(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addReference()}
          placeholder="Referencia (Ej: Juan 3:16)"
          className={`w-full text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 ${c.ring}`}
        />
        <input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addReference()}
          placeholder="Texto del versículo (opcional)"
          className={`w-full text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 ${c.ring}`}
        />
        <button
          onClick={addReference}
          disabled={!newRef.trim()}
          className={`w-full text-xs py-1.5 rounded font-medium disabled:opacity-40 ${c.accent}`}
        >
          <Plus size={12} className="inline mr-1" />
          Agregar manual
        </button>
      </div>

      {/* Detectar con IA (solo si hay contenido de sección) */}
      {sectionContent && (
        <div className="mb-3 pt-2 border-t theme-border">
          <button
            onClick={handleDetect}
            disabled={detecting}
            className={`w-full text-xs py-1.5 rounded font-medium transition-colors flex items-center justify-center gap-1.5 ${
              detecting
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-brand-teal text-white hover:bg-brand-teal/90'
            }`}
          >
            {detecting ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Analizando con IA...
              </>
            ) : (
              <>
                <SearchCheck size={12} />
                Detectar con IA
              </>
            )}
          </button>

          {/* Error */}
          {detectError && !detecting && (
            <div className="mt-1.5 flex items-start gap-1.5 p-2 rounded text-[11px] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
              <AlertTriangle size={12} className="shrink-0 mt-0.25" />
              <span>{detectError}</span>
            </div>
          )}

          {/* Resultados de detección */}
          {detectResults && detectResults.length > 0 && !detecting && (
            <div className="mt-1.5 space-y-1">
              {todasConfirmadas && (
                <p className="text-[11px] text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check size={11} />
                  Agregadas al listado
                </p>
              )}
              {detectResults.map((ref) => (
                <div
                  key={ref._localId}
                  className={`flex items-center justify-between gap-1 p-1.5 rounded text-[11px] border ${
                    ref._duplicada
                      ? 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10'
                      : ref._confirmada
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                        : ref._rangoIncierto
                          ? 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10'
                          : 'theme-border theme-bg-secondary'
                  }`}
                >
                  <span className="font-medium truncate">
                    {ref.libro} {ref.capitulo}:{ref.versiculo}
                    {ref.versiculo_final && !ref._rangoIncierto && `-${ref.versiculo_final}`}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {ref._duplicada && (
                      <span className="text-[10px] text-purple-600 dark:text-purple-300">Ya agregado</span>
                    )}
                    {ref._rangoIncierto && !ref._confirmada && !ref._duplicada && (
                      <AlertTriangle size={10} className="text-amber-500" title="Revisar rango" />
                    )}
                    <button
                      onClick={() => confirmarDetectada(ref)}
                      disabled={ref._confirmada || ref._duplicada}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        ref._confirmada || ref._duplicada
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-brand-teal text-white hover:bg-brand-teal/90'
                      }`}
                    >
                      {ref._confirmada || ref._duplicada ? <Check size={10} /> : '+'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lista de referencias guardadas */}
      <div className="space-y-1">
        {references.map(ref => (
          <div key={ref.id} className={`${c.bg} rounded px-2 py-1.5 text-xs`}>
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${c.text}`}>{ref.reference}</span>
              <button onClick={() => removeReference(ref.id)} className="text-gray-400 hover:text-red-500 shrink-0">
                <X size={12} />
              </button>
            </div>
            {ref.text && (
              <p className={`${c.text} opacity-75 mt-0.5 italic`}>{ref.text}</p>
            )}
          </div>
        ))}
        {references.length === 0 && (
          <p className="text-xs text-brand-ink-3 italic font-sans">Sin referencias aún</p>
        )}
      </div>
    </div>
  )
}

export default BibleReferences
