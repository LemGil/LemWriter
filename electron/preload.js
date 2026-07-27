const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  db: {
    query: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
    execute: (sql, params) => ipcRenderer.invoke('db:execute', sql, params)
  },
  onBeforeClose: (callback) => {
    ipcRenderer.on('before-close', callback)
    return () => ipcRenderer.off('before-close', callback)
  },
  app: {
    saveLastProject: (id) => ipcRenderer.invoke('app:save-last-project', id),
    getLastProject: () => ipcRenderer.invoke('app:get-last-project'),
  },
  confirmSaveComplete: () => ipcRenderer.send('save-complete'),
  cancelClose: () => ipcRenderer.send('save-cancelled'),
  export: {
    pdf: (project, sections, style) => ipcRenderer.invoke('export:pdf', project, sections, style),
    docx: (project, sections, style) => ipcRenderer.invoke('export:docx', project, sections, style),
    epub: (project, sections, style) => ipcRenderer.invoke('export:epub', project, sections, style),
  },
  backup: {
    create: () => ipcRenderer.invoke('backup:db'),
    list: () => ipcRenderer.invoke('backup:list'),
    restore: (backupPath) => ipcRenderer.invoke('backup:restore', backupPath),
  },
  dialog: {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
  },
  document: {
    convert: (filePath) => ipcRenderer.invoke('document:convert', filePath),
    save: (doc) => ipcRenderer.invoke('document:save', doc),
    list: () => ipcRenderer.invoke('document:list'),
    get: (id) => ipcRenderer.invoke('document:get', id),
    delete: (id) => ipcRenderer.invoke('document:delete', id),
  },
  ollama: {
    listModels: () => ipcRenderer.invoke('ollama:list-models'),
    chat: (params) => ipcRenderer.invoke('ollama:chat', params),
    generate: (params) => ipcRenderer.invoke('ollama:generate', params),
  },
  ai: {
    checkStatus: () => ipcRenderer.invoke('ai:check-status'),
    queryModel: (params) => ipcRenderer.invoke('ai:query-model', params),
    extractReferences: (params) => ipcRenderer.invoke('ai:extract-references', params),
    classifyResource: (params) => ipcRenderer.invoke('ai:classify-resource', params),
    confirmReference: (params) => ipcRenderer.invoke('ai:confirm-reference', params),
  },
  bible: {
    getVerse: (params) => ipcRenderer.invoke('bible:getVerse', params),
  }
})
