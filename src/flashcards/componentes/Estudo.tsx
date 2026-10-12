import { useCallback, useEffect, useMemo, useState } from 'react'
import { gravar, ler } from '../../estado/armazenamento'
import { proximoRegistro, revisarHoje } from '../../estado/revisao'
import { BARALHO_DEMO } from '../dados/baralhoDemo'
import { CHAVE_REGISTROS, type RegistroFlashcard } from '../progresso'
import { Cartao } from './Cartao'

type Avaliacao = 'errei' | 'hesitei' | 'sabia'

/**
 * Modo Estudo: vira o flashcard e diz como foi. Ordem: os que te derrubaram na
 * Batalha, depois os que vencem hoje na revisão, depois os nunca vistos.
 */
export function Estudo({ primeiro, aoAmpliar }: { primeiro: string[]; aoAmpliar: (i: { src: string; legenda: string }) => void }) {
  const fila = useMemo(() => {
    const registros = ler<Record<string, RegistroFlashcard>>(CHAVE_REGISTROS, {})
    const ids = BARALHO_DEMO.map((c) => c.id)
    const vencem = ids.filter((id) => !primeiro.includes(id) && revisarHoje(registros[id]))
    const novos = ids.filter((id) => !primeiro.includes(id) && !vencem.includes(id) && !registros[id])
    const resto = ids.filter((id) => !primeiro.includes(id) && !vencem.includes(id) && !novos.includes(id))
    return [...new Set([...primeiro, ...vencem, ...novos, ...resto])].filter((id) => ids.includes(id))
  }, [primeiro])
  const [pos, definirPos] = useState(0)
  const [virada, definirVirada] = useState(false)
  const [feitos, definirFeitos] = useState<Record<Avaliacao, number>>({ errei: 0, hesitei: 0, sabia: 0 })
  const carta = BARALHO_DEMO.find((c) => c.id === fila[pos % fila.length])!

  const avaliar = useCallback((a: Avaliacao) => {
    if (!virada) return
    const registros = ler<Record<string, RegistroFlashcard>>(CHAVE_REGISTROS, {})
    registros[carta.id] = { ...proximoRegistro(registros[carta.id], a !== 'errei', Date.now(), a === 'errei' ? 'chute' : a === 'hesitei' ? 'duvida' : 'seguro'), assistidos: registros[carta.id]?.assistidos }
    gravar(CHAVE_REGISTROS, registros)
    definirFeitos((f) => ({ ...f, [a]: f[a] + 1 }))
    definirVirada(false)
    definirPos((p) => p + 1)
  }, [carta.id, virada])

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const alvo = e.target as HTMLElement
      if (e.key === ' ' && alvo?.tagName !== 'BUTTON' && alvo?.tagName !== 'A') { e.preventDefault(); definirVirada(true) }
      if (virada && e.key === '1') avaliar('errei')
      if (virada && e.key === '2') avaliar('hesitei')
      if (virada && e.key === '3') avaliar('sabia')
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [avaliar, virada])

  const total = feitos.errei + feitos.hesitei + feitos.sabia
  return (
    <div className="fc-estudo">
      <section className="fc-mesa fc-mesa--estudo" aria-label="Mesa de estudo">
        <div className="fc-estudo__placar">
          <span className="fc-info">Flashcard {(pos % fila.length) + 1} de {fila.length}</span>
          {primeiro.length > 0 && pos < primeiro.length && <span className="fc-info fc-info--furia">Te derrubou na Batalha</span>}
          <span className="fc-info">Hoje: {total} · Sabia {feitos.sabia} · Hesitei {feitos.hesitei} · Errei {feitos.errei}</span>
        </div>
        <div className="fc-palco-carta">
          <Cartao chave={pos} carta={carta} virada={virada} dicaFrente="Toque para virar (espaço)" aoTocar={() => definirVirada(true)} aoAmpliar={aoAmpliar} />
        </div>
      </section>
      <div className="fc-estudo__botoes">
        {virada ? (
          <>
            <button type="button" className="fc-botao fc-botao--errei" onClick={() => avaliar('errei')}>Errei <small>1</small></button>
            <button type="button" className="fc-botao fc-botao--hesitei" onClick={() => avaliar('hesitei')}>Hesitei <small>2</small></button>
            <button type="button" className="fc-botao fc-botao--sabia" onClick={() => avaliar('sabia')}>Sabia <small>3</small></button>
          </>
        ) : (
          <button type="button" className="fc-botao fc-botao--largo" onClick={() => definirVirada(true)}>Virar <small>espaço</small></button>
        )}
      </div>
    </div>
  )
}
