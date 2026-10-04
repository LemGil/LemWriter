import React, { useState } from 'react'
import BibleVerseLookup from '../Editor/BibleVerseLookup'

import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  List, ListOrdered,
  Quote, Code, Minus, Image, Table, BookMarked,
  Undo, Redo, RemoveFormatting,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Link2,
  Target, HelpCircle, BookOpen, Video, StickyNote,
} from 'lucide-react'
import PrintPreviewModal from './PrintPreviewModal';

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

const Toolbar = ({ editor, projectType, projectId, sectionInfo, sections = [], activeSectionId }) => {
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [bloqueMenuAbierto, setBloqueMenuAbierto] = useState(false)
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


  const COLORES_TEXTO = ['#1f2937', '#b91c1c', '#c9a24a', '#166534', '#1d4ed8', '#6d28d9', '#be185d', '#0e7490']
  const COLORES_RESALTADO = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecdd3', '#e9d5ff', '#fed7aa', '#a5f3fc', '#d9f99d']

  const claseBotonMenu = (activo) => `p-1.5 rounded transition-colors flex items-center justify-center ${
    activo ? 'bg-brand-teal text-white' : 'theme-text-muted hover:bg-brand-gold-pale hover:text-brand-teal'
  }`

  const aplicarColorTexto = (color) => {
    if (color) editor.chain().focus().setColor(color).run()
    else editor.chain().focus().unsetColor().run()
    setMenuAbierto(null)
  }

  const aplicarResaltado = (color) => {
    if (color) editor.chain().focus().toggleHighlight({ color }).run()
    else editor.chain().focus().unsetHighlight().run()
    setMenuAbierto(null)
  }

  const normalizarUrl = (u) => {
    const t = (u || '').trim()
    if (!t) return ''
    if (t.indexOf('http://') === 0 || t.indexOf('https://') === 0) return t
    return 'https://' + t
  }

  const abrirMenuEnlace = () => {
    setLinkUrl(editor.getAttributes('link').href || '')
    setMenuAbierto(menuAbierto === 'enlace' ? null : 'enlace')
  }

  const aplicarEnlace = () => {
    const href = normalizarUrl(linkUrl)
    if (href) editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
    setMenuAbierto(null)
  }

  const quitarEnlace = () => {
    editor.chain().focus().unsetLink().run()
    setMenuAbierto(null)
    setLinkUrl('')
  }

  const TIPOS_LISTA = [
    { tipo: '1', etiqueta: 'Numérica', muestra: '1, 2, 3' },
    { tipo: 'I', etiqueta: 'Romana', muestra: 'I, II, III' },
    { tipo: 'A', etiqueta: 'Letras mayúsculas', muestra: 'A, B, C' },
    { tipo: 'a', etiqueta: 'Letras minúsculas', muestra: 'a, b, c' },
  ]

  const tipoListaActual = () => {
    if (!editor.isActive('orderedList')) return '1'
    return editor.getAttributes('orderedList').type || '1'
  }

  const ESTILOS_LISTA = { '1': null, 'I': 'upper-roman', 'A': 'upper-alpha', 'a': 'lower-alpha' }

  const aplicarTipoLista = (tipo) => {
    const chain = editor.chain().focus()
    if (!editor.isActive('orderedList')) chain.toggleOrderedList()
    chain.updateAttributes('orderedList', { type: tipo === '1' ? null : tipo, estiloLista: ESTILOS_LISTA[tipo] }).run()
    setMenuAbierto(null)
  }

  const quitarLista = () => {
    if (editor.isActive('orderedList')) editor.chain().focus().toggleOrderedList().run()
    setMenuAbierto(null)
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


  const TIPOS_BLOQUE = [
    { tipo: 'biblia', etiqueta: '📖 Pasaje bíblico' },
    { tipo: 'idea', etiqueta: '💡 Idea / Ilustración' },
    { tipo: 'aplicacion', etiqueta: '🎯 Aplicación práctica' },
    { tipo: 'nota', etiqueta: '📌 Nota ministerial' },
  ]

  const tipoBloqueActivo = TIPOS_BLOQUE.find(t => editor.isActive('blockquote', { calloutType: t.tipo }))
  const esCitaSimple = editor.isActive('blockquote') && !tipoBloqueActivo
  const etiquetaBloque = tipoBloqueActivo ? tipoBloqueActivo.etiqueta : esCitaSimple ? '❝ Cita' : 'Bloque ▾'

  const aplicarTipoBloque = (tipo) => {
    if (editor.isActive('blockquote', { calloutType: tipo })) {
      editor.chain().focus().unsetBlockquote().run()
    } else if (editor.isActive('blockquote')) {
      editor.chain().focus().updateAttributes('blockquote', { calloutType: tipo }).run()
    } else {
      const ok = editor.chain().focus().wrapIn('blockquote', { calloutType: tipo }).run()
      if (!ok) editor.chain().focus().setBlockquote().updateAttributes('blockquote', { calloutType: tipo }).run()
    }
    setBloqueMenuAbierto(false)
  }

  const aplicarCitaSimple = () => {
    if (esCitaSimple) {
      editor.chain().focus().unsetBlockquote().run()
    } else if (editor.isActive('blockquote')) {
      editor.chain().focus().updateAttributes('blockquote', { calloutType: null }).run()
    } else {
      editor.chain().focus().setBlockquote().run()
    }
    setBloqueMenuAbierto(false)
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
      <div className="relative">
        <button
          onClick={() => setMenuAbierto(menuAbierto === 'lista' ? null : 'lista')}
          title="Lista numerada"
          className={claseBotonMenu(editor.isActive('orderedList') || menuAbierto === 'lista')}
        >
          <ListOrdered size={16} />
        </button>
        {menuAbierto === 'lista' && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuAbierto(null)} />
            <div className="absolute z-50 mt-1 w-52 rounded-lg border theme-border theme-bg shadow-xl p-1.5">
              {TIPOS_LISTA.map(t => (
                <button
                  key={t.tipo}
                  onClick={() => aplicarTipoLista(t.tipo)}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                    tipoListaActual() === t.tipo ? 'bg-brand-teal text-white' : 'theme-text hover:bg-brand-gold-pale'
                  }`}
                >
                  <span>{t.etiqueta}</span>
                  <span className={tipoListaActual() === t.tipo ? 'text-white/80' : 'theme-text-muted'}>{t.muestra}</span>
                </button>
              ))}
              {editor.isActive('orderedList') && (
                <div className="border-t theme-border mt-1 pt-1">
                  <button
                    onClick={quitarLista}
                    className="w-full text-left px-2 py-1.5 rounded text-xs transition-colors text-red-600 hover:bg-red-50"
                  >
                    Quitar lista
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ToolbarDivider />
      <ToolbarButton
        onClick={() => editor?.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="Alinear a la izquierda"
      >
        <AlignLeft size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="Centrar"
      >
        <AlignCenter size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title="Alinear a la derecha"
      >
        <AlignRight size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
        isActive={editor.isActive({ textAlign: 'justify' })}
        title="Justificar"
      >
        <AlignJustify size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      <div className="relative">
        <button
          onClick={() => setBloqueMenuAbierto(v => !v)}
          title="Bloques: cita y notas ministeriales"
          className={`p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-medium ${
            editor.isActive('blockquote')
              ? 'bg-brand-teal text-white'
              : 'theme-text-muted hover:bg-brand-gold-pale hover:text-brand-teal'
          }`}
        >
          <Quote size={16} />
          <span className="hidden xl:inline">{etiquetaBloque}</span>
        </button>
        {bloqueMenuAbierto && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setBloqueMenuAbierto(false)} />
            <div className="absolute z-50 mt-1 w-60 rounded-lg border theme-border theme-bg shadow-xl py-1">
              {TIPOS_BLOQUE.map(t => (
                <button
                  key={t.tipo}
                  onClick={() => aplicarTipoBloque(t.tipo)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-gold-pale transition-colors ${
                    tipoBloqueActivo?.tipo === t.tipo ? 'text-brand-teal font-semibold' : 'theme-text'
                  }`}
                >
                  {t.etiqueta}
                </button>
              ))}
              <div className="border-t theme-border my-1" />
              <button
                onClick={aplicarCitaSimple}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-gold-pale transition-colors ${
                  esCitaSimple ? 'text-brand-teal font-semibold' : 'theme-text'
                }`}
              >
                ❝ Cita simple
              </button>
            </div>
          </>
        )}
      </div>
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
      <div className="relative">
        <button
          onClick={() => setMenuAbierto(menuAbierto === 'color' ? null : 'color')}
          title="Color de texto y resaltado"
          className={claseBotonMenu(menuAbierto === 'color')}
        >
          <span
            className="text-sm font-bold leading-none px-0.5"
            style={{ borderBottom: `3px solid ${editor.getAttributes('textStyle').color || '#9ca3af'}` }}
          >
            A
          </span>
        </button>
        {menuAbierto === 'color' && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuAbierto(null)} />
            <div className="absolute z-50 mt-1 w-56 rounded-lg border theme-border theme-bg shadow-xl p-3">
              <p className="text-[11px] font-semibold theme-text-muted mb-2">Color del texto</p>
              <div className="flex flex-wrap gap-1.5">
                {COLORES_TEXTO.map(c => (
                  <button
                    key={c}
                    onClick={() => aplicarColorTexto(c)}
                    title={c}
                    className="w-6 h-6 rounded-full border border-black/15 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                  />
                ))}
                <button
                  onClick={() => aplicarColorTexto(null)}
                  title="Quitar color"
                  className="w-6 h-6 rounded-full border border-black/15 theme-bg theme-text-muted hover:scale-110 transition-transform text-xs leading-none"
                >
                  &#215;
                </button>
              </div>
              <p className="text-[11px] font-semibold theme-text-muted mb-2 mt-3">Resaltado</p>
              <div className="flex flex-wrap gap-1.5">
                {COLORES_RESALTADO.map(c => (
                  <button
                    key={c}
                    onClick={() => aplicarResaltado(c)}
                    title={c}
                    className="w-6 h-6 rounded border border-black/15 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                  />
                ))}
                <button
                  onClick={() => aplicarResaltado(null)}
                  title="Quitar resaltado"
                  className="w-6 h-6 rounded border border-black/15 theme-bg theme-text-muted hover:scale-110 transition-transform text-xs leading-none"
                >
                  &#215;
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="relative">
        <button
          onClick={abrirMenuEnlace}
          title="Insertar enlace"
          className={claseBotonMenu(editor.isActive('link') || menuAbierto === 'enlace')}
        >
          <Link2 size={16} />
        </button>
        {menuAbierto === 'enlace' && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuAbierto(null)} />
            <div className="absolute z-50 mt-1 w-64 rounded-lg border theme-border theme-bg shadow-xl p-3">
              <p className="text-[11px] font-semibold theme-text-muted mb-2">Enlace</p>
              <input
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') aplicarEnlace() }}
                placeholder="https://&#8230;"
                autoFocus
                className="w-full text-sm px-2 py-1.5 rounded border theme-border theme-bg theme-text mb-2 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={aplicarEnlace}
                  className="flex-1 px-2 py-1.5 bg-brand-teal text-white rounded text-xs font-medium hover:opacity-90"
                >
                  Aplicar
                </button>
                {editor.isActive('link') && (
                  <button
                    onClick={quitarEnlace}
                    className="px-2 py-1.5 border border-red-200 text-red-600 rounded text-xs hover:bg-red-50"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
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
      <ToolbarButton onClick={() => setVistaPrevia(true)} title="Imprimir">🖨️</ToolbarButton>
      {vistaPrevia && (
        <PrintPreviewModal html={editor ? editor.getHTML() : ""} info={sectionInfo} onCerrar={() => setVistaPrevia(false)} />
      )}
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
