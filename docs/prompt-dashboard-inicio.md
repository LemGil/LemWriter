# Prompt para agente de codificación — Dashboard Página de Inicio (LemWriter)

## Contexto del proyecto (dáselo siempre al agente)

LemWriter es una app Electron + React/Vite + Tiptap v3 + better-sqlite3. Tiene 6 tipos de proyecto que conviven en la misma tabla `projects`: `libro`, `sermon`, `video`, `estudio`, `ensenanza`, `devocional` (con alias en inglés `book`, `teaching`, `devotional`, `study` usados en algunos mapas). El menú lateral ya está implementado y funcionando (`AppSidebar.jsx`), con vistas: `inicio`, `proyectos`, `recursos`, `documentos`, `configuracion`.

**Regla no negociable para este proyecto**: cualquier código que enumere, mapee, o haga switch sobre tipos de proyecto debe cubrir los 6 tipos explícitamente. Un `default` silencioso o un tipo faltante es el bug más común históricamente en este código base.

---

## Tarea

Refactorizar `src/components/Home/Home.jsx` para convertirlo en un dashboard real, según el siguiente diseño ya aprobado. **No implementes todo de golpe** — sigue el orden de prioridad indicado al final.

### Estado actual (para que el agente sepa qué existe ya)

Home.jsx tiene 3 tabs: "Tipos de proyecto" (6 tarjetas), "Proyectos recientes" (stats + lista filtrada), y "Subir Documento" (lista + importar). El tab "Subir Documento" está **duplicado** con la vista "Documentos" del sidebar — elimínalo de Home, ya no debe vivir ahí.

### Secciones nuevas del dashboard (en orden de prioridad — implementar en este orden, no todo junto)

**PRIORIDAD ALTA — Sección "Continuar donde lo dejaste"**
- Mostrar las últimas 3-5 secciones editadas (no solo proyectos, secciones específicas dentro de un proyecto), con: tipo de proyecto → nombre de sección, fecha relativa, extracto corto.
- Click abre directamente el proyecto en esa sección exacta.
- **Requiere verificar primero** si la tabla `sections` ya tiene una columna de timestamp (`updated_at` o similar) por fila. Si no existe, hay que agregarla vía migración antes de escribir el service — no asumas que existe.
- Nuevo método en `src/services/projectService.js`: `getRecentActivity()` que devuelva las últimas N secciones editadas across todos los proyectos, ordenadas por ese timestamp.

**PRIORIDAD ALTA — Panel de estadísticas mejorado**
- Mantener las 4 cards actuales (proyectos, palabras, secciones, backup).
- Agregar: palabras escritas hoy.
- Dejar "días activos" y "meta semanal" para una fase posterior (ver Prioridad Baja) — no las implementes todavía, son las más caras de construir bien.

**PRIORIDAD MEDIA — Compactar tipos de proyecto**
- Las 6 tarjetas de tipo de proyecto (una tarjeta debe existir por cada uno de los 6 tipos, sin excepción) pasan de ser el contenido principal a una sección compacta/secundaria dentro del dashboard, no el tab por defecto.

**PRIORIDAD MEDIA — Saludo dinámico**
- Saludo según hora del día + un versículo (puede ser estático rotativo, no necesita ser dinámico vía IA).

**PRIORIDAD BAJA — no implementar aún, solo dejar diseñado**
- Días activos y meta semanal de escritura. Esto requiere una fuente de datos que probablemente no existe todavía (log de sesiones o agregación de timestamps por día). Antes de construirlo, el agente debe proponer el diseño de esa fuente de datos y pedir confirmación, no implementarlo directo.

### Cambios técnicos esperados

| Archivo | Cambio |
|---|---|
| `src/components/Home/Home.jsx` | Refactor: nuevo layout dashboard, quitar tab "Subir Documento", compactar tarjetas de tipo |
| `src/App.jsx` | Pasar callback (ej. `onOpenSection`) a Home para abrir proyecto+sección directo desde "Continuar donde lo dejaste" |
| `src/services/projectService.js` | Nuevo método `getRecentActivity()` |
| `electron/main.js` / migración | Solo si hace falta: agregar columna de timestamp a `sections` — confirma primero si ya existe antes de tocar el schema |

---

## Instrucciones de verificación que el agente DEBE seguir (no son opcionales)

Al terminar, el agente debe entregar, además del código:

1. **Confirmación explícita de que las 6 tarjetas de tipo cubren `libro`, `sermon`, `video`, `estudio`, `ensenanza`, `devocional`** — pega el fragmento del código donde se enumeran, no solo lo afirmes en texto.
2. **El comando SQL exacto** que usó para verificar si `sections` ya tenía timestamp, y el resultado de correrlo (no asumir).
3. **Si agregó una migración**, el `ALTER TABLE` exacto y confirmación de que corrió sin error contra la BD real (no solo que el código "debería" funcionar).
4. **No reportar "listo" sin evidencia** — si algo no se puede confirmar solo leyendo el diff (ej. comportamiento en runtime), decir explícitamente qué pasos manuales hay que hacer en la app para confirmarlo, en vez de asumir que funciona.

---

## Nota para cuando el usuario (LemGil) reciba el reporte del agente

Aplicar el protocolo de la skill `revision-codigo-lemwriter` antes de aceptar cualquier afirmación de "completado":
- Verificar cobertura de los 6 tipos con grep, no confiar en el texto del reporte.
- Correr el SELECT/PRAGMA sobre la BD real para confirmar cualquier cambio de schema.
- Probar manualmente "Continuar donde lo dejaste" abriendo una sección específica y confirmando que lleva al lugar correcto, no solo al proyecto.
