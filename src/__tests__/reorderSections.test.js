import { describe, it, expect } from 'vitest'
import { reorderSectionInArray } from '../stores/appStore'

const mkSections = () => [
  { id: 'a', title: 'A' },
  { id: 'b', title: 'B' },
  { id: 'c', title: 'C' },
  { id: 'd', title: 'D' },
]

describe('reorderSectionInArray', () => {
  it('mueve una sección hacia arriba (índice menor)', () => {
    const out = reorderSectionInArray(mkSections(), 'b', 0)
    expect(out.map(s => s.id)).toEqual(['b', 'a', 'c', 'd'])
  })

  it('mueve una sección hacia abajo (índice mayor)', () => {
    const out = reorderSectionInArray(mkSections(), 'b', 3)
    expect(out.map(s => s.id)).toEqual(['a', 'c', 'd', 'b'])
  })

  it('mueve una sección al medio de la lista', () => {
    const out = reorderSectionInArray(mkSections(), 'a', 2)
    expect(out.map(s => s.id)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('es no-op si targetIndex coincide con la posición actual', () => {
    const out = reorderSectionInArray(mkSections(), 'b', 1)
    expect(out.map(s => s.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('es no-op si targetIndex está fuera de rango', () => {
    const out = reorderSectionInArray(mkSections(), 'b', 99)
    expect(out.map(s => s.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('es no-op si la sección no existe', () => {
    const out = reorderSectionInArray(mkSections(), 'zzz', 0)
    expect(out.map(s => s.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('mueve al inicio con targetIndex 0', () => {
    const out = reorderSectionInArray(mkSections(), 'd', 0)
    expect(out.map(s => s.id)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('mueve al final con targetIndex = length - 1', () => {
    const out = reorderSectionInArray(mkSections(), 'a', 3)
    expect(out.map(s => s.id)).toEqual(['b', 'c', 'd', 'a'])
  })

  it('no muta el array original (inmutabilidad)', () => {
    const original = mkSections()
    const out = reorderSectionInArray(original, 'b', 0)
    expect(original.map(s => s.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(out).not.toBe(original)
  })
})
