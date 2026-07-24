// src/services/exportAppendixService.js
// Genera secciones "virtuales" (mismo formato { type, title, content } que
// las secciones reales de un proyecto) para anexar Personajes y Bibliografía
// de Recursos al exportar. No modifica el motor de exportación de Electron:
// estas secciones se insertan en el array `sections` antes de exportar, y
// electron/export.js las procesa igual que cualquier otra sección.

import { resourceToHTML } from '../config/resourceFormats';

function characterToHTML(c) {
  const parts = [];
  let heading = c.name || '';
  if (c.hebrew_greek_name) heading += ` (${c.hebrew_greek_name})`;
  parts.push(`<strong>${heading}</strong>`);
  if (c.role) parts.push(c.role);
  if (c.meaning) parts.push(`Significado: ${c.meaning}`);
  if (c.references) parts.push(`Referencias: ${c.references}`);
  if (c.notes) parts.push(c.notes);
  return `<p>${parts.join('. ')}</p>`;
}

/**
 * Arma la sección virtual de Personajes.
 * @param {Array} characters - resultado de projectService.getCharacters(projectId)
 * @returns {Object|null} sección { type, title, content } o null si no hay personajes
 */
export function buildCharactersSection(characters) {
  if (!characters || characters.length === 0) return null;
  const content = characters.map(characterToHTML).join('\n');
  return {
    type: 'apendice',
    title: 'Personajes',
    content,
    is_visible: 1,
  };
}

/**
 * Arma la sección virtual de Bibliografía y Recursos, incluyendo solo
 * los recursos marcados como usados (used === 1) en el proyecto.
 * @param {Array} resources - resultado de projectService.getProjectResources(projectId)
 * @returns {Object|null} sección { type, title, content } o null si no hay recursos usados
 */
export function buildResourcesSection(resources) {
  if (!resources || resources.length === 0) return null;
  const usados = resources.filter((r) => r.used === 1 || r.used === true);
  if (usados.length === 0) return null;
  const content = usados
    .map((r) => {
      const html = resourceToHTML(r) || '';
      // resourceToHTML ya envuelve en <blockquote>/<p> según el tipo de
      // recurso; solo envolver en <p> los que vienen como texto inline.
      const yaEnvuelto = /^\s*<(p|blockquote|div|ul|ol)[\s>]/i.test(html);
      return yaEnvuelto ? html : `<p>${html}</p>`;
    })
    .join('\n');
  return {
    type: 'apendice',
    title: 'Bibliografía y Recursos',
    content,
    is_visible: 1,
  };
}
