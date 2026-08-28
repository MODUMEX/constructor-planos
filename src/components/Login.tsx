import { useState } from 'react'
import { CUENTAS_DEMO, hayNube, iniciarSesion, type Usuario } from '../auth'

export default function Login({ onEntrar }: { onEntrar: (u: Usuario) => void }) {
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      onEntrar(await iniciarSesion(email, clave))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login">
      <form className="caja" onSubmit={enviar}>
        <div>
          <div className="marca">Grupo Modumex</div>
          <h1>Constructor de Planos</h1>
          <p className="lema">Diseño, cotización y pedido de mamparas sanitarias.</p>
        </div>

        <div className="campo">
          <label htmlFor="email">Correo</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </div>
        <div className="campo">
          <label htmlFor="clave">Contraseña</label>
          <input id="clave" type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password" required />
        </div>

        {error && <div className="error">{error}</div>}

        <button className="btn primario" type="submit" disabled={cargando} style={{ justifyContent: 'center' }}>
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>

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
