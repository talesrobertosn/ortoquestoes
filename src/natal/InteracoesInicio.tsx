import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type RefObject, type SetStateAction } from 'react'
import { META_STREAK_DIARIA } from '../estado/streak'
import { modoNatalAtivo } from './modoNatal'

export const CORES_LAMPADAS = ['255 184 98', '242 107 96', '126 201 159', '123 179 232', '255 219 146', '241 137 164'] as const

type EstadoNatal = {
  ativo: boolean
  respostas: number
  meta: boolean
  festa: number
  neve: number
  acesa: number | null
  balanco: { indice: number; vez: number } | null
  indicar: Dispatch<SetStateAction<number | null>>
  balançar: (indice: number) => void
  mostrarNeve: (intensidade: number) => void
  marcarTreno: () => boolean
  visita: { x: number; y: number } | null
  visitarGuirlanda: (palco: HTMLElement | null) => void
}

const vazio = () => {}
const NatalInicio = createContext<EstadoNatal>({
  ativo: false, respostas: 0, meta: false, festa: 0, neve: 0, acesa: null, balanco: null,
  indicar: vazio, balançar: vazio, mostrarNeve: vazio, marcarTreno: () => false, visita: null, visitarGuirlanda: vazio,
})

export function usarNatalInicio() {
  return useContext(NatalInicio)
}

export function NatalInicioProvider({ respostas = 0, meta = false, festa = 0, children }: {
  respostas?: number; meta?: boolean; festa?: number; children: ReactNode
}) {
  const [ativo] = useState(() => modoNatalAtivo())
  const [neve, mostrarNeve] = useState(0)
  const [acesa, indicar] = useState<number | null>(null)
  const [balanco, porBalanco] = useState<EstadoNatal['balanco']>(null)
  const trenou = useRef(false)
  const marcarTreno = useCallback(() => {
    if (trenou.current) return false
    trenou.current = true
    return true
  }, [])
  const balançar = useCallback((indice: number) => {
    porBalanco((atual) => ({ indice, vez: (atual?.vez ?? 0) + 1 }))
  }, [])
  useEffect(() => {
    if (!balanco) return
    const fim = window.setTimeout(() => porBalanco(null), 900)
    return () => window.clearTimeout(fim)
  }, [balanco])
  const [visita, definirVisita] = useState<EstadoNatal['visita']>(null)
  const visitarGuirlanda = useCallback((palco: HTMLElement | null) => {
    const origem = palco?.querySelector('.hd-coruja:not(.hd-coruja--fora)')
    const destino = palco?.closest('.ip')?.querySelector('.natal-corujinha-ancora')
    if (!origem || !destino || document.hidden) return
    const a = origem.getBoundingClientRect(), b = destino.getBoundingClientRect()
    if (a.bottom < 0 || b.top > innerHeight + 80 || a.width === 0) return
    definirVisita({ x: a.left + a.width / 2 - (b.left + b.width / 2), y: a.top - b.top })
  }, [])
  useEffect(() => {
    if (!visita) return
    const volta = window.setTimeout(() => definirVisita(null), 6600)
    return () => window.clearTimeout(volta)
  }, [visita])
  const valor = useMemo<EstadoNatal>(() => ({
    ativo, respostas: Math.min(META_STREAK_DIARIA, Math.max(0, Math.trunc(respostas))),
    meta, festa, neve, acesa, balanco, indicar, balançar, mostrarNeve, marcarTreno, visita, visitarGuirlanda,
  }), [ativo, respostas, meta, festa, neve, acesa, balanco, balançar, marcarTreno, visita, visitarGuirlanda])
  return <NatalInicio.Provider value={valor}>{children}</NatalInicio.Provider>
}

export function usarMenosMovimento() {
  const [reduz, definir] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return
    const consulta = matchMedia('(prefers-reduced-motion: reduce)')
    const mudou = () => definir(consulta.matches)
    consulta.addEventListener('change', mudou)
    return () => consulta.removeEventListener('change', mudou)
  }, [])
  return reduz
}

/** Animações decorativas só avançam com o elemento em cena e a aba visível. */
export function usarEmVista(ref: RefObject<Element>, ativo: boolean) {
  const [vista, definir] = useState(false)
  useEffect(() => {
    const alvo = ref.current
    if (!ativo || !alvo) return
    let perto = false
    const atualizar = () => definir(perto && !document.hidden)
    const leitor = new IntersectionObserver(([e]) => { perto = e.isIntersecting; atualizar() })
    leitor.observe(alvo)
    document.addEventListener('visibilitychange', atualizar)
    return () => { leitor.disconnect(); document.removeEventListener('visibilitychange', atualizar) }
  }, [ref, ativo])
  return ativo && vista
}
