# LemWriter — Arquitectura y Funcionamiento

> Este documento describe el funcionamiento REAL y VERIFICADO de LemWriter,
> basado en lectura directa del código fuente (no en el plan original ni en
> supuestos). Donde el comportamiento real difiere del plan original, se
> indica explícitamente. Última actualización: 1-2 de julio de 2026.

---

## 1. Concepto y stack

**Concepto:** "Un IDE para escritores cristianos." Aplicación de escritorio unificada donde cada tipo de proyecto activa herramientas especializadas, todas compartiendo el mismo editor y base de conocimiento.

**Stack confirmado:**
- Runtime: Electron
- Frontend: React + Vite
- Editor: **Tiptap v3.27.1** (el plan original decía v2; la versión real instalada es v3)
- Estilos: TailwindCSS
- Base de datos local: better-sqlite3 (SQLite), vía IPC (`window.api.db`, expuesto desde `electron/preload.js`)
- Exportación PDF: `BrowserWindow.webContents.printToPDF` (Chromium nativo de Electron) — **no Puppeteer**, a diferencia del plan original
- Exportación DOCX: librería `docx` (npm)
- Exportación EPUB: construcción manual de zip con `yazl` (no una librería de EPUB dedicada)

---

## 2. Estructura de carpetas real

```
LemWriter/
├── electron/
│   ├── main.js           ← proceso principal, registra handlers ipcMain
│   ├── preload.js         ← expone window.api (db, export) al renderer
│   ├── database.js        ← inicialización SQLite, migraciones por columna
│   └── export.js          ← lógica real de generación PDF/DOCX/EPUB
├── src/
│   ├── components/
│   │   ├── Home/
│   │   │   ├── Home.jsx              ← pantalla de inicio, tarjetas de tipo
│   │   │   └── NewProjectModal.jsx   ← modal de creación (recibe type como prop)
│   │   ├── Sidebar/
│   │   │   └── Sidebar.jsx           ← árbol de secciones + panel de Recursos
│   │   ├── Editor/
│   │   │   ├── Editor.jsx            ← editor Tiptap unificado
│   │   │   ├── ResizableImageExtension.js / ResizableImageComponent.jsx
│   │   │   └── FootnoteExtension.js
│   │   ├── RightPanel/
│   │   │   ├── RightPanel.jsx        ← router por projectType
│   │   │   ├── BookPanel.jsx         ← Libro: estilo, personajes, notas
│   │   │   ├── TeachingPanel.jsx     ← Enseñanza
│   │   │   ├── DevotionalPanel.jsx   ← Devocional
│   │   │   ├── BibleWordsPanel.jsx   ← gestión de palabras hebreo/griego
│   │   │   └── CharacterCard.jsx     ← ficha de personaje (usado por BookPanel)
│   │   ├── Toolbar/
│   │   │   └── Toolbar.jsx           ← carpeta propia, correcto según plan
│   │   ├── Export/
│   │   │   └── ExportModal.jsx
│   │   └── Assistant/
│   │       └── WritingAssistant.jsx  ← mentor de escritura basado en reglas
│   ├── services/
│   │   ├── projectService.js         ← CRUD central: proyectos, secciones, recursos, personajes, estudios
│   │   ├── exportService.js          ← wrapper delgado sobre window.api.export
│   │   ├── exportAppendixService.js  ← genera secciones virtuales (Personajes, Bibliografía) — AGREGADO 1-2 jul 2026
│   │   └── migrationService.js       ← puebla custom_models desde definitions.js al arrancar
│   ├── templates/
│   │   ├── definitions.js            ← TODAS las plantillas por tipo (book/teaching/devotional/sermon/video)
│   │   └── validationEngine.js       ← motor de reglas del Asistente de escritura
│   ├── config/
│   │   ├── projectStyles.js          ← STYLES_BY_TYPE (tipo → nombre de estilo)
│   │   ├── bookStyles.js             ← BOOK_STYLES (nombre de estilo → definición completa de tipografía/página)
│   │   └── resourceFormats.js        ← RESOURCE_FORMATS (formato de inserción por tipo de recurso)
│   ├── assets/fonts/
│   │   ├── fonts.css                 ← @font-face, importado desde main.jsx como JS, NUNCA @import en CSS
│   │   ├── EBGaramond.woff2 / EBGaramond-Italic.woff2 / Cinzel.woff2
│   └── App.jsx                        ← estado global, orquesta Home/Editor/RightPanel/ExportModal
```

**Diferencias confirmadas contra el plan original (`AGENTS.md`):**
- No existen `hooks/useProject.js`, `useSection.js`, `useExport.js` como archivos separados — la lógica vive directamente en `App.jsx` con `useState`/`useCallback`.
- No existe `services/backupService.js` — el backup automático (Fase 5) nunca se implementó.
- `templates/book.js`, `teaching.js`, `devotional.js` como archivos separados no existen — todo vive unificado en `templates/definitions.js`.
- La carpeta `config/` (estilos, formatos de recursos) no estaba en el plan original y es una adición real necesaria.

---

## 3. Modelo de datos SQLite (real, verificado con `PRAGMA table_info` y uso en código)

```sql
-- projects
id (TEXT, formato 'project-{timestamp}'), type (libro/ensenanza/devocional/sermon/video),
title, style, formato (TEXT, solo relevante para video: 'largo'/'corto'),
study_id (FK opcional a studies), created_at, updated_at

-- sections
id (TEXT, prefijo 'sec-' para las creadas desde el editor vía saveSections;
    las creadas por plantilla usan uuid v4 plano sin prefijo),
project_id, type, title, content (HTML de Tiptap),
bible_reference (JSON), is_visible, order_index, word_count,
status, summary, created_at, updated_at

-- resources (biblioteca global, reutilizable entre proyectos)
id (INTEGER autoincrement), type (7 valores: pasaje_biblico, palabra_hebrea,
    palabra_griega, personaje_biblico, ilustracion, cita_autor,
    concepto_teologico — más nota_teologica, 8 en total según resourceFormats.js),
title, content, notes, reference, bible_version, original_word,
transliteration, strongs_number, meaning, author, source, tags,
created_at, updated_at

-- project_resources (tabla puente proyecto↔recurso)
id, project_id, resource_id, used (0/1), used_in (section_id), added_at

-- characters (solo relevantes para proyectos tipo Libro, ver sección 7)
id, project_id, name, hebrew_greek_name, meaning, "references", role, notes

-- notes
id, section_id, type, content, created_at

-- studies (agrupador opcional de proyectos relacionados)
id, theme, base_text, notes, created_at, updated_at

-- study_resources (tabla puente estudio↔recurso)
study_id, resource_id, used, used_in, added_at

-- custom_models (poblada al arrancar desde definitions.js por migrationService.js)
id, name, description, base_type, is_system, structure (JSON),
design (JSON), rules (JSON), export_config (JSON), created_at, modified_at
```

**Nota importante heredada del plan original:** NO existe una tabla `bible_words` separada, a pesar de que `AGENTS.md` la incluía en el modelo de datos planeado. Las palabras hebreo/griego se implementaron como `resources` de tipo `palabra_hebrea`/`palabra_griega`, unificando con la Biblioteca de Recursos general — decisión tomada explícitamente para no duplicar sistemas.

---

## 4. Normalización de tipo de proyecto (mecanismo central, fuente histórica de bugs)

La UI históricamente mezcló `type` en inglés (`book`, `teaching`, `devotional`) con la base de datos en español (`libro`, `ensenanza`, `devocional`). Existen **tres normalizaciones independientes** en el código, cada una en su propio archivo, y hay que conocerlas todas:

1. **`projectService.createNewProject`** (guarda en BD): traduce inglés→español al crear.
   ```javascript
   if (type === 'book') type = 'libro';
   if (type === 'teaching') type = 'ensenanza';
   if (type === 'devotional') type = 'devocional';
   if (type === 'preaching') type = 'sermon';
   // 'video' no necesita mapeo
   ```

2. **`templates/definitions.js` → `normalizeType`** (para buscar plantillas): traduce español→inglés, porque las claves del objeto `templates` están en inglés para book/teaching/devotional.
   ```javascript
   if (type === 'libro') return 'book'
   if (type === 'ensenanza') return 'teaching'
   if (type === 'devocional') return 'devotional'
   // sermon/video pasan sin cambio (sus claves ya están en la forma correcta)
   ```

3. **`Home.jsx` → `normalizeTypeId`** (para íconos/colores en Proyectos Recientes): traduce español→inglés, porque `projectTypes` usa ids en inglés. Agregado el 1-2 jul 2026 para corregir un bug real (íconos ausentes para Libro/Enseñanza/Devocional).
   ```javascript
   const map = { libro: 'book', ensenanza: 'teaching', devocional: 'devotional' }
   ```

4. **`RightPanel.jsx`**: no normaliza — acepta ambos valores en cada condición (`projectType === "book" || projectType === "libro"`), como parche histórico.

**Regla práctica:** cualquier componente nuevo que compare `project.type` contra una lista de valores debe decidir explícitamente en qué idioma están sus datos de referencia, y normalizar en consecuencia — no asumir que `project.type` siempre viene en español, aunque así es como se guarda en la BD.

---

## 5. Flujo de creación de un proyecto nuevo

1. Usuario hace clic en una tarjeta de tipo en `Home.jsx` → `onSelectType(type.id)` → `App.jsx` guarda `modalType`.
2. Se monta `NewProjectModal` con `type={modalType}`. El modal **no** selecciona el tipo (ya viene decidido) — lista las **plantillas** de ese tipo vía `getTemplates(type)` (de `definitions.js`), permitiendo elegir una si hay más de una (caso real: Video tiene `video-largo` y `video-corto`, funcionando como sub-selector de formato sin UI adicional).
3. Al confirmar, `App.jsx → handleConfirmCreate(name, selectedTemplate)`:
   - Deriva `formato` (solo relevante para `video`): `selectedTemplate === 'video-corto' ? 'corto' : 'largo'`.
   - Llama `projectService.createNewProject(type, name, selectedTemplate, null, formato)`.
4. `createNewProject`:
   - Normaliza `type` a español.
   - Calcula `style`: si no se pasó explícito, usa `STYLES_BY_TYPE[type] || 'manuscrito_clasico'`.
   - Inserta la fila en `projects`.
   - Si `type === 'libro'` → `seedLibroSections` (8 secciones fijas hardcodeadas, no basadas en plantilla).
   - Si no → `createSectionsFromTemplate(projectId, type, formato, db)`: busca la plantilla correcta en `definitions.js` (para `video`, elige `video-corto`/`video-largo` según `formato`; para el resto, toma la primera clave disponible), e inserta una sección por cada elemento de `template.structure`, con `defaultContent` como HTML inicial.
5. `App.jsx` recarga el proyecto completo (`getProject(id)`) y cambia a la vista `editor`.

---

## 6. Sistema de estilos (dos capas independientes, deben mantenerse sincronizadas)

**Capa 1 — `STYLES_BY_TYPE`** (`src/config/projectStyles.js`): mapea tipo de proyecto → **nombre** de estilo (string único, no array).
```javascript
export const STYLES_BY_TYPE = {
  libro: 'manuscrito_clasico',
  ensenanza: 'libro_ensenanza',
  devocional: 'devocional_calido',
  sermon: 'sermon_expositivo',
  video: 'video_dinamico'
}
```

**Capa 2 — `BOOK_STYLES`** (`src/config/bookStyles.js`): mapea el **nombre** de estilo → un objeto de definición completa (12 categorías: `page`, `typography`, `headings` [h1-h6], `chapter`, `headerFooter`, `blockquotes`, `lists`, `tables`, `images`, `notes`, `indexes`, `export`). Estilos existentes: `manuscrito_clasico`, `estudio_moderno`, `libro_ensenanza`, `devocional_calido`, `sermon_expositivo`, `video_dinamico`.

**Riesgo estructural conocido:** si se agrega una entrada nueva a `STYLES_BY_TYPE` sin la correspondiente en `BOOK_STYLES`, no hay error — `Editor.jsx` tiene un guard silencioso (`if (!estilo || ...) return`) que simplemente deja el editor sin ninguna variable CSS aplicada (sin fuente, márgenes ni tipografía de encabezados personalizada). Esto ya ocurrió una vez (estilos de Sermón/Video) y se corrigió, pero el riesgo persiste para cualquier tipo futuro.

**Mecanismo de aplicación (`Editor.jsx`):** un único `useEffect` que reacciona a `projectStyle`, busca `BOOK_STYLES[projectStyle]`, y aplica ~50 variables CSS (`--body-font`, `--h1-size`, `--blockquote-style`, etc.) directamente sobre el contenedor del editor vía `el.style.setProperty(...)`. El CSS en `index.css` usa `!important` en las reglas de `.prose-editor` porque existe un `font-family` global de mayor especificidad que de otro modo lo sobreescribe.

**Regresión conocida y corregida:** este mismo `useEffect` estuvo vacío (`if (editor) { }`) en algún punto por un refactor de otra IA, perdiendo la llamada a `onEditorReady(editor)` que setea `editorRef.current` en `App.jsx`. Sin esa referencia, cualquier función que dependa de `editorRef.current` (como insertar un recurso en el texto) fallaba silenciosamente sin error visible. Corregido el 1-2 jul 2026.

---

## 7. Panel derecho (contextual por tipo)

`RightPanel.jsx` es un router explícito, **sin rama `else`**:
```javascript
{(projectType === "book" || projectType === "libro") && <BookPanel ... />}
{(projectType === "teaching" || projectType === "ensenanza") && <TeachingPanel ... />}
{(projectType === "devotional" || projectType === "devocional") && <DevotionalPanel ... />}
```
**Sermón y Video no tienen panel lateral propio** — al no matchear ninguna rama, el panel queda vacío para esos tipos. Esto es consistente con el alcance definido al implementarlos, pero significa que no tienen acceso a Recursos ni Personajes desde la UI actualmente (ver sección 9, limitación de alcance).

**Personajes:** solo disponibles vía `CharacterCard.jsx`, importado únicamente por `BookPanel.jsx`. → **Solo proyectos tipo Libro pueden tener personajes.**

**Recursos (Biblioteca):** disponibles vía `addResourceToProject` en `BookPanel.jsx` y `TeachingPanel.jsx`. → **Solo Libro y Enseñanza pueden vincular recursos a un proyecto.** Devocional, Sermón y Video no tienen ningún mecanismo de UI para esto hoy.

---

## 8. Inserción de recursos en el editor y marcado de "usado"

Flujo real (`App.jsx`, función `handleInsertResource`, disparada desde `Sidebar.jsx` vía prop `onInsertResource`):
```javascript
const handleInsertResource = useCallback((resource) => {
  if (!editorRef.current) return
  const html = resourceToHTML(resource)          // src/config/resourceFormats.js
  editorRef.current.chain().focus().insertContent(html).run()
  if (project?.id && resource?.id) {
    projectService.markResourceUsed(project.id, resource.id, activeSection)
  }
}, [project, activeSection])
```
`resourceToHTML(r)` (en `resourceFormats.js`) da formato distinto según `r.type` — por ejemplo, `pasaje_biblico` se envuelve en comillas + referencia dentro de un `<blockquote>`; `palabra_hebrea`/`palabra_griega` se resaltan en negrita con transliteración y número de Strong; `personaje_biblico` y `concepto_teologico` van en texto plano con título en negrita.

`markResourceUsed(projectId, resourceId, sectionId)` actualiza `project_resources.used = 1` y guarda `used_in` con el id de la sección donde se insertó. **Este mecanismo estuvo roto** (la función nunca se llamaba desde ningún componente) hasta el 1-2 jul 2026, cuando se conectó junto con el fix del `editorRef`.

**Limitación conocida y sin resolver (Bug B, documentado en `AGENTS.md`, sesión previa):** `getProjectResources(projectId)` solo trae recursos ya vinculados explícitamente a ese proyecto vía `project_resources` — no hay forma en la UI de ver/reutilizar recursos creados en otros proyectos, a pesar de que la biblioteca es conceptualmente global. Existe `searchResources(query, type)` en `projectService.js` que sí busca en toda la tabla `resources` sin filtrar por proyecto, pero **nunca se llama desde ningún componente**. Sigue sin resolverse a la fecha de este documento.

---

## 9. Sistema de exportación

**Cadena de llamadas:** `ExportModal.jsx` → `exportService.js` (wrapper delgado) → `window.api.export.{pdf,docx,epub}` (preload) → `ipcMain.handle('export:pdf'|'export:docx'|'export:epub')` (`main.js`) → funciones reales en `electron/export.js`.

**Formatos soportados:** PDF (vía `printToPDF` nativo de Electron/Chromium), DOCX (librería `docx`), EPUB (zip manual con `yazl`).

**Filtrado antes de exportar:** `exportService` descarta secciones con `is_visible === 0` o sin contenido real (HTML vacío tras quitar etiquetas).

**Apéndices automáticos (agregado 1-2 jul 2026, `exportAppendixService.js`):** antes de exportar, `ExportModal.jsx` arma dos "secciones virtuales" adicionales (mismo formato `{type, title, content}` que las reales, por lo que el motor de exportación no necesitó cambios):
- **Personajes** — solo si `project.type === 'libro'`, listando todos los personajes del proyecto.
- **Bibliografía y Recursos** — solo si `project.type === 'libro' || 'ensenanza'`, listando **solo** los recursos con `used === 1` (no todos los vinculados), formateados con la misma función `resourceToHTML` que usa el editor.

**Estado del exportador PDF (`electron/export.js → exportPDF`):** el código estaba escrito contra una versión antigua de la API `printToPDF` de Electron (márgenes en píxeles, objeto `headerFooter` con array `contents`). Electron v20+ cambió esta API para alinearse con el protocolo de Chrome DevTools: los márgenes ahora se especifican en **pulgadas**, y `headerFooter` fue reemplazado por `headerTemplate`/`footerTemplate`/`displayHeaderFooter`. Esto causaba el error `margins must be less than or equal to pageSize` en **todo** intento de exportar a PDF. Fix en curso al cierre de este documento (ver Documento 2, pendientes).

**DOCX y EPUB:** confirmados funcionando por el usuario antes de esta sesión (exportación de los 3 tipos "sin problemas"), y siguen funcionando tras agregar los apéndices.

**Limitación de formato conocida en DOCX:** `exportDOCX` toma el contenido completo de una sección y le quita todas las etiquetas HTML de una sola vez (`s.content.replace(/<[^>]*>/g, '')`), sin preservar separación entre párrafos `<p>` individuales. Esto puede hacer que secciones con múltiples párrafos (como el apéndice de Bibliografía, con muchas entradas) se vean como un bloque de texto corrido en el DOCX exportado, aunque en el editor y en PDF/EPUB se vean separados correctamente.

---

## 10. Asistente de escritura

Implementado como motor de reglas (no IA generativa) en `src/templates/validationEngine.js`, con la UI en `src/components/Assistant/WritingAssistant.jsx`. Da mensajes contextuales según tipo y contenido de la sección activa (ej. "Este capítulo supera 3,000 palabras. Considera dividirlo." para Libro; "Aún no has agregado una aplicación práctica." para Enseñanza).

---

## 11. Convenciones y reglas prácticas del proyecto (para evitar regresiones)

1. **Verificar con evidencia real, no con el resumen del agente de código.** Cada cambio se confirma con `grep`/`sqlite3`/`cat` corridos directamente por el usuario en su propia terminal — no basta con que OpenCode reporte éxito.
2. **`fonts.css` se importa desde `main.jsx` como import de JS, nunca `@import` en CSS** (Vite no resuelve bien rutas relativas de fuentes con `@import`).
3. **IDs de sección con prefijo `sec-`** son señal de "creada desde el editor" (afecta lógica INSERT vs UPDATE en `saveSections`); las creadas por plantilla usan UUID plano.
4. **`db.execute()` no retorna `lastInsertRowid` de forma confiable** — verificar con `SELECT` posterior si se necesita el id real tras un INSERT.
5. **Encadenamiento opcional completo con Tiptap:** `editor?.can()?.undo()`, nunca `editor?.can().undo()` (falla si `editor` es `null`).
6. **CSS global de alta especificidad sobreescribe el editor** — usar `!important` en reglas de `.prose-editor`.
7. **`better-sqlite3` está compilado contra el ABI de Node embebido en Electron, no el Node de sistema.** Cualquier script standalone que necesite acceder a la base directamente (fuera de la app) debe correr con `ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron script.mjs`, no con `node script.mjs`.
8. **Scripts sueltos de verificación deben limpiarse después de usarse** (tanto el archivo como los datos de prueba que generan en la base real) — la acumulación de proyectos de prueba sin borrar ya causó una vez que proyectos reales del usuario quedaran ocultos por el `LIMIT 10` de `getRecentProjects()`.
9. **Cambiar de IA/modelo a mitad de proyecto sin compartir contexto causa regresiones reales** — ya ocurrió al menos dos veces (movimiento de archivos de Toolbar/fonts, y el vaciado del `useEffect` de estilos en `Editor.jsx`). Mantener documentos de traspaso actualizados y pasarlos completos al iniciar cualquier sesión nueva.
