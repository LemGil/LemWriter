// electron/services/exportObsidianService.js
//
// Exporta proyectos de LemWriter como archivos .md compatibles con Obsidian.
// Se engancha al autosave — cada vez que un proyecto se guarda en SQLite,
// también se actualiza su archivo .md en la carpeta raw/ del vault.
//
// Estructura de destino:
//   <OBSIDIAN_RAW>/
//     sermones/
//     ensenanzas/
//     devocionales/
//     estudios/
//     videos/
//     libros/

const fs = require('fs');
const path = require('path');

// ─── Configuración ────────────────────────────────────────────────────────────

// Ruta base del vault de Obsidian (raw/ es donde LemGil escribe, el agente no toca)
// Se puede sobreescribir vía variable de entorno LEMWRITER_OBSIDIAN_RAW
const DEFAULT_OBSIDIAN_RAW = path.join(
  '/media/lemgil/ALMACEN/MinisterioWiki',
  'raw'
);

function getObsidianRawPath() {
  return process.env.LEMWRITER_OBSIDIAN_RAW || DEFAULT_OBSIDIAN_RAW;
}

// ─── Mapeo de tipos de proyecto a subcarpetas ─────────────────────────────────

const TYPE_TO_FOLDER = {
  sermon:      'sermones',
  ensenanza:   'ensenanzas',
  devocional:  'devocionales',
  estudio:     'estudios',
  video:       'videos',
  libro:       'libros',
};

// Normaliza el tipo tal como viene de la BD (puede tener tildes u otras variantes)
function normalizeType(rawType) {
  if (!rawType) return null;
  const t = rawType.toLowerCase().trim();
  // Variantes con tilde
  if (t === 'enseñanza' || t === 'ensenanza') return 'ensenanza';
  if (t === 'sermón'    || t === 'sermon')    return 'sermon';
  if (t === 'devocional')                     return 'devocional';
  if (t === 'estudio')                        return 'estudio';
  if (t === 'video')                          return 'video';
  if (t === 'libro')                          return 'libro';
  return null; // tipo desconocido — no exportar
}

// ─── Generación de slug ───────────────────────────────────────────────────────

function toSlug(text) {
  if (!text) return 'sin-titulo';
  return text
    .toLowerCase()
    .normalize('NFD')                    // descompone tildes
    .replace(/[\u0300-\u036f]/g, '')     // elimina diacríticos
    .replace(/[^a-z0-9\s-]/g, '')        // solo letras, números, espacios, guiones
    .trim()
    .replace(/\s+/g, '-')               // espacios → guiones
    .replace(/-+/g, '-')                // guiones múltiples → uno
    .substring(0, 80);                  // máx 80 chars
}

function buildFilename(project) {
  const type  = normalizeType(project.type);
  const slug  = toSlug(project.title);
  const year  = new Date(project.created_at || Date.now()).getFullYear();
  const folder = TYPE_TO_FOLDER[type] || 'otros';
  const filename = `${type}-${slug}-${year}.md`;
  return { folder, filename };
}

// ─── Conversión HTML → Markdown ───────────────────────────────────────────────
// Conversión manual sin dependencias externas.
// Cubre los elementos que Tiptap genera: h1-h3, p, strong, em, u, ol, li, blockquote.

function htmlToMarkdown(html) {
  if (!html) return '';

  let md = html;

  // Blockquotes (antes que párrafos para no interferir)
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
    const text = htmlToMarkdown(inner).trim();
    return text.split('\n').map(l => `> ${l}`).join('\n') + '\n\n';
  });

  // Encabezados
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, t) => `# ${stripTags(t).trim()}\n\n`);
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `## ${stripTags(t).trim()}\n\n`);
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `### ${stripTags(t).trim()}\n\n`);

  // Listas ordenadas
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) => {
    let i = 0;
    const items = inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (__, item) => {
      i++;
      return `${i}. ${stripTags(htmlToMarkdown(item)).trim()}\n`;
    });
    return items + '\n';
  });

  // Listas no ordenadas
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) => {
    const items = inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (__, item) => {
      return `- ${stripTags(htmlToMarkdown(item)).trim()}\n`;
    });
    return items + '\n';
  });

  // Formato inline
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, t) => `**${stripTags(t)}**`);
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi,           (_, t) => `**${stripTags(t)}**`);
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi,         (_, t) => `*${stripTags(t)}*`);
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi,           (_, t) => `*${stripTags(t)}*`);
  md = md.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi,           (_, t) => `<u>${stripTags(t)}</u>`);

  // Párrafos
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, t) => {
    const text = stripTags(t).trim();
    return text ? text + '\n\n' : '';
  });

  // Saltos de línea
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // Eliminar cualquier tag HTML restante
  md = md.replace(/<[^>]+>/g, '');

  // Entidades HTML básicas
  md = md.replace(/&nbsp;/g,  ' ');
  md = md.replace(/&amp;/g,   '&');
  md = md.replace(/&lt;/g,    '<');
  md = md.replace(/&gt;/g,    '>');
  md = md.replace(/&quot;/g,  '"');
  md = md.replace(/&#39;/g,   "'");

  // Limpiar líneas en blanco excesivas (máx 2 consecutivas)
  md = md.replace(/\n{3,}/g, '\n\n');

  return md.trim();
}

function stripTags(html) {
  return (html || '').replace(/<[^>]+>/g, '');
}

// ─── Construcción del archivo .md ─────────────────────────────────────────────

function buildMarkdown(project, sections) {
  const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const createdDate = project.created_at
    ? new Date(project.created_at).toISOString().split('T')[0]
    : now;

  // Frontmatter YAML
  const frontmatter = [
    '---',
    `tipo: ${normalizeType(project.type) || project.type}`,
    `titulo: "${(project.title || '').replace(/"/g, '\\"')}"`,
    `fecha_creacion: ${createdDate}`,
    `ultima_actualizacion: ${now}`,
    `estado: ${project.status || 'en_progreso'}`,
    `tags: [${normalizeType(project.type) || 'ministerio'}, lemwriter]`,
    `lemwriter_id: "${project.id}"`,
    '---',
    '',
  ].join('\n');

  // Título principal
  const titulo = `# ${project.title || 'Sin título'}\n\n`;

  // Secciones ordenadas por order_index
  const sortedSections = [...(sections || [])].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );

  const cuerpo = sortedSections
    .map(section => {
      const parts = [];
      if (section.title && section.title.trim()) {
        parts.push(`## ${section.title.trim()}\n`);
      }
      if (section.content) {
        parts.push(htmlToMarkdown(section.content));
      }
      return parts.join('\n');
    })
    .filter(Boolean)
    .join('\n\n---\n\n'); // separador visual entre secciones

  return frontmatter + titulo + cuerpo;
}

// ─── Función principal de exportación ────────────────────────────────────────

/**
 * Exporta un proyecto y sus secciones a un archivo .md en el vault de Obsidian.
 *
 * @param {Object} project   - Objeto proyecto de SQLite (id, title, type, created_at, status)
 * @param {Array}  sections  - Array de secciones del proyecto (title, content, order_index)
 * @returns {string|null}    - Ruta del archivo generado, o null si hubo un error no crítico
 */
function exportProjectToObsidian(project, sections) {
  try {
    const type = normalizeType(project.type);
    if (!type) {
      console.warn(`[Obsidian Export] Tipo desconocido: "${project.type}" — proyecto omitido`);
      return null;
    }

    const rawBase = getObsidianRawPath();

    // Verificar que el disco/carpeta base existe
    if (!fs.existsSync(rawBase)) {
      console.warn(`[Obsidian Export] Carpeta raw no encontrada: ${rawBase} — exportación omitida`);
      return null;
    }

    const { folder, filename } = buildFilename(project);
    const folderPath = path.join(rawBase, folder);

    // Crear subcarpeta si no existe
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const filePath = path.join(folderPath, filename);
    const content  = buildMarkdown(project, sections);

    fs.writeFileSync(filePath, content, 'utf8');

    console.log(`[Obsidian Export] ✓ ${filePath}`);
    return filePath;

  } catch (err) {
    // La exportación nunca debe romper el autosave — solo loguea
    console.error('[Obsidian Export] Error al exportar:', err.message);
    return null;
  }
}

module.exports = { exportProjectToObsidian };
