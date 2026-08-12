# Research: Reordenar Secciones del Proyecto

Fecha: 2026-08-12 | Feature: [spec.md](./spec.md)

## 1. Drag & drop: @dnd-kit vs HTML5 nativo

- **Decision**: Drag & drop nativo HTML5 (`draggable`, `onDragStart`, `onDragOver`, `onDrop`), sin dependencias nuevas.
- **Rationale**: `@dnd-kit` no está en `package.json`. El Principio I de la constitución (Stack) exige aprobación explícita para agregar dependencias npm. El input del usuario autoriza explícitamente el fallback: "o la solución más simple con las librerías ya presentes". HTML5 DnD es una API del navegador: cero instalación, cero mantenimiento, suficiente para listas planas de decenas de secciones.
- **Alternatives considered**:
  - `@dnd-kit/core` + `@dnd-kit/sortable`: UX superior (animaciones, accesibilidad, touch). Rechazado por costo de dependencia sin aprobación explícita; se puede adoptar después si el usuario la aprueba, sin tocar store/BD.
  - `react-beautiful-dnd`: desactualizado para React 19. Rechazado.
  - Arrastre con puntero manual (mousedown/mousemove): reinventa lo que el navegador ya da. Rechazado.

## 2. Alcance del reordenamiento: ¿global o por grupo?

- **Decision**: El reordenamiento respeta la estructura de grupos del sidebar. En `BookTree` (libro), cada grupo — Materias previas, Capítulos, Materias finales, Otras — reordena internamente (una sección no puede cruzar de grupo). En `TeachingTree` (enseñanza/estudio/sermón/video) y `DevotionalTree` (devocional), la lista es única: reordenar es global dentro de la lista.
- **Rationale**: El `BookTree` filtra por tipo (`capitulo` solo entre `capitulo`, etc.). Permitir cruzar grupos rompería la semántica de materias previas/capítulos/materias finales y el significado de los títulos ("Capítulo N", "Portada"). El spec pide reordenar "capítulos/secciones del documento"; el valor real está en reordenar capítulos entre sí y entradas de serie entre sí.
- **Alternatives considered**:
  - Reordenamiento 100% libre entre todos los elementos: rechazado, destruye los grupos tipados del libro y los nombres derivados del tipo.
  - Reordenar solo capítulos (P1 del spec): rechazado, el spec cubre todas las secciones.

## 3. Persistencia: ¿migración o flujo existente?

- **Decision**: Sin migración. La columna `sections.order_index` ya existe y ya es el mecanismo de orden: `getProject` hace `ORDER BY order_index ASC`, `saveProject`/`saveSections` escriben `order_index` según la posición en el array.
- **Rationale**: Reordenar = reordenar el array `store.sections` y dejar que el auto-save existente (debounce 2s → `saveCurrentProject` → `saveProject`) persista los nuevos `order_index`. Cero riesgo para documentos existentes (Principio II).
- **Alternatives considered**: nueva tabla de orden / columna `position`: rechazado, duplicaría el estado que `order_index` ya modela.

## 4. Editor: ¿qué hay que tocar?

- **Decision**: El editor (`Editor.jsx`) NO cambia.
- **Rationale**: El editor se actualiza por `sectionId` (useEffect con `setContent` cuando cambia la sección activa). Reordenar no cambia el `activeSection` ni el contenido de la sección activa; la sección sigue mostrándose intacta en su nueva posición. El panel lateral ya renderiza desde `store.sections`, así que refleja el orden al instante al reordenar el array (Principio II: no se remonta el editor, no se pierde undo/redo).
