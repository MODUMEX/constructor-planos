import { readFileSync, writeFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** la versión sale del package.json, para no tenerla escrita en dos lados */
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

/**
 * Solo en desarrollo: deja que la página guarde un archivo en disco.
 *   await fetch('/__guardar?nombre=hoja1.png', { method: 'POST', body: base64 })
 * Sirve para revisar el PDF o el plano renderizado sin abrir descargas.
 */
function guardarArchivo(): Plugin {
  return {
    name: 'guardar-archivo-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__guardar', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end('solo POST')
        }
        const url = new URL(req.url ?? '', 'http://localhost')
        const nombre = (url.searchParams.get('nombre') ?? 'archivo.bin').replace(/[^\w.\-]/g, '_')
        const destino = url.searchParams.get('destino') ?? './'
        const trozos: Buffer[] = []
        req.on('data', (c) => trozos.push(c as Buffer))
        req.on('end', () => {
          const cuerpo = Buffer.concat(trozos).toString('utf8')
          const datos = cuerpo.startsWith('data:') ? cuerpo.slice(cuerpo.indexOf(',') + 1) : cuerpo
          try {
            writeFileSync(`${destino}/${nombre}`, Buffer.from(datos, 'base64'))
            res.end(`guardado ${destino}/${nombre}`)
          } catch (e) {
            res.statusCode = 500
            res.end(String(e))
          }
        })
      })
    },
  }
}

export default defineConfig({
  define: { __VERSION_APP__: JSON.stringify(version) },
  plugins: [react(), guardarArchivo()],
  server: {
    port: 5183,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
})
