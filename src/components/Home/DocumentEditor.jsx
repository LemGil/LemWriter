import React, { useRef, useState, useCallback } from 'react'
import { ArrowLeft, File, Clock, FileText, Save, X, Trash2, Pencil, Check } from 'lucide-react'
import Editor from '../Editor/Editor'
import Toolbar from '../Toolbar/Toolbar'
import ThemeToggle from '../Layout/ThemeToggle'

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const SaveDialog = ({ onSave, onDiscard, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="bg-white rounded-xl shadow-2xl border border-brand-gold/20 p-6 w-full max-w-sm mx-4">
      <h3 className="text-lg font-bold text-brand-ink font-serif mb-2">¿Qué deseas hacer con este documento?</h3>
      <p className="text-sm text-brand-ink-2 font-sans mb-5">
        Tienes cambios sin guardar en el documento.
      </p>
      <div className="flex flex-col gap-2">
        <button
          onClick={onSave}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-brand-teal text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
        >
          <Save size={16} />
          Guardar
        </button>
        <button
          onClick={onDiscard}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
        >
          <Trash2 size={16} />
          Descartar
        </button>
        <button
          onClick={onCancel}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-brand-gold/30 text-brand-ink-2 rounded-lg hover:bg-brand-gold-pale transition-colors text-sm font-medium"
        >
          <X size={16} />
          Cancelar (seguir editando)
        </button>
      </div>
    </div>
  </div>
)

const DocumentEditor = ({ document, onBack, theme, onThemeChange, onNameChange }) => {
  const editorRef = useRef(null)
  const initialContentRef = useRef(document?.html || document?.content || '')
  const [content, setContent] = useState(initialContentRef.current)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [fileName, setFileName] = useState(document?.file_name || '')
  const initialNameRef = useRef(document?.file_name || '')

  const isDirty = content !== initialContentRef.current || fileName !== initialNameRef.current

  const handleEditorReady = (editor) => {
    editorRef.current = editor
  }

  const handleUpdate = (editor) => {
    setContent(editor.getHTML())
  }

  const handleBackClick = () => {
    if (isDirty) {
      setShowSaveDialog(true)
    } else {
      onBack()
    }
  }

  const doSave = useCallback(async () => {
    if (!window.api?.document?.save) return
    setSaving(true)
    try {
      const nameToSave = fileName.trim() || document.file_name
      await window.api.document.save({
        id: document.id,
        fileName: nameToSave,
        filePath: document.file_path,
        fileType: document.file_type,
        content,
        html: content
      })
      initialContentRef.current = content
      initialNameRef.current = nameToSave
      if (onNameChange) onNameChange(nameToSave)
      return true
    } catch (e) {
      alert(`Error al guardar: ${e.message}`)
      return false
    } finally {
      setSaving(false)
    }
  }, [content, document, fileName, onNameChange])

  const handleRename = async () => {
    if (!fileName.trim() || fileName.trim() === initialNameRef.current) {
      setEditingName(false)
      setFileName(initialNameRef.current)
      return
    }
    if (!window.api?.document?.save) return
    try {
      await window.api.document.save({
        id: document.id,
        fileName: fileName.trim(),
        filePath: document.file_path,
        fileType: document.file_type,
        content,
        html: content
      })
      initialNameRef.current = fileName.trim()
      if (onNameChange) onNameChange(fileName.trim())
      setEditingName(false)
    } catch (e) {
      alert(`Error al renombrar: ${e.message}`)
    }
  }

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') handleRename()
    if (e.key === 'Escape') {
      setEditingName(false)
      setFileName(initialNameRef.current)
    }
  }

  const handleQuickSave = async () => {
    await doSave()
  }

  const handleSaveAndClose = async () => {
    const ok = await doSave()
    if (ok) {
      setShowSaveDialog(false)
      onBack()
    }
  }

  const handleDiscard = () => {
    setShowSaveDialog(false)
    onBack()
  }

  if (!document) return null

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <header className="theme-bg theme-border px-4 py-2 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackClick}
            className="p-1.5 rounded-lg hover:bg-brand-gold-pale text-brand-ink-3 hover:text-brand-teal transition-colors"
            title="Volver al inicio"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-brand-teal to-brand-gold/60 text-white">
              <File size={16} />
            </div>
            <div>
              {editingName ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    onKeyDown={handleRenameKeyDown}
                    onBlur={handleRename}
                    autoFocus
                    className="text-sm font-bold text-brand-ink font-serif truncate max-w-md px-1.5 py-0.5 rounded border border-brand-gold/40 focus:outline-none focus:ring-1 focus:ring-brand-gold/40 bg-white"
                  />
                  <button onClick={handleRename} className="p-0.5 rounded hover:bg-green-50 text-green-600">
                    <Check size={14} />
                  </button>
                  <button onClick={() => { setEditingName(false); setFileName(initialNameRef.current) }}
                    className="p-0.5 rounded hover:bg-red-50 text-red-400">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <h1
                  className="text-sm font-bold text-brand-ink font-serif truncate max-w-md cursor-pointer hover:text-brand-teal group flex items-center gap-1.5"
                  onClick={() => { setEditingName(true); setFileName(fileName) }}
                  title="Clic para renombrar"
                >
                  {fileName}
                  <Pencil size={11} className="text-brand-ink-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h1>
              )}
              <div className="flex items-center gap-2 text-[10px] text-brand-ink-3 font-sans">
                <span className="uppercase">{document.file_type}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {formatDate(document.opened_at || document.updated_at)}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <FileText size={10} />
                  {document.word_count?.toLocaleString() || 0} palabras
                </span>
                {isDirty && (
                  <>
                    <span>·</span>
                    <span className="text-amber-600 font-semibold">sin guardar</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              onClick={handleQuickSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-teal text-white rounded-lg hover:opacity-90 transition-opacity text-xs font-medium disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          )}
          <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
        </div>
      </header>
      <Toolbar editor={editorRef.current} projectType="document" />
      <main className="flex-1 overflow-y-auto no-scrollbar theme-bg-secondary">
        <Editor
          content={content}
          onUpdate={handleUpdate}
          onEditorReady={handleEditorReady}
        />
      </main>
      {showSaveDialog && (
        <SaveDialog
          onSave={handleSaveAndClose}
          onDiscard={handleDiscard}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  )
}

export default DocumentEditor
