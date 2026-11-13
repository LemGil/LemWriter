# LemWriter PC — «Publicar también por MensajeAcademia» (Fase D)

Paquete construido y verificado contra el código real de tu repo
`LemGil/LemWriter` (v1.1.6) y contra la app del estudiante: las filas y
el paquete que genera este LemWriter pasan las verificaciones reales de
la app (`filaEsAutentica`, `leerSobre`, `decidirEntrega` →
**«archivar»**, `validarPaquete`).

## Qué trae

- `src/services/mensajeacademia.js` — firma Ed25519 e inserción en el
  buzón `lc_mensajes`, con los formatos exactos de la app.
- `src/services/paqueteEstudiante.js` — construye el paquete de la
  academia (formato 1) desde las secciones del proyecto.
- `src/services/publicarMensajeAcademia.js` — el puente: llave del
  maestro guardada una sola vez en esta PC (localStorage
  `lw-maestro-llave-v1`); la URL y la llave anónima salen de la
  configuración de Supabase que LemWriter ya tiene guardada.
- `src/components/Editor/PublicarAcademiaModal.jsx` — la casilla
  «📣 Publicar también por MensajeAcademia» bajo el conteo de
  secciones, con el identificador recordado por proyecto y el espacio
  para pegar la llave la primera vez. Si el envío por MensajeAcademia
  falla, la publicación en la Academia NO se deshace: el diálogo lo
  avisa en ámbar.
- `src/__tests__/mensajeacademia.test.js` — 21 pruebas nuevas.
- `package.json` / `package-lock.json` — dos dependencias nuevas
  (@noble/ed25519 y @noble/hashes, las mismas que usa la app).

## Instalación (en tu PC, repo ~/LemWriter)

    cd ~/LemWriter && unzip -o ~/Descargas/lemwriter-pc-mensajeacademia.zip -d . && npm install

Para verlo (abre LemWriter en modo desarrollo):

    npm run dev

Abre un proyecto 🎓 Academia → «🎓 Publicar en Academia»: la casilla
está bajo el selector de Nivel. La primera vez, pega el contenido de
`claves-maestro-lemchat.json` en el espacio de la llave: se valida y
queda solo en esta PC.

## Nota sobre las pruebas

Si corres `npm test`, verás 44 fallos en `projectService.test.js`:
son el problema viejo de ABI de better-sqlite3 ya documentado en tu
AGENTS.md (D3), no de este paquete. Las 21 pruebas nuevas de
MensajeAcademia pasan, y `npm run build` queda en verde.
