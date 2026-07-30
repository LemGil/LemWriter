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
      style={{
        position: 'fixed',
        top: menu.y,
        left: menu.x,
        background: 'white',
        border: '1px solid rgba(26,58,74,0.15)',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(26,58,74,0.15)',
        zIndex: 9999,
        minWidth: '180px',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
        fontSize: '12px',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Palabra con error */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid rgba(26,58,74,0.08)',
        color: '#e53e3e',
        fontWeight: 600,
        fontSize: '11px',
        letterSpacing: '0.02em',
      }}>
        &ldquo;{menu.word}&rdquo;
      </div>

      {/* Sugerencias */}
      {menu.suggestions.length > 0 ? (
        menu.suggestions.map((s) => (
          <button
            key={s}
            onClick={() => applyCorrection(s)}
            style={{
              display: 'block',
              width: '100%',
              padding: '7px 12px',
              background: 'none',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              color: '#1A3A4A',
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              fontWeight: 500,
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(200,167,93,0.1)'}
            onMouseLeave={e => e.target.style.background = 'none'}
          >
            {s}
          </button>
        ))
      ) : (
        <div style={{ padding: '7px 12px', color: 'rgba(26,58,74,0.4)', fontStyle: 'italic' }}>
          Sin sugerencias
        </div>
      )}

      {/* Separador */}
      <div style={{ borderTop: '1px solid rgba(26,58,74,0.08)', margin: '4px 0' }} />

      {/* Agregar al diccionario */}
      <button
        onClick={addToDictionary}
        style={{
          display: 'block',
          width: '100%',
          padding: '7px 12px',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          color: '#C8A75D',
          fontFamily: 'Inter, sans-serif',
          fontSize: '11px',
          fontWeight: 600,
        }}
        onMouseEnter={e => e.target.style.background = 'rgba(200,167,93,0.08)'}
        onMouseLeave={e => e.target.style.background = 'none'}
      >
        + Agregar al diccionario
      </button>
    </div>
  )
}
