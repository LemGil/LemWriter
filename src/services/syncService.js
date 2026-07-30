import { supabase, isSupabaseEnabled } from './supabaseClient'

// Mapeo: tabla local → tabla Supabase
const TABLES = {
  projects: 'lw_proyectos',
  sections: 'lw_secciones',
  resources: 'lw_recursos',
  project_resources: 'lw_proyecto_recursos',
  words: 'lw_palabras_biblicas',
  detected_references: 'lw_referencias_detectadas',
}

/**
 * Convierte una fila de SQLite local a la estructura esperada por Supabase.
 * Las columnas son las mismas, solo se mapea el nombre de la tabla.
 */
function mapLocalToRow(table, row) {
  const supabaseTable = TABLES[table]
  if (!supabaseTable) return null
  return { supabaseTable, data: { ...row } }
}

/**
 * Sube un solo registro a Supabase (upsert).
 * Retorna { success, error }
 */
async function upsertRecord(table, row, idField = 'id') {
  if (!isSupabaseEnabled()) return { success: false, error: 'offline' }

  const info = mapLocalToRow(table, row)
  if (!info) return { success: false, error: `tabla desconocida: ${table}` }

  try {
    const { error } = await supabase
      .from(info.supabaseTable)
      .upsert({ ...info.data, synced_at: new Date().toISOString() }, { onConflict: idField })

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Descarga todos los registros de una tabla Supabase.
 * Retorna array de filas, o [] en error/offline.
 */
async function downloadTable(table, orderBy = 'id') {
  if (!isSupabaseEnabled()) return []

  const supabaseTable = TABLES[table]
  if (!supabaseTable) return []

  try {
    const { data, error } = await supabase
      .from(supabaseTable)
      .select('*')
      .order(orderBy, { ascending: true })

    if (error) {
      console.error(`[syncService] Error descargando ${table}:`, error.message)
      return []
    }
    return data || []
  } catch (err) {
    console.error(`[syncService] Error descargando ${table}:`, err.message)
    return []
  }
}

/**
 * Sincroniza un proyecto completo hacia la nube.
 * Sube proyecto + secciones + recursos vinculados.
 */
async function syncProjectToCloud(projectData, sectionsData, resourcesData) {
  if (!isSupabaseEnabled()) return { success: false, error: 'offline' }

  const errors = []

  // 1. Proyecto
  const projResult = await upsertRecord('projects', projectData)
  if (!projResult.success) errors.push(`projects: ${projResult.error}`)

  // 2. Secciones
  for (const section of sectionsData) {
    const secResult = await upsertRecord('sections', section)
    if (!secResult.success) errors.push(`sections: ${secResult.error}`)
  }

  // 3. Recursos del proyecto
  for (const res of resourcesData) {
    const resResult = await upsertRecord('resources', res)
    if (!resResult.success) errors.push(`resources: ${resResult.error}`)
  }

  return {
    success: errors.length === 0,
    error: errors.length > 0 ? errors.join('; ') : null,
    errors,
  }
}

/**
 * Descarga un proyecto completo desde la nube.
 * Retorna { project, sections, resources } o null.
 */
async function downloadProjectFromCloud(projectId) {
  if (!isSupabaseEnabled()) return null

  try {
    const { data: project, error: projErr } = await supabase
      .from('lw_proyectos')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projErr || !project) return null

    const sections = await downloadTable('sections')
    const projectSections = sections.filter(s => s.project_id === projectId)

    const { data: resources } = await supabase
      .from('lw_recursos')
      .select('*')

    return {
      project,
      sections: projectSections || [],
      resources: resources || [],
    }
  } catch (err) {
    console.error('[syncService] Error descargando proyecto:', err.message)
    return null
  }
}

export const syncService = {
  upsertRecord,
  downloadTable,
  syncProjectToCloud,
  downloadProjectFromCloud,
  TABLES: Object.freeze(TABLES),
}
