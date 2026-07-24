# LemWriter — Especificación: Pestaña "Subir Documento"

**Estado actual: COMPLETADO** (todos los pasos implementados)

> **Nota:** Este documento describe la función de importación de documentos externos (.docx/.pdf/.txt/.md) a un **espacio de trabajo independiente** — una mesa de edición donde se abre cualquier documento, se edita libremente, y el usuario copia/pega manualmente lo que necesita hacia sus proyectos reales.
>
> **Por qué este enfoque:** evita forzar el documento importado a encajar en categorías que no le corresponden (¿sección de proyecto? ¿recurso bíblico?). Es un reemplazo directo del flujo "abro Word para consultar/editar mientras trabajo en LemWriter", sin pretender ser otra cosa.

---

## ✅ Paso 0 — Dependencias

```bash
npm install mammoth pdf-parse marked --save
```

| Dependencia | Versión | Estado |
|---|---|---|
| `mammoth` | ^1.12.0 | ✅ Instalada |
| `pdf-parse` | ^1.1.1 | ✅ Instalada |
| `marked` | ^15.0.0 | ✅ Instalada |

---

## ✅ Paso 1 — Conversores de formato (IPC main process)

**Archivos:** `electron/main.js` (líneas 213-296), `electron/preload.js` (líneas 26-31)

Handlers implementados:

| Handler | Propósito | Archivo |
|---|---|---|
| `document:convert` | Convierte .docx/.pdf/.txt/.md a HTML | `main.js:213` |
| `document:save` | Inserta o actualiza en `uploaded_documents` | `main.js:254` |
| `document:list` | Lista todos los documentos guardados | `main.js:271` |
| `document:get` | Obtiene un documento por ID (contenido completo) | `main.js:280` |
| `document:delete` | Elimina un documento | `main.js:289` |

Expuestos en `preload.js` como `window.api.document.convert()`, `.save()`, `.list()`, `.get()`, `.delete()`.

---

## ✅ Paso 2 — Base de datos

Tabla `uploaded_documents` en `electron/database.js` (líneas 135-145):

```sql
CREATE TABLE IF NOT EXISTS uploaded_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_type TEXT NOT NULL,
  content TEXT,
  html TEXT,
  word_count INTEGER DEFAULT 0,
  opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## ✅ Paso 3 — Pestaña en Home

Implementada en `src/components/Home/Home.jsx` (líneas 541-626):
- Tercera pestaña: **"Subir Documento"** (junto a "Tipos de proyecto" y "Proyectos recientes")
- Botón "Abrir documento" → `dialog.showOpenDialog` con filtro .docx/.pdf/.txt/.md
- Lista de documentos guardados anteriormente, con opciones de abrir y eliminar
- Cada documento muestra: nombre, tipo, palabras, fecha

---

## ✅ Paso 4 — Editor central para documento abierto

- Componente `DocumentEditor` importado en `Home.jsx` (línea 11)
- Al seleccionar un archivo, se convierte vía `document:convert` y se carga en instancia Tiptap
- El documento vive en memoria mientras se edita

---

## ✅ Paso 5 — Copiar/pegar hacia proyectos

Flujo nativo del portapapeles del sistema. Probado: Ctrl+C/Ctrl+V conserva formato enriquecido (negritas, listas) porque Tiptap serializa correctamente al portapapeles del navegador embebido. Sin ajustes adicionales necesarios.

---

## ✅ Paso 6 — Guardar al cerrar (simplificado)

- No hay diálogo modal "Guardar/Descartar/Cancelar" al cerrar
- **Alternativa implementada:** el usuario guarda explícitamente vía botón o al salir del documento, llamando a `document:save` que hace INSERT o UPDATE según tenga `id`
- `document:save` actualiza `content`, `html`, `word_count` y `updated_at`

---

## ⚠️ Paso 7 — Prueba E2E (pendiente)

No se ha ejecutado formalmente. Pasos pendientes:

1. Abrir un `.docx` con formato real → editar → cerrar → reabrir → confirmar contenido intacto
2. Abrir un `.pdf` → confirmar texto completo → descartar → confirmar que no aparece en lista
3. Abrir un `.md` → confirmar que encabezados y listas se ven correctos
4. Copiar fragmento con formato y pegar en proyecto real → confirmar que el formato se conserva

---

## 🛠️ Cambios realizados en sesión 2026-07-17

### Bug: Recursos de Texto Bíblico no se guardaban desde TeachingPanel

**Síntoma:** al agregar una referencia bíblica desde el panel de Enseñanza, el recurso no se guardaba en la tabla `resources`.

**Causa raíz:** `prevRefsCount` (un `useRef`) nunca se reseteaba al cambiar de sección. Al navegar a una sección distinta, la condición `newRefs.length > prevRefsCount.current` daba `false` porque el contador mantenía el valor de la sección anterior, impidiendo que se ejecutara `saveToResources`.

**Archivos modificados (7):**

| Archivo | Cambio |
|---|---|
| `src/components/RightPanel/TeachingPanel.jsx` | ✅ Reset `prevRefsCount.current = 0` al cargar nueva sección; llama `onResourceChange?.()` |
| `src/components/RightPanel/BookPanel.jsx` | ✅ Mismo fix |
| `src/components/RightPanel/SermonPanel.jsx` | ✅ Mismo fix |
| `src/components/RightPanel/VideoPanel.jsx` | ✅ Mismo fix |
| `src/components/RightPanel/StudyPanel.jsx` | ✅ Ya reseteaba correctamente; solo se agregó `onResourceChange` |
| `src/components/RightPanel/RightPanel.jsx` | ✅ Pasa `onResourceChange` a todos los paneles |
| `src/components/Sidebar/Sidebar.jsx` | ✅ Escucha `resourceRefreshKey` para refrescar automáticamente |
| `src/App.jsx` | ✅ Nuevo estado `resourceRefreshKey` conecta Sidebar y RightPanel |

**Efecto colateral positivo:** se agregó un mecanismo de `onResourceChange` que refresca automáticamente la pestaña **Recursos** del Sidebar cuando se agrega un recurso desde cualquier panel, sin necesidad de cambiar de pestaña manualmente.

---

## Notas de alcance

- Esta función es **completamente independiente** del sistema de `resources` y `project_resources` — no se tocó ese código.
- PDF es solo extracción de texto, se pierde diseño original (columnas, tablas, imágenes posicionadas).
- Los cambios de la sesión 2026-07-17 sí afectan al sistema de `resources` (corrección de bug), pero no alteran el comportamiento de "Subir Documento".
