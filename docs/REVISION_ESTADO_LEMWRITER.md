# Revisión de Estado — LemWriter

**Fecha:** 8 de julio de 2026
**Stack:** Electron + React 19 + Vite 8 + Tiptap 3.27 + TailwindCSS + SQLite (better-sqlite3)
**Compilación:** ✅ 177 módulos, 0 errores

---

## 1. Lo que funciona bien

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| 6 tipos de proyecto | ✅ | libro, enseñanza, devocional, estudio, sermón, video — todos con panel contextual, toolbar y asistente |
| Editor Tiptap | ✅ | Extensiones: StarterKit, Underline, Image, Table, Footnote, ResizableImage |
| Sistema de estilos editoriales | ✅ | 5 estilos completos (manuscrito_clásico, estudio_moderno, libro_ensenanza, devocional_calido, sermon_expositivo) con tipografía, márgenes, headings, blockquotes definidos en `bookStyles.js` |
| Motor de plantillas | ✅ | 9 plantillas con estructura, `designTokens`, `smartRules`, `panelConfig` |
| Validación contextual | ✅ | Reglas determinísticas por tipo+plantilla (longitud de capítulos, detección de exégesis, referencias bíblicas, etc.) |
| Exportación PDF | ✅ | Nativa de Electron (`printToPDF`) con apéndices de personajes y recursos |
| Exportación EPUB | ✅ | Generación artesanal con `yazl` (content.opf, nav.xhtml, CSS, XHTML por sección) |
| Recursos globales | ✅ | Bug B resuelto — los recursos se comparten entre proyectos |
| Estudios como tipo de proyecto | ✅ | Migración completada, ~600 líneas de código legacy eliminadas |
| Menú contextual (clic derecho) | ✅ | Agregado hoy — Cortar/Copiar/Pegar/Eliminar/Seleccionar todo según el contexto |
| Backup automático | ✅ | Backup al iniciar + botón manual, rotación de máximo 10 respaldos |
| Temas visuales | ✅ | 3 temas (claro, sepia, oscuro) sincronizados con DB, columna `theme` por proyecto |
| Dependencias | ✅ | Todas instaladas (incluyendo `lodash`) |

---

## 2. Problemas conocidos (sin resolver)

### 2.1 El editor se recrea en cada cambio de sección
**Archivo:** `src/components/Editor/Editor.jsx` — Línea 108
```jsx
<Editor key={activeSection} ... />
```
Cada vez que se cambia de sección, React destruye y recrea Tiptap desde cero. Esto:
- Pierde el historial undo/redo
- Pierde la posición del cursor
- Causa un flash visual al renderizar
- Es computacionalmente costoso

**Solución:** Reemplazar `key={activeSection}` con `editor.commands.setContent()` para cambiar contenido sin remount.

### 2.2 Estado global frágil en App.jsx
**Archivo:** `src/App.jsx`
- ~15 `useState` individuales para el proyecto (`projectType`, `projectId`, `projectName`, `templateKey`, `designTokens`, `sections`, `activeSection`, etc.)
- `handleConfirmCreate` y `handleOpenProject` duplican exactamente las mismas ~15 asignaciones
- `buildProjectData()` reconstruye manualmente el objeto proyecto — si se agrega un campo nuevo, hay que actualizar 4 lugares

**Solución:** Migrar a `useReducer` con un estado único y acciones tipo `OPEN_PROJECT`, `UPDATE_SECTION`, `SET_STYLE`.

### 2.3 Exportación DOCX pierde formato
**Archivo:** `electron/export.js`
```javascript
const text = s.content.replace(/<[^>]*>/g, '');
// Elimina TODAS las etiquetas HTML
```
El DOCX generado es texto plano sin negritas, cursivas, listas, tablas, citas ni imágenes. La librería `docx` soporta todo eso pero no se está aprovechando.

**Solución:** Parsear HTML y convertirlo a objetos `docx` (`TextRun` con bold/italics, `BulletRun` para listas, `Paragraph` con indentación para blockquotes, etc.).

### 2.4 Sin suite de tests
No hay tests configurados en `package.json`. `validationEngine.js` y los servicios (`projectService.js`) son candidatos ideales para pruebas unitarias.

---

## 3. Pendientes de la Fase 5 (no iniciados)

Según `AGENTS.md`, la Fase 5 incluye funcionalidades planificadas:

| Funcionalidad | Estado | Detalle |
|--------------|--------|---------|
| Búsqueda global | ❌ No iniciada | Buscar texto en todos los proyectos, secciones y recursos |
| Panel de preferencias por proyecto | ❌ No iniciado | UI para cambiar tema (`theme`) por proyecto (columna ya existe en DB) |
| Restaurar respaldo | ❌ No iniciado | UI para seleccionar un backup de la lista y restaurarlo |
| Estadísticas | ❌ No iniciado | Progreso semanal, conteo de palabras por proyecto |

---

## 4. Problemas ya resueltos (historial)

| Problema | Resuelto |
|----------|----------|
| Bug B — Recursos no se compartían entre proyectos | ✅ Sesión anterior |
| DOCX párrafos fusionados | ✅ Sesión anterior |
| Migración Estudios → tipo proyecto | ✅ Sesión anterior |
| Menú contextual (clic derecho) | ✅ Hoy |
| Falta `lodash` en package.json | ✅ Falso positivo, ya estaba instalado |

---

## 5. Recomendaciones por prioridad

| Prioridad | Tarea | Archivos | Esfuerzo | Impacto |
|-----------|-------|----------|----------|---------|
| 🔴 1 | No reiniciar editor al cambiar sección | `Editor.jsx` | ~30 min | Elimina flash visual, preserva undo/redo |
| 🔴 2 | Mejorar exportación DOCX | `electron/export.js` | ~3-4 hrs | DOCX usable con formato real |
| 🟡 3 | Migrar App.jsx a `useReducer` | `App.jsx` | ~2-3 hrs | Reduce bugs al escalar |
| 🟡 4 | Agregar tests unitarios | `validationEngine.js`, `projectService.js` | ~4-5 hrs | Confianza al refactorizar |
| 🟡 5 | UI para restaurar backup | `BackupButton.jsx`, `electron/main.js` | ~1-2 hrs | Protección contra pérdida de datos |
| 🟢 6 | Panel de preferencias por proyecto | `RightPanel.jsx` | ~1-2 hrs | Personalización visual |
| 🟢 7 | Búsqueda global | `projectService.js`, nuevo componente | ~3-4 hrs | Navegación eficiente |
| 🟢 8 | Limpiar secciones "Nueva Sección" vacías | Script one-shot | ~30 min | Orden visual |

---

## 6. Métricas del código

| Métrica | Valor |
|---------|-------|
| Archivos JSX/JS (frontend) | ~25 |
| Componentes React | ~25 |
| Servicios | 5 |
| Plantillas | 9 |
| Estilos editoriales | 5 |
| Handlers IPC | ~25 |
| Bugs conocidos | 3 (secciones 2.1-2.3) |
| Dependencias faltantes | 0 |
| Tests | 0 |
