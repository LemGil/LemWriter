// IPC handlers for local AI (Ollama) integration
const logger = require('../logger');

function register(ipcMain, aiService, db) {
  ipcMain.handle('ai:check-status', async () => {
    try {
      return await aiService.checkOllamaStatus();
    } catch (error) {
      logger.error({ err: error, handler: 'ai:check-status' }, 'AI status error');
      return { connected: false, error: error.message };
    }
  });

  ipcMain.handle('ai:query-model', async (_event, prompt, options) => {
    try {
      return await aiService.queryModel(prompt, options);
    } catch (error) {
      logger.error({ err: error, handler: 'ai:query-model' }, 'AI query error');
      throw error;
    }
  });

  ipcMain.handle('ai:extract-references', async (_event, params) => {
    try {
      const { text, projectId } = params;
      const references = await aiService.extractReferences(text);
      // Store detected references in DB
      for (const ref of references) {
        db.prepare(`
          INSERT INTO detected_references (project_id, libro, capitulo, versiculo, versiculo_final, posicion_en_texto, texto_original, modelo_usado, confirmado_por_usuario)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        `).run(
          projectId,
          ref.libro,
          ref.capitulo,
          ref.versiculo,
          ref.versiculo_final || null,
          ref.posicion_en_texto || null,
          ref.texto_original || text.slice(ref.posicion_en_texto || 0, (ref.posicion_en_texto || 0) + 50) || null,
          ref.modelo_usado || 'ibm/granite4:3b'
        );
      }
      return references;
    } catch (error) {
      logger.error({ err: error, handler: 'ai:extract-references' }, 'Extract references error');
      return [];
    }
  });

  ipcMain.handle('ai:classify-resource', async (_event, description, options) => {
    try {
      return await aiService.classifyResource(description, options);
    } catch (error) {
      logger.error({ err: error, handler: 'ai:classify-resource' }, 'Classify resource error');
      return 'general';
    }
  });

  ipcMain.handle('ai:confirm-reference', async (_event, refId) => {
    try {
      // Confirm a detected reference: mark as confirmed by user (or upsert into resources)
      const existing = db.prepare(`SELECT * FROM detected_references WHERE id = ?`).get(refId);
      if (!existing) {
        // Fallback: try to find by project + libro + capitulo + versiculo
        logger.warn({ refId }, 'Reference not found by ID — skipping confirm');
        return { success: false, error: 'Reference not found' };
      }
      db.prepare(`UPDATE detected_references SET confirmado_por_usuario = 1 WHERE id = ?`).run(refId);
      logger.info({ refId, reference: `${existing.libro} ${existing.capitulo}:${existing.versiculo}` }, 'Reference confirmed');
      return { success: true, reference: existing };
    } catch (error) {
      logger.error({ err: error, handler: 'ai:confirm-reference' }, 'Confirm reference error');
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
