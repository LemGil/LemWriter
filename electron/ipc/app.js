// IPC handlers for app lifecycle and window state
const logger = require('../logger');
const { validate, SaveLastProjectSchema } = require('../schemas/ipc-schemas');

function register(ipcMain, deps) {
  const { mainWindowGetter, isClosingGetter, setSaveConfirmed, setIsClosing, windowState } = deps;

  // Renderer confirms autosave completed — proceed with window close
  ipcMain.on('save-complete', () => {
    logger.debug('save-complete — cerrando ventana');
    setSaveConfirmed(true);
    if (mainWindowGetter() && isClosingGetter()) {
      const bounds = mainWindowGetter().getBounds();
      const state = windowState.loadState();
      windowState.saveState({
        ...state,
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
      });
      mainWindowGetter().close();
    }
  });

  ipcMain.on('save-cancelled', () => {
    setIsClosing(false);
    setSaveConfirmed(false);
  });

  ipcMain.handle('app:save-last-project', async (_event, projectId) => {
    try {
      const { projectId: id } = validate(SaveLastProjectSchema, { projectId }, 'app:save-last-project');
      const state = windowState.loadState();
      windowState.saveState({ ...state, lastProjectId: id });
    } catch (error) {
      logger.warn({ err: error, handler: 'app:save-last-project' }, 'Validation failed');
    }
  });

  ipcMain.handle('app:get-last-project', async () => {
    const state = windowState.loadState();
    return state.lastProjectId || null;
  });
}

module.exports = { register };
