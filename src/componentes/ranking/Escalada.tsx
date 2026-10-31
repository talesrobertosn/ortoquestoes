import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import { recurso, urlCss } from '../../config'
import type { Periodo } from '../../estado/aparencia'
import { href } from '../../util/rotas'
import { Icone } from '../Icone'
import { Mascote } from '../mascote/Mascote'

/**
 * A Escalada (31/10/2026, o Ranking refeito do zero a pedido do Tales): o ranking é uma montanha. Quem mais respondeu
 * questões está no cume; cada pessoa é uma bandeira na trilha, e a DISTÂNCIA entre duas bandeiras é a diferença de
 * questões entre elas (quem está colado aparece colado; uma diferença grande vira um paredão). A página abre na sua
 * altura da montanha, não no topo. O mascote é o seu guia de escalada: fica ao seu lado, preso pela corda, e diz
 * quantas questões faltam até a próxima saliência; tocar nele leva a treinar (é assim que se sobe).
 */
export interface Escalador { posicao: number; apelido: string; total: number; eh_voce: boolean; subiu: number }

/** Altura do trecho entre duas bandeiras, a partir da diferença de questões (log: paredões sem esticar demais). */
const trecho = (diferenca: number) => Math.round(Math.min(190, Math.max(64, 54 + 24 * Math.log2(1 + Math.max(0, diferenca)))))
/** Para que lado a trilha vira em cada bandeira (-1 a 1). */
const curva = (i: number) => Math.sin(i * 1.15 + 0.4)

export function Escalada({ periodo, cume, trilha, eu, missao, conteudo, rodape, chamadaBase, visitante }: {
  periodo: Periodo
  /** Os três do cume (1º, 2º, 3º). */
  cume: Escalador[]
  /** Do 4º para baixo, na ordem. */
  trilha: Escalador[]
  /** A sua bandeira, se estiver na montanha visível. */
  eu: Escalador | null
  /** A frase do guia ("Mais 12 questões e você passa Thiago"). */
  missao: ReactNode
  /** O cartão de cada pessoa (nome, emblemas, fogueira, movimento...). */
  conteudo: (e: Escalador) => ReactNode
  /** O que fica no acampamento base (mostrar até o top 100). */
  rodape?: ReactNode
  /** Visitante ou fora da lista: o guia espera no acampamento base. */
  chamadaBase?: ReactNode
  visitante?: boolean
}) {
  const parede = useRef<HTMLDivElement>(null)
  const minha = useRef<HTMLLIElement>(null)

  // As alturas de cada bandeira na parede, em px.
  const { pontos, altura } = useMemo(() => {
    let y = trilha[0]?.eh_voce ? 190 : 70
    const pts = trilha.map((e, i) => {
      if (i > 0) y += trecho(trilha[i - 1].total - e.total)
      // Acima da sua bandeira fica o guia (o mascote e a frase): abre espaço para ele.
      if (e.eh_voce) y += 120
      return { e, y, s: curva(i), dif: i > 0 ? trilha[i - 1].total - e.total : (cume[cume.length - 1]?.total ?? e.total) - e.total }
    })
    return { pontos: pts, altura: y + 150 }
  }, [trilha, cume])

  // A página abre na sua altura (sem animação), não no topo.
  useLayoutEffect(() => {
    const caixa = parede.current?.closest('.esc-montanha') as HTMLElement | null
    if (!caixa) return
    const alvo = minha.current
    if (alvo) caixa.scrollTop = Math.max(0, alvo.offsetTop + (parede.current?.offsetTop ?? 0) - caixa.clientHeight * 0.45)
    else if (chamadaBase) caixa.scrollTop = caixa.scrollHeight
  }, [pontos, chamadaBase])

  const irPara = (onde: 'eu' | 'cume') => {
    const caixa = parede.current?.closest('.esc-montanha') as HTMLElement | null
    if (!caixa) return
    const destino = onde === 'cume' ? 0 : minha.current ? minha.current.offsetTop + (parede.current?.offsetTop ?? 0) - caixa.clientHeight * 0.45 : caixa.scrollHeight
    caixa.scrollTo({ top: Math.max(0, destino), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  useEffect(() => {
    const ir = (ev: Event) => irPara((ev as CustomEvent<'eu' | 'cume'>).detail)
    window.addEventListener('escalada:ir', ir)
    return () => window.removeEventListener('escalada:ir', ir)
  })

  const caminho = (amp: number, base: number) => pontos.map((p, i) => `${i ? 'L' : 'M'}${(base + amp * p.s).toFixed(2)} ${p.y}`).join(' ')
  const guia = (
    <a className="esc-guia" href={href(visitante ? '/conta?modo=criar&voltar=%2Franking' : '/treinar')} aria-label={visitante ? 'Criar conta para começar a subir' : 'Treinar para subir no ranking'}>
      <span className="esc-guia__balao" role="status">{missao}<span className="esc-guia__acao">{visitante ? 'Criar conta' : 'Treinar agora'} <Icone nome="direita" tamanho={13} /></span></span>
      <Mascote className="esc-guia__mascote" comportamento="alongar" fantasia="nenhuma" falar={false} interativo={false} />
    </a>
  )

  return (
    <div className={`esc-montanha esc-montanha--${periodo}`} style={{ '--esc-rocha': urlCss(`pixel/paginas/montanha-rocha-${periodo}.webp`) } as CSSProperties} tabIndex={0} aria-label="A montanha do ranking: role para subir ou descer">
      {/* O cume: os três primeiros nas bandeiras do alto. */}
      <section className="esc-cume" aria-label="Top 3">
        <img className="esc-cume__arte" src={recurso(`pixel/paginas/montanha-cume-${periodo}.webp`)} srcSet={`${recurso(`pixel/paginas/montanha-cume-${periodo}-960.webp`)} 960w, ${recurso(`pixel/paginas/montanha-cume-${periodo}.webp`)} 1440w`} sizes="(max-width: 60rem) 100vw, 60rem" width={1440} height={600} alt="" decoding="async" />
        <ol className="esc-cume__lugares">
          {cume.map((e) => (
            <li key={e.posicao} className={`esc-lugar esc-lugar--${e.posicao}${e.eh_voce ? ' esc-lugar--voce' : ''}`}>
              <span className="esc-lugar__medalha" aria-hidden="true">{e.posicao}º</span>
              {conteudo(e)}
            </li>
          ))}
        </ol>
      </section>

      {/* A parede: a trilha passa por cada bandeira; o espaço entre elas é a diferença de questões. */}
      <div ref={parede} className="esc-parede" style={{ height: altura }}>
        <svg className="esc-trilha esc-trilha--larga" viewBox={`0 0 100 ${altura}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={`M50 0 L${(50 + 26 * (pontos[0]?.s ?? 0)).toFixed(2)} ${pontos[0]?.y ?? 0} ` + caminho(26, 50).slice(1)} />
        </svg>
        <svg className="esc-trilha esc-trilha--estreita" viewBox={`0 0 100 ${altura}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={`M14 0 ` + caminho(5, 14).replace(/^M/, 'L')} />
        </svg>
        <ol className="esc-bandeiras">
          {pontos.map(({ e, y, s, dif }, i) => (
            <li key={e.posicao} ref={e.eh_voce ? minha : undefined}
              className={`esc-marco${e.eh_voce ? ' esc-marco--voce' : ''}${e.subiu > 0 ? ' esc-marco--subindo' : ''}${s > 0 ? ' esc-marco--esq' : ''}`}
              style={{ top: y, '--s': s.toFixed(3) } as CSSProperties}>
              {i > 0 && dif >= 25 && <span className="esc-distancia" style={{ height: y - pontos[i - 1].y }} aria-hidden="true"><span>{dif.toLocaleString('pt-BR')} questões</span></span>}
              <span className="esc-marco__pino" aria-hidden="true"><span className="esc-marco__pos numerico">{e.posicao}</span></span>
              {e.subiu > 0 && <span className="esc-marco__vento" aria-hidden="true"><i /><i /><i /></span>}
              <div className="esc-marco__cartao">{conteudo(e)}</div>
              {e.eh_voce && guia}
            </li>
          ))}
        </ol>
      </div>

      {/* O acampamento base: quem ainda não está na montanha visível começa aqui. */}
      <footer className="esc-base">
        {!eu && chamadaBase && <div className="esc-base__guia">{guia}<p className="esc-base__texto">{chamadaBase}</p></div>}
        {rodape}
        <p className="esc-base__placa"><Icone nome="rota" tamanho={15} /> Acampamento base · todo mundo começa aqui</p>
      </footer>
    </div>
  )
}
