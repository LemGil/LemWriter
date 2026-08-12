# Contracts: Reordenar Secciones del Proyecto

Fecha: 2026-08-12 | Feature: [spec.md](../spec.md)

App de escritorio (Electron). Los contratos relevantes son los internos del renderer (store ↔ componentes) y el flujo de persistencia existente vía IPC. No se exponen interfaces externas nuevas.

## 1. Contrato de estado: `useAppStore.moveSection`

```js
moveSection(sectionId: string, direction: 'up' | 'down'): void
```

- **Precondición**: `sectionId` existe en `store.sections`.
- **Comportamiento**: intercambia la sección con su vecina inmediata en `store.sections` según `direction`, respetando los límites (no-op en los extremos).
- **Efecto secundario**: al mutar `store.sections`, el auto-save existente (debounce 2s) persiste el nuevo `order_index` vía `projectService.saveProject` → `saveSections`.
- **No cambia**: `activeSection`, contenido de secciones, ni el editor.
- **Testabilidad**: función pura sobre el array; testeable con Vitest sin Electron.

## 2. Contrato de UI: prop `onReorderSection`

```js
onReorderSection(sectionId: string, direction: 'up' | 'down'): void
```

Fluye `App.jsx` → `Sidebar.jsx` → `BookTree/TeachingTree/DevotionalTree`. Cada tree la usa para:
- Botones ↑/↓ de cada fila (deshabilitados en los extremos del grupo).
- Drop de drag & drop (traduce el drop a uno o más movimientos de una posición).

El alcance del movimiento (grupo) lo decide el tree, que conoce la semántica de sus grupos: en `BookTree` un `capitulo` solo intercambia con `capitulo`; en `TeachingTree`/`DevotionalTree` la lista completa es el grupo.

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
