import React, { useState, useEffect, useCallback, useRef } from 'react'
import { BookOpen, BookMarked, GraduationCap, Heart, Search, Mic, Video, FileText, Sparkles, Repeat, Trash2, ExternalLink, Clock, LayoutGrid, List } from 'lucide-react'
import { projectService } from '../../services/projectService'
import { cargarEstadosPublicacion } from '../../services/publicarAcademia'
import BackupButton from '../Home/BackupButton'

const projectTypes = [
  {
    id: 'estudio',
    title: 'Estudios Bíblicos',
    description: 'La investigación que hacemos de un tema o de un libro de la Biblia.',
    icon: Search,
    bg: 'bg-gradient-to-br from-[#5A4A3A] to-[#7A6A5A]',
    light: 'bg-amber-50',
    border: 'border-amber-200',
    features: ['Texto Base', 'Puntos', 'Aplicación'],
  },
  {
    id: 'teaching',
    title: 'Enseñanzas',
    description: 'Transcripciones limpias y organizadas de las series que se han compartido con la Iglesia.',
    icon: GraduationCap,
    bg: 'bg-gradient-to-br from-[#C9A24A] to-[#D4B76A]',
    light: 'bg-yellow-50',
    border: 'border-yellow-200',
    features: ['Puntos', 'Preguntas', 'Texto base'],
  },
  {
    id: 'sermon',
    title: 'Sermones',
    description: 'Escogemos las frases más relevantes de cada tema.',
    icon: Mic,
    bg: 'bg-gradient-to-br from-[#7A3A4A] to-[#9A5A6A]',
    light: 'bg-red-50',
    border: 'border-red-200',
    features: ['Gancho', 'Ilustración', 'Llamado'],
  },
  {
    id: 'video',
    title: 'Videos',
    description: 'Tomamos los puntos principales de cada tema y hacemos guiones cortos y largos.',
    icon: Video,
    bg: 'bg-gradient-to-br from-[#4A4A7A] to-[#6A6A9A]',
    light: 'bg-purple-50',
    border: 'border-purple-200',
    features: ['Hook', 'Guion', 'Cierre'],
  },
  {
    id: 'devotional',
    title: 'Devocional',
    description: 'Tomamos los puntos fundamentales de cada tema y hacemos devocionales para cada día.',
    icon: Heart,
    bg: 'bg-gradient-to-br from-[#5A9A6A] to-[#7ABA8A]',
    light: 'bg-green-50',
    border: 'border-green-200',
    features: ['Versículo', 'Reflexión', 'Oración'],
  },
  {
    id: 'academia',
    title: 'Academia',
    description: 'Series ya completas, organizadas y estructuradas para los cursos de la Academia.',
    icon: BookMarked,
    bg: 'bg-gradient-to-br from-[#8A6D1F] to-[#C9A24A]',
    light: 'bg-yellow-50',
    border: 'border-yellow-200',
    features: ['Cursos', 'Temas', 'Publicación directa'],
  },
  {
    id: 'book',
    title: 'Libros',
    description: 'Todo lo que se ha investigado, enseñado y enriquecido se une y se organiza en un libro.',
    icon: BookOpen,
    bg: 'bg-gradient-to-br from-[#1A3A4A] to-[#2A5A6A]',
    light: 'bg-blue-50',
    border: 'border-blue-200',
    features: ['Capítulos', 'Referencias', 'Personajes'],
  },
]

const dbTypeMap = { book: 'libro', teaching: 'ensenanza', devotional: 'devocional', estudio: 'estudio', sermon: 'sermon', video: 'video', academia: 'academia' }

const normalizeTypeId = (type) => {
  const map = { libro: 'book', ensenanza: 'teaching', devocional: 'devotional', devotional: 'devotional', estudio: 'estudio', study: 'estudio', academia: 'academia' }
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
    academia: 'bg-gradient-to-br from-[#8A6D1F] to-[#C9A24A]',
  }
  return colors[normalizeTypeId(type)] || 'bg-gradient-to-br from-gray-500 to-gray-600'
}

const formatFechaCorta = (fecha) => {
  if (!fecha) return ''
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
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
  const [vista, setVista] = useState(() => {
    try { return localStorage.getItem('lw_vista_proyectos') || 'cuadricula' } catch { return 'cuadricula' }
  })
  const cambiarVista = (v) => {
    setVista(v)
    try { localStorage.setItem('lw_vista_proyectos', v) } catch {}
  }
  const [cambioTipo, setCambioTipo] = useState(null)
  const [aplicandoTipo, setAplicandoTipo] = useState(false)
  const [cambiosTipo, setCambiosTipo] = useState({})
  const proyectos = recentProjects.map(p => (cambiosTipo[p.id] ? { ...p, type: cambiosTipo[p.id] } : p))
  const searchTimer = useRef(null)

  useEffect(() => {
    const fetchStats = async () => {
      const stats = {}
      for (const project of proyectos) {
        const fullProject = await projectService.getProject(project.id)
        stats[project.id] = fullProject
      }
      setProjectStats(stats)
    }
    fetchStats()
  }, [recentProjects])

  const [estadosPublicacion, setEstadosPublicacion] = useState({})

  useEffect(() => {
    const idsAcademia = proyectos
      .filter(p => normalizeTypeId(p.type) === 'academia')
      .map(p => p.id)
    if (idsAcademia.length === 0) return
    let vivo = true
    cargarEstadosPublicacion(idsAcademia)
      .then(mapa => { if (vivo) setEstadosPublicacion(mapa) })
      .catch(() => {})
    return () => { vivo = false }
  }, [recentProjects])

  const aplicarCambioTipo = async (uiTipo) => {
    if (!cambioTipo || aplicandoTipo) return
    const nuevoDb = dbTypeMap[uiTipo] || uiTipo
    if (normalizeTypeId(cambioTipo.type) === uiTipo) {
      setCambioTipo(null)
      return
    }
    setAplicandoTipo(true)
    try {
      await projectService.cambiarTipoProyecto(cambioTipo.id, nuevoDb, cambioTipo.type)
      setCambiosTipo(prev => ({ ...prev, [cambioTipo.id]: nuevoDb }))
      setProjectStats(prev => ({
        ...prev,
        [cambioTipo.id]: { ...(prev[cambioTipo.id] || cambioTipo), type: nuevoDb },
      }))
      setCambioTipo(null)
    } catch {
      // silencio
    } finally {
      setAplicandoTipo(false)
    }
  }

  const tabs = [
    { id: 'all', label: 'Todos', count: proyectos.length },
    { id: 'book', label: 'Libros', icon: BookOpen, count: proyectos.filter(p => p.type === 'libro' || p.type === 'book').length },
    { id: 'teaching', label: 'Enseñanzas', icon: GraduationCap, count: proyectos.filter(p => p.type === 'ensenanza' || p.type === 'teaching').length },
    { id: 'devotional', label: 'Devocionales', icon: Heart, count: proyectos.filter(p => p.type === 'devocional' || p.type === 'devotional').length },
    { id: 'academia', label: 'Academias', icon: BookMarked, count: proyectos.filter(p => p.type === 'academia').length },
    { id: 'estudio', label: 'Estudios', icon: Search, count: proyectos.filter(p => p.type === 'estudio' || p.type === 'study').length },
    { id: 'sermon', label: 'Sermones', icon: Mic, count: proyectos.filter(p => p.type === 'sermon').length },
    { id: 'video', label: 'Videos', icon: Video, count: proyectos.filter(p => p.type === 'video').length },
  ]

  const filteredProjects = typeFilter === 'all'
    ? proyectos
    : proyectos.filter(p => p.type === dbTypeMap[typeFilter] || p.type === typeFilter)

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
                className="group text-left p-4 rounded-xl border-2 transition-all hover:shadow-lg theme-card border-brand-gold/20 hover:border-brand-gold/40"
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
            <div className="theme-card rounded-xl border border-brand-gold/20 p-3 text-center">
              <p className="text-xl font-bold text-brand-ink font-serif">{statsProjects.length}</p>
              <p className="text-[10px] text-brand-ink-3 font-sans">Proyectos</p>
            </div>
            <div className="theme-card rounded-xl border border-brand-gold/20 p-3 text-center">
              <p className="text-xl font-bold text-brand-ink font-serif">{totalWords(statsProjects).toLocaleString()}</p>
              <p className="text-[10px] text-brand-ink-3 font-sans">Palabras</p>
            </div>
            <div className="theme-card rounded-xl border border-brand-gold/20 p-3 text-center">
              <p className="text-xl font-bold text-brand-ink font-serif">{totalSections(statsProjects)}</p>
              <p className="text-[10px] text-brand-ink-3 font-sans">Secciones</p>
            </div>
            <div className="theme-card rounded-xl border border-brand-gold/20 p-3 flex items-center justify-center">
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
          <div className="flex items-center justify-end gap-1 mb-2">
            <span className="text-[10px] font-sans text-brand-ink-3 mr-1">Vista:</span>
            <button
              onClick={() => cambiarVista('cuadricula')}
              className={`p-1.5 rounded transition-colors ${vista === 'cuadricula' ? 'bg-brand-gold-pale text-brand-ink' : 'text-brand-ink-3 hover:bg-gray-100'}`}
              title="Vista en cuadrícula"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => cambiarVista('lista')}
              className={`p-1.5 rounded transition-colors ${vista === 'lista' ? 'bg-brand-gold-pale text-brand-ink' : 'text-brand-ink-3 hover:bg-gray-100'}`}
              title="Vista en lista"
            >
              <List size={14} />
            </button>
          </div>
          {searchFiltered.length > 0 ? (
            <div className={vista === 'lista' ? 'flex flex-col gap-2' : 'grid grid-cols-1 md:grid-cols-2 gap-2'}>
              {searchFiltered.map(project => vista === 'lista' ? (
                <div
                  key={project.id}
                  onClick={() => onOpenProject(project)}
                  className="theme-card rounded-xl border border-brand-gold/20 px-3 py-2 hover:shadow-md transition-shadow cursor-pointer flex items-center gap-3"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white ${getTypeColor(project.type)}`}>
                    {getTypeIcon(project.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-brand-ink text-sm truncate font-serif">{project.title}</h4>
                    <div className="flex items-center gap-3 text-[10px] text-brand-ink-3 font-sans">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatDate(project.updated_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText size={10} />
                        {(projectStats[project.id]?.sections || project.sections || []).length} secciones
                      </span>
                      {normalizeTypeId(project.type) === 'academia' && estadosPublicacion[project.id] && (
                        <span className={`inline-block text-[10px] font-sans px-1.5 py-0.5 rounded-full border ${estadosPublicacion[project.id].publicado ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {estadosPublicacion[project.id].publicado
                            ? `🎓 Publicado${estadosPublicacion[project.id].fecha ? ` · ${formatFechaCorta(estadosPublicacion[project.id].fecha)}` : ''}`
                            : 'Sin publicar'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setCambioTipo(project)
                      }}
                      className="p-1 text-brand-ink-3 hover:text-brand-ink hover:bg-gray-100 rounded transition-colors"
                      title="Cambiar tipo de proyecto"
                    >
                      <Repeat size={13} />
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
              ) : (
                <div
                  key={project.id}
                  className="theme-card rounded-xl border border-brand-gold/20 p-3 hover:shadow-md transition-shadow group"
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
                          setCambioTipo(project)
                        }}
                        className="p-1 text-brand-ink-3 hover:text-brand-ink hover:bg-gray-100 rounded transition-colors"
                        title="Cambiar tipo de proyecto"
                      >
                        <Repeat size={13} />
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
                      {(projectStats[project.id]?.sections || project.sections || []).length} secciones
                    </span>
                  </div>
                  {normalizeTypeId(project.type) === 'academia' && estadosPublicacion[project.id] && (
                    <span className={`inline-block mt-1.5 text-[10px] font-sans px-1.5 py-0.5 rounded-full border ${estadosPublicacion[project.id].publicado ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {estadosPublicacion[project.id].publicado
                        ? `🎓 Publicado${estadosPublicacion[project.id].fecha ? ` · ${formatFechaCorta(estadosPublicacion[project.id].fecha)}` : ''}`
                        : 'Sin publicar'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="theme-card rounded-xl border border-dashed border-brand-gold/30 p-6 text-center">
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
      {cambioTipo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !aplicandoTipo && setCambioTipo(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg text-brand-ink mb-1">Cambiar tipo de proyecto</h3>
            <p className="text-xs text-brand-ink-3 font-sans mb-4">«{cambioTipo.title}» se mueve a otro tipo, con todas sus secciones.</p>
            <div className="grid grid-cols-2 gap-2">
              {projectTypes.map((t) => {
                const activo = normalizeTypeId(cambioTipo.type) === t.id
                const Icono = t.icon
                return (
                  <button
                    key={t.id}
                    disabled={aplicandoTipo}
                    onClick={() => aplicarCambioTipo(t.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left font-sans text-sm transition-colors ${activo ? 'border-brand-gold bg-yellow-50 text-brand-ink' : 'border-gray-200 hover:border-brand-gold/60 text-brand-ink-2'}`}
                  >
                    <Icono size={16} />
                    <span>{t.title}</span>
                    {activo && <span className="ml-auto text-[10px] text-brand-ink-3">actual</span>}
                  </button>
                )
              })}
            </div>
            {normalizeTypeId(cambioTipo.type) !== 'academia' && (
              <p className="text-[11px] text-brand-ink-3 font-sans mt-3">Si lo pasás a Academia, sus secciones se convierten en temas del curso.</p>
            )}
            {normalizeTypeId(cambioTipo.type) === 'academia' && (
              <p className="text-[11px] text-brand-ink-3 font-sans mt-3">Al salir de Academia, las secciones dejan de ser temas (el curso publicado en la Academia no se borra).</p>
            )}
            <button
              onClick={() => setCambioTipo(null)}
              disabled={aplicandoTipo}
              className="mt-4 w-full py-2 rounded-lg border border-gray-200 text-sm font-sans text-brand-ink-2 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProyectosView
