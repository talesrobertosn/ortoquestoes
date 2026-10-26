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
import { cabeHoje, estudoDoDia, novasConquistas, REGRAS_CONQUISTA, type ConquistaDia } from './conquistasDia'
import { ArteConquistaPixel } from './ArteConquista'
import './conquistasDia.css'

/** Tempo do cartão na tela. */
const DURACAO = 5_200

/**
 * Conquistas do dia (Tales, 26/10/2026), no clima de jogo aconchegante: quando uma resposta feita
 * agora libera uma marca de hoje, um cartão de papel com a arte em pixel art dá um pulinho no alto
 * da tela. Para não virar spam: só a mais especial de cada vez (as outras ficam guardadas), no máximo
 * três por dia e com intervalo entre elas. Segue a preferência de "pequenas visitas e surpresas" e
 * espera o fim de simulados e sessões cronometradas. Cada conquista vale uma vez por dia neste aparelho.
 */
export default function ConquistasDoDia() {
  const { sessao: conta } = usarConta()
  const [atual, definirAtual] = useState<ConquistaDia | null>(null)
  const [saindo, definirSaindo] = useState(false)
  const fecharRef = useRef<() => void>(() => undefined)
  const usuario = conta?.user.id ?? null

  useEffect(() => {
    const id = usuario ?? 'visitante'
    const reducao = matchMedia('(prefers-reduced-motion: reduce)')
    let esperando: ConquistaDia | null = null, ocupada = false, fim: ReturnType<typeof setTimeout> | undefined
    const pode = () => eventosLigados() && permitido({
      ligado: true, visivel: document.visibilityState === 'visible', rota: location.hash.slice(1).split('?')[0] || '/',
      modal: !!document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]:not(.fc-modal)'), sessao: ler<EstadoSessao | null>('sessao:atual', null),
    } as Contexto)
    const guardada = (cid: string) => `${chaveDoDia()}:conq-${cid}`
    const mostradaPrefixo = () => `${chaveDoDia()}:conq-mostrada-`
    const mostrar = () => {
      if (ocupada || !esperando || !pode()) return
      const c = esperando
      esperando = null
      const lembrancas = lerLembrancas(id)
      const mostrados = Object.entries(lembrancas.vistos).filter(([k]) => k.startsWith(mostradaPrefixo())).map(([, t]) => t)
      if (!cabeHoje(c, mostrados, Date.now())) return // fica guardada, sem cartão
      lembrancas.vistos[mostradaPrefixo() + c.id] = Date.now()
      guardarLembrancas(id, lembrancas)
      ocupada = true; definirSaindo(false); definirAtual(c)
      fim = setTimeout(sair, DURACAO)
    }
    const sair = () => {
      clearTimeout(fim)
      if (!ocupada) return
      definirSaindo(true)
      fim = setTimeout(() => { definirAtual(null); definirSaindo(false); ocupada = false }, reducao.matches ? 0 : 340)
    }
    fecharRef.current = sair
    const dados = (ev: Event) => {
      const m = (ev as CustomEvent<MudancaDados>).detail
      // começou um simulado ou uma sessão cronometrada: o cartão sai (a próxima conquista espera o fim)
      if (m.chave === 'sessao:atual') { if (ocupada && !pode()) sair(); return }
      if (m.chave !== 'respondidas' || m.origem !== 'local' || m.usuario !== usuario || !eventosLigados()) return
      const agora = Date.now()
      const lembrancas = lerLembrancas(id)
      const novas = novasConquistas(estudoDoDia((m.antes ?? {}) as Record<string, RegistroQuestao>, agora), estudoDoDia((m.valor ?? {}) as Record<string, RegistroQuestao>, agora), (cid) => !!lembrancas.vistos[guardada(cid)])
      if (!novas.length) return
      // todas ficam guardadas; só a mais especial (a primeira) pode virar cartão
      for (const c of novas) lembrancas.vistos[guardada(c.id)] = agora
      guardarLembrancas(id, lembrancas)
      esperando = novas[0]
      mostrar()
    }
    const desligar = () => { if (!eventosLigados()) { esperando = null; clearTimeout(fim); ocupada = false; definirAtual(null) } }
    const ocultar = () => { if (document.hidden && ocupada) sair() }
    const rota = () => { if (ocupada && !pode()) sair() }
    // A conquista espera o fim de um simulado ou de uma sessão cronometrada (uma só, a mais recente).
    const relogio = setInterval(mostrar, 3_000)
    // Só no Vite DEV, para capturas: ?conquista=<id> mostra uma delas, sem limite.
    const teste = setTimeout(() => {
      if (!import.meta.env.DEV) return
      const pedido = new URLSearchParams(location.hash.split('?')[1]).get('conquista')
      const cheio = { feitas: 100, certas: 40, validas: 50, seguidas: 10, virada: true, areas: 4, diasSeguidos: 7 }
      const vazio = { feitas: 0, certas: 0, validas: 0, seguidas: 0, virada: false, areas: 0, diasSeguidos: 0 }
      const c = novasConquistas(vazio, cheio, (cid) => cid !== pedido)[0]
      if (c && REGRAS_CONQUISTA.some((r) => r.id === pedido)) { ocupada = true; definirAtual(c); fim = setTimeout(sair, 60_000) }
    }, 600)
    window.addEventListener(EVENTO_DADOS, dados); window.addEventListener(AVISO_EVENTOS, desligar); document.addEventListener('visibilitychange', ocultar); window.addEventListener('hashchange', rota)
    return () => {
      clearTimeout(fim); clearTimeout(teste); clearInterval(relogio)
      window.removeEventListener(EVENTO_DADOS, dados); window.removeEventListener(AVISO_EVENTOS, desligar); document.removeEventListener('visibilitychange', ocultar); window.removeEventListener('hashchange', rota)
    }
  }, [usuario])

  return createPortal(
    <div className="cq-vivo" role="status" aria-live="polite" aria-atomic="true">
      {atual && <aside key={atual.id} className={`cq cq--${atual.tom}${saindo ? ' cq--saindo' : ''}`} aria-label={`Conquista do dia: ${atual.titulo}`} style={{ '--duracao': `${DURACAO}ms` } as React.CSSProperties}>
        <span className="cq__palco" aria-hidden="true">
          <span className="cq__arte"><ArteConquistaPixel arte={atual.arte} tamanho={72} /></span>
          <span className="cq__sombra" />
          <span className="cq__brilhos"><i /><i /><i /><i /></span>
          {atual.tom === 'gato' && <span className="cq__coracoes"><i /><i /><i /></span>}
        </span>
        <span className="cq__corpo">
          <small className="cq__etiqueta">Conquista do dia</small>
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
