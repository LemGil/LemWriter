# LemWriter — Plataforma de Escritura Ministerial

## Stack
- Electron + React + Vite
- Editor: Tiptap v3.27.1
- Estilos: TailwindCSS
- BD: better-sqlite3 (SQLite, vía IPC)
- Exportación: PDF (Chromium nativo), DOCX (librería `docx`), EPUB (yazl)
- IA local: Ollama (endpoint `/api/chat`), modelo por defecto `ibm/granite4:3b`, fast fallback `lfm2.5-1.2b`

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
| Errores corregidos | ✅ | `inputRef` restaurado; conflicto de clases Tailwind en panel derecho resuelto. |

## Pendiente
1. **Restaurar respaldo** — UI para seleccionar y restaurar un backup desde la lista
2. **Toolbar contextual** — Botones específicos para sermon/video
3. **Testing** — No hay suite de tests configurada
4. **Mejorar aspecto de paneles colapsados** — Mostrar iconos pequeños dentro de sidebars/paneles cuando están colapsados, en lugar de solo espacio vacío
5. **Conectar AI service a la UI** — ✅ `ai:confirm-reference` handler implementado y expuesto en preload. `DetectarReferenciasButton.jsx` es el componente frontend (aún por integrar en Editor.jsx).
6. **OllamaChat: indicador de carga con tiempo transcurrido** — El spinner no muestra cuánto lleva esperando (crítico en CPU lento porque 30s+ de espera sin feedback parece colgado).
7. **DetectarReferenciasButton.jsx** — Integrar en la toolbar del editor (Tiptap). El componente existe pero no está montado en Editor.jsx.

## Detalle completo
Ver `.opencode/skills/lemwriter/SKILL.md` para contexto completo del proyecto.
