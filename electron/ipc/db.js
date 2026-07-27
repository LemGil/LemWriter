// IPC handlers for database operations
const logger = require('../logger');
const { validate, DbQuerySchema, DbExecuteSchema } = require('../schemas/ipc-schemas');

function register(ipcMain, db) {
  ipcMain.handle('db:query', async (_event, sql, params = []) => {
    try {
      const [validatedSql, validatedParams] = validate(DbQuerySchema, [sql, params], 'db:query');
      logger.debug({ sql: validatedSql, params: validatedParams }, 'db:query');
      return db.prepare(validatedSql).all(...validatedParams);
    } catch (error) {
      if (error.code === 'ZOD_VALIDATION_ERROR') throw error;
      logger.error({ err: error, sql }, 'Database query error');
      throw error;
    }
  });

  ipcMain.handle('db:execute', async (_event, sql, params = []) => {
    try {
      const [validatedSql, validatedParams] = validate(DbExecuteSchema, [sql, params], 'db:execute');
      logger.debug({ sql: validatedSql, params: validatedParams }, 'db:execute');
      const info = db.prepare(validatedSql).run(...validatedParams);
      return { lastInsertId: Number(info.lastInsertRowid), changes: info.changes };
    } catch (error) {
      if (error.code === 'ZOD_VALIDATION_ERROR') throw error;
      logger.error({ err: error, sql }, 'Database execute error');
      throw error;
    }
  });
}

module.exports = { register };
