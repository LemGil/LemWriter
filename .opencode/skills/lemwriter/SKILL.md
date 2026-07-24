---
name: lemwriter
description: Use when working on the LemWriter Electron app — a Christian writing platform (Electron + React + Vite + Tiptap v3 + SQLite). Covers all 6 project types (libro/ensenanza/devocional/estudio/sermon/video), panels, resources, known bugs, and architecture decisions. Also use when migrating data, adding resource types, fixing panels, or troubleshooting export.
---

# LemWriter — Plataforma de Escritura Ministerial

## Stack
- Runtime: Electron
- Frontend: React + Vite
- Editor: Tiptap v3.27.1
- Estilos: TailwindCSS
- Base de datos: better-sqlite3 (SQLite), vía IPC (`window.api.db` desde `preload.js`)
- Exportación PDF: `BrowserWindow.webContents.printToPDF` (Chromium nativo)
- Exportación DOCX: librería `docx` (npm)
- Exportación EPUB: zip manual con `yazl`
- **IA local**: Ollama (endpoint `/api/chat`), modelo default `ibm/granite4:3b`, fast fallback `lfm2.5-1.2b`, CPU-bound sin GPU

## 6 tipos de proyecto

| Tipo | En BD | Home | Template | Panel derecho | Toolbar | Asistente |
|---|---|---|---|---|---|---|
| `libro`/`book` | ✅ | ✅ | classic-novel, bible-commentary, teaching-series | **BookPanel** (Refs, Pers, Palabras, Notas, Estilo) | ✅ Formato | ✅ |
| `ensenanza`/`teaching` | ✅ | ✅ | teaching, series | **TeachingPanel** (Texto, Puntos, Pregs, Palabras) | ✅ Versículo/Ilust/Preg/Aplic | ✅ |
| `devocional`/`devotional` | ✅ | ✅ | devotional | **DevotionalPanel** (Verso, Oración, Aplicación) | ✅ Tiempo lectura | ✅ |
| `estudio`/`study` | ✅ | ✅ | study-basic | **StudyPanel** (Pasajes, Pers, Palabras, Notas, Pregs, Puntos, Temas) | ✅ Versículo/Punto/Aplic/Oración | ✅ |
| `sermon` | ✅ | ✅ | sermon | **❌ NO** | **❌ NO** | **❌ NO** |
| `video` | ✅ | ✅ | video-largo, video-corto | **❌ NO** | **❌ NO** | **❌ NO** |

**Estado:** Sermón y Video se crean, listan y editan (texto plano), pero no tienen panel contextual, botones rápidos en Toolbar, ni asistente de escritura.

## Normalización de tipo (¡CUIDADO! 4 normalizaciones independientes)

Hay 4 lugares distintos que normalizan `type`, cada uno con su propia lógica:

1. **`projectService.createNewProject`**: inglés→español al GUARDAR en BD
2. **`templates/definitions.js` → `normalizeType`**: español→inglés para BUSCAR plantillas
3. **`Home.jsx` → `normalizeTypeId`**: español→inglés para íconos/colores
4. **`RightPanel.jsx`**: acepta ambos (ramas dobles: `"book" \|\| "libro"`)

Regla: **nunca asumas el idioma de `project.type`**. Siempre verifica contra cuál normalización estás trabajando.

## Layout (3 columnas)

```
Sidebar (260px) | Editor (flex) | RightPanel (260px)
   ─ Estructura  |  [toolbar]     |  [panel contextual]
   ─ Recursos    |  [Tiptap]     |  varía por tipo
   ─ Progreso    |  palabras: N  |
```

## Modelo de datos SQLite (actual)

Tablas activas: `projects`, `sections`, `resources`, `project_resources`, `characters`, `notes`, `custom_models`, `book_metadata`.

Tablas ELIMINADAS (no existen): ~~`studies`, `study_sections`, `study_resources`~~ (migradas a proyectos tipo `estudio` en Fase 8).

Columna clave en `sections`: `type` (ej: `texto_base`, `punto`, `capitulo`, `portada`), `bible_reference` (JSON con datos por sección).

## Paneles derecho — cómo almacenan datos

| Panel | Almacenamiento por sección | Ámbito |
|---|---|---|
| **BookPanel → Referencias** | `section.bible_reference` JSON array `[{id, reference, text}]` | Por sección |
| **TeachingPanel → Todo** | `section.bible_reference` JSON `{references, points, questions}` | Por sección |
| **DevotionalPanel → Todo** | `section.bible_reference` JSON `{verse, prayer, application}` | Por sección |
| **StudyPanel → Pasajes** | `section.bible_reference` JSON array `[{id, reference, text}]` | Por sección |
| **StudyPanel → Pregs/Puntos** | `section.bible_reference` JSON `{references, questions, points}` | Por sección |
| **StudyPanel → Notas** | `notes` table via `getNotes(section.id)` | Por sección |
| **Personajes (Book/Study)** | `characters` table via `getCharacters(project.id)` | Por proyecto |
| **Palabras (BibleWordsPanel)** | `resources` table (global) | Por proyecto |

Además, al agregar un recurso desde cualquier panel, también se guarda en la tabla `resources` (global) + `project_resources` (vinculación) para que esté disponible en el apéndice de exportación.

## Tipos de recurso (12 definidos en RESOURCE_FORMATS)

| Tipo | Quién lo crea | Label en filtro |
|---|---|---|
| `pasaje_biblico` | BookPanel, TeachingPanel, StudyPanel | Pasaje Bíblico |
| `palabra_hebrea` | BibleWordsPanel (Book/Teaching), StudyPanel | Palabra Hebrea |
| `palabra_griega` | BibleWordsPanel (Book/Teaching), StudyPanel | Palabra Griega |
| `personaje_biblico` | BookPanel, StudyPanel | Personaje Bíblico |
| `nota_teologica` | BookPanel | Nota Teológica |
| `nota_estudio` | StudyPanel | Nota de Estudio |
| `pregunta_estudio` | StudyPanel | Pregunta de Estudio |
| `punto_estudio` | StudyPanel | Punto de Estudio |
| `tema_doctrinal` | StudyPanel | Tema Doctrinal |
| `ilustracion` | Nadie desde UI | Ilustración |
| `cita_autor` | Nadie desde UI | Cita de Autor |
| `concepto_teologico` | Nadie desde UI | Concepto Teológico |

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

### Flujo de confirmación de referencias

1. **Extracción**: `DetectarReferenciasButton` llama a `window.api.ai.extractReferences({ text, projectId })`.
   - El handler IPC `ai:extract-references` invoca `aiService.extractReferences()` y **automáticamente** INSERTA cada referencia en `detected_references` con `confirmado_por_usuario=0` (sugerencia sin revisar).
   - El frontend recibe el array de referencias y las muestra al usuario.

2. **Revisión**: el usuario ve cada referencia, puede editar el rango de versículos (`versiculo_final`) si el modelo no lo detectó correctamente.

3. **Confirmación**: el usuario hace clic en "Confirmar" → llama a `window.api.ai.confirmReference({ projectId, libro, capitulo, versiculo, versiculo_final })`.
   - El handler `ai:confirm-reference` hace `UPDATE detected_references SET confirmado_por_usuario=1`.
   - **Fallback**: si no existe el registro (UPDATE 0 filas), hace INSERT directo con `confirmado=1`.

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

## Sistema de estilos (2 capas)

**`STYLES_BY_TYPE`** (`src/config/projectStyles.js`): mapea tipo → nombre de estilo.
**`BOOK_STYLES`** (`src/config/bookStyles.js`): mapea nombre → definición completa (tipografía, página, encabezados, etc.)

Ambos deben mantenerse sincronizados. Si se agrega entrada a `STYLES_BY_TYPE` sin su correspondiente en `BOOK_STYLES`, el editor se queda sin variables CSS aplicadas (falla silenciosa).

## Bugs conocidos y pendientes

| Bug | Estado |
|---|---|
| **Bug A** — Estilo por tipo | ✅ Resuelto |
| **Bug B** — Recursos globales entre proyectos | ✅ Resuelto: Sidebar usa `searchResources` cuando hay filtros activos |
| **Plantillas `biography` y `sermon`** | ✅ Resuelto: Agregadas |
| **BookTree: `apendice`** | ✅ Resuelto: renderizado en backMatter |
| **Sermón/Video sin panel** | ✅ Resuelto: SermonPanel + VideoPanel creados |
| **Estadísticas en 0** | ✅ Resuelto: `getProjectStats()` |
| **Búsqueda: clic no abría sección** | ✅ Resuelto: `onOpenSection` |
| **Configuración placeholder** | ✅ Resuelto: SettingsPanel completo |
| **inputRef eliminado** | ✅ Resuelto |
| **Tailwind w-72 duplicado** | ✅ Resuelto |
| **AI service timeout regression** | ✅ Resuelto: `REQUEST_TIMEOUT_MS` corregido a 120_000 |
| **AI service logging** | ✅ Resuelto: `console.time/timeEnd` interno |
| **ai:confirm-reference handler** | ✅ Resuelto: handler IPC + preload + fallback INSERT |

## Exportación

- **PDF**: nativo Electron `printToPDF`. Apéndices: Personajes (libro/estudio) + Recursos usados (libro/ensenanza/estudio).
- **DOCX**: librería `docx`. Tuvo bug de párrafos fusionados → resuelto (spacing entre párrafos).
- **EPUB**: zip manual con `yazl`.

## Archivos clave

| Archivo | Propósito |
|---|---|
| `electron/main.js` | Handlers IPC (db, export, ollama, ai) |
| `electron/preload.js` | Expone `window.api` incluyendo `ollama.*` y `ai.*` |
| `electron/database.js` | Schema SQLite + migraciones |
| `electron/export.js` | Lógica PDF/DOCX/EPUB |
| `electron/ollama.js` | Chat IA interactivo (OllamaChat) |
| `electron/services/aiService.js` | Servicio IA automático (extractReferences, classifyResource) |
| `electron/bible-database.js` | Servicio de consulta bíblica offline (RV1909, solo lectura) |
| `src/App.jsx` | Estado global, orquestación, isChatOpen |
| `src/services/projectService.js` | CRUD central (~30 métodos) |
| `src/services/exportAppendixService.js` | Apéndices de exportación |
| `src/templates/definitions.js` | Plantillas de todos los tipos |
| `src/templates/validationEngine.js` | Reglas del asistente |
| `src/config/projectStyles.js` | STYLES_BY_TYPE |
| `src/config/bookStyles.js` | BOOK_STYLES (definiciones completas) |
| `src/config/resourceFormats.js` | RESOURCE_FORMATS (12 tipos) |
| `src/components/RightPanel/RightPanel.jsx` | Router de paneles derecho |
| `src/components/RightPanel/StudyPanel.jsx` | Panel de Estudio (7 tabs) |
| `src/components/Toolbar/Toolbar.jsx` | Toolbar + botones rápidos |
| `src/components/Sidebar/Sidebar.jsx` | Sidebar (Estructura, Recursos, Progreso) |
| `src/components/Assistant/OllamaChat.jsx` | Panel flotante de chat IA |
| `src/components/Assistant/WritingAssistant.jsx` | Botón flotante IA |
| `src/components/Assistant/DetectarReferenciasButton.jsx` | Botón + UI de detección/confirmación de refs bíblicas |

## Reglas para el agente

- Verificar cada cambio con evidencia real (`grep`/`sqlite3`/build), no asumir éxito.
- No mover archivos de Toolbar, fonts ni componentes que ya existen.
- `fonts.css` se importa desde JS, nunca `@import` en CSS.
- `db.execute()` no retorna `lastInsertRowid` confiable.
- Usar `!important` en reglas CSS del editor (alta especificidad global).
- Scripts standalone de BD deben correr con `ELECTRON_RUN_AS_NODE=1 electron script.mjs`.
- Limpiar scripts de prueba después de usarlos.
- **Ollama**: endpoint `/api/chat`, no `/v1/chat/completions`. `num_ctx: 2048`, `keep_alive: "30m"`.
- **aiService.js** retorna valores directos (no `{value, elapsed}`). Los handlers IPC en `main.js` envuelven en `{success, ...}`.
- **Granite4:3B en CPU** es lento: extractReferences puede tomar 60s+ para textos con varias referencias. No confundir con un colgado.
- **ai:extract-references** ahora auto-INSERTA en `detected_references` con `confirmado=0`. El frontend debe pasar `projectId`.
- **ai:confirm-reference** UPDATEs `confirmado=1` vía WHERE por `(project_id, libro, capitulo, versiculo)`. Si no hay fila, hace INSERT directo.
