// Shared utilities for right-panel components.
// Extracted to reduce duplication across BookPanel, StudyPanel, etc.

import { projectService } from '../../services/projectService';

/**
 * Saves a resource globally and links it to the current project.
 * Common pattern across BookPanel, TeachingPanel, StudyPanel, etc.
 */
export async function saveToResources(projectId, type, data, onResourceChange) {
  if (!projectId) return null;
  try {
    const id = await projectService.findOrCreateResource({ type, ...data });
    await projectService.addResourceToProject(projectId, id);
    onResourceChange?.();
    return id;
  } catch (err) {
    console.error('Error guardando en resources:', err);
    return null;
  }
}

/**
 * Parses `section.bible_reference` JSON safely.
 * Returns an array or fallback value on parse failure.
 */
export function parseBibleRef(section) {
  if (!section?.bible_reference) return {};
  try {
    return JSON.parse(section.bible_reference);
  } catch {
    return {};
  }
}

/**
 * Parse bible_reference as array (simple references list).
 */
export function parseRefsArray(section) {
  if (!section) return [];
  try {
    const parsed = section.bible_reference ? JSON.parse(section.bible_reference) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Builds the default section type for a given project type.
 */
export function defaultSectionType(projectType) {
  const map = {
    libro: 'capitulo',
    book: 'capitulo',
    ensenanza: 'clase',
    teaching: 'clase',
    estudio: 'texto_base',
    study: 'texto_base',
    devocional: 'dia',
    devotional: 'dia',
  };
  return map[projectType] || 'dia';
}
