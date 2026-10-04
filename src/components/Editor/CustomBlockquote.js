import { Blockquote } from '@tiptap/extension-blockquote'

// Tipos de nota ministerial (igual que en LemWriter Mobile)
export const TIPOS_NOTA = ['biblia', 'idea', 'aplicacion', 'nota']

export const CustomBlockquote = Blockquote.extend({
  addAttributes() {
    return {
      calloutType: {
        default: null,
        parseHTML: (element) => {
          return (
            element.getAttribute('data-callout-type') ||
            (element.classList.contains('callout-biblia')
              ? 'biblia'
              : element.classList.contains('callout-idea')
              ? 'idea'
              : element.classList.contains('callout-aplicacion')
              ? 'aplicacion'
              : element.classList.contains('callout-nota')
              ? 'nota'
              : null)
          )
        },
        renderHTML: (attributes) => {
          if (!attributes.calloutType) return {}
          return {
            'data-callout-type': attributes.calloutType,
            class: `callout callout-${attributes.calloutType}`,
          }
        },
      },
    }
  },
})
