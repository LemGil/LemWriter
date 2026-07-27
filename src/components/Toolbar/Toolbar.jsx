import React from 'react'
import BibleVerseLookup from '../Editor/BibleVerseLookup'

import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  List, ListOrdered,
  Quote, Code, Minus, Image, Table, BookMarked,
  Undo, Redo, RemoveFormatting,
  Target, HelpCircle, BookOpen, Video, StickyNote,
} from 'lucide-react'

const ToolbarButton = ({ onClick, isActive, disabled, children, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded transition-colors ${
      isActive
        ? 'bg-brand-teal text-white'
        : 'theme-text-muted hover:bg-brand-gold-pale hover:text-brand-teal'
    } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
)

const ToolbarDivider = () => (
  <div className="w-px h-5 bg-brand-gold/20 mx-1" />
)

const Toolbar = ({ editor, projectType, projectId }) => {
  if (!editor) return null

  const canUndo = () => {
    try {
      return editor?.can?.()?.undo?.() ?? false
    } catch (e) {
      return false
    }
  }

  const canRedo = () => {
    try {
      return editor?.can?.()?.redo?.() ?? false
    } catch (e) {
      return false
    }
  }

  const handleImageUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (e) => {
        const url = e.target.result
        if (url) {
          editor?.chain().focus().setImage({ src: url }).run()
        }
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const handleInsertFootnote = () => {
    if (editor.commands.insertFootnote) {
      editor?.chain().focus().insertFootnote().run()
    } else {
      console.error('Command insertFootnote not found!')
      editor?.chain().focus().insertContent({ type: 'footnote', attrs: { id: Date.now().toString(36), text: '' } }).run()
    }
  }

  return (
    <div className="border-b theme-border theme-bg px-2 py-1 flex items-center gap-0.5 flex-wrap">
      <ToolbarButton
        onClick={() => editor?.chain().focus().undo().run()}
        disabled={!canUndo()}
        title="Deshacer"
      >
        <Undo size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().redo().run()}
        disabled={!canRedo()}
        title="Rehacer"
      >
        <Redo size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Negrita"
      >
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Cursiva"
      >
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Subrayado"
      >
        <Underline size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Tachado"
      >
        <Strikethrough size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Título 1"
      >
        <Heading1 size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Título 2"
      >
        <Heading2 size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Título 3"
      >
        <Heading3 size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleHeading({ level: 4 }).run()}
        isActive={editor.isActive('heading', { level: 4 })}
        title="Título 4"
      >
        <Heading4 size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleHeading({ level: 5 }).run()}
        isActive={editor.isActive('heading', { level: 5 })}
        title="Título 5"
      >
        <Heading5 size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleHeading({ level: 6 }).run()}
        isActive={editor.isActive('heading', { level: 6 })}
        title="Título 6"
      >
        <Heading6 size={14} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Lista con viñetas"
      >
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Lista ordenada"
      >
        <ListOrdered size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Cita"
      >
        <Quote size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Código"
      >
        <Code size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        title="Separador"
      >
        <Minus size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
        title="Limpiar formato"
      >
        <RemoveFormatting size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        onClick={handleImageUpload}
        title="Insertar imagen"
      >
        <Image size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={handleInsertFootnote}
        title="Nota al pie (Ctrl+Shift-F)"
      >
        <BookMarked size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        title="Insertar tabla (3×3)"
      >
        <Table size={16} />
      </ToolbarButton>

      <BibleVerseLookup editor={editor} />

      {(projectType === 'sermon') && (
        <>
          <ToolbarDivider />
          <ToolbarButton
            onClick={() => editor?.chain().focus().insertContent('### Punto 1\n\n').run()}
            title="Insertar punto del sermón"
          >
            <Target size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().insertContent('**Pregunta:** ').run()}
            title="Insertar pregunta"
          >
            <HelpCircle size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().insertContent('📖 ').run()}
            title="Insertar referencia bíblica"
          >
            <BookOpen size={16} />
          </ToolbarButton>
        </>
      )}

      {(projectType === 'video') && (
        <>
          <ToolbarDivider />
          <ToolbarButton
            onClick={() => editor?.chain().focus().insertContent('## Escena 1\n\n').run()}
            title="Insertar escena"
          >
            <Video size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().insertContent('📖 ').run()}
            title="Insertar referencia bíblica"
          >
            <BookOpen size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().insertContent('**Nota:** ').run()}
            title="Insertar nota"
          >
            <StickyNote size={16} />
          </ToolbarButton>
        </>
      )}
    </div>
  )
}

export default Toolbar
