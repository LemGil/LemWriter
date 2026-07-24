// LemWriter/src/services/projectService.js
import { v4 as uuidv4 } from "uuid";
import { STYLES_BY_TYPE } from "../config/projectStyles.js";
import { getTemplates } from "../templates/definitions.js";

const getDb = () => {
  if (window.api && window.api.db) return window.api.db;
  throw new Error("Database API not initialized");
};

async function seedLibroSections(projectId, db) {
  const secciones = [
    { type: 'portada',           title: 'Portada',              is_visible: 1, position: 0 },
    { type: 'tabla_contenidos',  title: 'Tabla de Contenidos',  is_visible: 1, position: 1 },
    { type: 'prologo',           title: 'Prólogo',              is_visible: 0, position: 2 },
    { type: 'introduccion',      title: 'Introducción',         is_visible: 1, position: 3 },
    { type: 'capitulo',          title: 'Capítulo 1',           is_visible: 1, position: 4 },
    { type: 'conclusion',        title: 'Conclusión',           is_visible: 1, position: 5 },
    { type: 'apendice',          title: 'Apéndice',             is_visible: 0, position: 6 },
    { type: 'bibliografia',      title: 'Bibliografía',         is_visible: 0, position: 7 },
  ];

  const now = new Date().toISOString();
  for (const s of secciones) {
    await db.execute(
      `INSERT INTO sections (id, project_id, type, title, content, is_visible, order_index, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), projectId, s.type, s.title, '', s.is_visible, s.position, now, now]
    );
  }
}

async function createSectionsFromTemplate(projectId, type, formato, db) {
  const templatesForType = getTemplates(type);
  let templateKey;
  if (type === 'video') {
    templateKey = formato === 'corto' ? 'video-corto' : 'video-largo';
  } else {
    templateKey = Object.keys(templatesForType)[0];
  }

  const template = templatesForType[templateKey];
  const now = new Date().toISOString();

  for (const [index, sec] of template.structure.entries()) {
    const content = template.defaultContent?.[sec.type] || '';
    await db.execute(
      `INSERT INTO sections (id, project_id, type, title, content, is_visible, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), projectId, sec.type, sec.title, content, 1, index, now, now]
    );
  }
}

export const projectService = {
  async createNewProject(type, title, modelId = null, style = null, formato = null) {
    const db = getDb();
    const id = `project-${Date.now()}`;
    const createdAt = new Date().toISOString();

    if (type === 'book') type = 'libro';
    if (type === 'teaching') type = 'ensenanza';
    if (type === 'devotional') type = 'devocional';
    if (type === 'preaching') type = 'sermon';
    if (type === 'study') type = 'estudio';

    if (!style) {
      style = STYLES_BY_TYPE[type] || 'manuscrito_clasico';
    }

    await db.execute(
      `INSERT INTO projects (id, type, title, style, created_at, updated_at, formato) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, type, title, style, createdAt, createdAt, formato],
    );

    if (type === 'libro') {
      await seedLibroSections(id, db);
    } else {
      await createSectionsFromTemplate(id, type, formato, db);
    }

    return { id, type, title, style };
  },

  async getRecentProjects() {
    const db = getDb();
    return await db.query(
      `SELECT * FROM projects ORDER BY updated_at DESC LIMIT 10`,
    );
  },

  async getAllProjects() {
    const db = getDb();
    return await db.query(`SELECT * FROM projects ORDER BY updated_at DESC`);
  },

  async getProjectCountsByType() {
    const db = getDb();
    return await db.query(
      `SELECT type, COUNT(*) as count FROM projects GROUP BY type`
    );
  },

  async getProjectStats() {
    const db = getDb();

    const projectRows = await db.query(`SELECT COUNT(*) as count FROM projects`);
    const sectionRows = await db.query(`SELECT content, updated_at FROM sections`);

    let totalWords = 0;
    let wordsToday = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const s of sectionRows) {
      const text = (s.content || '').replace(/<[^>]*>/g, '');
      if (text.trim() === '') continue;
      const wc = text.trim().split(/\s+/).length;
      totalWords += wc;

      if (s.updated_at) {
        const d = new Date(s.updated_at);
        d.setHours(0, 0, 0, 0);
        if (d.getTime() === today.getTime()) {
          wordsToday += wc;
        }
      }
    }

    return {
      totalProjects: projectRows[0]?.count || 0,
      totalSections: sectionRows.length,
      totalWords,
      wordsToday,
    };
  },

  async getResourceCount() {
    const db = getDb();
    const rows = await db.query(`SELECT COUNT(*) as count FROM resources`);
    return rows[0]?.count || 0;
  },

  async getSection(id) {
    const db = getDb();
    const sections = await db.query(`SELECT * FROM sections WHERE id = ?`, [id]);
    return sections[0] || null;
  },

  async getRecentActivity(limit = 5) {
    const db = getDb();
    return await db.query(
      `SELECT s.id, s.title, s.content, s.updated_at, s.project_id,
              p.title AS project_title, p.type AS project_type
       FROM sections s
       JOIN projects p ON p.id = s.project_id
       WHERE s.content IS NOT NULL AND s.content != ''
       ORDER BY s.updated_at DESC
       LIMIT ?`,
      [limit]
    );
  },

  async getProject(id) {
    const db = getDb();
    const projects = await db.query(`SELECT * FROM projects WHERE id = ?`, [
      id,
    ]);
    if (projects.length === 0) return null;
    const sections = await db.query(
      `SELECT * FROM sections WHERE project_id = ? ORDER BY order_index ASC`,
      [id],
    );
    return { ...projects[0], sections };
  },

  async migrateFromLocalStorage() {
    const projects = JSON.parse(localStorage.getItem('lemwriter_projects') || '[]');
    if (projects.length === 0) return;

    const db = getDb();
    for (const p of projects) {
      const newProject = await this.createNewProject(p.type, p.title, p.template, p.style);
      if (p.sections && p.sections.length > 0) {
        for (const s of p.sections) {
          await db.execute(
            `INSERT INTO sections (id, project_id, type, title, content, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), newProject.id, p.type, s.title, s.content || '', s.order_index, new Date().toISOString(), new Date().toISOString()]
          );
        }
      }
    }
    localStorage.removeItem('lemwriter_projects');
  },

  async saveProject(project) {
    const db = getDb();
    await db.execute(
      `UPDATE projects SET title = ?, updated_at = ? WHERE id = ?`,
      [project.title, new Date().toISOString(), project.id],
    );
    if (project.sections && project.sections.length > 0) {
      await this.saveSections(
        project.sections.map((s, idx) => ({
          ...s,
          project_id: project.id,
          order_index: idx,
        })),
      );
    }
  },

  async deleteProject(id) {
    const db = getDb();
    await db.execute(`DELETE FROM projects WHERE id = ?`, [id]);
  },

  async updateProject(id, data) {
    const db = getDb();
    const fields = [];
    const values = [];

    if (data.title !== undefined) {
      fields.push("title = ?");
      values.push(data.title);
    }
    if (data.style !== undefined) {
      fields.push("style = ?");
      values.push(data.style);
    }

    fields.push("updated_at = ?");
    values.push(new Date().toISOString());

    values.push(id);

    if (fields.length > 1) {
      await db.execute(
        `UPDATE projects SET ${fields.join(", ")} WHERE id = ?`,
        values,
      );
    }
  },

  async getCharacters(projectId) {
    const db = getDb();
    return await db.query(`SELECT * FROM characters WHERE project_id = ?`, [projectId]);
  },

  async addCharacter(projectId, characterData) {
    const db = getDb();
    const id = uuidv4();
    await db.execute(
      `INSERT INTO characters (id, project_id, name, hebrew_greek_name, meaning, "references", role, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        projectId,
        characterData.name,
        characterData.hebrew_greek_name || null,
        characterData.meaning || null,
        characterData.references || null,
        characterData.role || null,
        characterData.notes || null,
      ],
    );
    return { id, ...characterData };
  },

  async deleteCharacter(characterId) {
    const db = getDb();
    await db.execute(`DELETE FROM characters WHERE id = ?`, [characterId]);
  },

  async getNotes(sectionId) {
    const db = getDb();
    return await db.query(`SELECT * FROM notes WHERE section_id = ?`, [sectionId]);
  },

  async addNote(sectionId, noteData) {
    const db = getDb();
    const id = uuidv4();
    await db.execute(
      `INSERT INTO notes (id, section_id, type, content) VALUES (?, ?, ?, ?)`,
      [id, sectionId, noteData.type || "general", noteData.content],
    );
    return { id, ...noteData };
  },

  async deleteNote(noteId) {
    const db = getDb();
    await db.execute(`DELETE FROM notes WHERE id = ?`, [noteId]);
  },

  async updateSection(sectionId, data) {
    const db = getDb();
    const fields = [];
    const values = [];

    if (data.title !== undefined) {
      fields.push("title = ?");
      values.push(data.title);
    }
    if (data.content !== undefined) {
      fields.push("content = ?");
      values.push(data.content);
    }
    if (data.bible_reference !== undefined) {
      fields.push("bible_reference = ?");
      values.push(data.bible_reference);
    }
    if (data.word_count !== undefined) {
      fields.push("word_count = ?");
      values.push(data.word_count);
    }
    if (data.status !== undefined) {
      fields.push("status = ?");
      values.push(data.status);
    }

    fields.push("updated_at = ?");
    values.push(new Date().toISOString());

    values.push(sectionId);

    await db.execute(
      `UPDATE sections SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );
  },

  async saveSections(sections) {
    const db = getDb();
    for (const section of sections) {
      if (section.id && section.id.startsWith("sec-")) {
        const newId = uuidv4();
        await db.execute(
          `INSERT INTO sections (id, project_id, type, title, content, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newId,
            section.project_id,
            section.type || null,
            section.title,
            section.content || "",
            section.order_index,
            new Date().toISOString(),
            new Date().toISOString(),
          ],
        );
      } else if (section.id) {
        await db.execute(
          `UPDATE sections SET title = ?, content = ?, order_index = ?, bible_reference = ?, updated_at = ? WHERE id = ?`,
          [
            section.title,
            section.content || "",
            section.order_index,
            section.bible_reference || null,
            new Date().toISOString(),
            section.id,
          ],
        );
      }
    }
  },

  // Recursos globales
  async createResource(data) {
    const db = getDb();
    const now = new Date().toISOString();
    const result = await db.execute(
      `INSERT INTO resources 
       (type, title, content, notes, reference, bible_version, 
        original_word, transliteration, strongs_number, meaning, 
        author, source, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.type, data.title, data.content || null, 
       data.notes || null, data.reference || null, 
       data.bible_version || null, data.original_word || null,
       data.transliteration || null, data.strongs_number || null,
       data.meaning || null, data.author || null, 
       data.source || null, data.tags || null, now, now]
    );
    return result.lastInsertId;
  },

  async searchResources(query = '', type = '') {
    const db = getDb();
    let sql = `SELECT * FROM resources WHERE 1=1`;
    const params = [];
    if (type) {
      sql += ` AND type = ?`;
      params.push(type);
    }
    if (query) {
      sql += ` AND (title LIKE ? OR meaning LIKE ? OR content LIKE ? OR tags LIKE ?)`;
      params.push(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
    }
    sql += ` ORDER BY title ASC`;
    return await db.query(sql, params);
  },

  async globalSearch(query = '') {
    if (!query.trim()) return { projects: [], sections: [], resources: [] };
    const db = getDb();
    const like = `%${query}%`;

    const projects = await db.query(
      `SELECT id, type, title, created_at FROM projects
       WHERE title LIKE ? ORDER BY title ASC LIMIT 20`,
      [like]
    );

    const sections = await db.query(
      `SELECT s.id, s.project_id, s.title, s.content, p.title AS project_title, p.type AS project_type
       FROM sections s JOIN projects p ON s.project_id = p.id
       WHERE s.title LIKE ? OR s.content LIKE ?
       ORDER BY s.title ASC LIMIT 20`,
      [like, like]
    );

    const resources = await db.query(
      `SELECT r.*, pr.project_id FROM resources r
       LEFT JOIN project_resources pr ON r.id = pr.resource_id
       WHERE r.title LIKE ? OR r.content LIKE ? OR r.meaning LIKE ? OR r.tags LIKE ?
       ORDER BY r.title ASC LIMIT 20`,
      [like, like, like, like]
    );

    return { projects, sections, resources };
  },

  // Recursos por proyecto
  async addResourceToProject(projectId, resourceId) {
    const db = getDb();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT OR IGNORE INTO project_resources 
       (project_id, resource_id, used, added_at)
       VALUES (?, ?, 0, ?)`,
      [projectId, resourceId, now]
    );
  },

  async getProjectResources(projectId) {
    const db = getDb();
    return await db.query(
      `SELECT r.*, 
       COALESCE(pr.used, 0) AS used, 
       pr.used_in, 
       pr.added_at
       FROM resources r
       LEFT JOIN project_resources pr ON r.id = pr.resource_id AND pr.project_id = ?
       ORDER BY r.title ASC`,
      [projectId],
    );
  },


  async markResourceUsed(projectId, resourceId, sectionId) {
    const db = getDb();
    await db.execute(
      `UPDATE project_resources 
       SET used = 1, used_in = ?
       WHERE project_id = ? AND resource_id = ?`,
      [sectionId, projectId, resourceId]
    );
  },

  async updateResource(resourceId, data) {
    const db = getDb();
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(resourceId);

    await db.execute(
      `UPDATE resources SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
  },

  async deleteResource(resourceId) {
    const db = getDb();
    await db.execute(`DELETE FROM resources WHERE id = ?`, [resourceId]);
  },

  async getSetting(key) {
    const db = getDb();
    const rows = await db.query(`SELECT value FROM settings WHERE key = ?`, [key]);
    return rows[0]?.value || null;
  },

  async setSetting(key, value) {
    const db = getDb();
    await db.execute(
      `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
      [key, value, new Date().toISOString()]
    );
  },

  async getProjectTheme(projectId) {
    const db = getDb();
    const rows = await db.query(`SELECT theme FROM projects WHERE id = ?`, [projectId]);
    return rows[0]?.theme || null;
  },

  async setProjectTheme(projectId, theme) {
    const db = getDb();
    await db.execute(`UPDATE projects SET theme = ?, updated_at = ? WHERE id = ?`,
      [theme, new Date().toISOString(), projectId]
    );
  },

  // Tema personalizado — colores guardados como JSON en settings
  async getCustomTheme() {
    const raw = await this.getSetting('custom_theme');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  async saveCustomTheme(colors) {
    await this.setSetting('custom_theme', JSON.stringify(colors));
  },
};
