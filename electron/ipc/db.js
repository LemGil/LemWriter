// IPC handlers for database operations
const logger = require('../logger');

function register(ipcMain, db) {
  ipcMain.handle('db:query', async (_event, sql, params = []) => {
    try {
      logger.debug({ sql, params }, 'db:query');
      return db.prepare(sql).all(...params);
    } catch (error) {
      logger.error({ err: error, sql }, 'Database query error');
      throw error;
    }
  });

  ipcMain.handle('db:execute', async (_event, sql, params = []) => {
    try {
      logger.debug({ sql, params }, 'db:execute');
      const info = db.prepare(sql).run(...params);
      return { lastInsertId: Number(info.lastInsertRowid), changes: info.changes };
    } catch (error) {
      logger.error({ err: error, sql }, 'Database execute error');
      throw error;
    }
  });
}

module.exports = { register };
