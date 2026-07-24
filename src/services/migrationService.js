import { templates, getTemplates } from "../templates/definitions";
import { EditorialModel } from "../models/EditorialModel";
import { projectService } from "./projectService";

export const migrationService = {
  async migrateTemplates() {
    console.log("Starting template migration...");

    // 1. Clear existing models to avoid duplicates for this demo/dev environment
    // In production, we would check if they already exist.
    // For now, let's just insert them if they don't exist.

    const allTemplates = [];
    Object.entries(templates).forEach(([type, typeTemplates]) => {
      Object.entries(typeTemplates).forEach(([key, template]) => {
        allTemplates.push({ ...template, key, type });
      });
    });

    for (const t of allTemplates) {
      const existing = await window.api.db.query(
        "SELECT id FROM custom_models WHERE id = ?",
        [t.key],
      );
      if (existing.length === 0) {
        const model = new EditorialModel({
          id: t.key,
          name: t.name,
          description: t.description,
          baseType: t.projectType,
          isSystem: true,
          structure: t.structure.map((s) => ({
            ...s,
            id: `struct-${t.key}-${s.type}`,
            required: s.required || false,
          })),
          design: {
            tokens: t.designTokens || {},
            // Add default content to design for easier access
            defaultContent: t.defaultContent || {},
          },
          rules: t.smartRules || {},
          export: {
            formats: ["pdf", "docx"],
            pageSize: "A4",
          },
          metadata: {
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            version: "1.0",
            author: "System",
          },
        });

        await window.api.db.execute(
          `INSERT INTO custom_models (id, name, description, base_type, is_system, structure, design, rules, export_config, created_at, modified_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            model.id,
            model.name,
            model.description,
            model.baseType,
            1,
            JSON.stringify(model.structure),
            JSON.stringify(model.design),
            JSON.stringify(model.rules),
            JSON.stringify(model.export),
            model.metadata.created,
            model.metadata.modified,
          ],
        );
        console.log(`Migrated template: ${t.name}`);
      }
    }
    console.log("Template migration complete.");
  },
};
