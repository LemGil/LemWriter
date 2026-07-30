# Tarea: Fix Underline Duplicado + Corrector Ortográfico en LemWriter

## Stack del proyecto
Electron + React + Vite + Tiptap v3 + better-sqlite3

**REGLA GENERAL:** No tocar `electron/main.js`, `electron/preload.js`, ni `package.json`
de Electron. No reinstalar dependencias de Electron. No correr `electron-rebuild`.

---

## FASE 1 — Fix: Duplicate extension names 'underline'

### Diagnóstico previo (correr ANTES de tocar código)

```bash
# Localizar todas las menciones de Underline en el proyecto
grep -rn "Underline\|underline" src/ --include="*.jsx" --include="*.js" --include="*.ts"
```

El resultado mostrará exactamente dónde está registrado dos veces.
Los patrones más comunes son:

- `Underline` importado de `@tiptap/extension-underline` Y también incluido dentro
  de `StarterKit` (que en algunas versiones lo trae por defecto)
- `Underline` listado dos veces en el array `extensions: [...]` de `useEditor`

### Solución

**Caso A — StarterKit lo incluye:**
```js
// En useEditor({ extensions: [...] })
// ANTES (causa el warning):
extensions: [
  StarterKit,
  Underline,   // ← duplicado si StarterKit ya lo incluye
  ...
]

// DESPUÉS:
extensions: [
  StarterKit.configure({
    // Si StarterKit trae Underline, excluirlo de StarterKit
    // y mantener solo la versión explícita con la configuración deseada
  }),
  Underline,
  ...
]
```

**Caso B — listado dos veces explícitamente:**
```js
// Eliminar la segunda ocurrencia, mantener solo una
extensions: [
  StarterKit,
  Underline,  // mantener esta
  // Underline,  ← eliminar esta
  ...
]
```

### Verificación de Fase 1

```bash
# Confirmar que Underline aparece exactamente UNA vez en extensions
grep -n "Underline" src/components/Editor.jsx

# Arrancar la app y confirmar que el warning desapareció en la consola
# El warning era: "Duplicate extension names: ['underline']"
# NO reportar esta fase como completa si el warning sigue apareciendo
```

---

## FASE 2 — Corrector Ortográfico con nspell

### 2.1 Instalar dependencias

```bash
npm install nspell dictionary-es
```

**Verificar instalación:**
```bash
ls node_modules/nspell
ls node_modules/dictionary-es
```

### 2.2 Crear el diccionario personalizado ministerial

**Crear el archivo** `src/data/diccionario-ministerial.txt`:

```text
Jehová
Elohim
Adonai
Yahweh
Getsemaní
Gólgota
Galilea
Nazaret
Belén
Jerusalén
Capernaúm
Betania
Jericó
Efesios
Colosenses
Filipenses
Tesalonicenses
Apocalipsis
Levítico
Deuteronomio
Números
Proverbios
Eclesiastés
Cantares
Rut
Nehemías
Esdras
Zacarías
Malaquías
Abdías
Habacuc
Sofonías
Hageo
exégesis
hermenéutica
escatología
soteriología
pneumatología
eclesiología
cristología
teología
apologética
homilética
sermón
devocional
versículo
pericopa
evangelio
apóstol
profeta
sacerdote
levita
fariseo
saduceo
escriba
sínodo
concilio
pentecostés
bautismo
comunión
eucaristía
koinonía
ágape
shalom
amén
aleluya
hosanna
maranatha
Mesías
ungido
redención
justificación
santificación
glorificación
propiciación
expiación
reconciliación
encarnación
resurrección
ascensión
parusía
milenio
tribulación
arrebatamiento
dispensación
convenio
pacto
tabernáculo
querubín
serafín
ángel
arcángel
Satanás
Belcebú
demonología
escatológico
soteriológico
cristológico
eclesiológico
pneumatológico
ministerial
apostólico
profético
pastoral
evangelístico
```

### 2.3 Crear el servicio de corrección ortográfica

**Crear el archivo** `src/services/spellcheckService.js`:

```js
import nspell from 'nspell'
import dictionaryEs from 'dictionary-es'
import customWords from '../data/diccionario-ministerial.txt?raw'

let checker = null
let initPromise = null

function initChecker() {
  if (initPromise) return initPromise

  initPromise = new Promise((resolve) => {
    dictionaryEs((_err, dict) => {
      checker = nspell(dict)

      // Agregar palabras ministeriales personalizadas
      const words = customWords
        .split('\n')
        .map(w => w.trim())
        .filter(w => w.length > 0 && !w.startsWith('#'))

      words.forEach(word => checker.add(word))

      resolve(checker)
    })
  })

  return initPromise
}

export async function getChecker() {
  return initChecker()
}

export function isCorrect(checker, word) {
  if (!checker) return true
  // Ignorar: números, URLs, palabras muy cortas, todo mayúsculas (siglas)
  if (word.length <= 2) return true
  if (/^\d+$/.test(word)) return true
  if (/^[A-Z]+$/.test(word)) return true
  if (/^https?:\/\//.test(word)) return true
  return checker.correct(word)
}

export function getSuggestions(checker, word) {
  if (!checker) return []
  return checker.suggest(word).slice(0, 5)
}
```

### 2.4 Crear la extensión Tiptap de corrección ortográfica

**Crear el archivo** `src/extensions/SpellcheckExtension.js`:

```js
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { getChecker, isCorrect } from '../services/spellcheckService'

const SPELLCHECK_KEY = new PluginKey('spellcheck')

// Regex para extraer palabras con su posición en el documento
function getWordsWithPositions(doc) {
  const words = []
  const wordRegex = /[\wáéíóúüñÁÉÍÓÚÜÑ]{3,}/g

  doc.descendants((node, pos) => {
    if (!node.isText) return
    const text = node.text
    let match
    wordRegex.lastIndex = 0
    while ((match = wordRegex.exec(text)) !== null) {
      words.push({
        word: match[0],
        from: pos + match.index,
        to: pos + match.index + match[0].length,
      })
    }
  })

  return words
}

export const SpellcheckExtension = Extension.create({
  name: 'spellcheck',

  addOptions() {
    return {
      enabled: true,
    }
  },

  addProseMirrorPlugins() {
    let checker = null
    let decorations = DecorationSet.empty

    // Inicializar el checker de forma asíncrona
    getChecker().then(c => {
      checker = c
      // Forzar re-render del plugin cuando el checker esté listo
      const view = this.editor?.view
      if (view) {
        view.dispatch(view.state.tr.setMeta(SPELLCHECK_KEY, { recheckAll: true }))
      }
    })

    return [
      new Plugin({
        key: SPELLCHECK_KEY,

        state: {
          init(_, { doc }) {
            return DecorationSet.empty
          },

          apply(tr, oldDecorations, _oldState, newState) {
            if (!checker) return DecorationSet.empty
            if (!tr.docChanged && !tr.getMeta(SPELLCHECK_KEY)?.recheckAll) {
              return oldDecorations.map(tr.mapping, tr.doc)
            }

            const words = getWordsWithPositions(newState.doc)
            const decos = []

            for (const { word, from, to } of words) {
              if (!isCorrect(checker, word)) {
                decos.push(
                  Decoration.inline(from, to, {
                    class: 'spellcheck-error',
                  })
                )
              }
            }

            return DecorationSet.create(newState.doc, decos)
          },
        },

        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})
```

### 2.5 Registrar la extensión en Editor.jsx

**Localizar** el array `extensions: [...]` dentro de `useEditor` en `Editor.jsx`.
**Agregar** la nueva extensión:

```js
// Al inicio del archivo, agregar el import:
import { SpellcheckExtension } from '../extensions/SpellcheckExtension'

// Dentro de useEditor({ extensions: [...] }), agregar:
extensions: [
  StarterKit,
  Underline,       // ya corregido en Fase 1
  // ... otras extensiones existentes ...
  SpellcheckExtension,   // ← agregar al final
]
```

### 2.6 Agregar el CSS del subrayado rojo

**Localizar** el archivo CSS principal del editor
(buscar con `grep -rn "ProseMirror" src/` para encontrarlo).

**Agregar** estas reglas al final de ese archivo:

```css
/* ── Corrector ortográfico ── */
.spellcheck-error {
  text-decoration: underline wavy #e53e3e;
  text-decoration-skip-ink: none;
  text-underline-offset: 3px;
}

/* En modo oscuro / sobre fondo oscuro */
.dark .spellcheck-error,
[data-theme="dark"] .spellcheck-error {
  text-decoration-color: #fc8181;
}
```

### 2.7 Menú contextual con sugerencias (clic derecho)

**Crear el archivo** `src/components/SpellcheckContextMenu.jsx`:

```jsx
import { useState, useEffect, useRef } from 'react'
import { getSuggestions } from '../services/spellcheckService'
import { getChecker } from '../services/spellcheckService'

export function SpellcheckContextMenu({ editor }) {
  const [menu, setMenu] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!editor) return

    const handleContextMenu = async (e) => {
      const target = e.target
      if (!target.classList.contains('spellcheck-error')) return

      e.preventDefault()
      const word = target.textContent.trim()
      const checker = await getChecker()
      const suggestions = getSuggestions(checker, word)

      setMenu({
        x: e.clientX,
        y: e.clientY,
        word,
        suggestions,
      })
    }

    const editorEl = editor.view.dom
    editorEl.addEventListener('contextmenu', handleContextMenu)
    return () => editorEl.removeEventListener('contextmenu', handleContextMenu)
  }, [editor])

  useEffect(() => {
    const handleClick = () => setMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  if (!menu) return null

  const applyCorrection = (suggestion) => {
    editor.chain().focus().run()
    // Buscar y reemplazar la palabra con error
    const { from, to } = editor.state.selection
    editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        // Encontrar la palabra en la posición del clic
        const pos = editor.view.posAtCoords({ left: menu.x, top: menu.y })
        if (!pos) return false
        const $pos = state.doc.resolve(pos.pos)
        const start = $pos.pos - $pos.textOffset
        const end = start + $pos.parent.child($pos.index()).nodeSize
        tr.replaceWith(start, end, state.schema.text(suggestion))
        return true
      })
      .run()
    setMenu(null)
  }

  const addToDict = async () => {
    const checker = await getChecker()
    checker.add(menu.word)
    // Forzar re-render para quitar el subrayado
    editor.view.dispatch(
      editor.state.tr.setMeta('spellcheck', { recheckAll: true })
    )
    setMenu(null)
  }

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
        "{menu.word}"
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
        onClick={addToDict}
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
```

**Montar el componente en** `Editor.jsx`:

```jsx
// Import al inicio:
import { SpellcheckContextMenu } from './SpellcheckContextMenu'

// En el JSX del componente Editor, agregar junto al editor:
return (
  <div className="editor-container">
    <EditorContent editor={editor} />
    <SpellcheckContextMenu editor={editor} />   {/* ← agregar */}
  </div>
)
```

---

## Checklist de verificación para el agente

Correr en orden. No reportar como "completo" sin haber pasado todos.

```bash
# FASE 1 — Underline
# 1. Underline aparece exactamente una vez en Editor.jsx
grep -c "Underline" src/components/Editor.jsx
# Resultado esperado: 2 (una línea de import + una en el array)
# Si devuelve 3 o más: hay duplicación todavía

# FASE 2 — nspell
# 2. Dependencias instaladas
ls node_modules/nspell/package.json
ls node_modules/dictionary-es/package.json

# 3. Archivos nuevos creados
ls src/services/spellcheckService.js
ls src/extensions/SpellcheckExtension.js
ls src/components/SpellcheckContextMenu.jsx
ls src/data/diccionario-ministerial.txt

# 4. Extensión registrada en Editor.jsx
grep -n "SpellcheckExtension" src/components/Editor.jsx
# Debe aparecer: una línea de import + una en el array extensions

# 5. CSS del subrayado existe
grep -n "spellcheck-error" src/
# Debe encontrarlo en exactamente un archivo CSS

# 6. Contexto menu montado en el JSX
grep -n "SpellcheckContextMenu" src/components/Editor.jsx
# Debe aparecer: import + uso en JSX
```

**Verificación visual mínima en la app (prueba manual):**
1. Abrir un proyecto de tipo Enseñanza o Libro
2. Escribir una palabra incorrecta: "hola mundoo" → "mundoo" debe subrayarse en rojo ondulado
3. Escribir "Jehová" → NO debe subrayarse (está en el diccionario ministerial)
4. Escribir "Getsemaní" → NO debe subrayarse
5. Clic derecho sobre "mundoo" → debe aparecer menú con sugerencias
6. El warning "Duplicate extension names: ['underline']" NO debe aparecer en la consola

---

## Notas importantes

- La inicialización de nspell es asíncrona. Es normal que las primeras palabras escritas
  al abrir la app no se revisen hasta que el diccionario cargue (~1-2 segundos).
- El corrector revisa palabras de 3+ caracteres. Palabras de 1-2 caracteres se ignoran.
- Palabras en MAYÚSCULAS se ignoran (siglas: ONU, PDF, etc.).
- El diccionario personalizado `diccionario-ministerial.txt` puede ampliarse libremente
  sin tocar código — una palabra por línea, sin tildes opcionales (escribir la forma
  correcta con tilde si aplica).
- "Agregar al diccionario" desde el menú contextual solo persiste durante la sesión actual.
  Para agregar palabras de forma permanente, editarlas en `diccionario-ministerial.txt`.
