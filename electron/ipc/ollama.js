// IPC handlers for Ollama interactive chat
const logger = require('../logger');
const { validate, OllamaChatSchema, OllamaGenerateSchema } = require('../schemas/ipc-schemas');

function register(ipcMain, { listModels, chat, generate }) {
  ipcMain.handle('ollama:list-models', async () => {
    logger.debug('ollama:list-models');
    return await listModels();
  });

  ipcMain.handle('ollama:chat', async (_event, params) => {
    try {
      const { model, messages, options } = validate(OllamaChatSchema, params, 'ollama:chat');
      logger.info({ model, msgCount: messages?.length }, 'ollama:chat');
      return await chat(model, messages, options);
    } catch (error) {
      if (error.code === 'ZOD_VALIDATION_ERROR') throw error;
      logger.error({ err: error, handler: 'ollama:chat' }, 'Ollama chat error');
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ollama:generate', async (_event, params) => {
    try {
      const { model, prompt, options } = validate(OllamaGenerateSchema, params, 'ollama:generate');
      return await generate(model, prompt, options);
    } catch (error) {
      if (error.code === 'ZOD_VALIDATION_ERROR') throw error;
      logger.error({ err: error, handler: 'ollama:generate' }, 'Ollama generate error');
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
