/**
 * Conexión a Supabase, en un solo lugar.
 *
 * OJO con cómo se lee: Vite reemplaza `import.meta.env.VITE_LO_QUE_SEA` por su
 * valor AL COMPILAR, pero solo cuando la propiedad va escrita entera. Si se lee
 * `import.meta.env[nombre]` con el nombre en una variable, Vite no tiene qué
 * reemplazar y en la aplicación compilada queda un `import.meta.env` que no
 * existe: todo sale como «sin Supabase configurado» aunque el .env esté bien.
 *
 * El try es para los scripts de Node (npm run muestra, probar-tarifas…), donde
 * `import.meta.env` tampoco existe y leerlo tira error.
 */

let url: string | undefined
let llave: string | undefined
try {
  url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  llave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
} catch {
  // fuera del navegador no hay variables de Vite: se queda sin conexión
}

export const URL_SUPABASE = url
export const LLAVE_SUPABASE = llave
export const HAY_SUPABASE = !!url && !!llave
