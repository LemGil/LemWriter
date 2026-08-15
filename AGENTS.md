# LemWriter — Plataforma de Escritura Ministerial

## Stack
- Electron + React + Vite
- Editor: Tiptap v3.27.1
- Estilos: TailwindCSS
- BD: better-sqlite3 (SQLite, vía IPC)
- Exportación: PDF (Chromium nativo), DOCX (librería `docx`), EPUB (yazl)
- IA local: Ollama (endpoint `/api/chat`), modelo por defecto `ibm/granite4:3b`, fast fallback `lfm2.5-1.2b`
- **Biblia offline**: RV1909 (Reina-Valera 1909) en SQLite independiente (`bible-rv1909.db`)

## Arquitectura de IA local (Ollama)

### Dos servicios coexistentes

**`electron/services/aiService.js`** — Servicio interno para funciones automáticas (extraer referencias, clasificar recursos):
- Llama al endpoint nativo `/api/chat` (NO `/v1/chat/completions` — esta última ignora `num_ctx`, causando timeouts en CPU).
- Parámetros optimizados: `num_ctx: 2048`, `keep_alive: "30m"`, `REQUEST_TIMEOUT_MS: 120_000`.
- `extractReferences(texto)` → devuelve array JSON de `{libro, capitulo, versiculo, versiculo_final}`.
- `classifyResource(descripcion)` → devuelve string de categoría (`comentario`, `mapa`, `cronologia`, `diccionario`, `imagen`, `video`, `articulo`).
- `queryModel(prompt, {model, temperature, maxTokens})` → devuelve `content` (string directo, sin wrapper de timing).
- Logging interno: `console.time/timeEnd` con label `[aiService] ${model} query`.
- No requiere dependencias npm — usa `fetch` nativo de Node.js.

**`electron/ollama.js`** — Servicio para chat interactivo del usuario (OllamaChat.jsx):
- `chat(model, messages)` y `generate(model, prompt)` contra `/api/chat` y `/api/generate`.
- `listModels()` → lista modelos disponibles.
- Usa `http.request` nativo (sin fetch).

### IPC handlers (ambos servicios expuestos)

| Canal | Handler | Desde UI |
|---|---|---|
| `ollama:chat` | `ollama.chat(model, messages)` | `OllamaChat.jsx` |
| `ollama:list-models` | `ollama.listModels()` | `OllamaChat.jsx` |
| `ollama:generate` | `ollama.generate(model, prompt)` | (reserva) |
| `ai:check-status` | `aiService.checkOllamaStatus()` | App inicio |
| `ai:query-model` | `aiService.queryModel(prompt, options)` | Pruebas/reserva |
| `ai:extract-references` | `aiService.extractReferences(texto, options)` + INSERT en `detected_references` | `DetectarReferenciasButton` |
| `ai:classify-resource` | `aiService.classifyResource(descripcion, options)` | Futuro: clasif. recursos |
| `ai:confirm-reference` | `db:UPDATE detected_references SET confirmado_por_usuario=1` (con fallback INSERT) | `DetectarReferenciasButton` |
| `bible:getVerse` | `bibleService.buscarVersiculo({ libro, capitulo, versiculo, versiculoFinal })` | Citas bíblicas desde UI |

## Base de datos bíblica offline (RV1909)

**Archivo**: `electron/bible-database.js` — servicio de solo lectura que abre `bible-rv1909.db` desde `app.getPath("userData")`.

**Esquema SQLite** (importado desde `electron/bible-data/rv1909-data.sql`):

```sql
CREATE TABLE books (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    modern_name TEXT NOT NULL,
    new_testament INTEGER NOT NULL
);

CREATE TABLE verses (
    book_id INTEGER NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    text TEXT NOT NULL,
    PRIMARY KEY (book_id, chapter, verse),
    FOREIGN KEY (book_id) REFERENCES books (id)
);
```

**API**:
- `buscarVersiculo({ libro, capitulo, versiculo, versiculoFinal })` → string con texto unido por espacios, o `null` si no existe el libro.
- Búsqueda case-insensitive vía `COLLATE NOCASE` en `modern_name`.
- `versiculoFinal` opcional: si se omite, busca un solo versículo; si se incluye, devuelve el rango completo.

**IPC**: `bible:getVerse` expuesto como `window.api.bible.getVerse(params)`.

**Verificada** con consultas reales vía `sqlite3` CLI:
- Romanos 1:2 → "Que Él había antes prometido por sus profetas en las santas Escrituras,"
- Mateo 5:1-12 → 12 versículos completos (Bienaventuranzas)
- Libro inexistente → `null` (sin error)

**Origen de datos**: ~50k versículos de Reina-Valera 1909, importados desde `electron/bible-data/rv1909-data.sql`.

### Flujo de confirmación de referencias (Actualizado)

1. **Extracción**: El usuario abre la pestaña "Referencias" en el panel derecho y hace clic en "Detectar con IA".
   - `BibleReferences.jsx` llama a `window.api.ai.extractReferences({ text, projectId })`.
   - El handler IPC `ai:extract-references` invoca `aiService.extractReferences()` y guarda en `detected_references` (confirmado_por_usuario=0).

2. **Revisión y Confirmación**:
   - El usuario ve los resultados en el panel derecho.
   - Al hacer clic en "+", `confirmarDetectada` verifica si el pasaje ya existe en la lista (deduplicación visual).
   - Si es nuevo, busca el texto real en la BD offline (`window.api.bible.getVerse()`) y lo agrega a la lista local.
   - Al confirmar, el panel padre llama a `saveToResources('pasaje_biblico', ...)` que utiliza `projectService.findOrCreateResource()`.

3. **Recursos Canónicos**:
   - `findOrCreateResource` busca si el pasaje ya existe en la tabla `resources` (por `type` y `reference`).
   - Si existe, reutiliza el ID existente. Si no, crea un nuevo registro.
   - Luego, `addResourceToProject` vincula el recurso al proyecto (usando `INSERT OR IGNORE` para evitar duplicados en `project_resources`).

### Deduplicación y Recursos Canónicos
- **UI**: `BibleReferences.jsx` previene agregar duplicados a la lista local (marca como "Ya agregado").
- **BD**: `projectService.findOrCreateResource` asegura que cada pasaje bíblico tenga un único registro en `resources`, vinculable a múltiples proyectos sin duplicar datos.
- **Texto**: Al confirmar, se busca automáticamente el texto del versículo en `bible-rv1909.db` para guardarlo junto a la referencia.

### Tabla `detected_references`

Creada en `electron/database.js` dentro de `initDatabase()` (CREATE TABLE IF NOT EXISTS). Columnas:

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | Identificador único |
| `project_id` | TEXT NOT NULL | FK → projects(id) ON DELETE CASCADE |
| `libro` | TEXT NOT NULL | Nombre del libro bíblico |
| `capitulo` | INTEGER NOT NULL | Capítulo |
| `versiculo` | INTEGER NOT NULL | Versículo inicial |
| `versiculo_final` | INTEGER? | Versículo final (NULL = solo un versículo) |
| `posicion_en_texto` | INTEGER? | Offset de caracter donde se encontró |
| `texto_original` | TEXT? | Fragmento original para depuración |
| `modelo_usado` | TEXT DEFAULT 'ibm/granite4:3b' | Modelo que generó la detección |
| `confirmado_por_usuario` | INTEGER DEFAULT 0 | 0=sugerencia, 1=confirmado por usuario |
| `created_at` | TEXT DEFAULT datetime('now') | Fecha de detección |

Índices: `idx_detected_references_project(project_id)` y `idx_detected_references_libro_capitulo(libro, capitulo)`.

### Rendimiento conocido (CPU, granite4:3B)

| Operación | Tiempo típico | Notas |
|---|---|---|
| Cold start (modelo no en RAM) | ~58s | `keep_alive: "30m"` evita repetirlo |
| `extractReferences` (4 refs con rangos) | **~56s** | Dominado por prompt processing |
| `classifyResource` (1 palabra) | **~1.7–2.6s** | Generación instantánea; bottleneck es leer el prompt |
| Chat interactivo (~100 tokens) | ~15–30s | CPU-bound |

### Componentes UI

**`src/components/Assistant/OllamaChat.jsx`** — Panel flotante de chat IA:
- Model picker con lista dinámica de modelos Ollama
- Toggle "Incluir contenido actual como contexto" (pasa texto del editor como contexto)
- 4 quick prompts: Sugerir esquema, Mejorar redacción, Citas bíblicas, Explicar pasaje
- System prompts específicos por tipo de proyecto (6 tipos + español)
- Botón de nuevo chat, auto-scroll, atajo Enter

**`src/components/Assistant/WritingAssistant.jsx`** — Botón flotante "IA" (MessageCircle) que abre/cierra el chat.

**`src/App.jsx`** — Maneja `isChatOpen`, pasa `getSectionContent()` como contexto.

## 6 tipos de proyecto
| Tipo | Panel derecho | Toolbar | Asistente |
|---|---|---|---|
| `libro`/`book` | ✅ BookPanel (5 tabs) | ✅ | ✅ |
| `ensenanza`/`teaching` | ✅ TeachingPanel (4 tabs) | ✅ | ✅ |
| `devocional`/`devotional` | ✅ DevotionalPanel | ✅ | ✅ |
| `estudio`/`study` | ✅ StudyPanel (7 tabs) | ✅ | ✅ |
| `sermon` | ✅ SermonPanel (4 tabs) | ✅ | ✅ |
| `video` | ✅ VideoPanel (4 tabs) | ✅ | ✅ |

## Reglas del agente
- Analiza archivos existentes antes de modificar
- Entrega código completo y funcional, nunca fragmentos
- Verifica cada cambio con evidencia real (grep/sqlite3/build)
- No asumas éxito — confirma con comandos reales
- Responde siempre en español

## Bugs conocidos (resueltos)
- ~~**Bug B**: Sidebar usa `getProjectResources` (filtrado). Existe `searchResources` (global) pero nunca se llama desde la UI.~~ **Resuelto**: Sidebar ahora llama a `searchResources` cuando hay búsqueda/filtro activo, y `getProjectResources` solo cuando no hay filtros.
- ~~**TODO**: Plantillas `biography` (book) y `sermon` (teaching) no existen en `definitions.js`.~~ **Resuelto**: Agregadas ambas plantillas con estructura y contenido completos.
- ~~**BookTree**: `apendice` no se renderizaba en ningún grupo del sidebar.~~ **Resuelto**: Agregado a `backMatter` + icono `📎`.
- ~~**Sermón/Video sin panel**: No tenían panel contextual, toolbar ni asistente.~~ **Resuelto**: Creados SermonPanel (texto, puntos, preguntas, palabras) y VideoPanel (referencias, escenas, notas, palabras). Asistente con mensajes para ambos tipos.
- ~~**Estadísticas en Inicio siempre en 0**: `getAllProjects()` no traía `sections`, por lo que palabras/secciones/palabras-hoy siempre mostraban 0.~~ **Resuelto**: Creado `getProjectStats()` que calcula totales en SQL directo. Home.jsx ahora lo usa.
- ~~**Búsqueda global: clic en sección no abría la sección exacta**: Usaba `onOpenProject` en vez de `onOpenSection`.~~ **Resuelto**: Corregido a `onOpenSection(s.project_id, s.id)`.
- ~~**Placeholder de Configuración**: Mostraba solo "Próximamente".~~ **Resuelto**: Reemplazado por `SettingsPanel` completo con selector de tema, editor de colores personalizados, respaldos e información.
- ~~**`inputRef` eliminado accidentalmente**: Al añadir estados de colapso en Layout.jsx se eliminó `inputRef`, causando que la app se quedara en blanco al editar el título.~~ **Resuelto**: Restaurada la declaración `const inputRef = useRef(null)`.
- ~~**Conflicto de clases Tailwind en panel derecho colapsable**: `w-72` duplicado en clase base y ternario impedía el colapso.~~ **Resuelto**: Eliminado `w-72` de la clase base, dejándolo solo en el ternario.
- ~~**Editor se remountaba al cambiar de sección**: `key={activeSection}` forzaba recrear Tiptap, perdiendo undo/redo y cursor.~~ **Resuelto**: `Editor.jsx` ahora usa `setContent()` controlado por `sectionId` en vez de key. El editor se monta una sola vez por proyecto.
- ~~**DOCX: confirmar formato real**: Se verificó que la exportación DOCX ya usa `htmlToDocxElements` con parseo completo de HTML a elementos docx (no era pendiente activo).~~ **Verificado**: Exportador DOCX funcional con formato real, sin cambios necesarios.

## Fase 5 — Completa
| Subfase | Estado | Detalle |
|---------|--------|---------|
| Búsqueda global | ✅ | `globalSearch()` en 3 tablas (proyectos, secciones, recursos). Input en Home con debounce 300ms. |
| Temas visuales | ✅ | Tema sincronizado con DB (tabla `settings`). Columna `theme` en projects para tema por proyecto. Se carga al iniciar app y al abrir proyecto. |
| Estadísticas | ✅ | Pestaña Progreso en sidebar para los 6 tipos con labels dinámicos. |
| Backup automático | ✅ | IPC `backup:db`/`backup:list`. Rotación: max 10 respaldos. Botón en footer + Home. Auto-backup al iniciar. |

## Fase 6 — Configuración y Temas Personalizados (completada)
| Subfase | Estado | Detalle |
|---------|--------|---------|
| Panel de Configuración | ✅ | `SettingsPanel.jsx` con secciones: tema global, tema por proyecto, editor de colores, respaldos, información. |
| Tema personalizado (custom) | ✅ | 4º tema con editor de colores vía `react-colorful`. Colores guardados como JSON en `settings['custom_theme']`. Popover con detección arriba/abajo para evitar clipping. |
| Tema por proyecto desde UI | ✅ | Selector de tema en Configuración cuando hay proyecto abierto. Usa `setProjectTheme`/`getProjectTheme` (existían pero nunca se llamaban desde UI). |
| Restauración de tema al salir del editor | ✅ | `handleNavigate` restaura el tema global desde DB al salir del editor. |
| Sidebar: proyectos recientes colapsables | ✅ | Acordeón al hacer clic en "Proyectos". Muestra hasta 10 proyectos. Animación Chevron. |

## Fase 7 — Paneles Colapsables (completada)
| Subfase | Estado | Detalle |
|---------|--------|---------|
| Sidebar izquierdo colapsable | ✅ | Botón en header con separador visual. Colapsa a `w-20` (80px) con `overflow-hidden`. Transición `duration-300`. |
| Panel derecho colapsable | ✅ | Botón en header junto a ThemeToggle. Colapsa a `w-16` (64px). Transición `duration-200`. |
| Tooltips en botones | ✅ | Atributos `title` descriptivos en los 3 botones de colapso/expansión. |
| Iconos en paneles colapsados | ✅ | Sidebar izquierdo: header solo icono grande, tabs iconos verticales, mini emojis por sección/badge/SVG ring según pestaña. Panel derecho: iconos verticales. Ningún texto visible. |
| Errores corregidos | ✅ | `inputRef` restaurado; conflicto de clases Tailwind en panel derecho resuelto; `overflow-y-auto` pisaba `overflow-hidden` en colapso, ocultando texto entrecortado. |

## Pendientes — Todos resueltos ✅

| # | Pendiente | Estado | Implementación |
|---|---|---|---|
| 1 | Restaurar respaldo | ✅ | IPC `backup:restore` + `backupService.restoreBackup()` + botón "Restaurar" por backup en SettingsPanel con confirmación y relaunch |
| 2 | Toolbar contextual | ✅ | Sermón: 3 botones (Target, HelpCircle, BookOpen). Video: 3 botones (Video, BookOpen, StickyNote). |
| 3 | Testing | ✅ | 121 tests en 4 archivos. `vitest run` pasa completo. |
| 4 | Iconos en paneles colapsados | ✅ | Sidebar: header solo icono, mini emojis/badge/SVG ring. Panel derecho: iconos verticales. Sin texto. |
| 5 | Conectar AI service a la UI | ✅ | `ai:confirm-reference` handler + `DetectarReferenciasButton` en toolbar |
| 6 | OllamaChat: timer de carga | ✅ | `elapsedSeconds` con setInterval 1s, muestra "(X s)" o "(X min Y s)", barra de progreso, hints contextuales >30s y >120s |
| 7 | DetectarReferenciasButton | ✅ | Integrado en Toolbar.jsx |
| 8 | UI de búsqueda bíblica | ✅ | `BibleVerseLookup.jsx`: modal con selector de libros (AT/NT), capítulo/versículo/rango, búsqueda en BD offline RV1909, inserción en editor, recientes. Icono 📖 en toolbar. |
| 9 | Búsqueda bíblica en asistente IA | ✅ | `fetchBibleCitations()` parsea referencias en texto y busca en BD offline. Inyecta texto real como contexto de sistema. "Citas bíblicas" quick prompt muestra resultados inline. |

## Deuda técnica documentada (auditoría Sidebar)

| # | Pendiente | Prioridad | Detalle |
|---|---|---|---|
| D1 | Refactor `handleAddSection` | baja | 70 líneas de `if/else` por tipo de proyecto con `getTemplate` re-llamado en cada rama (ya existe `template` en scope del componente). Extraer a `getDefaultSectionConfig(projectType, templateKey)`. Puro cleanup, sin bug. |
| D2 | Heurística de progreso | baja | "Sección completada" = texto sin tags > 100 chars. Placeholders de template pueden contar como completados. UX, no funcional. |
| D3 | Tests vitest bloqueados por ABI | media | `better-sqlite3.node` compilado contra NODE_MODULE_VERSION 146; Node v22.22.3 requiere 127. Los 44 tests de `projectService.test.js` fallan en `new Database(':memory:')` antes de tocar lógica. Fix: `npm rebuild better-sqlite3`. |

## Resueltos 2026-08 (auditoría Sidebar)

- **Bug 1**: `searchResources(query, type, projectId = null)` — parámetro opcional con filtro vía tabla puente `project_resources`. Búsqueda global de Sidebar se mantiene intencionalmente (nota de diseño en código). Commit `0e40503`.
- **Bug 2/4/6**: AbortController en `useEffect` de recursos (evita setState en componente desmontado / race en tab switch) + `saveEdit` compara contra estado fresco (`resources.find`) en vez del snapshot del render. Commit `e551f09`.
- **Falso positivo corregido**: `resourceRefreshKey` en deps de `useEffect` ES su uso (trigger externo), no era bug.

## Fase 8 — Reordenamiento de Secciones (completada, 2026-08-13/14)

| Subfase | Estado | Detalle |
|---------|--------|---------|
| Drag & Drop nativo + botones ↑/↓ | ✅ | `reorderSectionInArray` (lógica pura, 9 tests) + `moveSectionTo` en store. DnD HTML5 sin dependencias nuevas (Principio I). BookTree restringe reorden por grupo; Teaching/Devotional lista completa. Commit `2861cef`. |
| Persistencia de order_index | ✅ | Bug real detectado en auditoría: `moveSectionTo` reordenaba el array en memoria pero nunca actualizaba `order_index` ni llamaba `saveSections`, perdiendo el orden al recargar. Corregido y verificado manualmente (reorder → cerrar → reabrir → orden persiste). Commit `80044f2`. |
| Fix crash de arranque (Supabase) | ✅ | `supabaseClient.js` referenciaba `process.env` sin verificar la existencia de `process`, causando `ReferenceError` no capturado y pantalla en blanco en el renderer de Vite/Electron. Fix con `typeof process !== 'undefined'`. Mismo commit `80044f2`. |
| Drag handle visible + tooltip de drop inválido | ✅ | Icono `GripVertical` (lucide-react) siempre visible en las 3 filas de árbol. Tooltip "Solo se puede mover dentro del mismo grupo" en drops inválidos de BookTree. Generado por Nemotron 3 Ultra, verificado con gate de evidencia real (git diff + grep) antes de aceptar. Commit `ac5c701`. |
| Ajuste visual de espacio en fila | ✅ | `min-w-0` agregado al título (bug de flexbox, no truncaba bien). Fila comprimida (`px-3→px-2`, `gap-2→gap-1`). Sidebar ensanchado (`w-64→w-72`). Texto reducido (`text-sm→text-xs`). Compensa el espacio que tomó el drag handle. Commit `216fc7b`. |
| CI/CD — permisos y versión | ✅ | 403 Forbidden al publicar releases: faltaba `permissions: contents: write` en `build.yml`. `package.json` quedado en `1.0.0` mientras los tags avanzaban, causando que cada release sobrescribiera artefactos con el mismo nombre. Corregido con bump explícito de versión antes de taggear. |

**Nota de proceso**: Un primer reporte de auditoría ("Fiscal") declaró el feature completo y APROBADO sin que existiera código alguno en el repo (`git log` vacío sobre master). Esto llevó a añadir un Paso 0 obligatorio al skill `revision-codigo-lemwriter`: ningún veredicto de auditoría es válido sin `git diff --stat` con evidencia real de código antes de evaluar requisitos funcionales.

## Fase 9 — Linaje de Proyectos (completada, 2026-08-14/15)

| Subfase | Estado | Detalle |
|---------|--------|---------|
| Diseño: tabla de relaciones | ✅ | `project_relations` (parent_id/child_id) en vez de columna simple en `projects`, para soportar múltiples orígenes y derivados sin migración futura (ej. un Libro que recopila varios Estudios). Modela el flujo Estudio → Enseñanza → Sermón/Devocional → Video/Libro sin forzar orden rígido. |
| Schema + servicio | ✅ | Tabla con `ON DELETE CASCADE` e índices en `electron/database.js` (y su copia en el schema de test). Funciones `linkProjects`, `unlinkProjects`, `getRelations` (devuelve `{ origins, derived }`), `searchProjects` en `projectService.js`. 4 tests nuevos (vínculo simple, UNIQUE, múltiples padres, desvinculación). Commit `b9a23c1`. |
| UI — componente ProjectRelations | ✅ | Sección colapsable "Relacionado con" insertada sobre el despachador de `RightPanel.jsx` (Opción A: un solo componente nuevo, sin tocar los 6 paneles existentes por tipo). Listas "viene de" / "generó" con punto de color por tipo de proyecto, buscador inline para vincular, botón de desvincular por fila. Prototipado primero como mockup visual interactivo y aprobado antes de escribir el código real. Commit `5ecb380`. |
| Sync con Supabase | ✅ | `syncProjectToCloud` extendido con un 4to parámetro `relationsData`, sube filas a `lw_proyecto_relaciones`. Mapeo agregado en `TABLES`/`SUPABASE_COLUMNS` de `syncService.js`. El autosave en `App.jsx` obtiene las relaciones del proyecto activo (`getRelations`) y las transforma al formato `parent_id`/`child_id` antes de sincronizar. Verificado manualmente en el dashboard de Supabase. Commit `55021e0`. |

## Bug crítico — Duplicación de secciones en autosave (corregido, 2026-08-15)

| Aspecto | Detalle |
|---------|---------|
| Síntoma | Una sección llegó a **307 filas duplicadas** en un proyecto real ("CRISTO EL SEGUNDO ADÁN"), detectado por el usuario durante el trabajo de reordenamiento. |
| Causa raíz | `saveSections` generaba un `uuidv4()` nuevo cada vez que veía una sección con ID temporal (`sec-<timestamp>`), pero nunca informaba ese ID real de vuelta al store. La sección seguía en memoria con el ID viejo, así que cada autosave posterior la insertaba como fila nueva en vez de actualizarla — no era un bug nuevo del reorder, sino preexistente en el flujo de autosave, que se hizo más visible al agregar más llamadas a `saveSections`. |
| Fix | `saveSections` ahora devuelve un `idMap` (`oldId` → `newId`). `saveProject` propaga ese retorno. `saveCurrentProject` en el store aplica el mapeo al array de secciones en memoria — el ID cristaliza al real tras el primer guardado, y los autosaves siguientes actualizan en vez de insertar. |
| Verificación | 44/44 tests pasan. Probado manualmente: proyecto nuevo, sección nueva, múltiples autosaves → 1 sola fila por sección. Datos corruptos del proyecto afectado limpiados manualmente en la BD real tras aplicar el fix. Commit `7a116de`. |

## Detalle completo

Ver `.opencode/skills/lemwriter/SKILL.md` para contexto completo del proyecto.
