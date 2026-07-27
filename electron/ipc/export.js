// IPC handlers for document export (PDF, DOCX, EPUB)
const logger = require('../logger');
const { validate, ExportParamsSchema } = require('../schemas/ipc-schemas');

function register(ipcMain, { exportPDF, exportDOCX, exportEPUB }) {
  ipcMain.handle('export:pdf', async (_event, project, sections, style) => {
    try {
      validate(ExportParamsSchema, { project, sections, style }, 'export:pdf');
      return await exportPDF(project, sections, style);
    } catch (error) {
      if (error.code === 'ZOD_VALIDATION_ERROR') throw error;
      logger.error({ err: error, handler: 'export:pdf' }, 'PDF export error');
      throw error;
    }
  });

  ipcMain.handle('export:docx', async (_event, project, sections, style) => {
    try {
      validate(ExportParamsSchema, { project, sections, style }, 'export:docx');
      return await exportDOCX(project, sections, style);
    } catch (error) {
      if (error.code === 'ZOD_VALIDATION_ERROR') throw error;
      logger.error({ err: error, handler: 'export:docx' }, 'DOCX export error');
      throw error;
    }
  });

  ipcMain.handle('export:epub', async (_event, project, sections, style) => {
    try {
      validate(ExportParamsSchema, { project, sections, style }, 'export:epub');
      return await exportEPUB(project, sections, style);
    } catch (error) {
      if (error.code === 'ZOD_VALIDATION_ERROR') throw error;
      logger.error({ err: error, handler: 'export:epub' }, 'EPUB export error');
      throw error;
    }
  });
}

module.exports = { register };
