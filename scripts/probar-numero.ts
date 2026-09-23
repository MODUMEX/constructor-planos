/**
 * Cómo se parte y se rearma un número de plano para dar el siguiente libre.
 *   npm run probar-numero
 */
import { partirNumero, armarNumero } from '../src/proyectos'

let mal = 0
function revisar(escrito: string, siguiente: number, esperado: string) {
  const { prefijo, ancho } = partirNumero(escrito)
  const dio = armarNumero(prefijo, siguiente, ancho)
  const ok = dio === esperado
  if (!ok) mal++
  console.log(`${ok ? '✓' : '✕'} "${escrito}" + ${siguiente} → "${dio}"${ok ? '' : ` (esperado "${esperado}")`}   prefijo "${prefijo}" ancho ${ancho}`)
}

console.log('— el botón respeta el prefijo y los ceros de lo que ya está escrito')
revisar('S000', 1, 'S001')
revisar('S007', 8, 'S008')
revisar('S099', 100, 'S100')       // se pasa del ancho: no se recorta
revisar('1042', 1043, '1043')
revisar('CR-120', 121, 'CR-121')
revisar('', 1043, '1043')          // campo vacío: número pelado
revisar('MX-0007', 8, 'MX-0008')
revisar('S', 1, 'S1')              // prefijo sin dígitos: no inventa ceros

console.log(mal === 0 ? '\nTodo cuadra.' : `\n${mal} caso(s) mal.`)
process.exit(mal === 0 ? 0 : 1)
