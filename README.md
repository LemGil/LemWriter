# LemWriter ✦ Plataforma de Escritura Ministerial

**LemWriter** es una aplicación de escritorio para la creación de contenido ministerial — libros, enseñanzas, devocionales, estudios bíblicos, sermones y guiones de video — con herramientas de IA local, biblia offline y exportación profesional.

Desarrollada como parte del **Ministerio Apostólico LemGil**.

---

## Características

- **6 tipos de proyecto**: libro, enseñanza, devocional, estudio bíblico, sermón y video — cada uno con panel contextual, plantilla y estructura predefinida
- **Editor enriquecido**: Tiptap v3 con tablas, imágenes redimensionables, notas al pie, corrector ortográfico en español (nspell + dictionary-es)
- **IA local**: Integración con Ollama — chat contextual, extracción automática de referencias bíblicas, clasificación de recursos
- **Biblia offline**: Reina-Valera 1909 (~50k versículos) en SQLite independiente, con búsqueda por libro/capítulo/versículo
- **Exportación**: PDF (Chromium nativo), DOCX (librería `docx`), EPUB (yazl) — cada formato con estilos editoriales configurables
- **Gestión de recursos**: Referencias bíblicas, personajes, palabras hebreas/griegas, notas teológicas — centralizados y reutilizables entre proyectos
- **Temas visuales**: Claro, Sepia, Oscuro + tema personalizado con editor de colores
- **Respaldo automático**: Rotación de hasta 10 respaldos de la base de datos

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite 8 + TailwindCSS 3 |
| Editor | Tiptap v3.27.1 |
| Estado | Zustand v5 |
| Backend | Electron 42 + better-sqlite3 |
| IA local | Ollama (`/api/chat`) |
| Corrector ortográfico | nspell + dictionary-es |
| Exportación | PDF (Electron), DOCX (`docx`), EPUB (`yazl`) |
| Tests | Vitest |

## Requisitos

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Ollama** (opcional, para funciones de IA) — [descargar](https://ollama.com)
  - Modelo recomendado: `ibm/granite4:3b`
  - Fallback rápido: `lfm2.5-1.2b`

## Instalación

```bash
git clone https://github.com/LemGil/LemWriter.git
cd LemWriter
npm install
```

### Base de datos bíblica

La Biblia RV1909 se descarga e importa automáticamente al iniciar la app por primera vez. El archivo `bible-rv1909.db` se almacena en el directorio de datos del usuario.

## Uso

```bash
npm run dev
```

Esto inicia el servidor Vite y la ventana de Electron simultáneamente.

### Comandos disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia la app en modo desarrollo |
| `npm run build` | Compila el frontend para producción |
| `npm test` | Ejecuta los tests con Vitest |
| `npm run test:watch` | Tests en modo watch |

### Tipos de proyecto

| Tipo | Descripción | Estilo editorial por defecto |
|---|---|---|
| **Libro** | Estructura completa: portada, TOC, prólogo, capítulos, conclusión, apéndices | Clásico (Times New Roman) |
| **Enseñanza** | Contenido didáctico y pastoral | Libro de Enseñanza (EB Garamond + Cinzel) |
| **Devocional** | Lecturas devocionales y reflexiones | Devocional Cálido (EB Garamond + Cinzel) |
| **Estudio bíblico** | Estudio con referencias y aplicación | Estudio Bíblico (EB Garamond) |
| **Sermón** | Guión para predicar | Sermón Expositivo (Arial) |
| **Video** | Guión para grabar | Video Dinámico (Arial) |

## Estructura del proyecto

```
LemWriter/
├── electron/               # Backend (Node.js)
│   ├── main.js             # Punto de entrada de Electron
│   ├── services/           # aiService, bibleService, backupService
│   ├── ipc/                # Handlers IPC por dominio
│   ├── database.js         # Inicialización y migraciones SQLite
│   ├── schemas/            # Validación Zod para IPC
│   └── bible-data/         # Datos de importación bíblica
├── src/                    # Frontend (React)
│   ├── App.jsx             # Enrutador y layout principal
│   ├── components/
│   │   ├── Editor/         # Editor Tiptap + extensiones
│   │   ├── Layout/         # Layout, sidebar, header
│   │   ├── RightPanel/     # Paneles contextuales por tipo de proyecto
│   │   ├── Sidebar/        # Navegación de secciones
│   │   ├── Toolbar/        # Barra de herramientas
│   │   ├── Assistant/      # Chat IA (Ollama)
│   │   └── Home/           # Pantalla de inicio
│   ├── config/             # bookStyles, projectStyles
│   ├── services/           # projectService (frontend)
│   ├── stores/             # Zustand store
│   ├── templates/          # Plantillas de proyecto
│   └── extensions/         # Extensiones Tiptap personalizadas
├── public/                 # Archivos estáticos
└── docs/                   # Documentación adicional
```

## Licencia

MIT © 2025-2026 Marcus Quinn — Ministerio Apostólico LemGil
