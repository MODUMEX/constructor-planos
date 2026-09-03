import { useEffect, useMemo, useState } from 'react'
import Login from './components/Login'
import PreviewTipologia from './components/PreviewTipologia'
import EditorPlano, { formatear } from './components/EditorPlano'
import { armarPedido, enviarPedido, erpConectado, type RespuestaERP } from './erp'
import { generarCSV, nombreArchivoCSV } from './exportar/csv'
import { generarPDF, nombreArchivoPDF } from './exportar/pdf'
import { csvABytes, FILTRO_CSV, FILTRO_PDF, guardarArchivo } from './exportar/guardar'
import { esAdmin, IVA_CR, type Usuario } from './auth'
import type { Area, Cabina, Config, Pais, Proyecto, TipoCabina, TipologiaId } from './types'
import {
  ACABADOS, alturasDe, coloresPara, espesorPorLinea, HERRAJE_ACABADOS, LINEAS, MODELOS,
  PAISES, etiquetaTier, nombreHerraje, nombreModelo, tierDeColor, TIPOLOGIAS, tipologia,
} from './catalog'
import VistaRender from './components/VistaRender'
import ColoresMexico from './components/ColoresMexico'
import { coloresMxPara, slugRenderMx } from './coloresMx'
import { fotoDe, fotosHerraje, faltanFotosHerraje, terminacionesDe } from './renders'
import { anchoTotal, bom, crearTramos, modular, modularConCatalogo, nuevoId, totalBOM } from './modulacion'
import { cargarTarifas, type ResultadoTarifas } from './tarifas'
import { buscarActualizacion, type FaseActualizacion } from './actualizar'
import { versionActual, VERSION_COMPILADA } from './version'
import { TARIFAS_BASE } from './datos/tarifas-base'
import EditorTarifas from './components/EditorTarifas'
import EditorAlturas from './components/EditorAlturas'
import { alturasDeFabrica, cargarAlturas, usarAlturas, type TablaAlturas } from './alturas'
import Proyectos from './components/Proyectos'

const TC = 512

const PASOS = [
  { n: 1, titulo: 'Proyecto', nota: 'Obra, cliente y área' },
  { n: 2, titulo: 'Línea', nota: 'Producto y modelo' },
  { n: 3, titulo: 'Acabado', nota: 'Material y color' },
  { n: 4, titulo: 'Herrajes', nota: 'Acabado del juego' },
  { n: 5, titulo: 'Tipología', nota: 'Cómo queda el baño' },
  { n: 6, titulo: 'Medidas', nota: 'Claro y cabinas' },
  { n: 7, titulo: 'Plano', nota: 'Ajustar sobre el dibujo' },
  { n: 8, titulo: 'Cotización', nota: 'Precio y pedido' },
]

/**
 * Líneas que hoy NO se fabrican en Costa Rica. Se OCULTAN, no se borran: el día
 * que se fabriquen, basta con vaciar esta lista y vuelven a aparecer solas.
 */
const LINEAS_OCULTAS_CR = ['SUPERIOR', 'TOUCHLESS']

function lineasDe(pais: Pais) {
  return pais === 'CR' ? LINEAS.filter((l) => !LINEAS_OCULTAS_CR.includes(l.id)) : LINEAS
}

function configInicial(): Config {
  return {
    linea: 'LEEDER',
    modelo: 'ESTANDAR',
    acabado: 'Laminado Compacto',
    color: 'BLANCO',
    // el montaje ya no se elige en el wizard: queda fijo en el estándar
    // (pilastra a piso y riel de amarre arriba). Sigue viajando al CSV, al
    // pedido y a la modulación, que es la que decide el SKU de pilastra y
    // el renglón del riel.
    montaje: 'PISO_HEADRAIL',
    bisagra: 'GRAV',
    cerrojo: 'IND',
    herrajeAcabado: 'INOX',
    alturaCm: 150,
    profundidadCm: 150,
    anchoAccesibleCm: 150,
    anchoPilastraCm: 15,   // 16 no existe en catalogo; 15 si (familia PI)
    espesorMm: 12,
    terminacion: 'ZOCLO',
    kap: false,
    orinales: 0,
    mgAlturaCm: 120,
    tipologia: 'RECTA_MURO_IZQ',
  }
}

/** el producto que manda en el área, para elegir la foto: orinales, regaderas o cabinas */
function tipoDeArea(area: Area): TipoCabina | undefined {
  const cabinas = area.tramos.flatMap((t) => t.cabinas)
  if (cabinas.length === 0) return undefined
  if (cabinas.every((c) => c.tipo === 'orinal')) return 'orinal'
  if (cabinas.every((c) => c.tipo === 'regadera')) return 'regadera'
  return undefined
}

function areaInicial(nombre = '', conTramos = false, tipo?: TipologiaId): Area {
  const config = configInicial()
  if (tipo) config.tipologia = tipo
  return {
    id: nuevoId('area'),
    nombre,
    piso: demo ? 'Planta baja' : '',
    config,
    tramos: conTramos ? crearTramos(config.tipologia, 420, 4, config) : [],
  }
}

/** atajo de desarrollo: ?demo=1&paso=7&tipo=RECTA_MURO_IZQ entra sin login para revisar una pantalla */
const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search)
const demo = import.meta.env.DEV && params.has('demo')
const pasoDemo = Number(params.get('paso') ?? 1)
const tipoDemo = (params.get('tipo') as TipologiaId | null) ?? undefined

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(
    demo
      ? {
          id: 'demo',
          email: 'dlizano@modumex.com',
          nombre: 'Dayanna Lizano',
          rol: 'Super Admin',
          descuento: 0,
          ivaPorcentaje: IVA_CR,
          distribuidorId: null,
          deLaNube: false,
        }
      : null,
  )
  const [tema, setTema] = useState<'oscuro' | 'claro'>(params.get('tema') === 'claro' ? 'claro' : 'oscuro')
  const [paso, setPaso] = useState(demo ? pasoDemo : 1)

  // Un proyecto nuevo arranca en blanco. Los datos de ejemplo solo se cargan con
  // el atajo ?demo=1 de desarrollo, para no tener que teclearlos en cada prueba.
  const [proyecto, setProyecto] = useState<Proyecto>({
    numero: demo ? '1042' : '',
    paisFabricacion: 'CR',
    obra: demo ? 'Torre Escazú' : '',
    cliente: demo ? 'Constructora Volio' : '',
    ubicacion: demo ? 'San José, Escazú' : '',
    distribuidor: demo ? 'Modumex Costa Rica' : '',
    creadoPor: '',
    areas: [areaInicial(demo ? 'Baño de hombres' : 'Área 1', demo && pasoDemo >= 7, tipoDemo)],
  })
  const [activa, setActiva] = useState(0)

  const [claroCm, setClaroCm] = useState(420)
  const [cantidad, setCantidad] = useState(4)
  const [copias, setCopias] = useState(1)

  const [unidad, setUnidad] = useState<'cm' | 'in'>('cm')
  const [verInodoros, setVerInodoros] = useState(true)
  const [verCotas, setVerCotas] = useState(true)
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [moneda, setMoneda] = useState<'USD' | 'CRC'>('CRC')
  const [respuesta, setRespuesta] = useState<RespuestaERP | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [verPayload, setVerPayload] = useState(false)
  const [guardado, setGuardado] = useState<string | null>(null)
  const [tarifas, setTarifas] = useState<ResultadoTarifas | null>(null)
  const [verTarifas, setVerTarifas] = useState(demo && params.has('tarifas'))
  const [alturasTabla, setAlturasTabla] = useState<TablaAlturas>(alturasDeFabrica)
  const [alturasNube, setAlturasNube] = useState(false)
  const [verAlturas, setVerAlturas] = useState(false)
  const [verProyectos, setVerProyectos] = useState(false)
  const [version, setVersion] = useState(VERSION_COMPILADA)
  const [actualizando, setActualizando] = useState<FaseActualizacion | null>(null)
  const [buscandoActualizacion, setBuscandoActualizacion] = useState(false)
  const [avisoActualizacion, setAvisoActualizacion] = useState<string | null>(null)

  // al abrir: se muestra la versión en uso y se busca si hay una nueva publicada
  useEffect(() => {
    versionActual().then(setVersion)
    buscarActualizacion(setActualizando)
  }, [])

  // el botón del encabezado: igual que la consulta de arranque, pero diciendo
  // en qué acabó. Sin esto, un fallo de red se traga el aviso sin dejar rastro.
  async function buscarActualizacionAhora() {
    setBuscandoActualizacion(true)
    setAvisoActualizacion(null)
    const r = await buscarActualizacion(setActualizando)
    setBuscandoActualizacion(false)
    if (r.tipo === 'al-dia') setAvisoActualizacion(`Ya tienes la última versión (${version}).`)
    else if (r.tipo === 'rechazada') setAvisoActualizacion(`La versión ${r.version} quedó sin instalar.`)
    else if (r.tipo === 'solo-escritorio') setAvisoActualizacion('En el navegador no hay nada que instalar.')
    else if (r.tipo === 'error') setAvisoActualizacion(`No se pudo consultar: ${r.mensaje}`)
  }

  // al entrar, las tarifas por m² se traen de la tabla tarifa_m2
  useEffect(() => {
    if (!usuario?.token) return
    let vigente = true
    cargarTarifas(usuario.token).then((r) => {
      if (vigente) setTarifas(r)
    })
    return () => {
      vigente = false
    }
  }, [usuario?.token])

  // las alturas por modelo viven en app_config: si un administrador corrigió
  // alguna, se aplica encima de la tabla de fábrica para todo el mundo
  useEffect(() => {
    if (!usuario?.token) return
    let vigente = true
    cargarAlturas(usuario.token).then((r) => {
      if (!vigente) return
      setAlturasTabla(r.tabla)
      setAlturasNube(r.deLaNube)
    })
    return () => {
      vigente = false
    }
  }, [usuario?.token])

  // el plano, el CSV y la cotización leen las alturas del catálogo, así que
  // la tabla activa se deja puesta ahí en vez de pasarla por cada llamada
  useEffect(() => {
    usarAlturas(alturasTabla)
  }, [alturasTabla])

  function recargarTarifas() {
    if (!usuario?.token) {
      setTarifas({ tabla: TARIFAS_BASE, filas: 0, deLaNube: false })
      return
    }
    cargarTarifas(usuario.token).then(setTarifas)
  }

  // los tokens de color viven en :root, así que el tema se marca en el documento
  useEffect(() => {
    if (tema === 'claro') document.documentElement.setAttribute('data-tema', 'claro')
    else document.documentElement.removeAttribute('data-tema')
  }, [tema])

  const area = proyecto.areas[activa]
  const config = area.config
  // la altura de cada pieza la manda el modelo, no el vendedor
  const alturas = alturasDe(config.modelo)

  /** los colores de México no están en el catálogo, así que el render se busca por nombre */
  function conFoto(cfg: Config, cabina?: TipoCabina) {
    const slugColor = proyecto.paisFabricacion === 'MX' ? slugRenderMx(cfg.color) : undefined
    return { ...cfg, cabina, slugColor }
  }

  function setConfig(cambio: Partial<Config>) {
    setProyecto((p) => ({
      ...p,
      areas: p.areas.map((a, i) => (i === activa ? { ...a, config: { ...a.config, ...cambio } } : a)),
    }))
  }

  function setArea(cambio: Partial<Area>) {
    setProyecto((p) => ({ ...p, areas: p.areas.map((a, i) => (i === activa ? { ...a, ...cambio } : a)) }))
  }

  /**
   * Cambiar el país cambia la lista de colores, así que a cada área hay que
   * dejarle un color que exista en la lista nueva.
   */
  function cambiarPais(paisFabricacion: Pais) {
    // México no cotiza: si estaba parada en Cotización, se regresa al plano.
    if (paisFabricacion === 'MX') setPaso((n) => (n === 8 ? 7 : n))
    setProyecto((p) => ({
      ...p,
      paisFabricacion,
      areas: p.areas.map((a) => {
        // en Costa Rica hoy solo se fabrica LEEDER: si venía en otra línea, se cambia
        if (paisFabricacion === 'CR' && !lineasDe('CR').some((l) => l.id === a.config.linea)) {
          a = { ...a, config: { ...a.config, linea: 'LEEDER', espesorMm: espesorPorLinea('LEEDER') } }
        }
        if (paisFabricacion === 'MX') {
          const disponibles = coloresMxPara(a.config.linea)
          const sigue = disponibles.find((c) => c.color === a.config.color)
          const elegido = sigue ?? disponibles[0]
          if (!elegido) return a
          return { ...a, config: { ...a.config, color: elegido.color, colorCodigo: elegido.codigoBase } }
        }
        const delCatalogo = coloresPara(a.config.linea, a.config.acabado)
        const sigue = delCatalogo.find((c) => c.nombre === a.config.color)
        return {
          ...a,
          config: { ...a.config, color: (sigue ?? delCatalogo[0]).nombre, colorCodigo: undefined },
        }
      }),
    }))
  }

  function cambiarLinea(linea: Config['linea']) {
    const acabado = ACABADOS[linea][0]
    const modelo = MODELOS[linea][0].codigo
    setConfig({
      linea,
      modelo,
      acabado,
      ...colorInicial(linea, acabado),
      alturaCm: alturasDe(modelo).puerta,
      // Superior 2.0 va en cara de 3 mm; el resto en compacto de 12
      espesorMm: espesorPorLinea(linea),
    })
  }

  /** el modelo define la altura de las piezas, así que se cambian juntas */
  function elegirModelo(modelo: string) {
    setConfig({ modelo, alturaCm: alturasDe(modelo).puerta })
  }

  /**
   * El juego negro no tiene zoclo: va siempre con pata. Al elegirlo se corrige
   * la terminación, para que la foto y el pedido digan lo mismo.
   */
  function elegirHerraje(herrajeAcabado: Config['herrajeAcabado']) {
    const posibles = terminacionesDe(herrajeAcabado)
    const terminacion = posibles.includes(config.terminacion) ? config.terminacion : posibles[0]
    setConfig({ herrajeAcabado, terminacion })
  }

  function cambiarAcabado(acabado: Config['acabado']) {
    // en esmaltada y acero el color queda fijado por el propio acabado
    setConfig({ acabado, ...colorInicial(config.linea, acabado) })
  }

  /**
   * El primer color válido de la línea. En México la lista depende de la línea
   * porque los de 3 mm son solo de Superior y los de 12 mm de LEEDER.
   */
  function colorInicial(linea: Config['linea'], acabado: Config['acabado']) {
    if (proyecto.paisFabricacion === 'MX') {
      const primero = coloresMxPara(linea)[0]
      if (primero) return { color: primero.color, colorCodigo: primero.codigoBase }
    }
    return { color: coloresPara(linea, acabado)[0].nombre, colorCodigo: undefined }
  }

  function remodular(nuevoClaro = claroCm, nuevaCantidad = cantidad) {
    const tramos = crearTramos(config.tipologia, nuevoClaro, nuevaCantidad, config)
    setArea({ tramos })
  }

  function irAlPlano() {
    if (area.tramos.length === 0) remodular()
    setPaso(7)
  }

  function onCabinas(tramoId: string, cabinas: Cabina[]) {
    setArea({ tramos: area.tramos.map((t) => (t.id === tramoId ? { ...t, cabinas } : t)) })
  }

  /**
   * Se arrastró una pilastra: se fija SU medida y el buscador reacomoda el
   * resto de la tira con piezas de catálogo, para que siga cuadrando el claro.
   * Arrastrar una interna cambia todas las internas, que es como se modula.
   */
  function onPilastra(tramoId: string, indice: number, anchoCm: number) {
    const t = area.tramos.find((x) => x.id === tramoId)
    if (!t || t.cabinas.length === 0) return
    const extremo = indice === 0 || indice === t.cabinas.length
    const muros = (t.muroInicio ? 1 : 0) + (t.muroFin ? 1 : 0)
    const r = modularConCatalogo(t.claroCm, t.cabinas.length, muros, muros < 2, {
      pilInterna: extremo ? undefined : anchoCm,
      pilExtremo: extremo ? anchoCm : undefined,
    })
    if (!r) return
    setArea({
      tramos: area.tramos.map((x) =>
        x.id === tramoId
          ? { ...x, cabinas: r.cabinas, pilastras: r.pilastras, canaletaCm: r.canaletaCm }
          : x,
      ),
    })
  }

  function siguienteArea() {
    const nueva: Area = {
      id: nuevoId('area'),
      nombre: `Área ${proyecto.areas.length + 1}`,
      piso: area.piso,
      config: { ...config },
      tramos: crearTramos(config.tipologia, claroCm, cantidad, config),
    }
    setProyecto((p) => ({ ...p, areas: [...p.areas, nueva] }))
    setActiva(proyecto.areas.length)
    setPaso(6)
  }

  // ---------- cotización ----------
  // los precios salen ya en la moneda elegida: la tabla de tarifas tiene
  // columnas en dólares y en colones, y los modelos usdOnly convierten con el TC
  const renglones = useMemo(
    () =>
      proyecto.areas.flatMap((a) =>
        bom(a.tramos, a.config, { moneda, tipoCambio: TC, tarifas: tarifas?.tabla, pais: proyecto.paisFabricacion }),
      ),
    [proyecto.areas, proyecto.paisFabricacion, moneda, tarifas],
  )
  const neto = totalBOM(renglones)
  const descuento = neto * ((usuario?.descuento ?? 0) / 100)
  const gravable = neto - descuento
  // el IVA lo trae el distribuidor; si no, el 13 % de Costa Rica
  const ivaPorcentaje = usuario?.ivaPorcentaje ?? IVA_CR
  const iva = gravable * (ivaPorcentaje / 100)
  const total = gravable + iva
  const simbolo = moneda === 'CRC' ? '₡' : '$'

  const money = (v: number) =>
    `${simbolo}${v.toLocaleString('es-CR', { maximumFractionDigits: moneda === 'CRC' ? 0 : 2 })}`

  const pedido = useMemo(
    () =>
      armarPedido(
        { ...proyecto, creadoPor: usuario?.nombre ?? '' },
        renglones,
        {
          neto: Number(neto.toFixed(2)),
          descuento: Number(descuento.toFixed(2)),
          iva: Number(iva.toFixed(2)),
          total: Number(total.toFixed(2)),
        },
        moneda,
      ),
    [proyecto, renglones, neto, descuento, iva, total, moneda, usuario],
  )

  const proyectoConAutor = { ...proyecto, creadoPor: usuario?.nombre ?? '' }

  async function bajarPDF() {
    const doc = generarPDF(proyectoConAutor)
    const bytes = new Uint8Array(doc.output('arraybuffer'))
    const ruta = await guardarArchivo(nombreArchivoPDF(proyecto), bytes, 'application/pdf', FILTRO_PDF)
    setGuardado(ruta ? `Plano guardado en ${ruta}` : null)
  }

  async function bajarCSV() {
    const bytes = csvABytes(generarCSV(proyectoConAutor))
    const ruta = await guardarArchivo(nombreArchivoCSV(proyecto), bytes, 'text/csv;charset=utf-8', FILTRO_CSV)
    setGuardado(ruta ? `Orden de compra guardada en ${ruta}` : null)
  }

  async function mandarAlErp() {
    setEnviando(true)
    setRespuesta(null)
    setRespuesta(await enviarPedido(pedido))
    setEnviando(false)
  }

  // Tapa toda la aplicación mientras se instala una versión nueva. Va antes del
  // login para que también bloquee esa pantalla.
  const capaActualizacion = actualizando ? (
    <div className="capa-actualizacion" role="alertdialog" aria-modal="true" aria-labelledby="actualizando-titulo">
      <div className="tarjeta">
        <h2 id="actualizando-titulo">
          {actualizando.fase === 'descargando' ? 'Descargando la actualización' : 'Instalando la actualización'}
        </h2>
        <p className="version">Versión {actualizando.version}</p>
        {actualizando.fase === 'descargando' ? (
          <>
            <div className={`barra${actualizando.porcentaje === null ? ' indefinida' : ''}`}>
              <i style={actualizando.porcentaje === null ? undefined : { width: `${actualizando.porcentaje}%` }} />
            </div>
            <p className="avance">
              {actualizando.porcentaje === null ? 'Preparando…' : `${actualizando.porcentaje}%`}
            </p>
          </>
        ) : (
          <div className="barra indefinida">
            <i />
          </div>
        )}
        <p className="nota">
          No cierres la aplicación. Se va a reiniciar sola cuando termine.
        </p>
      </div>
    </div>
  ) : null

  if (!usuario)
    return (
      <>
        {capaActualizacion}
        <Login onEntrar={setUsuario} />
      </>
    )

  const cabinasTotal = area.tramos.reduce((s, t) => s + t.cabinas.length, 0)
  /** solo se cotiza cuando se fabrica en Costa Rica; México entrega plano y OC, sin precio */
  const cotiza = proyecto.paisFabricacion === 'CR'
  const pasosVisibles = cotiza ? PASOS : PASOS.filter((p) => p.n !== 8)
  const ultimoPaso = cotiza ? 8 : 7
  const puedePasar = (n: number) => (n <= 6 || area.tramos.length > 0) && (n !== 8 || cotiza)

  return (
    <div className="app" data-tema={tema === 'claro' ? 'claro' : undefined}>
      {capaActualizacion}
      <header className="topbar">
        <div className="brand">
          <b>Constructor de Planos</b>
          <span title="Versión que estás usando">Modumex · v{version}</span>
        </div>
        <span className="chip">Plano N° {proyecto.numero}</span>
        <span className="chip">{proyecto.areas.length === 1 ? area.nombre : `${proyecto.areas.length} áreas`}</span>
        <div className="sep" />
        {avisoActualizacion && <span className="chip" title={avisoActualizacion}>{avisoActualizacion}</span>}
        <span className="chip">{usuario.nombre} · {usuario.rol}</span>
        <button
          className="btn plano chico"
          onClick={buscarActualizacionAhora}
          disabled={buscandoActualizacion}
          title="Comprobar si hay una versión más nueva publicada"
        >
          {buscandoActualizacion ? 'Buscando…' : 'Actualizaciones'}
        </button>
        <button className="btn plano chico" onClick={() => setVerProyectos(true)}>Proyectos</button>
        {esAdmin(usuario) && (
          <>
            <button className="btn plano chico" onClick={() => setVerAlturas(true)}>Alturas</button>
            <button className="btn plano chico" onClick={() => setVerTarifas(true)}>Lista de precios</button>
          </>
        )}
        <button className="btn plano chico" onClick={() => setTema(tema === 'oscuro' ? 'claro' : 'oscuro')}>
          {tema === 'oscuro' ? '☀ Claro' : '☾ Oscuro'}
        </button>
        <button className="btn plano chico" onClick={() => setUsuario(null)}>Salir</button>
      </header>

      {verProyectos && (
        <Proyectos
          usuario={usuario}
          proyecto={proyecto}
          onAbrir={(p) => {
            setProyecto(p)
            // el proyecto que llega trae sus propias áreas y su plano ya armado:
            // se vuelve al área uno y al paso del plano, no al principio
            setActiva(0)
            setSeleccion(null)
            setPaso(7)
          }}
          onCambiarNumero={(numero) => setProyecto({ ...proyecto, numero })}
          onCerrar={() => setVerProyectos(false)}
        />
      )}

      {verAlturas && esAdmin(usuario) && (
        <EditorAlturas
          usuario={usuario}
          tabla={alturasTabla}
          deLaNube={alturasNube}
          onCambio={setAlturasTabla}
          onCerrar={() => setVerAlturas(false)}
        />
      )}

      {verTarifas && esAdmin(usuario) && (
        <EditorTarifas
          usuario={usuario}
          tabla={tarifas?.tabla ?? TARIFAS_BASE}
          onCambio={(t) =>
            setTarifas({ tabla: t, filas: tarifas?.filas ?? 0, deLaNube: tarifas?.deLaNube ?? false })
          }
          onRecargar={recargarTarifas}
          onCerrar={() => setVerTarifas(false)}
        />
      )}

      <div className="main">
        <nav className="pasos">
          <h4>Configuración</h4>
          {pasosVisibles.map((p) => (
            <button
              key={p.n}
              className={`paso ${paso === p.n ? 'activo' : ''} ${paso > p.n ? 'listo' : ''}`}
              onClick={() => setPaso(p.n)}
              disabled={!puedePasar(p.n)}
              type="button"
            >
              <span className="bolita">{paso > p.n ? '✓' : p.n}</span>
              <span className="txt">
                <b>{p.titulo}</b>
                <small>{p.nota}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="centro">
          {paso === 7 ? (
            <>
              <div className="herramientas">
                <button className="btn chico" onClick={() => remodular()}>Volver a modular</button>
                <div className="div" />
                <label className="toggle">
                  <input type="checkbox" checked={unidad === 'in'} onChange={(e) => setUnidad(e.target.checked ? 'in' : 'cm')} />
                  Pulgadas
                </label>
                <label className="toggle">
                  <input type="checkbox" checked={verCotas} onChange={(e) => setVerCotas(e.target.checked)} />
                  Cotas
                </label>
                <label className="toggle">
                  <input type="checkbox" checked={verInodoros} onChange={(e) => setVerInodoros(e.target.checked)} />
                  Sanitarios
                </label>
                <div className="div" />
                <button className="btn chico" onClick={bajarPDF}>Plano en PDF</button>
                <button className="btn chico" onClick={bajarCSV}>CSV para el CIP</button>
                <div className="div" />
                <span className="chip on">Arrastrá los paneles · clic derecho en una pieza</span>
                <div className="sep" style={{ flex: 1 }} />
                <button className="btn chico" onClick={siguienteArea}>+ Siguiente área, misma configuración</button>
              </div>

              <div className="editor">
                <div className="lienzo-wrap">
                  <EditorPlano
                    tramos={area.tramos}
                    config={config}
                    unidad={unidad}
                    verInodoros={verInodoros}
                    verCotas={verCotas}
                    seleccion={seleccion}
                    onSeleccion={setSeleccion}
                    onCabinas={onCabinas}
                    onPilastra={onPilastra}
                  />
                </div>

                <aside className="props">
                  {/* si el área es de puros orinales o de regaderas, la foto que va es la de ese producto */}
                  <VistaRender consulta={conFoto(config, tipoDeArea(area))} alto={130} />
                  <h4>Área</h4>
                  <div className="bloque">
                    <div className="fila">
                      <span>Nombre</span>
                      <input
                        className="editable"
                        value={area.nombre}
                        placeholder="Baño de hombres 101"
                        onChange={(e) => setArea({ nombre: e.target.value })}
                      />
                    </div>
                    <div className="fila">
                      <span>Piso</span>
                      <input
                        className="editable"
                        value={area.piso}
                        placeholder="Planta baja"
                        onChange={(e) => setArea({ piso: e.target.value })}
                      />
                    </div>
                    <div className="fila"><span>Tipología</span><b>{tipologia(config.tipologia).nombre}</b></div>
                    <div className="fila"><span>Cabinas</span><b>{cabinasTotal}</b></div>
                    <div className="fila"><span>Línea · modelo</span><b>{config.linea === 'SUPERIOR' ? 'Superior 2.0' : config.linea} · {config.modelo}</b></div>
                    <div className="fila"><span>Color</span><b>{config.color}</b></div>
                    <div className="fila"><span>Herrajes</span><b>{nombreHerraje(config.herrajeAcabado)}</b></div>
                    <div className="fila"><span>Espesor PT/PN/PL</span><b>{config.espesorMm} mm</b></div>
                    <div className="fila"><span>Altura</span><b>{formatear(config.alturaCm, unidad)}</b></div>
                    <div className="fila"><span>Profundidad</span><b>{formatear(config.profundidadCm, unidad)}</b></div>
                  </div>

                  {area.tramos.map((t) => (
                    <div className="bloque" key={t.id}>
                      <h4>{t.nombre}</h4>
                      <div className="fila"><span>Claro armado</span><b>{formatear(anchoTotal(t.cabinas), unidad)}</b></div>
                      {t.cabinas.map((c, i) => (
                        <div className="fila" key={c.id}>
                          <span style={{ color: seleccion === c.id ? 'var(--accent)' : undefined }}>
                            Cabina {i + 1}{c.tipo !== 'normal' ? ` · ${c.tipo}` : ''}
                          </span>
                          <b>
                            {formatear(c.anchoCm, unidad)}
                            {c.puerta.tipo === 'puerta' && c.tipo !== 'orinal'
                              ? ` / PT${c.puerta.anchoCm}`
                              : c.puerta.tipo === 'cortina'
                                ? ' / cortina'
                                : ''}
                          </b>
                        </div>
                      ))}
                    </div>
                  ))}

                  <div className="bloque">
                    <h4>Cómo se edita</h4>
                    <p className="vacio">
                      Arrastrá un panel divisor y las dos cabinas vecinas se reparten el ancho: el claro total no se
                      mueve. Clic derecho sobre una cabina cambia puerta, apertura, bisagra y tipo; clic derecho sobre
                      un panel, sus recortes.
                    </p>
                  </div>
                </aside>
              </div>
            </>
          ) : (
            <div className="centro-scroll">
              {paso === 1 && (
                <>
                  <h2>Datos del proyecto</h2>
                  <p className="sub">Lo que va en el cajetín del plano y en la cotización.</p>

                  <h4 style={{ margin: '0 0 10px', color: 'var(--text-2)' }}>País de fabricación</h4>
                  <div className="grid-cards" style={{ marginBottom: 24, maxWidth: 620 }}>
                    {PAISES.map((p) => (
                      <button
                        key={p.id}
                        className={`card ${proyecto.paisFabricacion === p.id ? 'sel' : ''}`}
                        onClick={() => cambiarPais(p.id)}
                        type="button"
                      >
                        <b>{p.nombre}</b>
                        <small>{p.nota}</small>
                      </button>
                    ))}
                  </div>

                  <div className="campos">
                    <div className="campo">
                      <label>N° de plano</label>
                      <input value={proyecto.numero} onChange={(e) => setProyecto({ ...proyecto, numero: e.target.value })} />
                    </div>
                    <div className="campo">
                      <label>Obra</label>
                      <input value={proyecto.obra} onChange={(e) => setProyecto({ ...proyecto, obra: e.target.value })} />
                    </div>
                    <div className="campo">
                      <label>Cliente</label>
                      <input value={proyecto.cliente} onChange={(e) => setProyecto({ ...proyecto, cliente: e.target.value })} />
                    </div>
                    <div className="campo">
                      <label>Ubicación</label>
                      <input value={proyecto.ubicacion} onChange={(e) => setProyecto({ ...proyecto, ubicacion: e.target.value })} />
                    </div>
                    <div className="campo">
                      <label>Distribuidor</label>
                      <input value={proyecto.distribuidor} onChange={(e) => setProyecto({ ...proyecto, distribuidor: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              {paso === 2 && (
                <>
                  <h2>Línea y modelo</h2>
                  <p className="sub">La línea define el acabado, las alturas y los herrajes disponibles.</p>
                  <div className="grid-cards">
                    {lineasDe(proyecto.paisFabricacion).map((l) => (
                      <button key={l.id} className={`card ${config.linea === l.id ? 'sel' : ''}`} onClick={() => cambiarLinea(l.id)} type="button">
                        <b>{l.nombre}</b>
                        <small>{l.nota}</small>
                      </button>
                    ))}
                  </div>
                  <h4 style={{ margin: '28px 0 10px', color: 'var(--text-2)' }}>
                    Modelo · las fotos son con el color {config.color}
                  </h4>
                  <div className="modelos">
                    {MODELOS[config.linea].map((m) => {
                      const foto = fotoDe(conFoto({ ...config, modelo: m.codigo }))
                      return (
                        <button
                          key={m.codigo}
                          className={`modelo-card ${config.modelo === m.codigo ? 'sel' : ''}`}
                          onClick={() => elegirModelo(m.codigo)}
                          type="button"
                        >
                          <span className={`foto ${foto ? '' : 'sin'}`}>
                            {foto ? <img src={foto.archivo} alt={m.nombre} /> : 'sin render'}
                          </span>
                          <span className="pie">
                            <b>{m.nombre}</b>
                            <small>{m.codigo}{foto?.referencia ? ' · foto de referencia' : ''}</small>
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <div style={{ marginTop: 20, maxWidth: 720 }}>
                    <VistaRender
                      consulta={conFoto(config)}
                      alto={300}
                      titulo={`${nombreModelo(config.linea, config.modelo)} · ${config.color}`}
                    />
                  </div>
                </>
              )}

              {paso === 3 && (
                <>
                  <h2>Acabado y color</h2>
                  <p className="sub">
                    {proyecto.paisFabricacion === 'MX'
                      ? 'La lista es la materia prima de la planta de México, con su código y las medidas de lámina en las que llega.'
                      : 'Los colores son los del catálogo de Costa Rica. Si el cliente pide uno que no está en la lista, se escribe abajo y la cotización lo toma como especial.'}
                  </p>
                  <div className="grid-cards">
                    {ACABADOS[config.linea].map((a) => (
                      <button key={a} className={`card ${config.acabado === a ? 'sel' : ''}`} onClick={() => cambiarAcabado(a)} type="button">
                        <b>{a}</b>
                        <small>
                          {a === 'Acero Inoxidable' || a === 'Esmaltada Antigrafiti'
                            ? 'Solo Superior 2.0, con su propio color'
                            : proyecto.paisFabricacion === 'MX'
                              ? `Los colores de línea de la planta, en ${espesorPorLinea(config.linea)} mm`
                              : 'Los ocho colores de línea, en stock'}
                        </small>
                      </button>
                    ))}
                  </div>

                  {proyecto.paisFabricacion === 'MX' ? (
                    <ColoresMexico
                      linea={config.linea}
                      color={config.color}
                      onElegir={(c) =>
                        setConfig({ color: c.color, colorCodigo: c.codigoBase })
                      }
                    />
                  ) : (
                    <>
                      <h4 style={{ margin: '28px 0 10px', color: 'var(--text-2)' }}>
                        Color · {etiquetaTier(tierDeColor(config.color, proyecto.paisFabricacion))}
                      </h4>
                      <div className="pildoras">
                        {coloresPara(config.linea, config.acabado).map((c) => (
                          <button
                            key={c.nombre}
                            className={`pildora ${config.color === c.nombre ? 'on' : ''}`}
                            onClick={() => setConfig({ color: c.nombre, colorCodigo: undefined })}
                            title={c.alias?.length ? `También llega como: ${c.alias.join(', ')}` : undefined}
                            type="button"
                          >
                            <span className="muestra" style={{ background: c.hex }} />
                            {c.nombre}
                            {c.nombreViejo && <span className="viejo">{c.nombreViejo}</span>}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <div style={{ marginTop: 18, maxWidth: 760 }}>
                    <VistaRender
                      consulta={conFoto(config)}
                      alto={330}
                      titulo={`${nombreModelo(config.linea, config.modelo)} · ${config.acabado} · ${config.color}`}
                    />
                  </div>

                  <div className="campos" style={{ marginTop: 22, maxWidth: 420 }}>
                    <div className="campo">
                      <label>Color especial</label>
                      <input
                        value={tierDeColor(config.color, proyecto.paisFabricacion) === 'especial' ? config.color : ''}
                        placeholder="Escribí el color que pidió el cliente"
                        onChange={(e) => setConfig({ color: e.target.value })}
                      />
                      <span className="ayuda">Un color fuera de catálogo se cotiza con la tarifa de especial</span>
                    </div>
                  </div>
                </>
              )}

              {paso === 4 && (
                <>
                  <h2>Herrajes</h2>
                  <p className="sub">
                    Va en juego completo: si el cliente pide negro, todas las piezas son negras. No se elige una por una.
                  </p>
                  <div className="grid-cards">
                    {HERRAJE_ACABADOS.map((h) => (
                      <button
                        key={h.id}
                        className={`card ${config.herrajeAcabado === h.id ? 'sel' : ''}`}
                        onClick={() => elegirHerraje(h.id)}
                        type="button"
                      >
                        <b>{h.nombre}</b>
                        <small>{h.nota}</small>
                      </button>
                    ))}
                  </div>

                  {faltanFotosHerraje(config.linea, config.herrajeAcabado) ? (
                    <div className="aviso-caja" style={{ marginTop: 14, maxWidth: 720 }}>
                      <b>
                        Faltan las fotos del juego en {nombreHerraje(config.herrajeAcabado).toLowerCase()} de{' '}
                        {LINEAS.find((l) => l.id === config.linea)?.nombre}
                      </b>
                      <span>
                        La elección ya queda guardada y sale en el plano, en el CSV y en el pedido. Cuando lleguen las
                        fotos se corre de nuevo <code>npm run herrajes</code> y aparecen acá, sin tocar más nada.
                      </span>
                    </div>
                  ) : (
                    <div className="herrajes-tira" style={{ marginTop: 14 }}>
                      {fotosHerraje(config.linea, config.herrajeAcabado, config.terminacion).map((f) => (
                        <figure className="herraje-pieza" key={f.archivo}>
                          <img src={f.archivo} alt={f.pieza} />
                          <span>{f.pieza}{f.nota ? ` · ${f.nota}` : ''}</span>
                        </figure>
                      ))}
                    </div>
                  )}

                  <div className="campos" style={{ marginTop: 24 }}>
                    <div className="campo">
                      <label>Altura de pieza (cm)</label>
                      <div className="fijo">{alturas.puerta}</div>
                      <span className="ayuda">
                        La pone el modelo {nombreModelo(config.linea, config.modelo)}: puerta y panel{' '}
                        {alturas.puerta === alturas.panel ? alturas.puerta : `${alturas.puerta} y ${alturas.panel}`},{' '}
                        pilastra {alturas.pilastra}
                      </span>
                    </div>
                    <div className="campo">
                      <label>Espesor de PT, PN y PL (mm)</label>
                      <div className="fijo">{config.espesorMm} · {config.espesorMm === 3 ? 'cara Superior 2.0' : 'laminado compacto'}</div>
                      <span className="ayuda">Fijo en {config.linea === 'SUPERIOR' ? 'Superior 2.0' : config.linea === 'TOUCHLESS' ? 'Touchless S3' : 'LEEDER'}</span>
                    </div>
                    <div className="campo">
                      <label>Terminación</label>
                      <select value={config.terminacion} onChange={(e) => setConfig({ terminacion: e.target.value as 'ZOCLO' | 'PATAS' })}>
                        {terminacionesDe(config.herrajeAcabado).map((t) => (
                          <option key={t} value={t}>{t === 'ZOCLO' ? 'Zoclo' : 'Pata'}</option>
                        ))}
                      </select>
                      {terminacionesDe(config.herrajeAcabado).length === 1 && (
                        <span className="ayuda">El juego negro va siempre con pata</span>
                      )}
                    </div>
                    <div className="campo">
                      <label>KAP</label>
                      <select value={config.kap ? 'SI' : 'NO'} onChange={(e) => setConfig({ kap: e.target.value === 'SI' })}>
                        <option value="NO">No</option>
                        <option value="SI">Sí</option>
                      </select>
                      <span className="ayuda">Sale en el cajetín y en el CSV</span>
                    </div>
                  </div>
                </>
              )}

              {paso === 5 && (
                <>
                  <h2>Tipología del área</h2>
                  <p className="sub">
                    Elegí el arreglo y mirá cómo queda antes de tomar medidas. Las de esquina, nicho y U son las que
                    el Constructor viejo no podía armar.
                  </p>
                  <div className="tipos">
                    {TIPOLOGIAS.map((t) => (
                      <button
                        key={t.id}
                        className={`tipo ${config.tipologia === t.id ? 'sel' : ''}`}
                        onClick={() => { setConfig({ tipologia: t.id as TipologiaId }); setArea({ tramos: [] }) }}
                        type="button"
                      >
                        <span className="lienzo"><PreviewTipologia id={t.id} /></span>
                        <span className="pie">
                          <b>{t.nombre}</b>
                          <small>{t.descripcion}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {paso === 6 && (
                <>
                  <h2>Medidas del lugar</h2>
                  <p className="sub">
                    Dando el claro y la cantidad, el reparto lo hace la app. Después se ajusta arrastrando sobre el plano.
                  </p>
                  <div className="campos">
                    <div className="campo">
                      <label>Claro disponible (cm)</label>
                      <input type="number" value={claroCm} onChange={(e) => setClaroCm(Number(e.target.value))} />
                      <span className="ayuda">Medida de pared a pared del tramo principal</span>
                    </div>
                    <div className="campo">
                      <label>Cantidad de cabinas</label>
                      <input type="number" min={1} max={12} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} />
                    </div>
                    <div className="campo">
                      <label>Profundidad de cabina (cm)</label>
                      <input type="number" value={config.profundidadCm} onChange={(e) => setConfig({ profundidadCm: Number(e.target.value) })} />
                      <span className="ayuda">Es el ancho del panel divisor</span>
                    </div>
                    <div className="campo">
                      <label>Ancho de la accesible (cm)</label>
                      <input type="number" value={config.anchoAccesibleCm} onChange={(e) => setConfig({ anchoAccesibleCm: Number(e.target.value) })} />
                      <span className="ayuda">Se respeta al modular</span>
                    </div>
                    <div className="campo">
                      <label>Orinales</label>
                      <input type="number" min={0} max={10} value={config.orinales} onChange={(e) => setConfig({ orinales: Number(e.target.value) })} />
                      <span className="ayuda">{config.orinales > 1 ? `Lleva ${config.orinales - 1} divisores` : 'Sin divisores'}</span>
                    </div>
                    <div className="campo">
                      <label>Alto del divisor de orinal (cm)</label>
                      <select value={config.mgAlturaCm} onChange={(e) => setConfig({ mgAlturaCm: Number(e.target.value) })}>
                        <option value={120}>120 · MG120</option>
                        <option value={150}>150 · MG150</option>
                      </select>
                    </div>
                    <div className="campo">
                      <label>Áreas iguales a crear</label>
                      <input type="number" min={1} max={12} value={copias} onChange={(e) => setCopias(Number(e.target.value))} />
                      <span className="ayuda">Para obras de varios pisos con baños idénticos</span>
                    </div>
                  </div>

                  <div className="aviso-caja" style={{ marginTop: 22, maxWidth: 620 }}>
                    <b>Vista previa del reparto</b>
                    <span className="num">
                      {modular(claroCm, cantidad, config.tipologia === 'PMR' ? config.anchoAccesibleCm : 0)
                        .map((c) => `${c.anchoCm}`)
                        .join('  ·  ')} cm
                    </span>
                  </div>
                </>
              )}

              {paso === 8 && (
                <>
                  <h2>Cotización y pedido</h2>
                  <p className="sub">
                    Precio armado desde las piezas del plano. El pedido sale con el mismo detalle hacia el ERP.
                  </p>

                  <div className={`aviso-caja ${tarifas?.deLaNube ? 'ok' : ''}`} style={{ maxWidth: 720, marginBottom: 16 }}>
                    <b>
                      {tarifas?.deLaNube
                        ? `Tarifas de la tabla tarifa_m2 · ${tarifas.filas} filas`
                        : 'Tarifas de respaldo'}
                    </b>
                    <span>
                      {tarifas?.deLaNube
                        ? `Precio por m² de ${nombreModelo(config.linea, config.modelo)} (${config.modelo}), color de tier ${etiquetaTier(tierDeColor(config.color, proyecto.paisFabricacion))}, en ${moneda === 'CRC' ? 'colones' : 'dólares'}.`
                        : `Todavía no llegaron las tarifas de Supabase${tarifas?.error ? `: ${tarifas.error}` : ''}. Se están usando las de la lista que trae el Constructor.`}
                    </span>
                  </div>

                  <div className="tabla-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Descripción</th>
                          <th>Tipo</th>
                          <th className="der">Cant.</th>
                          <th className="der">Unitario</th>
                          <th className="der">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {renglones.map((r, i) => (
                          <tr key={`${r.sku}-${i}`}>
                            <td className="num">{r.sku}</td>
                            <td>
                              {r.descripcion}
                              {!r.tarifaReal && (
                                <span className="estimado" title="Los kits no están en tarifa_m2: este precio es estimado">
                                  estimado
                                </span>
                              )}
                            </td>
                            <td>{r.tipo}</td>
                            <td className="der">{r.cantidad}</td>
                            <td className="der">{money(r.precioUnit)}</td>
                            <td className="der">{money(r.cantidad * r.precioUnit)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr><td colSpan={5}>Neto</td><td className="der">{money(neto)}</td></tr>
                        {usuario.descuento > 0 && (
                          <tr><td colSpan={5}>Descuento {usuario.descuento}%</td><td className="der">−{money(descuento)}</td></tr>
                        )}
                        <tr><td colSpan={5}>IVA {ivaPorcentaje}%</td><td className="der">{money(iva)}</td></tr>
                        <tr><td colSpan={5}>Total</td><td className="der">{money(total)}</td></tr>
                      </tfoot>
                    </table>
                  </div>

                  <div style={{ display: 'flex', gap: 22, alignItems: 'flex-end', margin: '24px 0 20px', flexWrap: 'wrap' }}>
                    <div className="total-grande">
                      <span>Total</span>
                      <b>{money(total)}</b>
                    </div>
                    <div className="pildoras">
                      <button className={`pildora ${moneda === 'CRC' ? 'on' : ''}`} onClick={() => setMoneda('CRC')} type="button">Colones</button>
                      <button className={`pildora ${moneda === 'USD' ? 'on' : ''}`} onClick={() => setMoneda('USD')} type="button">Dólares</button>
                    </div>
                  </div>

                  <div className="aviso-caja" style={{ maxWidth: 720 }}>
                    <b>{erpConectado ? 'ERP conectado' : 'Paso al ERP listo, sin conectar'}</b>
                    <span>
                      {erpConectado
                        ? 'El pedido se manda al endpoint configurado en VITE_ERP_URL.'
                        : 'El envío responde local con un número simulado. Cuando IT confirme el ERP y las credenciales, se llena VITE_ERP_URL y el mismo pedido sale de verdad, sin cambiar nada más.'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                    <button className="btn primario" onClick={mandarAlErp} disabled={enviando || renglones.length === 0}>
                      {enviando ? 'Enviando…' : 'Enviar pedido al ERP'}
                    </button>
                    <button className="btn" onClick={bajarPDF}>Plano en PDF</button>
                    <button className="btn" onClick={bajarCSV}>CSV para el CIP</button>
                    <button className="btn" onClick={() => setVerPayload(!verPayload)}>
                      {verPayload ? 'Ocultar' : 'Ver'} lo que se envía
                    </button>
                  </div>

                  <div className="aviso-caja" style={{ marginTop: 16, maxWidth: 720 }}>
                    <b>Qué lleva cada archivo</b>
                    <span>
                      El <b>PDF</b> trae una hoja por área con el plano a escala, las cotas, el cuadro de piezas y el
                      cajetín. El <b>CSV</b> es el que se arrastra a la pestaña Capturar del CIP: mismas columnas y
                      mismo SKU largo que emite el Constructor de hoy.
                    </span>
                  </div>

                  {guardado && (
                    <div className="aviso-caja ok" style={{ marginTop: 16, maxWidth: 720 }}>
                      <b>Archivo guardado</b>
                      <span className="num" style={{ fontSize: 12.5 }}>{guardado}</span>
                    </div>
                  )}

                  {respuesta && (
                    <div className={`aviso-caja ${respuesta.ok ? 'ok' : ''}`} style={{ marginTop: 16, maxWidth: 720 }}>
                      <b>{respuesta.ok ? `Pedido ${respuesta.numeroPedido}` : 'No se envió'}</b>
                      <span>{respuesta.mensaje}</span>
                    </div>
                  )}

                  {verPayload && <pre className="payload" style={{ marginTop: 16 }}>{JSON.stringify(pedido, null, 2)}</pre>}
                </>
              )}
            </div>
          )}

          <div className="barra-pie">
            <button className="btn" onClick={() => setPaso(Math.max(1, paso - 1))} disabled={paso === 1}>← Atrás</button>
            <span className="cuenta">Paso {paso} de {ultimoPaso}</span>
            <div className="sep" />
            {paso === 6 && (
              <button className="btn" onClick={() => { remodular(); }}>Aplicar reparto</button>
            )}
            {paso < ultimoPaso ? (
              <button
                className="btn primario"
                onClick={() => (paso === 6 ? irAlPlano() : setPaso(paso + 1))}
              >
                {paso === 6 ? 'Dibujar el plano →' : 'Siguiente →'}
              </button>
            ) : paso === 8 ? (
              <button className="btn primario" onClick={() => setPaso(7)}>Volver al plano</button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
