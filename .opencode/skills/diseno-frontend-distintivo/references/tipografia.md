# Referencia de Tipografía

## Combinaciones recomendadas por estética

### Brutalista / Editorial duro
- **Display**: Space Grotesk (700–800) o Syne (800)
- **Body**: IBM Plex Mono o JetBrains Mono
- **Por qué funciona**: la tensión entre grotesca geométrica y mono crea fricción intencional

### Maximalista / Expresivo
- **Display**: Playfair Display (900, italic) o Cormorant Garamond (700)
- **Body**: DM Sans (300–400)
- **Utility**: Courier Prime para labels y metadata
- **Por qué funciona**: el contraste serif dramático / sans funcional crea jerarquía sin esfuerzo

### Retrofuturista / Sci-fi
- **Display**: Orbitron o Exo 2 (800)
- **Body**: Rajdhani (400–500)
- **Por qué funciona**: geometría dura consistente en todo el sistema

### Lujo / Premium
- **Display**: Cormorant (300–400, italic para acento) o Fraunces
- **Body**: Lato (300) o Source Serif 4 (300)
- **Por qué funciona**: el peso ligero en display es contraintuitivo y elegante

### Lúdico / Orgánico
- **Display**: Nunito (900) o Fredoka One
- **Body**: Nunito (400) o Quicksand
- **Por qué funciona**: las terminaciones redondeadas unifican el sistema

### Dark Industrial
- **Display**: Bebas Neue o Anton (letras condensadas)
- **Body**: Roboto Condensed (300–400)
- **Por qué funciona**: la compresión horizontal da densidad de información

### Japón contemporáneo / Minimalista
- **Display**: Shippori Mincho (700) o Noto Serif JP
- **Body**: Noto Sans (300) o Work Sans (300)
- **Por qué funciona**: la mezcla de serif con carácter asiático y sans occidental crea distinción

### Editorial / Periódico moderno
- **Display**: Libre Baskerville (700, italic) o Crimson Pro (800)
- **Body**: Source Sans 3 (400)
- **Utility**: Roboto Mono para datelines y metadata
- **Por qué funciona**: referencia tipografía impresa con limpieza digital

---

## Escalas tipográficas no genéricas

En lugar de multiplicar por 1.25 o 1.5 uniformemente:

```css
/* Escala con saltos dramáticos — crea jerarquía visual fuerte */
--text-xs:   0.688rem;  /* 11px */
--text-sm:   0.875rem;  /* 14px */
--text-base: 1.0625rem; /* 17px */
--text-lg:   1.3125rem; /* 21px */
--text-xl:   1.875rem;  /* 30px */
--text-2xl:  2.875rem;  /* 46px */
--text-3xl:  4.5rem;    /* 72px */
--text-hero: 7.5rem;    /* 120px */
```

```css
/* Escala modular basada en proporción áurea (×1.618) */
--text-xs:   0.618rem;
--text-sm:   1rem;
--text-base: 1rem;
--text-lg:   1.618rem;
--text-xl:   2.618rem;
--text-2xl:  4.236rem;
--text-3xl:  6.854rem;
```

---

## Clichés tipográficos a evitar

1. **Inter como display face** — es excelente para UI pero no hace declaraciones
2. **Todo en mayúsculas** para más de un nivel de titular (un nivel: bien; toda la jerarquía: cliché)
3. **Poppins + cualquier cosa** — la combinación más sobreusada de los últimos 5 años
4. **Font-weight 300 en body a tamaño pequeño** — ilegible y pretencioso
5. **Letra condensada + versalitas** — el truco "editorial falso"
6. **Montserrat para titulares** — overused al punto de ser invisible
7. **Escala uniforme** — 16/24/32/48 en pasos de 8px exactos sin variación

---

## Implementación de fuentes (Google Fonts)

```html
<!-- Ejemplo: Fraunces (display) + DM Sans (body) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;1,9..144,300;1,9..144,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
```

```css
:root {
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
}
```

## Propiedades tipográficas para carácter

```css
/* Titulares grandes: tracking negativo */
.headline-hero {
  font-family: var(--font-display);
  font-size: var(--text-hero);
  letter-spacing: -0.04em;
  line-height: 0.9;
}

/* Labels y eyebrows: tracking amplio */
.label {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

/* Body: no neutral */
.body-text {
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: 1.7;
  font-weight: 300;
}
```
