const Database = require("better-sqlite3");

const dbPath = process.argv[2] || "/home/lemgil/.config/lemwriter/lemwriter.db";
const db = new Database(dbPath);

function columnExists(tableName, columnName) {
  const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return cols.some((c) => c.name === columnName);
}

function migrate() {
  console.log("=== Fase 1: Migración Estudios → Proyectos ===");

  // 1.6 — Asegurar columna old_study_id en projects
  if (!columnExists("projects", "old_study_id")) {
    db.exec("ALTER TABLE projects ADD COLUMN old_study_id TEXT");
    console.log("✅ Columna old_study_id agregada a projects");
  }

  // Verificar si ya hay proyectos migrados (para ser idempotente)
  const alreadyMigrated = db.prepare("SELECT COUNT(*) AS c FROM projects WHERE old_study_id IS NOT NULL").get();
  if (alreadyMigrated.c > 0) {
    console.log(`⚠️  ${alreadyMigrated.c} proyectos ya migrados (old_study_id != NULL). Omitiendo.`);
    return;
  }

  const studies = db.prepare("SELECT * FROM studies ORDER BY created_at").all();
  console.log(`📊 ${studies.length} estudios por migrar`);

  if (studies.length === 0) {
    console.log("No hay estudios que migrar. Hecho.");
    return;
  }

  const insertProject = db.prepare(`
    INSERT INTO projects (id, type, title, style, old_study_id, description, created_at, updated_at)
    VALUES (?, 'estudio', ?, 'estudio_predeterminado', ?, ?, ?, ?)
  `);

  const insertSection = db.prepare(`
    INSERT INTO sections (id, project_id, type, title, content, order_index, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertProjectResource = db.prepare(`
    INSERT OR IGNORE INTO project_resources (project_id, resource_id, used, used_in, added_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const existingProjectIds = new Set(
    db.prepare("SELECT id FROM projects").all().map(r => r.id)
  );
  const existingSectionIds = new Set(
    db.prepare("SELECT id FROM sections").all().map(r => r.id)
  );

  let projectsCreated = 0;
  let sectionsMigrated = 0;
  let resourcesMigrated = 0;

  const transaction = db.transaction(() => {
    for (const study of studies) {
      // 1.2 — Crear proyecto
      if (existingProjectIds.has(study.id)) {
        console.log(`  ⏭️  Proyecto ${study.id} ya existe, saltando`);
        continue;
      }

      const description = [study.base_text || "", study.notes || ""]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 200);

      insertProject.run(
        study.id,
        study.theme,
        study.id,
        description || null,
        study.created_at,
        study.updated_at
      );
      projectsCreated++;

      // 1.3 — Migrar study_sections a sections
      const sections = db.prepare(
        "SELECT * FROM study_sections WHERE study_id = ? ORDER BY order_index"
      ).all(study.id);

      for (const sec of sections) {
        if (existingSectionIds.has(sec.id)) {
          console.log(`    ⏭️  Section ${sec.id} ya existe, saltando`);
          continue;
        }
        insertSection.run(
          sec.id,
          study.id,
          sec.type,
          sec.title,
          sec.content || "",
          sec.order_index,
          sec.created_at,
          sec.updated_at
        );
        sectionsMigrated++;
      }

      // 1.4 — Migrar study_resources a project_resources
      const studyResources = db.prepare(
        "SELECT * FROM study_resources WHERE study_id = ?"
      ).all(study.id);

      for (const sr of studyResources) {
        insertProjectResource.run(
          study.id,
          sr.resource_id,
          sr.used,
          sr.used_in,
          sr.added_at
        );
        resourcesMigrated++;
      }

      console.log(`  ✅ ${study.theme} → proyecto 'estudio' creado (${sections.length} secciones)`);
    }
  });

  transaction();

  console.log(`\n=== Resumen ===`);
  console.log(`Proyectos creados: ${projectsCreated}`);
  console.log(`Secciones migradas: ${sectionsMigrated}`);
  console.log(`Recursos migrados: ${resourcesMigrated}`);
  console.log(`================`);
}

try {
  migrate();
} catch (err) {
  console.error("❌ Error en migración:", err);
  process.exit(1);
} finally {
  db.close();
}
