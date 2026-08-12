# Feature Specification: Reordenar Secciones del Proyecto

**Feature Branch**: `001-reorder-sections`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "En el panel lateral de LemWriter hay una lista de capítulos/secciones del documento. Quiero poder reordenarlos cambiando su posición dentro del proyecto. El usuario debe poder moverlos de dos formas: arrastrando y soltando con el mouse (drag & drop), y con botones de subir/bajar. Al mover una sección, el contenido del editor debe reflejar el nuevo orden inmediatamente. El orden debe persistir al cerrar y reabrir el proyecto."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reordenar secciones arrastrando y soltando (Priority: P1)

El usuario abre un proyecto con varias secciones en el panel lateral y reordena una sección arrastrándola con el mouse a una nueva posición. Al soltarla, la lista refleja el nuevo orden de inmediato y el editor muestra la sección correspondiente a su nueva posición.

**Why this priority**: Es la interacción principal solicitada y la que mayor valor aporta al flujo de escritura: permite reorganizar la estructura del documento de forma visual y directa.

**Independent Test**: Puede probarse de forma independiente abriendo un proyecto con al menos 3 secciones, arrastrando una sección a otra posición y verificando que la lista y el editor muestran el nuevo orden sin recargar la aplicación.

**Acceptance Scenarios**:

1. **Given** un proyecto abierto con 3 o más secciones visibles en el panel lateral, **When** el usuario arrastra la sección 2 y la suelta en la posición de la sección 1, **Then** la lista muestra la sección 2 en la primera posición y la sección 1 en la segunda.
2. **Given** un proyecto abierto con secciones en el panel lateral, **When** el usuario arrastra una sección a una posición inválida (fuera de la lista), **Then** la sección vuelve a su posición original sin cambios.
3. **Given** un proyecto con la sección activa actualmente abierta en el editor, **When** el usuario mueve esa sección a otra posición, **Then** el editor continúa mostrando esa misma sección (contenido intacto) en su nueva posición.

---

### User Story 2 - Reordenar secciones con botones de subir/bajar (Priority: P2)

El usuario reordena una sección usando botones de subir o bajar disponibles en cada elemento de la lista. Cada clic mueve la sección una posición en la dirección indicada.

**Why this priority**: Es la alternativa solicitada, de menor esfuerzo cognitivo y accesible para usuarios que prefieren el teclado o el mouse sin arrastre. Complementa el drag & drop.

**Independent Test**: Puede probarse de forma independiente con un proyecto de 3 o más secciones, haciendo clic en "bajar" sobre la primera sección y verificando que intercambia posición con la segunda.

**Acceptance Scenarios**:

1. **Given** un proyecto abierto con secciones en el panel lateral, **When** el usuario hace clic en "bajar" sobre la primera sección, **Then** la sección intercambia posición con la segunda.
2. **Given** un proyecto abierto, **When** el usuario hace clic en "subir" sobre la primera sección, **Then** el botón no produce cambios (la sección ya está en el tope).
3. **Given** un proyecto abierto, **When** el usuario hace clic en "bajar" sobre la última sección, **Then** el botón no produce cambios (la sección ya está al final).

---

### User Story 3 - Persistencia del orden al cerrar y reabrir (Priority: P2)

El orden definido por el usuario se conserva: al cerrar el proyecto o la aplicación y volver a abrirlo, las secciones aparecen en el mismo orden.

**Why this priority**: Sin persistencia, el reordenamiento perdería todo su valor. Es un requisito transversal que valida el ciclo completo de la funcionalidad.

**Independent Test**: Puede probarse de forma independiente reordenando secciones, cerrando el proyecto y reabriéndolo, y verificando que el orden se mantiene.

**Acceptance Scenarios**:

1. **Given** un proyecto cuyas secciones fueron reordenadas, **When** el usuario cierra el proyecto y lo reabre, **Then** las secciones aparecen en el orden guardado.
2. **Given** un proyecto cuyas secciones fueron reordenadas, **When** el usuario cierra la aplicación por completo y la vuelve a abrir, **Then** las secciones del proyecto aparecen en el orden guardado.

---

### Edge Cases

- ¿Qué sucede cuando el proyecto tiene una sola sección? Los botones subir/bajar deben estar deshabilitados o no tener efecto, y el arrastre no debe permitir cambiar el orden.
- ¿Qué sucede si el usuario inicia un arrastre y suelta la sección en su misma posición? No debe ocurrir ningún cambio ni error.
- ¿Qué sucede si el usuario reordena mientras el editor tiene cambios sin guardar en la sección activa? El contenido de la sección activa debe conservarse y el editor debe seguir mostrando esa sección.
- ¿Qué sucede si el arrastre se interrumpe (p. ej., se suelta el mouse fuera de la ventana)? La sección debe permanecer en su posición original o en la última posición válida sin corrupción del orden.
- ¿Qué sucede si dos secciones tienen el mismo nombre? El reordenamiento debe operar sobre la identidad interna de cada sección, no sobre su nombre.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST mostrar las secciones del proyecto en el panel lateral en su orden vigente.
- **FR-002**: El usuario MUST poder reordenar una sección arrastrándola y soltándola en una nueva posición dentro de la lista.
- **FR-003**: El usuario MUST poder reordenar una sección una posición a la vez mediante botones de subir y bajar en cada elemento de la lista.
- **FR-004**: El sistema MUST reflejar el nuevo orden en el editor de forma inmediata al completar un movimiento (arrastre soltado o clic en botón).
- **FR-005**: El sistema MUST persistir el orden de las secciones al cerrar y reabrir el proyecto y la aplicación.
- **FR-006**: El sistema MUST conservar el contenido y la sección activa del editor al reordenar.
- **FR-007**: El sistema MUST impedir cambios de orden inválidos: una sección no puede quedar fuera de la lista, y los movimientos hacia arriba de la primera sección o hacia abajo de la última no deben producir cambios.
- **FR-008**: El sistema MUST mantener el orden de las secciones consistente entre el panel lateral y cualquier otra vista que muestre la estructura del proyecto.

### Key Entities *(include if feature involves data)*

- **Sección**: Capítulo o unidad del documento dentro de un proyecto. Tiene identidad propia, título/contenido, y una posición dentro del proyecto que determina su orden en la lista.
- **Proyecto**: Contenedor de secciones. El orden de las secciones es una propiedad del proyecto y se conserva al reabrir.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El usuario puede reordenar una sección mediante arrastre o botones y ver el resultado en el editor en menos de 1 segundo tras soltar/click.
- **SC-002**: El 100% de los reordenamientos realizados se conservan al cerrar y reabrir el proyecto.
- **SC-003**: El reordenamiento nunca provoca pérdida de contenido: el texto de la sección activa permanece íntegro tras cualquier movimiento.
- **SC-004**: El 100% de los movimientos inválidos (primer elemento hacia arriba, último hacia abajo) se manejan sin error ni corrupción del orden.
- **SC-005**: El orden es consistente en todas las vistas de la estructura del proyecto (panel lateral y cualquier otra que la muestre).

## Assumptions

- El proyecto ya dispone de un panel lateral con la lista de secciones y de un editor funcional; esta funcionalidad solo añade la capacidad de reordenar y persistir el orden.
- El reordenamiento se limita a secciones dentro de un mismo proyecto; mover secciones entre proyectos queda fuera de alcance.
- No se requiere soporte para deshacer (undo) del reordenamiento en esta iteración.
- La persistencia del orden se implementará con los mecanismos de almacenamiento existentes del proyecto (base de datos local), sin introducir dependencias nuevas.
- Los botones de subir/bajar son una alternativa accesible al arrastre; ambos deben mantenerse sincronizados en el mismo orden subyacente.
- Se asume que la base de datos ya almacena las secciones con un identificador estable; solo hace falta persistir su posición.