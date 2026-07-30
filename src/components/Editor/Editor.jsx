import React, { useRef, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { ResizableImage } from './ResizableImageExtension'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Footnote } from './FootnoteExtension'
import { BOOK_STYLES } from '../../config/bookStyles'
import { SpellcheckExtension } from '../../extensions/SpellcheckExtension'
import { SpellcheckContextMenu } from '../SpellcheckContextMenu'

const Editor = ({ content, onUpdate, onEditorReady, sectionTitle, designStyles, projectStyle, sectionId }) => {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate
  const editorContainerRef = useRef(null)
  const previousSectionIdRef = useRef(sectionId)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        underline: false,
      }),
      Underline,
      ResizableImage.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Footnote,
      SpellcheckExtension,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      if (onUpdateRef.current) onUpdateRef.current(editor)
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[500px]',
      },
    },
  })

  useEffect(() => {
    if (editor) {
      onEditorReady?.(editor)
    }
  }, [editor])

  // Update editor content when section changes (prevents remount / flash / undo-loss)
  useEffect(() => {
    if (!editor) return
    if (sectionId === previousSectionIdRef.current) return
    previousSectionIdRef.current = sectionId
    editor.commands.setContent(content || '', { emitUpdate: false })
  }, [editor, sectionId, content])

  useEffect(() => {
    const estilo = BOOK_STYLES[projectStyle];
    if (!estilo || !editorContainerRef.current) return;

    const el = editorContainerRef.current;
    el.style.setProperty('--body-font', estilo.typography.bodyFont);
    el.style.setProperty('--body-size', estilo.typography.bodySize);
    el.style.setProperty('--line-height', estilo.typography.lineHeight);
    el.style.setProperty('--text-align', estilo.typography.alignment);
    el.style.setProperty('--margin-top', estilo.page.marginTop);
    el.style.setProperty('--margin-bottom', estilo.page.marginBottom);
    el.style.setProperty('--margin-left', estilo.page.marginLeft);
    el.style.setProperty('--margin-right', estilo.page.marginRight);
    el.style.setProperty('--first-line-indent', estilo.typography.firstLineIndent);
    el.style.setProperty('--paragraph-spacing', estilo.typography.paragraphSpacing);

    el.style.setProperty('--heading-font', estilo.headings.h1.font);
    el.style.setProperty('--h1-size', estilo.headings.h1.size);
    el.style.setProperty('--h1-weight', estilo.headings.h1.weight);
    el.style.setProperty('--h1-align', estilo.headings.h1.align);
    el.style.setProperty('--h1-line-height', estilo.headings.h1.lineHeight);
    el.style.setProperty('--h1-margin-top', estilo.headings.h1.marginTop);
    el.style.setProperty('--h1-margin-bottom', estilo.headings.h1.marginBottom);

    el.style.setProperty('--h2-size', estilo.headings.h2.size);
    el.style.setProperty('--h2-weight', estilo.headings.h2.weight);
    el.style.setProperty('--h2-align', estilo.headings.h2.align);
    el.style.setProperty('--h2-line-height', estilo.headings.h2.lineHeight);
    el.style.setProperty('--h2-margin-top', estilo.headings.h2.marginTop);
    el.style.setProperty('--h2-margin-bottom', estilo.headings.h2.marginBottom);

    el.style.setProperty('--h3-size', estilo.headings.h3.size);
    el.style.setProperty('--h3-weight', estilo.headings.h3.weight);
    el.style.setProperty('--h3-align', estilo.headings.h3.align);
    el.style.setProperty('--h3-line-height', estilo.headings.h3.lineHeight);
    el.style.setProperty('--h3-margin-top', estilo.headings.h3.marginTop);
    el.style.setProperty('--h3-margin-bottom', estilo.headings.h3.marginBottom);

    el.style.setProperty('--h4-size', estilo.headings.h4.size);
    el.style.setProperty('--h4-weight', estilo.headings.h4.weight);
    el.style.setProperty('--h4-align', estilo.headings.h4.align);
    el.style.setProperty('--h4-line-height', estilo.headings.h4.lineHeight);
    el.style.setProperty('--h4-margin-top', estilo.headings.h4.marginTop);
    el.style.setProperty('--h4-margin-bottom', estilo.headings.h4.marginBottom);

    el.style.setProperty('--h5-size', estilo.headings.h5.size);
    el.style.setProperty('--h5-weight', estilo.headings.h5.weight);
    el.style.setProperty('--h5-align', estilo.headings.h5.align);
    el.style.setProperty('--h5-line-height', estilo.headings.h5.lineHeight);
    el.style.setProperty('--h5-margin-top', estilo.headings.h5.marginTop);
    el.style.setProperty('--h5-margin-bottom', estilo.headings.h5.marginBottom);

    el.style.setProperty('--h6-size', estilo.headings.h6.size);
    el.style.setProperty('--h6-weight', estilo.headings.h6.weight);
    el.style.setProperty('--h6-align', estilo.headings.h6.align);
    el.style.setProperty('--h6-line-height', estilo.headings.h6.lineHeight);
    el.style.setProperty('--h6-margin-top', estilo.headings.h6.marginTop);
    el.style.setProperty('--h6-margin-bottom', estilo.headings.h6.marginBottom);

    if (estilo.blockquotes) {
      el.style.setProperty('--blockquote-font', estilo.blockquotes.shortQuote.font);
      el.style.setProperty('--blockquote-size', estilo.blockquotes.shortQuote.size);
      el.style.setProperty('--blockquote-style', estilo.blockquotes.shortQuote.style);
      el.style.setProperty('--blockquote-line-height', estilo.blockquotes.shortQuote.lineHeight);

      el.style.setProperty('--blockquote-long-size', estilo.blockquotes.longQuote.size);
      el.style.setProperty('--blockquote-long-line-height', estilo.blockquotes.longQuote.lineHeight);
      el.style.setProperty('--blockquote-long-indent-left', estilo.blockquotes.longQuote.indentLeft);
      el.style.setProperty('--blockquote-long-indent-right', estilo.blockquotes.longQuote.indentRight);
    }
  }, [projectStyle]);

  if (!editor) return null

  const containerStyle = designStyles ? {
    paddingTop: designStyles['--editor-margin-top'],
    paddingBottom: designStyles['--editor-margin-bottom'],
    paddingLeft: designStyles['--editor-margin-left'],
    paddingRight: designStyles['--editor-margin-right'],
  } : {}

  return (
    <div ref={editorContainerRef} style={containerStyle} className="p-8 md:p-12 lg:p-16 bg-[#ffffff] text-[#1A1610]">
      <div className="max-w-3xl mx-auto">
        {sectionTitle && (
          <h1 className="text-3xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">
            {sectionTitle}
          </h1>
        )}
        <div className="prose-editor">
          <EditorContent editor={editor} />
        </div>
      </div>
      <SpellcheckContextMenu editor={editor} />
    </div>
  )
}

export default Editor
