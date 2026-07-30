import React, { useState, useEffect } from 'react'
import { cloudBackupService } from '../services/cloudBackupService'
import { autoBackupService } from '../services/autoBackupService'
import { isSupabaseEnabled } from '../services/supabaseClient'

export default function BackupPanel() {
  const [cloudBackups, setCloudBackups] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [autoConfig, setAutoConfig] = useState(autoBackupService.getConfig())
  const [online, setOnline] = useState(isSupabaseEnabled())

  useEffect(() => {
    if (online) refreshCloudBackups()
  }, [online])

  async function refreshCloudBackups() {
    if (!online) return
    setLoading(true)
    const list = await cloudBackupService.listCloudBackups()
    setCloudBackups(list)
    setLoading(false)
  }

  async function handleUploadBackup() {
    if (!online) {
      setMessage({ type: 'error', text: 'Sin conexión a Supabase' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      // Crear backup local primero
      const local = await window.api.backup.create()
      if (!local.success) {
        setMessage({ type: 'error', text: `Error en backup local: ${local.error}` })
        setLoading(false)
        return
      }

      // Subir a la nube
      const filename = `manual-${Date.now()}.db`
      const result = await cloudBackupService.uploadBackup(local.path, filename)
      if (result.success) {
        setMessage({ type: 'success', text: 'Backup subido a la nube' })
        refreshCloudBackups()
      } else {
        setMessage({ type: 'error', text: `Error: ${result.error}` })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
    setLoading(false)
  }

  async function handleRestore(backup) {
    if (!confirm(`¿Restaurar respaldo del ${new Date(backup.created_at).toLocaleDateString('es')}? Esto reemplazará tu base de datos local.`)) return

    setLoading(true)
    setMessage(null)

    try {
      const dl = await cloudBackupService.downloadCloudBackup(backup.filename)
      if (!dl.success) {
        setMessage({ type: 'error', text: `Error descargando: ${dl.error}` })
        setLoading(false)
        return
      }

      // Convertir el Blob descargado a base64 para enviarlo al proceso main
      const blob = dl.data
      const buf = await blob.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const base64 = btoa(binary)

      const result = await window.api.backup.restoreFromCloud(base64)
      if (result.success) {
        setMessage({ type: 'success', text: 'Respaldo restaurado. Reinicia la app.' })
      } else {
        setMessage({ type: 'error', text: `Error restaurando: ${result.error}` })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
    setLoading(false)
  }

  async function handleDelete(backup) {
    if (!confirm(`¿Eliminar respaldo del ${new Date(backup.created_at).toLocaleDateString('es')}?`)) return
    setMessage(null)

    const result = await cloudBackupService.deleteCloudBackup(backup.filename, backup.id)
    if (result.success) {
      setMessage({ type: 'success', text: 'Respaldo eliminado' })
      refreshCloudBackups()
    } else {
      setMessage({ type: 'error', text: `Error: ${result.error}` })
    }
  }

  function toggleAutoBackup() {
    const newConfig = { ...autoConfig, enabled: !autoConfig.enabled }
    autoBackupService.saveConfig(newConfig)
    setAutoConfig(newConfig)
  }

  if (!online) {
    return (
      <div className="p-6 text-gray-500">
        <h3 className="text-lg font-semibold mb-2">Respaldo en la Nube</h3>
        <p>Conecta Supabase en <code>.env.local</code> para activar respaldos en la nube.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h3 className="text-lg font-semibold">Respaldo en la Nube</h3>

      {/* Auto-backup toggle */}
      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-3 rounded">
        <div>
          <p className="font-medium">Respaldo automático diario</p>
          <p className="text-sm text-gray-500">
            {autoConfig.enabled
              ? `Último: ${autoConfig.lastBackup ? new Date(autoConfig.lastBackup).toLocaleDateString('es') : 'nunca'}`
              : 'Desactivado'}
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={autoConfig.enabled} onChange={toggleAutoBackup} className="sr-only peer" />
          <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Subir ahora */}
      <button
        onClick={handleUploadBackup}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading ? 'Subiendo...' : 'Subir respaldo ahora'}
      </button>

      {/* Mensajes */}
      {message && (
        <div className={`p-2 rounded text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.text}
        </div>
      )}

      {/* Lista de backups */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">Respaldo en la nube</h4>
          <button onClick={refreshCloudBackups} className="text-sm text-blue-600 hover:underline" disabled={loading}>
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
        {cloudBackups.length === 0 ? (
          <p className="text-sm text-gray-500">No hay respaldos en la nube.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {cloudBackups.map(b => (
              <div key={b.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-2 rounded text-sm">
                <div className="flex-1 min-w-0">
                  <p className="truncate font-mono text-xs">{b.filename}</p>
                  <p className="text-gray-500 text-xs">
                    {new Date(b.created_at).toLocaleString('es')}
                    {b.size_bytes ? ` — ${(b.size_bytes / 1024).toFixed(1)} KB` : ''}
                  </p>
                </div>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => handleRestore(b)} className="px-2 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600" title="Restaurar">
                    Restaurar
                  </button>
                  <button onClick={() => handleDelete(b)} className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600" title="Eliminar">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
