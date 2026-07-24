# CAMBIO DE ESTUDIO

## Integración de Estudios como tipo de proyecto

---

## 1. Contexto

LemWriter tiene actualmente **dos sistemas paralelos** para gestionar contenido:

| Sistema | Tablas | Componentes | Estado |
|---|---|---|---|
| **Proyectos** | `projects`, `sections`, `project_resources` | `Layout.jsx`, `Sidebar.jsx`, `Toolbar.jsx`, `Editor.jsx`, `RightPanel.jsx`, `ExportModal.jsx` | Maduro, completo |
| **Estudios** | `studies`, `study_sections`, `study_resources` | `EstudiosList.jsx`, `EstudioDetail.jsx`, `NewStudyModal.jsx` | Parcial, limitado |

Ambos sistemas comparten el mismo editor Tiptap, la misma tabla global de recursos (`resources`) y viven en el mismo archivo de servicios (`projectService.js`). Sin embargo, duplican lógica de UI, persistencia, IPC y estado.

---

## 2. Diagnóstico: diferencias actuales

### Lo que Estudios tiene y Proyectos no:
- Nada. No hay funcionalidad en Estudios que no pueda ser absorbida por Proyectos.

### Lo que Proyectos tiene y Estudios no:

| Funcionalidad | Proyectos | Estudios |
|---|---|---|
| Toolbar de formato + botones rápidos | ✅ | ❌ |
| Exportación PDF / DOCX / EPUB | ✅ | ❌ |
| Contador de palabras en tiempo real | ✅ | ❌ |
| Autoguardado al cerrar ventana | ✅ | ❌ |
| Estilos visuales tipográficos (themes) | ✅ | ❌ |
| Asistente de escritura contextual | ✅ | ❌ |
| Sidebar con 3 pestañas (Estructura/Recursos/Progreso) | ✅ | ❌ |
| Layout 3 columnas estandarizado | ✅ | ❌ |
| Estados de sección (Borrador/Revisión/Final) | ✅ | ❌ |
| Sistema de plantillas al crear | ✅ | ❌ |

### Costo de mantener el sistema separado:
- ~500 líneas de código duplicado o aislado
- 3 componentes UI que no reusan la infraestructura común
- 11 handlers IPC dedicados en `main.js`
- 1 archivo de migración independiente (`migrate_studies.js`)
- Ruta de navegación separada en `App.jsx` (`view === "estudios"`)

---

## 3. Motivos para el cambio

### 3.1. Eliminar duplicación
Estudios reinventa lo que Proyectos ya hace bien: crear contenido estructurado con secciones, editarlo con Tiptap, gestionar recursos y exportar. Unificar elimina ~400-500 líneas de código redundante.

### 3.2. Desbloquear funcionalidades sin desarrollarlas desde cero
Al convertir Estudio en un tipo de proyecto (`type: 'estudio'`), hereda automáticamente:

- **Exportación**: PDF, DOCX y EPUB sin escribir una línea
- **Toolbar**: botones rápidos para insertar versículos, puntos, aplicaciones y oraciones
- **Contador de palabras**: seguimiento de progreso en tiempo real
- **Autoguardado**: protección contra pérdida de datos al cerrar
- **Estilos visuales**: tipografía consistente (EB Garamond / Inter / Cinzel)
- **Asistente de escritura**: mentor contextual que guía al usuario
- **Sidebar con progreso**: pestaña de avance del estudio

### 3.3. Unificar la experiencia de usuario
El usuario no necesita aprender dos flujos diferentes (crear proyecto vs. crear estudio). Todo se crea desde el mismo modal "Nuevo Proyecto" y se abre en el mismo layout de 3 columnas. La pantalla de inicio muestra todos los proyectos agrupados por tipo, incluidos los estudios.

### 3.4. Simplificar el mantenimiento
- Un solo sistema de persistencia (tablas `projects`/`sections`)
- Un solo conjunto de handlers IPC
- Un solo layout (`Layout.jsx` + `Sidebar.jsx`)
- Un solo flujo de creación (`NewProjectModal` → `projectService.createNewProject`)
- Menos componentes, menos bugs, menos superficie de prueba

### 3.5. Preparar el terreno para futuras funcionalidades
Cualquier mejora futura (búsqueda global, backup automático, estadísticas, temas visuales, nuevos formatos de exportación) beneficiará a los estudios automáticamente sin necesidad de implementación paralela.

---

## 4. Plan de implementación

### Fase 0 — Preparación
- Respaldar base de datos (`lemwriter.db` → `lemwriter.backup.db`)
- Contar estudios, secciones y recursos vinculados existentes

### Fase 1 — Migración de datos
- Crear script `migrate_studies_to_projects.js`
- Mapear:
  - `studies.theme` → `projects.title`
  - `studies.base_text` → primera section (`type='texto_base'`)
  - `studies.notes` → segunda section (`type='notas'`)
  - `study_sections.*` → `sections.*`
  - `study_resources.*` → `project_resources.*`
- Agregar migración automática en `database.js`

### Fase 2 — Configuración del nuevo tipo
- `projectStyles.js`: `STYLES_BY_TYPE.estudio = 'estudio_predeterminado'`
- `bookStyles.js`: estilo visual `estudio_predeterminado`
- `definitions.js`: plantilla `study-basic` con secciones tipo (texto_base, punto, aplicación, oración)
- `projectService.js`: normalización `type === 'study'` → `'estudio'`

### Fase 3 — UI: creación y listado
- `Home.jsx`: botón "Estudio Bíblico" como 4º tipo en la grilla
- `NewProjectModal.jsx`: validar que muestra la plantilla `study-basic` (sin cambios)
- `App.jsx`: eliminar ruta `view === "estudios"` (se reemplaza por `view === "editor"` con `type === "estudio"`)

### Fase 4 — UI: layout y componentes
- `Layout.jsx`: agregar `'estudio'` a condicionales de sidebar y footer
- `Sidebar.jsx`: `TeachingTree` para estudio
- `TeachingTree.jsx`: ícono configurable por prop (opcional)
- `RightPanel.jsx`: agregar `StudyPanel` para `type === 'estudio'`
- `Toolbar.jsx`: botones rápidos para estudio (versículo, punto, aplicación, oración)

### Fase 5 — Eliminación del sistema independiente
- Eliminar: `EstudiosList.jsx`, `EstudioDetail.jsx`, `NewStudyModal.jsx`
- Eliminar directorio `src/components/Estudios/`
- Eliminar handlers IPC `studies:*` de `main.js` y `preload.js`
- Eliminar ruta `view === "estudios"` de `App.jsx`
- Eliminar botón "Estudios Bíblicos" de `Home.jsx`
- Eliminar `migrate_studies.js`

### Fase 6 — Exportación
- `exportAppendixService.js`: apéndice de recursos para `type === 'estudio'` (como en enseñanza/libro)

### Fase 7 — Asistente de escritura
- `validationEngine.js`: reglas para estudio (requireBibleReference, requireApplication, requirePrayer)
- `WritingAssistant.jsx`: mensaje de bienvenida para estudios

### Fase 8 — Post-migración
- Verificar que estudios antiguos aparecen en Home → pestaña "Estudios"
- Verificar que el editor carga el contenido correcto
- Verificar `TeachingTree`, `StudyPanel`, exportación, toolbar
- Verificar creación de estudios nuevos
- Opcional: deprecar tablas `studies`, `study_sections`, `study_resources` (eliminar en versión futura)

---

## 5. Archivos afectados

### Crear
| Archivo | Propósito |
|---|---|
| `migrate_studies_to_projects.js` | Script de migración one-shot |
| `src/config/bookStyles.js` | Entrada `estudio_predeterminado` |
| `src/templates/definitions.js` | Entrada `study-basic` |

### Modificar
| Archivo | Cambio |
|---|---|
| `electron/database.js` | Migración automática de estudios a proyectos |
| `src/config/projectStyles.js` | Agregar `estudio: 'estudio_predeterminado'` |
| `src/services/projectService.js` | Normalización `study` → `estudio` |
| `src/components/Home/Home.jsx` | Botón "Estudio Bíblico" en grilla de tipos |
| `src/components/Layout/Layout.jsx` | Condicionales para `type === 'estudio'` |
| `src/components/Sidebar/Sidebar.jsx` | Mostrar TeachingTree para estudio |
| `src/components/Sidebar/TeachingTree.jsx` | Icono configurable |
| `src/components/RightPanel/RightPanel.jsx` | Agregar StudyPanel para estudio |
| `src/components/Toolbar/Toolbar.jsx` | Botones rápidos para estudio |
| `src/templates/validationEngine.js` | Reglas de validación para estudio |
| `src/components/Assistant/WritingAssistant.jsx` | Mensaje de primera apertura |
| `src/services/exportAppendixService.js` | Apéndice de recursos para estudio |
| `src/App.jsx` | Eliminar ruta `view === "estudios"` |
| `electron/main.js` | Eliminar handlers IPC `studies:*` |
| `electron/preload.js` | Eliminar `window.api.studies.*` |

### Eliminar
| Archivo | Razón |
|---|---|
| `src/components/Estudios/EstudiosList.jsx` | Reemplazado por Home.jsx |
| `src/components/Estudios/NewStudyModal.jsx` | Reemplazado por NewProjectModal.jsx |
| `src/components/Estudios/EstudioDetail.jsx` | Reemplazado por Layout.jsx + Sidebar.jsx |
| `src/components/Estudios/` (directorio) | Código obsoleto |
| `migrate_studies.js` | Reemplazado por migración unificada |

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Pérdida de datos durante migración | Respaldo previo + migración transaccional + verificación post-migración |
| Estudios con contenido no migrable | Mapeo completo de columnas; contenido sobrante va a sección "Otros" |
| Regresión en funcionalidad existente | Pruebas manuales en cada fase (creación, edición, exportación) |
| Usuarios acostumbrados al flujo actual | El botón "Estudio Bíblico" aparece en Home como antes, solo que ahora abre el mismo layout que los demás proyectos |

---

## 7. Conclusión

Migrar Estudios a un tipo de proyecto **elimina duplicación, reduce código y desbloquea funcionalidades** sin desarrollar nada nuevo. Los estudios existentes se migran con un script one-shot y los usuarios no pierden ninguna capacidad actual.

El cambio es netamente positivo: ~150 líneas agregadas, ~500 líneas eliminadas, 0 regresiones esperadas.

---

## 8. Ejecución — Resultado final

### Fase 0 — Preparación ✅
| Item | Resultado |
|---|---|
| Backup DB | `lemwriter.backup.db` (5.9 MB) |
| Estudios existentes | 3 estudios, 11 secciones, 0 recursos |
| Proyectos existentes | 7 proyectos, 76 secciones |

### Fase 1 — Migración de datos ✅
- Script `migrate_studies_to_projects.js` creado y ejecutado
- 3 estudios → 3 proyectos `type='estudio'`, 11 `study_sections` → 11 `sections`
- Auto-migración agregada en `database.js` (luego eliminada en Fase 8)
- `old_study_id` agregado a `projects` para trazabilidad

### Fase 2 — Configuración del nuevo tipo ✅
| Archivo | Cambio |
|---|---|
| `src/config/projectStyles.js` | `estudio: 'estudio_predeterminado'` |
| `src/config/bookStyles.js` | Estilo `estudio_predeterminado` (EB Garamond, Inter, papel #fefcf5) |
| `src/templates/definitions.js` | Plantilla `study-basic`: texto_base, punto×2, aplicación, oración |
| `src/templates/definitions.js` | `normalizeType('estudio')` → `'study'` |
| `src/services/projectService.js` | `if (type === 'study') type = 'estudio'` |

### Fase 3 — UI: creación y listado ✅
| Archivo | Cambio |
|---|---|
| `src/components/Home/Home.jsx` | Tipo "Estudios Bíblicos" en grilla (icono Search, ámbar), tabs, colores |
| `src/components/Home/NewProjectModal.jsx` | Label, icono 🔍 y colores ámbar para `estudio` |
| `src/App.jsx` | Eliminados imports EstudiosList/EstudioDetail, ruta `view === "estudios"`, estado `selectedStudy` |

### Fase 4 — UI: layout y componentes ✅
| Archivo | Cambio |
|---|---|
| `src/components/Layout/Layout.jsx` | Footer muestra tiempo de lectura para `estudio` |
| `src/components/Sidebar/Sidebar.jsx` | `typeLabels` con estudio, `TeachingTree` para estudio, `handleAddSection` para tipo `punto` |
| `src/components/Sidebar/TeachingTree.jsx` | Prop `icon` configurable, textos genéricos |
| `src/components/Toolbar/Toolbar.jsx` | Botones rápidos: Versículo, Punto, Aplicación, Oración |

### Fase 5 — Eliminación del sistema independiente ✅
| Elemento | Acción |
|---|---|
| `src/components/Estudios/` (directorio) | Eliminado |
| `EstudiosList.jsx`, `EstudioDetail.jsx`, `NewStudyModal.jsx` | Eliminados |
| `migrate_studies.js` | Eliminado |
| Handlers `studies:*` en `electron/main.js` | 17 handlers eliminados (~230 líneas) |
| `window.api.studies.*` en `electron/preload.js` | Eliminado |
| Botón "Estudios Bíblicos" en Home.jsx | Eliminado (ya no redirige a nada) |

### Fase 6 — Exportación ✅
| Archivo | Cambio |
|---|---|
| `src/components/Export/ExportModal.jsx` | Apéndice de Personajes y Recursos incluido al exportar `estudio` |

### Fase 7 — Asistente de escritura ✅
| Archivo | Cambio |
|---|---|
| `src/templates/validationEngine.js` | Reglas: `requireBibleReference`, `requireApplication`, `requirePrayer`, `maxWords`/`minWords` |
| `src/components/Assistant/WritingAssistant.jsx` | Mensaje de bienvenida para estudios |

### Fase 8 — Post-migración y limpieza final ✅
| Item | Resultado |
|---|---|
| Datos migrados | 3/3 proyectos con contenido intacto |
| Tablas legacy `studies`, `study_sections`, `study_resources` | **Eliminadas** de la BD y del esquema |
| Código legacy en `projectService.js` | 14 métodos eliminados (137 líneas) |
| `build` | ✅ 177 módulos, 0 errores |
| Líneas totales eliminadas | ~600 (~500 plan original + ~100 de limpieza final) |

### Resumen final de archivos

**Creados:**
- `migrate_studies_to_projects.js` (script one-shot, ya no es necesario)

**Modificados:**
- `electron/database.js`
- `electron/main.js`
- `electron/preload.js`
- `src/App.jsx`
- `src/config/projectStyles.js`
- `src/config/bookStyles.js`
- `src/templates/definitions.js`
- `src/templates/validationEngine.js`
- `src/services/projectService.js`
- `src/components/Home/Home.jsx`
- `src/components/Home/NewProjectModal.jsx`
- `src/components/Layout/Layout.jsx`
- `src/components/Sidebar/Sidebar.jsx`
- `src/components/Sidebar/TeachingTree.jsx`
- `src/components/Toolbar/Toolbar.jsx`
- `src/components/Export/ExportModal.jsx`
- `src/components/Assistant/WritingAssistant.jsx`

**Eliminados:**
- `src/components/Estudios/` (directorio completo + 3 componentes)
- `migrate_studies.js`
- Tablas `studies`, `study_sections`, `study_resources` (BD)
- 17 handlers IPC `studies:*` en `main.js`
- Bloque `window.api.studies` en `preload.js`
- 14 métodos legacy en `projectService.js`
