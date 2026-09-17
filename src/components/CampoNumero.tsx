import { useEffect, useRef, useState } from 'react'

/**
 * Un campo de número que SE PUEDE VACIAR para escribir otro.
 *
 * El `<input type="number">` de siempre, atado a `Number(e.target.value)`, no
 * deja escribir: al borrar el último dígito el valor cae en 0 —o en el de por
 * defecto— y el campo se vuelve a llenar solo, así que nunca se llega a teclear
 * la medida nueva. Acá el texto es del campo mientras se escribe y solo se
 * entrega el número cuando sirve.
 *
 * Mientras se escribe, un valor fuera de rango no se entrega: escribir "1"
 * para llegar a "170" no puede mandar una cabina de 1 cm al plano. Al salir
 * del campo se acomoda al rango, y si quedó vacío vuelve el valor que tenía.
 */
export default function CampoNumero({
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
  id,
}: {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
  id?: string
}) {
  const [texto, setTexto] = useState(String(value))
  const escribiendo = useRef(false)

  // mientras se escribe manda el campo; si el valor cambia desde afuera —otra
  // área, un proyecto que se abre— se refresca
  useEffect(() => {
    if (!escribiendo.current) setTexto(String(value))
  }, [value])

  const dentroDelRango = (n: number) =>
    (min === undefined || n >= min) && (max === undefined || n <= max)

  return (
    <input
      id={id}
      className={className}
      type="number"
      min={min}
      max={max}
      step={step}
      value={texto}
      onFocus={() => { escribiendo.current = true }}
      onChange={(e) => {
        const v = e.target.value
        setTexto(v)
        if (v.trim() === '') return
        const n = Number(v)
        if (Number.isFinite(n) && dentroDelRango(n)) onChange(n)
      }}
      onBlur={() => {
        escribiendo.current = false
        const n = Number(texto)
        if (texto.trim() === '' || !Number.isFinite(n)) {
          setTexto(String(value))
          return
        }
        const acomodado = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))
        setTexto(String(acomodado))
        if (acomodado !== value) onChange(acomodado)
      }}
    />
  )
}
