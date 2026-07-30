import React, { useState, useEffect, useRef } from 'react'
import {
  Sun, Moon, BookOpen, Palette, HardDrive,
  Check, RotateCcw, Undo2,
} from 'lucide-react'
import { projectService } from '../../services/projectService'
import { backupService } from '../../services/backupService'
import ColorPickerPopover from './ColorPickerPopover'
import BackupPanel from '../BackupPanel'

const THEMES = [
  { id: 'light',   icon: Sun,     label: 'Claro',        desc: 'Fondo crema clásico',     preview: 'bg-gradient-to-br from-[#FDF8F0] to-[#F5EDE0]' },
  { id: 'sepia',   icon: BookOpen, label: 'Sepia',        desc: 'Tono sepia suave',        preview: 'bg-gradient-to-br from-[#f4ecd8] to-[#e8dcc8]' },
  { id: 'dark',    icon: Moon,     label: 'Oscuro',       desc: 'Modo nocturno',          preview: 'bg-gradient-to-br from-[#1a1a2e] to-[#16213e]' },
  { id: 'custom',  icon: Palette,  label: 'Personalizado', desc: 'Colores a tu gusto',     preview: 'bg-gradient-to-br from-purple-200 via-pink-200 to-yellow-200' },
]

/* ─── Valores iniciales del tema personalizado (basados en light) ─── */
const LIGHT_THEME_HEX = {
  'bg-primary': '#FDF8F0',
  'bg-secondary': '#FAF3DC',
  'card-bg': '#ffffff',
  'hover-bg': '#FFFBEF',
  'text-primary': '#1A1610',
  'text-secondary': '#4A3F2F',
  'text-muted': '#8A7A60',
  'border-primary': '#E5DCC8',
  'border-secondary': '#D4C9A8',
  'color-brand-gold': '#C9A84C',
  'color-brand-gold-light': '#F0D080',
  'color-brand-gold-deep': '#8B6914',
  'color-brand-gold-pale': '#FAF3DC',
  'color-brand-gold-shine': '#FFFBEF',
  'color-brand-teal': '#1A3A4A',
  'color-brand-teal-mid': '#245068',
  'color-brand-teal-pale': '#EAF4F8',
  'color-brand-cream': '#FDF8F0',
  'color-brand-ink': '#1A1610',
  'color-brand-ink-2': '#4A3F2F',
  'color-brand-ink-3': '#8A7A60',
  'color-brand-devocional': '#5A9A6A',
}

/* ─── Grupos de colores expuestos en la UI ─── */
const COLOR_GROUPS = [
  {
    label: 'Fondos',
    keys: [
      { key: 'bg-primary', label: 'Fondo principal' },
      { key: 'bg-secondary', label: 'Fondo secundario' },
      { key: 'hover-bg', label: 'Hover' },
      { key: 'card-bg', label: 'Tarjetas' },
    ],
  },
  {
    label: 'Texto',
    keys: [
      { key: 'text-primary', label: 'Texto principal' },
      { key: 'text-secondary', label: 'Texto secundario' },
      { key: 'text-muted', label: 'Texto suave' },
    ],
  },
  {
    label: 'Acentos',
    keys: [
      { key: 'color-brand-gold', label: 'Dorado', isBrand: true },
      { key: 'color-brand-gold-deep', label: 'Dorado oscuro', isBrand: true },
      { key: 'color-brand-teal', label: 'Teal', isBrand: true },
      { key: 'color-brand-ink', label: 'Tinta', isBrand: true },
    ],
  },
  {
    label: 'Bordes',
    keys: [
      { key: 'border-primary', label: 'Bordes' },
    ],
  },
]

/* ─── Utilidad: hex → RGB triplet ─── */
const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r} ${g} ${b}`
}

/* ─── Aplicar colores custom al <html> ─── */
const applyCustomColors = (colors) => {
  Object.entries(colors).forEach(([key, hex]) => {
    const isBrand = key.startsWith('color-brand-')
    const cssValue = isBrand ? hexToRgb(hex) : hex
    document.documentElement.style.setProperty(`--custom-${key}`, cssValue)
  })
}

const SettingsPanel = ({ theme, onThemeChange, projectId, isProjectOpen }) => {
  const [backups, setBackups] = useState([])
  const [backupStatus, setBackupStatus] = useState('')
  const [projectTheme, setProjectTheme] = useState(null)
  const [customColors, setCustomColors] = useState(null)
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef(null)

  /* ─── Cargar datos ─── */
  useEffect(() => {
    const load = async () => {
      try {
        const [list, pt, savedCustom] = await Promise.all([
          backupService.listBackups(),
          projectId ? projectService.getProjectTheme(projectId) : Promise.resolve(null),
          projectService.getCustomTheme(),
        ])
        setBackups(list || [])
        if (pt) setProjectTheme(pt)
        if (savedCustom) {
          setCustomColors(savedCustom)
        } else {
          // Primera vez: usar valores del tema light
          setCustomColors({ ...LIGHT_THEME_HEX })
        }
      } catch {
        // silencio
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  /* ─── Al activar tema custom, aplicar colores guardados ─── */
  useEffect(() => {
    if (theme === 'custom' && customColors) {
      applyCustomColors(customColors)
    }
  }, [theme, customColors])

  /* ─── Respaldos ─── */
  const handleCreateBackup = async () => {
    setBackupStatus('Respaldando...')
    const result = await backupService.createBackup()
    if (result.success) {
      setBackupStatus('✓ Respaldado')
      const list = await backupService.listBackups()
      setBackups(list || [])
    } else {
      setBackupStatus('✗ Error')
    }
    setTimeout(() => setBackupStatus(''), 3000)
  }

  /* ─── Tema por proyecto ─── */
  const handleSetProjectTheme = async (t) => {
    if (!projectId) return
    await projectService.setProjectTheme(projectId, t)
    setProjectTheme(t)
    onThemeChange(t)
  }

  const handleClearProjectTheme = async () => {
    if (!projectId) return
    await projectService.setProjectTheme(projectId, null)
    setProjectTheme(null)
    const globalTheme = await projectService.getSetting('theme')
    onThemeChange(globalTheme || 'light')
  }

  /* ─── Color personalizado: cambio ─── */
  const handleColorChange = (key, hex) => {
    const updated = { ...customColors, [key]: hex }
    setCustomColors(updated)

    // Aplicar al instante
    const isBrand = key.startsWith('color-brand-')
    document.documentElement.style.setProperty(
      `--custom-${key}`,
      isBrand ? hexToRgb(hex) : hex,
    )

    // Guardar con debounce
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await projectService.saveCustomTheme(updated)
    }, 500)
  }

  /* ─── Restablecer colores a valores light ─── */
  const handleResetCustom = async () => {
    const defaults = { ...LIGHT_THEME_HEX }
    setCustomColors(defaults)
    applyCustomColors(defaults)
    await projectService.saveCustomTheme(defaults)
  }

  /* ─── Helpers ─── */
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr.replace(' ', 'T'))
    return d.toLocaleString('es-ES', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center theme-bg-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold" />
      </div>
    )
  }

  /* ─── Render ─── */
  return (
    <div className="h-full flex flex-col overflow-hidden theme-bg-secondary">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* ═══════ ENCABEZADO ═══════ */}
        <div>
          <h1 className="text-2xl font-bold text-brand-ink font-serif">Configuración</h1>
          <p className="text-sm text-brand-ink-3 font-sans mt-1">
            Personaliza tu experiencia en LemWriter
          </p>
        </div>

        {/* ═══════ TEMA GLOBAL ═══════ */}
        <section className="bg-white rounded-xl border border-brand-gold/20 p-5">
          <h2 className="text-sm font-bold text-brand-ink font-serif mb-1">Tema global</h2>
          <p className="text-xs text-brand-ink-3 font-sans mb-4">
            Define el tema visual predeterminado de la aplicación
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {THEMES.map((t) => {
              const Icon = t.icon
              const isActive = theme === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => onThemeChange(t.id)}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    isActive
                      ? 'border-brand-gold shadow-md'
                      : 'border-brand-gold/20 hover:border-brand-gold/40'
                  }`}
                >
                  <div className={`w-full h-16 rounded-lg mb-3 ${t.preview} border ${isActive ? 'border-brand-gold' : 'border-brand-gold/10'}`} />
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={isActive ? 'text-brand-gold-deep' : 'text-brand-ink-3'} />
                    <span className={`text-sm font-semibold font-serif ${isActive ? 'text-brand-ink' : 'text-brand-ink-2'}`}>
                      {t.label}
                    </span>
                    {isActive && <Check size={14} className="ml-auto text-brand-gold-deep" />}
                  </div>
                  <p className="text-[10px] text-brand-ink-3 font-sans mt-0.5">{t.desc}</p>
                </button>
              )
            })}
          </div>
        </section>

        {/* ═══════ EDITOR DE COLORES (solo tema custom) ═══════ */}
        {theme === 'custom' && customColors && (
          <section className="bg-white rounded-xl border border-brand-gold/20 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-brand-ink font-serif mb-1">Editor de colores</h2>
                <p className="text-xs text-brand-ink-3 font-sans">
                  Los cambios se aplican en tiempo real
                </p>
              </div>
              <button
                onClick={handleResetCustom}
                className="flex items-center gap-1 text-xs text-brand-ink-3 hover:text-red-500 font-sans transition-colors"
                title="Restablecer colores por defecto"
              >
                <Undo2 size={11} />
                Restablecer
              </button>
            </div>

            {/* Parrilla 2 columnas en desktop para evitar que los pickers queden al fondo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
              {COLOR_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-[10px] font-semibold text-brand-ink-3 uppercase tracking-wider font-sans mb-1.5">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.keys.map(({ key, label, isBrand }) => (
                      <div key={key} className="flex items-center gap-2 rounded-md hover:bg-brand-gold-pale/40 transition-colors px-1.5 py-1">
                        <ColorPickerPopover
                          color={customColors[key]}
                          onChange={(hex) => handleColorChange(key, hex)}
                          label={label}
                        />
                        <span className="text-xs text-brand-ink font-sans flex-1 min-w-0 truncate">{label}</span>
                        <span className="text-[10px] text-brand-ink-3 font-mono shrink-0">{customColors[key]}</span>
                        {isBrand && (
                          <span className="text-[9px] text-brand-gold-deep/60 font-sans shrink-0">RGB</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ═══════ TEMA POR PROYECTO ═══════ */}
        {isProjectOpen && (
          <section className="bg-white rounded-xl border border-brand-gold/20 p-5">
            <h2 className="text-sm font-bold text-brand-ink font-serif mb-1">Tema de este proyecto</h2>
            <p className="text-xs text-brand-ink-3 font-sans mb-4">
              Sobrescribe el tema global solo para este proyecto
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {THEMES.map((t) => {
                const Icon = t.icon
                const isActive = projectTheme === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSetProjectTheme(t.id)}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      isActive
                        ? 'border-brand-gold shadow-sm'
                        : 'border-brand-gold/20 hover:border-brand-gold/40 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className={`w-full h-10 rounded-lg mb-2 ${t.preview} border ${isActive ? 'border-brand-gold' : 'border-brand-gold/10'}`} />
                    <div className="flex items-center gap-1.5">
                      <Icon size={13} className={isActive ? 'text-brand-gold-deep' : 'text-brand-ink-3'} />
                      <span className={`text-xs font-semibold font-serif ${isActive ? 'text-brand-ink' : 'text-brand-ink-2'}`}>
                        {t.label}
                      </span>
                      {isActive && <Check size={12} className="ml-auto text-brand-gold-deep" />}
                    </div>
                  </button>
                )
              })}
            </div>
            {projectTheme && (
              <button
                onClick={handleClearProjectTheme}
                className="mt-3 text-xs text-brand-ink-3 hover:text-red-500 font-sans transition-colors flex items-center gap-1"
              >
                <RotateCcw size={11} />
                Usar tema global (quitar tema personalizado)
              </button>
            )}
          </section>
        )}

        {/* ═══════ RESPALDOS ═══════ */}
        <section className="bg-white rounded-xl border border-brand-gold/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-brand-ink font-serif mb-1">Respaldos</h2>
              <p className="text-xs text-brand-ink-3 font-sans">
                {backups.length > 0
                  ? `${backups.length} respaldo${backups.length !== 1 ? 's' : ''}`
                  : 'Aún no hay respaldos'}
              </p>
            </div>
            <button
              onClick={handleCreateBackup}
              className="flex items-center gap-1.5 text-sm px-4 py-2 bg-brand-teal text-white rounded-lg hover:opacity-90 transition-opacity font-sans"
            >
              <HardDrive size={14} />
              {backupStatus || 'Respaldar ahora'}
            </button>
          </div>

          {backups.length > 0 && (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {backups.map((b, i) => (
                <div key={b.name} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg hover:bg-brand-gold-pale/30 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-brand-ink-3 font-sans shrink-0">#{backups.length - i}</span>
                    <span className="text-brand-ink font-sans truncate">{formatDate(b.date)}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-brand-ink-3 font-sans">{formatSize(b.size)}</span>
                    <button
                      onClick={async () => {
                        if (confirm(`Restaurar respaldo del ${formatDate(b.date)}?\n\nLa aplicacion se reiniciara. Los cambios no guardados se perderan.`)) {
                          const result = await backupService.restoreBackup(b.path)
                          if (!result.success) {
                            alert('Error al restaurar: ' + (result.error || 'desconocido'))
                          }
                        }
                      }}
                      className="text-brand-gold-deep hover:text-red-500 font-sans transition-colors"
                      title="Restaurar este respaldo"
                    >
                      Restaurar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ═══════ RESPALDO EN LA NUBE ═══════ */}
        <section className="bg-white rounded-xl border border-brand-gold/20 p-5">
          <BackupPanel />
        </section>

        {/* ═══════ INFORMACIÓN ═══════ */}
        <section className="bg-white rounded-xl border border-brand-gold/20 p-5">
          <h2 className="text-sm font-bold text-brand-ink font-serif mb-3">Información</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-sans">
            <div>
              <p className="text-brand-ink-3">App</p>
              <p className="text-brand-ink font-medium">LemWriter</p>
            </div>
            <div>
              <p className="text-brand-ink-3">Versión</p>
              <p className="text-brand-ink font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-brand-ink-3">Tema actual</p>
              <p className="text-brand-ink font-medium capitalize">{theme}</p>
            </div>
            <div>
              <p className="text-brand-ink-3">Base de datos</p>
              <p className="text-brand-ink font-medium">SQLite</p>
            </div>
          </div>
        </section>

        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
