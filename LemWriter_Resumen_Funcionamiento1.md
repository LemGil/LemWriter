# LemWriter — Resumen de Funcionamiento

> Estado al 4 de julio de 2026, después de la migración de Estudios a `type: 'estudio'`,
> resolución del Bug B (recursos globales), fix de exportación DOCX y limpieza de Toolbar.

---

## 1. Qué es

LemWriter es una aplicación de escritorio (Electron) para producción de contenido ministerial: libros, enseñanzas, devocionales, sermones, guiones de video y estudios bíblicos, con una biblioteca compartida de recursos (pasajes, palabras hebreo/griego, personajes, notas teológicas) reutilizable entre todos los proyectos.

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Runtime | Electron 42.5.0 |
| Frontend | React 19.2.7 + Vite |
| Editor de texto | Tiptap v3.27.1 |
| Estilos | TailwindCSS |
| Base de datos | SQLite local vía `better-sqlite3` |
| Exportación PDF | Puppeteer (Electron `printToPDF`) |
| Exportación DOCX | librería `docx` |
| Exportación EPUB | `yazl` (ZIP) |

## 3. Los 6 tipos de proyecto

Todo contenido en LemWriter es un **Proyecto** (`projects`), diferenciado por `type`:

| Tipo | Notas |
|---|---|
| `libro` | Capítulos, con Materias Previas/Finales (portada, prólogo, conclusión, etc.) |
| `ensenanza` | Clases con estructura fija por sección (Texto Base, Objetivo, Puntos, Aplicación, Preguntas) |
| `devocional` | Reflexiones diarias cortas |
| `sermon` | Guiones de predicación |
| `video` | Dos formatos: `largo`/`corto`, cada uno con su plantilla |
| `estudio` | **El más reciente** — investigación bíblica libre, estructurada en partes agregables manualmente (como Enseñanza), pensada como semillero de contenido reutilizable para los demás tipos |

Cada tipo tiene su propia plantilla inicial (`src/templates/definitions.js`), su propio estilo tipográfico por defecto, y su propio panel de herramientas en la columna derecha.

## 4. Arquitectura de pantalla — Layout de 3 columnas

Todo proyecto abierto usa el mismo esqueleto (`Layout.jsx`):

```
┌─────────────────────────────────────────────┐
│  Header: ← volver | título editable | Guardar/Exportar │
├──────────┬──────────────────────┬─────────────┤
│ Sidebar  │   Toolbar            │             │
│ (árbol   ├──────────────────────┤ Panel       │
│  de      │                      │ derecho     │
│ secciones│   Editor (Tiptap)    │ contextual  │
│  por     │                      │ (por tipo)  │
│  tipo)   │                      │             │
└──────────┴──────────────────────┴─────────────┘
│  Footer: palabras · caracteres · tiempo lectura │
└─────────────────────────────────────────────┘
```

- **Sidebar** (`Sidebar.jsx`): 3 pestañas — Estructura (árbol de secciones, distinto por tipo: `BookTree`, `TeachingTree`, `DevotionalTree`), Recursos (los ya vinculados a este proyecto), Progreso.
- **Toolbar** (`Toolbar.jsx`): formato de texto estándar — historial, negrita/cursiva/subrayado/tachado, títulos H1-H6, listas, cita, código, separador, limpiar formato, insertar imagen/nota al pie/tabla. (Los botones rápidos específicos por tipo que existían antes —Versículo/Ilustración/Pregunta/Aplicación para Enseñanza, Versículo/Punto/Aplicación/Oración para Estudio— fueron eliminados por decisión del usuario.)
- **Editor** (`Editor.jsx`): Tiptap, con extensión personalizada de nota al pie (`FootnoteComponent.jsx`, node view de React) y de imagen redimensionable.
- **Panel derecho** (`RightPanel.jsx`): distinto por tipo — `BookPanel` (Referencias, Personajes, Palabras, Notas, Estilo), `TeachingPanel`, `DevotionalPanel`, `StudyPanel`. Cada uno permite crear un Recurso nuevo (`createResource`) que queda disponible globalmente.

## 5. Biblioteca de Recursos (global, compartida entre todos los proyectos)

Tabla `resources`, con columna `type` flexible (`pasaje_biblico`, `personaje_biblico`, `palabra_hebrea`/`palabra_griega`, `nota_teologica`, y otros). Vinculación a un proyecto específico vía `project_resources`.

**Importante:** los recursos son visibles desde **cualquier** proyecto, sin importar dónde se crearon — esto fue el "Bug B", ya resuelto. Un Personaje creado mientras se investiga un Estudio aparece disponible al escribir después una Enseñanza o un Sermón sobre el mismo tema.

## 6. Exportación

Tres formatos desde `ExportModal.jsx` → `electron/export.js`:
- **PDF**: vía `printToPDF` de Electron (márgenes en pulgadas, header/footer con `headerTemplate`/`footerTemplate`, API moderna post-Electron v20).
- **DOCX**: parser propio de HTML → elementos `docx` (`htmlToDocxElements`/`segmentBlocks`), soporta títulos, listas, tablas, citas, notas al pie.
- **EPUB**: generación manual de estructura ZIP con `yazl`, TOC vía `nav.xhtml`.

Apéndices automáticos: Personajes (solo Libro) y Bibliografía de Recursos usados (Libro y Enseñanza, y ahora también Estudio).

## 7. Base de datos — tablas principales

`projects`, `sections`, `characters`, `notes`, `resources`, `project_resources`. (Las tablas `studies`/`study_sections`/`study_resources` del sistema anterior de Estudios ya no existen — fueron eliminadas al migrar Estudio a ser un `type` de proyecto normal.)

## 8. Pendientes conocidos a la fecha

- ~48 secciones "Nueva Sección" vacías intercaladas en al menos un proyecto real (limpieza pendiente).
- Confirmar si persiste duplicación de lógica entre `projectService.js` y `main.js` en los handlers de `estudio`.
- Advertencia de consola `Duplicate extension names found: ['underline']` en Tiptap — no rompe nada hoy, pero señala una extensión registrada dos veces en `Editor.jsx`.
- Fase 5 del roadmap original (búsqueda global, temas visuales, estadísticas, backup automático) no iniciada.
