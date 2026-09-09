/**
 * El ojo que muestra u oculta una contraseña.
 *
 * Va dibujado y no con emoji: el emoji cambia de forma según la máquina y el
 * ojo tachado no existe como carácter, así que el "oculto" quedaba con un
 * monito que no decía nada.
 *
 * Ojo con lo que muestra: la contraseña que se está ESCRIBIENDO. La que un
 * usuario ya tiene no se puede ver, porque Supabase la guarda cifrada.
 */

export default function Ojo({ abierto }: { abierto: boolean }) {
  return (
    <svg
      width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.8" />
      {/* la raya del tachado: solo cuando está oculta */}
      {!abierto && <line x1="3.5" y1="20.5" x2="20.5" y2="3.5" />}
    </svg>
  )
}
