import React, { useState } from 'react'
import {
  Home,
  FolderOpen,
  BookOpen,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Book,
  GraduationCap,
  Heart,
  Search,
  Mic,
  Video,
} from 'lucide-react'

const navItems = [
  { id: 'inicio',       label: 'Inicio',        icon: Home },
  { id: 'proyectos',    label: 'Proyectos',     icon: FolderOpen },
  { id: 'recursos',     label: 'Recursos',      icon: BookOpen },
  { id: 'documentos',   label: 'Documentos',    icon: FileText },
  { id: 'configuracion',label: 'Configuración', icon: Settings },
]

const typeIcons = {
  libro: Book,
  book: Book,
  ensenanza: GraduationCap,
  teaching: GraduationCap,
  devocional: Heart,
  devotional: Heart,
  estudio: Search,
  study: Search,
  sermon: Mic,
  video: Video,
}

const typeColors = {
  libro: 'text-brand-teal',
  book: 'text-brand-teal',
  ensenanza: 'text-brand-gold-deep',
  teaching: 'text-brand-gold-deep',
  devocional: 'text-devocional',
  devotional: 'text-devocional',
  estudio: 'text-brand-ink-2',
  study: 'text-brand-ink-2',
  sermon: 'text-brand-gold',
  video: 'text-brand-teal-mid',
}

const typeBgs = {
  libro: 'bg-brand-teal-pale',
  book: 'bg-brand-teal-pale',
  ensenanza: 'bg-brand-gold-pale',
  teaching: 'bg-brand-gold-pale',
  devocional: 'bg-devocional/10',
  devotional: 'bg-devocional/10',
  estudio: 'bg-brand-cream',
  study: 'bg-brand-cream',
  sermon: 'bg-brand-gold-shine',
  video: 'bg-brand-teal-pale',
}

const AppSidebar = ({ vistaActiva, onNavigate, collapsed, onToggle, recentProjects = [], onOpenProject }) => {
  const [proyectosOpen, setProyectosOpen] = useState(true)

  const renderNavItem = (item) => {
    const Icon = item.icon
    // "Proyectos" se resalta también cuando se está editando un proyecto
    const isActive = vistaActiva === item.id || (item.id === 'proyectos' && vistaActiva === 'editor')

    const handleNavClick = () => {
      if (item.id === 'proyectos') {
        setProyectosOpen(v => !v)
      }
      onNavigate(item.id)
    }

    return (
      <div key={item.id}>
        <button
          onClick={handleNavClick}
          className={`w-full flex items-center gap-3 py-2.5 text-sm transition-colors sidebar-nav-item
            ${collapsed ? 'justify-center px-0' : 'px-4'}
            ${isActive
              ? 'sidebar-nav-item-active'
              : 'sidebar-nav-item-inactive'
            }`}
          title={item.label}
        >
          <Icon size={collapsed ? 20 : 18} className="shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
          {!collapsed && item.id === 'proyectos' && (
            <ChevronDown
              size={14}
              className={`ml-auto transition-transform opacity-60 ${proyectosOpen ? '' : '-rotate-90'}`}
            />
          )}
        </button>

        {/* Proyectos recientes como sub-lista bajo "Proyectos" */}
        {!collapsed && item.id === 'proyectos' && proyectosOpen && recentProjects.length > 0 && (
          <div className="border-t border-white/5 mt-1 pt-1 pb-1">
            {recentProjects.slice(0, 10).map((p) => {
              const PIcon = typeIcons[p.type] || FolderOpen
              const pColor = typeColors[p.type] || 'text-white/55'
              const pBg = typeBgs[p.type] || ''
              return (
                <button
                  key={p.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenProject(p)
                  }}
                  className={`w-full flex items-center gap-2.5 px-4 py-1.5 text-xs transition-colors project-list-item
                    text-white/45 hover:text-white/70 hover:bg-white/[0.04]`}
                  title={`Abrir ${p.title}`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center ${pBg} shrink-0`}>
                    <PIcon size={11} className={pColor} />
                  </div>
                  <span className="truncate">{p.title}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <nav
      className={`h-full flex flex-col border-r border-white/10 sidebar-nav transition-all duration-200 shrink-0 ${
        collapsed ? 'w-[52px]' : 'w-[200px]'
      }`}
    >
      {/* Logo / Brand */}
      <div className={`flex items-center h-14 border-b border-white/10 shrink-0 sidebar-logo-area ${collapsed ? 'justify-center px-0' : 'px-4'}`}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm lw-logo-mark"
          style={{ background: 'var(--dorado, #C8A75D)', color: 'var(--azul-petroleo, #1A3A4A)' }}
        >
          LW
        </div>
        {!collapsed && (
          <span className="ml-2.5 text-sm font-bold truncate sidebar-app-name"
            style={{ fontFamily: 'var(--font-titulo, "Cinzel", Georgia, serif)', color: 'var(--marfil, #F7F3E9)', letterSpacing: '0.04em' }}
          >
            LemWriter
          </span>
        )}
      </div>

      {/* Nav Items */}
      <div className="flex-1 py-2 space-y-0.5 overflow-y-auto no-scrollbar">
        {navItems.map(renderNavItem)}
      </div>

      {/* Collapse Toggle */}
      <div className="border-t border-white/10 shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center py-3 text-white/45 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </nav>
  )
}

export default AppSidebar
