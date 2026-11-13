// MensajeAcademia en LemWriter PC: los formatos son los MISMOS que la
// app del estudiante verifica (firma de fila del buzón, sobre firmado,
// paquete importable). Estas pruebas fijan ese contrato sin red.
import { describe, expect, it, beforeEach } from 'vitest'
import {
  CANAL,
  base64UrlABytes,
  bytesABase64Url,
  bytesAHex,
  cargarLlaveMaestro,
  clavePublicaDe,
  crearSobrePaquete,
  filaVerifica,
  firmarFila,
  firmarTexto,
  publicarAviso,
  publicarPaquete,
  sha256Hex,
  textoFirmadoBuzon,
  textoFirmadoPaquete,
  validarIdentificador,
  verificarTexto,
} from '../services/mensajeacademia'
import {
  construirPaquete,
  esIdentificadorValido,
  htmlToMarkdown,
  normalizarIdentificador,
  serializarPaquete,
} from '../services/paqueteEstudiante'
import {
  borrarLlaveMaestro,
  guardarLlaveMaestro,
  llaveMaestroGuardada,
  publicarPorMensajeAcademia,
} from '../services/publicarMensajeAcademia'

// Vector oficial RFC 8032 (TEST 1, mensaje vacío) — el mismo que fijan
// las pruebas de la app del estudiante (identidad.test.ts).
const SEMILLA_HEX = '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60'
const PUBLICA_HEX = 'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a'
const FIRMA_VACIA_HEX =
  'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e06522490155' +
  '5fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b'

const PRIVADA_B64 = bytesABase64Url(Uint8Array.from(Buffer.from(SEMILLA_HEX, 'hex')))
const PUBLICA_B64 = bytesABase64Url(Uint8Array.from(Buffer.from(PUBLICA_HEX, 'hex')))
const LLAVE = { nombre: 'LemGil Apóstol', clavePublica: PUBLICA_B64, clavePrivada: PRIVADA_B64 }

const hexDeB64 = (b64) => bytesAHex(base64UrlABytes(b64))

describe('Ed25519 — vector oficial RFC 8032', () => {
  it('deriva la llave pública del vector', () => {
    expect(hexDeB64(clavePublicaDe(PRIVADA_B64))).toBe(PUBLICA_HEX)
  })

  it('firma el mensaje vacío con la firma del vector', () => {
    expect(hexDeB64(firmarTexto(PRIVADA_B64, ''))).toBe(FIRMA_VACIA_HEX)
  })

  it('verifica la firma del vector con la llave pública', () => {
    const firmaB64 = bytesABase64Url(Uint8Array.from(Buffer.from(FIRMA_VACIA_HEX, 'hex')))
    expect(verificarTexto(PUBLICA_B64, firmaB64, '')).toBe(true)
    expect(verificarTexto(PUBLICA_B64, firmaB64, 'otra cosa')).toBe(false)
  })
})

describe('llave del maestro', () => {
  it('carga y valida el JSON del archivo de llaves', () => {
    const llave = cargarLlaveMaestro(JSON.stringify(LLAVE))
    expect(llave.clavePublica).toBe(PUBLICA_B64)
    expect(llave.clavePrivada).toBe(PRIVADA_B64)
  })

  it('rechaza una privada que no corresponde a la pública', () => {
    const otraPrivada = bytesABase64Url(new Uint8Array(32).fill(9))
    expect(() =>
      cargarLlaveMaestro(JSON.stringify({ ...LLAVE, clavePrivada: otraPrivada })),
    ).toThrow(/no corresponde/)
  })

  it('rechaza basura', () => {
    expect(() => cargarLlaveMaestro('esto no es json')).toThrow(/JSON válido/)
    expect(() => cargarLlaveMaestro('{}')).toThrow(/faltan/)
  })
})

describe('firma de fila del buzón', () => {
  const cuerpo = 'Nueva enseñanza: Descodificando la Luz'

  it('el texto firmado lleva prefijo, campos y sha256 del cuerpo', () => {
    const texto = textoFirmadoBuzon(PUBLICA_B64, CANAL, 'aviso', cuerpo)
    expect(texto).toBe(`lemchat-buzon-v1|${PUBLICA_B64}|canal|aviso|${sha256Hex(cuerpo)}`)
  })

  it('firmar y verificar: ida y vuelta', () => {
    const fila = firmarFila(LLAVE, { de: PUBLICA_B64, para: CANAL, tipo: 'aviso', cuerpo })
    expect(filaVerifica(fila)).toBe(true)
  })

  it('rechaza la fila si se altera el cuerpo', () => {
    const fila = firmarFila(LLAVE, { de: PUBLICA_B64, para: CANAL, tipo: 'aviso', cuerpo })
    expect(filaVerifica({ ...fila, cuerpo: `${cuerpo} (alterado)` })).toBe(false)
    expect(filaVerifica({ ...fila, para: 'grupo:x' })).toBe(false)
    expect(filaVerifica({ ...fila, firma: 'basura' })).toBe(false)
  })
})

describe('publicación al buzón (fetch inyectado)', () => {
  const cfg = { url: 'https://ejemplo.supabase.co', anonKey: 'anon-de-prueba' }

  function fetchEspia(llamadas) {
    return async (url, init) => {
      llamadas.push({ url, init })
      return { ok: true, status: 201 }
    }
  }

  it('publicarAviso inserta una fila firmada con el texto plano', async () => {
    const llamadas = []
    const fila = await publicarAviso(cfg, LLAVE, '  Aviso de prueba  ', { fetchFn: fetchEspia(llamadas) })
    expect(llamadas).toHaveLength(1)
    expect(llamadas[0].url).toBe('https://ejemplo.supabase.co/rest/v1/lc_mensajes')
    expect(llamadas[0].init.headers.apikey).toBe('anon-de-prueba')
    const enviada = JSON.parse(llamadas[0].init.body)
    expect(enviada).toEqual(fila)
    expect(enviada.tipo).toBe('aviso')
    expect(enviada.para).toBe('canal')
    expect(enviada.de).toBe(PUBLICA_B64)
    expect(enviada.cuerpo).toBe('Aviso de prueba')
    expect(filaVerifica(enviada)).toBe(true)
  })

  it('publicarPaquete inserta el sobre firmado que la app sabe abrir', async () => {
    const llamadas = []
    const paqueteTexto = serializarPaquete(
      construirPaquete({
        identificador: 'lemgil-14',
        titulo: 'Descodificando el Reposo',
        autor: 'LemGil',
        secciones: [{ titulo: 'Código 1', contenidoHtml: '<p>Texto.</p>' }],
      }).paquete,
    )
    const fila = await publicarPaquete(cfg, LLAVE, 'lemgil-14', paqueteTexto, {
      fetchFn: fetchEspia(llamadas),
    })
    expect(filaVerifica(fila)).toBe(true)
    const sobre = JSON.parse(fila.cuerpo)
    expect(sobre.tipo).toBe('paquete-lemchat')
    expect(sobre.formato).toBe(1)
    expect(sobre.academiaId).toBe('lemgil-14')
    expect(sobre.paqueteTexto).toBe(paqueteTexto)
    expect(sobre.claveMaestro).toBe(PUBLICA_B64)
    // La firma del sobre verifica sobre el texto canónico del paquete.
    expect(
      verificarTexto(sobre.claveMaestro, sobre.firma, textoFirmadoPaquete('lemgil-14', paqueteTexto)),
    ).toBe(true)
    // Y crearSobrePaquete produce la misma forma.
    expect(crearSobrePaquete(LLAVE, paqueteTexto, 'lemgil-14').tipo).toBe('paquete-lemchat')
  })

  it('un rechazo del buzón se convierte en error en español', async () => {
    const fetch401 = async () => ({ ok: false, status: 401 })
    await expect(
      publicarAviso(cfg, LLAVE, 'Aviso', { fetchFn: fetch401 }),
    ).rejects.toThrow(/buzón rechazó la publicación \(401\)/)
  })
})

describe('identificador de academia', () => {
  it('acepta la forma de la app y rechaza lo demás', () => {
    expect(validarIdentificador('lemgil-14')).toBe(true)
    expect(esIdentificadorValido('lemgil-14')).toBe(true)
    expect(validarIdentificador('LemGil-14')).toBe(false)
    expect(validarIdentificador('lemgil 14')).toBe(false)
    expect(validarIdentificador('')).toBe(false)
  })

  it('normalizarIdentificador baja a la forma válida', () => {
    expect(normalizarIdentificador('LemGil 14')).toBe('lemgil-14')
    expect(normalizarIdentificador(' Mi Academia 2 ')).toBe('mi-academia-2')
  })
})

describe('construirPaquete', () => {
  it('forma exacta: un código por sección con texto, ids en orden', () => {
    const { paquete, omitidas } = construirPaquete({
      identificador: 'lemgil-14',
      titulo: 'Descodificando el Reposo',
      autor: 'LemGil',
      secciones: [
        { titulo: 'El reposo de Dios', contenidoHtml: '<p>Primera parte.</p>' },
        { titulo: 'Sin texto', contenidoHtml: '<p>   </p>' },
        { titulo: 'Entrar en su reposo', contenidoHtml: '<p>Segunda parte.</p>' },
      ],
      fecha: '2026-11-08',
    })
    expect(omitidas).toBe(1)
    expect(paquete.tipo).toBe('paquete-academia')
    expect(paquete.formato).toBe(1)
    expect(paquete.generada).toBe('2026-11-08')
    expect(paquete.academia.id).toBe('lemgil-14')
    expect(paquete.academia.numero).toBe('Nº 14')
    expect(paquete.academia.titulo).toBe('Descodificando el Reposo')
    expect(paquete.academia.autor).toBe('LemGil')
    expect(paquete.academia.codigos).toHaveLength(2)
    expect(paquete.academia.codigos[0]).toEqual({
      id: 'lemgil-14-c1',
      titulo: 'El reposo de Dios',
      subtitulo: '',
      cuerpo: 'Primera parte.',
    })
    expect(paquete.academia.codigos[1].id).toBe('lemgil-14-c2')
    expect(paquete.academia.codigos[1].titulo).toBe('Entrar en su reposo')
    // Serializar y re-leer conserva la forma (lo que importa la app).
    const releido = JSON.parse(serializarPaquete(paquete))
    expect(releido.academia.codigos).toHaveLength(2)
  })
})

describe('htmlToMarkdown', () => {
  it('convierte encabezado, negrita y lista', () => {
    const md = htmlToMarkdown(
      '<h2>El reposo</h2><p>Texto con <strong>negrita</strong> y <em>cursiva</em>.</p>' +
        '<ul><li>Uno</li><li>Dos</li></ul>',
    )
    expect(md).toContain('## El reposo')
    expect(md).toContain('Texto con **negrita** y *cursiva*.')
    expect(md).toContain('- Uno')
    expect(md).toContain('- Dos')
  })

  it('convierte citas y enlaces', () => {
    const md = htmlToMarkdown(
      '<blockquote><p>Escrito está.</p></blockquote><p>Ver <a href="https://ejemplo.com">la nota</a>.</p>',
    )
    expect(md).toContain('> Escrito está.')
    expect(md).toContain('[la nota](https://ejemplo.com)')
  })

  it('html vacío o nulo da cadena vacía', () => {
    expect(htmlToMarkdown('')).toBe('')
    expect(htmlToMarkdown(null)).toBe('')
    expect(htmlToMarkdown('<p>  </p>')).toBe('')
  })
})

describe('llave del maestro en localStorage', () => {
  beforeEach(() => {
    const datos = new Map()
    globalThis.localStorage = {
      getItem: (k) => (datos.has(k) ? datos.get(k) : null),
      setItem: (k, v) => datos.set(k, String(v)),
      removeItem: (k) => datos.delete(k),
    }
  })

  it('guardar valida, recuerda y borrar olvida', () => {
    expect(llaveMaestroGuardada()).toBeNull()
    const llave = guardarLlaveMaestro(JSON.stringify(LLAVE))
    expect(llave.clavePublica).toBe(PUBLICA_B64)
    expect(llaveMaestroGuardada()?.clavePrivada).toBe(PRIVADA_B64)
    borrarLlaveMaestro()
    expect(llaveMaestroGuardada()).toBeNull()
  })

  it('guardar una llave dañada no guarda nada', () => {
    expect(() => guardarLlaveMaestro('{"clavePublica":"x"}')).toThrow()
    expect(llaveMaestroGuardada()).toBeNull()
  })

  it('publicar sin configuración de Supabase avisa en español', async () => {
    guardarLlaveMaestro(JSON.stringify(LLAVE))
    // En el entorno de pruebas no hay URL ni llave anónima configuradas.
    await expect(
      publicarPorMensajeAcademia({
        identificador: 'lemgil-14',
        titulo: 'Prueba',
        secciones: [{ titulo: 'Código 1', contenidoHtml: '<p>Texto.</p>' }],
      }),
    ).rejects.toThrow(/Supabase no está configurada/)
  })
})
