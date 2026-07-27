// IPC handlers for document export (PDF, DOCX, EPUB)
const logger = require('../logger');

function register(ipcMain, { exportPDF, exportDOCX, exportEPUB }) {
  ipcMain.handle('export:pdf', async (_event, project, sections, style) => {
    try {
      return await exportPDF(project, sections, style);
    } catch (error) {
      logger.error({ err: error, handler: 'export:pdf' }, 'PDF export error');
      throw error;
    }
  });

  ipcMain.handle('export:docx', async (_event, project, sections, style) => {
    try {
      return await exportDOCX(project, sections, style);
    } catch (error) {
      logger.error({ err: error, handler: 'export:docx' }, 'DOCX export error');
      throw error;
    }
  });

  ipcMain.handle('export:epub', async (_event, project, sections, style) => {
    try {
      return await exportEPUB(project, sections, style);
    } catch (error) {
      logger.error({ err: error, handler: 'export:epub' }, 'EPUB export error');
      throw error;
    }
  });
}

module.exports = { register };
