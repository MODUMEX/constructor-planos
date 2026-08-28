/**
 * Versión que se está usando, para que nadie tenga que adivinar en cuál está.
 *
 * En escritorio se le pregunta a la aplicación instalada, que es la que cambia
 * al actualizarse. En el navegador se usa la del package.json, que Vite inyecta
 * al compilar.
 */

import { enEscritorio } from './exportar/guardar'

export const VERSION_COMPILADA = __VERSION_APP__

export async function versionActual(): Promise<string> {
  if (!enEscritorio()) return VERSION_COMPILADA
  try {
    const { getVersion } = await import('@tauri-apps/api/app')
    return await getVersion()
  } catch {
    return VERSION_COMPILADA
  }
}
