import { cloudBackupService } from './cloudBackupService'
import { isSupabaseEnabled } from './supabaseClient'

const STORAGE_KEY = 'lw_auto_backup_config'

/**
 * Lee la configuración de auto-backup desde localStorage.
 */
function getConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignorar */ }
  return { enabled: true, intervalDays: 1, lastBackup: null }
}

/**
 * Guarda la configuración de auto-backup.
 */
function saveConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

/**
 * Verifica si es momento de hacer un backup automático.
 */
async function checkAndRunAutoBackup() {
  if (!isSupabaseEnabled()) return { success: false, reason: 'offline' }

  const config = getConfig()
  if (!config.enabled) return { success: false, reason: 'disabled' }

  // Si ya se hizo hoy, saltar
  if (config.lastBackup) {
    const last = new Date(config.lastBackup)
    const now = new Date()
    const diffHours = (now - last) / (1000 * 60 * 60)
    if (diffHours < config.intervalDays * 24) {
      return { success: false, reason: 'already_done_today' }
    }
  }

  // Ejecutar backup vía el servicio local + subida a nube
  try {
    // 1. Crear backup local
    const localResult = await window.api.backup.create()
    if (!localResult || !localResult.success) {
      return { success: false, error: localResult?.error || 'backup local falló' }
    }

    // 2. Subir a la nube
    const filename = `auto-${new Date().toISOString().split('T')[0]}.db`
    const cloudResult = await cloudBackupService.uploadBackup(localResult.path, filename)

    // 3. Actualizar configuración
    config.lastBackup = new Date().toISOString()
    saveConfig(config)

    return { success: true, local: localResult, cloud: cloudResult }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export const autoBackupService = {
  getConfig,
  saveConfig,
  checkAndRunAutoBackup,
}
