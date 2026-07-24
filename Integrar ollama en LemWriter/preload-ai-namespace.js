/**
 * FRAGMENTO PARA electron/preload.js
 *
 * Agrega este namespace junto a los que ya tienes expuestos
 * (ej. contextBridge.exposeInMainWorld("electronAPI", { ... })).
 * Ajusta el nombre del objeto principal si el tuyo no se llama
 * "electronAPI" — debe coincidir con tu patrón actual.
 */

// Dentro del objeto que ya expones vía contextBridge, agrega:
const aiNamespace = {
  checkStatus: () => ipcRenderer.invoke("ai:checkStatus"),
  extractReferences: (texto) => ipcRenderer.invoke("ai:extractReferences", texto),
  classifyResource: (descripcion) => ipcRenderer.invoke("ai:classifyResource", descripcion),
};

// Ejemplo de cómo quedaría integrado (ajusta según tu estructura real):
//
// contextBridge.exposeInMainWorld("electronAPI", {
//   ...tusNamespacesExistentes,
//   ai: aiNamespace,
// });

module.exports = { aiNamespace };
