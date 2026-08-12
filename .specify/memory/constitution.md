<!-- 
Sync Impact Report:
- Version change: N/A -> 1.0.0
- Added sections: Core Principles (Stack, Stability, Quality, Architecture, Solo Developer), Governance
-->
# LemWriter Constitution

## Core Principles

### I. Stack
No se deben agregar dependencias npm sin aprobación explícita. Se debe preferir el uso de soluciones con las librerías ya instaladas. Tiptap v3 es la API vigente; nunca se deben usar patrones de v2.

### II. Estabilidad
El editor es el corazón del producto. Ningún cambio puede interrumpir el flujo de escritura ni romper documentos existentes. Toda migración de base de datos debe ser reversible.

### III. Calidad
Los tests deben escribirse antes del código de implementación. Cada tarea debe tener criterios de aceptación verificables. El agente debe reportar explícitamente cuando algo no pudo implementarse.

### IV. Arquitectura
Debe existir una separación estricta entre el proceso main (Electron/Node) y el renderer (React). La comunicación debe realizarse solo por IPC. No se permite el acceso directo al filesystem desde el renderer.

### V. Solo Developer
Se debe priorizar la simplicidad sobre la elegancia. El código debe ser legible y mantenible sin necesidad de documentación adicional.

## Governance
Esta constitución prevalece sobre todas las demás prácticas. Las enmiendas requieren documentación, aprobación y un plan de migración. Todos los PRs y revisiones deben verificar el cumplimiento de estos principios. La complejidad debe estar justificada.

**Version**: 1.0.0 | **Ratified**: 2026-08-12 | **Last Amended**: 2026-08-12
