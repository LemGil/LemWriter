import React, { useState, useEffect } from 'react'
import { HardDrive } from 'lucide-react'
import { backupService } from '../../services/backupService'

const BackupButton = () => {
  const [status, setStatus] = useState('')
  const [backups, setBackups] = useState(0)

  useEffect(() => {
    backupService.listBackups().then(list => setBackups(list.length)).catch(() => {})
  }, [])

  const handleBackup = async () => {
    setStatus('Respaldando...')
    const result = await backupService.createBackup()
    if (result.success) {
      setStatus('✓ Respaldado')
      setBackups(result.count)
    } else {
      setStatus('✗ Error')
    }
    setTimeout(() => setStatus(''), 3000)
  }

  return (
    <button onClick={handleBackup} className="w-full text-center group" title="Respaldar base de datos">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <HardDrive size={16} className="text-brand-teal group-hover:text-brand-gold-deep transition-colors" />
      </div>
      <p className="text-[10px] text-brand-ink-3 font-sans">
        {status || `${backups} respaldos`}
      </p>
    </button>
  )
}

export default BackupButton
