const { app, BrowserWindow, ipcMain, Menu, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
require("./database.js");
const db = require("./database.js");
const { exportPDF, exportDOCX, exportEPUB, setMainWindow } = require("./export.js");
const mammoth = require("mammoth");
const { marked } = require("marked");
const { listModels, chat, generate } = require("./ollama.js");
const aiService = require("./services/aiService.js");
const windowState = require("./window-state");
const bibleService = require("./bible-database.js");

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
      console.error("Error cargando la URL de desarrollo:", err);
    });
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

// IPC Handlers for Database
ipcMain.handle("db:query", async (event, sql, params = []) => {
  try {
    return db.prepare(sql).all(params);
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
});

ipcMain.handle("db:execute", async (event, sql, params = []) => {
  try {
    console.log("Executing SQL:", sql, "with params:", params);
    const info = db.prepare(sql).run(params);
    return { lastInsertId: Number(info.lastInsertRowid), changes: info.changes };
  } catch (error) {
    console.error("Database execute error:", error);
    throw error;
  }
});

// IPC handlers for Export
ipcMain.handle("export:pdf", async (event, project, sections, style) => {
  try {
    return await exportPDF(project, sections, style);
  } catch (error) {
    console.error("PDF export error:", error);
    throw error;
  }
});

ipcMain.handle("export:docx", async (event, project, sections, style) => {
  try {
    return await exportDOCX(project, sections, style);
  } catch (error) {
    console.error("DOCX export error:", error);
    throw error;
  }
});

ipcMain.handle("export:epub", async (event, project, sections, style) => {
  try {
    return await exportEPUB(project, sections, style);
  } catch (error) {
    console.error("EPUB export error:", error);
    throw error;
  }
});

// IPC: renderer confirma que el autoguardado completó
ipcMain.on("save-complete", () => {
  saveConfirmed = true;
  if (mainWindow && isClosing) {
    // Guardar estado de la ventana justo antes de cerrar
    const bounds = mainWindow.getBounds();
    const state = windowState.loadState();
    windowState.saveState({
      ...state,
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
    });
    mainWindow.close();
  }
});

ipcMain.on("save-cancelled", () => {
  isClosing = false;
  saveConfirmed = false;
});

// IPC: open file dialog for documents
ipcMain.handle("dialog:openFile", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Seleccionar documento",
    filters: [
      { name: "Documentos compatibles", extensions: ["docx", "pdf", "txt", "md"] },
      { name: "Word", extensions: ["docx"] },
      { name: "PDF", extensions: ["pdf"] },
      { name: "Texto plano", extensions: ["txt"] },
      { name: "Markdown", extensions: ["md"] },
    ],
    properties: ["openFile"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// IPC: convert document to HTML
ipcMain.handle("document:convert", async (event, filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);

    let html = "";

    switch (ext) {
      case ".docx": {
        const result = await mammoth.convertToHtml({ path: filePath });
        html = result.value;
        break;
      }
      case ".pdf": {
        const buf = fs.readFileSync(filePath);
        const data = await pdfParse(buf);
        html = `<p>${data.text.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
        break;
      }
      case ".txt": {
        const text = fs.readFileSync(filePath, "utf-8");
        html = `<p>${text.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
        break;
      }
      case ".md": {
        const md = fs.readFileSync(filePath, "utf-8");
        html = marked.parse(md);
        break;
      }
      default:
        throw new Error(`Formato no soportado: ${ext}`);
    }

    return { success: true, html, fileName, filePath, type: ext.replace(".", "") };
  } catch (error) {
    console.error("Document convert error:", error);
    return { success: false, error: error.message };
  }
});

// IPC: document persistence
ipcMain.handle("document:save", async (event, doc) => {
  try {
    const { id, fileName, content, html } = doc;
    if (id) {
      db.prepare(`UPDATE uploaded_documents SET file_name = ?, content = ?, html = ?, word_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(fileName, content, html, (content || "").length, id);
      return { success: true, id };
    }
    const info = db.prepare(`INSERT INTO uploaded_documents (file_name, file_path, file_type, content, html, word_count) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(doc.fileName, doc.filePath, doc.fileType, content, html, (content || "").length);
    return { success: true, id: Number(info.lastInsertRowid) };
  } catch (error) {
    console.error("Document save error:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("document:list", async () => {
  try {
    return db.prepare(`SELECT id, file_name, file_type, word_count, opened_at FROM uploaded_documents ORDER BY opened_at DESC`).all();
  } catch (error) {
    console.error("Document list error:", error);
    return [];
  }
});

ipcMain.handle("document:get", async (event, id) => {
  try {
    return db.prepare(`SELECT * FROM uploaded_documents WHERE id = ?`).get(id) || null;
  } catch (error) {
    console.error("Document get error:", error);
    return null;
  }
});

ipcMain.handle("document:delete", async (event, id) => {
  try {
    db.prepare(`DELETE FROM uploaded_documents WHERE id = ?`).run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC: backup database
ipcMain.handle("backup:db", async () => {
  try {
    const dbPath = db.name;
    const backupDir = path.join(app.getPath("userData"), "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `lemwriter-${timestamp}.db`);
    fs.copyFileSync(dbPath, backupPath);

    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith("lemwriter-") && f.endsWith(".db"))
      .sort()
      .reverse();

    if (backups.length > 10) {
      backups.slice(10).forEach(f => {
        fs.unlinkSync(path.join(backupDir, f));
      });
    }

    return { success: true, path: backupPath, count: Math.min(backups.length, 10) };
  } catch (error) {
    console.error("Backup error:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("backup:list", async () => {
  try {
    const backupDir = path.join(app.getPath("userData"), "backups");
    if (!fs.existsSync(backupDir)) return [];
    return fs.readdirSync(backupDir)
      .filter(f => f.startsWith("lemwriter-") && f.endsWith(".db"))
      .sort()
      .reverse()
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        size: fs.statSync(path.join(backupDir, f)).size,
        date: f.replace("lemwriter-", "").replace(".db", "").replace(/-/g, ":").replace("T", " ").slice(0, 19),
      }));
  } catch {
    return [];
  }
});

ipcMain.handle("backup:restore", async (event, backupPath) => {
  try {
    const dbPath = db.name;
    db.close();
    fs.copyFileSync(backupPath, dbPath);
    app.relaunch();
    app.exit();
    return { success: true };
  } catch (error) {
    console.error("Restore error:", error);
    return { success: false, error: error.message };
  }
});

// Ollama IPC handlers
ipcMain.handle("ollama:list-models", async () => {
  return await listModels();
});

ipcMain.handle("ollama:chat", async (event, { model, messages, options }) => {
  return await chat(model, messages, options);
});

ipcMain.handle("ollama:generate", async (event, { model, prompt, options }) => {
  return await generate(model, prompt, options);
});

// AI Service IPC handlers (optimizado con keep_alive, num_ctx, etc.)
ipcMain.handle("ai:check-status", async () => {
  return await aiService.checkOllamaStatus();
});

ipcMain.handle("ai:query-model", async (event, { prompt, options }) => {
  try {
    const content = await aiService.queryModel(prompt, options);
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("bible:getVerse", async (event, params) => {
  return bibleService.buscarVersiculo(params);
});

ipcMain.handle("ai:extract-references", async (event, { text, projectId, options }) => {
  try {
    const references = await aiService.extractReferences(text, options);

    // Guarda cada referencia detectada en la BD con confirmado=0
    // para que el usuario pueda revisarlas y confirmarlas después.
    if (projectId && references.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO detected_references
          (project_id, libro, capitulo, versiculo, versiculo_final, texto_original, modelo_usado)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMany = db.transaction(() => {
        for (const ref of references) {
          insertStmt.run(
            projectId,
            ref.libro,
            ref.capitulo,
            ref.versiculo,
            ref.versiculo_final || null,
            (text || '').slice(0, 120),
            options?.model || aiService.DEFAULT_MODEL
          );
        }
      });
      insertMany();
    }

    return { success: true, references };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * ai:confirm-reference — Confirma una referencia bíblica previamente detectada.
 *
 * Recibe { projectId, libro, capitulo, versiculo, versiculo_final }
 * y actualiza confirmado_por_usuario=1 en la fila correspondiente.
 *
 * Matchea por (project_id, libro, capitulo, versiculo) porque la UI
 * no tiene el id interno — estos 4 campos son únicos por extracción.
 */
ipcMain.handle("ai:confirm-reference", async (event, { projectId, libro, capitulo, versiculo, versiculo_final }) => {
  try {
    const refStr = `${libro} ${capitulo}:${versiculo}${versiculo_final ? '-' + versiculo_final : ''}`;

    const result = db.prepare(`
      UPDATE detected_references
      SET confirmado_por_usuario = 1,
          versiculo_final = COALESCE(?, versiculo_final)
      WHERE project_id = ?
        AND libro = ?
        AND capitulo = ?
        AND versiculo = ?
    `).run(versiculo_final || null, projectId, libro, capitulo, versiculo);

    if (result.changes === 0) {
      // No existía un registro previo — inserta directamente como confirmado
      db.prepare(`
        INSERT INTO detected_references
          (project_id, libro, capitulo, versiculo, versiculo_final, confirmado_por_usuario, modelo_usado)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `).run(projectId, libro, capitulo, versiculo, versiculo_final || null, aiService.DEFAULT_MODEL);
    }

    // Crear recurso en la tabla resources como pasaje_biblico
    const resourceResult = db.prepare(`
      INSERT INTO resources (type, title, reference, created_at, updated_at)
      VALUES ('pasaje_biblico', ?, ?, datetime('now'), datetime('now'))
    `).run(refStr, refStr);

    const resourceId = Number(resourceResult.lastInsertRowid);

    // Vincular al proyecto
    db.prepare(`
      INSERT OR IGNORE INTO project_resources (project_id, resource_id)
      VALUES (?, ?)
    `).run(projectId, resourceId);

    return { success: true, resourceId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("ai:classify-resource", async (event, { description, options }) => {
  try {
    const category = await aiService.classifyResource(description, options);
    return { success: true, category };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("app:save-last-project", async (event, projectId) => {
  const state = windowState.loadState();
  windowState.saveState({ ...state, lastProjectId: projectId });
});

ipcMain.handle("app:get-last-project", async () => {
  const state = windowState.loadState();
  return state.lastProjectId;
});

app.whenReady().then(() => {
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
