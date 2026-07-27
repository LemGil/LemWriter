// IPC handlers for database backup/restore
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const logger = require('../logger');

function register(ipcMain, db) {
  ipcMain.handle('backup:db', async () => {
    try {
      const dbPath = db.name;
      const backupDir = path.join(app.getPath('userData'), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `lemwriter-${timestamp}.db`);
      fs.copyFileSync(dbPath, backupPath);

      const backups = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('lemwriter-') && f.endsWith('.db'))
        .sort()
        .reverse();

      if (backups.length > 10) {
        backups.slice(10).forEach(f => {
          fs.unlinkSync(path.join(backupDir, f));
        });
      }

      const count = Math.min(backups.length, 10);
      logger.info({ backupPath, count }, 'Backup created');
      return { success: true, path: backupPath, count };
    } catch (error) {
      logger.error({ err: error, handler: 'backup:db' }, 'Backup error');
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup:list', async () => {
    try {
      const backupDir = path.join(app.getPath('userData'), 'backups');
      if (!fs.existsSync(backupDir)) return [];
      return fs.readdirSync(backupDir)
        .filter(f => f.startsWith('lemwriter-') && f.endsWith('.db'))
        .sort()
        .reverse()
        .map(f => ({
          name: f,
          path: path.join(backupDir, f),
          size: fs.statSync(path.join(backupDir, f)).size,
          date: f.replace('lemwriter-', '').replace('.db', '').replace(/-/g, ':').replace('T', ' ').slice(0, 19),
        }));
    } catch {
      return [];
    }
  });

  ipcMain.handle('backup:restore', async (_event, backupPath) => {
    try {
      const dbPath = db.name;
      db.close();
      fs.copyFileSync(backupPath, dbPath);
      logger.warn({ backupPath }, 'Database restored — relaunching');
      app.relaunch();
      app.exit();
      return { success: true };
    } catch (error) {
      logger.error({ err: error, handler: 'backup:restore' }, 'Restore error');
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
