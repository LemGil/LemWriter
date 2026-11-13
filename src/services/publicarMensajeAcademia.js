// Publicar también por MensajeAcademia — LemWriter PC (Fase D).
//
// Puente entre el modal «🎓 Publicar en Academia» y el módulo
// `mensajeacademia.js` (el que firma e inserta en el buzón): construye
// el paquete de estudiante con `paqueteEstudiante.js`, lo serializa y
// lo publica con aviso en el canal TEMAS APOSTÓLICOS, firmado con la
// llave del maestro.
//
// La llave del maestro se pega UNA vez y queda solo en este equipo
// (localStorage `lw-maestro-llave-v1`); nunca sale de la máquina ni va
// al repo. La URL y la llave anónima de Supabase son las mismas que ya
// usa LemWriter (`supabaseClient.js`): el buzón `lc_mensajes` vive en
// ese mismo proyecto.
import { supabaseUrl, supabaseAnonKey } from './supabaseClient'
import { cargarLlaveMaestro, publicarEnsenanza } from './mensajeacademia'
import {
  construirPaquete,
  serializarPaquete,
  validarDatosPaquete,
} from './paqueteEstudiante'

export const CLAVE_LLAVE_MAESTRO = 'lw-maestro-llave-v1'

// ---------------------------------------------------------------------------
// Llave del maestro en este equipo

function almacenamiento() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

/**
 * Guarda la llave del maestro pegada por el usuario. Se VALIDA antes de
 * guardar: el texto debe ser el JSON del archivo de llaves y la llave
 * privada debe corresponder a la pública. Devuelve la llave validada.
 */
export function guardarLlaveMaestro(textoJson) {
  const llave = cargarLlaveMaestro(textoJson)
  const store = almacenamiento()
  if (!store) throw new Error('Este equipo no tiene almacenamiento local disponible.')
  store.setItem(
    CLAVE_LLAVE_MAESTRO,
    JSON.stringify({
      nombre: llave.nombre,
      clavePublica: llave.clavePublica,
      clavePrivada: llave.clavePrivada,
    }),
  )
  return llave
}

/** La llave guardada en este equipo, o null si aún no se ha pegado. */
export function llaveMaestroGuardada() {
  const store = almacenamiento()
  if (!store) return null
  try {
    const crudo = store.getItem(CLAVE_LLAVE_MAESTRO)
    if (!crudo) return null
    return cargarLlaveMaestro(crudo)
  } catch {
    return null
  }
}

export function borrarLlaveMaestro() {
  const store = almacenamiento()
  if (store) store.removeItem(CLAVE_LLAVE_MAESTRO)
}

// ---------------------------------------------------------------------------
// Publicación

/**
 * Publica la enseñanza por MensajeAcademia: aviso + paquete firmado al
 * canal. Las secciones llegan como { titulo, contenidoHtml, order_index? }.
 * Devuelve la nota lista para mostrar en el diálogo. Si algo falla,
 * lanza un Error en español; la publicación en la Academia NO se deshace.
 */
export async function publicarPorMensajeAcademia(opts) {
  const llave = llaveMaestroGuardada()
  if (!llave) {
    throw new Error('Falta la llave del maestro: pégala en el mismo diálogo, debajo de la casilla de MensajeAcademia.')
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('La conexión con Supabase no está configurada en este equipo.')
  }
  const errorDatos = validarDatosPaquete({
    identificador: opts.identificador,
    titulo: opts.titulo,
    secciones: opts.secciones,
  })
  if (errorDatos) throw new Error(errorDatos)

  const { paquete, omitidas } = construirPaquete({
    identificador: opts.identificador,
    titulo: opts.titulo,
    autor: opts.autor ?? 'LemGil',
    secciones: opts.secciones,
    nivel: opts.nivel,
  })
  await publicarEnsenanza(
    { url: supabaseUrl, anonKey: supabaseAnonKey },
    llave,
    {
      academiaId: paquete.academia.id,
      paqueteTexto: serializarPaquete(paquete),
      tituloAviso: opts.titulo,
    },
    { fetchFn: opts.fetchFn },
  )
  return (
    `📣 También salió por MensajeAcademia: el paquete ${paquete.academia.id} va firmado al canal` +
    (omitidas > 0 ? ` (${omitidas} secciones vacías quedaron fuera)` : '') +
    ' y se archivará solo en los teléfonos de los estudiantes.'
  )
}
