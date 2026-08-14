import React, { useState, useEffect, useCallback } from 'react'
import { GitBranch, ChevronDown, ChevronRight, Plus, X, Search } from 'lucide-react'
import { projectService } from '../../services/projectService'

const typeColors = {
  libro: 'bg-blue-400', book: 'bg-blue-400',
  ensenanza: 'bg-yellow-400', teaching: 'bg-yellow-400',
  devocional: 'bg-green-400', devotional: 'bg-green-400',
  estudio: 'bg-amber-400', study: 'bg-amber-400',
  sermon: 'bg-red-400',
  video: 'bg-purple-400',
}

const typeLabels = {
  libro: 'Libro', book: 'Libro',
  ensenanza: 'Enseñanza', teaching: 'Enseñanza',
  devocional: 'Devocional', devotional: 'Devocional',
  estudio: 'Estudio', study: 'Estudio',
  sermon: 'Sermón',
  video: 'Video',
}

function RelationRow({ project, onUnlink }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-gray-200 text-sm group">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeColors[project.type] || 'bg-gray-400'}`} />
      <span className="truncate flex-1 min-w-0 text-gray-700">{project.title}</span>
      <span className="text-xs text-gray-400 shrink-0">{typeLabels[project.type] || project.type}</span>
      <button
        onClick={() => onUnlink(project.id)}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 shrink-0 transition-opacity"
        title="Desvincular"
      >
        <X size={13} />
      </button>
    </div>
  )
}

const ProjectRelations = ({ project }) => {
  const [collapsed, setCollapsed] = useState(true)
  const [origins, setOrigins] = useState([])
  const [derived, setDerived] = useState([])
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [linkMode, setLinkMode] = useState('derived') // 'origins' | 'derived'

  const loadRelations = useCallback(async () => {
    if (!project?.id) return
    const rel = await projectService.getRelations(project.id)
    setOrigins(rel.origins)
    setDerived(rel.derived)
  }, [project?.id])

  useEffect(() => { loadRelations() }, [loadRelations])

  useEffect(() => {
    if (!query) { setResults([]); return }
    const timer = setTimeout(async () => {
      const res = await projectService.searchProjects(query)
      setResults(res.filter(r => r.id !== project?.id))
    }, 250)
    return () => clearTimeout(timer)
  }, [query, project?.id])

  const handleLink = async (targetId) => {
    if (!project?.id) return
    if (linkMode === 'origins') {
      await projectService.linkProjects(targetId, project.id)
    } else {
      await projectService.linkProjects(project.id, targetId)
    }
    setSearching(false)
    setQuery('')
    setResults([])
    await loadRelations()
  }

  const handleUnlinkOrigin = async (originId) => {
    await projectService.unlinkProjects(originId, project.id)
    await loadRelations()
  }

  const handleUnlinkDerived = async (childId) => {
    await projectService.unlinkProjects(project.id, childId)
    await loadRelations()
  }

  if (!project?.id) return null

  const total = origins.length + derived.length

  return (
    <div className="border-b theme-border">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium text-gray-700">
          <GitBranch size={15} className="text-blue-500" />
          Relacionado con
          {total > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">{total}</span>
          )}
        </span>
        {collapsed ? <ChevronRight size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 flex flex-col gap-3">
          <div>
            <p className="text-xs text-gray-400 mb-1">viene de</p>
            {origins.length === 0 ? (
              <p className="text-xs text-gray-300 italic">Sin origen vinculado</p>
            ) : (
              <div className="flex flex-col gap-1">
                {origins.map(o => <RelationRow key={o.id} project={o} onUnlink={handleUnlinkOrigin} />)}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">generó</p>
            {derived.length === 0 ? (
              <p className="text-xs text-gray-300 italic">Sin derivados aún</p>
            ) : (
              <div className="flex flex-col gap-1">
                {derived.map(d => <RelationRow key={d.id} project={d} onUnlink={handleUnlinkDerived} />)}
              </div>
            )}
          </div>

          {!searching ? (
            <div className="flex gap-1">
              <button
                onClick={() => { setLinkMode('origins'); setSearching(true) }}
                className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 rounded py-1.5"
              >
                <Plus size={12} /> Origen
              </button>
              <button
                onClick={() => { setLinkMode('derived'); setSearching(true) }}
                className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 rounded py-1.5"
              >
                <Plus size={12} /> Derivado
              </button>
            </div>
          ) : (
            <div className="border border-gray-200 rounded p-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Search size={12} className="text-gray-400 shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={`Buscar proyecto (${linkMode === 'origins' ? 'origen' : 'derivado'})...`}
                  className="flex-1 min-w-0 text-xs outline-none"
                />
                <button onClick={() => { setSearching(false); setQuery(''); setResults([]) }} className="text-gray-300 hover:text-gray-500 shrink-0">
                  <X size={13} />
                </button>
              </div>
              {results.length > 0 && (
                <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                  {results.map(r => (
                    <button
                      key={r.id}
                      onClick={() => handleLink(r.id)}
                      className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-gray-100 text-left text-xs"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeColors[r.type] || 'bg-gray-400'}`} />
                      <span className="truncate flex-1 min-w-0">{r.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ProjectRelations
