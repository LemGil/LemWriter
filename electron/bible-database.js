const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

// Ruta destino en userData
const dbPath = path.join(app.getPath("userData"), "bible-rv1909.db");

// Si no existe, copiar desde el directorio de la app (desarrollo: raíz del proyecto)
if (!fs.existsSync(dbPath)) {
  const sourcePath = path.join(__dirname, "..", "bible-rv1909.db");
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, dbPath);
    console.log(`[bible-database] Copiada BD a ${dbPath}`);
  } else {
    console.error(`[bible-database] No se encuentra bible-rv1909.db en ${sourcePath}`);
  }
}

// BD de solo lectura
const db = new Database(dbPath, { readonly: true });

function getBookId(libro) {
  const row = db.prepare("SELECT id FROM books WHERE modern_name = ? COLLATE NOCASE").get(libro);
  return row ? row.id : null;
}

function buscarVersiculo({ libro, capitulo, versiculo, versiculoFinal }) {
  const bookId = getBookId(libro);
  if (!bookId) return null;

  const vFinal = versiculoFinal || versiculo;
  
  const verses = db.prepare(`
    SELECT text FROM verses 
    WHERE book_id = ? AND chapter = ? AND verse BETWEEN ? AND ?
    ORDER BY verse
  `).all(bookId, capitulo, versiculo, vFinal);

  return verses.length > 0 ? verses.map(v => v.text).join(" ") : null;
}

module.exports = { buscarVersiculo };
