// IPC handler for offline Bible lookups (RV1909)
const logger = require('../logger');
const { validate, BibleVerseSchema } = require('../schemas/ipc-schemas');

function register(ipcMain, bibleService) {
  ipcMain.handle('bible:getVerse', async (_event, params) => {
    try {
      const data = validate(BibleVerseSchema, params, 'bible:getVerse');
      const text = bibleService.buscarVersiculo(data);
      return text;
    } catch (error) {
      if (error.code === 'ZOD_VALIDATION_ERROR') {
        logger.warn({ errors: error.zodErrors }, 'bible:getVerse validation failed');
        return null;
      }
      logger.error({ err: error, handler: 'bible:getVerse' }, 'Bible verse error');
      return null;
    }
  });
}

module.exports = { register };
