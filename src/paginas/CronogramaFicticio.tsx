import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Icone } from '../componentes/Icone'
import { href, navegar } from '../util/rotas'
import '../estilos/paginas/CronogramaFicticio.css'

/**
 * Cenário fictício do cronograma (pedido do Tales, 19/10/2026): quem não assina vê o painel do
 * assinante inteiro, legível e sem borrão, com um plano e um progresso de exemplo. Só a semana de
 * hoje fica aberta no calendário; o mês inteiro é do assinante. Nada aqui grava no plano da pessoa.
 * Tom (docs/marketing/PAGINA-DE-VENDAS-16-10.md): leve, sem preço, sem culpa; entregar antes de pedir.
 */

/** O que a pessoa tentou fazer no plano de exemplo. */
export type MotivoConvite = 'comecar' | 'puxar' | 'adiantar' | 'outro'

/** A faixa do topo: sempre à vista, sem botão de fechar. */
export function FaixaFicticio({ nome }: { nome: string }) {
  return (
    <aside className="cf-faixa" aria-label="Cenário fictício">
      <span className="cf-selo"><Icone nome="olho" tamanho={14} /> Cenário fictício</span>
      <p className="cf-faixa__texto">
        <strong>{nome ? `${nome}, assim` : 'Assim'} seria o seu cronograma se você assinasse.</strong>
        <span> A data é a do TEOT; o progresso e as questões feitas são de exemplo. Explore à vontade: nada aqui mexe nas suas respostas.</span>
      </p>
      <a className="botao botao--ouro cf-faixa__botao" href={href('/assinatura')}>Quero o meu cronograma <Icone nome="direita" tamanho={16} /></a>
    </aside>
  )
}

/** A etiqueta curta que acompanha o calendário. */
export function SeloFicticio() {
  return <span className="cf-selo cf-selo--calendario" title="Assim seria o seu cronograma se você assinasse"><Icone nome="olho" tamanho={13} /> Cenário fictício</span>
}

/**
 * No lugar do mês (ou de outra semana): uma folha de calendário em pixel com cadeado. Parada, ela
 * flutua; com o mouse por cima, levanta e inclina; no clique, o cadeado abre e só então vai aos planos.
 */
export function TravaCalendario({ mes, onde, aoVoltar }: { mes: string; onde: 'mes' | 'semana'; aoVoltar: () => void }) {
  const folha = useRef<HTMLAnchorElement>(null)
  const [abrindo, definirAbrindo] = useState(false)
  useEffect(() => {
    const el = folha.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(([e]) => el.classList.toggle('cf-folha--parada', !e.isIntersecting))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  function abrir(e: MouseEvent<HTMLAnchorElement>) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    e.preventDefault()
    if (abrindo) return
    definirAbrindo(true)
    setTimeout(() => navegar('/assinatura'), 520)
  }
  return (
    <div className="cf-trava" role="group" aria-labelledby="cf-trava-titulo">
      <div className="cf-trava__palco">
        <a ref={folha} className={'cf-folha' + (abrindo ? ' cf-folha--abrindo' : '')} href={href('/assinatura')} onClick={abrir} aria-hidden="true" tabIndex={-1}>
          <span className="cf-folha__flutua">
            <span className="cf-folha__argolas"><i /><i /></span>
            <span className="cf-folha__topo">{mes}</span>
            <span className="cf-folha__grade">{Array.from({ length: 28 }, (_, i) => <i key={i} className={i % 7 === 6 ? 'cf-folha__folga' : i === 9 ? 'cf-folha__hoje' : undefined} />)}</span>
            <span className="cf-cadeado"><span className="cf-cadeado__arco" /><span className="cf-cadeado__corpo"><i /></span></span>
          </span>
          <span className="cf-folha__chao" />
        </a>
      </div>
      <div className="cf-trava__texto">
        <h3 id="cf-trava-titulo">{onde === 'mes' ? 'O mês inteiro é do assinante' : 'As outras semanas são do assinante'}</h3>
        <p>No seu cronograma, cada dia até a prova aparece aqui, com a área, as questões e os marcos, e se ajusta sozinho quando você atrasa ou adianta.</p>
        <div className="cf-trava__acoes">
          <a className="botao botao--ouro" href={href('/assinatura')}>Conhecer os planos</a>
          <button type="button" className="botao botao--fantasma" onClick={aoVoltar}><Icone nome="esquerda" tamanho={16} /> Voltar para esta semana</button>
        </div>
      </div>
    </div>
  )
}

const TEXTOS: Record<MotivoConvite, { titulo: string; texto: string }> = {
  comecar: { titulo: 'Aqui começaria a sua sessão do dia', texto: 'No cronograma do assinante, este botão abre as questões de hoje, escolhidas com o seu histórico, e o que você fizer entra na conta do dia.' },
  puxar: { titulo: 'Aqui você puxaria esse dia', texto: 'No cronograma do assinante, dá para fazer hoje as questões de um dia que vem. Elas contam para aquele dia, e o resto do plano continua no lugar.' },
  adiantar: { titulo: 'Aqui você adiantaria os próximos dias', texto: 'No cronograma do assinante, o que você faz a mais hoje sai dos próximos dias, e a meta deles fica mais leve.' },
  outro: { titulo: 'Isto é do cronograma do assinante', texto: 'Neste cenário fictício, as sessões ficam de fora. Com a assinatura, cada botão daqui abre as questões montadas para você.' },
}

/** O convite gentil no lugar de uma sessão do plano de exemplo. */
export function ConviteFicticio({ motivo, nome, area, aoTreinar, aoFechar }: { motivo: MotivoConvite; nome: string; area: { slug: string; nome: string } | null; aoTreinar: (slug: string) => void; aoFechar: () => void }) {
  const caixa = useRef<HTMLDivElement>(null)
  const fechar = useRef(aoFechar)
  fechar.current = aoFechar
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null
    caixa.current?.querySelector<HTMLElement>('a, button')?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); fechar.current(); return }
      if (e.key !== 'Tab' || !caixa.current) return
      const itens = [...caixa.current.querySelectorAll<HTMLElement>('a[href], button')]
      const primeiro = itens[0], ultimo = itens[itens.length - 1]
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus() }
    }
    window.addEventListener('keydown', tecla)
    return () => { window.removeEventListener('keydown', tecla); antes?.focus?.() }
  }, [])
  const t = TEXTOS[motivo]
  return (
    <div className="cf-convite" onClick={(e) => { if (e.target === e.currentTarget) aoFechar() }}>
      <div className="cf-convite__caixa" ref={caixa} role="dialog" aria-modal="true" aria-labelledby="cf-convite-titulo" aria-describedby="cf-convite-texto">
        <button type="button" className="cf-convite__fechar" onClick={aoFechar} aria-label="Fechar e voltar ao exemplo"><Icone nome="fechar" tamanho={18} /></button>
        <span className="cf-selo"><Icone nome="olho" tamanho={14} /> Cenário fictício</span>
        <h2 id="cf-convite-titulo">{t.titulo}</h2>
        <p id="cf-convite-texto">{t.texto}</p>
        <div className="cf-convite__acoes">
          <a className="botao botao--ouro botao--grande" href={href('/assinatura')}>Conhecer os planos</a>
          {area && <button type="button" className="botao" onClick={() => aoTreinar(area.slug)}><Icone nome="raio" tamanho={16} /> Treinar 10 questões grátis</button>}
        </div>
        {area && <p className="cf-convite__nota">{nome ? `${nome}, as` : 'As'} 10 questões são de {area.nome}, no treino grátis, com as suas respostas de verdade, fora deste exemplo.</p>}
      </div>
    </div>
  )
}
