# LemWriter — Design System

## Identidad de marca

LemWriter es parte del **Ministerio Apostólico LemGil**. El diseño refleja una estética
editorial, cálida y ministerial — serifas para el alma, dorado como acento, teal como ancla.

## Paleta de colores

### Colores de marca (brand)

| Token | HEX | RGB | Uso |
|---|---|---|---|
| `--color-brand-gold` | `#C9A84C` | `201 168 76` | Acento principal, iconos, bordes activos |
| `--color-brand-gold-light` | `#F0D080` | `240 208 128` | Texto sobre teal, hover |
| `--color-brand-gold-deep` | `#8B6914` | `139 105 20` | Títulos de sección (uppercase), etiquetas |
| `--color-brand-gold-pale` | `#FAF3DC` | `250 243 220` | Fondos de versículos, badges, hover secundario |
| `--color-brand-gold-shine` | `#FFFBEF` | `255 251 239` | Fondos de inputs, tarjetas de sugerencia |
| `--color-brand-teal` | `#1A3A4A` | `26 58 74` | Color primario, botones, headers |
| `--color-brand-teal-mid` | `#245068` | `36 80 104` | Hover de teal, variante secundaria |
| `--color-brand-teal-pale` | `#EAF4F8` | `234 244 248` | Fondos de chips, badges de tipo |
| `--color-brand-cream` | `#FDF8F0` | `253 248 240` | Fondo general de la app |
| `--color-brand-ink` | `#1A1610` | `26 22 16` | Texto principal (negro cálido) |
| `--color-brand-ink-2` | `#4A3F2F` | `74 63 47` | Texto secundario |
| `--color-brand-ink-3` | `#8A7A60` | `138 122 96` | Texto terciario, muted |
| `--color-brand-devocional` | `#5A9A6A` | `90 154 106` | Tipo devotional (verde) |

### Colores semánticos de interfaz

| Variable | Light | Sepia | Dark |
|---|---|---|---|
| `--bg-primary` | `#FDF8F0` | `#f4ecd8` | `#1a1a2e` |
| `--bg-secondary` | `#FAF3DC` | `#ede4c8` | `#22223a` |
| `--text-primary` | `#1A1610` | `#3c2a1e` | `#f0d080` |
| `--text-secondary` | `#4A3F2F` | `#8b7355` | `#c0bfb0` |
| `--text-muted` | `#8A7A60` | `#a09070` | `#909080` |
| `--border-primary` | `#E5DCC8` | `#d4c9a8` | `#3a3a4e` |
| `--card-bg` | `#ffffff` | `#faf3e0` | `#252542` |

### Clases utilitarias `.theme-*`

`theme-bg`, `theme-bg-secondary`, `theme-text`, `theme-text-secondary`,
`theme-text-muted`, `theme-border`, `theme-card`, `theme-sidebar`

## Tipografía

| Uso | Fuente | Carga |
|---|---|---|
| Títulos decorativos | **Cinzel** | `@font-face` woff2 |
| Cuerpo de texto | **Crimson Pro** / **EB Garamond** | woff2 + sistema |
| UI / etiquetas | **system-ui** | Nativa |

### Jerarquía

| Elemento | Fuente | Tamaño | Color |
|---|---|---|---|
| Título de sección (panel derecho) | Cinzel | 12px 600 | gold-deep |
| Nombre del proyecto | Cinzel | 14px 700 | teal |
| Título de tipo en Home | Cinzel | 15px 700 | blanco |
| Cuerpo del editor | Crimson Pro | 16px | text-primary |
| UI / metadata | system-ui | 10-12px | text-muted |

## Colores por tipo de proyecto

| Tipo | Texto | Fondo | Gradiente (Home) |
|---|---|---|---|
| `libro` | `text-brand-teal` | `bg-brand-teal-pale` | `from-brand-teal to-brand-teal-mid` |
| `ensenanza` | `text-brand-gold-deep` | `bg-brand-gold-pale` | `from-brand-gold-deep to-brand-gold` |
| `devocional` | `text-devocional` | `bg-devocional/10` | `from-devocional/90 to-devocional/60` |
| `estudio` | `text-brand-ink-2` | `bg-brand-cream` | `from-brand-ink-2 to-brand-ink` |
| `sermon` | `text-brand-gold` | `bg-brand-gold-shine` | `from-brand-gold-deep/80 to-brand-gold-deep` |
| `video` | `text-brand-teal-mid` | `bg-brand-teal-pale` | `from-brand-teal to-brand-teal-mid` |

## Componentes

### Botón Primary
`bg-brand-teal text-white rounded-lg px-4 py-2 font-sans text-sm font-medium`
Hover: `opacity-90 transition-opacity`

### Botón Toolbar
`p-1.5 rounded transition-colors`
Activo: `bg-brand-teal text-white`
Inactivo: `theme-text-muted hover:bg-brand-gold-pale hover:text-brand-teal`

### Input / Select
`border border-brand-gold/30 bg-white theme-text rounded-lg px-3 py-2 text-sm`
Focus: `ring-2 ring-brand-gold/30`

### Tarjeta (card)
`theme-card rounded-xl border border-brand-gold/20 p-3`
Hover: `hover:shadow-md transition-shadow`

### Título de sección (panel derecho)
`font-serif text-xs font-semibold text-brand-gold-deep uppercase mb-2`

### Mensajes del asistente
- warning: `bg-brand-gold-pale border-brand-gold/50`, texto `text-brand-gold-deep`
- error: `bg-red-50 border-red-200`, texto `text-red-800`
- info: `bg-brand-teal-pale border-brand-teal/30`, texto `text-brand-teal`
- suggestion: `bg-brand-gold-shine border-brand-gold-deep/30`, texto `text-brand-gold-deep`

## Temas

| Tema | `data-theme` | Fondo |
|---|---|---|
| Claro | `light` | `#FDF8F0` |
| Sepia | `sepia` | `#f4ecd8` |
| Oscuro | `dark` | `#1a1a2e` |
| Personalizado | `custom` | 19 variables editables |

Se persisten en localStorage + SQLite. Tema por proyecto via columna `theme`.

## Border-radius estándar

| Elemento | Clase | Valor |
|---|---|---|
| Cards / paneles | `rounded-xl` | 12px |
| Botones / inputs | `rounded-lg` | 8px |
| Badges / pills | `rounded-full` | 9999px |
| Iconos pequeños | `rounded` | 4px |

## Reglas

1. Fondo siempre cálido: `theme-bg` (crema), nunca gris
2. Gold = acento (bordes, badges, bullets). No para cuerpo
3. Teal = primario (headers, botones, títulos)
4. Serif = contenido (Cinzel títulos, Crimson Pro cuerpo)
5. Sans-serif = UI (inputs, botones, metadata)
6. Toda interacción con `transition-colors` o similar
