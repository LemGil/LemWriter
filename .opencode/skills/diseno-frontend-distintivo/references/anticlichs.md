# Anti-Clichés: Patrones a Evitar

Lista de patrones que identifican inmediatamente un diseño como genérico de IA.
Revisa esta lista contra tu plan de diseño antes de codificar.

---

## Paleta y Color

| Cliché | Por qué ocurre | Alternativa |
|--------|----------------|-------------|
| Gradiente morado → azul como elemento "premium" | Default de todo generador de UI | Monocromáticos con valor, complementarios inesperados |
| Fondo negro + acento verde ácido = "tech" | La shorthand visual de startup tech desde 2018 | Negro profundo con acentos ámbar, naranja quemado, o sin acento saturado |
| Fondo crema (#F4F1EA) + serif + terracota (#D97757) | El "warm editorial look" más reproducido | Si quieres calidez, varía el tono base significativamente |
| Gradiente de fondo decorativo difuminado | No saber qué poner de fondo | Fondo plano con textura sutil, o imagen real con tratamiento |
| Sombras en gris neutro | Default de todas las librerías CSS | Sombras teñidas con el color del objeto o su complementario |

---

## Layout y Estructura

| Cliché | Por qué ocurre | Alternativa |
|--------|----------------|-------------|
| Grid 3×N de tarjetas idénticas para "features" | El patrón más simple de repetición | Asimetría: 1 card grande + 2 pequeñas, o lista + una card destacada |
| Hero: [headline grande] + [subheadline] + [CTA] centrado | La fórmula de toda landing page | Hero asimétrico, con elemento visual como protagonista, headline offset |
| Sección de estadísticas: [N] + [etiqueta] × 3 | La forma más rápida de mostrar números | Números integrados en prosa, o visualización alternativa |
| Footer de 4 columnas simétricas | Default de todos los temas | Footer editorial, footer mínimo con un solo elemento, o footer integrado |
| Sección de testimonios con avatar circular + estrellas | El patrón de confianza más sobreusado | Testimonios como citas tipográficas, o sin estrellas con más contexto real |

---

## Elementos Decorativos

| Cliché | Por qué ocurre | Alternativa |
|--------|----------------|-------------|
| Círculos/blobs difuminados de fondo | Técnica de "añadir profundidad sin diseño" | Texturas de ruido SVG, patrones geométricos, o sin decoración de fondo |
| Íconos Lucide/Heroicons sin personalización | La librería por defecto | Íconos personalizados con SVG inline, o sin íconos usando tipografía |
| Ilustración de líneas finas con personaje humano estilizado | El estilo de ilustración más clonado | Fotografía real, formas abstractas, o diseño sin ilustración |
| Separadores de sección en onda/diagonal | El truco de "hacer que las secciones conecten" | Secciones con sangrado, superposición vertical, o separación tipográfica |
| Badge/pill con border-radius: 9999px para "modern" | El elemento UI más sobreusado | Tags con border-radius: 2–4px, o tags tipográficos sin contenedor |

---

## Movimiento

| Cliché | Por qué ocurre | Alternativa |
|--------|----------------|-------------|
| Fade-in con translateY(20px) en todo el scroll | La animación más fácil de implementar | Reveals con dirección contextual (horizontal, scale, clip-path) |
| Hover: escala a 1.05 en tarjetas | Default de "hacer hover interactivo" | Cambio de color, traducción en eje inusual, reveal de elemento oculto |
| Loading: skeleton screen idéntico para todo | El patrón de "mostrar que carga" | Si es posible, no loading visible; si no, específico al contenido |
| Parallax genérico | El truco de "profundidad" desde 2012 | Parallax con propósito narrativo o eliminarlo completamente |

---

## Tipografía

Ver `tipografia.md` para la lista completa. Resumen:

- **Inter como display** — úsala para body/UI, no para hacer declaraciones  
- **Poppins en cualquier combinación** — el Helvetica de los malos diseños de 2020–2024  
- **Todo en caps en toda la jerarquía** — un nivel está bien; la jerarquía completa no  
- **Escala de tipografía en múltiplos de 8** exactos sin variación  

---

## Proceso de verificación

Antes de entregar, pregúntate:

1. ¿Podría confundirse este diseño con el output de v0, Bolt, o Framer AI?
2. ¿Si alguien viera solo el layout sin contenido, sabría para qué industria es?
3. ¿El elemento firma existe en algún otro diseño que haya generado este mes?
4. ¿La paleta tiene algún color que sorprenda genuinamente?
5. ¿La tipografía elegida tiene historia o carácter propio, o es "segura"?

Si cualquiera de estas respuestas genera duda, revisita ese eje antes de entregar.
