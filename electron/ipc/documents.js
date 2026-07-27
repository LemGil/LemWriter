// IPC handlers for document import/conversion
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const { marked } = require('marked');
const { dialog } = require('electron');
const logger = require('../logger');

const { validate, DocumentSaveSchema, DocumentIdSchema } = require('../schemas/ipc-schemas');

let pdfParse = null;

async function ensurePdfParse() {
  if (!pdfParse) {
    pdfParse = (await import('pdf-parse')).default;
  }
  return pdfParse;
}

function register(ipcMain, db) {
  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Seleccionar documento',
      filters: [
        { name: 'Documentos compatibles', extensions: ['docx', 'pdf', 'txt', 'md'] },
        { name: 'Word', extensions: ['docx'] },
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'Texto plano', extensions: ['txt'] },
        { name: 'Markdown', extensions: ['md'] },
      ],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('document:convert', async (_event, filePath) => {
    try {
      if (!filePath || typeof filePath !== 'string') {
        throw Object.assign(new Error('filePath string required'), { code: 'ZOD_VALIDATION_ERROR' });
      }
      const ext = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath);
      let html = '';

      switch (ext) {
        case '.docx': {
          const result = await mammoth.convertToHtml({ path: filePath });
          html = result.value;
          break;
        }
        case '.pdf': {
          const parse = await ensurePdfParse();
          const buf = fs.readFileSync(filePath);
          const data = await parse(buf);
          html = `<p>${data.text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
          break;
        }
        case '.txt': {
          const text = fs.readFileSync(filePath, 'utf-8');
          html = `<p>${text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
          break;
        }
        case '.md': {
          const md = fs.readFileSync(filePath, 'utf-8');
          html = marked.parse(md);
          break;
        }
        default:
          throw new Error(`Formato no soportado: ${ext}`);
      }

      return { success: true, html, fileName, filePath, type: ext.replace('.', '') };
    } catch (error) {
      logger.error({ err: error, handler: 'document:convert' }, 'Document convert error');
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('document:save', async (_event, doc) => {
    try {
      const data = validate(DocumentSaveSchema, doc, 'document:save');
      const { id, fileName, content, html } = data;
      if (id) {
        db.prepare(
          `UPDATE uploaded_documents SET file_name = ?, content = ?, html = ?, word_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).run(fileName, content, html, (content || '').length, id);
        return { success: true, id };
      }
      const info = db.prepare(
        `INSERT INTO uploaded_documents (file_name, file_path, file_type, content, html, word_count) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(data.fileName, data.filePath, data.fileType, content, html, (content || '').length);
      return { success: true, id: Number(info.lastInsertRowid) };
    } catch (error) {
      if (error.code === 'ZOD_VALIDATION_ERROR') throw error;
      logger.error({ err: error, handler: 'document:save' }, 'Document save error');
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('document:list', async () => {
    try {
      return db.prepare(
        `SELECT id, file_name, file_type, word_count, opened_at FROM uploaded_documents ORDER BY opened_at DESC`
      ).all();
    } catch (error) {
      logger.error({ err: error, handler: 'document:list' }, 'Document list error');
      return [];
    }
  });

  ipcMain.handle('document:get', async (_event, id) => {
    try {
      validate(DocumentIdSchema, { id }, 'document:get');
      return db.prepare(`SELECT * FROM uploaded_documents WHERE id = ?`).get(id) || null;
    } catch (error) {
      if (error.code === 'ZOD_VALIDATION_ERROR') throw error;
      logger.error({ err: error, handler: 'document:get' }, 'Document get error');
      return null;
    }
  });

  ipcMain.handle('document:delete', async (_event, id) => {
    try {
      validate(DocumentIdSchema, { id }, 'document:delete');
      db.prepare(`DELETE FROM uploaded_documents WHERE id = ?`).run(id);
      return { success: true };
    } catch (error) {
      if (error.code === 'ZOD_VALIDATION_ERROR') throw error;
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
