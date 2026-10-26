import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usarConta } from '../conta/ContextoConta'
import { EVENTO_DADOS, ler, type MudancaDados } from '../estado/armazenamento'
import type { RegistroQuestao } from '../estado/revisao'
import type { EstadoSessao } from '../dados/tipos'
import { chaveDoDia } from '../util/dia'
import { AVISO_EVENTOS, eventosLigados } from './preferencias'
import { guardarLembrancas, lerLembrancas } from './memoria'
import { permitido, type Contexto } from './regras'
import { estudoDoDia, novasConquistas, REGRAS_CONQUISTA, type ConquistaDia } from './conquistasDia'
import { ArteConquistaPixel } from './ArteConquista'
import './conquistasDia.css'

/** Tempo de cada cartão na tela e o respiro entre dois seguidos. */
const DURACAO = 5_600
const RESPIRO = 700
const ROTULO: Record<ConquistaDia['nivel'], string> = { bronze: 'Conquista do dia', prata: 'Conquista do dia', ouro: 'Conquista de ouro', diamante: 'Conquista rara' }

/**
 * Conquistas do dia (Tales, 26/10/2026): quando uma resposta feita agora libera uma marca de hoje,
 * um cartão em pixel art pula no alto da tela, com a arte girando como moeda e faíscas. Diferente
 * das visitas surpresa, não tem limite de uma por hora (é mérito, não sorteio), mas segue a mesma
 * preferência de "pequenas visitas e surpresas" e espera o fim de simulados e sessões cronometradas.
 * Cada conquista aparece uma vez por dia neste aparelho.
 */
export default function ConquistasDoDia() {
  const { sessao: conta } = usarConta()
  const [atual, definirAtual] = useState<ConquistaDia | null>(null)
  const [saindo, definirSaindo] = useState(false)
  const fecharRef = useRef<() => void>(() => undefined)
  const usuario = conta?.user.id ?? null

  useEffect(() => {
    const id = usuario ?? 'visitante'
    const fila: ConquistaDia[] = []
    const reducao = matchMedia('(prefers-reduced-motion: reduce)')
    let ocupada = false, fim: ReturnType<typeof setTimeout> | undefined
    const pode = () => eventosLigados() && permitido({
      ligado: true, visivel: document.visibilityState === 'visible', rota: location.hash.slice(1).split('?')[0] || '/',
      modal: !!document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]:not(.fc-modal)'), sessao: ler<EstadoSessao | null>('sessao:atual', null),
    } as Contexto)
    const chave = (cid: string) => `${chaveDoDia()}:conq-${cid}`
    const proxima = () => {
      if (ocupada || !fila.length || !pode()) return
      ocupada = true; definirSaindo(false); definirAtual(fila.shift()!)
      fim = setTimeout(sair, DURACAO)
    }
    const sair = () => {
      clearTimeout(fim)
      if (!ocupada) return
      definirSaindo(true)
      fim = setTimeout(() => { definirAtual(null); definirSaindo(false); ocupada = false; fim = setTimeout(proxima, RESPIRO) }, reducao.matches ? 0 : 360)
    }
    fecharRef.current = sair
    const anunciar = (novas: ConquistaDia[]) => {
      if (!novas.length) return
      const lembrancas = lerLembrancas(id)
      for (const c of novas) lembrancas.vistos[chave(c.id)] = Date.now()
      guardarLembrancas(id, lembrancas)
      fila.push(...novas)
      proxima()
    }
    const dados = (ev: Event) => {
      const m = (ev as CustomEvent<MudancaDados>).detail
      if (m.chave !== 'respondidas' || m.origem !== 'local' || m.usuario !== usuario || !eventosLigados()) return
      const agora = Date.now()
      const antes = estudoDoDia((m.antes ?? {}) as Record<string, RegistroQuestao>, agora)
      const depois = estudoDoDia((m.valor ?? {}) as Record<string, RegistroQuestao>, agora)
      const vistos = lerLembrancas(id).vistos
      anunciar(novasConquistas(antes, depois, (cid) => !!vistos[chave(cid)] || fila.some((c) => c.id === cid)))
    }
    const desligar = () => { if (!eventosLigados()) { fila.length = 0; clearTimeout(fim); ocupada = false; definirAtual(null) } }
    const ocultar = () => { if (document.hidden && ocupada) sair() }
    // A fila espera o fim de um simulado ou de uma sessão cronometrada.
    const relogio = setInterval(proxima, 3_000)
    // Só no Vite DEV, para capturas: ?conquista=<id> mostra uma delas (?conquista=todas, uma atrás da outra).
    const teste = setTimeout(() => {
      if (!import.meta.env.DEV) return
      const pedido = new URLSearchParams(location.hash.split('?')[1]).get('conquista')
      const regras = pedido === 'todas' ? REGRAS_CONQUISTA : REGRAS_CONQUISTA.filter((r) => r.id === pedido)
      const cheio = { feitas: 100, certas: 40, validas: 50, seguidas: 10, virada: true, areas: 4, diasSeguidos: 7 }
      const vazio = { feitas: 0, certas: 0, validas: 0, seguidas: 0, virada: false, areas: 0, diasSeguidos: 0 }
      fila.push(...novasConquistas(vazio, cheio, (cid) => !regras.some((r) => r.id === cid)))
      proxima()
    }, 600)
    window.addEventListener(EVENTO_DADOS, dados); window.addEventListener(AVISO_EVENTOS, desligar); document.addEventListener('visibilitychange', ocultar)
    return () => {
      clearTimeout(fim); clearTimeout(teste); clearInterval(relogio)
      window.removeEventListener(EVENTO_DADOS, dados); window.removeEventListener(AVISO_EVENTOS, desligar); document.removeEventListener('visibilitychange', ocultar)
    }
  }, [usuario])

  return createPortal(
    <div className="cq-vivo" role="status" aria-live="polite" aria-atomic="true">
      {atual && <aside key={atual.id} className={`cq cq--${atual.nivel}${saindo ? ' cq--saindo' : ''}`} aria-label={`${ROTULO[atual.nivel]}: ${atual.titulo}`} style={{ '--duracao': `${DURACAO}ms` } as React.CSSProperties}>
        <span className="cq__palco" aria-hidden="true">
          <span className="cq__raios" />
          <span className="cq__arte"><ArteConquistaPixel arte={atual.arte} nivel={atual.nivel} tamanho={64} /></span>
          <span className="cq__chao" />
          <span className="cq__faiscas">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--a': `${i * 36 + (i % 2) * 14}deg`, '--d': `${34 + (i % 3) * 10}px`, '--t': `${0.28 + (i % 4) * 0.05}s` } as React.CSSProperties} />)}</span>
        </span>
        <span className="cq__corpo">
          <small className="cq__rotulo">{ROTULO[atual.nivel]}</small>
          <strong className="cq__titulo">{atual.titulo}</strong>
          <span className="cq__texto">{atual.texto}</span>
          <span className="cq__marca">{atual.marca}</span>
        </span>
        <button className="cq__fechar" type="button" aria-label="Dispensar conquista" onClick={() => fecharRef.current()}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
        </button>
        <span className="cq__tempo" aria-hidden="true" />
      </aside>}
    </div>, document.body)
}
