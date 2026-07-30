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

## Detalle completo
Ver `.opencode/skills/lemwriter/SKILL.md` para contexto completo del proyecto.
