# LemWriter — Menú de navegación lateral

## Estado: IMPLEMENTADO ✅

---

## Archivos creados/modificados

| Archivo | Cambio |
|---|---|
| `src/components/Layout/AppSidebar.jsx` | ✅ **NUEVO** — Componente de navegación lateral |
| `src/App.jsx` | ✅ Sidebar integrado: `vistaActiva`, colapsado, persistencia, limpieza de estados |
| `src/components/Home/Home.jsx` | ✅ Acepta prop `activeMainTab` para navegar directo a Documentos |
| `src/components/Recursos/GlobalResourcesView.jsx` | ✅ **NUEVO** — Vista de recursos globales con CRUD, pestañas y temas |
| `src/components/Documentos/DocumentosView.jsx` | ✅ **NUEVO** — Vista de documentos importados con importación y gestión |
| `src/components/Proyectos/ProyectosView.jsx` | ✅ Fix: import de `useRef` agregado |

---

## Componente: `AppSidebar.jsx`

Componente puro (sin lógica de negocio). Props:

| Prop | Tipo | Descripción |
|---|---|---|
| `vistaActiva` | `string` | ID de la vista activa |
| `onNavigate` | `(vista: string) => void` | Callback al hacer clic en un ítem |
| `collapsed` | `boolean` | Estado colapsado (solo íconos) |
| `onToggle` | `() => void` | Alternar colapsado |
| `recentProjects` | `array` | Proyectos recientes (sub-lista bajo "Proyectos") |
| `onOpenProject` | `(project) => void` | Abrir un proyecto reciente |

### Ítems de navegación

| ID | Ícono | Label | Vista |
|---|---|---|---|
| `inicio` | `Home` | Inicio | Dashboard (`Home.jsx`) |
| `proyectos` | `FolderOpen` | Proyectos | Lista de proyectos (`ProyectosView.jsx`) |
| `recursos` | `BookOpen` | Recursos | Recursos globales (`GlobalResourcesView.jsx`) |
| `documentos` | `FileText` | Documentos | Documentos importados (`DocumentosView.jsx`) |
| `configuracion` | `Settings` | Configuración | Placeholder — "Próximamente" |

### Colapsado

- Expandido: 200px, muestra ícono + label
- Colapsado: 52px, solo íconos + tooltip
- Persistencia: `localStorage`

### Sub-lista de proyectos recientes

- Se muestra debajo de "Proyectos" cuando el sidebar está expandido
- Muestra los últimos 5 proyectos con ícono y color por tipo
- Click en un proyecto lo abre directamente en el editor

---

## Vista: Recursos Globales (`GlobalResourcesView.jsx`)

### Características

| Funcionalidad | Estado |
|---|---|
| Lista de todos los recursos globales | ✅ |
| Búsqueda por título, contenido, significado | ✅ |
| Pestañas por tipo de recurso (flex-wrap, multi-línea) | ✅ |
| Selector de columnas (1, 2 o 3) | ✅ |
| Agregar nuevo recurso | ✅ |
| Editar recurso existente | ✅ |
| Eliminar recurso con confirmación | ✅ |
| Toggle de tema (Claro / Sepia / Oscuro) | ✅ |
| Formulario dinámico por tipo de recurso | ✅ |

### Props

| Prop | Tipo | Descripción |
|---|---|---|
| `theme` | `string` | Tema actual (`light`, `sepia`, `dark`) |
| `onThemeChange` | `(theme: string) => void` | Cambiar tema |

### Tipos de recurso soportados (12)

| Tipo | Label | Campos principales |
|---|---|---|
| `pasaje_biblico` | Pasaje Bíblico | título, texto, referencia, versión |
| `palabra_hebrea` | Palabra Hebrea | título, palabra original, transliteración, Strong's, significado |
| `palabra_griega` | Palabra Griega | título, palabra original, transliteración, Strong's, significado |
| `personaje_biblico` | Personaje Bíblico | nombre, descripción, referencia, significado del nombre |
| `ilustracion` | Ilustración | título, ilustración, fuente |
| `cita_autor` | Cita de Autor | título, cita, autor, fuente |
| `concepto_teologico` | Concepto Teológico | concepto, definición, referencia bíblica |
| `nota_teologica` | Nota Teológica | título, contenido, referencia |
| `nota_estudio` | Nota de Estudio | título, contenido, referencia |
| `pregunta_estudio` | Pregunta de Estudio | pregunta, respuesta, referencia |
| `punto_estudio` | Punto de Estudio | punto, desarrollo, referencia |
| `tema_doctrinal` | Tema Doctrinal | tema, contenido, notas |

### Layout de la vista

```
┌─────────────────────────────────────────────────────────────┐
│  📚 Recursos Globales                          [☀️ 🌙 🌑]  │
│  Tu biblioteca personal de referencias bíblicas...          │
│                                                             │
│  ✅ N recursos   📁 M tipos                                │
│                                                             │
│  [🔍 Buscar recurso...]     [1][2][3]  [+ Nuevo recurso]   │
├─────────────────────────────────────────────────────────────┤
│  [Todos(5)] [Pasajes(2)] [Palabras(3)] [Personajes(1)] ... │
│  (pestañas en flex-wrap, multi-línea)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ 📖 Salmo 23      │  │ 💬 Génesis 1:1   │  (2 columnas) │
│  │ Pasaje Bíblico   │  │ Pasaje Bíblico   │                │
│  │ El Señor es...   │  │ En el principio..│                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Funcionalidad de columnas

- **1 columna**: Lista vertical completa, ideal para lectura detallada
- **2 columnas**: Vista equilibrada, muestra más recursos sin scrollear
- **3 columnas**: Vista compacta, maximiza la información visible

---

## Vista: Documentos (`DocumentosView.jsx`)

### Características

| Funcionalidad | Estado |
|---|---|
| Lista de documentos importados | ✅ |
| Importar archivo (Word, PDF, Markdown, texto) | ✅ |
| Crear documento nuevo en blanco | ✅ |
| Renombrar documento (click en título) | ✅ |
| Abrir documento para editarlo | ✅ |
| Eliminar documento con confirmación | ✅ |
| Toggle de tema (Claro / Sepia / Oscuro) | ✅ |
| Estadísticas (total de documentos y tipos) | ✅ |
| Formato de fecha relativa | ✅ |
| Búsqueda por nombre de archivo | ✅ |
| Pestañas por tipo de archivo (flex-wrap) | ✅ |
| Selector de columnas (1, 2 o 3) | ✅ |

### Props

| Prop | Tipo | Descripción |
|---|---|---|
| `theme` | `string` | Tema actual (`light`, `sepia`, `dark`) |
| `onThemeChange` | `(theme: string) => void` | Cambiar tema |
| `onOpenDocument` | `(doc: object) => void` | Abrir documento en el editor |
| `refreshKey` | `number` | Se incrementa al renombrar o guardar para forzar recarga de la lista |

### Tipos de archivo soportados

| Extensión | Label | Color |
|---|---|---|
| `docx` / `doc` | Word | Azul |
| `pdf` | PDF | Rojo |
| `md` | Markdown | Púrpura |
| `txt` | Texto | Gris |
| `rtf` | RTF | Ámbar |
| `odt` | ODT | Verde |

### Flujo de importación

1. Click en "Importar"
2. Se abre diálogo del sistema para seleccionar archivo
3. El archivo se convierte a HTML vía `window.api.document.convert()`
4. Se guarda en la base de datos vía `window.api.document.save()`
5. Se abre automáticamente en el editor (`DocumentEditor`)

### Flujo de creación

1. Click en "Nuevo"
2. Se crea un documento vacío en la BD con nombre "Documento nuevo [fecha]"
3. Se abre automáticamente en el editor (`DocumentEditor`)

### Layout de la vista

```
┌─────────────────────────────────────────────────────────────┐
│  📁 Documentos                              [☀️ 🌙 🌑]      │
│  Importa archivos Word, PDF, Markdown...                    │
│                                                             │
│  ✅ N documentos   📁 M tipos                               │
│                                                             │
│  [🔍 Buscar documento...]   [1][2][3]  [Nuevo] [Importar]  │
├─────────────────────────────────────────────────────────────┤
│  [Todos(5)] [Word(3)] [PDF(1)] [Markdown(1)] ...           │
│  (pestañas en flex-wrap, multi-línea)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ 📄 Sermon.docx   │  │ 📄 Estudio.pdf   │  (2 columnas) │
│  │ Word             │  │ PDF              │                │
│  │ Hace 2h · 1,200  │  │ Hace 1d · 800    │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Integración en `App.jsx`

### Nuevo estado

```js
const [vistaActiva, setVistaActiva] = useState('inicio')     // localStorage
const [sidebarCollapsed, setSidebarCollapsed] = useState(false) // localStorage
const [showDocuments, setShowDocuments] = useState(false)
```

### Navegación

```js
const handleNavigate = (vista) => {
  setVistaActiva(vista)
  if (vista === 'proyectos') {
    // Limpia estados del proyecto para evitar pantalla en blanco
    setProjectId(null)
    setProjectType(null)
    setProject(null)
    setSections([])
    setActiveSection(null)
  }
}
```

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ ┌──────────┐  ┌────────────────────────────────────────────┐ │
│ │          │  │                                            │ │
│ │ Sidebar  │  │          Contenido principal                │ │
│ │ 52-200px │  │  (Home / Editor / Proyectos / Recursos /   │ │
│ │          │  │   Documentos / Placeholder)                 │ │
│ │          │  │                                            │ │
│ └──────────┘  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## Bugs resueltos

| Bug | Solución |
|---|---|---|
| `showDocuments is not defined` en `App.jsx` | Se agregó `const [showDocuments, setShowDocuments] = useState(false)` |
| `useRef is not defined` en `ProyectosView.jsx` | Se agregó `useRef` a la importación de React |
| Pantalla en blanco al navegar a "Proyectos" | `handleNavigate` limpia `projectId` y estados relacionados al ir a "proyectos" |
| Renombrar documento no persistía el nombre al volver a la lista | El backend (`electron/main.js`) en `document:save` no incluía `file_name` en el UPDATE — solo actualizaba content/html. Se agregó `file_name = ?` al SQL. En el frontend se agregó: `docRefreshKey` state en App.jsx, `onNameChange` prop en DocumentEditor, y `refreshKey` prop en DocumentosView para refrescar la lista |

---

## Vistas pendientes

| Vista | Estado | Siguiente paso |
|---|---|---|
| ~~Recursos globales~~ | ✅ Implementada | CRUD completo, pestañas, columnas, temas |
| ~~Documentos~~ | ✅ Implementada | `DocumentosView.jsx` con importación, lista, eliminación |
| Configuración | Placeholder | Tema, respaldos, preferencias generales |
| Proyectos (sin editor) | ✅ Implementada | `ProyectosView.jsx` con tipos, búsqueda y creación |

---

## Persistencia

- `localStorage('lemwriter-sidebar-collapsed')` — colapsado del sidebar
- `localStorage('lemwriter-vista-activa')` — última vista activa

---

## Historial de cambios

| Fecha | Cambios |
|---|---|---|
| 2026-07-17 | Creación de `AppSidebar.jsx`, integración en `App.jsx`, placeholders para Recursos y Configuración |
| 2026-07-18 | Fix: `useRef` en `ProyectosView.jsx`, fix: limpieza de estados en `handleNavigate` para vista Proyectos |
| 2026-07-18 | **Recursos Globales**: componente `GlobalResourcesView.jsx` con búsqueda, pestañas flex-wrap, selector de columnas (1/2/3), CRUD completo (agregar/editar/eliminar), formularios dinámicos por tipo de recurso, toggle de tema (Claro/Sepia/Oscuro) |
| 2026-07-18 | **Documentos**: componente `DocumentosView.jsx` extraído de `Home.jsx` como vista propia. Importación de archivos, lista con grid, eliminación, toggle de tema. |
| 2026-07-18 | **Documentos v2**: pestañas por tipo de archivo (Word/PDF/Markdown/etc), búsqueda por nombre, selector de columnas (1/2/3), modal de confirmación de borrado. |
| 2026-07-18 | **Fix rename documento**: se agregó `file_name` al UPDATE en `electron/main.js`, `docRefreshKey` + `onNameChange` en App.jsx, `onNameChange` en DocumentEditor, `refreshKey` en DocumentosView |
