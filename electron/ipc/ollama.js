// IPC handlers for Ollama interactive chat
const logger = require('../logger');

function register(ipcMain, { listModels, chat, generate }) {
  ipcMain.handle('ollama:list-models', async () => {
    logger.debug('ollama:list-models');
    return await listModels();
  });

  ipcMain.handle('ollama:chat', async (_event, { model, messages, options }) => {
    logger.info({ model, msgCount: messages?.length }, 'ollama:chat');
    return await chat(model, messages, options);
  });

  ipcMain.handle('ollama:generate', async (_event, { model, prompt, options }) => {
    return await generate(model, prompt, options);
  });
}

module.exports = { register };
