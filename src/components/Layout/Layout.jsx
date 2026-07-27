import React, { useState, useEffect, useRef } from 'react'
import { Pencil, FileDown, HardDrive, ChevronLeft, ChevronRight } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { backupService } from '../../services/backupService'
import useAppStore from '../../stores/appStore'

const Layout = ({ sidebar, editor, rightPanel, toolbar, title, onBack, wordCount, charCount, projectType, onSave, onRename, onExport, theme, onThemeChange }) => {
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))
  const [saved, setSaved] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(title)
  const [backupStatus, setBackupStatus] = useState('')
  const inputRef = useRef(null)
  const isLeftCollapsed = useAppStore((s) => s.isLeftCollapsed)
  const isRightCollapsed = useAppStore((s) => s.isRightCollapsed)
  const toggleLeft = () => {
    console.log('Layout: toggleLeft clicked');
    useAppStore.getState().toggleLeftPanel();
  };
  const toggleRight = () => {
    console.log('Layout: toggleRight clicked');
    useAppStore.getState().toggleRightPanel();
  };

  useEffect(() => {
    setEditValue(title)
  }, [title])

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [saved])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    if (onSave) {
      onSave()
      setSaved(true)
    }
  }

  const handleStartEdit = () => {
    setEditValue(title)
    setIsEditing(true)
  }

  const handleConfirmEdit = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== title && onRename) {
      onRename(trimmed)
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditValue(title)
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirmEdit()
    if (e.key === 'Escape') handleCancelEdit()
  }

  const handleBackup = async () => {
    setBackupStatus('Guardando...')
    const result = await backupService.createBackup()
    if (result.success) {
      setBackupStatus('✓ Respaldado')
    } else {
      setBackupStatus('✗ Error')
    }
    setTimeout(() => setBackupStatus(''), 3000)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden theme-bg">
      <header className="h-14 theme-bg theme-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={onBack} className="p-1 theme-hover rounded shrink-0 theme-text-secondary" title="Volver al inicio">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <span className="w-px h-5 bg-current opacity-20 shrink-0" />
          {/* Botón para colapsar/expandir sidebar izquierdo */}
          <button onClick={toggleLeft} className="p-1 theme-hover rounded shrink-0 theme-text-secondary" title={isLeftCollapsed ? 'Expandir panel lateral' : 'Colapsar panel lateral'}>
            {isLeftCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>

          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={handleConfirmEdit}
              onKeyDown={handleKeyDown}
              className="font-semibold theme-text text-base border-b-2 border-brand-gold outline-none bg-transparent min-w-0 flex-1"
            />
          ) : (
            <button
              onClick={handleStartEdit}
              className="font-semibold theme-text truncate hover:text-brand-gold-deep transition-colors flex items-center gap-1.5 group min-w-0"
              title="Clic para editar nombre"
            >
              <span className="truncate">{title}</span>
              <Pencil size={12} className="theme-text-muted group-hover:text-brand-gold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}

          {saved && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full shrink-0 font-sans">
              ✓ Guardado
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
           <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
            {/* Botón para colapsar/expandir panel derecho */}
            <button onClick={toggleRight} className="p-1 theme-hover rounded shrink-0 theme-text-secondary" title={isRightCollapsed ? 'Expandir panel derecho' : 'Colapsar panel derecho'}>
              {isRightCollapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
            <button
              onClick={onExport}
               className="text-sm px-3 py-1 theme-bg-secondary hover:bg-brand-gold-pale rounded flex items-center gap-1 font-sans"
              title="Exportar"
            >
              <FileDown size={14} />
              Exportar
            </button>
            <button
              onClick={handleSave}
               className="text-sm px-3 py-1 theme-bg-secondary hover:bg-brand-gold-pale rounded font-sans"
            >
              Guardar
            </button>
         </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden min-h-0">
        <aside className={`shrink-0 border-r theme-border theme-bg hidden md:block overflow-y-auto no-scrollbar transition-all duration-300 ${isLeftCollapsed ? 'w-20 overflow-hidden' : 'w-64'}`}>
          {sidebar}
        </aside>

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {toolbar}
          <main className="flex-1 overflow-y-auto no-scrollbar theme-bg">
            {editor}
          </main>
        </div>

        <aside className={`shrink-0 border-l theme-border theme-bg hidden lg:block overflow-y-auto no-scrollbar transition-all duration-200 ${isRightCollapsed ? 'w-16' : 'w-72'}`}>
          {rightPanel}
        </aside>
      </div>

      <footer className="h-7 theme-bg theme-border flex items-center justify-between px-4 text-xs theme-text-secondary shrink-0">
        <div className="flex items-center gap-4">
          <span>Palabras: <strong className="theme-text">{wordCount.toLocaleString()}</strong></span>
          <span>Caracteres: <strong className="theme-text">{charCount.toLocaleString()}</strong></span>
        </div>
        <div className="flex items-center gap-4">
          {(projectType === 'devocional' || projectType === 'devotional' || projectType === 'estudio' || projectType === 'study') && (
            <span className="text-green-600">Lectura: <strong>~{readingTime} min</strong></span>
          )}
          <button
            onClick={handleBackup}
            className="flex items-center gap-1 hover:text-brand-gold-deep transition-colors"
            title="Respaldar base de datos"
          >
            <HardDrive size={11} />
            {backupStatus || 'Respaldar'}
          </button>
          <span className="theme-text-muted">LemWriter</span>
        </div>
      </footer>
    </div>
  )
}

export default Layout
