# Tarea: Integrar LemWriter con Supabase (Sincronización + Backup)

## Contexto
- LemWriter: Electron + React + Vite + better-sqlite3
- Supabase: proyecto "LemGil Ministerio" ya existente con tablas del ministerio
- Las tablas de LemWriter usan prefijo `lw_` para no colisionar con las existentes
- Las credenciales están en `.env.local` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- Por ahora: un solo usuario (uso personal), sin login/auth

**REGLAS:**
- No tocar ninguna tabla existente en Supabase (dadores, cursos, miembros, etc.)
- No tocar `electron/main.js` ni `electron/preload.js` salvo lo indicado
- No modificar el schema de SQLite local
- No instalar dependencias sin confirmar primero

---

## FASE 1 — Diagnóstico previo

```bash
# 1. Verificar que .env.local existe y tiene las variables
cat .env.local

# 2. Verificar que supabase-js no está ya instalado
npm list @supabase/supabase-js 2>/dev/null || echo "no instalado"

# 3. Verificar conectividad básica a Supabase (reemplazar con la URL real)
curl -s -o /dev/null -w "%{http_code}" "$VITE_SUPABASE_URL/rest/v1/" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" || echo "verificar manualmente"
```

Reportar output antes de continuar.

---

## FASE 2 — Instalar dependencia

```bash
npm install @supabase/supabase-js
```

Verificar:
```bash
npm list @supabase/supabase-js
```

---

## FASE 3 — Crear tablas en Supabase

Ejecutar este SQL en Supabase Dashboard → SQL Editor.
**Copiar y ejecutar completo — no por partes.**

```sql
-- ============================================================
-- TABLAS LEMWRITER en proyecto LemGil Ministerio
-- Prefijo lw_ para identificarlas claramente
-- ============================================================

-- Proyectos (espejo de SQLite projects)
CREATE TABLE IF NOT EXISTS lw_proyectos (
  id               TEXT PRIMARY KEY,
  type             TEXT NOT NULL,
  title            TEXT NOT NULL,
  author           TEXT,
  description      TEXT,
  subtitle         TEXT,
  style            TEXT DEFAULT 'manuscrito_clasico',
  formato          TEXT,
  theme            TEXT,
  model_id         TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  synced_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Secciones (espejo de SQLite sections)
CREATE TABLE IF NOT EXISTS lw_secciones (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL REFERENCES lw_proyectos(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  number           INTEGER,
  content          TEXT,
  status           TEXT,
  summary          TEXT,
  word_count       INTEGER,
  tags             TEXT,
  template_type    TEXT,
  bible_reference  TEXT,
  order_index      INTEGER,
  parent_id        TEXT REFERENCES lw_secciones(id) ON DELETE CASCADE,
  type             TEXT,
  position         INTEGER DEFAULT 0,
  is_visible       INTEGER DEFAULT 1,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  synced_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Recursos globales (espejo de SQLite resources)
CREATE TABLE IF NOT EXISTS lw_recursos (
  id               BIGSERIAL PRIMARY KEY,
  type             TEXT NOT NULL,
  title            TEXT NOT NULL,
  content          TEXT,
  notes            TEXT,
  reference        TEXT,
  bible_version    TEXT,
  original_word    TEXT,
  transliteration  TEXT,
  strongs_number   TEXT,
  meaning          TEXT,
  author           TEXT,
  source           TEXT,
  tags             TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  synced_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Relación proyectos <-> recursos
CREATE TABLE IF NOT EXISTS lw_proyecto_recursos (
  id               BIGSERIAL PRIMARY KEY,
  project_id       TEXT NOT NULL REFERENCES lw_proyectos(id) ON DELETE CASCADE,
  resource_id      BIGINT NOT NULL REFERENCES lw_recursos(id) ON DELETE CASCADE,
  used             INTEGER DEFAULT 0,
  used_in          TEXT,
  added_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, resource_id)
);

-- Palabras bíblicas
CREATE TABLE IF NOT EXISTS lw_palabras_biblicas (
  id               TEXT PRIMARY KEY,
  section_id       TEXT NOT NULL REFERENCES lw_secciones(id) ON DELETE CASCADE,
  word             TEXT NOT NULL,
  language         TEXT,
  transliteration  TEXT,
  meaning          TEXT,
  reference        TEXT,
  synced_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Referencias detectadas por IA
CREATE TABLE IF NOT EXISTS lw_referencias_detectadas (
  id                    BIGSERIAL PRIMARY KEY,
  project_id            TEXT NOT NULL REFERENCES lw_proyectos(id) ON DELETE CASCADE,
  libro                 TEXT NOT NULL,
  capitulo              INTEGER NOT NULL,
  versiculo             INTEGER NOT NULL,
  versiculo_final       INTEGER,
  posicion_en_texto     INTEGER,
  texto_original        TEXT,
  modelo_usado          TEXT DEFAULT 'ibm/granite4:3b',
  confirmado_por_usuario INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  synced_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Log de sincronizaciones
CREATE TABLE IF NOT EXISTS lw_sync_log (
  id               BIGSERIAL PRIMARY KEY,
  tabla            TEXT NOT NULL,
  operacion        TEXT NOT NULL,  -- 'upsert' | 'delete'
  registro_id      TEXT NOT NULL,
  status           TEXT NOT NULL,  -- 'ok' | 'error'
  error_msg        TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Registro de backups
CREATE TABLE IF NOT EXISTS lw_backups (
  id               BIGSERIAL PRIMARY KEY,
  filename         TEXT NOT NULL,
  size_bytes       BIGINT,
  storage_path     TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_lw_secciones_project ON lw_secciones(project_id);
CREATE INDEX IF NOT EXISTS idx_lw_recursos_type ON lw_recursos(type);
CREATE INDEX IF NOT EXISTS idx_lw_referencias_project ON lw_referencias_detectadas(project_id);
CREATE INDEX IF NOT EXISTS idx_lw_sync_log_tabla ON lw_sync_log(tabla);
CREATE INDEX IF NOT EXISTS idx_lw_backups_created ON lw_backups(created_at DESC);
```

**Verificar en Supabase Table Editor** que aparecen las 9 tablas con prefijo `lw_`
antes de continuar.

---

## FASE 4 — Crear el bucket de Storage para backups

En Supabase Dashboard → Storage → New Bucket:
- Nombre: `lemwriter-backups`
- Public: **NO** (privado)

O via SQL:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('lemwriter-backups', 'lemwriter-backups', false)
ON CONFLICT (id) DO NOTHING;
```

---

## FASE 5 — Cliente Supabase

**Crear** `src/services/supabaseClient.js`:

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('LemWriter: variables de Supabase no configuradas — modo offline')
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isSupabaseEnabled = () => !!supabase
```

**Importante:** si no hay credenciales, la app sigue funcionando offline sin errores.

---

## FASE 6 — Servicio de sincronización

**Crear** `src/services/syncService.js`:

```js
import { supabase, isSupabaseEnabled } from './supabaseClient'

// ── utilidad de log ──────────────────────────────────────────
async function logSync(tabla, operacion, registro_id, status, error_msg = null) {
  if (!isSupabaseEnabled()) return
  try {
    await supabase.from('lw_sync_log').insert({
      tabla, operacion, registro_id: String(registro_id), status, error_msg
    })
  } catch (_) { /* log silencioso */ }
}

// ── sincronizar un proyecto ──────────────────────────────────
export async function syncProyecto(project) {
  if (!isSupabaseEnabled()) return { ok: false, reason: 'offline' }
  try {
    const { error } = await supabase.from('lw_proyectos').upsert({
      id:          project.id,
      type:        project.type,
      title:       project.title,
      author:      project.author ?? null,
      description: project.description ?? null,
      subtitle:    project.subtitle ?? null,
      style:       project.style ?? 'manuscrito_clasico',
      formato:     project.formato ?? null,
      theme:       project.theme ?? null,
      model_id:    project.model_id ?? null,
      created_at:  project.created_at,
      updated_at:  project.updated_at,
      synced_at:   new Date().toISOString(),
    }, { onConflict: 'id' })

    if (error) throw error
    await logSync('lw_proyectos', 'upsert', project.id, 'ok')
    return { ok: true }
  } catch (err) {
    await logSync('lw_proyectos', 'upsert', project.id, 'error', err.message)
    return { ok: false, error: err.message }
  }
}

// ── sincronizar una sección ──────────────────────────────────
export async function syncSeccion(section) {
  if (!isSupabaseEnabled()) return { ok: false, reason: 'offline' }
  try {
    const { error } = await supabase.from('lw_secciones').upsert({
      id:              section.id,
      project_id:      section.project_id,
      title:           section.title,
      number:          section.number ?? null,
      content:         section.content ?? null,
      status:          section.status ?? null,
      summary:         section.summary ?? null,
      word_count:      section.word_count ?? 0,
      tags:            section.tags ?? null,
      template_type:   section.template_type ?? null,
      bible_reference: section.bible_reference ?? null,
      order_index:     section.order_index ?? null,
      parent_id:       section.parent_id ?? null,
      type:            section.type ?? null,
      position:        section.position ?? 0,
      is_visible:      section.is_visible ?? 1,
      created_at:      section.created_at,
      updated_at:      section.updated_at ?? new Date().toISOString(),
      synced_at:       new Date().toISOString(),
    }, { onConflict: 'id' })

    if (error) throw error
    await logSync('lw_secciones', 'upsert', section.id, 'ok')
    return { ok: true }
  } catch (err) {
    await logSync('lw_secciones', 'upsert', section.id, 'error', err.message)
    return { ok: false, error: err.message }
  }
}

// ── sincronización completa (todos los proyectos) ────────────
export async function syncCompleto(getAllProjects, getAllSections) {
  if (!isSupabaseEnabled()) return { ok: false, reason: 'offline' }

  const results = { proyectos: 0, secciones: 0, errores: [] }

  try {
    const projects = getAllProjects()
    for (const p of projects) {
      const r = await syncProyecto(p)
      if (r.ok) results.proyectos++
      else results.errores.push(`proyecto ${p.id}: ${r.error}`)
    }

    const sections = getAllSections()
    for (const s of sections) {
      const r = await syncSeccion(s)
      if (r.ok) results.secciones++
      else results.errores.push(`sección ${s.id}: ${r.error}`)
    }

    return { ok: true, ...results }
  } catch (err) {
    return { ok: false, error: err.message, ...results }
  }
}

// ── eliminar proyecto de Supabase ────────────────────────────
export async function deleteProyecto(projectId) {
  if (!isSupabaseEnabled()) return { ok: false, reason: 'offline' }
  try {
    const { error } = await supabase
      .from('lw_proyectos')
      .delete()
      .eq('id', projectId)
    if (error) throw error
    await logSync('lw_proyectos', 'delete', projectId, 'ok')
    return { ok: true }
  } catch (err) {
    await logSync('lw_proyectos', 'delete', projectId, 'error', err.message)
    return { ok: false, error: err.message }
  }
}
```

---

## FASE 7 — Servicio de backup

**Crear** `src/services/backupService.js`:

```js
import { supabase, isSupabaseEnabled } from './supabaseClient'

const BUCKET = 'lemwriter-backups'
const MAX_BACKUPS = 30  // mantener últimos 30 días

// ── subir backup a Supabase Storage ─────────────────────────
export async function uploadBackup(dbBuffer, filename) {
  if (!isSupabaseEnabled()) return { ok: false, reason: 'offline' }

  try {
    const storagePath = `backups/${filename}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, dbBuffer, {
        contentType: 'application/x-sqlite3',
        upsert: false,
      })

    if (uploadError) throw uploadError

    // Registrar en tabla de backups
    const { error: dbError } = await supabase.from('lw_backups').insert({
      filename,
      size_bytes: dbBuffer.byteLength,
      storage_path: storagePath,
    })

    if (dbError) throw dbError

    // Limpiar backups antiguos (mantener solo MAX_BACKUPS)
    await purgeOldBackups()

    return { ok: true, path: storagePath }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ── obtener lista de backups disponibles ─────────────────────
export async function listBackups() {
  if (!isSupabaseEnabled()) return { ok: false, reason: 'offline' }

  try {
    const { data, error } = await supabase
      .from('lw_backups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) throw error
    return { ok: true, backups: data }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ── descargar un backup específico ──────────────────────────
export async function downloadBackup(storagePath) {
  if (!isSupabaseEnabled()) return { ok: false, reason: 'offline' }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(storagePath)

    if (error) throw error
    return { ok: true, blob: data }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ── eliminar backups antiguos ────────────────────────────────
async function purgeOldBackups() {
  try {
    const { data: old } = await supabase
      .from('lw_backups')
      .select('id, storage_path')
      .order('created_at', { ascending: true })

    if (!old || old.length <= MAX_BACKUPS) return

    const toDelete = old.slice(0, old.length - MAX_BACKUPS)

    for (const backup of toDelete) {
      await supabase.storage.from(BUCKET).remove([backup.storage_path])
      await supabase.from('lw_backups').delete().eq('id', backup.id)
    }
  } catch (_) { /* purge silencioso */ }
}

// ── generar nombre de archivo de backup ─────────────────────
export function generateBackupFilename() {
  const now = new Date()
  const fecha = now.toISOString().split('T')[0]           // 2025-01-15
  const hora  = now.toTimeString().slice(0, 5).replace(':', '-') // 14-30
  return `lemwriter-backup-${fecha}-${hora}.db`
}
```

---

## FASE 8 — Handlers IPC en Electron

**En `electron/main.js`**, agregar estos handlers IPC al final del bloque de handlers existente (buscar con `grep -n "ipcMain.handle" electron/main.js | tail -5` para ver dónde agregar):

```js
const { ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')

// ── Leer el archivo .db para backup ─────────────────────────
ipcMain.handle('backup:readDb', async () => {
  try {
    const dbPath = path.join(app.getPath('userData'), 'lemwriter.db')
    const buffer = fs.readFileSync(dbPath)
    return { ok: true, buffer: buffer.buffer }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

// ── Restaurar backup: escribir el .db ───────────────────────
ipcMain.handle('backup:restoreDb', async (_event, arrayBuffer) => {
  try {
    const dbPath = path.join(app.getPath('userData'), 'lemwriter.db')
    const backupPath = path.join(app.getPath('userData'), 'lemwriter.backup-before-restore.db')

    // Guardar copia de seguridad local antes de restaurar
    fs.copyFileSync(dbPath, backupPath)

    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(dbPath, buffer)

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})
```

**En `electron/preload.js`**, agregar al objeto expuesto:

```js
// Buscar donde está el contextBridge.exposeInMainWorld y agregar:
backup: {
  readDb:    () => ipcRenderer.invoke('backup:readDb'),
  restoreDb: (buf) => ipcRenderer.invoke('backup:restoreDb', buf),
},
```

---

## FASE 9 — Sincronización automática al guardar

**Localizar** el lugar en el código donde se guarda una sección o proyecto
(buscar: `grep -rn "updated_at\|UPDATE.*sections\|UPDATE.*projects" electron/main.js | head -10`).

**Después de cada operación de guardado exitosa**, disparar la sincronización
desde el renderer. El patrón es llamar desde el componente que guarda:

```js
// En el componente que maneja el guardado (Editor.jsx o similar)
import { syncSeccion, syncProyecto } from '../services/syncService'

// Después de guardar en SQLite exitosamente:
const handleSave = async (section) => {
  // ... guardado en SQLite existente ...

  // Sincronizar en segundo plano (no bloquear la UI)
  syncSeccion(section).catch(console.warn)
}
```

**Importante:** `syncSeccion` y `syncProyecto` son llamadas fire-and-forget.
Si fallan (sin internet), el usuario no ve error — solo se registra en `lw_sync_log`.

---

## FASE 10 — Pantalla de backup en Configuración

**Localizar** el componente de Configuración
(buscar: `grep -rn "Configuracion\|Settings\|configuracion" src/components/ | head -10`).

**Agregar una sección "Sincronización y Backup"** dentro de ese componente:

```jsx
// src/components/BackupPanel.jsx
import { useState, useEffect } from 'react'
import { listBackups, uploadBackup, downloadBackup, generateBackupFilename } from '../services/backupService'
import { isSupabaseEnabled } from '../services/supabaseClient'

export function BackupPanel() {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => { loadBackups() }, [])

  async function loadBackups() {
    const result = await listBackups()
    if (result.ok) setBackups(result.backups)
  }

  async function handleBackupNow() {
    setLoading(true)
    setStatus(null)
    try {
      const result = await window.electronAPI.backup.readDb()
      if (!result.ok) throw new Error(result.error)

      const filename = generateBackupFilename()
      const upload = await uploadBackup(result.buffer, filename)

      if (!upload.ok) throw new Error(upload.error)

      setStatus({ type: 'ok', msg: `Backup creado: ${filename}` })
      await loadBackups()
    } catch (err) {
      setStatus({ type: 'error', msg: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleRestore(backup) {
    const confirm = window.confirm(
      `¿Restaurar el backup del ${new Date(backup.created_at).toLocaleString('es')}?\n\n` +
      `Se guardará una copia local de seguridad antes de restaurar.\n` +
      `La aplicación necesitará reiniciarse.`
    )
    if (!confirm) return

    setLoading(true)
    try {
      const dl = await downloadBackup(backup.storage_path)
      if (!dl.ok) throw new Error(dl.error)

      const buffer = await dl.blob.arrayBuffer()
      const result = await window.electronAPI.backup.restoreDb(buffer)

      if (!result.ok) throw new Error(result.error)

      setStatus({ type: 'ok', msg: 'Base de datos restaurada. Reinicia LemWriter.' })
    } catch (err) {
      setStatus({ type: 'error', msg: err.message })
    } finally {
      setLoading(false)
    }
  }

  if (!isSupabaseEnabled()) {
    return (
      <div style={{ padding: '16px', color: 'rgba(26,58,74,0.5)', fontSize: '13px' }}>
        Sincronización no configurada. Agrega las credenciales de Supabase en .env.local
      </div>
    )
  }

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ fontFamily: 'Cinzel, serif', color: '#1A3A4A', fontSize: '13px',
                   letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>
        Sincronización y Backup
      </h3>

      {/* Estado */}
      {status && (
        <div style={{
          padding: '10px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '12px',
          background: status.type === 'ok' ? 'rgba(200,167,93,0.1)' : 'rgba(220,50,50,0.08)',
          color: status.type === 'ok' ? '#8B6A2A' : '#c0392b',
          border: `1px solid ${status.type === 'ok' ? 'rgba(200,167,93,0.3)' : 'rgba(220,50,50,0.2)'}`,
        }}>
          {status.msg}
        </div>
      )}

      {/* Botón backup manual */}
      <button
        onClick={handleBackupNow}
        disabled={loading}
        style={{
          background: '#1A3A4A', color: '#C8A75D', border: 'none',
          borderRadius: '6px', padding: '8px 16px', fontSize: '12px',
          fontFamily: 'Inter, sans-serif', fontWeight: 600, cursor: 'pointer',
          marginBottom: '20px', opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Procesando...' : '↑ Crear backup ahora'}
      </button>

      {/* Lista de backups */}
      <div style={{ fontSize: '11px', color: 'rgba(26,58,74,0.5)',
                    marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Backups disponibles ({backups.length})
      </div>

      {backups.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'rgba(26,58,74,0.4)', fontStyle: 'italic' }}>
          No hay backups todavía
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {backups.map(b => (
            <div key={b.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', background: 'white', borderRadius: '6px',
              border: '1px solid rgba(26,58,74,0.1)', fontSize: '12px',
            }}>
              <div>
                <div style={{ fontWeight: 500, color: '#1A3A4A' }}>
                  {new Date(b.created_at).toLocaleString('es')}
                </div>
                <div style={{ color: 'rgba(26,58,74,0.45)', fontSize: '11px' }}>
                  {b.size_bytes ? `${(b.size_bytes / 1024).toFixed(1)} KB` : ''}
                </div>
              </div>
              <button
                onClick={() => handleRestore(b)}
                disabled={loading}
                style={{
                  background: 'transparent', border: '1px solid rgba(26,58,74,0.2)',
                  borderRadius: '5px', padding: '4px 10px', fontSize: '11px',
                  color: 'rgba(26,58,74,0.6)', cursor: 'pointer',
                }}
              >
                Restaurar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Montar el componente** en la página de Configuración existente:

```jsx
import { BackupPanel } from './BackupPanel'

// Dentro del JSX de Configuración, agregar:
<BackupPanel />
```

---

## FASE 11 — Backup automático diario

**Crear** `src/services/autoBackupService.js`:

```js
import { uploadBackup, generateBackupFilename } from './backupService'
import { isSupabaseEnabled } from './supabaseClient'

const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000  // 24 horas
const LAST_BACKUP_KEY = 'lemwriter_last_backup'

export async function checkAndRunAutoBackup() {
  if (!isSupabaseEnabled()) return
  if (!window.electronAPI?.backup?.readDb) return

  const lastBackup = localStorage.getItem(LAST_BACKUP_KEY)
  const now = Date.now()

  // Si ya se hizo backup en las últimas 24h, no hacer otro
  if (lastBackup && (now - parseInt(lastBackup)) < BACKUP_INTERVAL_MS) return

  try {
    const result = await window.electronAPI.backup.readDb()
    if (!result.ok) return

    const filename = generateBackupFilename()
    const upload = await uploadBackup(result.buffer, filename)

    if (upload.ok) {
      localStorage.setItem(LAST_BACKUP_KEY, String(now))
      console.log(`[LemWriter] Backup automático: ${filename}`)
    }
  } catch (err) {
    console.warn('[LemWriter] Backup automático falló:', err.message)
  }
}
```

**Llamar al arrancar la app** en `src/App.jsx` o el componente raíz:

```js
import { checkAndRunAutoBackup } from './services/autoBackupService'

// En useEffect del componente raíz:
useEffect(() => {
  // Esperar 10 segundos después de arrancar para no competir con la carga inicial
  const timer = setTimeout(() => {
    checkAndRunAutoBackup()
  }, 10_000)

  return () => clearTimeout(timer)
}, [])
```

---

## Checklist de verificación

```bash
# 1. Dependencia instalada
npm list @supabase/supabase-js

# 2. Archivos nuevos creados
ls src/services/supabaseClient.js
ls src/services/syncService.js
ls src/services/backupService.js
ls src/services/autoBackupService.js
ls src/components/BackupPanel.jsx

# 3. Handlers IPC agregados
grep -n "backup:readDb\|backup:restoreDb" electron/main.js
grep -n "backup" electron/preload.js

# 4. BackupPanel montado en Configuración
grep -rn "BackupPanel" src/components/

# 5. Auto-backup en App.jsx
grep -n "checkAndRunAutoBackup" src/App.jsx

# 6. .env.local no rastreado por git
git status .env.local
# Debe decir: nothing to commit O no aparecer — NUNCA "modified" o "new file"
```

**Verificación manual en la app:**
1. Abrir LemWriter → ir a Configuración → debe verse la sección "Sincronización y Backup"
2. Clic en "Crear backup ahora" → debe aparecer mensaje de éxito
3. En Supabase Dashboard → Storage → lemwriter-backups → debe verse el archivo `.db`
4. En Supabase → Table Editor → `lw_backups` → debe verse el registro
5. Abrir un proyecto y guardar una sección → en `lw_secciones` debe aparecer el registro
6. Abrir un proyecto → en `lw_proyectos` debe aparecer el registro

---

## Notas importantes

- **La app funciona offline sin errores.** Si no hay internet o las credenciales
  no están configuradas, `isSupabaseEnabled()` retorna false y todo el código
  de sincronización se salta silenciosamente.
- **No hay conflictos de datos** porque LemWriter es de uso personal por ahora.
  En el futuro multi-usuario se agrega un campo `user_id` a todas las tablas `lw_`.
- **La restauración requiere reinicio manual** de la app — es intencional para
  evitar que better-sqlite3 tenga el archivo abierto mientras se reemplaza.
- **El backup automático usa localStorage** para recordar la última vez que corrió.
  Si el usuario borra localStorage, corre de nuevo — no es problema.
