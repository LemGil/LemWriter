---

description: "Task list for reorder-sections feature implementation"
---

# Tasks: Reordenar Secciones del Proyecto

**Input**: Design documents from `/specs/001-reorder-sections/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Incluidos — el Principio III de la constitución exige tests antes del código de implementación.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths below assume single project (Electron + React, ver plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verificación del entorno existente. No hay scaffolding: el proyecto ya existe y la columna `sections.order_index` ya está en la BD (sin migración, ver data-model.md).

- [ ] T001 Verificar que `sections.order_index` existe en la BD y que `getProject` ordena por `order_index ASC` (grep en `src/services/projectService.js` y `electron/database.js`)
- [ ] T002 Confirmar que `@dnd-kit` NO está en `package.json` (decisión de research.md: DnD nativo HTML5, 0 dependencias nuevas)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Núcleo del reordenamiento — acción del store + tests + wiring. Sin esto ninguna user story funciona.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 [P] Escribir test unitario de la lógica de reordenamiento en `src/__tests__/reorderSections.test.js` (función pura: mover sección a índice objetivo, límites, no-op en extremos y fuera de rango) — DEBE FALLAR antes de T004
- [ ] T004 Implementar action `moveSectionTo(sectionId, targetIndex)` en `src/stores/appStore.js` (reordena `store.sections`; no-op si targetIndex fuera de rango o igual a la posición actual)
- [ ] T005 [P] Wiring en `src/App.jsx`: handler `handleReorderSection(sectionId, targetIndex)` que llama a `store.moveSectionTo`, pasado a `<Sidebar>` como `onReorderSection`
- [ ] T006 [P] Pasar `onReorderSection` desde `src/components/Sidebar/Sidebar.jsx` a `BookTree`, `TeachingTree` y `DevotionalTree`

**Checkpoint**: Foundation ready - `moveSectionTo` testeado y disponible en los tres trees

---

## Phase 3: User Story 1 - Reordenar secciones arrastrando y soltando (Priority: P1) 🎯 MVP

**Goal**: El usuario arrastra una sección con el mouse y la suelta en una nueva posición dentro de su grupo; la lista se reordena al instante.

**Independent Test**: Abrir un proyecto con ≥3 capítulos, arrastrar el capítulo 2 sobre el capítulo 1 y verificar que la lista y el editor reflejan el nuevo orden sin recargar (escenario E2 de quickstart.md).

### Tests for User Story 1 (OPTIONAL - only if tests requested) ⚠️

> **NOTE**: Los tests de lógica ya están en Phase 2 (T003). El DnD es interacción de UI; se valida manualmente vía quickstart E2.

### Implementation for User Story 1

- [ ] T007 [P] [US1] Implementar drag & drop nativo HTML5 en `src/components/Sidebar/BookTree.jsx`: `draggable` en filas, `onDragStart` (guardar id), `onDragOver` (preventDefault solo sobre secciones del mismo grupo), `onDrop` (calcular índice global objetivo y llamar `onReorderSection`), `onDragEnd` (limpiar estado)
- [ ] T008 [P] [US1] Implementar drag & drop nativo HTML5 en `src/components/Sidebar/TeachingTree.jsx` (mismo patrón; grupo = lista completa)
- [ ] T009 [P] [US1] Implementar drag & drop nativo HTML5 en `src/components/Sidebar/DevotionalTree.jsx` (mismo patrón; grupo = lista completa)
- [ ] T010 [US1] Añadir feedback visual de arrastre (clase/opacidad en la fila arrastrada y resaltado del objetivo) en los tres trees, sin romper el clic de selección (`onClick` no debe dispararse tras un drop)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Reordenar secciones con botones de subir/bajar (Priority: P2)

**Goal**: Cada fila del sidebar tiene botones ↑/↓ que mueven la sección una posición dentro de su grupo; deshabilitados en los extremos.

**Independent Test**: Con un proyecto de ≥3 capítulos, hacer clic en "bajar" sobre el primero y verificar que intercambia con el segundo; "subir" sobre el primero no produce cambios (escenario E1 de quickstart.md).

### Implementation for User Story 2

- [ ] T011 [P] [US2] Añadir botones ↑/↓ en cada fila de `src/components/Sidebar/BookTree.jsx` (iconos lucide-react `ChevronUp`/`ChevronDown`; `onReorderSection(id, idx±1)`; deshabilitados en extremos del grupo; `stopPropagation` para no disparar selección)
- [ ] T012 [P] [US2] Añadir botones ↑/↓ en cada fila de `src/components/Sidebar/TeachingTree.jsx` (mismo patrón; extremos = primera/última de la lista)
- [ ] T013 [P] [US2] Añadir botones ↑/↓ en cada fila de `src/components/Sidebar/DevotionalTree.jsx` (mismo patrón; extremos = primera/última de la lista)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Persistencia del orden al cerrar y reabrir (Priority: P2)

**Goal**: El orden reordenado se conserva al cerrar/reabrir el proyecto y la aplicación, y es consistente con las exportaciones.

**Independent Test**: Reordenar, esperar ≥2s (auto-save), cerrar y reabrir el proyecto; verificar que el orden se mantiene (escenario E3 de quickstart.md).

### Implementation for User Story 3

- [ ] T014 [US3] Verificar que el auto-save existente persiste el nuevo orden: tras reordenar, `store.sections` mutado dispara `saveCurrentProject` → `saveSections` reasigna `order_index` (validación manual E3; sin cambios de código si el flujo ya funciona)
- [ ] T015 [US3] Verificar consistencia con exportación: reordenar capítulos y exportar PDF/DOCX/EPUB respetando el nuevo orden (validación manual E5; sin cambios de código si el flujo ya funciona)

**Checkpoint**: All user stories should now be independently functional

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Validación final y documentación

- [ ] T016 [P] Ejecutar `npx vitest run src/__tests__/reorderSections.test.js` y confirmar que pasa (junto con el resto de la suite: `npm test`)
- [ ] T017 Ejecutar la validación end-to-end de `specs/001-reorder-sections/quickstart.md` (escenarios E1–E6) y documentar resultados
- [ ] T018 Actualizar `AGENTS.md` (sección de bugs conocidos / funcionalidad) si aplica, y `specs/001-reorder-sections/spec.md` si la validación revela desviaciones

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 (P1) → US2 (P2) → US3 (P2) secuencialmente en orden de prioridad
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independiente de US1 (misma acción de store, distinta interacción)
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Verificación transversal; depende de que US1/US2 produzcan reordenamientos

### Within Each User Story

- Tests (T003) MUST be written and FAIL before implementation (T004)
- Store action (T004) antes del wiring (T005, T006)
- Trees (T007–T009) antes del feedback visual (T010)
- Story complete before moving to next priority

### Parallel Opportunities

- T003 y T005/T006 pueden correr en paralelo (archivos distintos)
- T007, T008, T009 en paralelo (tres trees, archivos distintos)
- T011, T012, T013 en paralelo (tres trees, archivos distintos)

---

## Parallel Example: User Story 1

```bash
# Launch all tree implementations for User Story 1 together:
Task: "Implementar drag & drop en src/components/Sidebar/BookTree.jsx"
Task: "Implementar drag & drop en src/components/Sidebar/TeachingTree.jsx"
Task: "Implementar drag & drop en src/components/Sidebar/DevotionalTree.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (drag & drop)
4. **STOP and VALIDATE**: Test User Story 1 independently (quickstart E2)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (DnD) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (botones) → Test independently → Deploy/Demo
4. Add User Story 3 (persistencia) → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

Con un solo desarrollador (Principio V), ejecutar en orden de prioridad: US1 → US2 → US3. Los [P] marcan tareas de archivos distintos que pueden delegarse a subagentes si se desea.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (T003 antes de T004)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- **Pendiente de aprobación del usuario**: si se aprueba `@dnd-kit` (Principio I), reemplazar T007–T010 por la integración de `@dnd-kit/sortable` sin tocar store/BD