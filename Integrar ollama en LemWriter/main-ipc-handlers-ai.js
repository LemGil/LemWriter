/**
 * FRAGMENTO PARA electron/main.js
 *
 * Agrega estas líneas junto a tus otros `ipcMain.handle(...)` existentes.
 * No reemplaza nada de tu main.js actual — solo se suma.
 */

const aiService = require("./services/aiService");

// --- Handlers de IA ---

ipcMain.handle("ai:checkStatus", async () => {
  return aiService.checkOllamaStatus();
});

ipcMain.handle("ai:extractReferences", async (event, texto) => {
  try {
    const references = await aiService.extractReferences(texto);
    return { success: true, references };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("ai:classifyResource", async (event, descripcion) => {
  try {
    const categoria = await aiService.classifyResource(descripcion);
    return { success: true, categoria };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
