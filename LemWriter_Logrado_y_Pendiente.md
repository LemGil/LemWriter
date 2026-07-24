# LemWriter — Logrado y Pendiente (v2)

> Consolidado a partir de: `LemWriter_Logrado_y_Pendiente.md` (v1, 2 de julio de 2026),
> `LemWriter_Arquitectura_y_Funcionamiento.md`, y la sesión del 3-4 de julio de 2026
> (diseño y posterior refactor completo del sistema de Estudios Bíblicos, resolución
> del Bug B, fix de exportación DOCX). Donde una fuente contradice a otra más reciente,
> se prioriza la más reciente y se aclara.
> Última actualización: 4 de julio de 2026.

---

## 1. Cambio arquitectónico principal de esta sesión: Estudios Bíblicos

### 1.1 — Lo que se construyó primero (y luego se reemplazó)

Durante gran parte de la sesión se diseñó e implementó, paso a paso y con verificación manual en cada fase, un **sistema paralelo e independiente** para Estudios Bíblicos:

- Tablas propias: `studies`, `study_sections`, `study_resources`
- Componentes propios: `EstudiosList.jsx`, `EstudioDetail.jsx`, `NewStudyModal.jsx`
- 17 handlers IPC dedicados (`studies:*`) en `main.js`/`preload.js`
- Layout de 3 columnas propio, con árbol de secciones tipo Enseñanza y una columna derecha planeada para 8 tipos de recursos (Texto Base, Referencias, Preguntas, Palabras, Temas, Personajes, Puntos, Notas)

Esto llegó a funcionar (backend + IPC verificados de punta a punta con datos reales, navegación y creación funcionando, estructura de secciones tipo Enseñanza operativa) pero **nunca se completó la columna derecha de recursos** antes de que se tomara la decisión de cambiar de enfoque.

### 1.2 — Decisión de refactor (aprobada explícitamente por el usuario)

Un análisis posterior (con DeepSeek) identificó que este sistema paralelo duplicaba ~500 líneas de infraestructura que el sistema de Proyectos ya tenía madura (toolbar, exportación PDF/DOCX/EPUB, autoguardado, contador de palabras, estilos visuales, asistente de escritura, plantillas). El usuario aprobó conscientemente convertir Estudio en un **quinto `type` de proyecto** (`'estudio'`, junto a Libro/Enseñanza/Devocional/Sermón/Video) en vez de mantenerlo como sistema aparte.

**Trade-off discutido y resuelto explícitamente:** este cambio elimina la posibilidad de un vínculo formal "un Estudio → muchos Proyectos derivados" (que era la visión original planteada al inicio de la sesión). El usuario confirmó que esto no es una pérdida real, porque el objetivo de fondo —que el conocimiento generado en un Estudio (puntos, notas, palabras originales, personajes) esté disponible para cualquier proyecto posterior— se resuelve igual de bien a través de la **biblioteca de Recursos compartida**, siempre que los recursos sean verdaderamente globales entre proyectos (ver Bug B, sección 2).

### 1.3 — Estado final de la migración (ejecutado y verificado)

| Fase | Resultado |
|---|---|
| Backup | `lemwriter.backup.db` (5.9 MB) antes de migrar |
| Migración de datos | 3 estudios existentes → 3 proyectos `type='estudio'`, 11 `study_sections` → 11 `sections`, contenido verificado intacto |
| Config del nuevo tipo | Estilo visual propio (`estudio_predeterminado`, EB Garamond/Inter), plantilla `study-basic` (texto_base, punto×2, aplicación, oración) |
| UI | "Estudios Bíblicos" como 4º/5º tipo en la grilla de Home, mismo `NewProjectModal`, mismo `Layout.jsx` de 3 columnas que el resto |
| Sidebar/Panel derecho | `TeachingTree` reutilizado para la estructura; `StudyPanel` agregado a `RightPanel.jsx` |
| Toolbar | Botones rápidos propios: Versículo, Punto, Aplicación, Oración |
| Exportación | Hereda PDF/DOCX/EPUB sin código nuevo; apéndices de Personajes/Recursos incluidos |
| Asistente de escritura | Reglas de validación propias (`requireBibleReference`, `requireApplication`, `requirePrayer`) |
| Limpieza | Sistema viejo eliminado por completo: `src/components/Estudios/` (directorio + 3 componentes), `migrate_studies.js`, tablas `studies`/`study_sections`/`study_resources` (ya no existen en el schema), 17 handlers IPC `studies:*`, 14 métodos legacy en `projectService.js` (~600 líneas netas eliminadas) |
| Build final | ✅ 177 módulos, 0 errores |

**Nota para sesiones futuras:** si se encuentra código o documentación que hable de `window.api.studies.*`, `EstudioDetail.jsx`, o las tablas `studies`/`study_sections`/`study_resources`, es referencia al sistema viejo ya eliminado. El Estudio Bíblico de hoy es un proyecto normal con `type: 'estudio'`.

---

## 2. Bug B — Recursos compartidos entre proyectos: **RESUELTO**

Pendiente desde hacía varias sesiones (documentado en `AGENTS.md` y en la v1 de este documento). `getProjectResources` filtraba estrictamente por `project_id`; ahora los recursos son verdaderamente globales y visibles desde cualquier proyecto, sin importar dónde se crearon. Confirmado por el usuario tras la sesión de refactor. Esta resolución es la que sostiene, en la práctica, el objetivo original de "investigar una vez en el Estudio, reutilizar en cualquier proyecto después".

---

## 3. Exportación DOCX — párrafos fusionados: **RESUELTO**

### Síntoma
Al exportar a DOCX, las secciones se separaban correctamente (título + salto de página por capítulo), pero dentro de cada sección todos los `<p>` quedaban visualmente fusionados en un solo bloque de texto corrido.

### Proceso de diagnóstico (para referencia futura ante bugs similares)
1. Se revisó `htmlToDocxElements`/`segmentBlocks`/`extractBlockContent` línea por línea contra HTML real extraído de SQLite — el trazado manual no encontró el fallo.
2. Se aplicó la prueba definitiva: exportar, renombrar el `.docx` a `.zip`, descomprimirlo, y contar `<w:p>` y `<w:br>` directamente en `word/document.xml`. Resultado: 17 `<w:p>` reales, 0 `<w:br>` — esto descartó de raíz las hipótesis de "un solo párrafo con saltos manuales" o "reuso de un mismo objeto `Paragraph`".
3. Con el código de `addParagraph()` y el ensamblado de `children[]` ya revisados y descartados como causa, el problema se aisló y resolvió consultando el estilo/spacing aplicado a los párrafos generados.

**Lección de proceso, válida para cualquier bug de exportación futuro:** cuando el rastreo manual de código no encuentra el fallo, abrir el artefacto final (DOCX/EPUB son ZIPs; el XML no miente) es más confiable y más rápido que seguir revisando funciones a ojo.

---

## 4. Otros hallazgos de la sesión (de un análisis externo, verificados uno por uno)

Durante la sesión se recibieron dos análisis externos completos del código (uno enfocado en la visión de producto de Estudios, otro en calidad de código/bugs). Se verificó cada hallazgo contra el código real antes de aceptarlo — dos de los "bugs críticos" reportados resultaron ser **falsas alarmas** sobre código ya corregido en sesiones previas:

- ❌ "`lodash` falta en `package.json`" — falso, ya estaba declarado e instalado.
- ❌ "Bug de `8 values for 7 columns` en `migrateFromLocalStorage`" — falso, ya corregido en sesión anterior; el INSERT tiene 8 columnas y 8 placeholders correctamente.

**Lección de proceso:** ni los análisis automatizados de terceros están exentos de reportar información desactualizada. La misma disciplina de verificación empírica (grep/sqlite3/prueba manual) aplica también a los reportes de auditoría, no solo a "el agente de código dice que terminé".

Hallazgo real y aún sin resolver: **duplicación de lógica de negocio entre `projectService.js` y `main.js`** en al menos un caso confirmado (la validación de bloqueo de borrado de Estudio, antes de la migración, existía reimplementada en ambos archivos). Vale la pena revisar si el mismo patrón de duplicación persiste en los handlers de `type: 'estudio'` post-refactor.

---

## 6. Bug de estadísticas en vista Home (Palabras/Secciones): **RESUELTO**

### Síntoma
Los contadores de "Palabras" y "Secciones" en la vista `Home` mostraban valores incorrectos o no se actualizaban, debido a que los datos de `recentProjects` solo contenían metadatos básicos y no la lista de secciones necesaria para realizar el cálculo.

### Acciones ejecutadas
1. Modificación de `Home.jsx` para gestionar la carga asíncrona de los detalles completos de los proyectos recientes.
2. Implementación de un `useEffect` que, al cargar los proyectos, obtiene los detalles completos (incluyendo secciones) mediante `projectService.getProject`.
3. Ajuste de las funciones `totalWords` y `totalSections` para operar sobre los datos completos de los proyectos cargados.
4. Verificación de integridad estructural del componente `Home` para evitar errores de renderizado.


### Encontrado en el camino, no resuelto
- **~48 secciones tituladas "Nueva Sección" (vacías o casi vacías), intercaladas dentro del proyecto real "¡VOCES EN LA CARRETERA!"**, entre capítulos con contenido real. El `order_index` está limpio y correlativo (no hay bug de ordenamiento), pero estas secciones basura probablemente contribuyen a una sensación de "documento desordenado" al exportar o navegar el árbol de Estructura. Requiere limpieza manual o un pequeño script que identifique y elimine secciones con `title = 'Nueva Sección' AND (content IS NULL OR content = '')`.

### Heredados de la v1, sin cambios
- Migración de proyectos Enseñanza/Devocional viejos con secciones "Nueva Sección" sin revisar — mismo síntoma que el punto anterior, posiblemente relacionado o parte del mismo problema de fondo (secciones placeholder que nunca se limpiaron al usarse la plantilla).
- Posible doble padding en el editor cuando `designTokens` y `projectStyle` conviven — nunca confirmado visualmente, no verificado en esta sesión.
- Fase 5 del plan original (búsqueda global, temas visuales, estadísticas, backup automático) — no iniciada.
- Extensión de estilos de editor personalizados por el usuario — pospuesta a v2.

### Nuevo, de esta sesión
- Confirmar si la duplicación `projectService.js`/`main.js` (sección 4) persiste en los handlers actuales de `type: 'estudio'`.

---

## 6. Nota sobre proceso de trabajo (reforzada esta sesión)

Se reafirma la práctica ya establecida —verificar cada cambio con comandos reales (`grep`, `sqlite3`, prueba manual en la app) antes de aceptar cualquier reporte de finalización— y se agregan dos refuerzos de esta sesión:

1. **La verificación empírica también aplica a documentos de análisis/auditoría de terceros**, no solo a reportes de agentes de código. Un análisis puede estar mirando una versión desactualizada del código y reportar bugs ya resueltos como si fueran críticos.
2. **Ante un bug de exportación (o cualquier formato de archivo binario/empaquetado) que resista el rastreo manual de código, abrir el artefacto final generado es más confiable que seguir leyendo funciones.** DOCX y EPUB son archivos ZIP; el XML interno es la fuente de verdad definitiva sobre qué se generó realmente, sin intermediarios de interpretación.
