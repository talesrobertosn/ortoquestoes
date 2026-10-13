import { useCallback, useEffect, useMemo, useState } from 'react'
import { gravar, ler } from '../../estado/armazenamento'
import { proximoRegistro, revisarHoje } from '../../estado/revisao'
import { todasAsCartas } from '../dados/acervo'
import { tocar } from '../efeitos/sons'
import { CHAVE_REGISTROS, type RegistroFlashcard } from '../progresso'
import { Cartao } from './Cartao'

type Avaliacao = 'errei' | 'hesitei' | 'sabia'

/**
 * Modo Estudo: vira o flashcard e diz como foi. Ordem: os que te derrubaram na
 * Batalha, depois os que vencem hoje na revisão, depois os nunca vistos.
 */
export function Estudo({ primeiro, aoAmpliar, reduzido }: { primeiro: string[]; aoAmpliar: (i: { src: string; legenda: string }) => void; reduzido: boolean }) {
  const cartas = todasAsCartas()
  const porId = useMemo(() => new Map(cartas.map((c) => [c.id, c])), [cartas])
  const fila = useMemo(() => {
    const registros = ler<Record<string, RegistroFlashcard>>(CHAVE_REGISTROS, {})
    const ids = cartas.map((c) => c.id)
    const vencem = ids.filter((id) => !primeiro.includes(id) && revisarHoje(registros[id]))
    const novos = ids.filter((id) => !primeiro.includes(id) && !vencem.includes(id) && !registros[id])
    const resto = ids.filter((id) => !primeiro.includes(id) && !vencem.includes(id) && !novos.includes(id))
    return [...new Set([...primeiro, ...vencem, ...novos, ...resto])].filter((id) => ids.includes(id))
  }, [primeiro, cartas])
  const [pos, definirPos] = useState(0)
  const [virada, definirVirada] = useState(false)
  const [feitos, definirFeitos] = useState<Record<Avaliacao, number>>({ errei: 0, hesitei: 0, sabia: 0 })
  const carta = porId.get(fila[pos % fila.length])!

  const virar = useCallback(() => { if (!virada) { definirVirada(true) } }, [virada])

  const avaliar = useCallback((a: Avaliacao) => {
    if (!virada) return
    const registros = ler<Record<string, RegistroFlashcard>>(CHAVE_REGISTROS, {})
    registros[carta.id] = { ...proximoRegistro(registros[carta.id], a !== 'errei', Date.now(), a === 'errei' ? 'chute' : a === 'hesitei' ? 'duvida' : 'seguro'), assistidos: registros[carta.id]?.assistidos }
    gravar(CHAVE_REGISTROS, registros)
    tocar(a === 'sabia' ? 'cura' : a === 'hesitei' ? 'confirmar' : 'erro')
    definirFeitos((f) => ({ ...f, [a]: f[a] + 1 }))
    definirVirada(false)
    definirPos((p) => p + 1)
  }, [carta.id, virada])

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const alvo = e.target as HTMLElement
      if (e.key === ' ' && alvo?.tagName !== 'BUTTON' && alvo?.tagName !== 'A') { e.preventDefault(); virar() }
      if (virada && e.key === '1') avaliar('errei')
      if (virada && e.key === '2') avaliar('hesitei')
      if (virada && e.key === '3') avaliar('sabia')
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [avaliar, virada, virar])

  const total = feitos.errei + feitos.hesitei + feitos.sabia
  const atual = (pos % fila.length) + 1
  return (
    <div className="fc-estudo">
      <aside className="fc-estudo__painel" aria-label="Progresso do estudo">
        <div className="fc-estudo__contagem"><b>{atual}</b><small>de {fila.length}</small></div>
        <div className="fc-estudo__barra" aria-hidden="true"><i style={{ width: (100 * atual) / fila.length + '%' }} /></div>
        <dl className="fc-estudo__placar">
          <div className="sabia"><dt>Sabia</dt><dd>{feitos.sabia}</dd></div>
          <div className="hesitei"><dt>Hesitei</dt><dd>{feitos.hesitei}</dd></div>
          <div className="errei"><dt>Errei</dt><dd>{feitos.errei}</dd></div>
        </dl>
        {primeiro.length > 0 && pos < primeiro.length && <p className="fc-estudo__aviso">Este flashcard te derrubou na Batalha.</p>}
        {total > 0 && <p className="fc-estudo__nota">{total} revisado{total > 1 ? 's' : ''} agora</p>}
      </aside>
      <div className="fc-estudo__mesa">
        <Cartao
          chave={pos}
          carta={carta}
          virada={virada}
          dicaFrente="Toque no flashcard para virar · espaço"
          aoTocar={virar}
          aoAmpliar={aoAmpliar}
          aoGirar={() => tocar('giro')}
          reduzido={reduzido}
        />
      </div>
      <div className="fc-estudo__botoes">
        {virada ? (
          <>
            <button type="button" className="fc-botao-aval fc-botao-aval--errei" onClick={() => avaliar('errei')}><strong>Errei</strong><small>volta hoje · 1</small></button>
            <button type="button" className="fc-botao-aval fc-botao-aval--hesitei" onClick={() => avaliar('hesitei')}><strong>Hesitei</strong><small>volta em 3 dias · 2</small></button>
            <button type="button" className="fc-botao-aval fc-botao-aval--sabia" onClick={() => avaliar('sabia')}><strong>Sabia</strong><small>volta em 10 dias · 3</small></button>
          </>
        ) : (
          <button type="button" className="fc-principal fc-principal--largo pronto" onClick={() => { tocar('confirmar'); virar() }}><span>Virar o flashcard</span><small>espaço</small></button>
        )}
      </div>
    </div>
  )
}
