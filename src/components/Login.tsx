import { useState } from 'react'
import {
  cambiarClaveConToken, CUENTAS_DEMO, hayNube, iniciarSesion, leerRecuperacion, pedirCuenta,
  pedirRestablecer, VUELTA_RECUPERAR, type Usuario,
} from '../auth'
import { enEscritorio } from '../exportar/guardar'
import Ojo from './Ojo'

/**
 * Entrada a la app. Además de iniciar sesión, quien no tiene cuenta la puede
 * PEDIR: se registra acá y queda esperando que un Administrador lo admita y le
 * diga qué rol y a qué distribuidor pertenece. Hasta entonces no entra.
 */
export default function Login({ onEntrar }: { onEntrar: (u: Usuario) => void }) {
  /**
   * Si la app se abrió desde el enlace del correo, se arranca directo en
   * "contraseña nueva": el token viene en el # y se lee una sola vez.
   */
  const [recuperacion] = useState(leerRecuperacion)
  const [modo, setModo] = useState<'entrar' | 'pedir' | 'olvide' | 'nueva'>(
    recuperacion.token ? 'nueva' : 'entrar',
  )
  const [clave2, setClave2] = useState('')
  /** el "ese enlace venció" del correo: se va en cuanto la persona hace otra cosa */
  const [avisoEnlace, setAvisoEnlace] = useState(recuperacion.error)
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  function cambiarModo(a: 'entrar' | 'pedir' | 'olvide' | 'nueva') {
    setModo(a)
    setError(null)
    setListo(null)
    setVerClave(false)
    setClave('')
    setClave2('')
    setAvisoEnlace(null)
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setListo(null)
    setCargando(true)
    try {
      if (modo === 'entrar') {
        onEntrar(await iniciarSesion(email, clave))
      } else if (modo === 'olvide') {
        setListo(await pedirRestablecer(email))
      } else if (modo === 'nueva') {
        if (clave !== clave2) throw new Error('Las dos contraseñas no son iguales.')
        await cambiarClaveConToken(recuperacion.token!, clave)
        setModo('entrar')
        setClave('')
        setClave2('')
        setListo('Contraseña cambiada. Entrá con la nueva.')
      } else {
        setListo(await pedirCuenta({ email, clave, nombre, telefono, nota }))
        setClave('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo continuar.')
    } finally {
      setCargando(false)
    }
  }

  const pidiendo = modo === 'pedir'
  const olvide = modo === 'olvide'
  const nueva = modo === 'nueva'

  return (
    <div className="login">
      <form className="caja" onSubmit={enviar}>
        <div>
          <div className="marca">Grupo Modumex</div>
          <h1>Constructor de Planos</h1>
          <p className="lema">
            {pidiendo
              ? 'Pedí una cuenta y un administrador te habilita el acceso.'
              : olvide
                ? 'Escribí tu correo y te llega un enlace para poner una contraseña nueva.'
                : nueva
                  ? 'Poné la contraseña nueva de tu cuenta.'
                  : 'Diseño de mamparas sanitarias.'}
          </p>
        </div>

        {pidiendo && (
          <>
            <div className="campo">
              <label htmlFor="nombre">Tu nombre</label>
              <input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" required />
            </div>
            <div className="campo">
              <label htmlFor="telefono">Teléfono</label>
              <input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} autoComplete="tel" />
            </div>
          </>
        )}

        {!nueva && (
          <div className="campo">
            <label htmlFor="email">Correo</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </div>
        )}
        {!olvide && (
        <div className="campo">
          <label htmlFor="clave">{nueva ? 'Contraseña nueva' : 'Contraseña'}</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              id="clave"
              style={{ flex: 1 }}
              type={verClave ? 'text' : 'password'}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete={pidiendo || nueva ? 'new-password' : 'current-password'}
              placeholder={pidiendo || nueva ? 'Al menos 6 caracteres' : undefined}
              required
            />
            <button
              type="button"
              className="btn plano chico"
              onClick={() => setVerClave((v) => !v)}
              title={verClave ? 'Ocultar' : 'Ver la contraseña'}
            >
              <Ojo abierto={verClave} />
            </button>
          </div>
        </div>

        )}

        {nueva && (
          <div className="campo">
            <label htmlFor="clave2">Repetila</label>
            <input
              id="clave2"
              type={verClave ? 'text' : 'password'}
              value={clave2}
              onChange={(e) => setClave2(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
        )}

        {pidiendo && (
          <div className="campo">
            <label htmlFor="nota">Empresa</label>
            <input
              id="nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Distribuidora X"
            />
          </div>
        )}

        {avisoEnlace && !error && <div className="error">{avisoEnlace}</div>}
        {error && <div className="error">{error}</div>}
        {listo && (
          <div className="aviso-caja ok">
            <b>{olvide ? 'Correo enviado' : modo === 'entrar' ? 'Listo' : 'Registro enviado'}</b>
            <span>{listo}</span>
          </div>
        )}

        <button className="btn primario" type="submit" disabled={cargando} style={{ justifyContent: 'center' }}>
          {cargando
            ? pidiendo ? 'Registrando…' : olvide ? 'Enviando…' : nueva ? 'Guardando…' : 'Entrando…'
            : pidiendo ? 'Registrarse' : olvide ? 'Mandame el enlace' : nueva ? 'Guardar la contraseña' : 'Entrar'}
        </button>

        {hayNube && !nueva && (
          <button
            type="button"
            className="btn plano chico"
            style={{ justifyContent: 'center' }}
            onClick={() => cambiarModo(pidiendo || olvide ? 'entrar' : 'pedir')}
          >
            {pidiendo ? '← Ya tengo cuenta' : olvide ? '← Volver' : 'Registrarse'}
          </button>
        )}

        {hayNube && modo === 'entrar' && (
          <button
            type="button"
            className="btn plano chico"
            style={{ justifyContent: 'center' }}
            onClick={() => cambiarModo('olvide')}
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}

        {olvide && enEscritorio() && (
          <div className="aviso">
            El correo no puede abrir la aplicación de escritorio: el enlace lleva a{' '}
            <b>{VUELTA_RECUPERAR.replace('https://', '')}</b>. Cambiás la contraseña ahí y con
            esa misma entrás acá.
          </div>
        )}

        <div className="aviso">
          {hayNube ? null : import.meta.env.DEV ? (
            // Las cuentas de respaldo solo se listan en desarrollo: en la app
            // repartida no se enseñan contraseñas en pantalla.
            <>
              Sin Supabase configurado, así que por ahora entra con cuentas locales:{' '}
              {CUENTAS_DEMO.map((c, i) => (
                <span key={c.email} className="num">
                  {i > 0 && ' · '}
                  {c.email} / {c.clave}
                </span>
              ))}
            </>
          ) : (
            <>No hay conexión con el servidor de cuentas. Avisa a Modumex.</>
          )}
        </div>
      </form>
    </div>
  )
}
