# Implementation Plan: Reordenar Secciones del Proyecto

**Branch**: `001-reorder-sections` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-reorder-sections/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

El usuario reordena las secciones del panel lateral de dos formas: arrastrando y soltando (drag & drop) o con botones subir/bajar. El nuevo orden se refleja al instante en el panel lateral (que renderiza desde `store.sections`) y el editor no cambia de sección (el editor se vincula por `sectionId`, no por posición). El orden se persiste vía el mecanismo existente: auto-save → `projectService.saveProject` → `saveSections` → columna `order_index` en SQLite, y se restaura al reabrir porque `getProject` ordena por `order_index ASC`.

No se requiere migración de BD: la columna `sections.order_index` ya existe y ya es respetada por `getProject`, `saveProject`/`saveSections` y las exportaciones (que usan el orden del array).

## Technical Context

**Language/Version**: JavaScript (ESM), Node/Electron 42, React 19, Vite 8

**Primary Dependencies**: Electron, React, Tiptap v3.27.1 (editor), better-sqlite3 (BD), Zustand (store), lucide-react (iconos), TailwindCSS (estilos). **@dnd-kit NO está instalado** — se usará drag & drop nativo HTML5 (ver Constitution Check).

**Storage**: SQLite vía better-sqlite3 (proceso main, IPC). Tabla `sections` con columna `order_index` existente. Sin migración.

**Testing**: Vitest + jsdom. Conocido: los tests de `projectService.test.js` están bloqueados por ABI de better-sqlite3 (deuda D3). Los tests del reorder serán de lógica pura en el store/renderer.

**Target Platform**: Desktop Linux/Windows/macOS (Electron)

**Project Type**: desktop-app (Electron + React)

**Performance Goals**: El reordenamiento debe verse reflejado en el panel lateral inmediatamente (<300ms percepción), sin recarga.

**Constraints**: Principio Stack de la constitución: no agregar dependencias npm sin aprobación explícita. El editor no debe remontarse ni perder contenido. Persistencia vía el flujo de guardado existente (auto-save 2s).

**Scale/Scope**: App de escritorio de un solo desarrollador. Proyectos con decenas de secciones como máximo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Stack** — ✅ PASSA: sin dependencias nuevas. Drag & drop nativo HTML5 (API del navegador). Tiptap v3 no se toca.
- **II. Estabilidad** — ✅ PASSA: sin migración de BD (columna `order_index` ya existe); editor no se remonta (se vincula por `sectionId`); documentos existentes no se alteran.
- **III. Calidad** — ✅ PASSA: criterios de aceptación del spec (SC-001 a SC-005) verificables; test unitario de la lógica de reordenamiento del store.
- **IV. Arquitectura** — ✅ PASSA: cambios solo en renderer (store + componentes). Sin acceso directo al filesystem; la BD se sigue tocando solo vía IPC/`projectService`.
- **V. Solo Developer** — ✅ PASSA: la solución más simple es la nativa; un único action nuevo en el store; cero librerías nuevas que mantener.

**Decisión sobre @dnd-kit (necesita confirmación del usuario)**: el input del usuario dice "Usar @dnd-kit si no está instalado, o la solución más simple con las librerías ya presentes". `@dnd-kit` NO está en `package.json`, y el Principio I exige aprobación explícita para agregar dependencias. Default elegido: **drag & drop nativo HTML5** (0 dependencias). Si el usuario aprueba explícitamente la dependencia, el plan es compatible: el DnD nativo se reemplaza por `@dnd-kit` sin tocar store/BD.

## Project Structure

### Documentation (this feature)

```text
specs/001-reorder-sections/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── stores/
│   └── appStore.js              # + action `moveSection(sectionId, direction)`
├── components/
│   ├── App.jsx                  # wiring: `handleReorderSection` → store
│   ├── Sidebar/
│   │   ├── Sidebar.jsx          # pasa `onReorderSection` a los trees
│   │   ├── BookTree.jsx         # DnD nativo + botones ↑/↓ (reordenar dentro del grupo)
│   │   ├── TeachingTree.jsx     # DnD nativo + botones ↑/↓
│   │   └── DevotionalTree.jsx   # DnD nativo + botones ↑/↓
│   └── Editor/
│       └── Editor.jsx           # SIN CAMBIOS (ya se actualiza por `sectionId`)
```

**Structure Decision**: Single project (DEFAULT). Los archivos a modificar ya existen; el reordenamiento es una acción del store existente (`appStore.js`) más props nuevas en los componentes del sidebar. El editor no requiere cambios.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Sin violaciones. Nota de trazabilidad (no es una violación): la elección de DnD nativo sobre @dnd-kit se documenta en research.md y queda pendiente de aprobación explícita del usuario si prefiere la dependencia.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (ninguna) | — | — |
