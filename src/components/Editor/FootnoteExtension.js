import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import FootnoteComponent from './FootnoteComponent'

export const Footnote = Node.create({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      id: { default: null },
      text: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-footnote]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-footnote': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FootnoteComponent)
  },

  addCommands() {
    return {
      insertFootnote: (text = '') => ({ commands }) => {
                const id = Date.now().toString(36)
        return commands.insertContent({
          type: this.name,
          attrs: { id, text },
        })
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-f': () => this.editor.commands.insertFootnote(),
    }
  },
})
