# Data Model: Reordenar Secciones del Proyecto

Fecha: 2026-08-12 | Feature: [spec.md](./spec.md)

## Contexto

El reordenamiento NO introduce entidades nuevas ni columnas nuevas. Se apoya en el modelo existente de secciones y su columna de orden.

## Entidad: Sección (tabla `sections` — existente)

| Campo | Tipo | Rol en el reordenamiento |
|---|---|---|
| `id` | TEXT PK | Identidad estable. El reordenamiento opera por `id`, nunca por nombre (edge case: secciones con el mismo título). |
| `project_id` | TEXT FK → projects | Vincula la sección a su proyecto. El reordenamiento es intra-proyecto. |
| `type` | TEXT | Determina el grupo del sidebar (portada, capitulo, conclusion, clase, dia, etc.) y, por tanto, el alcance del movimiento (ver reglas). |
| `title` | TEXT | No participa en el orden. |
| `content` | TEXT | No participa en el orden; debe conservarse intacto. |
| `order_index` | INTEGER | **Fuente de verdad del orden persistido.** |
| `created_at` / `updated_at` | TEXT | `updated_at` se refresca al guardar (flujo existente). |

## Relaciones

- **Proyecto 1—N Sección**: el orden es una propiedad del proyecto. `getProject(id)` devuelve las secciones con `ORDER BY order_index ASC`.

## Reglas de validación (derivadas de FR-001 a FR-008)

1. **Orden global válido**: `order_index` debe ser una permutación de `0..n-1` del proyecto (garantizado por `saveSections`, que reasigna `idx` al guardar).
2. **Movimiento dentro del grupo** (libro): una sección solo puede intercambiar posición con otra del mismo grupo tipado — Materias previas (`portada, dedicatoria, prologo, introduccion`), Capítulos (`capitulo`), Materias finales (`conclusion, bibliografia, apendice`) u Otras (tipos fuera de `KNOWN_TYPES`). En listas únicas (enseñanza/estudio/sermón/video/devocional) el grupo es la lista completa.
3. **Límites**: no hay movimiento hacia arriba desde la primera posición del grupo ni hacia abajo desde la última (botones deshabilitados; drag & drop ignora objetivos fuera del grupo).
4. **Identidad**: el movimiento se resuelve por `id` de sección; el título no interviene.

## Transiciones de estado

```
[idle] → (arrastre iniciado) → [dragging: section X]
       → (drop sobre sección Y del mismo grupo) → [reorder: X↔Y en store.sections]
       → (auto-save 2s) → [persisted: order_index reasignado en SQLite]
       → (reabrir proyecto) → getProject ORDER BY order_index ASC → [orden restaurado]
```

- El `activeSection` NO cambia al reordenar: el editor sigue mostrando la misma sección por `id`.
- Drop inválido (fuera de la lista / otro grupo): sin cambio de estado; la sección vuelve a su posición.

## Sin migración

La columna `order_index` ya existe desde el inicio del proyecto. No hay script de migración ni paso de reversión: el feature es aditivo sobre datos existentes (Principio II).
