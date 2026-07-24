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
  libro: 'text-blue-600',
  book: 'text-blue-600',
  ensenanza: 'text-yellow-600',
  teaching: 'text-yellow-600',
  devocional: 'text-green-600',
  devotional: 'text-green-600',
  estudio: 'text-amber-600',
  study: 'text-amber-600',
  sermon: 'text-red-600',
  video: 'text-purple-600',
}

const typeBgs = {
  libro: 'bg-blue-50',
  book: 'bg-blue-50',
  ensenanza: 'bg-yellow-50',
  teaching: 'bg-yellow-50',
  devocional: 'bg-green-50',
  devotional: 'bg-green-50',
  estudio: 'bg-amber-50',
  study: 'bg-amber-50',
  sermon: 'bg-red-50',
  video: 'bg-purple-50',
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
          className={`w-full flex items-center gap-3 py-2.5 text-sm transition-colors
            ${collapsed ? 'justify-center px-0' : 'px-4'}
            ${isActive
              ? 'bg-brand-gold-pale text-brand-gold-deep border-r-2 border-brand-gold font-medium'
              : 'text-brand-ink-3 hover:text-brand-ink hover:bg-brand-gold-pale/40'
            }`}
          title={item.label}
        >
          <Icon size={collapsed ? 20 : 18} className="shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
          {!collapsed && item.id === 'proyectos' && (
            <ChevronDown
              size={14}
              className={`ml-auto transition-transform ${proyectosOpen ? '' : '-rotate-90'}`}
            />
          )}
        </button>

        {/* Proyectos recientes como sub-lista bajo "Proyectos" */}
        {!collapsed && item.id === 'proyectos' && proyectosOpen && recentProjects.length > 0 && (
          <div className="border-t border-brand-gold/10 mt-1 pt-1 pb-1">
            {recentProjects.slice(0, 10).map((p) => {
              const PIcon = typeIcons[p.type] || FolderOpen
              const pColor = typeColors[p.type] || 'text-brand-ink-3'
              const pBg = typeBgs[p.type] || ''
              return (
                <button
                  key={p.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenProject(p)
                  }}
                  className={`w-full flex items-center gap-2.5 px-4 py-1.5 text-xs transition-colors
                    text-brand-ink-3 hover:text-brand-ink hover:bg-brand-gold-pale/30`}
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
      className={`h-full flex flex-col border-r theme-border theme-bg transition-all duration-200 shrink-0 ${
        collapsed ? 'w-[52px]' : 'w-[200px]'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center h-14 border-b theme-border shrink-0 ${collapsed ? 'justify-center px-0' : 'px-4'}`}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ background: '#1A3A4A' }}
        >
          LW
        </div>
        {!collapsed && (
          <span className="ml-2.5 text-sm font-bold text-brand-ink font-serif truncate">
            LemWriter
          </span>
        )}
      </div>

      {/* Nav Items */}
      <div className="flex-1 py-2 space-y-0.5 overflow-y-auto no-scrollbar">
        {navItems.map(renderNavItem)}
      </div>

      {/* Collapse Toggle */}
      <div className="border-t theme-border shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center py-3 text-brand-ink-3 hover:text-brand-ink hover:bg-brand-gold-pale/40 transition-colors"
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </nav>
  )
}

export default AppSidebar
