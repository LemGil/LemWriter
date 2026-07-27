import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  BookOpen, GraduationCap, Heart, Mic, Video, Search, Sparkles,
  Clock, ArrowRight
} from 'lucide-react'
import { projectService } from '../../services/projectService'
import BackupButton from './BackupButton'

const projectTypes = [
  {
    id: 'book',
    title: 'Libro',
    description: 'Obra completa para publicación',
    icon: BookOpen,
    bg: 'bg-gradient-to-br from-brand-teal to-brand-teal-mid',
  },
  {
    id: 'teaching',
    title: 'Enseñanza',
    description: 'Clase o serie bíblica',
    icon: GraduationCap,
    bg: 'bg-gradient-to-br from-brand-gold-deep to-brand-gold',
  },
  {
    id: 'devotional',
    title: 'Devocional',
    description: 'Reflexión diaria',
    icon: Heart,
    bg: 'bg-gradient-to-br from-devocional/90 to-devocional/60',
  },
  {
    id: 'estudio',
    title: 'Estudio',
    description: 'Análisis de pasajes',
    icon: Search,
    bg: 'bg-gradient-to-br from-brand-ink-2 to-brand-ink',
  },
  {
    id: 'sermon',
    title: 'Sermón',
    description: 'Guión de predicación',
    icon: Mic,
    bg: 'bg-gradient-to-br from-brand-gold-deep/80 to-brand-gold-deep',
  },
  {
    id: 'video',
    title: 'Video',
    description: 'Guión para YouTube',
    icon: Video,
    bg: 'bg-gradient-to-br from-brand-teal to-brand-teal-mid',
  },
]

const verses = [
  { text: 'Escribe la visión, y declárala en tablas, para que corra el que leyere en ella.', ref: 'Habacuc 2:2' },
  { text: 'Procura con diligencia presentarte a Dios aprobado, como obrero que no tiene de qué avergonzarse.', ref: '2 Timoteo 2:15' },
  { text: 'La pluma del escribiente veloz es la lengua del sabio.', ref: 'Salmos 45:1 (paráfrasis)' },
  { text: 'Meditaré en tus mandamientos, y consideraré tus caminos.', ref: 'Salmos 119:15' },
  { text: 'La palabra de Cristo more en abundancia en vosotros, enseñándoos y exhortándoos unos a otros.', ref: 'Colosenses 3:16' },
]

const Home = ({ onSelectType, onOpenProject, onOpenSection, onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [globalResults, setGlobalResults] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [stats, setStats] = useState({ totalProjects: 0, totalWords: 0, totalSections: 0, wordsToday: 0 })
  const [docCount, setDocCount] = useState(0)
  const [resourceCount, setResourceCount] = useState(0)
  const [verseIndex] = useState(() => Math.floor(Math.random() * verses.length))
  const searchTimer = useRef(null)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  /* ─── Cargar datos ─── */
  useEffect(() => {
    const load = async () => {
      try {
        const [activity, projectStats, docs, resources] = await Promise.all([
          projectService.getRecentActivity(5),
          projectService.getProjectStats(),
          window.api?.document?.list().then(l => l?.length || 0).catch(() => 0),
          projectService.getResourceCount(),
        ])
        setRecentActivity(activity || [])
        setStats(projectStats)
        setDocCount(docs || 0)
        setResourceCount(resources || 0)
      } catch {
        // silencio
      }
    }
    load()
  }, [])

  /* ─── Búsqueda global ─── */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setGlobalResults(null)
      return
    }
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await projectService.globalSearch(searchQuery)
        setGlobalResults(results)
      } catch {
        setGlobalResults(null)
      }
    }, 300)
    return () => clearTimeout(searchTimer.current)
  }, [searchQuery])

  /* ─── Helper: normalizar tipo para íconos ─── */
  const normalizeTypeId = (type) => {
    const map = { libro: 'book', ensenanza: 'teaching', devocional: 'devotional', devotional: 'devotional', estudio: 'estudio', study: 'estudio' }
    return map[type] || type
  }

  const getTypeIcon = (type) => {
    const found = projectTypes.find(t => t.id === normalizeTypeId(type))
    return found ? <found.icon size={15} /> : null
  }

  const getTypeColor = (type) => {
    const colors = {
      book: 'bg-gradient-to-br from-brand-teal to-brand-teal-mid',
      teaching: 'bg-gradient-to-br from-brand-gold-deep to-brand-gold',
      devotional: 'bg-gradient-to-br from-devocional/90 to-devocional/60',
      estudio: 'bg-gradient-to-br from-brand-ink-2 to-brand-ink',
      sermon: 'bg-gradient-to-br from-brand-gold-deep/80 to-brand-gold-deep',
      video: 'bg-gradient-to-br from-brand-teal to-brand-teal-mid',
    }
    return colors[normalizeTypeId(type)] || 'bg-gradient-to-br from-brand-ink-3 to-brand-ink-2'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now - d
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'Ahora'
    if (mins < 60) return `Hace ${mins} min`
    if (hours < 24) return `Hace ${hours}h`
    if (days < 7) return `Hace ${days}d`
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="h-full flex flex-col theme-bg overflow-hidden">
      <main className="flex-1 overflow-y-auto no-scrollbar theme-bg-secondary">
        <div className="max-w-6xl mx-auto px-6 py-6">

          {/* ═══════ SALUDO + VERSÍCULO ═══════ */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 bg-brand-gold-pale text-brand-gold-deep px-3 py-1 rounded-full text-xs font-medium mb-2 border border-brand-gold/30 font-sans">
              <Sparkles size={12} />
              {getGreeting()}, sigamos escribiendo
            </div>
            <p className="text-base text-brand-ink-2 max-w-2xl mx-auto font-serif italic">
              "{verses[verseIndex].text}" — <span className="not-italic font-sans text-xs">{verses[verseIndex].ref}</span>
            </p>
          </div>

          {/* ═══════ BÚSQUEDA ═══════ */}
          <div className="max-w-xl mx-auto mb-5">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink-3" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar en todos los proyectos..."
                className="w-full text-sm border border-brand-gold/30 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold bg-white theme-text"
              />
            </div>

            {globalResults && (
              <div className="mt-2 theme-card rounded-xl border border-brand-gold/20 shadow-lg overflow-hidden divide-y divide-brand-gold/10 max-h-80 overflow-y-auto">
                {globalResults.projects.length > 0 && (
                  <div className="p-3">
                    <p className="text-[10px] font-semibold text-brand-gold-deep uppercase tracking-wide mb-1 font-sans">Proyectos</p>
                    {globalResults.projects.map(p => (
                      <button key={p.id} onClick={() => onOpenProject?.(p)}
                        className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-brand-gold-pale text-sm">
                        <span className="text-brand-ink font-medium truncate">{p.title}</span>
                        <span className="text-[10px] text-brand-ink-3 font-sans shrink-0">{p.type}</span>
                      </button>
                    ))}
                  </div>
                )}
                {globalResults.sections.length > 0 && (
                  <div className="p-3">
                    <p className="text-[10px] font-semibold text-brand-gold-deep uppercase tracking-wide mb-1 font-sans">Secciones</p>
                    {globalResults.sections.map(s => (
                      <button key={s.id} onClick={() => onOpenSection?.(s.project_id, s.id)}
                        className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-brand-gold-pale text-sm">
                        <span className="text-brand-ink font-medium truncate">{s.title}</span>
                        <span className="text-[10px] text-brand-ink-3 font-sans shrink-0">{s.project_title}</span>
                      </button>
                    ))}
                  </div>
                )}
                {globalResults.resources.length > 0 && (
                  <div className="p-3">
                    <p className="text-[10px] font-semibold text-brand-gold-deep uppercase tracking-wide mb-1 font-sans">Recursos</p>
                    {globalResults.resources.map(r => (
                      <div key={r.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                        <span className="text-brand-ink font-medium truncate">{r.title}</span>
                        <span className="text-[10px] text-brand-ink-3 font-sans shrink-0">{r.type}</span>
                      </div>
                    ))}
                  </div>
                )}
                {globalResults.projects.length === 0 && globalResults.sections.length === 0 && globalResults.resources.length === 0 && (
                  <p className="text-xs text-brand-ink-3 text-center py-4 font-sans">Sin resultados</p>
                )}
              </div>
            )}
          </div>

          {/* ═══════ STATS ═══════ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-5">
            <div className="theme-card rounded-xl border border-brand-gold/20 p-3 text-center">
              <p className="text-xl font-bold text-brand-ink font-serif">{stats.totalProjects}</p>
              <p className="text-[10px] text-brand-ink-3 font-sans">Proyectos</p>
            </div>
            <div className="theme-card rounded-xl border border-brand-gold/20 p-3 text-center">
              <p className="text-xl font-bold text-brand-ink font-serif">{stats.totalWords.toLocaleString()}</p>
              <p className="text-[10px] text-brand-ink-3 font-sans">Palabras</p>
            </div>
            <div className="theme-card rounded-xl border border-brand-gold/20 p-3 text-center">
              <p className="text-xl font-bold text-brand-ink font-serif">{stats.totalSections}</p>
              <p className="text-[10px] text-brand-ink-3 font-sans">Secciones</p>
            </div>
            <div className="theme-card rounded-xl border border-brand-gold/20 p-3 text-center">
              <p className="text-xl font-bold text-brand-ink font-serif">{stats.wordsToday.toLocaleString()}</p>
              <p className="text-[10px] text-brand-ink-3 font-sans">Palabras hoy</p>
            </div>
            <div className="theme-card rounded-xl border border-brand-gold/20 p-3 text-center">
              <p className="text-xl font-bold text-brand-ink font-serif">{docCount}</p>
              <p className="text-[10px] text-brand-ink-3 font-sans">Documentos</p>
            </div>
            <div className="theme-card rounded-xl border border-brand-gold/20 p-3 text-center">
              <p className="text-xl font-bold text-brand-ink font-serif">{resourceCount}</p>
              <p className="text-[10px] text-brand-ink-3 font-sans">Recursos</p>
            </div>
          </div>

          {/* ═══════ RESPALDO ═══════ */}
          <div className="flex justify-end mb-5">
            <BackupButton />
          </div>

          {/* ═══════ CONTINUAR DONDE LO DEJASTE ═══════ */}
          {recentActivity.length > 0 && (
            <div className="mb-5">
              <h3 className="text-sm font-bold text-brand-ink font-serif mb-3 flex items-center gap-1.5">
                <Clock size={14} className="text-brand-gold-deep" />
                Continuar donde lo dejaste
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {recentActivity.map(item => (
                  <button
                    key={item.id}
                    onClick={() => onOpenSection?.(item.project_id, item.id)}
                    className="theme-card rounded-xl border border-brand-gold/20 p-3 hover:shadow-md transition-shadow text-left group"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs ${getTypeColor(item.project_type)}`}>
                        {getTypeIcon(item.project_type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-brand-ink-3 font-sans truncate">{item.project_title}</p>
                        <p className="text-sm font-semibold text-brand-ink truncate font-serif">{item.title}</p>
                        {item.content && (
                          <p className="text-xs text-brand-ink-3 font-sans mt-0.5 line-clamp-1">
                            {item.content.replace(/<[^>]*>/g, '').substring(0, 100)}
                          </p>
                        )}
                        <p className="text-[10px] text-brand-ink-3 font-sans mt-1">{formatDate(item.updated_at)}</p>
                      </div>
                      <ArrowRight size={14} className="text-brand-gold/40 group-hover:text-brand-gold shrink-0 mt-1 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ═══════ CREACIÓN RÁPIDA ═══════ */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-brand-ink font-serif">Crear nuevo</h3>
              <button
                onClick={() => onNavigate?.('proyectos')}
                className="flex items-center gap-1 text-xs text-brand-teal hover:text-brand-gold-deep font-sans font-medium transition-colors"
              >
                Ver todos los proyectos
                <ArrowRight size={12} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {projectTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => onSelectType(type.id)}
                  className="flex items-center gap-2 p-3 rounded-xl border border-brand-gold/20 theme-card hover:border-brand-gold/40 hover:shadow-md transition-all text-left"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${type.bg} text-white`}>
                    <type.icon size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-brand-ink font-serif truncate">+ {type.title}</p>
                    <p className="text-[9px] text-brand-ink-3 font-sans truncate">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

export default Home
