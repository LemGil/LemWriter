import { supabase, isSupabaseEnabled } from './supabaseClient.js'

const BACKUPS_BUCKET = 'lemwriter-backups'
const BACKUPS_TABLE = 'lw_backups'

/**
 * Sube un archivo de respaldo local al bucket de Supabase.
 * @param {string} filePath - Ruta local del archivo .db
 * @param {string} filename - Nombre para el objeto en el bucket
 * @returns {Promise<{success: boolean, path?: string, error?: string}>}
 */
async function uploadBackup(filePath, filename) {
  if (!isSupabaseEnabled()) return { success: false, error: 'offline' }

  try {
    // Leer el archivo como base64 desde el proceso main vía IPC
    const result = await window.api.backup.readDb(filePath)
    if (!result.success) return { success: false, error: result.error || 'error al leer BD' }

    // Convertir base64 a Blob
    const byteChars = atob(result.data)
    const byteNums = new Uint8Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i)
    }
    const blob = new Blob([byteNums], { type: 'application/octet-stream' })
    const file = new File([blob], filename, { type: 'application/octet-stream' })

    const { data, error } = await supabase.storage
      .from(BACKUPS_BUCKET)
      .upload(filename, file, { upsert: true })

    if (error) return { success: false, error: error.message }

    // Registrar en la tabla lw_backups
    const { error: logError } = await supabase
      .from(BACKUPS_TABLE)
      .insert({
        filename,
        size_bytes: file.size,
        storage_path: data?.path || filename,
      })

    if (logError) console.warn('[cloudBackup] Error en log de backup:', logError.message)

    return { success: true, path: data?.path || filename }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Lista backups en la nube.
 * @returns {Promise<Array<{id, filename, size_bytes, created_at, storage_path}>>}
 */
async function listCloudBackups() {
  if (!isSupabaseEnabled()) return []

  try {
    const { data, error } = await supabase
      .from(BACKUPS_TABLE)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[cloudBackup] Error listando backups:', error.message)
      return []
    }
    return data || []
  } catch (err) {
    console.error('[cloudBackup] Error listando backups:', err.message)
    return []
  }
}

/**
 * Descarga un backup de la nube.
 * @param {string} filename - Nombre del archivo en el bucket
 * @returns {Promise<{success: boolean, data?: ArrayBuffer, error?: string}>}
 */
async function downloadCloudBackup(filename) {
  if (!isSupabaseEnabled()) return { success: false, error: 'offline' }

  try {
    const { data, error } = await supabase.storage
      .from(BACKUPS_BUCKET)
      .download(filename)

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Elimina un backup de la nube.
 * @param {string} filename - Nombre del archivo en el bucket
 * @param {number} logId - ID en lw_backups para eliminar el registro
 */
async function deleteCloudBackup(filename, logId) {
  if (!isSupabaseEnabled()) return { success: false, error: 'offline' }

  try {
    const { error: storageError } = await supabase.storage
      .from(BACKUPS_BUCKET)
      .remove([filename])

    if (storageError) return { success: false, error: storageError.message }

    const { error: logError } = await supabase
      .from(BACKUPS_TABLE)
      .delete()
      .eq('id', logId)

    if (logError) console.warn('[cloudBackup] Error eliminando registro:', logError.message)

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export const cloudBackupService = {
  uploadBackup,
  listCloudBackups,
  downloadCloudBackup,
  deleteCloudBackup,
}
