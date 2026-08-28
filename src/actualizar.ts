/**
 * Actualización automática de la aplicación de escritorio.
 *
 * Al abrir, la app consulta si hay una versión más nueva publicada y, si el
 * usuario acepta, la descarga, la instala y se reinicia sola.
 *
 * Mientras eso ocurre la app queda bloqueada a propósito: nadie debe poder
 * empezar un plano que se va a perder cuando la aplicación se reinicie. Por eso
 * `buscarActualizacion` va informando en qué va, y la pantalla tapa todo.
 *
 * Los plugins se cargan con import dinámico, igual que en `exportar/guardar`,
 * para que la versión web no arrastre nada de escritorio en su bundle.
 */

import { enEscritorio } from './exportar/guardar'

export type FaseActualizacion =
  | { fase: 'descargando'; version: string; porcentaje: number | null }
  | { fase: 'instalando'; version: string }

/** qué pasó al consultar; lo usa el botón "Buscar actualizaciones" para poder decirlo */
export type ResultadoBusqueda =
  | { tipo: 'al-dia' }
  | { tipo: 'rechazada'; version: string }
  | { tipo: 'instalando' }
  | { tipo: 'solo-escritorio' }
  | { tipo: 'error'; mensaje: string }

export async function buscarActualizacion(
  alCambiar: (estado: FaseActualizacion | null) => void,
): Promise<ResultadoBusqueda> {
  if (!enEscritorio()) return { tipo: 'solo-escritorio' }

  try {
    const [{ check }, { ask }, { relaunch }] = await Promise.all([
      import('@tauri-apps/plugin-updater'),
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-process'),
    ])

    const nueva = await check()
    if (!nueva) return { tipo: 'al-dia' }

    const instalar = await ask(
      `Hay una versión nueva del Constructor de Planos (${nueva.version}).\n\n` +
        '¿Quieres instalarla ahora? La aplicación se reiniciará al terminar.',
      {
        title: 'Actualización disponible',
        kind: 'info',
        okLabel: 'Instalar',
        cancelLabel: 'Ahora no',
      },
    )
    if (!instalar) return { tipo: 'rechazada', version: nueva.version }

    // A partir de aquí la app queda tapada hasta que se reinicie sola.
    alCambiar({ fase: 'descargando', version: nueva.version, porcentaje: null })

    let total = 0
    let bajado = 0
    await nueva.downloadAndInstall((ev) => {
      if (ev.event === 'Started') {
        total = ev.data.contentLength ?? 0
        alCambiar({ fase: 'descargando', version: nueva.version, porcentaje: total ? 0 : null })
      } else if (ev.event === 'Progress') {
        bajado += ev.data.chunkLength
        const porcentaje = total ? Math.min(100, Math.round((bajado / total) * 100)) : null
        alCambiar({ fase: 'descargando', version: nueva.version, porcentaje })
      } else if (ev.event === 'Finished') {
        alCambiar({ fase: 'instalando', version: nueva.version })
      }
    })

    await relaunch()
    return { tipo: 'instalando' }
  } catch (e) {
    // Sin internet, o si la descarga se cae a medias, se destapa la app y se
    // sigue usando la versión ya instalada en vez de dejarla trabada.
    alCambiar(null)
    const mensaje = e instanceof Error ? e.message : String(e)
    console.warn('No se pudo comprobar o instalar la actualización:', e)
    return { tipo: 'error', mensaje }
  }
}
