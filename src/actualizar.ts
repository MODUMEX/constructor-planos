/**
 * Actualización automática de la aplicación de escritorio.
 *
 * Al abrir, la app consulta si hay una versión más nueva publicada y, si el
 * usuario acepta, la descarga, la instala y se reinicia sola.
 *
 * Los plugins se cargan con import dinámico, igual que en `exportar/guardar`,
 * para que la versión web no arrastre nada de escritorio en su bundle.
 */

import { enEscritorio } from './exportar/guardar'

export async function buscarActualizacion(): Promise<void> {
  if (!enEscritorio()) return

  try {
    const [{ check }, { ask }, { relaunch }] = await Promise.all([
      import('@tauri-apps/plugin-updater'),
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-process'),
    ])

    const nueva = await check()
    if (!nueva) return

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
    if (!instalar) return

    await nueva.downloadAndInstall()
    await relaunch()
  } catch (e) {
    // Sin internet, o si el servidor de actualizaciones no responde, no se
    // interrumpe el trabajo: se sigue usando la versión ya instalada.
    console.warn('No se pudo comprobar si hay actualizaciones:', e)
  }
}
