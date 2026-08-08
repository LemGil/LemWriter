import { useState, useEffect, useRef } from 'react'
import { getChecker, getSuggestions, isCorrect } from '../services/spellcheckService'
import { SPELLCHECK_KEY } from '../extensions/SpellcheckExtension'

export function SpellcheckContextMenu({ editor }) {
  const [menu, setMenu] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!editor) return

    const handleContextMenu = async (e) => {
      const target = e.target
      if (!target.classList.contains('spellcheck-error')) return

      e.preventDefault()

      // Encontrar la palabra exacta y su posición en el documento
      const editorEl = editor.view.dom
      const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })
      if (!pos) return

      const $pos = editor.state.doc.resolve(pos.pos)
      const wordNode = $pos.parent.child($pos.index())
      if (!wordNode?.text) return

      // Extraer la palabra completa en esa posición
      const text = wordNode.text
      const offsetInNode = pos.pos - $pos.posAtIndex($pos.index())
      const wordRegex = /[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]{3,}/g
      let match
      let wordInfo = null

      while ((match = wordRegex.exec(text)) !== null) {
        const wordStart = $pos.posAtIndex($pos.index()) + match.index
        const wordEnd = wordStart + match[0].length
        if (pos.pos >= wordStart && pos.pos <= wordEnd) {
          wordInfo = {
            word: match[0],
            from: wordStart,
            to: wordEnd,
          }
          break
        }
      }

      if (!wordInfo) return

      const checker = await getChecker()
      if (isCorrect(wordInfo.word)) return // Ya no está mal

      const suggestions = getSuggestions(wordInfo.word)

      setMenu({
        x: e.clientX,
        y: e.clientY,
        ...wordInfo,
        suggestions,
      })
    }

    const editorEl = editor.view.dom
    editorEl.addEventListener('contextmenu', handleContextMenu)

    return () => {
      editorEl.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [editor])

  useEffect(() => {
    const handleClick = () => setMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const applyCorrection = (suggestion) => {
    if (!editor || !menu) return

    editor
      .chain()
      .setTextSelection({ from: menu.from, to: menu.to })
      .insertContent(suggestion)
      .run()

    setMenu(null)
  }

  const addToDictionary = async () => {
    if (!menu) return
    const checker = await getChecker()
    checker.add(menu.word)

    // Forzar re-render del spellcheck para quitar el subrayado
    editor.view.dispatch(
      editor.state.tr.setMeta(SPELLCHECK_KEY, { recheck: true })
    )
    setMenu(null)
  }

  if (!menu) return null

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: menu.y, left: menu.x, zIndex: 9999 }}
      className="min-w-[180px] overflow-hidden rounded-lg border border-[var(--border-primary)] bg-[var(--card-bg)] font-sans text-xs text-[var(--text-primary)] shadow-lg"
      onClick={e => e.stopPropagation()}
    >
      {/* Palabra con error */}
      <div className="border-b border-[var(--border-primary)] px-3 py-2 text-[11px] font-semibold tracking-wide text-red-600">
        &ldquo;{menu.word}&rdquo;
      </div>

      {/* Sugerencias */}
      {menu.suggestions.length > 0 ? (
        menu.suggestions.map((s) => (
          <button
            key={s}
            onClick={() => applyCorrection(s)}
            className="block w-full cursor-pointer border-none bg-transparent px-3 py-2 text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[rgba(200,167,93,0.1)]"
          >
            {s}
          </button>
        ))
      ) : (
        <div className="px-3 py-2 italic text-[var(--text-muted)]">
          Sin sugerencias
        </div>
      )}

      {/* Separador */}
      <div className="my-1 border-t border-[var(--border-primary)]" />

      {/* Agregar al diccionario */}
      <button
        onClick={addToDictionary}
        className="block w-full cursor-pointer border-none bg-transparent px-3 py-2 text-left text-[11px] font-semibold text-brand-gold hover:bg-[rgba(200,167,93,0.08)]"
      >
        + Agregar al diccionario
      </button>
    </div>
  )
}
