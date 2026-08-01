// IPC handlers for database backup/restore
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { app } = require('electron');
const logger = require('../logger');
const { validate, BackupRestoreSchema } = require('../schemas/ipc-schemas');

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

  ipcMain.handle('backup:read-db', async (_event, filePath) => {
    try {
      const buffer = fs.readFileSync(filePath);
      // Comprimir con gzip para reducir drásticamente el tamaño a subir a la nube
      // (la BD completa puede pesar decenas de MB; gzip la reduce ~65%)
      const gzipped = zlib.gzipSync(buffer);
      logger.info(
        { originalSize: buffer.length, compressedSize: gzipped.length },
        'backup:read-db gzip'
      );
      return { success: true, data: gzipped.toString('base64'), compressed: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup:restore-cloud', async (_event, base64Data) => {
    try {
      const dbPath = db.name;
      const rawBuffer = Buffer.from(base64Data, 'base64');
      // Detectar gzip por magic bytes (1f 8b) y descomprimir si aplica
      let buffer = rawBuffer;
      if (rawBuffer.length > 2 && rawBuffer[0] === 0x1f && rawBuffer[1] === 0x8b) {
        buffer = zlib.gunzipSync(rawBuffer);
        logger.info(
          { compressedSize: rawBuffer.length, restoredSize: buffer.length },
          'backup:restore-cloud gunzip'
        );
      }
      db.close();
      fs.writeFileSync(dbPath, buffer);
      logger.warn({}, 'Database restored from cloud — relaunching');
      app.relaunch();
      app.exit();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup:restore', async (_event, backupPath) => {
    try {
      const { backupPath: validatedPath } = validate(BackupRestoreSchema, { backupPath }, 'backup:restore');
      const dbPath = db.name;
      db.close();
      fs.copyFileSync(validatedPath, dbPath);
      logger.warn({ backupPath: validatedPath }, 'Database restored — relaunching');
      app.relaunch();
      app.exit();
      return { success: true };
    } catch (error) {
      if (error.code === 'ZOD_VALIDATION_ERROR') throw error;
      logger.error({ err: error, handler: 'backup:restore' }, 'Restore error');
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
