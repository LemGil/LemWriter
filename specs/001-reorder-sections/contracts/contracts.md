# Contracts: Reordenar Secciones del Proyecto

Fecha: 2026-08-12 | Feature: [spec.md](../spec.md)

App de escritorio (Electron). Los contratos relevantes son los internos del renderer (store ↔ componentes) y el flujo de persistencia existente vía IPC. No se exponen interfaces externas nuevas.

## 1. Contrato de estado: `useAppStore.moveSectionTo`

```js
moveSectionTo(sectionId: string, targetIndex: number): void
```

- **Precondición**: `sectionId` existe en `store.sections`; `targetIndex` ∈ `[0, sections.length - 1]`.
- **Comportamiento**: reordena el array de forma que la sección quede en `targetIndex` (los elementos intermedios se desplazan). No-op si `targetIndex` coincide con la posición actual o está fuera de rango.
- **Cubre ambos gestos**: botones ↑/↓ (`targetIndex = posición ± 1`) y drag & drop (`targetIndex = posición del objetivo`).
- **Efecto secundario**: al mutar `store.sections`, el auto-save existente (debounce 2s) persiste el nuevo `order_index` vía `projectService.saveProject` → `saveSections`.
- **No cambia**: `activeSection`, contenido de secciones, ni el editor.
- **Testabilidad**: función pura sobre el array; testeable con Vitest sin Electron.

## 2. Contrato de UI: prop `onReorderSection`

```js
onReorderSection(sectionId: string, targetIndex: number): void
```

Fluye `App.jsx` → `Sidebar.jsx` → `BookTree/TeachingTree/DevotionalTree`. Cada tree la usa para:
- Botones ↑/↓ de cada fila (`targetIndex = índice vecino`; deshabilitados en los extremos del grupo).
- Drop de drag & drop (`targetIndex = índice del objetivo dentro del grupo`).

El alcance del movimiento (grupo) lo decide el tree, que conoce la semántica de sus grupos: en `BookTree` un `capitulo` solo puede caer entre `capitulo`s; en `TeachingTree`/`DevotionalTree` la lista completa es el grupo. Para traducir un índice de grupo a índice global, el tree mapea la posición dentro de su array filtrado a la posición real en `store.sections`.

## 3. Contrato de persistencia (existente, sin cambios)

| Paso | Mecanismo | Contrato |
|---|---|---|
| Lectura | `projectService.getProject(id)` | `SELECT * FROM sections WHERE project_id = ? ORDER BY order_index ASC` |
| Escritura | `projectService.saveProject(project)` → `saveSections(sections)` | Reasigna `order_index = índice del array` en cada `UPDATE sections` |
| Auto-save | `App.jsx` debounce 2s → `store.saveCurrentProject()` | Dispara en cualquier cambio de `store.sections` |

## 4. Fuera de contrato (no incluido en este feature)

- Movimiento entre proyectos.
- Drag & drop táctil (la API HTML5 nativa es de mouse; ver research.md — `@dnd-kit` si se aprueba la dependencia).
- Undo/redo del reordenamiento.
