import { useState } from 'react'
import { CUENTAS_DEMO, hayNube, iniciarSesion, pedirCuenta, type Usuario } from '../auth'

/**
 * Entrada a la app. Además de iniciar sesión, quien no tiene cuenta la puede
 * PEDIR: se registra acá y queda esperando que un Administrador lo admita y le
 * diga qué rol y a qué distribuidor pertenece. Hasta entonces no entra.
 */
export default function Login({ onEntrar }: { onEntrar: (u: Usuario) => void }) {
  const [modo, setModo] = useState<'entrar' | 'pedir'>('entrar')
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  function cambiarModo(a: 'entrar' | 'pedir') {
    setModo(a)
    setError(null)
    setListo(null)
    setVerClave(false)
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setListo(null)
    setCargando(true)
    try {
      if (modo === 'entrar') {
        onEntrar(await iniciarSesion(email, clave))
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

  return (
    <div className="login">
      <form className="caja" onSubmit={enviar}>
        <div>
          <div className="marca">Grupo Modumex</div>
          <h1>Constructor de Planos</h1>
          <p className="lema">
            {pidiendo
              ? 'Pedí una cuenta y un administrador te habilita el acceso.'
              : 'Diseño, cotización y pedido de mamparas sanitarias.'}
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

        <div className="campo">
          <label htmlFor="email">Correo</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </div>
        <div className="campo">
          <label htmlFor="clave">Contraseña</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              id="clave"
              style={{ flex: 1 }}
              type={verClave ? 'text' : 'password'}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete={pidiendo ? 'new-password' : 'current-password'}
              placeholder={pidiendo ? 'Al menos 6 caracteres' : undefined}
              required
            />
            <button
              type="button"
              className="btn plano chico"
              onClick={() => setVerClave((v) => !v)}
              title={verClave ? 'Ocultar' : 'Ver la contraseña'}
            >
              {verClave ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        {pidiendo && (
          <div className="campo">
            <label htmlFor="nota">Empresa y para qué la vas a usar</label>
            <input
              id="nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Distribuidora X, cotizaciones de mamparas"
            />
          </div>
        )}

        {error && <div className="error">{error}</div>}
        {listo && (
          <div className="aviso-caja ok">
            <b>Solicitud enviada</b>
            <span>{listo}</span>
          </div>
        )}

        <button className="btn primario" type="submit" disabled={cargando} style={{ justifyContent: 'center' }}>
          {cargando ? (pidiendo ? 'Enviando…' : 'Entrando…') : pidiendo ? 'Pedir cuenta' : 'Entrar'}
        </button>

        {hayNube && (
          <button
            type="button"
            className="btn plano chico"
            style={{ justifyContent: 'center' }}
            onClick={() => cambiarModo(pidiendo ? 'entrar' : 'pedir')}
          >
            {pidiendo ? '← Ya tengo cuenta' : 'Registrarse'}
          </button>
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
