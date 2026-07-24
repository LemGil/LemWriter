import React, { useState, useEffect, useCallback, useRef } from 'react'
import { BookOpen, GraduationCap, Heart, Search, Mic, Video, FileText, Sparkles, Trash2, ExternalLink, Clock } from 'lucide-react'
import { projectService } from '../../services/projectService'
import BackupButton from '../Home/BackupButton'

const projectTypes = [
  {
    id: 'book',
    title: 'Libros',
    description: 'Obras completas para publicación con capítulos, referencias y personajes.',
    icon: BookOpen,
    bg: 'bg-gradient-to-br from-[#1A3A4A] to-[#2A5A6A]',
    light: 'bg-blue-50',
    border: 'border-blue-200',
    features: ['Capítulos', 'Referencias', 'Personajes'],
  },
  {
    id: 'teaching',
    title: 'Enseñanzas',
    description: 'Clases y series bíblicas con puntos clave, preguntas y texto base.',
    icon: GraduationCap,
    bg: 'bg-gradient-to-br from-[#C9A24A] to-[#D4B76A]',
    light: 'bg-yellow-50',
    border: 'border-yellow-200',
    features: ['Puntos', 'Preguntas', 'Texto base'],
  },
  {
    id: 'devotional',
    title: 'Devocional',
    description: 'Reflexiones diarias para meditación.',
    icon: Heart,
    bg: 'bg-gradient-to-br from-[#5A9A6A] to-[#7ABA8A]',
    light: 'bg-green-50',
    border: 'border-green-200',
    features: ['Versículo', 'Reflexión', 'Oración'],
  },
  {
    id: 'estudio',
    title: 'Estudios Bíblicos',
    description: 'Análisis de pasajes con referencias, palabras y aplicación.',
    icon: Search,
    bg: 'bg-gradient-to-br from-[#5A4A3A] to-[#7A6A5A]',
    light: 'bg-amber-50',
    border: 'border-amber-200',
    features: ['Texto Base', 'Puntos', 'Aplicación'],
  },
  {
    id: 'sermon',
    title: 'Sermones',
    description: 'Guiones de predicación con gancho, punto, ilustración y llamado.',
    icon: Mic,
    bg: 'bg-gradient-to-br from-[#7A3A4A] to-[#9A5A6A]',
    light: 'bg-red-50',
    border: 'border-red-200',
    features: ['Gancho', 'Ilustración', 'Llamado'],
  },
  {
    id: 'video',
    title: 'Videos',
    description: 'Guiones para YouTube, largos o cortos, listos para grabar.',
    icon: Video,
    bg: 'bg-gradient-to-br from-[#4A4A7A] to-[#6A6A9A]',
    light: 'bg-purple-50',
    border: 'border-purple-200',
    features: ['Hook', 'Guion', 'Cierre'],
  },
]

const dbTypeMap = { book: 'libro', teaching: 'ensenanza', devotional: 'devocional', estudio: 'estudio', sermon: 'sermon', video: 'video' }

const normalizeTypeId = (type) => {
  const map = { libro: 'book', ensenanza: 'teaching', devocional: 'devotional', devotional: 'devotional', estudio: 'estudio', study: 'estudio' }
  return map[type] || type
}

const getTypeColor = (type) => {
  const colors = {
    book: 'bg-gradient-to-br from-[#1A3A4A] to-[#2A5A6A]',
    teaching: 'bg-gradient-to-br from-[#C9A24A] to-[#D4B76A]',
    devotional: 'bg-gradient-to-br from-[#5A9A6A] to-[#7ABA8A]',
    estudio: 'bg-gradient-to-br from-[#5A4A3A] to-[#7A6A5A]',
    sermon: 'bg-gradient-to-br from-[#7A3A4A] to-[#9A5A6A]',
    video: 'bg-gradient-to-br from-[#4A4A7A] to-[#6A6A9A]',
  }
  return colors[normalizeTypeId(type)] || 'bg-gradient-to-br from-gray-500 to-gray-600'
}

const getTypeIcon = (type) => {
  const found = projectTypes.find(t => t.id === normalizeTypeId(type))
  return found ? <found.icon size={18} /> : null
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

const ProyectosView = ({ recentProjects = [], onSelectType, onOpenProject, onDeleteProject }) => {
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [projectStats, setProjectStats] = useState({})
  const searchTimer = useRef(null)

  useEffect(() => {
    const fetchStats = async () => {
      const stats = {}
      for (const project of recentProjects) {
        const fullProject = await projectService.getProject(project.id)
        stats[project.id] = fullProject
      }
      setProjectStats(stats)
    }
    fetchStats()
  }, [recentProjects])

  const tabs = [
    { id: 'all', label: 'Todos', count: recentProjects.length },
    { id: 'book', label: 'Libros', icon: BookOpen, count: recentProjects.filter(p => p.type === 'libro' || p.type === 'book').length },
    { id: 'teaching', label: 'Enseñanzas', icon: GraduationCap, count: recentProjects.filter(p => p.type === 'ensenanza' || p.type === 'teaching').length },
    { id: 'devotional', label: 'Devocionales', icon: Heart, count: recentProjects.filter(p => p.type === 'devocional' || p.type === 'devotional').length },
    { id: 'estudio', label: 'Estudios', icon: Search, count: recentProjects.filter(p => p.type === 'estudio' || p.type === 'study').length },
    { id: 'sermon', label: 'Sermones', icon: Mic, count: recentProjects.filter(p => p.type === 'sermon').length },
    { id: 'video', label: 'Videos', icon: Video, count: recentProjects.filter(p => p.type === 'video').length },
  ]

  const filteredProjects = typeFilter === 'all'
    ? recentProjects
    : recentProjects.filter(p => p.type === dbTypeMap[typeFilter] || p.type === typeFilter)

  const searchFiltered = searchQuery.trim()
    ? filteredProjects.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : filteredProjects

  const statsProjects = searchFiltered.map(p => projectStats[p.id] || p)

  const totalWords = (projects) => {
    return projects.reduce((sum, p) => {
      const sections = p.sections || []
      const words = sections.reduce((s, sec) => {
        const text = (sec.content || '').replace(/<[^>]*>/g, '')
        return s + (text.trim() === '' ? 0 : text.trim().split(/\s+/).length)
      }, 0)
      return sum + words
    }, 0)
  }

  const totalSections = (projects) => {
    return projects.reduce((sum, p) => sum + (p.sections || []).length, 0)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden theme-bg-secondary">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-6xl mx-auto px-6 py-6">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-brand-gold-pale text-brand-gold-deep px-3 py-1 rounded-full text-xs font-medium mb-3 border border-brand-gold/30 font-sans">
              <Sparkles size={12} />
              Tus proyectos ministeriales
            </div>
            <h2 className="text-3xl font-bold text-brand-ink mb-2 font-serif">
              Crea contenido que <span className="text-brand-gold-deep">transforma</span>
            </h2>
          </div>

          {/* Buscador */}
          <div className="max-w-xl mx-auto mb-6">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink-3" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar proyectos..."
                className="w-full text-sm border border-brand-gold/30 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold bg-white theme-text"
              />
            </div>
          </div>

          {/* Tipos de proyecto */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {projectTypes.map(type => (
              <button
                key={type.id}
                onClick={() => onSelectType(type.id)}
                className="group text-left p-4 rounded-xl border-2 transition-all hover:shadow-lg bg-white border-brand-gold/20 hover:border-brand-gold/40"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${type.bg} text-white`}>
                    <type.icon size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-brand-ink text-sm font-serif">{type.title}</h4>
                    <p className="text-xs text-brand-ink-3 font-sans">{type.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {type.features.map(feature => (
                    <span key={feature} className={`text-[10px] px-1.5 py-0.5 rounded-full ${type.light} ${type.border} border font-sans`}>
                      {feature}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="bg-white rounded-xl border border-brand-gold/20 p-3 text-center">
              <p className="text-xl font-bold text-brand-ink font-serif">{statsProjects.length}</p>
              <p className="text-[10px] text-brand-ink-3 font-sans">Proyectos</p>
            </div>
            <div className="bg-white rounded-xl border border-brand-gold/20 p-3 text-center">
              <p className="text-xl font-bold text-brand-ink font-serif">{totalWords(statsProjects).toLocaleString()}</p>
              <p className="text-[10px] text-brand-ink-3 font-sans">Palabras</p>
            </div>
            <div className="bg-white rounded-xl border border-brand-gold/20 p-3 text-center">
              <p className="text-xl font-bold text-brand-ink font-serif">{totalSections(statsProjects)}</p>
              <p className="text-[10px] text-brand-ink-3 font-sans">Secciones</p>
            </div>
            <div className="bg-white rounded-xl border border-brand-gold/20 p-3 flex items-center justify-center">
              <span className="text-[10px] text-brand-ink-3 font-sans">Respaldos automáticos</span>
            </div>
          </div>

          {/* Filtros por tipo */}
          <div className="flex items-center gap-1 mb-3 border-b theme-border overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`flex items-center gap-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors font-sans whitespace-nowrap ${
                  typeFilter === tab.id
                    ? 'border-brand-gold text-brand-teal'
                    : 'border-transparent text-brand-ink-3 hover:text-brand-ink hover:border-brand-gold/40'
                }`}
              >
                {tab.icon && <tab.icon size={13} />}
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-sans ${
                  typeFilter === tab.id ? 'bg-brand-gold-pale text-brand-gold-deep' : 'bg-brand-gold-pale/50 text-brand-ink-3'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Lista de proyectos */}
          {searchFiltered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {searchFiltered.map(project => (
                <div
                  key={project.id}
                  className="bg-white rounded-xl border border-brand-gold/20 p-3 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white ${getTypeColor(project.type)}`}>
                        {getTypeIcon(project.type)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-brand-ink text-sm truncate font-serif">{project.title}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onOpenProject(project)}
                        className="p-1 text-brand-ink-3 hover:text-brand-teal hover:bg-brand-gold-pale rounded transition-colors"
                        title="Abrir proyecto"
                      >
                        <ExternalLink size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('¿Eliminar este proyecto?')) {
                            onDeleteProject(project.id)
                          }
                        }}
                        className="p-1 text-brand-ink-3 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar proyecto"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-brand-ink-3 font-sans">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(project.updated_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText size={10} />
                      {(project.sections || []).length} secciones
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-brand-gold/30 p-6 text-center">
              <FileText size={28} className="mx-auto text-brand-gold/40 mb-2" />
              <p className="text-brand-ink-3 text-sm mb-1 font-serif">
                {searchQuery.trim()
                  ? `Sin resultados para "${searchQuery}"`
                  : typeFilter === 'all'
                    ? 'No hay proyectos recientes'
                    : `No hay ${tabs.find(t => t.id === typeFilter)?.label?.toLowerCase()}`
                }
              </p>
              <p className="text-xs text-brand-ink-3 font-sans">
                {searchQuery.trim() ? 'Intenta con otro término' : 'Selecciona un tipo de proyecto arriba para comenzar'}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default ProyectosView
