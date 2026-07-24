const getApi = () => {
  if (window.api && window.api.backup) return window.api.backup
  throw new Error("Backup API not available")
}

export const backupService = {
  async createBackup() {
    try {
      return await getApi().create()
    } catch (err) {
      console.error("Backup failed:", err)
      return { success: false, error: err.message }
    }
  },

  async listBackups() {
    try {
      return await getApi().list()
    } catch {
      return []
    }
  },

  async restoreBackup(backupPath) {
    try {
      return await getApi().restore(backupPath)
    } catch (err) {
      console.error("Restore failed:", err)
      return { success: false, error: err.message }
    }
  },
}
