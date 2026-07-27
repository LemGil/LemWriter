# Guía de Marca — Ministerio Apostólico LemGil

Lee este archivo cuando diseñes cualquier cosa para LemGil Ministerio Apostólico,
Academia del Espíritu, LemWriter, o materiales relacionados.

---

## Paleta de Colores

### Colores primarios

| Nombre | HEX | Uso |
|--------|-----|-----|
| Dorado Principal | `#C8A75D` | Identidad, detalles, títulos, elementos sagrados |
| Dorado Secundario | `#C9A24A` | Variantes, degradados, acentos |
| Azul Petróleo Profundo | `#1A3A4A` | Fondo principal, textos destacados, elegancia |
| Marfil | `#F7F3E9` | Fondos claros, documentos, equilibrio visual |

### Colores complementarios

| Nombre | HEX | Uso |
|--------|-----|-----|
| Blanco | `#FFFFFF` | Espacios y contraste |
| Gris Oscuro | `#2E2E2E` | Texto principal |
| Gris Claro | `#D9D9D9` | Bordes y divisores |

### Variables CSS completas

```css
:root {
  /* Primarios */
  --dorado:          #C8A75D;
  --dorado-alt:      #C9A24A;
  --azul-petroleo:   #1A3A4A;
  --marfil:          #F7F3E9;

  /* Complementarios */
  --blanco:          #FFFFFF;
  --gris-oscuro:     #2E2E2E;
  --gris-claro:      #D9D9D9;

  /* Aliases semánticos */
  --color-fondo-oscuro:   var(--azul-petroleo);
  --color-fondo-claro:    var(--marfil);
  --color-acento:         var(--dorado);
  --color-acento-hover:   var(--dorado-alt);
  --color-texto-primario: var(--gris-oscuro);
  --color-texto-sobre-oscuro: var(--marfil);
}
```

---

## Significado de los Colores

### 🟡 Dorado (#C8A75D / #C9A24A)
- Gloria de Dios
- Reino
- Sabiduría
- Excelencia
- Realeza
- Luz divina

**Nota de uso**: El dorado no es decoración — es afirmación teológica. Úsalo en elementos que
merezcan peso simbólico: el nombre del ministerio, títulos de secciones importantes, separadores
que marquen transición entre contenidos sagrados, bordes de certificados. No lo disperses como
"acento de UI".

### 🔵 Azul Petróleo (#1A3A4A)
- Profundidad espiritual
- Revelación
- Estabilidad
- Confianza
- Autoridad
- Madurez

**Nota de uso**: Es un azul oscuro con temperatura neutra-fría. Funciona excelentemente como
fondo porque permite que el dorado brille sobre él. Evita combinarlo con colores que compitan
con su solemnidad (no neones, no pasteles sobre él).

### ⚪ Marfil (#F7F3E9)
- Pureza
- Santidad
- Claridad
- Paz
- Elegancia

**Nota de uso**: Para fondos claros y documentos. Tiene más calidez que el blanco puro, lo cual
evita la frialdad clínica y se asocia mejor con materiales impresos y pergamino.

---

## Tipografía

### 1. Cinzel — Títulos e Identidad Institucional

```css
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&display=swap');

.titulo { font-family: 'Cinzel', serif; }
```

**Usos**: Logo, encabezados, portadas, material institucional, diplomas, eventos, presentaciones.

**Características**: Inspiración clásica romana. Elegante, monumental, atemporal. Sus mayúsculas
con proporciones clásicas dan autoridad sin agresividad.

**Notas técnicas**:
- Solo funciona en mayúsculas (es una fuente all-caps por naturaleza)
- Para titulares largos, ajusta letter-spacing: -0.02em a -0.04em
- Pesos disponibles: 400, 600, 700, 900
- No usar para texto de lectura — fatiga visual

### 2. Crimson Pro — Texto de Lectura

```css
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&display=swap');

.lectura { font-family: 'Crimson Pro', serif; }
```

**Usos**: Libros, manuales, estudios bíblicos, devocionales, enseñanzas largas, PDF, impresión.

**Características**: Muy cómoda para lectura prolongada. Estilo clásico. Excelente para impresión
y generación de PDF.

**Notas técnicas**:
- line-height recomendado: 1.7–1.8 para lectura larga
- Tamaño óptimo para body: 16–18px en pantalla, 11–12pt en impresión
- Las itálicas son expresivas — úsalas para citas bíblicas o énfasis editorial
- Se combina naturalmente con Cinzel (comparten raíces tipográficas clásicas)

### 3. Inter — Interfaces y Medios Digitales

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

.interfaz { font-family: 'Inter', sans-serif; }
```

**Usos**: Sitio web, LemWriter, Academia del Espíritu, formularios, aplicaciones, redes sociales.

**Características**: Moderna, muy legible, optimizada para pantallas de alta densidad.

**Notas técnicas**:
- Para UI: usar pesos 400 (body), 500 (labels activos), 600 (botones)
- No usar como display face en materiales institucionales — es para interfaces funcionales
- En tamaños pequeños (12–14px), Inter es claramente superior a Cinzel o Crimson Pro

---

## Combinaciones por Contexto

| Contexto | Display | Body | Utility |
|----------|---------|------|---------|
| **Logo** | Cinzel 700 | — | — |
| **Títulos principales** | Cinzel Bold | — | — |
| **Subtítulos** | Cinzel SemiBold o Inter SemiBold | — | — |
| **Libros / estudios bíblicos** | Cinzel (portada) | Crimson Pro | — |
| **Interfaces (web, app)** | Cinzel (títulos) | Inter | Inter |
| **Botones** | — | Inter SemiBold | — |
| **Presentaciones** | Cinzel | Inter | — |
| **Certificados / diplomas** | Cinzel | Crimson Pro | — |
| **Redes sociales** | Cinzel o Inter SemiBold | Inter | — |

---

## Patrones CSS Reutilizables

### Importación completa del sistema tipográfico

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### Composición oscura (fondos azul petróleo)

```css
.seccion-oscura {
  background-color: var(--azul-petroleo);
  color: var(--marfil);
}

.seccion-oscura h2,
.seccion-oscura h3 {
  font-family: var(--font-titulo);
  color: var(--dorado);
}

/* Separador dorado */
.separador-dorado {
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, var(--dorado), var(--dorado-alt));
  margin: 1.5rem 0;
}
```

### Composición clara (fondos marfil)

```css
.seccion-clara {
  background-color: var(--marfil);
  color: var(--gris-oscuro);
}

.seccion-clara h2 {
  font-family: var(--font-titulo);
  color: var(--azul-petroleo);
}

.seccion-clara .acento {
  color: var(--dorado);
}
```

### Botón primario del ministerio

```css
.btn-ministerio {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 0.875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.75rem 2rem;
  background-color: var(--dorado);
  color: var(--azul-petroleo);
  border: none;
  cursor: pointer;
  transition: background-color 200ms ease, transform 150ms ease;
}

.btn-ministerio:hover {
  background-color: var(--dorado-alt);
  transform: translateY(-1px);
}

/* Variante outline */
.btn-ministerio-outline {
  background: transparent;
  border: 1px solid var(--dorado);
  color: var(--dorado);
}

.btn-ministerio-outline:hover {
  background-color: var(--dorado);
  color: var(--azul-petroleo);
}
```

### Gradiente de marca

```css
/* Gradiente dorado para elementos premium */
.gradiente-dorado {
  background: linear-gradient(135deg, var(--dorado) 0%, var(--dorado-alt) 100%);
}

/* Gradiente de fondo sutil para secciones oscuras */
.fondo-profundo {
  background: linear-gradient(180deg, #1A3A4A 0%, #0F2535 100%);
}

/* Texto con gradiente dorado */
.titulo-dorado {
  background: linear-gradient(90deg, var(--dorado), var(--dorado-alt));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## Identidad y Espíritu Visual

La identidad de LemGil Ministerio Apostólico comunica:

- **Sabiduría bíblica** — diseños que invitan a pensar, no a consumir rápidamente
- **Revelación espiritual** — profundidad visual que evoca misterio y trascendencia
- **Excelencia** — acabados cuidados, ningún elemento descuidado
- **Solemnidad sin rigidez** — serio pero accesible, no frío ni burocrático
- **Elegancia contemporánea** — clásico en la forma, actual en la funcionalidad
- **Claridad en la enseñanza** — jerarquía visual que facilita la comprensión
- **Centralidad de Cristo y el Reino** — el dorado y el azul como afirmaciones teológicas

### Lo que NO es esta identidad

- No es corporativa ni empresarial (no fondos blancos con azul corporativo)
- No es popular/mainstream evangelical (no colores vibrantes sin substancia)
- No es ostentosa (el dorado es elegante, no brillante ni recargado)
- No es fría ni minimalista extrema (hay calidez en el marfil y profundidad en el azul)
- No es vintage nostálgico (es atemporal, no retro)

---

## Contextos de Aplicación

| Proyecto | Paleta dominante | Tipografía dominante | Notas |
|----------|-----------------|---------------------|-------|
| **Landing del Ministerio** | Azul petróleo + dorado | Cinzel + Inter | Heroica, solemne |
| **Academia del Espíritu (web app)** | Marfil + azul petróleo | Inter | Funcional, clara |
| **LemWriter (app)** | Gris oscuro + dorado | Inter | Productividad, sobria |
| **Materiales de enseñanza (PDF)** | Marfil + azul petróleo | Cinzel + Crimson Pro | Legible, imprimible |
| **Certificados / diplomas** | Marfil + dorado | Cinzel + Crimson Pro | Ceremonial |
| **Redes sociales / YouTube** | Azul petróleo + dorado | Cinzel + Inter | Impacto visual rápido |
| **Presentaciones** | Azul petróleo + marfil | Cinzel + Inter | Proyectable, legible |
