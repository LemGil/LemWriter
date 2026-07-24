# Prompt para agente de codificación — Dashboard Página de Inicio (LemWriter)

## Contexto del proyecto (dáselo siempre al agente)

LemWriter es una app Electron + React/Vite + Tiptap v3 + better-sqlite3. Tiene 6 tipos de proyecto que conviven en la misma tabla `projects`: `libro`, `sermon`, `video`, `estudio`, `ensenanza`, `devocional` (con alias en inglés `book`, `teaching`, `devotional`, `study` usados en algunos mapas). El menú lateral ya está implementado y funcionando (`AppSidebar.jsx`), con vistas: `inicio`, `proyectos`, `recursos`, `documentos`, `configuracion`.

**Regla no negociable para este proyecto**: cualquier código que enumere, mapee, o haga switch sobre tipos de proyecto debe cubrir los 6 tipos explícitamente. Un `default` silencioso o un tipo faltante es el bug más común históricamente en este código base.

**Regla de responsabilidad por página (crítica — leer antes de escribir código)**:
Inicio, Proyectos y Configuración tienen roles distintos y NO deben duplicar funcionalidad entre sí:

| Página | Responde a | Contiene | NO contiene |
|---|---|---|---|
| **Inicio** | "¿Cómo va mi trabajo ahora?" | Continuar donde lo dejaste, stats de contenido (números, no listas), accesos rápidos de creación, saludo | Lista/buscador de proyectos, filtros, ajustes del sistema |
| **Proyectos** | "Quiero buscar/gestionar" | Lista completa, filtros por tipo, búsqueda, crear/editar/archivar | Stats generales de la app, ajustes |
| **Configuración** | "Cómo se comporta la app" | Tema, backups (frecuencia + lista + restaurar), gestión de datos, "Acerca de" (versión, changelog, espacio en disco) | Números sobre el contenido del usuario (eso es Inicio) |

Si el agente detecta que va a duplicar una lista de proyectos filtrable en Home, debe detenerse y usar solo un botón "Ver todos los proyectos →" que navegue a la vista Proyectos, en vez de reconstruir el listado.

---

## Tarea

Refactorizar `src/components/Home/Home.jsx` para convertirlo en un dashboard real, según el siguiente diseño ya aprobado. **No implementes todo de golpe** — sigue el orden de prioridad indicado al final.

### Estado actual (para que el agente sepa qué existe ya)

Home.jsx tiene 3 tabs: "Tipos de proyecto" (6 tarjetas), "Proyectos recientes" (stats + lista filtrada), y "Subir Documento" (lista + importar).

- **"Subir Documento" está duplicado con la vista "Documentos" del sidebar → eliminar de Home por completo.**
- **"Proyectos recientes" (la lista filtrada con búsqueda) está duplicada con la vista "Proyectos" del sidebar → eliminar de Home por completo, no compactar.** Su reemplazo en Home es la sección "Continuar donde lo dejaste" (ver abajo), que es conceptualmente distinta: son *secciones* editadas recientemente con deep-link, no un listado/buscador de *proyectos*. Home termina con un solo botón "Ver todos los proyectos →" que navega a la vista Proyectos — sin lista propia ni filtros propios.

### Secciones nuevas del dashboard (en orden de prioridad — implementar en este orden, no todo junto)

**PRIORIDAD ALTA — Sección "Continuar donde lo dejaste"**
- Mostrar las últimas 3-5 secciones editadas (no solo proyectos, secciones específicas dentro de un proyecto), con: tipo de proyecto → nombre de sección, fecha relativa, extracto corto.
- Click abre directamente el proyecto en esa sección exacta.
- **Requiere verificar primero** si la tabla `sections` ya tiene una columna de timestamp (`updated_at` o similar) por fila. Si no existe, hay que agregarla vía migración antes de escribir el service — no asumas que existe.
- Nuevo método en `src/services/projectService.js`: `getRecentActivity()` que devuelva las últimas N secciones editadas across todos los proyectos, ordenadas por ese timestamp.

**PRIORIDAD ALTA — Panel de estadísticas mejorado (stats de CONTENIDO, no del sistema)**
- Mantener las 4 cards actuales (proyectos, palabras, secciones, backup — la de backup solo muestra la fecha del último respaldo, no la lista completa de respaldos, eso es de Configuración).
- Agregar: total de proyectos por tipo (6 numeritos compactos o mini-gráfico de barras, nunca una lista con filtro), total de documentos importados, total de recursos en biblioteca, palabras escritas hoy.
- Todo lo que sea "información del software" (versión de LemWriter, espacio en disco, changelog) **no va aquí** — eso corresponde a una sección "Acerca de" dentro de Configuración, fuera del alcance de esta tarea salvo que el usuario lo pida explícitamente.
- Dejar "días activos" y "meta semanal" para una fase posterior (ver Prioridad Baja) — no las implementes todavía, son las más caras de construir bien.

**PRIORIDAD MEDIA — Tarjetas de tipo de proyecto como accesos rápidos de creación**
- Las 6 tarjetas de tipo de proyecto (una por cada uno de los 6 tipos, sin excepción) dejan de ser un listado navegable y pasan a ser solo botones de creación rápida ("+ Nuevo libro", "+ Nuevo sermón", etc.). No deben llevar a una lista filtrada de proyectos existentes de ese tipo — eso ya vive en la vista Proyectos con su propio filtro.

**PRIORIDAD MEDIA — Saludo dinámico**
- Saludo según hora del día + un versículo (puede ser estático rotativo, no necesita ser dinámico vía IA).

**PRIORIDAD BAJA — no implementar aún, solo dejar diseñado**
- Días activos y meta semanal de escritura. Esto requiere una fuente de datos que probablemente no existe todavía (log de sesiones o agregación de timestamps por día). Antes de construirlo, el agente debe proponer el diseño de esa fuente de datos y pedir confirmación, no implementarlo directo.

### Cambios técnicos esperados

| Archivo | Cambio |
|---|---|
| `src/components/Home/Home.jsx` | Refactor: nuevo layout dashboard, quitar tab "Subir Documento" Y tab "Proyectos recientes" por completo, convertir tarjetas de tipo en accesos de creación, agregar botón "Ver todos los proyectos →" |
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
5. **Confirmar que Home.jsx ya no importa ni renderiza ningún componente de listado/búsqueda de proyectos** (eso viviría solo en `ProyectosView.jsx`). Si el agente encuentra que necesita reutilizar lógica de filtrado, debe extraerla a un hook/servicio compartido en vez de copiarla en Home.

---

## Nota para cuando el usuario (LemGil) reciba el reporte del agente

Aplicar el protocolo de la skill `revision-codigo-lemwriter` antes de aceptar cualquier afirmación de "completado":
- Verificar cobertura de los 6 tipos con grep, no confiar en el texto del reporte.
- Correr el SELECT/PRAGMA sobre la BD real para confirmar cualquier cambio de schema.
- Probar manualmente "Continuar donde lo dejaste" abriendo una sección específica y confirmando que lleva al lugar correcto, no solo al proyecto.
