import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { projectService } from '../services/projectService.js';

// ---------------------------------------------------------------------------
// Real SQLite :memory: adapter
// ---------------------------------------------------------------------------
function createTestDb() {
  const db = new Database(':memory:');

  // Enable WAL for concurrent reads during tests
  db.pragma('journal_mode = WAL');

  // Schema — same as electron/database.js initDatabase()
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
      style TEXT DEFAULT 'manuscrito_clasico',
      theme TEXT,
      formato TEXT,
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
      is_visible INTEGER DEFAULT 1,
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

  // Migrations — same as electron/database.js initDatabase()
  // These add columns that the CREATE TABLE might not have included initially
  const cols = db.prepare("PRAGMA table_info(sections)").all().map(c => c.name);
  if (!cols.includes('type')) db.exec("ALTER TABLE sections ADD COLUMN type TEXT");
  if (!cols.includes('position')) db.exec("ALTER TABLE sections ADD COLUMN position INTEGER NOT NULL DEFAULT 0");
  if (!cols.includes('is_visible')) db.exec("ALTER TABLE sections ADD COLUMN is_visible INTEGER NOT NULL DEFAULT 1");
  if (!cols.includes('parent_id')) db.exec("ALTER TABLE sections ADD COLUMN parent_id TEXT REFERENCES sections(id) ON DELETE CASCADE");

  const pCols = db.prepare("PRAGMA table_info(projects)").all().map(c => c.name);
  if (!pCols.includes('style')) db.exec("ALTER TABLE projects ADD COLUMN style TEXT NOT NULL DEFAULT 'manuscrito_clasico'");
  if (!pCols.includes('formato')) db.exec("ALTER TABLE projects ADD COLUMN formato TEXT");
  if (!pCols.includes('theme')) db.exec("ALTER TABLE projects ADD COLUMN theme TEXT");

  // Wrapper matching window.api.db interface
  return {
    /** Run a SELECT query, return array of rows */
    query(sql, params = []) {
      // The SQL from projectService uses ? placeholders
      return db.prepare(sql).all(...params);
    },

    /** Run INSERT/UPDATE/DELETE, return { changes, lastInsertRowid } */
    execute(sql, params = []) {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      // Return both lastInsertRowid and lastInsertId for compatibility
      return { changes: result.changes, lastInsertRowid: result.lastInsertRowid, lastInsertId: Number(result.lastInsertRowid) };
    },

    /** Close db (call in afterAll) */
    close() {
      db.close();
    },

    /** Direct access for test assertions */
    _prepare(sql) {
      return db.prepare(sql);
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('projectService', () => {
  let mockDb;
  let db; // raw better-sqlite3 for assertions

  beforeEach(() => {
    vi.resetModules();
    const testDb = createTestDb();
    mockDb = testDb;

    // Set window.api.db to the test database wrapper
    globalThis.window = globalThis.window || {};
    globalThis.window.api = globalThis.window.api || {};
    globalThis.window.api.db = mockDb;

    // Deterministic timestamps
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.window?.api?.db;
    mockDb.close();
  });

  // -----------------------------------------------------------------------
  // createNewProject
  // -----------------------------------------------------------------------
  describe('createNewProject', () => {
    it('should create a project with correct type normalization', async () => {
      const result = await projectService.createNewProject('book', 'Mi Libro');

      expect(result.type).toBe('libro');
      expect(result.title).toBe('Mi Libro');

      const project = mockDb._prepare('SELECT * FROM projects WHERE id = ?').get(result.id);
      expect(project.type).toBe('libro');

      const sections = mockDb._prepare('SELECT * FROM sections WHERE project_id = ? ORDER BY order_index').all(result.id);
      expect(sections.length).toBe(8);
      expect(sections[0].type).toBe('portada');
    });

    it('should normalize teaching type', async () => {
      const result = await projectService.createNewProject('teaching', 'Enseñanza');
      expect(result.type).toBe('ensenanza');
    });

    it('should create devotional project', async () => {
      const result = await projectService.createNewProject('devocional', 'Devocional');
      expect(result.type).toBe('devocional');
    });

    it('should create study project', async () => {
      const result = await projectService.createNewProject('study', 'Estudio');
      expect(result.type).toBe('estudio');
    });

    it('should assign default style based on type', async () => {
      const result = await projectService.createNewProject('book', 'Test');
      expect(result.style).toBe('manuscrito_clasico');
    });

    it('should use provided style when specified', async () => {
      const result = await projectService.createNewProject('book', 'Test', null, 'moderno');
      expect(result.style).toBe('moderno');
    });
  });

  // -----------------------------------------------------------------------
  // getProject
  // -----------------------------------------------------------------------
  describe('getProject', () => {
    it('should return null for non-existent project', async () => {
      expect(await projectService.getProject('nonexistent')).toBeNull();
    });

    it('should return project with sections', async () => {
      const created = await projectService.createNewProject('book', 'Test');
      const result = await projectService.getProject(created.id);

      expect(result).not.toBeNull();
      expect(result.id).toBe(created.id);
      expect(result.title).toBe('Test');
      expect(Array.isArray(result.sections)).toBe(true);
      expect(result.sections.length).toBe(8);
    });
  });

  // -----------------------------------------------------------------------
  // getRecentProjects / getAllProjects
  // -----------------------------------------------------------------------
  describe('list projects', () => {
    it('should return empty when no projects exist', async () => {
      expect(await projectService.getRecentProjects()).toEqual([]);
      expect(await projectService.getAllProjects()).toEqual([]);
    });

    it('should order by updated_at DESC', async () => {
      await projectService.createNewProject('book', 'Old');
      vi.setSystemTime(new Date('2025-06-15T11:00:00Z'));
      await projectService.createNewProject('devocional', 'Recent');

      const all = await projectService.getAllProjects();
      expect(all.length).toBe(2);
      expect(all[0].title).toBe('Recent');
      expect(all[1].title).toBe('Old');
    });
  });

  // -----------------------------------------------------------------------
  // getProjectCountsByType
  // -----------------------------------------------------------------------
  describe('getProjectCountsByType', () => {
    it('should count projects by type', async () => {
      await projectService.createNewProject('book', 'B1');
      vi.advanceTimersByTime(1);
      await projectService.createNewProject('book', 'B2');
      vi.advanceTimersByTime(1);
      await projectService.createNewProject('devocional', 'D1');

      const counts = await projectService.getProjectCountsByType();
      // The real query groups by type — we just verify it returns rows
      expect(Array.isArray(counts)).toBe(true);
      expect(counts.length).toBe(2);
    });
  });

  // -----------------------------------------------------------------------
  // getProjectStats
  // -----------------------------------------------------------------------
  describe('getProjectStats', () => {
    it('should return zeros when nothing exists', async () => {
      const stats = await projectService.getProjectStats();
      expect(stats.totalProjects).toBe(0);
      expect(stats.totalSections).toBe(0);
      expect(stats.totalWords).toBe(0);
      expect(stats.wordsToday).toBe(0);
    });

    it('should count words from section content', async () => {
      await projectService.createNewProject('book', 'Test');

      // Update a section's content directly in SQLite
      mockDb._prepare(
        "UPDATE sections SET content = '<p>Palabra1 Palabra2 Palabra3</p>', updated_at = ? WHERE type = 'portada'"
      ).run(new Date().toISOString());

      const stats = await projectService.getProjectStats();
      expect(stats.totalProjects).toBe(1);
      expect(stats.totalSections).toBe(8);
      expect(stats.totalWords).toBe(3);
    });
  });

  // -----------------------------------------------------------------------
  // saveProject
  // -----------------------------------------------------------------------
  describe('saveProject', () => {
    it('should update title and timestamp', async () => {
      const p = await projectService.createNewProject('book', 'Original');
      await projectService.saveProject({ id: p.id, title: 'Actualizado', sections: [] });

      const row = mockDb._prepare('SELECT title FROM projects WHERE id = ?').get(p.id);
      expect(row.title).toBe('Actualizado');
    });
  });

  // -----------------------------------------------------------------------
  // updateProject
  // -----------------------------------------------------------------------
  describe('updateProject', () => {
    it('should update title without affecting type', async () => {
      const p = await projectService.createNewProject('devocional', 'Original');
      await projectService.updateProject(p.id, { title: 'Nuevo Título' });

      const row = mockDb._prepare('SELECT title, type FROM projects WHERE id = ?').get(p.id);
      expect(row.title).toBe('Nuevo Título');
      expect(row.type).toBe('devocional');
    });

    it('should update style when provided', async () => {
      const p = await projectService.createNewProject('book', 'Test');
      await projectService.updateProject(p.id, { style: 'moderno' });

      const row = mockDb._prepare('SELECT style FROM projects WHERE id = ?').get(p.id);
      expect(row.style).toBe('moderno');
    });
  });

  // -----------------------------------------------------------------------
  // deleteProject
  // -----------------------------------------------------------------------
  describe('deleteProject', () => {
    it('should delete project', async () => {
      const p = await projectService.createNewProject('book', 'To Delete');
      await projectService.deleteProject(p.id);
      expect(await projectService.getProject(p.id)).toBeNull();
    });

    it('should cascade delete sections', async () => {
      const p = await projectService.createNewProject('book', 'Test');
      const sectionsBefore = mockDb._prepare('SELECT COUNT(*) as c FROM sections WHERE project_id = ?').get(p.id);
      expect(sectionsBefore.c).toBe(8);

      await projectService.deleteProject(p.id);

      const sectionsAfter = mockDb._prepare('SELECT COUNT(*) as c FROM sections').get();
      expect(sectionsAfter.c).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // getProjectResources (Bug B regression)
  // -----------------------------------------------------------------------
  describe('getProjectResources', () => {
    it('should return only resources linked to the project', async () => {
      const p1 = await projectService.createNewProject('libro', 'A');
      vi.advanceTimersByTime(1);
      const p2 = await projectService.createNewProject('libro', 'B');

      // Create resources and link to specific projects
      mockDb._prepare(
        "INSERT INTO resources (id, type, title, content) VALUES (?, ?, ?, ?)"
      ).run(1, 'nota_teologica', 'Apocalipsis 1', 'Nota A');
      mockDb._prepare(
        "INSERT INTO project_resources (project_id, resource_id, used, added_at) VALUES (?, ?, 0, ?)"
      ).run(p1.id, 1, new Date().toISOString());

      mockDb._prepare(
        "INSERT INTO resources (id, type, title, content) VALUES (?, ?, ?, ?)"
      ).run(2, 'nota_teologica', 'Génesis 1', 'Nota B');
      mockDb._prepare(
        "INSERT INTO project_resources (project_id, resource_id, used, added_at) VALUES (?, ?, 0, ?)"
      ).run(p2.id, 2, new Date().toISOString());

      const p1Resources = await projectService.getProjectResources(p1.id);
      expect(p1Resources.length).toBe(1);
      expect(p1Resources[0].title).toBe('Apocalipsis 1');

      const p2Resources = await projectService.getProjectResources(p2.id);
      expect(p2Resources.length).toBe(1);
      expect(p2Resources[0].title).toBe('Génesis 1');
    });

    it('should return empty when no resources', async () => {
      const p = await projectService.createNewProject('libro', 'Empty');
      expect(await projectService.getProjectResources(p.id)).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // findOrCreateResource
  // -----------------------------------------------------------------------
  describe('findOrCreateResource', () => {
    it('should return existing ID for duplicate pasaje_biblico', async () => {
      mockDb._prepare(
        "INSERT INTO resources (id, type, title, reference, content) VALUES (99, 'pasaje_biblico', ?, ?, ?)"
      ).run('Romanos 8:28', 'Romanos 8:28', 'Y sabemos que...');

      const result = await projectService.findOrCreateResource({
        type: 'pasaje_biblico',
        reference: 'Romanos 8:28',
        title: 'Romanos 8:28',
        content: 'Y sabemos que...'
      });

      expect(result).toBe(99);
    });

    it('should create when no duplicate exists', async () => {
      const result = await projectService.findOrCreateResource({
        type: 'nota_teologica',
        title: 'Nueva Nota',
        content: 'Contenido'
      });

      expect(result).toBeGreaterThan(0);
    });

    it('should create new pasaje_biblico when reference differs', async () => {
      mockDb._prepare(
        "INSERT INTO resources (id, type, title, reference, content) VALUES (50, 'pasaje_biblico', ?, ?, ?)"
      ).run('Mateo 5:1', 'Mateo 5:1', 'Viendo la multitud...');

      const result = await projectService.findOrCreateResource({
        type: 'pasaje_biblico',
        reference: 'Mateo 5:2',
        title: 'Mateo 5:2',
        content: 'Y abriendo su boca...'
      });

      expect(result).not.toBe(50);
      const count = mockDb._prepare("SELECT COUNT(*) as c FROM resources WHERE type='pasaje_biblico'").get();
      expect(count.c).toBe(2);
    });
  });

  // -----------------------------------------------------------------------
  // addResourceToProject
  // -----------------------------------------------------------------------
  describe('addResourceToProject', () => {
    it('should link resource to project', async () => {
      const p = await projectService.createNewProject('book', 'Test');
      mockDb._prepare("INSERT INTO resources (id, type, title) VALUES (1, 'nota_teologica', 'Nota Test')").run();

      await projectService.addResourceToProject(p.id, 1);

      const resources = await projectService.getProjectResources(p.id);
      expect(resources.length).toBe(1);
      expect(resources[0].title).toBe('Nota Test');
    });

    it('should not duplicate (UNIQUE constraint)', async () => {
      const p = await projectService.createNewProject('book', 'Test');
      mockDb._prepare("INSERT INTO resources (id, type, title) VALUES (1, 'nota_teologica', 'Nota')").run();

      await projectService.addResourceToProject(p.id, 1);
      await projectService.addResourceToProject(p.id, 1);

      const resources = await projectService.getProjectResources(p.id);
      expect(resources.length).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // globalSearch
  // -----------------------------------------------------------------------
  describe('globalSearch', () => {
    it('should return empty when query is empty', async () => {
      expect(await projectService.globalSearch('')).toEqual({ projects: [], sections: [], resources: [] });
    });

    it('should search across all entities', async () => {
      const p = await projectService.createNewProject('book', 'Apocalipsis Estudio');

      // Add content to a section
      mockDb._prepare(
        "UPDATE sections SET content = ? WHERE type = 'portada' AND project_id = ?"
      ).run('El Apocalipsis de Juan', p.id);

      // Add matching resource
      mockDb._prepare(
        "INSERT INTO resources (id, type, title, content, tags) VALUES (1, 'palabra_griega', 'Apocalipsis (Apokalypsis)', 'Revelación', 'apocalipsis,revelación')"
      ).run();

      const result = await projectService.globalSearch('apocalipsis');

      expect(result.projects.length).toBeGreaterThanOrEqual(1);
      expect(result.sections.length).toBeGreaterThanOrEqual(1);
      // Resource search may return 0 due to the LEFT JOIN resources r LEFT JOIN project_resources
      // Actually, let me check: resources are global, so it should find it
      expect(result.resources.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -----------------------------------------------------------------------
  // searchResources
  // -----------------------------------------------------------------------
  describe('searchResources', () => {
    it('should filter by type', async () => {
      mockDb._prepare("INSERT INTO resources (id, type, title) VALUES (1, 'palabra_hebrea', 'Elohim')").run();
      mockDb._prepare("INSERT INTO resources (id, type, title) VALUES (2, 'palabra_griega', 'Theos')").run();

      const result = await projectService.searchResources('', 'palabra_hebrea');
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('palabra_hebrea');
    });

    it('should search by title, meaning, content, and tags', async () => {
      mockDb._prepare("INSERT INTO resources (id, type, title, meaning, content) VALUES (1, 'personaje_biblico', 'Moisés', 'Salvado de las aguas', 'Profeta de Israel')").run();
      mockDb._prepare("INSERT INTO resources (id, type, title, meaning) VALUES (2, 'personaje_biblico', 'Abraham', 'Padre de multitud')").run();

      const result = await projectService.searchResources('moisés', '');
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('Moisés');
    });
  });

  // -----------------------------------------------------------------------
  // Characters
  // -----------------------------------------------------------------------
  describe('characters', () => {
    it('should add and retrieve characters', async () => {
      const p = await projectService.createNewProject('book', 'Test');
      const char = await projectService.addCharacter(p.id, {
        name: 'Moisés', role: 'Profeta', notes: 'Liberó a Israel',
      });

      expect(char.name).toBe('Moisés');

      const chars = await projectService.getCharacters(p.id);
      expect(chars.length).toBe(1);
      expect(chars[0].name).toBe('Moisés');
    });

    it('should delete a character', async () => {
      const p = await projectService.createNewProject('book', 'Test');
      const char = await projectService.addCharacter(p.id, { name: 'Temporal' });
      await projectService.deleteCharacter(char.id);

      expect(await projectService.getCharacters(p.id)).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // Notes
  // -----------------------------------------------------------------------
  describe('notes', () => {
    it('should add and retrieve notes', async () => {
      const p = await projectService.createNewProject('book', 'Test');
      const sections = mockDb._prepare("SELECT id FROM sections WHERE project_id = ? ORDER BY order_index LIMIT 1").get(p.id);
      const secId = sections.id;

      const note = await projectService.addNote(secId, { type: 'general', content: 'Nota de prueba' });
      expect(note.content).toBe('Nota de prueba');

      const notes = await projectService.getNotes(secId);
      expect(notes.length).toBe(1);
      expect(notes[0].content).toBe('Nota de prueba');
    });

    it('should delete a note', async () => {
      const p = await projectService.createNewProject('book', 'Test');
      const secId = mockDb._prepare("SELECT id FROM sections WHERE project_id = ? ORDER BY order_index LIMIT 1").get(p.id).id;
      const note = await projectService.addNote(secId, { content: 'To Delete' });

      await projectService.deleteNote(note.id);
      expect(await projectService.getNotes(secId)).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // Settings
  // -----------------------------------------------------------------------
  describe('settings', () => {
    it('should return null for unset settings', async () => {
      expect(await projectService.getSetting('nonexistent')).toBeNull();
    });

    it('should persist and retrieve settings', async () => {
      await projectService.setSetting('theme', 'dark');
      expect(await projectService.getSetting('theme')).toBe('dark');
    });
  });

  // -----------------------------------------------------------------------
  // Project theme
  // -----------------------------------------------------------------------
  describe('project theme', () => {
    it('should return null when no theme set', async () => {
      const p = await projectService.createNewProject('book', 'Test');
      expect(await projectService.getProjectTheme(p.id)).toBeNull();
    });

    it('should set and retrieve project theme', async () => {
      const p = await projectService.createNewProject('book', 'Test');
      await projectService.setProjectTheme(p.id, 'dark');
      expect(await projectService.getProjectTheme(p.id)).toBe('dark');
    });

    it('should not overwrite theme when updating different project', async () => {
      const p1 = await projectService.createNewProject('book', 'A');
      vi.advanceTimersByTime(1);
      const p2 = await projectService.createNewProject('book', 'B');

      await projectService.setProjectTheme(p1.id, 'dark');
      expect(await projectService.getProjectTheme(p2.id)).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Custom theme (JSON settings)
  // -----------------------------------------------------------------------
  describe('custom theme', () => {
    it('should return null when not set', async () => {
      expect(await projectService.getCustomTheme()).toBeNull();
    });

    it('should save and retrieve as JSON', async () => {
      const colors = { primary: '#C8A75D', secondary: '#1A3A4A' };
      await projectService.saveCustomTheme(colors);
      expect(await projectService.getCustomTheme()).toEqual(colors);
    });
  });

  // -----------------------------------------------------------------------
  // updateSection
  // -----------------------------------------------------------------------
  describe('updateSection', () => {
    it('should update content and bible_reference', async () => {
      const p = await projectService.createNewProject('book', 'Test');
      const secId = mockDb._prepare("SELECT id FROM sections WHERE project_id = ? ORDER BY order_index LIMIT 1").get(p.id).id;

      await projectService.updateSection(secId, {
        content: '<p>Nuevo contenido</p>',
        bible_reference: JSON.stringify([{ reference: 'Romanos 8:28' }]),
      });

      const row = mockDb._prepare('SELECT content, bible_reference FROM sections WHERE id = ?').get(secId);
      expect(row.content).toBe('<p>Nuevo contenido</p>');
      expect(row.bible_reference).toBe(JSON.stringify([{ reference: 'Romanos 8:28' }]));
    });
  });

  // -----------------------------------------------------------------------
  // getRecentActivity
  // -----------------------------------------------------------------------
  describe('getRecentActivity', () => {
    it('should return recent sections with project info', async () => {
      const p = await projectService.createNewProject('libro', 'Activo');

      // Need content to be non-empty for the WHERE condition
      mockDb._prepare(
        "UPDATE sections SET content = '<p>Contenido activo</p>', updated_at = ? WHERE type = 'portada' AND project_id = ?"
      ).run(new Date().toISOString(), p.id);

      // Need sections with empty content to be excluded by IS NOT NULL AND != ''
      mockDb._prepare(
        "UPDATE sections SET content = NULL WHERE type = 'tabla_contenidos' AND project_id = ?"
      ).run(p.id);

      const activity = await projectService.getRecentActivity(5);
      expect(activity.length).toBeGreaterThanOrEqual(1);
      expect(activity[0].project_title).toBe('Activo');
      expect(activity[0].project_type).toBe('libro');
    });
  });

  // -----------------------------------------------------------------------
  // markResourceUsed
  // -----------------------------------------------------------------------
  describe('markResourceUsed', () => {
    it('should mark resource as used with section reference', async () => {
      const p = await projectService.createNewProject('book', 'Test');
      mockDb._prepare("INSERT INTO resources (id, type, title) VALUES (1, 'nota_teologica', 'Nota')").run();
      mockDb._prepare("INSERT INTO project_resources (project_id, resource_id, used, added_at) VALUES (?, 1, 0, ?)").run(p.id, new Date().toISOString());

      await projectService.markResourceUsed(p.id, 1, 'sec-123');

      const row = mockDb._prepare("SELECT used, used_in FROM project_resources WHERE project_id = ? AND resource_id = ?").get(p.id, 1);
      expect(row.used).toBe(1);
      expect(row.used_in).toBe('sec-123');
    });
  });

  // -----------------------------------------------------------------------
  // updateResource / deleteResource
  // -----------------------------------------------------------------------
  describe('resource lifecycle', () => {
    it('should update and delete resources', async () => {
      mockDb._prepare("INSERT INTO resources (id, type, title, content) VALUES (1, 'nota_teologica', 'Original', 'text')").run();

      await projectService.updateResource(1, { title: 'Updated', content: 'new text' });
      let row = mockDb._prepare('SELECT title, content FROM resources WHERE id = 1').get();
      expect(row.title).toBe('Updated');
      expect(row.content).toBe('new text');

      await projectService.deleteResource(1);
      row = mockDb._prepare('SELECT COUNT(*) as c FROM resources WHERE id = 1').get();
      expect(row.c).toBe(0);
    });
  });
});
