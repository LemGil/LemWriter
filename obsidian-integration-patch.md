# Integración Obsidian — Parche para LemWriter

Instrucciones exactas para el agente. Tres cambios en tres archivos.

---

## Archivo 1: `electron/services/exportObsidianService.js`

**Acción:** Crear archivo nuevo con el contenido de `exportObsidianService.js` (archivo adjunto).

---

## Archivo 2: `electron/main.js`

### 2a — Agregar el require al inicio del archivo, junto a los otros requires de services:

Buscar el bloque donde están los requires de otros servicios (por ejemplo cerca de `exportAppendixService`):

```js
// AGREGAR esta línea junto a los otros requires de services:
const { exportProjectToObsidian } = require('./services/exportObsidianService');
```

### 2b — Agregar el handler IPC

Buscar el área donde están registrados los otros handlers IPC (patrón `ipcMain.handle(...)`).
Agregar este handler nuevo:

```js
// ─── Obsidian Export ───────────────────────────────────────────────────────
ipcMain.handle('obsidian:exportProject', async (event, { project, sections }) => {
  try {
    const filePath = exportProjectToObsidian(project, sections);
    return { success: true, filePath };
  } catch (err) {
    console.error('[IPC obsidian:exportProject]', err);
    return { success: false, error: err.message };
  }
});
```

---

## Archivo 3: `electron/preload.js`

Buscar el objeto que expone los métodos de la API (patrón `contextBridge.exposeInMainWorld`).
Dentro del objeto expuesto, agregar:

```js
// AGREGAR dentro del objeto expuesto por contextBridge:
obsidian: {
  exportProject: (project, sections) =>
    ipcRenderer.invoke('obsidian:exportProject', { project, sections }),
},
```

---

## Archivo 4: `src/store/appStore.js` (o donde viva `saveCurrentProject`)

### Objetivo: Enganchar la exportación al autosave sin bloquearlo.

Buscar la función `saveCurrentProject` (o `saveProject` si es el nombre real).
Localizar el punto donde el guardado en SQLite termina exitosamente.

**Antes del cambio**, el final de la función se ve aproximadamente así:
```js
  // ... lógica de guardado ...
  await window.api.projects.save(projectData);
  // fin de la función
```

**Después del cambio**, agregar la exportación en paralelo:
```js
  // ... lógica de guardado ...
  await window.api.projects.save(projectData);

  // Exportar a Obsidian en paralelo — no bloquea ni rompe el autosave
  const currentProject = get().currentProject;
  const currentSections = get().sections;
  if (currentProject && window.api.obsidian) {
    window.api.obsidian
      .exportProject(currentProject, currentSections)
      .catch(err => console.warn('[Obsidian Export]', err));
  }
```

> ⚠️ IMPORTANTE para el agente:
> - El `.catch()` es obligatorio — si la exportación falla (disco desconectado, etc.) NO debe romper el autosave ni lanzar un error visible al usuario.
> - NO usar `await` en la llamada a `exportProject` — debe ser fire-and-forget.
> - Si el nombre real de la función no es `saveCurrentProject`, aplicar el mismo patrón donde sea que ocurra el guardado exitoso en SQLite.

---

## Verificación post-implementación

El agente NO puede reportar "listo" sin proporcionar evidencia de cada punto:

### 1. Confirmar que el archivo fue creado:
```bash
ls -la ~/LemWriter/electron/services/exportObsidianService.js
```

### 2. Confirmar que el require está en main.js:
```bash
grep -n "exportObsidianService" ~/LemWriter/electron/main.js
```

### 3. Confirmar que el handler IPC está registrado:
```bash
grep -n "obsidian:exportProject" ~/LemWriter/electron/main.js
```

### 4. Confirmar que preload expone el método:
```bash
grep -n "obsidian" ~/LemWriter/electron/preload.js
```

### 5. Confirmar que appStore llama a exportProject:
```bash
grep -n "obsidian" ~/LemWriter/src/store/appStore.js
```

### 6. Prueba funcional (después de reiniciar LemWriter):
1. Abrir cualquier proyecto
2. Editar cualquier sección
3. Esperar 3-5 segundos (autosave)
4. Verificar que el archivo .md fue creado:
```bash
find /media/lemgil/ALMACEN/MinisterioWiki/raw -name "*.md" -newer ~/.config/lemwriter/lemwriter.db
```

### 7. Verificar contenido del .md generado:
```bash
# Reemplazar con el nombre real del archivo
cat /media/lemgil/ALMACEN/MinisterioWiki/raw/sermones/sermon-*.md | head -30
```

---

## Notas para el agente

- El disco `/media/lemgil/ALMACEN` puede no estar montado — el servicio maneja esto sin crashear (devuelve `null` y loguea un warning).
- La exportación usa el campo `order_index` para ordenar secciones — es el campo correcto según la arquitectura de LemWriter (no `position`).
- Los 6 tipos de proyecto están todos cubiertos en `TYPE_TO_FOLDER`: sermon, ensenanza, devocional, estudio, video, libro.
- El filename incluye el año de creación para evitar colisiones entre proyectos del mismo tipo con títulos similares en años distintos.
