import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { HexColorPicker } from 'react-colorful'

const ColorPickerPopover = ({ color, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false)
  const btnRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0, anchor: 'bottom' })

  /* ─── Calcular posición cada vez que se abre ─── */
  useEffect(() => {
    if (!isOpen || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const pw = 232 // ancho aprox del popover (200 + padding)
    const ph = 230 // alto aprox del popover (160 + header + footer)

    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const anchor = spaceBelow < ph && spaceAbove > spaceBelow ? 'top' : 'bottom'

    const left = Math.max(8, Math.min(rect.left + rect.width / 2 - pw / 2, window.innerWidth - pw - 8))
    const top = anchor === 'bottom'
      ? rect.bottom + 8
      : rect.top - ph - 8

    setPos({ top, left, anchor })
  }, [isOpen])

  /* ─── Cerrar al hacer clic fuera ─── */
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e) => {
      if (btnRef.current && btnRef.current.contains(e.target)) return
      // Si el clic es dentro del popover, no cerrar
      const popover = document.getElementById('color-popover')
      if (popover && popover.contains(e.target)) return
      setIsOpen(false)
    }
    // Delay para evitar que el mismo clic que abrió cierre
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClick)
    })
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  /* ─── Cerrar con Escape ─── */
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen])

  return (
    <>
      {/* Botón / muestra del color */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-5 h-5 rounded border border-brand-gold/30 shrink-0 cursor-pointer hover:ring-2 hover:ring-brand-gold/40 transition-shadow"
        style={{ backgroundColor: color }}
        title={label}
        aria-label={label}
      />

      {/* Popover con portal al body para evitar overflow clipping */}
      {isOpen && createPortal(
        <div
          id="color-popover"
          className="fixed z-[9999]"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="bg-white rounded-xl shadow-2xl border border-brand-gold/20 p-3">
            <HexColorPicker
              color={color}
              onChange={onChange}
              style={{ width: '200px', height: '160px' }}
            />
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-brand-gold/10">
              <div
                className="w-6 h-6 rounded border border-brand-gold/20 shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-mono text-brand-ink">{color}</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="ml-auto text-[10px] text-brand-ink-3 hover:text-brand-ink font-sans px-2 py-0.5 rounded hover:bg-brand-gold-pale/50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default ColorPickerPopover
