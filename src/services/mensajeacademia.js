// MensajeAcademia para LemWriter PC — Fase D.
//
// Publica en el canal TEMAS APOSTÓLICOS directamente desde LemWriter,
// sin pasar por el teléfono del maestro: construye las filas del buzón
// (tabla `lc_mensajes` de Supabase) firmadas con la llave del maestro y
// las inserta por REST, con EXACTAMENTE los formatos que la app del
// estudiante ya verifica (src/lemchat/buzon.ts, entrega.ts, servicio.ts):
//
//   - Firma de fila:  Ed25519 sobre `lemchat-buzon-v1|<de>|<para>|<tipo>|<sha256hex(cuerpo)>`
//   - Sobre paquete:  { tipo:'paquete-lemchat', formato:1, academiaId,
//                       paqueteTexto, claveMaestro, firma, emitido }
//                     con firma sobre `lemchat-paquete-v1|<academiaId>|<paqueteTexto>`
//   - Dirección del canal: para = 'canal'
//   - Aviso: el cuerpo de la fila es el texto plano del aviso.
//
// En el renderer no hay node:crypto: la firma es Ed25519 con
// @noble/ed25519 + @noble/hashes, igual que en la app del estudiante.
// Las claves viajan en base64url, como en la app y en el archivo de
// llaves del maestro.
import * as ed from '@noble/ed25519'
import { sha256, sha512 } from '@noble/hashes/sha2'
import { bytesToHex } from '@noble/hashes/utils'

// noble ed25519 en modo síncrono (igual que la app del estudiante):
// sin esto, firmar y derivar la llave pública serían asíncronos.
ed.etc.sha512Sync = (...mensajes) => sha512(ed.etc.concatBytes(...mensajes))

// ---------------------------------------------------------------------------
// Utilidades puras (las mismas de la app: texto y base64url)

const codificador = new TextEncoder()
const decodificador = new TextDecoder()

export function textoABytes(texto) {
  return codificador.encode(texto)
}

export function bytesATexto(bytes) {
  return decodificador.decode(bytes)
}

export function bytesABase64Url(bytes) {
  let binario = ''
  const trozo = 0x8000
  for (let i = 0; i < bytes.length; i += trozo) {
    binario += String.fromCharCode(...bytes.subarray(i, i + trozo))
  }
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlABytes(texto) {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/')
  const conRelleno = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const binario = atob(conRelleno)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return bytes
}

export function bytesAHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ---------------------------------------------------------------------------
// Ed25519 y SHA-256

export function sha256Hex(texto) {
  return bytesToHex(sha256(textoABytes(texto)))
}

/** Deriva la llave pública (base64url) desde la privada: para validar el archivo de llaves. */
export function clavePublicaDe(clavePrivadaB64) {
  return bytesABase64Url(ed.getPublicKey(base64UrlABytes(clavePrivadaB64)))
}

/** Firma un texto (UTF-8) y devuelve la firma en base64url. */
export function firmarTexto(clavePrivadaB64, texto) {
  return bytesABase64Url(ed.sign(textoABytes(texto), base64UrlABytes(clavePrivadaB64)))
}

/** Verifica una firma de texto; cualquier dato dañado devuelve false. */
export function verificarTexto(clavePublicaB64, firmaB64, texto) {
  try {
    return ed.verify(base64UrlABytes(firmaB64), textoABytes(texto), base64UrlABytes(clavePublicaB64))
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Llave del maestro (el JSON que crea scripts/lemchat-claves-maestro.mjs)

/** Lee y VALIDA el texto del archivo de llaves: la privada debe corresponder a la pública. */
export function cargarLlaveMaestro(textoJson) {
  let datos
  try {
    datos = JSON.parse(textoJson)
  } catch {
    throw new Error('El archivo de llaves del maestro no es un JSON válido.')
  }
  if (!datos?.clavePublica || !datos?.clavePrivada) {
    throw new Error('Al archivo de llaves le faltan clavePublica o clavePrivada.')
  }
  let derivada
  try {
    derivada = clavePublicaDe(datos.clavePrivada)
  } catch {
    throw new Error('La llave privada del maestro no se pudo leer.')
  }
  if (derivada !== datos.clavePublica) {
    throw new Error('La llave privada no corresponde a la pública: archivo de llaves dañado.')
  }
  return {
    nombre: datos.nombre ?? 'LemGil Apóstol',
    clavePublica: datos.clavePublica,
    clavePrivada: datos.clavePrivada,
  }
}

// ---------------------------------------------------------------------------
// Filas del buzón, idénticas a las de la app (buzon.ts / entrega.ts)

export const CANAL = 'canal'

export function textoFirmadoBuzon(de, para, tipo, cuerpo) {
  return `lemchat-buzon-v1|${de}|${para}|${tipo}|${sha256Hex(cuerpo)}`
}

/** Firma una fila del buzón { de, para, tipo, cuerpo } y la devuelve completa. */
export function firmarFila(llave, fila) {
  return {
    ...fila,
    firma: firmarTexto(
      llave.clavePrivada,
      textoFirmadoBuzon(fila.de, fila.para, fila.tipo, fila.cuerpo),
    ),
  }
}

/** Verifica la firma de una fila recibida (lo que hace la app al recogerla). */
export function filaVerifica(fila) {
  if (!fila?.de || !fila?.firma) return false
  return verificarTexto(
    fila.de,
    fila.firma,
    textoFirmadoBuzon(fila.de, fila.para, fila.tipo, fila.cuerpo),
  )
}

export function textoFirmadoPaquete(academiaId, paqueteTexto) {
  return `lemchat-paquete-v1|${academiaId}|${paqueteTexto}`
}

/** El sobre firmado que la app verifica antes de archivar la enseñanza sola. */
export function crearSobrePaquete(llave, paqueteTexto, academiaId) {
  return {
    tipo: 'paquete-lemchat',
    formato: 1,
    academiaId,
    paqueteTexto,
    claveMaestro: llave.clavePublica,
    firma: firmarTexto(llave.clavePrivada, textoFirmadoPaquete(academiaId, paqueteTexto)),
    emitido: new Date().toISOString(),
  }
}

/** Fila de aviso al canal: el cuerpo es el texto plano del aviso. */
export function filaAvisoCanal(llave, texto) {
  return firmarFila(llave, {
    de: llave.clavePublica,
    para: CANAL,
    tipo: 'aviso',
    cuerpo: texto,
  })
}

/** Fila de enseñanza al canal: el cuerpo es el sobre firmado en JSON. */
export function filaPaqueteCanal(llave, academiaId, paqueteTexto) {
  const sobre = crearSobrePaquete(llave, paqueteTexto, academiaId)
  return firmarFila(llave, {
    de: llave.clavePublica,
    para: CANAL,
    tipo: 'paquete',
    cuerpo: JSON.stringify(sobre),
  })
}

// ---------------------------------------------------------------------------
// Identificador de academia (el mismo criterio que valida la app del
// estudiante al importar: minúsculas, números y guiones, ej. «lemgil-14»)

const REGEX_IDENTIFICADOR = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function validarIdentificador(identificador) {
  return REGEX_IDENTIFICADOR.test((identificador ?? '').trim())
}

// ---------------------------------------------------------------------------
// Envío al buzón por REST (mismo proyecto Supabase de LemWriter/Academia).
// cfg = { url, anonKey }. El fetch es inyectable vía opts.fetchFn (pruebas).

export async function publicarEnBuzon(cfg, filas, opts = {}) {
  const fetchFn = opts.fetchFn ?? fetch
  const base = (cfg?.url ?? '').replace(/\/+$/, '')
  if (!base || !cfg?.anonKey) {
    throw new Error('Falta la configuración del buzón (URL y llave anónima de Supabase).')
  }
  for (const fila of filas) {
    const res = await fetchFn(`${base}/rest/v1/lc_mensajes`, {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(fila),
    })
    if (!res.ok) throw new Error(`El buzón rechazó la publicación (${res.status}).`)
  }
}

/** Publica un aviso firmado en el canal TEMAS APOSTÓLICOS. */
export async function publicarAviso(cfg, llave, texto, opts = {}) {
  const limpio = (texto ?? '').trim()
  if (!limpio) throw new Error('El aviso está vacío.')
  if (limpio.length > 1000) throw new Error('El aviso es demasiado largo (máximo 1000 caracteres).')
  const fila = filaAvisoCanal(llave, limpio)
  await publicarEnBuzon(cfg, [fila], opts)
  return fila
}

/** Publica una enseñanza firmada en el canal: la app la archiva sola al verificar la firma. */
export async function publicarPaquete(cfg, llave, academiaId, paqueteTexto, opts = {}) {
  const id = (academiaId ?? '').trim()
  if (!validarIdentificador(id)) {
    throw new Error('El identificador de la academia no es válido (minúsculas, números y guiones, ej. lemgil-14).')
  }
  if (!(paqueteTexto ?? '').trim()) throw new Error('El paquete de la enseñanza está vacío.')
  const fila = filaPaqueteCanal(llave, id, paqueteTexto)
  await publicarEnBuzon(cfg, [fila], opts)
  return fila
}

/**
 * La publicación completa de una enseñanza: aviso + paquete, en ese orden.
 * Devuelve las filas enviadas (para registro en LemWriter).
 */
export async function publicarEnsenanza(cfg, llave, datos, opts = {}) {
  const aviso = await publicarAviso(cfg, llave, `Nueva enseñanza: ${datos.tituloAviso}`, opts)
  const paquete = await publicarPaquete(cfg, llave, datos.academiaId, datos.paqueteTexto, opts)
  return [aviso, paquete]
}
