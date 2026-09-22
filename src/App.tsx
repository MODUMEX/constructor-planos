import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import Login from './components/Login'
import PreviewTipologia from './components/PreviewTipologia'
import EditorPlano, { formatear } from './components/EditorPlano'
import { generarCSV, nombreArchivoCSV } from './exportar/csv'
import { generarPDF, nombreArchivoPDF } from './exportar/pdf'
import {
  generarCotizacionPDF, nombreArchivoCotizacion, resumenDePiezas, totalesDe,
} from './exportar/cotizacion'
import { csvABytes, FILTRO_CSV, FILTRO_PDF, guardarArchivo } from './exportar/guardar'
import { abrirProyecto } from './proyectos'
import {
  autorizar as autorizarEnOdoo, cuadran, guardarCotizacion, lineasParaOdoo, rechazar as rechazarCotizacion,
} from './odoo/enviar'
import { esAdmin, IVA_CR, puedeCatalogos, puedeColoresReservados, puedeDistribuidores, puedePiezas, puedeUsuarios, type Usuario } from './auth'
import type { Area, Cabina, Config, Moneda, Pais, Proyecto, TipoCabina, TipologiaId, Tramo } from './types'
import {
  acabadoEsElColor, acabadosPara, alturasDe, anchosPanel, claroAjustado, coloresPara, espesorPorLinea, HERRAJE_ACABADOS, LINEAS, mgMedidas, MODELOS,
  type PiezaEspecial,
  PAISES, etiquetaTier, nombreHerraje, nombreModelo, tierDeColor, TIPOLOGIAS, tipologia, tipologiaEspejo,
  ANCHOS_PILASTRA, esEspecial, esSoloOrinales,
} from './catalog'
import { medidaCercana } from './modulador'
import VistaRender from './components/VistaRender'
import ColoresMexico from './components/ColoresMexico'
import CampoNumero from './components/CampoNumero'
import Usuarios from './components/Usuarios'
import Solicitudes from './components/Solicitudes'
import { contarSolicitudes } from './solicitudes'
import { coloresMxPara, slugRenderMx } from './coloresMx'
import { fotoDe, fotosHerraje, faltanFotosHerraje, terminacionesDe } from './renders'
import { anchoAccesibleDe, anchoTotal, bom, claroDeOrinales, crearTramos, modularConCatalogo, nuevoId, reajustarConPuertas } from './modulacion'
import { anchoDeOrinal } from './geometria'
import { cargarTarifas, type ResultadoTarifas } from './tarifas'
import { buscarActualizacion, type FaseActualizacion } from './actualizar'
import { versionActual, VERSION_COMPILADA } from './version'
import { TARIFAS_RESPALDO } from './tarifas'
import EditorTarifas from './components/EditorTarifas'
import EditorAlturas from './components/EditorAlturas'
import EditorPiezas from './components/EditorPiezas'
import Distribuidores from './components/Distribuidores'
import DuplicarArea from './components/DuplicarArea'
import { listarDistribuidores, type Distribuidor } from './distribuidores'
import { alturasDeFabrica, cargarAlturas, usarAlturas, type TablaAlturas } from './alturas'
import { cargarPiezas, usarPiezas } from './piezas'
import Proyectos from './components/Proyectos'
import type { Descuento } from './types'
import {
  codigoDe, guardarProyecto, huellaDe, listarProyectos, revisionAGuardar, type Revision,
} from './proyectos'

const TC = 512

/** cuántas cabinas se pueden pedir de una vez: se elige de la lista, no se escribe */
const CANTIDADES = Array.from({ length: 15 }, (_, i) => i + 1)

/** el paso donde se escoge el layout; ahí arranca cada área nueva */
const PASO_TIPOLOGIA = 5

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
    anchoPmrCuartoCm: 162,
    // Medida de arranque, como el claro de 420: el cuarto necesita más fondo
    // que una cabina y con la profundidad de cabina el divisor no cerraría.
    profundidadLugarCm: 250,
    anchoPanelDivisorPmrCm: 100,
    cierrePmr: 'muros',
    anchoPilastraCm: 15,   // 16 no existe en catalogo; 15 si (familia PI)
    espesorMm: 12,
    terminacion: 'ZOCLO',
    kap: false,
    orinales: 0,
    llevaAccesible: false,
    anchoOrinalCm: 60,
    mgAnchoCm: 60,
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

/** cómo se llama cada moneda en pantalla */
function nombreMoneda(m: Moneda): string {
  return m === 'CRC' ? 'Colones' : m === 'MXN' ? 'Pesos' : 'Dólares'
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
  // La app va en oscuro. El interruptor se quitó; queda el ?tema=claro de la
  // dirección por si hace falta una captura en claro.
  const [tema] = useState<'oscuro' | 'claro'>(params.get('tema') === 'claro' ? 'claro' : 'oscuro')
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


  const [unidad, setUnidad] = useState<'cm' | 'in'>('cm')
  const [verInodoros, setVerInodoros] = useState(true)
  const [verCotas, setVerCotas] = useState(true)
  const [seleccion, setSeleccion] = useState<string | null>(null)
  /** qué área está a un clic de borrarse; se pregunta antes de sacarla */
  const [borrarArea, setBorrarArea] = useState<number | null>(null)
  const [moneda, setMoneda] = useState<Moneda>('CRC')

  const [guardado, setGuardado] = useState<string | null>(null)
  const [tarifas, setTarifas] = useState<ResultadoTarifas | null>(null)
  const [verTarifas, setVerTarifas] = useState(demo && params.has('tarifas'))
  const [alturasTabla, setAlturasTabla] = useState<TablaAlturas>(alturasDeFabrica)
  const [alturasNube, setAlturasNube] = useState(false)
  const [verAlturas, setVerAlturas] = useState(false)
  const [piezasLista, setPiezasLista] = useState<PiezaEspecial[]>([])
  const [piezasNube, setPiezasNube] = useState(false)
  const [verPiezas, setVerPiezas] = useState(false)
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([])
  const [verDistribuidores, setVerDistribuidores] = useState(false)
  const [verUsuarios, setVerUsuarios] = useState(false)
  const [verSolicitudes, setVerSolicitudes] = useState(false)
  // cuántas cuentas están esperando aprobación, para el contador del botón
  const [nSolicitudes, setNSolicitudes] = useState(0)

  // el aviso del cambio rechazado es de UN área: al pasar a otra no aplica
  useEffect(() => {
    setBloqueo(null)
  }, [activa])
  useEffect(() => {
    if (!esAdmin(usuario)) { setNSolicitudes(0); return }
    let vivo = true
    void contarSolicitudes(usuario).then((n) => { if (vivo) setNSolicitudes(n) })
    return () => { vivo = false }
  }, [usuario])
  const [verDuplicar, setVerDuplicar] = useState(false)
  // por qué se rechazó el último cambio de pilastra, para poder decírselo
  const [bloqueo, setBloqueo] = useState<string | null>(null)
  /** si ya se le avisó que faltan datos del proyecto; se enciende al querer avanzar */
  const [avisoDatos, setAvisoDatos] = useState(false)
  const [verProyectos, setVerProyectos] = useState(false)
  /**
   * La revisión con la que está guardado lo que hay en pantalla, y la huella
   * del contenido en ese momento. Con las dos cosas se sabe si el proyecto
   * cambió desde el último guardado, que es lo que hace nacer la letra
   * siguiente. En null mientras el proyecto no se haya guardado nunca.
   */
  const [revisionGuardada, setRevisionGuardada] = useState<{ revision: Revision; huella: string } | null>(null)
  const [guardandoProyecto, setGuardandoProyecto] = useState(false)
  const [avisoProyecto, setAvisoProyecto] = useState<{ ok: boolean; mensaje: string } | null>(null)
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
    cargarPiezas(usuario.token).then((r) => {
      if (!vigente) return
      setPiezasLista(r.lista)
      setPiezasNube(r.deLaNube)
    })
    return () => {
      vigente = false
    }
  }, [usuario?.token])

  // Un distribuidor no elige: sus planos salen a su nombre, así que se pone solo
  useEffect(() => {
    if (usuario?.rol !== 'Distribuidor' || !usuario.distribuidorNombre) return
    setProyecto((p) => (p.distribuidor === usuario.distribuidorNombre ? p : { ...p, distribuidor: usuario.distribuidorNombre! }))
  }, [usuario?.rol, usuario?.distribuidorNombre])

  /**
   * Trae la lista de distribuidores de la nube. Se llama al entrar y cada vez
   * que se abre o se cierra su pantalla: antes se traía UNA sola vez, así que
   * si alguien daba de alta o borraba uno desde la base, la app seguía
   * mostrando la lista vieja hasta volver a entrar.
   */
  const recargarDistribuidores = useCallback(async () => {
    if (!usuario?.token) return
    const r = await listarDistribuidores(usuario)
    if (r.ok && r.dato) setDistribuidores(r.dato)
  }, [usuario])

  useEffect(() => {
    void recargarDistribuidores()
  }, [recargarDistribuidores])

  // el plano, el CSV y la cotización leen las alturas del catálogo, así que
  // la tabla activa se deja puesta ahí en vez de pasarla por cada llamada
  useEffect(() => {
    usarAlturas(alturasTabla)
  }, [alturasTabla])

  // las especiales viajan por el mismo camino que las alturas: se dejan puestas
  // en el catálogo para que los selectores, el plano y la cotización las vean
  useEffect(() => {
    usarPiezas(piezasLista)
  }, [piezasLista])

  function recargarTarifas() {
    if (!usuario?.token) {
      setTarifas({ tabla: TARIFAS_RESPALDO, filas: 0, deLaNube: false })
      return
    }
    cargarTarifas(usuario.token).then(setTarifas)
  }

  // los tokens de color viven en :root, así que el tema se marca en el documento
  useEffect(() => {
    if (tema === 'claro') document.documentElement.setAttribute('data-tema', 'claro')
    else document.documentElement.removeAttribute('data-tema')
  }, [tema])

  /**
   * La región del distribuidor del proyecto. El proyecto guarda su NOMBRE, así
   * que la región se busca en la lista; un Distribuidor solo tiene la suya.
   */
  const regionDistribuidor =
    distribuidores.find((d) => d.nombre === proyecto.distribuidor)?.region ?? null

  /**
   * La moneda NO se elige.
   *
   * Lo primero que manda es DÓNDE SE FABRICA: un proyecto de la planta de
   * México sale de la lista de precios de México, que está en pesos y con sus
   * propios grupos de color, así que cotizarlo en otra moneda mezclaría los
   * tiers de una lista con las tarifas de la otra.
   *
   * La manda la REGIÓN DEL DISTRIBUIDOR, que es quien factura: Costa Rica en
   * colones, México en pesos y el resto de LATAM en dólares.
   *
   * Mientras no haya distribuidor elegido todavía no hay región, y ahí decide
   * dónde se fabrica: la planta de México cotiza de su lista, que está en
   * pesos. Con Costa Rica se deja elegir, como siempre.
   */
  const monedaFija: Moneda | null =
    regionDistribuidor === 'Costa Rica' ? 'CRC'
      : regionDistribuidor === 'México' ? 'MXN'
        : regionDistribuidor === 'LATAM' ? 'USD'
          : proyecto.paisFabricacion === 'MX' ? 'MXN'
            : null

  // OJO: este efecto va ACÁ y no más abajo. Abajo hay un return temprano
  // para la pantalla de entrada, y un hook después de un return cambia la
  // cantidad de hooks entre "sin sesión" y "con sesión": React aborta el
  // dibujo y la ventana queda en negro al iniciar sesión.
  useEffect(() => {
    if (monedaFija && moneda !== monedaFija) setMoneda(monedaFija)
  }, [monedaFija, moneda])

  /**
   * Los datos del proyecto que NO pueden faltar: sin ellos el plano sale con el
   * cajetín a medias y la orden no se puede rastrear. Se piden antes de dejar
   * el primer paso.
   */
  const faltanDatos = (
    [
      ['N° de plano', proyecto.numero],
      ['Obra', proyecto.obra],
      ['Ubicación', proyecto.ubicacion],
      ['Distribuidor', proyecto.distribuidor || usuario?.distribuidorNombre || ''],
    ] as const
  )
    .filter(([, valor]) => !String(valor ?? '').trim())
    .map(([etiqueta]) => etiqueta)

  const area = proyecto.areas[activa]
  const config = area.config
  /**
   * El claro y la cantidad de cabinas son POR ÁREA. Un proyecto no tiene una
   * sola modulación: tiene varias y distintas. Al cambiar de área estos dos
   * números cambian con ella, así que cada una se modula por su cuenta.
   */
  // Los proyectos guardados antes de esto no traen los dos números: ahí se leen
  // del tramo que ya está modulado. Si no, al pasar por Medidas se verían 420 y 4
  // y se le volvería a modular encima el plano que ya tenía.
  const tramoPrincipal = area.tramos[tipologia(config.tipologia).principal]
  const claroCm = config.claroPedidoCm ?? tramoPrincipal?.claroCm ?? 420
  /**
   * Cuántos BAÑOS tiene la tira. Los orinales no cuentan: se piden aparte y la
   * modulación se los agrega al final. Si acá se contaran las cabinas enteras,
   * cada vez que se vuelve a modular se les sumarían los orinales otra vez y la
   * tira crecería sola en cada pasada.
   */
  const banosDe = (t?: Tramo) =>
    esSoloOrinales(config.tipologia)
      ? (t?.cabinas.length ?? 0)
      : (t?.cabinas.filter((c) => c.tipo !== 'orinal').length ?? 0)
  const cantidad = config.cabinasPedidas ?? (tramoPrincipal ? banosDe(tramoPrincipal) : 4)
  const setClaroCm = (n: number) => setConfig({ claroPedidoCm: n })
  const setCantidad = (n: number) => setConfig({ cabinasPedidas: n })
  // la altura de cada pieza la manda el modelo, no el vendedor
  const alturas = alturasDe(config.modelo)
  // los proyectos viejos no traen la pregunta: ahí manda la tipología, como antes
  const llevaAccesible = config.tipologia === 'PMR' || config.llevaAccesible === true
  /** el área es un CUARTO accesible, no una cabina accesible en la tira */
  const esPmrCuarto = config.tipologia === 'PMR'
  /**
   * Cuántos orinales tiene el área. En las tipologías con cabinas los orinales
   * van aparte y los cuenta `config.orinales`; en las de solo orinales, la
   * cantidad que da el vendedor SON los orinales, así que sale de `cantidad`.
   */
  const nOrinales = esSoloOrinales(config.tipologia) ? cantidad : config.orinales
  /**
   * Cuántas mamparas lleva el área. Es lo que de verdad se fabrica y se cotiza
   * de un campo de orinales: el hueco entre ellas no es una pieza.
   *
   * Sale de la misma regla que usa la modulación: una entre cada par, y una más
   * si la tira termina en orinal contra un extremo sin muro.
   */
  const nMamparas = (() => {
    if (nOrinales <= 0) return 0
    const t = tipologia(config.tipologia)
    return t.tramos[t.principal].muroFin ? nOrinales - 1 : nOrinales
  })()
  /** el claro que ocupa un campo de solo orinales: la misma cuenta que la modulación */
  const claroOrinalesCm = (() => {
    const t = tipologia(config.tipologia)
    const tr = t.tramos[t.principal]
    return claroDeOrinales(nOrinales, config.anchoOrinalCm ?? 60, tr.muroInicio, tr.muroFin)
  })()
  /**
   * La profundidad del lugar: la pared contra la que corre el divisor del
   * cuarto. Si no se puso, se arranca con la de la cabina para no dibujar algo
   * imposible, y el vendedor la corrige.
   */
  const profLugar = Math.max(config.profundidadLugarCm ?? config.profundidadCm, config.profundidadCm)
  /**
   * El divisor del cuarto, modulado a lo LARGO de la profundidad del lugar:
   * el panel, la puerta del cuarto y el frente que queda. Es la parte vertical
   * de la modulación, la que no existe en las demás tipologías.
   */
  const divisorPmr = (() => {
    const panel = config.profundidadCm
    const puerta = config.puertaAccesibleCm ?? 90
    const sobra = Math.round((profLugar - panel - puerta) * 10) / 10
    const pilastra = sobra > 0 ? medidaCercana(ANCHOS_PILASTRA, sobra) : 0
    return { panel, puerta, sobra, pilastra }
  })()
  // los paneles grandes no existen en todos los modelos
  const panelesDelModelo = anchosPanel(config.modelo)
  // las mamparas de orinal también cambian por línea
  const mgDeLaLinea = mgMedidas(config.linea, config.modelo)

  /**
   * Tramos que no cerraron contra su claro. El buscador siempre devuelve la
   * mejor tira que encontró, así que sin este aviso un claro imposible —doce
   * cabinas en siete metros— se dibuja igual y nadie se entera hasta fabricar.
   */
  const tramosConProblema = area.tramos.filter((t) => t.ajuste && t.ajuste !== 'exacto')

  /**
   * Cuánto tienen que sumar TODAS las pilastras de un tramo. Es el dato que
   * hace falta para poder elegirlas a mano y acertar: si las internas piden
   * 141 cm, 30 · 40 · 50 no llega y hay que verlo antes, no después.
   */
  function sumaPilastras(t: Area['tramos'][number]): number {
    const muros = (t.muroInicio ? 1 : 0) + (t.muroFin ? 1 : 0)
    const conPuerta = t.cabinas.filter((c) => c.tipo !== 'orinal').length
    const cuerpos = t.cabinas.reduce(
      (s, c) => s + (c.tipo === 'orinal' ? c.anchoCm : c.puerta.anchoCm), 0,
    )
    return claroAjustado(t.claroCm, muros, conPuerta) - cuerpos
  }
  const avisosAccesible = area.tramos.filter((t) => t.avisoAccesible)

  /**
   * ¿Cambió algo desde el último guardado? Un proyecto que nunca se guardó
   * cuenta como cambiado, para que la primera vez tome una letra.
   */
  const hayCambiosSinGuardar = revisionGuardada ? huellaDe(proyecto) !== revisionGuardada.huella : true

  /**
   * Guarda el proyecto en la nube. La letra NO se elige: la calcula
   * `revisionAGuardar` con lo que ya hay en la nube y con si se tocó algo.
   * Guardar dos veces seguidas sin editar no inventa una revisión nueva.
   */
  async function guardarAhora(): Promise<{ ok: boolean; mensaje: string }> {
    if (!usuario) return { ok: false, mensaje: 'Hay que entrar con la cuenta para guardar.' }
    const numero = proyecto.numero.trim()
    if (!numero) return { ok: false, mensaje: 'Falta el número de plano.' }
    setGuardandoProyecto(true)
    setAvisoProyecto(null)
    const fallar = (mensaje: string) => {
      setGuardandoProyecto(false)
      const r = { ok: false, mensaje }
      setAvisoProyecto(r)
      return r
    }
    // hay que mirar qué revisiones existen ya: la letra sale de ahí
    const lista = await listarProyectos(usuario)
    if (!lista.ok) return fallar(lista.mensaje)
    const ocupadas = (lista.dato ?? []).filter((p) => p.numeroPlano === numero).map((p) => p.revision)
    const huella = huellaDe(proyecto)
    const elegida = revisionAGuardar(revisionGuardada?.revision ?? null, ocupadas, hayCambiosSinGuardar)
    const g = await guardarProyecto(usuario, proyecto, elegida.revision)
    if (!g.ok) return fallar(g.mensaje)
    setGuardandoProyecto(false)
    setRevisionGuardada({ revision: elegida.revision, huella })
    const codigo = codigoDe(numero, elegida.revision)
    const r = {
      ok: true,
      mensaje: elegida.sinLetras
        ? `Guardado como ${codigo}. Este plano ya usó las cinco letras, así que se reemplazó la ${elegida.revision} en vez de subir.`
        : elegida.nueva
          ? `Guardado como ${codigo}.`
          : `Guardado como ${codigo}. No había nada nuevo, así que no nació otra revisión.`,
    }
    setAvisoProyecto(r)
    return r
  }

  /**
   * Cerrar este proyecto y arrancar otro en blanco, desde el paso 1.
   *
   * Si quedó algo sin guardar se guarda primero, y si ese guardado falla NO se
   * limpia nada: perder el trabajo por un error de red sería lo peor que puede
   * hacer este botón.
   */
  async function empezarProyectoNuevo() {
    if (hayCambiosSinGuardar && proyecto.numero.trim()) {
      const r = await guardarAhora()
      if (!r.ok) return
    }
    setProyecto({
      numero: '',
      paisFabricacion: proyecto.paisFabricacion,
      obra: '',
      cliente: '',
      ubicacion: '',
      // el distribuidor se mantiene: es el mismo quien sigue cotizando
      distribuidor: proyecto.distribuidor,
      creadoPor: proyecto.creadoPor,
      areas: [areaInicial('Área 1', false)],
    })
    setActiva(0)
    setSeleccion(null)
    setRevisionGuardada(null)
    setAvisoProyecto(null)
    setGuardado(null)
    setPaso(1)
  }

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
    // El aviso de "no se aplicó" habla del cambio que se rechazó, no del plano.
    // Si sobrevive a un cambio posterior queda contradiciendo al aviso del
    // tramo, que sí describe lo que hay. Por eso se borra acá, que es por donde
    // pasan TODOS los cambios del área.
    setBloqueo(null)
    setProyecto((p) => ({ ...p, areas: p.areas.map((a, i) => (i === activa ? { ...a, ...cambio } : a)) }))
  }

  /**
   * Cambiar el país cambia la lista de colores, así que a cada área hay que
   * dejarle un color que exista en la lista nueva.
   */
  function cambiarPais(paisFabricacion: Pais) {
    setProyecto((p) => ({
      ...p,
      paisFabricacion,
      areas: p.areas.map((a) => {
        // en Costa Rica hoy solo se fabrica LEEDER: si venía en otra línea, se cambia
        if (paisFabricacion === 'CR' && !lineasDe('CR').some((l) => l.id === a.config.linea)) {
          a = { ...a, config: { ...a.config, linea: 'LEEDER', espesorMm: espesorPorLinea('LEEDER') } }
        }
        if (paisFabricacion === 'MX') {
          const disponibles = coloresMxPara(a.config.linea, puedeColoresReservados(usuario))
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
    const modelo = MODELOS[linea][0].codigo
    const acabado = acabadosPara(linea, modelo, proyecto.paisFabricacion)[0]
    const paneles = anchosPanel(modelo)
    const mg = mgMedidas(linea, modelo)
    const mgSigue = mg.some((m) => m.anchoCm === (config.mgAnchoCm ?? 60) && m.altoCm === config.mgAlturaCm)
    setConfig({
      linea,
      modelo,
      ...(mgSigue ? {} : { mgAnchoCm: mg[0].anchoCm, mgAlturaCm: mg[0].altoCm }),
      acabado,
      ...colorInicial(linea, acabado),
      alturaCm: alturasDe(modelo).puerta,
      profundidadCm: paneles.includes(config.profundidadCm)
        ? config.profundidadCm
        : paneles[paneles.length - 1],
      // Superior 2.0 va en cara de 3 mm; el resto en compacto de 12
      espesorMm: espesorPorLinea(linea),
    })
  }

  /**
   * El modelo define la altura de las piezas y también qué paneles existen, así
   * que si la profundidad elegida no se fabrica en el modelo nuevo se baja al
   * panel más grande que sí: mejor eso que dejar pedida una pieza inexistente.
   */
  function elegirModelo(modelo: string) {
    const paneles = anchosPanel(modelo)
    const profundidadCm = paneles.includes(config.profundidadCm)
      ? config.profundidadCm
      : paneles[paneles.length - 1]
    setConfig({ modelo, alturaCm: alturasDe(modelo).puerta, profundidadCm })
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
    // el esmaltado y el acero son su propio color: no hay lista que elegir
    if (acabadoEsElColor(acabado)) {
      return { color: coloresPara(linea, acabado)[0].nombre, colorCodigo: undefined }
    }
    if (proyecto.paisFabricacion === 'MX') {
      const primero = coloresMxPara(linea, puedeColoresReservados(usuario))[0]
      if (primero) return { color: primero.color, colorCodigo: primero.codigoBase }
    }
    return { color: coloresPara(linea, acabado)[0].nombre, colorCodigo: undefined }
  }

  function remodular(nuevoClaro = claroCm, nuevaCantidad = cantidad) {
    const tramos = crearTramos(config.tipologia, nuevoClaro, nuevaCantidad, config, proyecto.paisFabricacion)
    setArea({ tramos })
  }

  /**
   * Del paso de medidas al plano. Si el claro o la cantidad ya no son los que
   * está dibujado, se vuelve a modular: mostrarle el dibujo viejo después de
   * cambiar una medida es mentirle. Si no cambió nada se respeta lo que hay,
   * incluidas las piezas que movió a mano.
   */
  /**
   * El reparto que se muestra antes de dibujar. Sale del MISMO buscador que la
   * modulación de verdad, con los orinales incluidos: antes usaba un reparto
   * parejo que ignoraba los orinales, así que prometía medidas que no eran.
   */
  const vistaPrevia = useMemo(() => {
    const previos = crearTramos(config.tipologia, claroCm, cantidad, config, proyecto.paisFabricacion)
    const principal = previos[tipologia(config.tipologia).principal]
    return {
      cabinas: principal?.cabinas ?? [],
      // el mismo aviso que dará el plano, pero antes de dibujarlo: con orinales
      // es fácil pedir más piezas de las que entran en el claro
      cabe: principal?.ajuste !== 'falta' && principal?.ajuste !== 'sobra',
      mensaje: principal?.mensaje ?? '',
    }
  }, [config, claroCm, cantidad, proyecto.paisFabricacion])

  function irAlPlano() {
    const t = area.tramos[tipologia(config.tipologia).principal]
    // en un área de solo orinales el claro lo calcula la app, así que ahí lo
    // que se compara es la cantidad
    const soloOrinales = esSoloOrinales(config.tipologia)
    // se comparan los BAÑOS, no las cabinas: los orinales van aparte y si se
    // contaran acá el plano se daría por viejo siempre y se remodularía solo,
    // borrando lo que ella hubiera movido a mano
    const cambio =
      !t ||
      banosDe(t) !== cantidad ||
      (!soloOrinales && t.claroCm !== claroCm) ||
      t.cabinas.filter((c) => c.tipo === 'orinal').length !== (soloOrinales ? 0 : config.orinales)
    if (cambio) remodular()
    setPaso(7)
  }

  /**
   * Se cambió la puerta de una cabina —del menú o arrastrando su panel—. Las
   * puertas mandan y las pilastras se reacomodan para que la tira siga cerrando
   * contra el claro. Si no hay pilastras que cuadren, se deja lo que había.
   */
  function onPuerta(tramoId: string, indice: number, anchoPuertaCm: number) {
    const t = area.tramos.find((x) => x.id === tramoId)
    if (!t) return
    // La medida que se elige acá queda PEDIDA para el área: si después se vuelve
    // a modular, esa es la puerta y lo que se mueve son las pilastras. La de la
    // cabina accesible se guarda aparte, porque es su propia medida.
    const tipo = t.cabinas[indice]?.tipo
    if (tipo === 'normal') setConfig({ puertaCm: anchoPuertaCm })
    else if (tipo === 'accesible') setConfig({ puertaAccesibleCm: anchoPuertaCm })
    const cabinas = t.cabinas.map((c, i) =>
      i === indice ? { ...c, puerta: { ...c.puerta, anchoCm: anchoPuertaCm } } : c,
    )
    const muros = (t.muroInicio ? 1 : 0) + (t.muroFin ? 1 : 0)
    const r = reajustarConPuertas(
      cabinas, t.claroCm, muros, muros < 2,
      config.tipologia === 'PMR' && llevaAccesible ? anchoAccesibleDe(config) : 0,
    )
    setArea({
      tramos: area.tramos.map((x) =>
        x.id !== tramoId
          ? x
          : r
            ? { ...x, cabinas: r.cabinas, pilastras: r.pilastras, canaletaCm: r.canaletaCm, ajuste: r.ajuste, mensaje: r.mensaje, pilastrasFijas: undefined }
            : { ...x, cabinas, pilastrasFijas: undefined },
      ),
    })
  }

  function onCabinas(tramoId: string, cabinas: Cabina[]) {
    setArea({ tramos: area.tramos.map((t) => (t.id === tramoId ? { ...t, cabinas } : t)) })
  }

  /**
   * Se arrastró una pilastra: se fija SU medida y el buscador reacomoda el
   * resto de la tira con piezas de catálogo, para que siga cuadrando el claro.
   * Arrastrar una interna cambia todas las internas, que es como se modula.
   */
  /**
   * Se arrastró un MINGITORIO. A diferencia del panel de una cabina, que va
   * centrado en su pilastra y arrastrarlo cambia esa pilastra, el mingitorio
   * cambia el ancho del ORINAL que tiene a la izquierda: es la única medida
   * libre de esa parte de la tira.
   *
   * La medida queda pedida en la configuración del área, así que no se pierde
   * al volver a modular: es igual que escribirla en el paso de medidas.
   */
  function onOrinal(tramoId: string, indice: number, cuerpoCm: number) {
    const t = area.tramos.find((x) => x.id === tramoId)
    if (!t || t.cabinas[indice]?.tipo !== 'orinal') return
    if (!Number.isFinite(cuerpoCm)) return
    const ancho = Math.max(30, Math.round(cuerpoCm * 2) / 2)

    // qué número de orinal es dentro de la tira
    const orden = t.cabinas.slice(0, indice + 1).filter((c) => c.tipo === 'orinal').length - 1
    const cuantos = t.cabinas.filter((c) => c.tipo === 'orinal').length
    const anchos = Array.from({ length: cuantos }, (_, k) => config.anchosOrinalCm?.[k] ?? null)
    if (anchos[orden] === ancho) return
    anchos[orden] = ancho

    const muros = (t.muroInicio ? 1 : 0) + (t.muroFin ? 1 : 0)
    const r = modularConCatalogo(
      t.claroCm,
      t.cabinas.length,
      muros,
      muros < 2,
      {
        // las pilastras que ella ya eligió y las puertas no se tocan
        pilastras: Array.from({ length: t.cabinas.length + 1 }, (_, i) =>
          (t.pilastrasFijas ?? []).includes(i) ? (t.pilastras?.[i] ?? null) : null,
        ),
        puerta: config.puertaCm ?? t.cabinas.find((c) => c.tipo === 'normal')?.puerta.anchoCm,
        puertaAccesible:
          config.puertaAccesibleCm ?? t.cabinas.find((c) => c.tipo === 'accesible')?.puerta.anchoCm,
      },
      {
        accesible: llevaAccesible,
        anchoAccesibleMinCm: anchoAccesibleDe(config),
        // el cuarto PMR no negocia su ancho, tampoco al volver a modular
        cuartoPmrCm: config.tipologia === 'PMR' && llevaAccesible ? anchoAccesibleDe(config) : 0,
        mingitorios: cuantos,
        anchoOrinalCm: config.anchoOrinalCm,
        anchosOrinalCm: anchos,
        cierreMingitorio: !t.muroFin && cuantos > 0,
        pais: proyecto.paisFabricacion,
      },
    )
    if (!r) return
    if (r.ajuste === 'falta' && t.ajuste !== 'falta') {
      setBloqueo(
        `Con el orinal de ${ancho} cm las piezas no caben en el claro de ${t.claroCm} cm. ${r.mensaje}. ` +
          'El plano quedó como estaba.',
      )
      return
    }
    setBloqueo(null)
    setConfig({ anchosOrinalCm: anchos })
    setArea({
      tramos: area.tramos.map((x) =>
        x.id === tramoId
          ? { ...x, cabinas: r.cabinas, pilastras: r.pilastras, canaletaCm: r.canaletaCm, ajuste: r.ajuste, mensaje: r.mensaje, avisoAccesible: r.avisoAccesible }
          : x,
      ),
    })
  }

  function onPilastra(tramoId: string, indice: number, anchoCm: number) {
    const t = area.tramos.find((x) => x.id === tramoId)
    if (!t || t.cabinas.length === 0) return
    const extremo = indice === 0 || indice === t.cabinas.length
    const muros = (t.muroInicio ? 1 : 0) + (t.muroFin ? 1 : 0)

    // Las medidas las decide el cliente, así que lo que ya eligió se queda:
    // esta pilastra se suma a la lista y solo se reacomodan las que no tocó.
    // Sin esto, elegir la segunda deshacía la primera y salían emparejadas.
    const elegidas = [...new Set([...(t.pilastrasFijas ?? []), indice])].sort((a, b) => a - b)
    const clavadas = Array.from({ length: t.cabinas.length + 1 }, (_, i) =>
      i === indice ? anchoCm : elegidas.includes(i) ? (t.pilastras?.[i] ?? null) : null,
    )
    const r = modularConCatalogo(
      t.claroCm,
      t.cabinas.length,
      muros,
      muros < 2,
      {
        pilInterna: extremo ? undefined : anchoCm,
        pilExtremo: extremo ? anchoCm : undefined,
        pilastraIndice: indice,
        pilastras: clavadas,
        // las puertas ya elegidas NO se tocan: mover una pilastra mueve pilastras
        puerta: config.puertaCm ?? t.cabinas.find((c) => c.tipo === 'normal')?.puerta.anchoCm,
        puertaAccesible:
          config.puertaAccesibleCm ?? t.cabinas.find((c) => c.tipo === 'accesible')?.puerta.anchoCm,
      },
      {
        accesible: llevaAccesible,
        anchoAccesibleMinCm: anchoAccesibleDe(config),
        // el cuarto PMR no negocia su ancho, tampoco al volver a modular
        cuartoPmrCm: config.tipologia === 'PMR' && llevaAccesible ? anchoAccesibleDe(config) : 0,
        // los orinales de la tira: sin esto el buscador los trata como baños con puerta
        mingitorios: t.cabinas.filter((c) => c.tipo === 'orinal').length,
        anchoOrinalCm: config.anchoOrinalCm,
        anchosOrinalCm: config.anchosOrinalCm,
        cierreMingitorio: !t.muroFin && t.cabinas[t.cabinas.length - 1]?.tipo === 'orinal',
        pais: proyecto.paisFabricacion,
      },
    )
    if (!r) return

    // El claro no se mueve: es la medida del sanitario y la modulación se le
    // adapta. Si con esa pilastra las piezas se pasan, el cambio NO se aplica.
    // La excepción es una tira que ya venía pasada: ahí hay que dejarla tocar
    // las piezas para poder arreglarla.
    if (r.ajuste === 'falta' && t.ajuste !== 'falta') {
      // Cuántas pilastras hay en la tira: una por frontera más las dos de punta.
      const posiciones = t.cabinas.length + 1
      const todasClavadas = elegidas.length >= posiciones
      setBloqueo(
        `Con esa medida las piezas no caben en el claro de ${t.claroCm} cm. ${r.mensaje}. ` +
          'El plano quedó como estaba.' +
          (todasClavadas
            ? ` Tenés las ${posiciones} pilastras elegidas a mano, así que no queda ninguna libre para acomodar: soltalas con el botón de arriba.`
            : elegidas.length > 1
              ? ` Llevás ${elegidas.length} de ${posiciones} pilastras elegidas a mano: soltá alguna para darle juego.`
              : ''),
      )
      return
    }
    setBloqueo(null)
    setArea({
      tramos: area.tramos.map((x) =>
        x.id === tramoId
          ? { ...x, cabinas: r.cabinas, pilastras: r.pilastras, canaletaCm: r.canaletaCm, ajuste: r.ajuste, mensaje: r.mensaje, avisoAccesible: r.avisoAccesible, pilastrasFijas: elegidas }
          : x,
      ),
    })
  }

  /** cuántas pilastras eligió el cliente a mano, para poder soltarlas */
  const pilastrasElegidas = area.tramos.reduce((n, t) => n + (t.pilastrasFijas?.length ?? 0), 0)

  /** Suelta las pilastras elegidas a mano para que el buscador vuelva a mandar. */
  function soltarPilastras() {
    setBloqueo(null)
    setArea({ tramos: area.tramos.map((x) => ({ ...x, pilastrasFijas: undefined })) })
  }

  /**
   * Voltea el área como en un espejo: la última cabina pasa a ser la primera,
   * las puertas cambian de mano y los muros se intercambian. Es lo que hace
   * falta cuando el mismo baño va a la izquierda en un piso y a la derecha en
   * otro, o cuando la cabina accesible tiene que quedar del otro lado.
   *
   * No re-modula: las piezas son las mismas, solo cambian de orden. Así no se
   * pierde ningún ajuste hecho a mano sobre el plano.
   */
  function invertirArea() {
    setArea({
      tramos: area.tramos.map((t) => ({
        ...t,
        // el espejo cambia de lado los muros del tramo: si no, el cierre con
        // mingitorio y las pilastras de punta quedan del lado equivocado
        muroInicio: t.muroFin,
        muroFin: t.muroInicio,
        pilastras: t.pilastras ? [...t.pilastras].reverse() : undefined,
        cabinas: [...t.cabinas].reverse().map((c) => ({
          ...c,
          puerta: { ...c.puerta, mano: c.puerta.mano === 'der' ? 'izq' : 'der' },
        })),
      })),
    })
    const espejo = tipologiaEspejo(config.tipologia)
    if (espejo !== config.tipologia) setConfig({ tipologia: espejo })
  }

  /**
   * Se pasa a otra área. Cada área tiene SU configuración y SU modulación, así
   * que al cambiarla cambian el dibujo y todos los pasos: un proyecto no tiene
   * una sola modulación, tiene varias y distintas.
   *
   * Si el área ya está modulada se abre directo en el plano; si está en blanco,
   * en las medidas, que es lo que le falta.
   */
  function irAlArea(i: number) {
    if (i < 0 || i >= proyecto.areas.length || i === activa) return
    setActiva(i)
    setSeleccion(null)
    setBorrarArea(null)
    const destino = proyecto.areas[i]
    if (destino.tramos.length > 0) setPaso(7)
    else if (paso >= 7) setPaso(PASO_TIPOLOGIA)
  }

  /**
   * Un área más, para modularla distinta. Hereda el producto de la que está
   * abierta —línea, modelo, color, herrajes, alturas— porque en un proyecto es
   * el mismo, y arranca SIN modulación.
   *
   * Cae en TIPOLOGÍA, no en Medidas: lo primero que cambia de un baño a otro es
   * el layout, y de ahí sigue sola al claro y a las cabinas.
   */
  function areaNueva() {
    const i = proyecto.areas.length
    const nueva: Area = {
      id: nuevoId('area'),
      nombre: `Área ${i + 1}`,
      piso: area.piso,
      config: { ...config },
      tramos: [],
    }
    setProyecto((p) => ({ ...p, areas: [...p.areas, nueva] }))
    setActiva(i)
    setSeleccion(null)
    setBorrarArea(null)
    setPaso(PASO_TIPOLOGIA)
  }

  /** Saca un área del proyecto. La última que queda no se puede sacar. */
  function quitarArea(i: number) {
    if (proyecto.areas.length <= 1) return
    setProyecto((p) => ({ ...p, areas: p.areas.filter((_, k) => k !== i) }))
    setActiva((n) => (n > i ? n - 1 : Math.min(n, proyecto.areas.length - 2)))
    setSeleccion(null)
    setBorrarArea(null)
  }

  /**
   * Repite el plano de un área en otras. Se copian las piezas tal como quedaron
   * —incluidas las ediciones hechas a mano— y cada copia estrena identificadores
   * para que después se puedan editar por separado sin arrastrarse entre sí.
   */
  function duplicarArea(filas: { nombre: string; piso: string }[]) {
    const copiasNuevas: Area[] = filas.map((fila) => ({
      id: nuevoId('area'),
      nombre: fila.nombre.trim(),
      piso: fila.piso.trim(),
      config: { ...area.config },
      tramos: area.tramos.map((t) => ({
        ...t,
        id: nuevoId('tramo'),
        pilastras: t.pilastras ? [...t.pilastras] : undefined,
        cabinas: t.cabinas.map((c) => ({
          ...c,
          id: nuevoId('cab'),
          puerta: { ...c.puerta },
          panel: { ...c.panel },
        })),
      })),
    }))
    setProyecto((p) => ({ ...p, areas: [...p.areas, ...copiasNuevas] }))
    setVerDuplicar(false)
  }


  // ---------- cotización ----------
  // los precios salen ya en la moneda elegida: la tabla de tarifas tiene
  // columnas en dólares y en colones, y los modelos usdOnly convierten con el TC
  // se arma POR ÁREA y después se aplana: la cotización muestra qué le toca a
  // cada baño, y el total es el mismo porque son los mismos renglones
  /**
   * Los módulos del pedido: las cabinas de TODAS las áreas. En México los
   * Especiales y la Fórmica cambian de precio a partir de 10, y el corte se
   * mira sobre el proyecto entero, no área por área.
   */
  const modulosDelProyecto = useMemo(
    () => proyecto.areas.reduce((n, a) => n + a.tramos.reduce((m, t) => m + t.cabinas.length, 0), 0),
    [proyecto.areas],
  )

  const renglonesPorArea = useMemo(
    () =>
      proyecto.areas.map((a) => ({
        nombre: a.nombre,
        renglones: bom(a.tramos, a.config, {
          moneda, tipoCambio: TC, tarifas: tarifas?.tabla, pais: proyecto.paisFabricacion,
          modulos: modulosDelProyecto,
        }),
      })),
    [proyecto.areas, proyecto.paisFabricacion, moneda, tarifas, modulosDelProyecto],
  )
  const renglones = useMemo(() => renglonesPorArea.flatMap((a) => a.renglones), [renglonesPorArea])

  // el IVA lo trae el distribuidor; si no, el 13 % de Costa Rica
  const ivaPorcentaje = usuario?.ivaPorcentaje ?? IVA_CR

  /**
   * Los descuentos en cascada. El primero es el de la ficha del distribuidor
   * —no se edita acá, sale de su cuenta— y detrás van los que se agreguen a
   * mano, en orden. Ver `totalesDe`.
   */
  const descuentos = useMemo<Descuento[]>(() => {
    const dist = usuario?.descuento ?? 0
    const propios = proyecto.descuentos ?? []
    return dist > 0
      ? [{ origen: 'distribuidor' as const, etiqueta: 'Descuento distribuidor', pct: dist }, ...propios]
      : propios
  }, [usuario?.descuento, proyecto.descuentos])

  const totales = useMemo(
    () => totalesDe(renglones, descuentos, ivaPorcentaje),
    [renglones, descuentos, ivaPorcentaje],
  )
  const neto = totales.neto
  const descuento = totales.descuento
  const gravable = totales.gravable
  void gravable
  const iva = totales.iva
  const total = totales.total
  const piezasDelPedido = useMemo(() => resumenDePiezas(renglones), [renglones])

  function agregarDescuento() {
    const propios = proyecto.descuentos ?? []
    setProyecto({
      ...proyecto,
      descuentos: [...propios, { origen: 'manual', etiqueta: `Descuento ${propios.length + 1}`, pct: 5 }],
    })
  }

  function cambiarDescuento(i: number, cambio: Partial<Descuento>) {
    const propios = [...(proyecto.descuentos ?? [])]
    if (!propios[i]) return
    propios[i] = { ...propios[i], ...cambio }
    setProyecto({ ...proyecto, descuentos: propios })
  }

  function quitarDescuento(i: number) {
    const propios = (proyecto.descuentos ?? []).filter((_, k) => k !== i)
    setProyecto({ ...proyecto, descuentos: propios })
  }
  // el peso mexicano y el dólar comparten el signo, así que el de México se
  // escribe MX$ para que nadie confunda una cotización con la otra
  const simbolo = moneda === 'CRC' ? '₡' : moneda === 'MXN' ? 'MX$' : '$'

  const money = (v: number) =>
    `${simbolo}${v.toLocaleString('es-CR', { maximumFractionDigits: moneda === 'CRC' ? 0 : 2 })}`


  const proyectoConAutor = { ...proyecto, creadoPor: usuario?.nombre ?? '' }

  /**
   * Baja el plano. Si algo falla al armarlo o al escribirlo hay que DECIRLO: sin
   * esto el error se perdía y quedaba un archivo a medias que no abría.
   */
  async function bajarPDF() {
    try {
      const doc = generarPDF(proyectoConAutor)
      const bytes = new Uint8Array(doc.output('arraybuffer'))
      if (bytes.length < 1000) throw new Error(`el PDF salió vacío (${bytes.length} bytes)`)
      const ruta = await guardarArchivo(nombreArchivoPDF(proyecto), bytes, 'application/pdf', FILTRO_PDF)
      setGuardado(ruta ? `Plano guardado en ${ruta}` : null)
    } catch (e) {
      setGuardado(null)
      setBloqueo(`No se pudo guardar el plano: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  /**
   * Autoriza la cotización de un proyecto guardado y la manda a Odoo.
   *
   * Congela lo que se autoriza: abre el proyecto, arma las piezas con su precio,
   * las guarda como cotización y recién entonces las manda. Si la plata de las
   * piezas no coincide con la de la cotización de pantalla, frena.
   */
  async function autorizarProyecto(p: { proyectoId: number; codigo: string }) {
    const abierto = await abrirProyecto(usuario, p.proyectoId)
    if (!abierto.ok || !abierto.dato) return { ok: false, mensaje: abierto.mensaje }
    const suyo = abierto.dato

    const region = distribuidores.find((d) => d.nombre === suyo.distribuidor)?.region ?? null
    if (region !== 'Costa Rica') {
      return {
        ok: false,
        mensaje: `A Odoo solo va lo de Costa Rica. "${suyo.distribuidor || 'sin distribuidor'}" es de ${region ?? 'región sin definir'}.`,
      }
    }
    const moneda: Moneda = 'CRC'
    const precios = { moneda, tipoCambio: TC, tarifas: tarifas?.tabla, pais: suyo.paisFabricacion }

    const { lineas, faltan } = lineasParaOdoo(suyo, precios)
    if (faltan.length) return { ok: false, mensaje: `No se puede mandar: ${faltan.join(' · ')}` }
    if (!lineas.length) return { ok: false, mensaje: 'El proyecto no tiene piezas que cotizar.' }

    // el mismo cálculo que ve el vendedor en la pantalla de cotización
    const dePantalla = suyo.areas.flatMap((a) => bom(a.tramos, a.config, precios))
    const cuadra = cuadran(lineas, dePantalla)
    if (!cuadra.ok) return { ok: false, mensaje: cuadra.mensaje }

    const config = suyo.areas[0]?.config
    const guardada = await guardarCotizacion(usuario, {
      proyectoId: p.proyectoId,
      numero: suyo.numero,
      distribuidorId: Number(distribuidores.find((d) => d.nombre === suyo.distribuidor)?.distribuidorId) || null,
      moneda,
      tipoCambio: TC,
      descuentoPct: usuario?.descuento ?? 0,
      ivaPct: usuario?.ivaPorcentaje ?? IVA_CR,
      pais: suyo.paisFabricacion,
      modelo: config?.modelo ?? '',
      tier: tierDeColor(config?.color ?? '', suyo.paisFabricacion, config?.linea),
    }, lineas)
    if (!guardada.ok || !guardada.dato) return { ok: false, mensaje: guardada.mensaje }

    const enviada = await autorizarEnOdoo(usuario, guardada.dato.cotizacionId, lineas)
    return { ok: enviada.ok, mensaje: enviada.mensaje }
  }

  async function rechazarProyecto(cotizacionId: number, motivo: string) {
    const r = await rechazarCotizacion(usuario, cotizacionId, motivo)
    return { ok: r.ok, mensaje: r.mensaje }
  }

  async function bajarCSV() {
    const bytes = csvABytes(generarCSV(proyectoConAutor))
    const ruta = await guardarArchivo(nombreArchivoCSV(proyecto), bytes, 'text/csv;charset=utf-8', FILTRO_CSV)
    setGuardado(ruta ? `Orden de compra guardada en ${ruta}` : null)
  }

  /**
   * La cotización en PDF. Son dos hojas distintas:
   *
   *   · distribuidor → con TODOS los descuentos, incluido el de su ficha. Es lo
   *     que él paga.
   *   · cliente      → sin el de la ficha. Es lo que él vende, y el descuento
   *     con el que compra no tiene por qué verlo su cliente.
   */
  async function bajarCotizacion(para: 'distribuidor' | 'cliente') {
    try {
      const doc = generarCotizacionPDF(proyectoConAutor, {
        renglones,
        porArea: renglonesPorArea,
        moneda,
        descuentos,
        para,
        ivaPct: ivaPorcentaje,
        vendedor: usuario?.nombre ?? '',
        // el logo sale de la ficha del distribuidor del proyecto
        logoDistribuidor: distribuidores.find((x) => x.nombre === proyectoConAutor.distribuidor)?.logo ?? null,
      })
      const bytes = new Uint8Array(doc.output('arraybuffer'))
      if (bytes.length < 1000) throw new Error(`el PDF salió vacío (${bytes.length} bytes)`)
      const ruta = await guardarArchivo(
        nombreArchivoCotizacion(proyecto, undefined, para), bytes, 'application/pdf', FILTRO_PDF,
      )
      setGuardado(ruta ? `Cotización del ${para} guardada en ${ruta}` : null)
    } catch (e) {
      setGuardado(null)
      setBloqueo(`No se pudo guardar la cotización: ${e instanceof Error ? e.message : String(e)}`)
    }
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


  const pasosVisibles = PASOS
  /**
   * La cotización es el último paso SIEMPRE. Antes México se quedaba en el 7:
   * no tenía lista de precios y se llevaba plano y orden de compra sin precio.
   * Desde que llegó la lista de la planta de México las dos plantas cotizan.
   */
  const ultimoPaso = 8
  const puedePasar = (n: number) => n <= 6 || area.tramos.length > 0

  return (
    <div className="app" data-tema={tema === 'claro' ? 'claro' : undefined}>
      {capaActualizacion}
      {/*
        Dos filas fijas y no un salto de línea cuando no cabe: arriba quién sos y
        en qué estás, abajo a dónde podés ir. Con ocho botones en una sola fila,
        la barra se veía apretada y el orden no se leía.
      */}
      <header className="topbar">
        <div className="brand">
          <b>Constructor de Planos</b>
          <span title="Versión que estás usando">Modumex · v{version}</span>
        </div>
        <span className="chip">Plano N° {proyecto.numero}</span>
        <span className="chip" title="El área en la que estás trabajando">
          {area.nombre || `Área ${activa + 1}`}
          {proyecto.areas.length > 1 ? ` · ${activa + 1} de ${proyecto.areas.length}` : ''}
        </span>
        <span className="chip">{usuario.nombre} · {usuario.rol}</span>
        {avisoActualizacion && <span className="chip" title={avisoActualizacion}>{avisoActualizacion}</span>}
        <div className="sep" />
        <button
          className="btn plano chico"
          onClick={buscarActualizacionAhora}
          disabled={buscandoActualizacion}
          title="Comprobar si hay una versión más nueva publicada"
        >
          {buscandoActualizacion ? 'Buscando…' : 'Actualizar app'}
        </button>
        <button className="btn plano chico" onClick={() => setUsuario(null)}>Salir</button>
      </header>

      <nav className="barra-nav">
        <button className="btn plano chico" onClick={() => setVerProyectos(true)}>Proyectos</button>
        {puedeDistribuidores(usuario) && (
          <button className="btn plano chico" onClick={() => { void recargarDistribuidores(); setVerDistribuidores(true) }}>Distribuidores</button>
        )}
        {puedeCatalogos(usuario) && (
          <>
            <button className="btn plano chico" onClick={() => setVerAlturas(true)}>Alturas</button>
            <button className="btn plano chico" onClick={() => setVerTarifas(true)}>Precios</button>
          </>
        )}
        {puedePiezas(usuario) && (
          <button className="btn plano chico" onClick={() => setVerPiezas(true)}>Piezas</button>
        )}
        {puedeUsuarios(usuario) && (
          <button className="btn plano chico" onClick={() => setVerUsuarios(true)}>Usuarios</button>
        )}
        {esAdmin(usuario) && (
          <button className="btn plano chico" onClick={() => setVerSolicitudes(true)}>
            Solicitudes{nSolicitudes > 0 ? ` (${nSolicitudes})` : ''}
          </button>
        )}
      </nav>

      {/*
        Las áreas del proyecto. Están acá, fuera del paso, porque un proyecto no
        tiene una sola modulación: tiene varias y distintas, y hay que poder
        pasar de una a otra en cualquier momento para ver o cambiar su dibujo.
      */}
      <nav className="barra-areas">
        <span className="rotulo">Áreas</span>
        {proyecto.areas.map((a, i) => {
          const modulada = a.tramos.reduce((n, t) => n + t.cabinas.length, 0)
          return (
            <span key={a.id} className={`tab-area${i === activa ? ' on' : ''}`}>
              <button
                type="button"
                onClick={() => irAlArea(i)}
                title={modulada > 0 ? `${modulada} cabinas moduladas` : 'Todavía sin modular'}
              >
                {a.nombre || `Área ${i + 1}`}
                <b>{modulada > 0 ? modulada : '—'}</b>
              </button>
              {proyecto.areas.length > 1 && (
                borrarArea === i ? (
                  <>
                    <button type="button" className="si" onClick={() => quitarArea(i)} title="Sí, sacarla del proyecto">Borrar</button>
                    <button type="button" onClick={() => setBorrarArea(null)} title="Dejarla">✕</button>
                  </>
                ) : (
                  <button type="button" onClick={() => setBorrarArea(i)} title="Sacar esta área del proyecto">✕</button>
                )
              )}
            </span>
          )
        })}
        <button className="btn plano chico" onClick={areaNueva} title="Otra área, con el mismo producto y su propia modulación">
          + Área nueva
        </button>
        <div className="sep" />
      </nav>


      {verProyectos && (
        <Proyectos
          usuario={usuario}
          proyecto={proyecto}
          revisionActual={revisionGuardada?.revision ?? null}
          hayCambios={hayCambiosSinGuardar}
          onGuardar={guardarAhora}
          onAbrir={(p, revision) => {
            setProyecto(p)
            // lo que se abre YA está guardado con esa letra: desde acá, la
            // siguiente nace solo si se edita algo
            setRevisionGuardada({ revision, huella: huellaDe(p) })
            setAvisoProyecto(null)
            // el proyecto que llega trae sus propias áreas y su plano ya armado:
            // se vuelve al área uno y al paso del plano, no al principio
            setActiva(0)
            setSeleccion(null)
            setPaso(7)
          }}
          onCambiarNumero={(numero) => setProyecto({ ...proyecto, numero })}
          onAutorizar={autorizarProyecto}
          onRechazar={rechazarProyecto}
          onCerrar={() => setVerProyectos(false)}
        />
      )}

      {verDuplicar && (
        <DuplicarArea base={area} onCrear={duplicarArea} onCerrar={() => setVerDuplicar(false)} />
      )}

      {verDistribuidores && puedeDistribuidores(usuario) && (
        <Distribuidores
          usuario={usuario}
          lista={distribuidores}
          onLista={setDistribuidores}
          onCerrar={() => { setVerDistribuidores(false); void recargarDistribuidores() }}
        />
      )}

      {verAlturas && puedeCatalogos(usuario) && (
        <EditorAlturas
          usuario={usuario}
          tabla={alturasTabla}
          deLaNube={alturasNube}
          onCambio={setAlturasTabla}
          onCerrar={() => setVerAlturas(false)}
        />
      )}

      {verPiezas && puedePiezas(usuario) && (
        <EditorPiezas
          usuario={usuario}
          lista={piezasLista}
          deLaNube={piezasNube}
          onCambio={setPiezasLista}
          onCerrar={() => setVerPiezas(false)}
        />
      )}

      {verUsuarios && puedeUsuarios(usuario) && (
        <Usuarios usuario={usuario} onCerrar={() => setVerUsuarios(false)} />
      )}

      {verSolicitudes && esAdmin(usuario) && (
        <Solicitudes
          usuario={usuario}
          distribuidores={distribuidores}
          onResuelta={() => void contarSolicitudes(usuario).then(setNSolicitudes)}
          onCerrar={() => setVerSolicitudes(false)}
        />
      )}

      {verTarifas && puedeCatalogos(usuario) && (
        <EditorTarifas
          usuario={usuario}
          tabla={tarifas?.tabla ?? TARIFAS_RESPALDO}
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
              onClick={() => {
                // lo mismo que el botón Siguiente: primero los datos del proyecto
                if (p.n > 1 && faltanDatos.length > 0) {
                  setAvisoDatos(true)
                  setPaso(1)
                  return
                }
                setPaso(p.n)
              }}
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
                <button className="btn chico" onClick={invertirArea} title="Voltea el área como en un espejo">⇄ Invertir</button>
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
                <button className="btn chico" onClick={() => setVerDuplicar(true)}>Repetir en otras áreas</button>
                <div className="div" />
                <button className="btn chico" onClick={bajarPDF}>Plano en PDF</button>
                <button className="btn chico" onClick={bajarCSV}>CSV para el CIP</button>
                <div className="div" />
                <span className="chip on">Arrastrá los paneles · clic derecho en una pieza</span>
                {pilastrasElegidas > 0 && (
                  <>
                    <div className="div" />
                    <button className="btn chico" onClick={soltarPilastras} title="Vuelve a dejar que el buscador elija las pilastras">
                      ↺ Soltar {pilastrasElegidas} pilastra{pilastrasElegidas === 1 ? '' : 's'}
                    </button>
                  </>
                )}
                <div className="sep" style={{ flex: 1 }} />
              </div>

              {bloqueo && (
                <div className="aviso-caja" style={{ margin: '0 0 12px' }}>
                  <b>El claro manda: ese cambio no se aplicó</b>
                  <span>{bloqueo}</span>
                </div>
              )}

              {tramosConProblema.length > 0 && (
                <div className={`aviso-caja ${tramosConProblema.some((t) => t.ajuste === 'canaleta') && !tramosConProblema.some((t) => t.ajuste !== 'canaleta') ? 'ok' : ''}`} style={{ margin: '0 0 12px' }}>
                  <b>
                    {tramosConProblema.some((t) => t.ajuste === 'falta')
                      ? 'Las piezas no caben en el claro'
                      : tramosConProblema.some((t) => t.ajuste === 'sobra')
                        ? 'Queda un hueco que la canaleta no rellena'
                        : 'Cierra con canaleta'}
                  </b>
                  {tramosConProblema.map((t) => (
                    <span key={t.id}>
                      {t.nombre}: {t.mensaje}
                      {(t.pilastrasFijas?.length ?? 0) > 0 &&
                        ` · Entre las ${(t.pilastras?.length ?? 0)} pilastras hay que repartir ${sumaPilastras(t).toFixed(1)} cm`}
                    </span>
                  ))}
                </div>
              )}

              {avisosAccesible.length > 0 && (
                <div className="aviso-caja" style={{ margin: '0 0 12px' }}>
                  <b>La cabina accesible no llega a su ancho</b>
                  {avisosAccesible.map((t) => (
                    <span key={t.id}>{t.avisoAccesible}</span>
                  ))}
                </div>
              )}

              <div className="editor">
                <div className="lienzo-wrap">
                  <EditorPlano
                    tramos={area.tramos}
                    config={config}
                    pais={proyecto.paisFabricacion}
                    unidad={unidad}
                    verInodoros={verInodoros}
                    verCotas={verCotas}
                    seleccion={seleccion}
                    onSeleccion={setSeleccion}
                    onCabinas={onCabinas}
                    onPilastra={onPilastra}
                    onOrinal={onOrinal}
                    onPuerta={onPuerta}
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
                            {c.puerta.tipo === 'puerta' && c.tipo !== 'orinal' ? ` / PT${c.puerta.anchoCm}` : ''}
                            {/* la cabina se lleva media pilastra de cada lado: el orinal mide menos */}
                            {c.tipo === 'orinal' ? ` / orinal ${anchoDeOrinal(t, i, config.anchoPilastraCm)}` : ''}
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
                      </button>
                    ))}
                  </div>

                  {avisoDatos && faltanDatos.length > 0 && (
                    <div className="aviso-caja" style={{ maxWidth: 720, marginBottom: 16 }}>
                      <b>Falta llenar {faltanDatos.length === 1 ? 'un dato' : 'estos datos'}</b>
                      <span>
                        {faltanDatos.join(', ')}. Sin esto el plano sale con el cajetín a medias y la orden no
                        se puede rastrear.
                      </span>
                    </div>
                  )}

                  <div className="campos">
                    <div className={`campo${avisoDatos && !proyecto.numero.trim() ? ' falta' : ''}`}>
                      <label>N° de plano</label>
                      <input value={proyecto.numero} onChange={(e) => setProyecto({ ...proyecto, numero: e.target.value })} />
                    </div>
                    <div className={`campo${avisoDatos && !proyecto.obra.trim() ? ' falta' : ''}`}>
                      <label>Obra</label>
                      <input value={proyecto.obra} onChange={(e) => setProyecto({ ...proyecto, obra: e.target.value })} />
                    </div>
                    <div className="campo">
                      <label>Cliente</label>
                      <input value={proyecto.cliente} onChange={(e) => setProyecto({ ...proyecto, cliente: e.target.value })} />
                    </div>
                    <div className={`campo${avisoDatos && !proyecto.ubicacion.trim() ? ' falta' : ''}`}>
                      <label>Ubicación</label>
                      <input value={proyecto.ubicacion} onChange={(e) => setProyecto({ ...proyecto, ubicacion: e.target.value })} />
                    </div>
                    <div className={`campo${avisoDatos && !(proyecto.distribuidor || usuario.distribuidorNombre || '').trim() ? ' falta' : ''}`}>
                      <label>Distribuidor</label>
                      {usuario.rol === 'Distribuidor' ? (
                        // un distribuidor no elige: sus planos salen a su nombre
                        <div className="fijo">{proyecto.distribuidor || usuario.distribuidorNombre || '—'}</div>
                      ) : (
                      <select value={proyecto.distribuidor} onChange={(e) => setProyecto({ ...proyecto, distribuidor: e.target.value })}>
                        <option value="">—</option>
                        {/* uno que ya no esté activo sigue apareciendo si el proyecto es suyo,
                            para no borrarle el cajetín a un plano viejo */}
                        {distribuidores
                          .filter((x) => x.activo || x.nombre === proyecto.distribuidor)
                          .map((x) => (
                            <option key={x.distribuidorId} value={x.nombre}>{x.nombre}</option>
                          ))}
                        {proyecto.distribuidor !== '' &&
                          !distribuidores.some((x) => x.nombre === proyecto.distribuidor) && (
                            <option value={proyecto.distribuidor}>{proyecto.distribuidor} (ya no está en la lista)</option>
                          )}
                      </select>
                      )}
                      {usuario.rol !== 'Distribuidor' && distribuidores.length === 0 && (
                        <span className="ayuda">
                          {puedeDistribuidores(usuario)
                            ? 'Todavía no hay ninguno: dalos de alta con el botón Distribuidores de arriba.'
                            : 'Todavía no hay ninguno dado de alta.'}
                        </span>
                      )}
                      {regionDistribuidor && (
                        <span className="ayuda">
                          {regionDistribuidor === 'México'
                            ? 'Cotiza en pesos mexicanos.'
                            : regionDistribuidor === 'Costa Rica'
                              ? 'Cotiza en colones.'
                              : 'Cotiza en dólares.'}
                        </span>
                      )}
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
                    {acabadosPara(config.linea, config.modelo, proyecto.paisFabricacion).map((a) => (
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

                  {/* El esmaltado y el acero no llevan color: el acabado ES el color,
                      así que no hay lista que elegir. */}
                  {acabadoEsElColor(config.acabado) ? (
                    <div className="aviso-caja" style={{ maxWidth: 720, marginTop: 24 }}>
                      <b>Este acabado es su propio color</b>
                      <span>
                        {config.acabado} no lleva color de lámina: el área queda en{' '}
                        {coloresPara(config.linea, config.acabado)[0]?.nombre ?? config.color}.
                      </span>
                    </div>
                  ) : proyecto.paisFabricacion === 'MX' ? (
                    <ColoresMexico
                      linea={config.linea}
                      color={config.color}
                      verReservados={puedeColoresReservados(usuario)}
                      onElegir={(c) =>
                        setConfig({ color: c.color, colorCodigo: c.codigoBase })
                      }
                    />
                  ) : (
                    <>
                      <h4 style={{ margin: '28px 0 10px', color: 'var(--text-2)' }}>
                        Color · {etiquetaTier(tierDeColor(config.color, proyecto.paisFabricacion, config.linea))}
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
                        value={tierDeColor(config.color, proyecto.paisFabricacion, config.linea) === 'especial' ? config.color : ''}
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
                        onClick={() => {
                          // el cuarto accesible ES la tipología PMR: elegirla ya responde
                          // que sí lleva accesible, sin tener que preguntarlo dos veces
                          const tipologiaId = t.id as TipologiaId
                          setConfig(tipologiaId === 'PMR' ? { tipologia: tipologiaId, llevaAccesible: true } : { tipologia: tipologiaId })
                          setArea({ tramos: [] })
                        }}
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
                    {/* En un campo de solo orinales el claro NO se pide: lo define la
                        cantidad y su ancho, porque la tira no lleva pilastras que
                        puedan absorber una diferencia. Pedirlo era engañoso: lo que
                        se escribía ahí se descartaba. */}
                    {esSoloOrinales(config.tipologia) ? (
                      <div className="campo">
                        <label>Claro que ocupa</label>
                        <div className="reparto">{claroOrinalesCm.toFixed(2)} cm</div>
                        <span className="ayuda">Lo calcula la app: {nOrinales} × {config.anchoOrinalCm ?? 60} + mamparas + muros</span>
                      </div>
                    ) : (
                    <div className="campo">
                      <label>Claro disponible (cm)</label>
                      <CampoNumero value={claroCm} onChange={setClaroCm} min={30} max={3000} />
                      <span className="ayuda">Medida de pared a pared del tramo principal</span>
                    </div>
                    )}
                    <div className="campo">
                      {/* en un área de solo orinales lo que se cuenta son mingitorios:
                          no hay cabinas, y llamarlas así fue lo que confundió */}
                      <label>{esSoloOrinales(config.tipologia) ? 'Cantidad de orinales' : 'Cantidad de cabinas'}</label>
                      <select value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))}>
                        {CANTIDADES.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      {esSoloOrinales(config.tipologia) && (
                        <span className="ayuda">
                          {config.tipologia === 'ORINALES'
                            ? `Lleva ${cantidad} mamparas: una entre cada par y otra que cierra la punta`
                            : `Lleva ${Math.max(0, cantidad - 1)} mamparas, solo entre orinal y orinal`}
                        </span>
                      )}
                    </div>
                    {/* la profundidad de cabina no aplica sin cabinas: el fondo de la
                        tira lo da la mampara, que se elige más abajo */}
                    {!esSoloOrinales(config.tipologia) && (
                    <div className="campo">
                      <label>Profundidad de cabina (cm)</label>
                      <select value={config.profundidadCm} onChange={(e) => setConfig({ profundidadCm: Number(e.target.value) })}>
                        {panelesDelModelo.map((a) => (
                          <option key={a} value={a}>{a}{esEspecial('PN', a, config.modelo) ? ' · especial' : ''}</option>
                        ))}
                      </select>
                      <span className="ayuda">Es el ancho del panel divisor. Las marcadas como especiales no son de ficha: se cobran como la medida de arriba</span>
                    </div>
                    )}
                    {/*
                      En un cuarto PMR la accesible no se pregunta: el cuarto ES la
                      accesible. Y no lleva "ancho de la accesible" sino el ancho del
                      cuarto más la profundidad del lugar, porque se modula a lo ancho
                      y a lo hondo.
                      En un área de solo orinales tampoco: no hay cabinas que hacer
                      accesibles.
                    */}
                    {!esPmrCuarto && !esSoloOrinales(config.tipologia) && (
                      <>
                        <div className="campo">
                          <label>¿Lleva cabina accesible?</label>
                          <select value={llevaAccesible ? 'si' : 'no'} onChange={(e) => setConfig({ llevaAccesible: e.target.value === 'si' })}>
                            <option value="no">No</option>
                            <option value="si">Sí</option>
                          </select>
                        </div>
                        {llevaAccesible && (
                          <div className="campo">
                            <label>Ancho de la accesible (cm)</label>
                            <CampoNumero
                              value={config.anchoAccesibleCm}
                              onChange={(n) => setConfig({ anchoAccesibleCm: n })}
                              min={100} max={300}
                            />
                            <span className="ayuda">Se respeta al modular</span>
                          </div>
                        )}
                      </>
                    )}
                    {esPmrCuarto && (
                      <>
                        <div className="campo">
                          <label>Ancho del cuarto PMR (cm)</label>
                          <CampoNumero
                            value={config.anchoPmrCuartoCm ?? 162}
                            onChange={(n) => setConfig({ anchoPmrCuartoCm: n })}
                            min={100} max={400}
                          />
                          <span className="ayuda">Lo que el cuarto ocupa del claro</span>
                        </div>
                        <div className="campo">
                          <label>Profundidad del lugar (cm)</label>
                          <CampoNumero
                            value={config.profundidadLugarCm ?? config.profundidadCm}
                            onChange={(n) => setConfig({ profundidadLugarCm: n })}
                            min={config.profundidadCm} max={600}
                          />
                          <span className="ayuda">Hasta el fondo del baño, no de la cabina: el divisor llega hasta ahí</span>
                        </div>
                        <div className="campo">
                          <label>Divisor del cuarto</label>
                          <div className="reparto">
                            panel {divisorPmr.panel} + puerta {divisorPmr.puerta}
                            {divisorPmr.pilastra > 0 && ` + pilastra ${divisorPmr.pilastra}`}
                            {' = '}{divisorPmr.panel + divisorPmr.puerta + divisorPmr.pilastra} cm
                          </div>
                          <span className="ayuda">
                            El panel es el mismo de las demás cabinas. Lo que sobra del fondo lo cubren la puerta y una
                            pilastra contra el muro.
                          </span>
                        </div>
                        {divisorPmr.sobra < 0 && (
                          <div className="campo">
                            <span className="aviso-inline">
                              El panel de {divisorPmr.panel} y la puerta de {divisorPmr.puerta} se pasan{' '}
                              {Math.abs(divisorPmr.sobra)} cm del fondo: subí la profundidad del lugar o achicá la puerta.
                            </span>
                          </div>
                        )}
                        {divisorPmr.sobra === 0 && (
                          <div className="campo">
                            <span className="aviso-inline">
                              El panel de {divisorPmr.panel} y la puerta de {divisorPmr.puerta} cierran justo los{' '}
                              {profLugar} cm y no queda pilastra. La puerta del cuarto cuelga de la pilastra, nunca de
                              un panel: achicá la puerta o subí la profundidad del lugar.
                            </span>
                          </div>
                        )}
                        {divisorPmr.sobra > 0 && divisorPmr.pilastra !== divisorPmr.sobra && (
                          <div className="campo">
                            <span className="aviso-inline">
                              {divisorPmr.pilastra === 0
                                ? `Sobran ${divisorPmr.sobra} cm y la pilastra más chica del catálogo es de ${ANCHOS_PILASTRA[0]}.`
                                : `La pilastra más cercana es de ${divisorPmr.pilastra} cm y el hueco es de ${divisorPmr.sobra}.`}
                            </span>
                          </div>
                        )}
                        <div className="campo">
                          <label>Cómo cierra el cuarto</label>
                          <select
                            value={config.cierrePmr ?? 'muros'}
                            onChange={(e) => setConfig({ cierrePmr: e.target.value as 'muros' | 'panel' })}
                          >
                            <option value="muros">Con muro (P+)</option>
                            <option value="panel">Con panel (PP)</option>
                          </select>
                          <span className="ayuda">Del lado opuesto al muro del cuarto</span>
                        </div>
                      </>
                    )}
                    {/* La pregunta es para las tipologías con cabinas, donde los
                        orinales van APARTE, a un costado. En un área de solo
                        orinales no tiene sentido —todo son orinales— y dejarla
                        visible fue lo que escondió las medidas de la mampara. */}
                    {!esSoloOrinales(config.tipologia) && (
                    <div className="campo">
                      <label>¿Lleva orinales?</label>
                      <select
                        value={config.orinales > 0 ? 'si' : 'no'}
                        onChange={(e) => setConfig({ orinales: e.target.value === 'si' ? Math.max(1, config.orinales) : 0 })}
                      >
                        <option value="no">No</option>
                        <option value="si">Sí</option>
                      </select>
                    </div>
                    )}
                    {(config.orinales > 0 || esSoloOrinales(config.tipologia)) && (
                      <>
                        {!esSoloOrinales(config.tipologia) && (
                        <div className="campo">
                          <label>Cantidad de orinales</label>
                          <select value={config.orinales} onChange={(e) => setConfig({ orinales: Number(e.target.value) })}>
                            {CANTIDADES.map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                          <span className="ayuda">{config.orinales > 1 ? `Lleva ${config.orinales - 1} divisores` : 'Sin divisores'}</span>
                        </div>
                        )}
                        <div className="campo">
                          <label>Ancho de cada orinal (cm)</label>
                          <CampoNumero
                            value={config.anchoOrinalCm ?? 60}
                            onChange={(n) => setConfig({ anchoOrinalCm: n, anchosOrinalCm: undefined })}
                            min={30} max={120}
                          />
                          <span className="ayuda">Lo normal son 60; vale para todos</span>
                        </div>
                        {/*
                          Lo que se elige una por una son las MAMPARAS, que es lo que
                          se fabrica: el hueco que queda entre ellas no es una pieza.
                          La que quede en "la general" toma la medida del selector de
                          abajo. Antes acá iban los anchos de cada orinal, que no le
                          interesan a nadie y además dejaban meter números negativos.
                        */}
                        {nMamparas > 0 && (
                        <div className="campo" style={{ gridColumn: '1 / -1' }}>
                          <label>Mampara entre cada orinal</label>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {Array.from({ length: nMamparas }, (_, i) => (
                              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                <span className="ayuda">
                                  {i === nMamparas - 1 && config.tipologia === 'ORINALES'
                                    ? 'Cierre'
                                    : `Mampara ${i + 1}`}
                                </span>
                                <select
                                  style={{ width: 118 }}
                                  value={config.mamparasMG?.[i] ?? ''}
                                  onChange={(e) => {
                                    const lista = Array.from(
                                      { length: nMamparas },
                                      (_, k) => config.mamparasMG?.[k] ?? null,
                                    )
                                    lista[i] = e.target.value === '' ? null : e.target.value
                                    setConfig({ mamparasMG: lista.some((x) => x != null) ? lista : undefined })
                                  }}
                                >
                                  <option value="">La general</option>
                                  {mgDeLaLinea.map((m) => (
                                    <option key={`${m.anchoCm}x${m.altoCm}`} value={`${m.anchoCm}x${m.altoCm}`}>
                                      {m.anchoCm} × {m.altoCm}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ))}
                          </div>
                          <span className="ayuda">
                            {config.mamparasMG?.some((x) => x != null)
                              ? 'Cada una va con la medida que le pediste; el resto usa la general'
                              : 'Todas van con la medida general; cambiá solo las que lleven otra'}
                          </span>
                        </div>
                        )}
                        <div className="campo">
                          <label>Mampara general (para todas)</label>
                          <select
                            value={`${config.mgAnchoCm ?? 60}x${config.mgAlturaCm}`}
                            onChange={(e) => {
                              const [ancho, alto] = e.target.value.split('x').map(Number)
                              setConfig({ mgAnchoCm: ancho, mgAlturaCm: alto })
                            }}
                          >
                            {mgDeLaLinea.map((m) => (
                              <option key={`${m.anchoCm}x${m.altoCm}`} value={`${m.anchoCm}x${m.altoCm}`}>
                                {m.anchoCm} × {m.altoCm}
                              </option>
                            ))}
                          </select>
                          <span className="ayuda">Fondo × alto; solo las que fabrica {config.linea === 'SUPERIOR' ? 'Superior 2.0' : config.linea === 'TOUCHLESS' ? 'Touchless S3' : 'LEEDER'}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="aviso-caja" style={{ marginTop: 22, maxWidth: 620 }}>
                    <b>Vista previa del reparto</b>
                    <span className="num">
                      {vistaPrevia.cabinas.map((c) => `${c.anchoCm}${c.tipo === 'orinal' ? " orinal" : ""}`).join('  ·  ')} cm
                    </span>
                    {!vistaPrevia.cabe && (
                      <span className="aviso-inline">
                        {vistaPrevia.mensaje} — subí el claro o bajá una pieza antes de dibujar.
                      </span>
                    )}
                  </div>
                </>
              )}

              {paso === 8 && (
                <>
                  <h2>Cotización y pedido</h2>
                  <p className="sub">
                    Precio armado desde las piezas del plano.
                  </p>

                  <div className={`aviso-caja ${tarifas?.deLaNube ? 'ok' : ''}`} style={{ maxWidth: 720, marginBottom: 16 }}>
                    <b>
                      {tarifas?.deLaNube
                        ? `Tarifas de la tabla tarifa_m2 · ${tarifas.filas} filas`
                        : 'Tarifas de respaldo'}
                    </b>
                    <span>
                      {tarifas?.deLaNube
                        ? `Precio por m² de ${nombreModelo(config.linea, config.modelo)} (${config.modelo}), color de tier ${etiquetaTier(tierDeColor(config.color, proyecto.paisFabricacion, config.linea))}, en ${nombreMoneda(moneda).toLowerCase()}${moneda === 'MXN' ? ` · ${modulosDelProyecto} módulo(s) en el proyecto` : ''}.`
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
                        {renglonesPorArea.map((a, ia) => (
                          <Fragment key={`area-${ia}`}>
                            {/* con una sola área el rótulo no aporta nada */}
                            {renglonesPorArea.length > 1 && a.renglones.length > 0 && (
                              <tr>
                                <td colSpan={5} style={{ fontWeight: 700, paddingTop: 14 }}>{a.nombre}</td>
                                <td className="der" style={{ fontWeight: 700, paddingTop: 14 }}>
                                  {money(a.renglones.reduce((t, r) => t + r.cantidad * r.precioUnit, 0))}
                                </td>
                              </tr>
                            )}
                            {a.renglones.map((r, i) => (
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
                          </Fragment>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr><td colSpan={5}>Neto</td><td className="der">{money(neto)}</td></tr>
                        {/* la cascada: cada descuento muerde lo que dejó el anterior */}
                        {totales.pasos.map((p, i) => (
                          <Fragment key={`paso-${i}`}>
                            <tr><td colSpan={5}>{p.etiqueta} {p.pct}%</td><td className="der">−{money(p.monta)}</td></tr>
                            <tr><td colSpan={5} style={{ color: 'var(--text-2)' }}>Subtotal</td><td className="der">{money(p.subtotal)}</td></tr>
                          </Fragment>
                        ))}
                        <tr><td colSpan={5}>IVA {ivaPorcentaje}%</td><td className="der">{money(iva)}</td></tr>
                        <tr><td colSpan={5}>Total</td><td className="der">{money(total)}</td></tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* ---------- descuentos en cascada ---------- */}
                  <div style={{ margin: '22px 0 0', maxWidth: 720 }}>
                    <h4 style={{ margin: '0 0 4px' }}>
                      Descuentos <span className="num">· se aplican en cascada, uno sobre lo que dejó el anterior</span>
                    </h4>
                    {(usuario.descuento ?? 0) > 0 && (
                      <p className="sub" style={{ margin: '0 0 8px' }}>
                        El de tu ficha de distribuidor ({usuario.descuento}%) va siempre primero y no se edita acá.
                        Es el único que NO sale en la cotización del cliente.
                      </p>
                    )}
                    {(proyecto.descuentos ?? []).map((d, i) => (
                      <div key={`desc-${i}`} className="campos" style={{ alignItems: 'flex-end', marginBottom: 6 }}>
                        <label className="campo" style={{ flex: '1 1 240px' }}>
                          <span>Concepto</span>
                          <input
                            value={d.etiqueta}
                            onChange={(e) => cambiarDescuento(i, { etiqueta: e.target.value })}
                          />
                        </label>
                        <label className="campo" style={{ width: 110 }}>
                          <span>%</span>
                          <input
                            className="celda-precio num" type="number" min={0} max={100} step="0.5"
                            value={d.pct}
                            onChange={(e) => cambiarDescuento(i, { pct: Number(e.target.value) || 0 })}
                          />
                        </label>
                        <button className="btn" style={{ flex: "0 0 auto" }} onClick={() => quitarDescuento(i)}>Quitar</button>
                      </div>
                    ))}
                    <button className="btn plano chico" onClick={agregarDescuento}>+ Agregar descuento</button>
                    {descuentos.length > 0 && (
                      <p className="sub" style={{ marginTop: 8 }}>
                        En total se descuenta {money(descuento)} sobre {money(neto)}
                        {totales.pasos.length > 1 && ' — en cascada, no es la suma de los porcentajes'}.
                      </p>
                    )}
                  </div>

                  {/* ---------- cuántas piezas lleva el pedido ---------- */}
                  {piezasDelPedido.length > 0 && (
                    <div className="tabla-wrap" style={{ marginTop: 18, maxWidth: 360 }}>
                      <table>
                        <thead>
                          <tr><th>Piezas del pedido</th><th className="der">Cant.</th></tr>
                        </thead>
                        <tbody>
                          {piezasDelPedido.map((p) => (
                            <tr key={p.tipo}>
                              <td>{p.tipo}</td>
                              <td className="der num">{p.cantidad}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td style={{ fontWeight: 700 }}>Total de piezas</td>
                            <td className="der num" style={{ fontWeight: 700 }}>
                              {piezasDelPedido.reduce((t, p) => t + p.cantidad, 0)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 22, alignItems: 'flex-end', margin: '24px 0 20px', flexWrap: 'wrap' }}>
                    <div className="total-grande">
                      <span>Total</span>
                      <b>{money(total)}</b>
                    </div>
                    {monedaFija ? (
                      <div>
                        <span className="chip on">{nombreMoneda(monedaFija)}</span>
                        <div className="ayuda" style={{ marginTop: 6 }}>
                          La moneda la manda la región del distribuidor:{' '}
                          {regionDistribuidor === 'Costa Rica'
                            ? 'Costa Rica factura en colones.'
                            : 'fuera de Costa Rica se factura en dólares.'}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="pildoras">
                          <button className={`pildora ${moneda === 'CRC' ? 'on' : ''}`} onClick={() => setMoneda('CRC')} type="button">Colones</button>
                          <button className={`pildora ${moneda === 'USD' ? 'on' : ''}`} onClick={() => setMoneda('USD')} type="button">Dólares</button>
                        </div>
                        <div className="ayuda" style={{ marginTop: 6 }}>
                          Elegí el distribuidor en el paso 1 y la moneda queda fija por su región.
                        </div>
                      </div>
                    )}
                  </div>


                  <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                    <button className="btn primario" onClick={() => void guardarAhora()} disabled={guardandoProyecto}>
                      {guardandoProyecto ? 'Guardando…' : 'Guardar proyecto'}
                    </button>
                    <button className="btn" onClick={() => void bajarCotizacion('distribuidor')}>
                      Cotización distribuidor
                    </button>
                    <button className="btn" onClick={() => void bajarCotizacion('cliente')}>
                      Cotización cliente
                    </button>
                    <button className="btn" onClick={bajarPDF}>Plano en PDF</button>
                    <button className="btn" onClick={bajarCSV}>CSV para el CIP</button>
                  </div>

                  {avisoProyecto && (
                    <div className={`aviso-caja ${avisoProyecto.ok ? 'ok' : ''}`} style={{ marginTop: 16, maxWidth: 720 }}>
                      <b>{avisoProyecto.ok ? 'Proyecto guardado' : 'No se guardó'}</b>
                      <span>{avisoProyecto.mensaje}</span>
                    </div>
                  )}

                  <div className="aviso-caja" style={{ marginTop: 16, maxWidth: 720 }}>
                    <b>Qué lleva cada archivo</b>
                    <span>
                      La <b>cotización</b> es la que se le pasa al cliente: los renglones con su precio, el total y las
                      condiciones. El <b>plano</b> trae una hoja por área a escala, con las cotas, el cuadro de piezas y
                      el cajetín. El <b>CSV</b> es el que se arrastra a la pestaña Capturar del CIP: mismas columnas y
                      mismo SKU largo que emite el Constructor de hoy.
                    </span>
                  </div>

                  {guardado && (
                    <div className="aviso-caja ok" style={{ marginTop: 16, maxWidth: 720 }}>
                      <b>Archivo guardado</b>
                      <span className="num" style={{ fontSize: 12.5 }}>{guardado}</span>
                    </div>
                  )}


                </>
              )}
            </div>
          )}

          <div className="barra-pie">
            <button className="btn" onClick={() => setPaso(Math.max(1, paso - 1))} disabled={paso === 1}>← Atrás</button>
            <span className="cuenta">Paso {paso} de {ultimoPaso}</span>
            <div className="sep" />
            {/* Acá vivía "Aplicar reparto", que llamaba a remodular() sin preguntar
                nada y por lo tanto BORRABA los ajustes hechos a mano sobre el plano,
                aunque no hubiera cambiado ninguna medida. No hacía falta: la vista
                previa del reparto ya se recalcula sola con cada cambio, y "Dibujar el
                plano" vuelve a modular solo cuando el claro o la cantidad dejaron de
                coincidir con lo dibujado. */}
            {paso < ultimoPaso ? (
              <button
                className="btn primario"
                onClick={() => {
                  // del paso 1 no se sale con datos del proyecto en blanco
                  if (paso === 1 && faltanDatos.length > 0) {
                    setAvisoDatos(true)
                    return
                  }
                  if (paso === 6) irAlPlano()
                  else setPaso(paso + 1)
                }}
              >
                {paso === 6 ? 'Dibujar el plano →' : 'Siguiente →'}
              </button>
            ) : paso === 8 ? (
              <>
                {/* Empezar otro proyecto es lo último que se hace en la pantalla,
                    así que vive acá abajo y no arriba entre los de exportar. */}
                <button
                  className="btn"
                  onClick={() => void empezarProyectoNuevo()}
                  disabled={guardandoProyecto}
                  title="Guarda lo que falte y arranca un proyecto en blanco"
                >
                  {guardandoProyecto ? 'Guardando…' : '+ Proyecto nuevo'}
                </button>
                <button className="btn primario" onClick={() => setPaso(7)}>Volver al plano</button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
