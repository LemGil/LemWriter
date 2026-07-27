// IPC handler for offline Bible lookups (RV1909)
const logger = require('../logger');

function register(ipcMain, bibleService) {
  ipcMain.handle('bible:getVerse', async (_event, params) => {
    try {
      const text = bibleService.buscarVersiculo(params);
      return text;
    } catch (error) {
      logger.error({ err: error, handler: 'bible:getVerse' }, 'Bible verse error');
      return null;
    }
  });
}

module.exports = { register };
