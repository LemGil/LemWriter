---
name: diseno-frontend-distintivo
description: >
  Genera interfaces front-end distintivas que se distinguen de los diseños genéricos de IA.
  Úsalo siempre que el usuario pida una UI, landing page, componente, dashboard o cualquier
  interfaz web. También cuando diga "que no parezca IA", "llamativo", "original", o comparta
  una estética específica (brutalista, retrofuturista, lujosa, lúdica, editorial).
  Para proyectos de LemGil Ministerio Apostólico, Academia del Espíritu o LemWriter,
  aplica automáticamente la identidad de marca del ministerio: paleta dorado #C8A75D /
  azul petróleo #1A3A4A / marfil #F7F3E9, tipografía Cinzel (títulos) / Crimson Pro
  (lectura) / Inter (interfaces). El skill establece primero un marco de diseño (propósito,
  público, estética), luego produce código pulido con tipografía cuidada, paletas únicas,
  movimiento orquestado, composición asimétrica y profundidad visual. Evita activamente
  los defaults de IA: degradados morados, tarjetas uniformes, Inter como única fuente,
  y componentes repetitivos sin jerarquía.
---

# Diseño Front-End Distintivo

Actúa como el director creativo de un estudio boutique conocido por darle a cada cliente una identidad visual que no puede confundirse con ninguna otra. El cliente ya rechazó propuestas que se sentían como plantillas de Tailwind o Figma Community. Paga por un punto de vista propio. Haz elecciones deliberadas y defiéndelas.

---

## Identidad de Marca: Ministerio Apostólico LemGil

> **Cuando el diseño sea para LemGil Ministerio Apostólico, Academia del Espíritu, LemWriter,
> o cualquier proyecto del ministerio**, esta identidad es la base — no una opción. No inventes
> una estética alterna. Aplica este sistema como punto de partida y eleva desde él.
> Lee `references/marca-lemgil.md` para el sistema completo.

### Tokens de marca (resumen rápido)

```css
:root {
  /* Paleta LemGil */
  --dorado:        #C8A75D;
  --dorado-alt:    #C9A24A;
  --azul-petroleo: #1A3A4A;
  --marfil:        #F7F3E9;
  --blanco:        #FFFFFF;
  --gris-oscuro:   #2E2E2E;
  --gris-claro:    #D9D9D9;

  /* Tipografía LemGil */
  --font-titulo:     'Cinzel', serif;          /* Logo, títulos, institucional */
  --font-lectura:    'Crimson Pro', serif;      /* Libros, estudios, devocionales */
  --font-interfaz:   'Inter', sans-serif;       /* Web, LemWriter, Academia, formularios */
}
```

### Reglas tipográficas por contexto

| Elemento | Fuente |
|---|---|
| Logo / títulos principales | Cinzel Bold |
| Subtítulos | Cinzel SemiBold o Inter SemiBold |
| Texto de lectura (libros, estudios) | Crimson Pro |
| Interfaces digitales (web, app) | Inter |
| Botones | Inter SemiBold |
| Presentaciones | Cinzel + Inter |
| Certificados / diplomas | Cinzel + Crimson Pro |

### Espíritu de la marca

Los diseños del ministerio transmiten: sabiduría bíblica, revelación espiritual, excelencia,
**solemnidad sin rigidez**, elegancia contemporánea. El resultado debe sentirse atemporal y
autorizado, no corporativo ni frío.

El dorado no es decoración — es significado (gloria, reino, luz divina). El azul petróleo no
es fondo genérico oscuro — es profundidad espiritual y autoridad. Úsalos con esa intención.

---

---

## Fase 1: Marco de Diseño (obligatoria antes de escribir código)

Antes de tocar una línea de código, establece el marco. Si el brief no lo especifica, decide tú — pero decláralo explícitamente.

### 1.1 Identifica los tres ejes

**Propósito**: ¿Qué acción quiere el usuario hacer después de ver esto? Nombra una sola cosa.
**Público objetivo**: ¿A quién va dirigido? Sé específico. No "usuarios generales" — "ingenieros de datos en empresas medianas" o "coleccionistas de arte urbano entre 25-40 años".
**Estética**: Elige una dirección con nombre propio. Ejemplos:

| Estética | Señales visuales |
|---|---|
| Brutalista | Tipografía pesada, colores crudos, sin border-radius, grillas rotas |
| Retrofuturista | Scanlines, neón sobre oscuro, tipografía monoespaciada, elementos CRT |
| Maximalista | Superposición de capas, texturas, tipografía expresiva, densidad intencional |
| Editorial | Columnas de periódico, serif clásico, blanco y negro + un acento |
| Lujosa / Quiet luxury | Mucho espacio en blanco, dorado o plata, serif fino, sin adornos superfluos |
| Lúdica | Ilustraciones planas, animaciones bounce, colores saturados, formas blobby |
| Orgánica / Artesanal | Texturas de papel, tipografía manuscrita, paleta terrosa |
| Neomorfista | Sombras internas, superficie unicolor, profundidad sutil |
| Glitch / Cyberpunk | Distorsión cromática, tipografía cortada, efectos de ruido |

### 1.2 Token system mínimo

Define antes de codificar:

```
COLOR: 4–6 valores hex con nombres propios (no "primary", "secondary" — usa nombres descriptivos: "tinta", "crema", "acento sangre", "sombra noche")
TIPO:
  - Display face: la tipografía protagonista, usada con contención
  - Body face: complementaria, legible, no la misma familia que la display
  - Utility face (opcional): para datos, labels, captions
ESCALA TIPOGRÁFICA: tamaños base, line-heights, letter-spacing por rol
FIRMA: el único elemento por el que esta página será recordada
```

### 1.3 Auto-crítica antes de construir

Antes de empezar el código, pregúntate:
- ¿Llegaría a la misma solución para cualquier brief similar?
- ¿Hay algún default de IA en mi plan que se coló sin justificación?
- ¿La firma es realmente única para este brief, o es una técnica genérica aplicada aquí?

Si cualquier respuesta incomoda, ajusta el plan. Solo cuando el plan supere esta revisión, escribe código.

---

## Fase 2: Principios de Construcción

### Tipografía como personalidad

- Importa fuentes de Google Fonts, Adobe Fonts, o usa fuentes del sistema de forma *intencional* (no por omisión).
- Combina familias inesperadas: un serif expresivo display + sans-serif geométrico body funciona. Un serif + serif body sin razón clara, no.
- La tipografía debe ser un elemento de diseño visible, no un vehículo neutro. Experimenta con: tracking extremo, mezcla de pesos en una misma línea, texto como elemento gráfico.
- Evita: Inter + cualquier cosa (a menos que el brief pida minimalismo tecnológico), Roboto por defecto, font-size uniforme en toda la página.

### Paleta con carácter

- La paleta debe poderse describir en palabras evocadoras: "tinta china, papel de arroz, rojo laca" es una paleta. "azul, blanco, gris" no lo es.
- Usa al menos un color que sorprenda ligeramente dentro del mood elegido.
- Evita: degradados morado→rosa (el default de IA más reconocible), #6366f1 Indigo de Tailwind, paletas de 3 colores donde todos son neutros.

### Movimiento orquestado

El movimiento debe tener una dirección y un propósito. No aplicar animaciones al azar.

```css
/* Patrón: entrada en cascada con personalidad */
@keyframes slide-up-fade {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
/* Stagger: cada elemento 80ms después del anterior */
```

Considera:
- **Page load sequence**: ¿qué es lo primero que el usuario ve moverse? Debe ser lo más importante.
- **Scroll triggers**: IntersectionObserver para revelar elementos al hacer scroll. No todos — elegir con criterio.
- **Hover micro-interactions**: feedback visual inmediato en elementos interactivos.
- **Ambient motion**: movimientos lentos de fondo (gradientes que respiran, partículas sutiles) solo si sirven al mood.

Regla: un movimiento orquestado bien ejecutado vale más que diez animaciones dispersas.

### Composición espacial

- **Asimetría intencionada**: las grillas simétricas perfectas se leen como plantillas. Una columna de 7/5 o un elemento que rompe el contenedor añade tensión visual.
- **Elementos que rompen la cuadrícula**: texto que se sale del contenedor, imágenes que se superponen a las secciones, tipografía que sangra.
- **Espacio negativo como decisión**: el espacio en blanco debe ser parte del diseño, no lo que sobra.
- **Jerarquía visual clara**: el ojo debe saber adónde ir primero, segundo, tercero. Prueba la jerarquía borrando los colores — si sigue funcionando, es sólida.

### Profundidad visual

```css
/* Texturas sutiles via SVG inline */
background-image: url("data:image/svg+xml,...");
/* Superposición de capas */
.card::before { content: ''; position: absolute; mix-blend-mode: multiply; }
/* Gradientes no lineales */
background: radial-gradient(ellipse at 30% 20%, #color1 0%, transparent 60%),
            linear-gradient(135deg, #color2, #color3);
```

Técnicas de profundidad por estética:
- **Brutalista**: sombras de caja sólidas (no difusas), colores planos
- **Lujosa**: backdrop-filter: blur(), transparencias con saturación
- **Retrofuturista**: box-shadow con neón, efectos scanline con CSS
- **Editorial**: separación a través de espacio, no efectos

---

## Fase 3: Anti-patrones — Prohibiciones Activas

El diseño genérico de IA tiene señales identificables. Evítalas a menos que el brief las exija explícitamente:

### Tipografía
- NO: font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif (el default de sistema sin decisión)
- NO: Inter como única fuente en todo
- NO: Tamaños de fuente uniformes sin jerarquía real
- NO: Títulos font-weight: 700 + cuerpo font-weight: 400 en todo sin variación

### Colores
- NO: #6366f1 (Indigo Tailwind) como color primario
- NO: Degradados from-purple-500 to-pink-500
- NO: Fondo #1a1a2e oscuro genérico
- NO: Fondo crema #F4F1EA + acento terracota (el "warm minimal" de IA)
- NO: Paletas de solo 3 colores donde dos son neutros

### Layout
- NO: Grilla de tarjetas 3x3 con border-radius uniforme y sombra igual en todas
- NO: Hero centrado con título H1 grande + subtítulo + CTA button (a menos que el brief lo pida)
- NO: Secciones numeradas 01/02/03 sin que el contenido sea realmente secuencial
- NO: Iconos de Heroicons/Lucide en cada elemento de lista como decoración vacía
- NO: Footer de 4 columnas simétricas con links

### Código
- NO: Variables CSS nombradas --primary, --secondary, --accent sin semántica de dominio
- NO: Clases utilitarias sin token system propio detrás
- NO: Media queries solo para mobile/desktop sin breakpoints intermedios pensados

---

## Fase 4: Código

### Stack preferido

**HTML + CSS + JS vanilla** para landing pages y componentes aislados — máximo control.
**React** cuando el brief pida componentes interactivos con estado.
**CSS custom properties** para el token system, siempre.

### Estructura de archivo

```html
<!-- 1. Variables CSS y reset -->
<style>
  :root {
    /* Token system definido en Fase 1 */
    --color-tinta: #1C1C1E;
    --color-crema: #F7F3EC;
    --font-display: 'Playfair Display', serif;
    --font-body: 'DM Sans', sans-serif;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; }
</style>

<!-- 2. HTML semántico con clases descriptivas del dominio -->
<!-- No: .card-container. Sí: .producto-destacado, .manifesto-section -->

<!-- 3. JS al final, sin frameworks si no es necesario -->
<script>
  // IntersectionObserver para scroll triggers
  // Event listeners para interacciones
</script>
```

### Importación de fuentes

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=...&display=swap" rel="stylesheet">
```

### Accesibilidad mínima (no negociable)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
:focus-visible { outline: 2px solid var(--color-acento); outline-offset: 3px; }
```

- Contraste mínimo WCAG AA para texto sobre fondos
- alt en imágenes, aria-label en botones sin texto visible
- Responsive: funciona en 375px y 1440px como mínimo

---

## Fase 5: Auto-crítica final

Antes de entregar:

1. **Prueba de memorabilidad**: ¿Hay algo en este diseño que el usuario recordará mañana? ¿Qué es?
2. **Prueba de atribución**: ¿Podría este diseño pertenecer a cualquier otro brief del mismo tipo? Si sí, algo está mal.
3. **Prueba de Chanel**: Mira el resultado y elimina un elemento decorativo. ¿El diseño mejora o empeora? Si mejora, seguía habiendo exceso.
4. **Prueba de jerarquía**: Visualiza la página en escala de grises. ¿La jerarquía sigue siendo clara?

---

## Referencia: Combinaciones de fuentes no-genéricas

Puntos de partida, no fórmulas:

| Display | Body | Mood |
|---|---|---|
| Playfair Display | DM Sans | Editorial elegante |
| Space Grotesk | Source Serif 4 | Tech con humanismo |
| Bebas Neue | Libre Baskerville | Impacto editorial |
| Cormorant Garamond | Jost | Lujo contenido |
| Cabinet Grotesk | Lora | Moderno cálido |
| Syne | Inconsolata | Retrofuturista |
| Clash Display | General Sans | Moda contemporánea |
| Fraunces | Plus Jakarta Sans | Expresivo orgánico |

---

## Nota sobre IA y diseño

El riesgo más alto en diseño generado por IA no es la calidad técnica — es la convergencia estética. Cuando todos los modelos son entrenados en los mismos datasets de diseño popular, tienden hacia los mismos patrones. Este skill existe para contrarrear esa convergencia: cada decisión debe estar justificada por el brief específico, no por lo que funciona estadísticamente para diseños similares.

La originalidad en diseño no significa rareza forzada. Significa que las decisiones emergen del brief en lugar de emerger de los defaults del entrenamiento.
