// IPC handlers for local AI (Ollama) integration
const logger = require('../logger');
const { validate, AiQuerySchema, ExtractReferencesSchema, ClassifyResourceSchema, ConfirmReferenceSchema } = require('../schemas/ipc-schemas');

function register(ipcMain, aiService, db) {
  ipcMain.handle('ai:check-status', async () => {
    try {
      return await aiService.checkOllamaStatus();
    } catch (error) {
      logger.error({ err: error, handler: 'ai:check-status' }, 'AI status error');
      return { connected: false, error: error.message };
    }
  });

  ipcMain.handle('ai:query-model', async (_event, params) => {
    try {
      const { prompt, options } = validate(AiQuerySchema, params, 'ai:query-model');
      return await aiService.queryModel(prompt, options);
    } catch (error) {
      logger.error({ err: error, handler: 'ai:query-model' }, 'AI query error');
      throw error;
    }
  });

  ipcMain.handle('ai:extract-references', async (_event, params) => {
    try {
      const { text, projectId } = validate(ExtractReferencesSchema, params, 'ai:extract-references');
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

  ipcMain.handle('ai:classify-resource', async (_event, params) => {
    try {
      const { description, options } = validate(ClassifyResourceSchema, params, 'ai:classify-resource');
      return await aiService.classifyResource(description, options);
    } catch (error) {
      logger.error({ err: error, handler: 'ai:classify-resource' }, 'Classify resource error');
      return 'general';
    }
  });

  ipcMain.handle('ai:confirm-reference', async (_event, params) => {
    try {
      const validated = validate(ConfirmReferenceSchema, params, 'ai:confirm-reference');

      // Support both refId and (projectId+libro+capitulo+versiculo) patterns
      if (validated.refId) {
        const existing = db.prepare(`SELECT * FROM detected_references WHERE id = ?`).get(validated.refId);
        if (!existing) {
          logger.warn({ refId: validated.refId }, 'Reference not found by ID — skipping confirm');
          return { success: false, error: 'Reference not found' };
        }
        db.prepare(`UPDATE detected_references SET confirmado_por_usuario = 1 WHERE id = ?`).run(validated.refId);
        logger.info({ refId: validated.refId, reference: `${existing.libro} ${existing.capitulo}:${existing.versiculo}` }, 'Reference confirmed');
        return { success: true, reference: existing };
      }

      // Legacy: match by (projectId, libro, capitulo, versiculo)
      const refStr = `${validated.libro} ${validated.capitulo}:${validated.versiculo}${validated.versiculo_final ? '-' + validated.versiculo_final : ''}`;
      const result = db.prepare(`
        UPDATE detected_references
        SET confirmado_por_usuario = 1,
            versiculo_final = COALESCE(?, versiculo_final)
        WHERE project_id = ?
          AND libro = ?
          AND capitulo = ?
          AND versiculo = ?
      `).run(validated.versiculo_final || null, validated.projectId, validated.libro, validated.capitulo, validated.versiculo);

      if (result.changes === 0) {
        // No existing row — insert directly as confirmed
        db.prepare(`
          INSERT INTO detected_references
            (project_id, libro, capitulo, versiculo, versiculo_final, confirmado_por_usuario, modelo_usado)
          VALUES (?, ?, ?, ?, ?, 1, ?)
        `).run(validated.projectId, validated.libro, validated.capitulo, validated.versiculo, validated.versiculo_final || null, aiService.DEFAULT_MODEL);
      }

      // Add as resource
      const resourceResult = db.prepare(`
        INSERT INTO resources (type, title, reference, created_at, updated_at)
        VALUES ('pasaje_biblico', ?, ?, datetime('now'), datetime('now'))
      `).run(refStr, refStr);

      const resourceId = Number(resourceResult.lastInsertRowid);
      db.prepare(`INSERT OR IGNORE INTO project_resources (project_id, resource_id) VALUES (?, ?)`)
        .run(validated.projectId, resourceId);

      return { success: true, resourceId };
    } catch (error) {
      logger.error({ err: error, handler: 'ai:confirm-reference' }, 'Confirm reference error');
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
