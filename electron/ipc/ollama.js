// IPC handlers for Ollama interactive chat
const logger = require('../logger');
const { validate, OllamaChatSchema, OllamaGenerateSchema } = require('../schemas/ipc-schemas');

function register(ipcMain, { listModels, chat, generate, chatStream }) {
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

  // Streaming chat — uses ipcMain.on (send) + webContents.send (push)
  // Renderer sends params, main pushes tokens back via 'ollama:chunk' events
  ipcMain.on('ollama:chat-stream', (event, params) => {
    try {
      const { model, messages, options } = validate(OllamaChatSchema, params, 'ollama:chat-stream');

      logger.info({ model, msgCount: messages?.length }, 'ollama:chat-stream start');

      const abort = chatStream(model, messages, options, {
        onChunk(token, fullContent) {
          if (!event.sender.isDestroyed()) {
            event.sender.send('ollama:chunk', { token, fullContent, done: false });
          }
        },
        onDone(fullContent) {
          logger.info({ model, length: fullContent.length }, 'ollama:chat-stream done');
          if (!event.sender.isDestroyed()) {
            event.sender.send('ollama:chunk', { token: '', fullContent, done: true });
          }
        },
        onError(err) {
          logger.error({ err, handler: 'ollama:chat-stream' }, 'Streaming error');
          if (!event.sender.isDestroyed()) {
            event.sender.send('ollama:chunk', { token: '', fullContent: '', done: true, error: err.message });
          }
        },
      });

      // Store abort on the event so renderer can cancel
      // The renderer can send 'ollama:abort' with the same model/messages key
      if (!event.sender.isDestroyed()) {
        event.sender.send('ollama:stream-started', {});
      }
    } catch (error) {
      logger.error({ err: error, handler: 'ollama:chat-stream' }, 'Validation error');
      if (!event.sender.isDestroyed()) {
        event.sender.send('ollama:chunk', { token: '', fullContent: '', done: true, error: error.message });
      }
    }
  });

  // Abort a running stream
  ipcMain.on('ollama:abort', (event) => {
    logger.debug('ollama:abort');
    // The chatStream returns an abort function but we don't have a registry yet.
    // For now, the connection timeout will clean up.
    // TODO: maintain a Map<rendererId, abortFn> for cancellation
  });
}

module.exports = { register };
