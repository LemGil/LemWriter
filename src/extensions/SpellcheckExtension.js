import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { getChecker, isCorrect } from '../services/spellcheckService'

export const SPELLCHECK_KEY = new PluginKey('spellcheck')

// Regex para palabras de 3+ caracteres, solo letras (sin puntuación)
const WORD_RE = /[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]{3,}/g

function getWordsWithPositions(doc) {
  const words = []

  doc.descendants((node, pos) => {
    if (!node.isText) return
    const text = node.text
    let match
    WORD_RE.lastIndex = 0
    while ((match = WORD_RE.exec(text)) !== null) {
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
      debounceMs: 300,
    }
  },

  addProseMirrorPlugins() {
    let checkerReady = false
    let decorations = DecorationSet.empty
    let debounceTimer = null

    // Inicializar el checker de forma asíncrona
    getChecker().then(() => {
      checkerReady = true
      // Forzar re-render cuando el checker esté listo
      const view = this.editor?.view
      if (view) {
        view.dispatch(view.state.tr.setMeta(SPELLCHECK_KEY, { recheck: true }))
      }
    })

    function runSpellcheck(view) {
      if (!checkerReady) return

      const words = getWordsWithPositions(view.state.doc)
      const decos = []

      for (const { word, from, to } of words) {
        if (!isCorrect(word)) {
          decos.push(
            Decoration.inline(from, to, {
              class: 'spellcheck-error',
            })
          )
        }
      }

      decorations = DecorationSet.create(view.state.doc, decos)
    }

    return [
      new Plugin({
        key: SPELLCHECK_KEY,

        state: {
          init() {
            return DecorationSet.empty
          },

          apply(tr, oldDecorations, _oldState, newState) {
            if (!checkerReady) return DecorationSet.empty

            // Re-check forzado (cuando checker se inicializa)
            if (tr.getMeta(SPELLCHECK_KEY)?.recheck) {
              // Se ejecuta en el siguiente tick vía el props.decorations
              return oldDecorations
            }

            // Si no hubo cambios en el doc, mantener decorations existentes
            if (!tr.docChanged) {
              return oldDecorations.map(tr.mapping, tr.doc)
            }

            // Devolver las decorations viejas mapeadas por ahora;
            // el debounce actualizará después via view.dispatch
            return oldDecorations.map(tr.mapping, tr.doc)
          },
        },

        props: {
          decorations(state) {
            return decorations
          },

          // Interceptar cada transacción para aplicar debounce
        },
      }),

      // Segundo plugin: observar cambios y correr spellcheck con debounce
      new Plugin({
        key: new PluginKey('spellcheck-debounce'),

        view(view) {
          function scheduleRecheck() {
            if (debounceTimer) clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => {
              runSpellcheck(view)
              view.updateState(view.state)
              debounceTimer = null
            }, 300)
          }

          return {
            update(view, prevState) {
              // Solo re-check si el documento cambió
              if (view.state.doc.eq(prevState.doc)) return
              scheduleRecheck()
            },
            destroy() {
              if (debounceTimer) clearTimeout(debounceTimer)
            },
          }
        },
      }),
    ]
  },
})
