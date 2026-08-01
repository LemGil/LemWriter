const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");

// Forzar HTTP/1.1 en Chromium: HTTP/2 contra Cloudflare/Supabase falla con
// "PROTOCOL_ERROR" en uploads grandes desde algunas redes (fetch del renderer
// corta con "Failed to fetch"). HTTP/1.1 es más tolerante y completo los uploads.
app.commandLine.appendSwitch("disable-http2");

require("./database.js");
const db = require("./database.js");
const { setMainWindow } = require("./export.js");
const { exportPDF, exportDOCX, exportEPUB } = require("./export.js");
const { listModels, chat, generate, chatStream } = require("./ollama.js");
const aiService = require("./services/aiService.js");
const windowState = require("./window-state");
const bibleService = require("./bible-database.js");
const logger = require("./logger");

// IPC module registration
const ipcDb = require("./ipc/db");
const ipcExport = require("./ipc/export");
const ipcDocuments = require("./ipc/documents");
const ipcBackup = require("./ipc/backup");
const ipcBible = require("./ipc/bible");
const ipcAi = require("./ipc/ai");
const ipcOllama = require("./ipc/ollama");
const ipcApp = require("./ipc/app");

let mainWindow = null;
let isClosing = false;
let saveConfirmed = false;

function createWindow() {
  const state = windowState.loadState();
  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    icon: path.join(__dirname, "../build/icon_512x512.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow = win;
  setMainWindow(win);

  win.on("close", async (event) => {
    if (isClosing) {
      return;
    }

    event.preventDefault();

    if (!saveConfirmed) {
      isClosing = true;
      win.webContents.send("before-close");
    } else {
      isClosing = true;
    }
  });

  // Menú contextual para clic derecho
  win.webContents.on("context-menu", (event, params) => {
    const { editFlags, isEditable } = params;
    const hasSelection = editFlags && editFlags.canCopy;

    const menuItems = [];

    if (isEditable) {
      if (editFlags && editFlags.canUndo) {
        menuItems.push({
          label: "Deshacer",
          accelerator: "CmdOrCtrl+Z",
          role: "undo",
        });
      }
      if (editFlags && editFlags.canRedo) {
        menuItems.push({
          label: "Rehacer",
          accelerator: "CmdOrCtrl+Shift+Z",
          role: "redo",
        });
      }
      if (menuItems.length > 0) {
        menuItems.push({ type: "separator" });
      }
    }

    if (isEditable || hasSelection) {
      if (editFlags && editFlags.canCut) {
        menuItems.push({
          label: "Cortar",
          accelerator: "CmdOrCtrl+X",
          role: "cut",
        });
      }
      if (editFlags && editFlags.canCopy) {
        menuItems.push({
          label: "Copiar",
          accelerator: "CmdOrCtrl+C",
          role: "copy",
        });
      }
      if (editFlags && editFlags.canPaste) {
        menuItems.push({
          label: "Pegar",
          accelerator: "CmdOrCtrl+V",
          role: "paste",
        });
      }
      if (editFlags && editFlags.canDelete) {
        menuItems.push({
          label: "Eliminar",
          role: "delete",
        });
      }
      if (menuItems.length > 0) {
        menuItems.push({ type: "separator" });
      }
      menuItems.push({
        label: "Seleccionar todo",
        accelerator: "CmdOrCtrl+A",
        role: "selectAll",
      });
    } else {
      // Área no editable sin selección — solo SelectAll tiene sentido
      menuItems.push({
        label: "Seleccionar todo",
        accelerator: "CmdOrCtrl+A",
        role: "selectAll",
      });
    }

    if (menuItems.length > 0) {
      Menu.buildFromTemplate(menuItems).popup({ window: win });
    }
  });

  // In development, load the vite dev server
  // In production, load the index.html file
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    win.loadURL("http://localhost:5173").catch((err) => {
      logger.error({ err }, "Error cargando la URL de desarrollo");
    });
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

// Register IPC modules
ipcDb.register(ipcMain, db);
ipcExport.register(ipcMain, { exportPDF, exportDOCX, exportEPUB });
ipcDocuments.register(ipcMain, db);
ipcBackup.register(ipcMain, db);
ipcBible.register(ipcMain, bibleService);
ipcAi.register(ipcMain, aiService, db);
ipcOllama.register(ipcMain, { listModels, chat, generate, chatStream });
ipcApp.register(ipcMain, { mainWindowGetter: () => mainWindow, isClosingGetter: () => isClosing, setSaveConfirmed: (v) => { saveConfirmed = v; }, setIsClosing: (v) => { isClosing = v; }, windowState });

ipcMain.handle('sections:delete', async (event, sectionId) => {
  try {
    const stmt = db.prepare('DELETE FROM sections WHERE id = ?');
    const result = stmt.run(sectionId);
    return { success: true, changes: result.changes };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

logger.info("Registered IPC modules");

app.whenReady().then(() => {
  logger.info({ version: app.getVersion(), node: process.version }, "LemWriter iniciado");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds();
      const state = windowState.loadState();
      windowState.saveState({
        ...state,
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
      });
    }
  } catch (_) {
    // Fallback para cuando la ventana ya no está disponible
  }
});
