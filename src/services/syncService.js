import { supabase, isSupabaseEnabled } from './supabaseClient.js'
import { v4 as uuidv4 } from 'uuid'

// Mapeo: tabla local → tabla Supabase
const TABLES = {
  projects: 'lw_proyectos',
  sections: 'lw_secciones',
  resources: 'lw_recursos',
  project_resources: 'lw_proyecto_recursos',
  words: 'lw_palabras_biblicas',
  detected_references: 'lw_referencias_detectadas',
  project_relations: 'lw_proyecto_relaciones',
}

const SUPABASE_COLUMNS = {
  projects: [
    'id', 'type', 'title', 'author', 'description', 'subtitle',
    'style', 'formato', 'theme', 'model_id', 'created_at', 'updated_at'
  ],
  sections: [
    'id', 'project_id', 'title', 'number', 'content', 'status',
    'summary', 'word_count', 'tags', 'template_type', 'bible_reference',
    'order_index', 'parent_id', 'type', 'position', 'is_visible',
    'created_at', 'updated_at'
  ],
  resources: ['id', 'title', 'type', 'content', 'created_at', 'updated_at'],
  project_resources: ['id', 'project_id', 'resource_id'],
  project_relations: ['id', 'parent_id', 'child_id', 'created_at'],
  words: ['id', 'word', 'definition', 'created_at'],
  detected_references: ['id', 'project_id', 'reference', 'detected_at'],
}

function filterForSupabase(table, row) {
  const allowed = SUPABASE_COLUMNS[table]
  if (!allowed) return { ...row }
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => allowed.includes(key))
  )
}

/**
 * Convierte una fila de SQLite local a la estructura esperada por Supabase.
 * Filtra columnas que no existen en Supabase para evitar error 400.
 */
function mapLocalToRow(table, row) {
  const supabaseTable = TABLES[table]
  if (!supabaseTable) return null
  return { supabaseTable, data: filterForSupabase(table, row) }
}

// ── Detección de conflictos ──────────────────────────────────────

function getDb() {
  try {
    if (typeof window !== 'undefined' && window.api && window.api.db) {
      return window.api.db
    }
  } catch {
    // ignorar
  }
  return null
}

/** Quita HTML y normaliza espacios para comparar contenido real */
function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Texto comparable: secciones → contenido; proyectos → título+subtítulo+descripción */
function comparableText(table, row) {
  if (!row) return ''
  if (table === 'sections') return row.content || ''
  return [row.title, row.subtitle, row.description].filter(Boolean).join('\n')
}

function isConflictCandidate(table) {
  return table === 'projects' || table === 'sections'
}

async function getBaseUpdatedAt(table, rowId) {
  const db = getDb()
  if (!db) return null
  try {
    const rows = await db.query(
      'SELECT base_updated_at FROM sync_state WHERE table_name = ? AND row_id = ?',
      [table, rowId]
    )
    return rows && rows[0] ? rows[0].base_updated_at : null
  } catch {
    return null
  }
}

async function setBaseUpdatedAt(table, rowId, ts) {
  const db = getDb()
  if (!db) return
  const now = new Date().toISOString()
  try {
    await db.execute(
      `INSERT INTO sync_state (table_name, row_id, base_updated_at, last_synced_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(table_name, row_id) DO UPDATE SET
         base_updated_at = excluded.base_updated_at,
         last_synced_at = excluded.last_synced_at`,
      [table, rowId, ts, now]
    )
  } catch (err) {
    console.warn('[sync] no se pudo guardar sync_state:', err.message)
  }
}

async function fetchRemoteRow(table, id) {
  if (!isSupabaseEnabled()) return null
  const supabaseTable = TABLES[table]
  if (!supabaseTable) return null
  try {
    const cols = table === 'sections'
      ? 'id, project_id, title, content, updated_at'
      : 'id, title, subtitle, description, updated_at'
    const { data, error } = await supabase
      .from(supabaseTable)
      .select(cols)
      .eq('id', id)
      .maybeSingle()
    if (error) return null
    return data || null
  } catch {
    return null
  }
}

/**
 * Detecta conflicto de edición: la fila remota cambió después de la
 * versión base que conoce este PC y el contenido difiere del local.
 * Retorna { baseUpdatedAt, remoteRow } o null si no hay conflicto.
 */
async function detectConflict(table, localRow, remoteRow) {
  if (!isConflictCandidate(table) || !remoteRow || !remoteRow.updated_at) return null
  const base = await getBaseUpdatedAt(table, localRow.id)
  const baseTime = base ? new Date(base).getTime() : 0
  const remoteTime = new Date(remoteRow.updated_at).getTime()
  if (!remoteTime || !(remoteTime > baseTime)) return null
  if (stripHtml(comparableText(table, localRow)) === stripHtml(comparableText(table, remoteRow))) {
    // Mismo contenido: adoptar la versión remota como base y continuar
    await setBaseUpdatedAt(table, localRow.id, remoteRow.updated_at)
    return null
  }
  return { baseUpdatedAt: base, remoteRow }
}

async function saveConflictRecord(table, localRow, detection, projectTitle) {
  const db = getDb()
  const now = new Date().toISOString()
  const remoteRow = detection.remoteRow
  const conflict = {
    id: `conflict_${table}_${localRow.id}_${Date.now()}`,
    table_name: table,
    row_id: localRow.id,
    project_id: table === 'sections' ? localRow.project_id || null : localRow.id,
    project_title: projectTitle || null,
    title_local: localRow.title || '',
    title_remote: remoteRow.title || '',
    content_local: table === 'sections'
      ? localRow.content || ''
      : [localRow.subtitle, localRow.description].filter(Boolean).join('\n\n'),
    content_remote: table === 'sections'
      ? remoteRow.content || ''
      : [remoteRow.subtitle, remoteRow.description].filter(Boolean).join('\n\n'),
    local_updated_at: localRow.updated_at || null,
    remote_updated_at: remoteRow.updated_at || null,
    base_updated_at: detection.baseUpdatedAt || null,
    remote_snapshot: JSON.stringify(remoteRow),
    detected_at: now,
    status: 'pending',
    resolution: null,
  }
  if (db) {
    try {
      // Un solo conflicto pendiente por fila (reemplaza el anterior)
      await db.execute(
        `DELETE FROM sync_conflicts WHERE table_name = ? AND row_id = ? AND status = 'pending'`,
        [table, localRow.id]
      )
      await db.execute(
        `INSERT INTO sync_conflicts
           (id, table_name, row_id, project_id, project_title, title_local, title_remote,
            content_local, content_remote, local_updated_at, remote_updated_at,
            base_updated_at, remote_snapshot, detected_at, status, resolution)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          conflict.id, conflict.table_name, conflict.row_id, conflict.project_id,
          conflict.project_title, conflict.title_local, conflict.title_remote,
          conflict.content_local, conflict.content_remote, conflict.local_updated_at,
          conflict.remote_updated_at, conflict.base_updated_at, conflict.remote_snapshot,
          conflict.detected_at, conflict.status, conflict.resolution,
        ]
      )
    } catch (err) {
      console.warn('[sync] no se pudo guardar el conflicto:', err.message)
    }
  }
  return conflict
}

async function notifyConflicts(detected) {
  try {
    const db = getDb()
    let count = 0
    if (db) {
      const rows = await db.query(`SELECT COUNT(*) AS n FROM sync_conflicts WHERE status = 'pending'`)
      count = (rows && rows[0] && rows[0].n) || 0
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('lw:conflicts-change', { detail: { count } }))
      if (detected) {
        window.dispatchEvent(new CustomEvent('lw:conflict-detected', { detail: detected }))
      }
    }
  } catch {
    // ignorar
  }
}

// ── Subida con detección de conflictos ───────────────────────────

async function upsertRecord(table, row, idField = 'id', remoteRow, extra = {}) {
  if (!isSupabaseEnabled()) return { success: false, error: 'offline' }

  const info = mapLocalToRow(table, row)
  if (!info) return { success: false, error: `tabla desconocida: ${table}` }

  try {
    if (isConflictCandidate(table)) {
      const remote = remoteRow !== undefined ? remoteRow : await fetchRemoteRow(table, row[idField])
      const detection = await detectConflict(table, row, remote)
      if (detection) {
        const saved = await saveConflictRecord(table, row, detection, extra.projectTitle)
        console.warn(
          `[sync] Conflicto en ${table}/${row[idField]}: la nube cambió después de la base local. No se subió.`
        )
        await notifyConflicts(saved)
        return { success: false, conflict: saved, error: 'conflict' }
      }
    }

    const { error } = await supabase
      .from(info.supabaseTable)
      .upsert({ ...info.data, synced_at: new Date().toISOString() }, { onConflict: idField })

    if (error) return { success: false, error: error.message }
    await setBaseUpdatedAt(table, row[idField], info.data.updated_at || new Date().toISOString())
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
 * Sube proyecto + secciones + recursos vinculados + relaciones (linaje).
 * Detecta conflictos de edición antes de subir cada fila: si la nube
 * cambió después de la base local y el contenido difiere, registra el
 * conflicto y NO sube esa fila hasta que el usuario lo resuelva.
 * Retorna { success, error, errors, conflicts }.
 */
async function syncProjectToCloud(projectData, sectionsData, resourcesData, relationsData = []) {
  if (!isSupabaseEnabled()) return { success: false, error: 'offline' }

  const errors = []
  const conflicts = []

  // Estado remoto en lote (2 consultas) para la detección de conflictos
  let remoteProject = null
  const remoteSections = new Map()
  try {
    const { data: rp } = await supabase
      .from('lw_proyectos')
      .select('id, title, subtitle, description, updated_at')
      .eq('id', projectData.id)
      .maybeSingle()
    if (rp) remoteProject = rp
    const { data: rs } = await supabase
      .from('lw_secciones')
      .select('id, project_id, title, content, updated_at')
      .eq('project_id', projectData.id)
    for (const s of rs || []) remoteSections.set(s.id, s)
  } catch (err) {
    console.warn('[sync] no se pudo leer el estado remoto:', err.message)
  }

  // 1. Proyecto (asegura updated_at en el payload para que la detección funcione)
  const projectPayload = { ...projectData }
  if (!projectPayload.updated_at) projectPayload.updated_at = new Date().toISOString()
  const projResult = await upsertRecord('projects', projectPayload, 'id', remoteProject, {
    projectTitle: projectPayload.title,
  })
  if (projResult.conflict) conflicts.push(projResult.conflict)
  else if (!projResult.success) errors.push(`projects: ${projResult.error}`)

  // 2. Secciones
  for (const section of sectionsData) {
    const remote = remoteSections.has(section.id) ? remoteSections.get(section.id) : null
    const secResult = await upsertRecord('sections', section, 'id', remote, {
      projectTitle: projectPayload.title,
    })
    if (secResult.conflict) conflicts.push(secResult.conflict)
    else if (!secResult.success) errors.push(`sections: ${secResult.error}`)
  }

  // 3. Recursos del proyecto
  for (const res of resourcesData) {
    const resResult = await upsertRecord('resources', res)
    if (!resResult.success) errors.push(`resources: ${resResult.error}`)
  }

  // 4. Relaciones del proyecto (linaje: origen/derivado)
  for (const rel of relationsData) {
    const relResult = await upsertRecord('project_relations', rel)
    if (!relResult.success) errors.push(`project_relations: ${relResult.error}`)
  }

  return {
    success: errors.length === 0,
    error: errors.length > 0 ? errors.join('; ') : null,
    errors,
    conflicts,
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

// ── Resolución de conflictos ─────────────────────────────────────

async function getPendingConflicts() {
  const db = getDb()
  if (!db) return []
  try {
    return await db.query(
      `SELECT * FROM sync_conflicts WHERE status = 'pending' ORDER BY detected_at DESC`
    )
  } catch {
    return []
  }
}

/**
 * Resuelve un conflicto de edición.
 * - keep_local: la versión de este PC sobrescribe la nube.
 * - keep_remote: se adopta la versión de la nube en este PC.
 * - keep_both: (solo secciones) la sección adopta la nube y la
 *   versión local se conserva como sección hermana.
 */
async function resolveConflict(conflictId, resolution) {
  const db = getDb()
  if (!db) return { success: false, error: 'sin acceso a la base local' }

  let c
  try {
    const rows = await db.query(`SELECT * FROM sync_conflicts WHERE id = ?`, [conflictId])
    c = rows && rows[0]
  } catch (err) {
    return { success: false, error: err.message }
  }
  if (!c || c.status !== 'pending') return { success: false, error: 'conflicto no encontrado' }

  const now = new Date().toISOString()
  const localTable = c.table_name === 'sections' ? 'sections' : 'projects'

  try {
    if (resolution === 'keep_local') {
      const localRows = await db.query(`SELECT * FROM ${localTable} WHERE id = ?`, [c.row_id])
      const local = localRows && localRows[0]
      if (!local) return { success: false, error: 'la fila local ya no existe' }
      // Subida directa sin chequeo: el usuario decidió explícitamente
      const info = mapLocalToRow(c.table_name, local)
      if (!info) return { success: false, error: `tabla desconocida: ${c.table_name}` }
      const { error } = await supabase
        .from(info.supabaseTable)
        .upsert({ ...info.data, updated_at: now, synced_at: now }, { onConflict: 'id' })
      if (error) return { success: false, error: error.message }
      await db.execute(`UPDATE ${localTable} SET updated_at = ? WHERE id = ?`, [now, c.row_id])
      await setBaseUpdatedAt(c.table_name, c.row_id, now)
    } else if (resolution === 'keep_remote') {
      const snap = JSON.parse(c.remote_snapshot || '{}')
      if (c.table_name === 'sections') {
        await db.execute(
          `UPDATE sections SET title = ?, content = ?, updated_at = ? WHERE id = ?`,
          [snap.title || c.title_remote, snap.content || '', snap.updated_at || now, c.row_id]
        )
      } else {
        await db.execute(
          `UPDATE projects SET title = ?, subtitle = ?, description = ?, updated_at = ? WHERE id = ?`,
          [
            snap.title || c.title_remote,
            snap.subtitle || null,
            snap.description || null,
            snap.updated_at || now,
            c.row_id,
          ]
        )
      }
      await setBaseUpdatedAt(c.table_name, c.row_id, snap.updated_at || now)
    } else if (resolution === 'keep_both') {
      if (c.table_name !== 'sections') {
        return { success: false, error: 'conservar ambas solo aplica a secciones' }
      }
      const snap = JSON.parse(c.remote_snapshot || '{}')
      // La sección adopta la versión de la nube…
      await db.execute(
        `UPDATE sections SET title = ?, content = ?, updated_at = ? WHERE id = ?`,
        [snap.title || c.title_remote, snap.content || '', snap.updated_at || now, c.row_id]
      )
      await setBaseUpdatedAt('sections', c.row_id, snap.updated_at || now)
      // …y la versión local se conserva como sección hermana
      const origRows = await db.query(`SELECT type, order_index FROM sections WHERE id = ?`, [c.row_id])
      const orig = (origRows && origRows[0]) || {}
      const newId = uuidv4()
      await db.execute(
        `INSERT INTO sections (id, project_id, type, title, content, order_index, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          c.project_id,
          orig.type || null,
          `${c.title_local || 'Sección'} (versión local)`,
          c.content_local || '',
          (orig.order_index ?? 0) + 1,
          now,
          now,
        ]
      )
    } else {
      return { success: false, error: `resolución desconocida: ${resolution}` }
    }

    await db.execute(`UPDATE sync_conflicts SET status = 'resolved', resolution = ? WHERE id = ?`, [
      resolution,
      conflictId,
    ])
    await notifyConflicts()
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export const syncService = {
  upsertRecord,
  downloadTable,
  syncProjectToCloud,
  downloadProjectFromCloud,
  pullFromCloud,
  getPendingConflicts,
  resolveConflict,
  TABLES: Object.freeze(TABLES),
}

/**
 * Descarga desde Supabase los proyectos y secciones que no existen localmente.
 * Solo inserta — nunca sobreescribe datos locales más recientes.
 * Registra la versión base de cada fila descargada para la detección de conflictos.
 */
async function pullFromCloud(db) {
  if (!isSupabaseEnabled()) return { pulled: 0, errors: [] }

  const errors = []
  let pulled = 0

  try {
    // 1. Obtener IDs locales
    const localProjects = await db.query(`SELECT id, updated_at FROM projects`)
    const localIds = new Set(localProjects.map(p => p.id))

    // 2. Descargar proyectos de Supabase
    const { data: remoteProjects, error: projErr } = await supabase
      .from('lw_proyectos')
      .select('*')
      .order('updated_at', { ascending: false })

    if (projErr) {
      errors.push(`proyectos: ${projErr.message}`)
      return { pulled, errors }
    }

    for (const rp of remoteProjects || []) {
      try {
        if (!localIds.has(rp.id)) {
          // Proyecto nuevo — insertar
          await db.execute(
            `INSERT OR IGNORE INTO projects 
             (id, type, title, author, description, subtitle, style, formato, theme, model_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [rp.id, rp.type, rp.title, rp.author, rp.description, rp.subtitle,
             rp.style || 'manuscrito_clasico', rp.formato, rp.theme, rp.model_id,
             rp.created_at, rp.updated_at]
          )
          pulled++
          await setBaseUpdatedAt('projects', rp.id, rp.updated_at)

          // Descargar secciones de ese proyecto
          const { data: remoteSections } = await supabase
            .from('lw_secciones')
            .select('*')
            .eq('project_id', rp.id)
            .order('order_index', { ascending: true })

          for (const rs of remoteSections || []) {
            await db.execute(
              `INSERT OR IGNORE INTO sections
               (id, project_id, title, number, content, status, summary, word_count,
                tags, template_type, bible_reference, order_index, parent_id, type,
                position, is_visible, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [rs.id, rs.project_id, rs.title, rs.number, rs.content, rs.status,
               rs.summary, rs.word_count, rs.tags, rs.template_type, rs.bible_reference,
               rs.order_index, rs.parent_id, rs.type, rs.position,
               rs.is_visible ?? 1, rs.created_at, rs.updated_at]
            )
            await setBaseUpdatedAt('sections', rs.id, rs.updated_at)
          }
        } else {
          // Proyecto existe — revisar si Supabase tiene secciones más nuevas
          const localProject = localProjects.find(p => p.id === rp.id)
          if (rp.updated_at > localProject.updated_at) {
            const { data: remoteSections } = await supabase
              .from('lw_secciones')
              .select('*')
              .eq('project_id', rp.id)
              .order('order_index', { ascending: true })

            for (const rs of remoteSections || []) {
              // Solo insertar secciones que no existan localmente
              const result = await db.execute(
                `INSERT OR IGNORE INTO sections
                 (id, project_id, title, number, content, status, summary, word_count,
                  tags, template_type, bible_reference, order_index, parent_id, type,
                  position, is_visible, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [rs.id, rs.project_id, rs.title, rs.number, rs.content, rs.status,
                 rs.summary, rs.word_count, rs.tags, rs.template_type, rs.bible_reference,
                 rs.order_index, rs.parent_id, rs.type, rs.position,
                 rs.is_visible ?? 1, rs.created_at, rs.updated_at]
              )
              if (result && result.changes > 0) {
                await setBaseUpdatedAt('sections', rs.id, rs.updated_at)
              }
            }
          }
        }
      } catch (err) {
        errors.push(`proyecto ${rp.id}: ${err.message}`)
      }
    }
  } catch (err) {
    errors.push(`pullFromCloud: ${err.message}`)
  }

  return { pulled, errors }
}
