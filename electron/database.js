const Database = require("better-sqlite3");
const path = require("path");
const { app } = require("electron");

const dbPath = path.join(app.getPath("userData"), "lemwriter.db");
const db = new Database(dbPath);

function columnExists(tableName, columnName) {
  const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return cols.some((c) => c.name === columnName);
}

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      base_type TEXT NOT NULL,
      is_system INTEGER DEFAULT 0,
      structure JSON,
      design JSON,
      rules JSON,
      export_config JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      modified_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT,
      description TEXT,
      model_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (model_id) REFERENCES custom_models(id)
    );

    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      number INTEGER,
      content TEXT,
      status TEXT,
      summary TEXT,
      word_count INTEGER,
      tags TEXT,
      template_type TEXT,
      bible_reference TEXT,
      order_index INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      hebrew_greek_name TEXT,
      meaning TEXT,
      "references" TEXT,
      role TEXT,
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      section_id TEXT NOT NULL,
      type TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (section_id) REFERENCES sections (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS book_metadata (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id       TEXT NOT NULL UNIQUE,
      genre            TEXT,
      language         TEXT DEFAULT 'es',
      edition          TEXT,
      isbn             TEXT,
      publisher        TEXT,
      dedication       TEXT,
      cover_image_path TEXT,
      target_words     INTEGER,
      notes            TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS resources (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      type            TEXT NOT NULL,
      title           TEXT NOT NULL,
      content         TEXT,
      notes           TEXT,
      reference       TEXT,
      bible_version   TEXT,
      original_word   TEXT,
      transliteration TEXT,
      strongs_number  TEXT,
      meaning         TEXT,
      author          TEXT,
      source          TEXT,
      tags            TEXT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS project_resources (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
      used        INTEGER NOT NULL DEFAULT 0,
      used_in     TEXT,
      added_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, resource_id)
    );

    CREATE INDEX IF NOT EXISTS idx_resources_type  ON resources(type);
    CREATE INDEX IF NOT EXISTS idx_resources_title ON resources(title);
    CREATE INDEX IF NOT EXISTS idx_pr_project      ON project_resources(project_id);
    CREATE INDEX IF NOT EXISTS idx_pr_resource     ON project_resources(resource_id);

    -- detected_references: almacena referencias bíblicas detectadas por IA local
    -- (Ollama / Granite4:3B) para no re-procesar el mismo texto dos veces.
    CREATE TABLE IF NOT EXISTS detected_references (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id        TEXT NOT NULL,
      libro             TEXT NOT NULL,
      capitulo          INTEGER NOT NULL,
      versiculo         INTEGER NOT NULL,
      versiculo_final   INTEGER,
      posicion_en_texto INTEGER,
      texto_original    TEXT,
      modelo_usado      TEXT DEFAULT 'ibm/granite4:3b',
      confirmado_por_usuario INTEGER DEFAULT 0,
      created_at        TEXT DEFAULT (datetime('now')),

      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_detected_references_project
      ON detected_references(project_id);

    CREATE INDEX IF NOT EXISTS idx_detected_references_libro_capitulo
      ON detected_references(libro, capitulo);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS uploaded_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      file_path TEXT,
      file_type TEXT NOT NULL,
      content TEXT,
      html TEXT,
      word_count INTEGER DEFAULT 0,
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'light');
  `);

  if (!columnExists("projects", "subtitle")) {
    db.exec(`ALTER TABLE projects ADD COLUMN subtitle TEXT`);
  }

  if (!columnExists("projects", "style")) {
    db.exec(
      `ALTER TABLE projects ADD COLUMN style TEXT NOT NULL DEFAULT 'manuscrito_clasico'`,
    );
  }

  if (!columnExists("projects", "formato")) {
    db.exec(`ALTER TABLE projects ADD COLUMN formato TEXT`);
  }

  if (!columnExists("projects", "theme")) {
    db.exec(`ALTER TABLE projects ADD COLUMN theme TEXT`);
  }

  if (!columnExists("sections", "parent_id")) {
    db.exec(
      `ALTER TABLE sections ADD COLUMN parent_id TEXT REFERENCES sections(id) ON DELETE CASCADE`,
    );
  }

  if (!columnExists("sections", "type")) {
    db.exec(`ALTER TABLE sections ADD COLUMN type TEXT`);
  }

  if (!columnExists("sections", "position")) {
    db.exec(
      `ALTER TABLE sections ADD COLUMN position INTEGER NOT NULL DEFAULT 0`,
    );
  }

  if (!columnExists("sections", "is_visible")) {
    db.exec(
      `ALTER TABLE sections ADD COLUMN is_visible INTEGER NOT NULL DEFAULT 1`,
    );
  }

  // Remove CHECK constraint from resources table to allow flexible types
  const resourcesSchema = db.prepare(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='resources'`
  ).get();
  if (resourcesSchema && resourcesSchema.sql.includes('CHECK(type IN (')) {
    db.exec(`
      CREATE TABLE resources_new (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        type            TEXT NOT NULL,
        title           TEXT NOT NULL,
        content         TEXT,
        notes           TEXT,
        reference       TEXT,
        bible_version   TEXT,
        original_word   TEXT,
        transliteration TEXT,
        strongs_number  TEXT,
        meaning         TEXT,
        author          TEXT,
        source          TEXT,
        tags            TEXT,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO resources_new SELECT * FROM resources;
      DROP TABLE resources;
      ALTER TABLE resources_new RENAME TO resources;
    `);
  }
}

initDatabase();

module.exports = db;
