// LemWriter PC — publicación directa de proyectos Academia en la Academia del Espíritu.
// La Academia vive en el MISMO Supabase que LemWriter. Escribir cursos/temas/pasos
// exige sesión de un usuario con rol admin (reglas de la Academia), así que el PC
// inicia sesión con la misma cuenta y la sesión queda guardada en este equipo.
import { supabase } from './supabaseClient'

const MENSAJE_SIN_SESION = 'Primero ingresa con tu cuenta de la Academia.'
const MENSAJE_SIN_CONEXION = 'La conexión con la Academia no está configurada en este equipo.'

function cliente() {
  if (!supabase) throw new Error(MENSAJE_SIN_CONEXION)
  return supabase
}

// ── Sesión ────────────────────────────────────────────────────────────────

export async function obtenerSesionAcademia() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data?.session ?? null
}

export async function ingresarAcademia(email, contrasena) {
  const sb = cliente()
  const { data, error } = await sb.auth.signInWithPassword({
    email: (email || '').trim(),
    password: contrasena || '',
  })
  if (error) {
    throw new Error('No se pudo ingresar. Revisa tu correo y tu contraseña.')
  }
  return data.session
}

export async function cerrarSesionAcademia() {
  if (!supabase) return
  await supabase.auth.signOut()
}

// ── Lectura ───────────────────────────────────────────────────────────────

export async function cargarNiveles() {
  const sb = cliente()
  const { data, error } = await sb
    .from('niveles')
    .select('id, nombre, orden')
    .order('orden', { ascending: true })
  if (error) throw new Error('No pude cargar los niveles de la Academia.')
  return data ?? []
}

export async function buscarCursoEnlazado(proyectoId) {
  const sb = cliente()
  const { data, error } = await sb
    .from('cursos')
    .select('id, nivel_id, titulo')
    .eq('lemwriter_id', proyectoId)
    .limit(1)
  if (error) throw new Error('No pude revisar si este proyecto ya está publicado.')
  return data && data.length > 0 ? data[0] : null
}

// ── Estado «Publicado / Sin publicar» ─────────────────────────────────────
// La verdad está en la Academia (cursos.lemwriter_id + fecha). Sin sesión no
// se puede leer, así que se muestra el último estado conocido, guardado en
// este equipo al publicar o al leer con sesión.

export const CLAVE_ESTADO_LOCAL = 'lw_publicacion_academia_v1'

function leerCacheLocal() {
  try {
    const crudo = localStorage.getItem(CLAVE_ESTADO_LOCAL)
    if (!crudo) return {}
    const parsed = JSON.parse(crudo)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function guardarEstadoLocal(proyectoId, estado) {
  try {
    const cache = leerCacheLocal()
    if (estado) {
      cache[proyectoId] = estado
    } else {
      delete cache[proyectoId]
    }
    localStorage.setItem(CLAVE_ESTADO_LOCAL, JSON.stringify(cache))
  } catch {
    // Sin almacenamiento disponible: el estado simplemente no se recuerda.
  }
}

// Devuelve { [proyectoId]: { publicado: boolean, fecha: string | null } }.
// Con sesión manda la Academia; sin sesión, el último estado conocido.
export async function cargarEstadosPublicacion(proyectoIds) {
  const cache = leerCacheLocal()
  const resultado = {}
  for (const id of proyectoIds) {
    resultado[id] = cache[id] ?? { publicado: false, fecha: null }
  }

  const sesion = await obtenerSesionAcademia()
  if (!sesion || proyectoIds.length === 0) return resultado

  try {
    const { data, error } = await cliente()
      .from('cursos')
      .select('lemwriter_id, created_at, updated_at')
      .in('lemwriter_id', proyectoIds)
    if (error || !data) return resultado
    const enlazados = new Set(data.map((c) => c.lemwriter_id))
    for (const curso of data) {
      const estado = {
        publicado: true,
        fecha: curso.updated_at ?? curso.created_at ?? null,
      }
      resultado[curso.lemwriter_id] = estado
      guardarEstadoLocal(curso.lemwriter_id, estado)
    }
    for (const id of proyectoIds) {
      if (!enlazados.has(id)) {
        const estado = { publicado: false, fecha: null }
        resultado[id] = estado
        guardarEstadoLocal(id, estado)
      }
    }
  } catch {
    // Si la lectura falla, queda el último estado conocido.
  }
  return resultado
}

// ── Publicación ───────────────────────────────────────────────────────────
// Publicado por primera vez en el móvil el 2026-10-06; misma lógica aquí:
// - El proyecto Academia se vuelve UN curso en el Nivel elegido.
// - Cada sección se vuelve un tema (en orden, con su texto completo).
// - Republicar ACTUALIZA el mismo curso/temas sin duplicar,
//   conservando el progreso de los estudiantes.
export async function publicarProyectoEnAcademia(proyecto, secciones, nivelId) {
  const sb = cliente()

  const sesion = await obtenerSesionAcademia()
  if (!sesion) throw new Error(MENSAJE_SIN_SESION)

  if (!proyecto?.id) throw new Error('Este proyecto todavía no tiene identificador.')
  if (!nivelId) throw new Error('Elige el Nivel donde va este curso.')

  const ordenadas = [...(secciones ?? [])].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  )
  const conTitulo = ordenadas.filter((s) => (s.title ?? '').trim().length > 0)
  if (conTitulo.length === 0) {
    throw new Error('Este proyecto no tiene secciones todavía. Escribe al menos una sección y vuelve a intentar.')
  }

  // 1) Curso: crear o actualizar el enlazado a este proyecto.
  const previo = await buscarCursoEnlazado(proyecto.id)
  let cursoId
  const ahora = new Date().toISOString()
  if (previo) {
    const { error } = await sb
      .from('cursos')
      .update({ titulo: proyecto.title, nivel_id: nivelId, updated_at: ahora })
      .eq('id', previo.id)
    if (error) {
      throw new Error('No pude actualizar el curso en la Academia. ¿Tu usuario tiene rol de administrador?')
    }
    cursoId = previo.id
  } else {
    const { data: niveles } = await sb
      .from('cursos')
      .select('orden')
      .eq('nivel_id', nivelId)
      .order('orden', { ascending: false })
      .limit(1)
    const orden = niveles && niveles.length > 0 ? (niveles[0].orden ?? 0) + 1 : 0
    const { data, error } = await sb
      .from('cursos')
      .insert({ titulo: proyecto.title, nivel_id: nivelId, orden, lemwriter_id: proyecto.id })
      .select('id')
      .single()
    if (error || !data) {
      throw new Error('No pude crear el curso en la Academia. ¿Tu usuario tiene rol de administrador?')
    }
    cursoId = data.id
  }

  // 2) Temas enlazados que ya existen en este curso.
  const { data: temasPrevios, error: errorTemas } = await sb
    .from('temas')
    .select('id, lemwriter_seccion_id')
    .eq('curso_id', cursoId)
  if (errorTemas) throw new Error('No pude leer los temas actuales del curso.')
  const porSeccion = new Map()
  for (const t of temasPrevios ?? []) {
    if (t.lemwriter_seccion_id) porSeccion.set(t.lemwriter_seccion_id, t.id)
  }

  // 3) Crear o actualizar un tema por sección, con su paso «leer_texto».
  const idsVigentes = []
  for (let i = 0; i < conTitulo.length; i++) {
    const seccion = conTitulo[i]
    const tituloTema = seccion.title.trim()
    const texto = seccion.content ?? ''
    let temaId = porSeccion.get(seccion.id)

    if (temaId) {
      const { error } = await sb
        .from('temas')
        .update({ titulo: tituloTema, orden: i, texto })
        .eq('id', temaId)
      if (error) throw new Error(`No pude actualizar el tema «${tituloTema}».`)
    } else {
      const { data, error } = await sb
        .from('temas')
        .insert({
          titulo: tituloTema,
          curso_id: cursoId,
          orden: i,
          texto,
          lemwriter_seccion_id: seccion.id,
        })
        .select('id')
        .single()
      if (error || !data) throw new Error(`No pude crear el tema «${tituloTema}».`)
      temaId = data.id
    }
    idsVigentes.push(temaId)

    const { data: pasos, error: errorPasos } = await sb
      .from('pasos')
      .select('id')
      .eq('tema_id', temaId)
      .eq('tipo', 'leer_texto')
      .limit(1)
    if (errorPasos) throw new Error(`No pude revisar los pasos del tema «${tituloTema}».`)
    if (!pasos || pasos.length === 0) {
      const { error } = await sb.from('pasos').insert({
        tema_id: temaId,
        titulo: 'Lectura de la enseñanza',
        descripcion: 'Lee el texto completo de esta enseñanza.',
        tipo: 'leer_texto',
        orden: 0,
      })
      if (error) throw new Error(`No pude crear el paso de lectura del tema «${tituloTema}».`)
    }
  }

  // 4) Quitar los temas enlazados que ya no están en el proyecto
  //    (primero sus pasos, por si la base no borra en cascada).
  const obsoletos = (temasPrevios ?? [])
    .filter((t) => t.lemwriter_seccion_id && !idsVigentes.includes(t.id))
    .map((t) => t.id)
  if (obsoletos.length > 0) {
    await sb.from('pasos').delete().in('tema_id', obsoletos)
    await sb.from('temas').delete().in('id', obsoletos)
  }

  guardarEstadoLocal(proyecto.id, { publicado: true, fecha: ahora })

  return { cursoId, temas: conTitulo.length, actualizado: !!previo }
}
