import React, { useEffect, useState } from 'react'
import {
  cargarNiveles,
  buscarCursoEnlazado,
  publicarProyectoEnAcademia,
  obtenerSesionAcademia,
  ingresarAcademia,
  cerrarSesionAcademia,
} from '../../services/publicarAcademia'
import {
  guardarLlaveMaestro,
  llaveMaestroGuardada,
  publicarPorMensajeAcademia,
} from '../../services/publicarMensajeAcademia'

// Ventana «🎓 Publicar en Academia» (LemWriter PC).
// La Academia solo deja escribir cursos a un administrador con sesión, así que
// la primera vez se ingresa con la misma cuenta; la sesión queda en este equipo.
const PublicarAcademiaModal = ({ proyecto, secciones, onClose, onPublicado }) => {
  const [fase, setFase] = useState('cargando') // cargando | ingreso | listo
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [ingresando, setIngresando] = useState(false)
  const [niveles, setNiveles] = useState([])
  const [nivelId, setNivelId] = useState(null)
  const [cursoPrevio, setCursoPrevio] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [error, setError] = useState(null)
  const [resultado, setResultado] = useState(null)
  // MensajeAcademia (Fase D): la misma publicación sale también firmada
  // al canal TEMAS APOSTÓLICOS y se archiva sola en los teléfonos.
  const [porMensajeAcademia, setPorMensajeAcademia] = useState(false)
  const [identificadorMA, setIdentificadorMA] = useState(() => {
    try {
      return localStorage.getItem(`lw-ma-id-${proyecto.id}`) ?? ''
    } catch {
      return ''
    }
  })
  const [llaveTexto, setLlaveTexto] = useState('')
  const [tieneLlave, setTieneLlave] = useState(() => !!llaveMaestroGuardada())
  const [notaMA, setNotaMA] = useState(null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const sesion = await obtenerSesionAcademia()
        if (!vivo) return
        if (!sesion) {
          setFase('ingreso')
          return
        }
        await cargarDatos(vivo)
      } catch (e) {
        if (vivo) {
          setError(e.message ?? 'Algo salió mal.')
          setFase('ingreso')
        }
      }
    })()
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cargarDatos = async (vivo = true) => {
    setCargando(true)
    try {
      const [lista, previo] = await Promise.all([
        cargarNiveles(),
        buscarCursoEnlazado(proyecto.id),
      ])
      if (!vivo) return
      setNiveles(lista)
      setCursoPrevio(previo)
      setNivelId(previo ? previo.nivel_id : (lista[0]?.id ?? null))
      setFase('listo')
    } catch (e) {
      if (vivo) setError(e.message ?? 'Algo salió mal.')
    } finally {
      if (vivo) setCargando(false)
    }
  }

  const ingresar = async () => {
    setError(null)
    setIngresando(true)
    try {
      await ingresarAcademia(email, contrasena)
      setContrasena('')
      await cargarDatos()
    } catch (e) {
      setError(e.message ?? 'Algo salió mal.')
    } finally {
      setIngresando(false)
    }
  }

  const salir = async () => {
    await cerrarSesionAcademia()
    setCursoPrevio(null)
    setNiveles([])
    setNivelId(null)
    setFase('ingreso')
  }

  const publicar = async () => {
    setError(null)
    setNotaMA(null)
    setPublicando(true)
    try {
      const r = await publicarProyectoEnAcademia(proyecto, secciones, nivelId)
      setResultado(r)
      onPublicado?.({ publicado: true, fecha: new Date().toISOString() })
      if (porMensajeAcademia) {
        // La Academia ya quedó publicada: si el envío por
        // MensajeAcademia falla, se avisa sin deshacer nada.
        try {
          if (!tieneLlave) {
            guardarLlaveMaestro(llaveTexto)
            setTieneLlave(true)
            setLlaveTexto('')
          }
          try {
            localStorage.setItem(`lw-ma-id-${proyecto.id}`, identificadorMA.trim())
          } catch {
            // Sin almacenamiento: el identificador no se recuerda, nada más.
          }
          const nota = await publicarPorMensajeAcademia({
            identificador: identificadorMA,
            titulo: proyecto.titulo ?? proyecto.title ?? '',
            autor: 'LemGil',
            nivel: (() => { const n = (niveles ?? []).find((x) => x.id === nivelId); return n ? { nombre: n.nombre, orden: n.orden ?? 0 } : undefined })(),
            secciones: (secciones ?? []).map((s) => ({
              titulo: s.title ?? '',
              contenidoHtml: s.content ?? '',
              order_index: s.order_index ?? 0,
            })),
          })
          setNotaMA({ ok: true, texto: nota })
        } catch (e) {
          setNotaMA({
            ok: false,
            texto: `La Academia quedó publicada, pero el envío por MensajeAcademia falló: ${e.message ?? 'Algo salió mal.'}`,
          })
        }
      }
    } catch (e) {
      setError(e.message ?? 'Algo salió mal.')
    } finally {
      setPublicando(false)
    }
  }

  const totalSecciones = (secciones ?? []).filter((s) => (s.title ?? '').trim().length > 0).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]">
        <div className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🎓</span>
            <h3 className="text-lg font-bold text-brand-ink font-serif">Publicar en Academia</h3>
          </div>
          <p className="text-xs text-brand-ink-3 font-sans">
            «{proyecto.titulo}» se publica como un curso: cada sección se vuelve un tema con su texto completo.
          </p>
        </div>

        <div className="px-5 pb-5 overflow-y-auto min-h-0">
          {fase === 'cargando' && (
            error ? (
              <div>
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 font-sans">{error}</p>
                <button
                  onClick={() => { setError(null); cargarDatos() }}
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold font-sans text-[#5C4408] bg-gradient-to-b from-[#E9CE7A] to-[#C9A24A] border border-[#A8821F] hover:brightness-105"
                >
                  Reintentar
                </button>
                <button onClick={onClose} className="w-full mt-2 px-4 py-2 text-sm text-brand-ink-3 hover:text-brand-ink font-sans">
                  Cancelar
                </button>
              </div>
            ) : (
              <p className="text-sm text-brand-ink-3 font-sans py-4 text-center">Un momento…</p>
            )
          )}

          {fase === 'ingreso' && (
            <div>
              <p className="text-sm text-brand-ink-2 font-sans mb-3">
                Ingresa con tu cuenta de la Academia (la misma de siempre). La sesión queda guardada en este equipo.
              </p>
              <label className="block text-xs font-semibold text-brand-ink mb-1.5 font-sans">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
                className="w-full text-sm border border-brand-gold/30 rounded-xl px-3 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold bg-white theme-text"
              />
              <label className="block text-xs font-semibold text-brand-ink mb-1.5 font-sans">Contraseña</label>
              <input
                type="password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="Tu contraseña"
                autoComplete="current-password"
                onKeyDown={(e) => { if (e.key === 'Enter' && email.trim() && contrasena) ingresar() }}
                className="w-full text-sm border border-brand-gold/30 rounded-xl px-3 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold bg-white theme-text"
              />
              {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 font-sans">{error}</p>}
              <button
                onClick={ingresar}
                disabled={ingresando || !email.trim() || !contrasena}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold font-sans text-[#5C4408] bg-gradient-to-b from-[#E9CE7A] to-[#C9A24A] border border-[#A8821F] hover:brightness-105 disabled:opacity-60"
              >
                {ingresando ? 'Ingresando…' : 'Ingresar'}
              </button>
              <button onClick={onClose} className="w-full mt-2 px-4 py-2 text-sm text-brand-ink-3 hover:text-brand-ink font-sans">
                Cancelar
              </button>
            </div>
          )}

          {fase === 'listo' && !resultado && (
            <div>
              {cursoPrevio && (
                <p className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-3 font-sans">
                  Este proyecto ya está publicado como «{cursoPrevio.titulo}». Al publicar de nuevo se actualiza el mismo curso, sin duplicar y sin perder el avance de los estudiantes.
                </p>
              )}
              <label className="block text-xs font-semibold text-brand-ink mb-1.5 font-sans">Nivel del curso</label>
              {cargando ? (
                <p className="text-sm text-brand-ink-3 font-sans py-2">Cargando niveles…</p>
              ) : niveles.length === 0 ? (
                <p className="text-sm text-brand-ink-3 font-sans py-2">La Academia todavía no tiene niveles creados.</p>
              ) : (
                <div className="grid gap-1.5 mb-3">
                  {niveles.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => setNivelId(n.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg border-2 transition-all ${nivelId === n.id ? 'bg-yellow-50 border-yellow-500 ring-1 ring-yellow-400' : 'border-brand-gold/20 hover:border-brand-gold/40'}`}
                    >
                      <span className="text-sm font-semibold text-brand-ink font-serif">{n.nombre}</span>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-brand-ink-3 font-sans mb-3">
                Se publican {totalSecciones} {totalSecciones === 1 ? 'sección' : 'secciones'} como temas, en orden y con su texto. Los videos y PDF se adjuntan después en la Academia, como hasta ahora.
              </p>
              <div className="border border-brand-gold/30 rounded-xl px-3 py-3 mb-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={porMensajeAcademia}
                    onChange={(e) => setPorMensajeAcademia(e.target.checked)}
                    className="mt-0.5 accent-[#C9A24A]"
                  />
                  <span className="text-sm font-semibold text-brand-ink font-sans">📣 Publicar también por MensajeAcademia</span>
                </label>
                <p className="text-xs text-brand-ink-3 font-sans mt-1.5">
                  La enseñanza sale también firmada al canal TEMAS APOSTÓLICOS y se archiva sola en los teléfonos de los estudiantes.
                </p>
                {porMensajeAcademia && (
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-brand-ink mb-1.5 font-sans">Identificador del paquete</label>
                    <input
                      type="text"
                      value={identificadorMA}
                      onChange={(e) => setIdentificadorMA(e.target.value)}
                      placeholder="lemgil-14"
                      className="w-full text-sm border border-brand-gold/30 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold bg-white theme-text"
                    />
                    <p className="text-xs text-brand-ink-3 font-sans mt-1.5">
                      Autor + número, en minúsculas y con guiones. Con él la app reconoce la academia: el mismo identificador actualiza, uno nuevo crea.
                    </p>
                    {!tieneLlave && (
                      <div className="mt-3">
                        <label className="block text-xs font-semibold text-brand-ink mb-1.5 font-sans">Llave del maestro (se pega una sola vez)</label>
                        <textarea
                          value={llaveTexto}
                          onChange={(e) => setLlaveTexto(e.target.value)}
                          placeholder="Pega aquí el contenido de tu archivo de llaves del maestro…"
                          rows={4}
                          className="w-full text-xs border border-brand-gold/30 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold bg-white theme-text"
                        />
                        <p className="text-xs text-brand-ink-3 font-sans mt-1.5">
                          Se valida al publicar y queda guardada solo en este equipo.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 font-sans">{error}</p>}
              <button
                onClick={publicar}
                disabled={publicando || cargando || !nivelId || totalSecciones === 0}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold font-sans text-[#5C4408] bg-gradient-to-b from-[#E9CE7A] to-[#C9A24A] border border-[#A8821F] hover:brightness-105 disabled:opacity-60"
              >
                {publicando ? 'Publicando…' : cursoPrevio ? '🎓 Actualizar en la Academia' : '🎓 Publicar en la Academia'}
              </button>
              <div className="flex items-center justify-between mt-2">
                <button onClick={salir} className="px-2 py-2 text-xs text-brand-ink-3 hover:text-brand-ink font-sans">
                  Cerrar sesión
                </button>
                <button onClick={onClose} className="px-2 py-2 text-sm text-brand-ink-3 hover:text-brand-ink font-sans">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {fase === 'listo' && resultado && (
            <div>
              <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3 font-sans">
                ✅ {resultado.actualizado ? 'Curso actualizado' : 'Curso publicado'}: {resultado.temas} {resultado.temas === 1 ? 'tema' : 'temas'} con su texto en la Academia.
              </p>
              {notaMA && (
                <p className={`text-sm border rounded-lg px-3 py-2 mb-3 font-sans ${notaMA.ok ? 'text-green-800 bg-green-50 border-green-200' : 'text-amber-800 bg-amber-50 border-amber-200'}`}>
                  {notaMA.ok ? notaMA.texto : `⚠️ ${notaMA.texto}`}
                </p>
              )}
              <button
                onClick={onClose}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold font-sans text-[#5C4408] bg-gradient-to-b from-[#E9CE7A] to-[#C9A24A] border border-[#A8821F] hover:brightness-105"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PublicarAcademiaModal
