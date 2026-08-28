import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface MenuPos { x: number; y: number }

export function Menu({
  pos,
  titulo,
  detalle,
  onCerrar,
  children,
}: {
  pos: MenuPos
  titulo: string
  detalle?: string
  onCerrar: () => void
  children: React.ReactNode
}) {
  const caja = useRef<HTMLDivElement>(null)
  const [ajuste, setAjuste] = useState<MenuPos>(pos)

  useLayoutEffect(() => {
    const el = caja.current
    if (!el) return
    const r = el.getBoundingClientRect()
    let { x, y } = pos
    if (x + r.width > window.innerWidth - 8) x = window.innerWidth - r.width - 8
    if (y + r.height > window.innerHeight - 8) y = Math.max(8, window.innerHeight - r.height - 8)
    setAjuste({ x, y })
  }, [pos])

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) onCerrar()
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [onCerrar])

  return (
    <div ref={caja} className="menu" style={{ left: ajuste.x, top: ajuste.y }} role="menu">
      <div className="titulo">
        <span>{titulo}</span>
        {detalle && <span className="num">{detalle}</span>}
      </div>
      {children}
    </div>
  )
}

export function Item({
  children,
  activo,
  onClick,
  disabled,
  atajo,
}: {
  children: React.ReactNode
  activo?: boolean
  onClick?: () => void
  disabled?: boolean
  atajo?: string
}) {
  return (
    <button className="item" onClick={onClick} disabled={disabled} role="menuitem" type="button">
      <span className="tic">{activo ? '✓' : ''}</span>
      <span>{children}</span>
      {atajo && <span className="atajo">{atajo}</span>}
    </button>
  )
}

export function Grupo({ children }: { children: React.ReactNode }) {
  return <div className="grupo">{children}</div>
}

export function Raya() {
  return <div className="raya" />
}
