import React, { useState } from 'react'
import { FileText, BookOpen, BookMarked, X, Loader } from 'lucide-react'
import { exportService } from '../../services/exportService'
import { projectService } from '../../services/projectService'
import { buildCharactersSection, buildResourcesSection } from '../../services/exportAppendixService'
import { BOOK_STYLES } from '../../config/bookStyles'

const formats = [
  { id: 'pdf', label: 'PDF', desc: 'Documento portátil, listo para imprimir o compartir.', icon: FileText },
  { id: 'docx', label: 'DOCX', desc: 'Documento de Word editable.', icon: BookOpen },
  { id: 'epub', label: 'EPUB', desc: 'Formato de libro electrónico estándar.', icon: BookMarked },
]

const ExportModal = ({ project, sections, projectStyle, onClose }) => {
  const [selectedFormat, setSelectedFormat] = useState('pdf')
  const [exporting, setExporting] = useState(false)
  const [done, setDone] = useState(null)

  const handleExport = async () => {
    setExporting(true)
    setDone(null)
    try {
      const extraSections = []

      if (project.type === 'libro' || project.type === 'estudio') {
        const characters = await projectService.getCharacters(project.id)
        const charSection = buildCharactersSection(characters)
        if (charSection) extraSections.push(charSection)
      }

      if (project.type === 'libro' || project.type === 'ensenanza' || project.type === 'estudio') {
        const resources = await projectService.getProjectResources(project.id)
        const resourcesSection = buildResourcesSection(resources)
        if (resourcesSection) extraSections.push(resourcesSection)
      }

      const fullSections = [...sections, ...extraSections]
      const path = await exportService[`export${selectedFormat.toUpperCase()}`](project, fullSections, projectStyle)
      if (path) setDone(path)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const handleClose = () => {
    if (!exporting) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-brand-ink font-serif">Exportar</h2>
          <button onClick={handleClose} className="p-0.5 rounded text-brand-ink-3 hover:text-brand-ink hover:bg-brand-gold-pale">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {formats.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFormat(f.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                  selectedFormat === f.id
                    ? 'border-brand-gold bg-brand-gold-pale'
                    : 'border-brand-gold/20 hover:border-brand-gold/40'
                }`}
              >
                <f.icon size={20} className={selectedFormat === f.id ? 'text-brand-gold-deep' : 'text-brand-ink-3'} />
                <span className={`text-xs font-semibold ${selectedFormat === f.id ? 'text-brand-teal' : 'text-brand-ink'}`}>
                  {f.label}
                </span>
              </button>
            ))}
          </div>

          <p className="text-xs text-brand-ink-3">{formats.find(f => f.id === selectedFormat)?.desc}</p>

          <div className="text-xs text-brand-ink-3 bg-brand-gold-pale/50 rounded p-2 space-y-0.5">
            <p><span className="font-medium">Estilo:</span> {BOOK_STYLES[projectStyle]?.label || projectStyle}</p>
            <p><span className="font-medium">Secciones:</span> {sections?.length || 0}</p>
          </div>
        </div>

        <div className="px-5 py-3 border-t flex items-center justify-between">
          <div>
            {done && (
              <span className="text-xs text-green-600">✓ Exportado correctamente</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              disabled={exporting}
              className="text-xs px-4 py-1.5 rounded border border-brand-gold/30 text-brand-ink-3 hover:bg-brand-gold-pale disabled:opacity-50 font-sans"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="text-xs px-4 py-1.5 rounded bg-brand-gold text-white hover:bg-brand-gold-deep disabled:opacity-50 flex items-center gap-1.5 font-sans"
            >
              {exporting && <Loader size={12} className="animate-spin" />}
              {exporting ? 'Exportando...' : `Exportar ${selectedFormat.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportModal
