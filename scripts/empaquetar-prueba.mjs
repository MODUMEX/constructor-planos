/**
 * Empaqueta una prueba que necesita las variables de Vite.
 *
 * Las demás pruebas se arman con `--define:import.meta.env={}` en la línea de
 * comandos, pero cuando hay que darle VALORES a esas variables las comillas no
 * sobreviven al paso por npm en Windows. Acá se usa la API de esbuild, que no
 * tiene ese problema.
 *
 *   node scripts/empaquetar-prueba.mjs scripts/probar-sesion.ts .sesion.mjs
 */
import { build } from 'esbuild'

const [entrada, salida] = process.argv.slice(2)
if (!entrada || !salida) {
  console.error('uso: node scripts/empaquetar-prueba.mjs <entrada.ts> <salida.mjs>')
  process.exit(1)
}

await build({
  entryPoints: [entrada],
  outfile: salida,
  bundle: true,
  platform: 'node',
  format: 'esm',
  logLevel: 'warning',
  // Algunos paquetes (react-dom/server) piden módulos de Node con require, que
  // en un bundle ESM no existe. Esto se lo devuelve.
  banner: {
    js: [
      "import { createRequire as __cr } from 'module';",
      'const require = __cr(import.meta.url);',
    ].join(String.fromCharCode(10)),
  },
  define: {
    'import.meta.env': JSON.stringify({
      VITE_SUPABASE_URL: 'https://prueba.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'llave-de-prueba',
    }),
  },
})
