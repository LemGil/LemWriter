# Quickstart: Reordenar Secciones del Proyecto

Fecha: 2026-08-12 | Feature: [spec.md](./spec.md) | Contratos: [contracts/](./contracts/contracts.md) | Modelo: [data-model.md](./data-model.md)

Guía de validación end-to-end. No incluye código de implementación (eso vive en `tasks.md`).

## Prerrequisitos

- Repo clonado con dependencias instaladas (`npm install`).
- Ollama NO es necesario para esta feature.
- Conocido: `npm test` con `projectService.test.js` falla por ABI de better-sqlite3 (deuda D3, no relacionada con este feature). Los tests de esta feature son de lógica pura del store y no dependen de better-sqlite3.

## Setup

```bash
npm run dev
```

## Escenarios de validación

### E1 — Botones subir/bajar (FR-003, SC-001, SC-004)

1. Abrir un proyecto de tipo libro con ≥3 capítulos.
2. En el panel lateral (pestaña Estructura), sobre el capítulo 2, hacer clic en "subir".
3. **Esperado**: el capítulo 2 pasa a la primera posición al instante; el editor sigue mostrando la sección activa sin recargar.
4. Hacer clic en "subir" sobre el capítulo que quedó primero: **esperado** sin cambios (botón deshabilitado).
5. Repetir con "bajar" sobre el último capítulo: **esperado** sin cambios.

### E2 — Drag & drop (FR-002, SC-001)

1. Con el mismo proyecto, arrastrar el capítulo 3 y soltarlo sobre el capítulo 1.
2. **Esperado**: el capítulo 3 queda en primera posición; el resto se reordena en consecuencia.
3. Arrastrar un capítulo y soltarlo fuera de la lista o sobre una sección de otro grupo (p. ej., sobre "Portada"): **esperado** sin cambios (drop inválido).

### E3 — Persistencia (FR-005, SC-002)

1. Tras reordenar (E1/E2), esperar ≥2s (auto-save) o pulsar Guardar.
2. Cerrar el proyecto y reabrirlo (o cerrar la app y volver a abrirla).
3. **Esperado**: el orden reordenado se mantiene.

### E4 — Integridad del contenido (FR-006, SC-003)

1. Escribir texto en la sección activa.
2. Reordenar esa sección con botones y con drag & drop.
3. **Esperado**: el texto permanece íntegro y el editor sigue mostrando la misma sección.

### E5 — Consistencia con exportación (FR-008, SC-005)

1. Reordenar capítulos.
2. Exportar a PDF/DOCX/EPUB.
3. **Esperado**: el documento exportado respeta el nuevo orden de capítulos.

### E6 — Proyecto con una sola sección (edge case)

1. Abrir un proyecto con una sola sección.
2. **Esperado**: botones subir/bajar deshabilitados; drag & drop sin efecto.

## Comandos de verificación automática

```bash
# Tests unitarios de la lógica de reordenamiento (store)
npx vitest run src/__tests__/reorderSections.test.js
```

**Esperado**: todos los tests pasan (lógica pura: swap por id, límites, no-op en extremos).

## Criterios de aceptación (del spec)

| Criterio | Escenario |
|---|---|
| SC-001: reflejo <1s | E1, E2 |
| SC-002: 100% persistencia | E3 |
| SC-003: sin pérdida de contenido | E4 |
| SC-004: movimientos inválidos sin error | E1, E2, E6 |
| SC-005: orden consistente en todas las vistas | E5 |