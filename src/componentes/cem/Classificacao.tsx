import { memo, useEffect, useRef, useState } from 'react'
import { href } from '../../util/rotas'
import { recurso } from '../../config'
import { Icone } from '../Icone'
import { EmblemasDoNome, Fogueira } from '../Inventario'
import { SeloServico } from '../ServicoRanking'
import { MovimentoSelo } from './Movimento'
import { FOGO_NA_SEMANA, FOGO_NO_DIA, TOP_LISTA, TOP_MAXIMO, iniciais, type LinhaRanking, type Periodo } from './regras'

const rolar = (el: Element | null) => {
  if (!el) return
  const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'center' })
}

/** Uma linha da classificação: posição, movimento, iniciais, nome e selos, pontuação com a barra do líder. */
const Linha = memo(function Linha({ linha, lider, semana }: { linha: LinhaRanking; lider: number; semana: boolean }) {
  const proporcao = Math.max(0.02, linha.total / Math.max(1, lider))
  return <li id={linha.eh_voce ? 'cem-eu' : undefined} tabIndex={linha.eh_voce ? -1 : undefined}
    className={'cem-linha' + (linha.eh_voce ? ' cem-linha--voce' : '') + (linha.posicao <= 10 ? ' cem-linha--dez' : '')}>
    <span className="cem-linha__pos numerico"><span className="so-leitor">Posição </span>{linha.posicao}</span>
    <span className="cem-linha__mov"><MovimentoSelo linha={linha} /></span>
    <span className="cem-linha__avatar" aria-hidden="true">{iniciais(linha.apelido)}</span>
    <span className="cem-linha__quem">
      <span className="cem-linha__nome">{linha.apelido}{linha.eh_voce && <span className="cem-voce">você</span>}</span>
      <span className="cem-linha__selos">
        <EmblemasDoNome ids={linha.emblemas} totalGeral={linha.total_geral} tamanho={24} />
        <Fogueira dias={linha.sequencia ?? 0} tamanho={18} />
        <SeloServico servico={linha.servico} />
        {linha.eh_voce && <a className="cem-escolher" href={href('/conquistas?escolher=1')}><Icone nome="estrela" tamanho={12} /> {linha.emblemas?.length ? 'Trocar emblemas' : 'Escolher emblemas'}</a>}
      </span>
    </span>
    <span className="cem-linha__placar">
      <b className="numerico">{linha.total.toLocaleString('pt-BR')}</b>
      <small>{semana ? 'na semana' : 'questões'}</small>
      <span className="cem-linha__barra" aria-hidden="true"><span style={{ transform: `scaleX(${proporcao})` }} /></span>
    </span>
  </li>
})

/**
 * A Classificação dos Cem: a lista do 4º lugar em diante (o Top 3 está no salão), Top 50 de início e até o Top 100 a
 * pedido. Quem está fora do Top 100 aparece no fim, depois de uma separação, porque o servidor manda a sua linha.
 * "Encontrar minha posição" abre a lista até a sua linha (se precisar) e rola até ela; "Voltar ao Top 3" sobe ao salão.
 */
export function Classificacao({ linhas, periodo, comMovimento, pedidoEncontrar }: {
  linhas: LinhaRanking[]; periodo: Periodo; comMovimento: boolean; pedidoEncontrar: number
}) {
  const [ate100, definirAte100] = useState(false)
  const semana = periodo === 'semana'
  const eu = linhas.find((l) => l.eh_voce) ?? null
  const top = linhas.filter((l) => l.posicao <= TOP_LISTA)
  const ate100Linhas = linhas.filter((l) => l.posicao > TOP_LISTA && l.posicao <= TOP_MAXIMO)
  const visiveis = (ate100 ? [...top, ...ate100Linhas] : top).filter((l) => l.posicao > 3)
  const foraDoTop = eu && eu.posicao > TOP_MAXIMO ? eu : null
  const lider = linhas.find((l) => l.posicao === 1)?.total ?? 1
  const comHistorico = linhas.some((l) => l.referencia_em || l.novo)
  const encontrar = useRef(0)

  const irParaMim = () => {
    if (!eu) return
    if (eu.posicao <= 3) { rolar(document.getElementById('cem-salao')); return }
    if (eu.posicao > TOP_LISTA && eu.posicao <= TOP_MAXIMO && !ate100) { definirAte100(true); encontrar.current = 2; return }
    const el = document.getElementById('cem-eu')
    rolar(el); (el as HTMLElement | null)?.focus({ preventScroll: true })
  }
  // Pedido de fora (o botão da jornada) ou depois de abrir até o Top 100: rola quando a linha já existe.
  useEffect(() => { if (pedidoEncontrar) irParaMim() }, [pedidoEncontrar]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (encontrar.current === 2 && ate100) { encontrar.current = 0; const el = document.getElementById('cem-eu'); rolar(el); (el as HTMLElement | null)?.focus({ preventScroll: true }) }
  }, [ate100])

  if (!visiveis.length && !foraDoTop) return null
  const ultima = visiveis.length ? visiveis[visiveis.length - 1].posicao : 0
  return <section className="cem-lista" aria-labelledby="cem-lista-t" id="cem-lista">
    <header className="cem-lista__cabeca">
      <div>
        <h2 id="cem-lista-t">Classificação dos Cem</h2>
        <p className="cem-lista__faixa numerico">{visiveis.length ? `#${visiveis[0].posicao} a #${ultima}` : ''} · {semana ? 'questões nos últimos 7 dias' : 'questões respondidas'}</p>
      </div>
      <div className="cem-lista__acoes">
        {eu && <button type="button" className="botao cem-lista__botao" onClick={irParaMim}><Icone nome="alvo" tamanho={15} /> Encontrar minha posição</button>}
        <button type="button" className="botao botao--fantasma cem-lista__botao" onClick={() => rolar(document.getElementById('cem-salao'))}><Icone nome="trofeu" tamanho={15} /> Voltar ao Top 3</button>
      </div>
    </header>

    {comMovimento && !comHistorico && <p className="cem-legenda cem-legenda--inicio">
      <Icone nome="relogio" tamanho={14} /> As setas de subida e descida e a chama aparecem a partir de amanhã: hoje o ranking registra as posições de referência.
    </p>}
    {comMovimento && comHistorico && <details className="cem-legenda">
      <summary><Icone nome="interrogacao" tamanho={14} /> Como ler o movimento</summary>
      <ul>
        <li><b className="cem-mov cem-mov--subiu"><Icone nome="cima" tamanho={12} />2</b> subiu duas posições</li>
        <li><b className="cem-mov cem-mov--desceu"><Icone nome="baixo" tamanho={12} />1</b> desceu uma posição</li>
        <li><b className="cem-mov cem-mov--igual">=</b> mesma posição</li>
        <li><b className="cem-mov cem-mov--fogo"><img src={recurso('ranking/cem/chama-16.png')} alt="" width={16} height={16} className="cem-legenda__chama" /></b> em chamas: {FOGO_NO_DIA}+ posições no dia ou {FOGO_NA_SEMANA}+ na semana</li>
        <li><b className="cem-mov cem-mov--novo">novo</b> acabou de entrar</li>
      </ul>
      <small>Comparação com o último dia registrado, igual em todos os aparelhos.</small>
    </details>}

    <ol className="cem-linhas" aria-label={`Classificação, ${semana ? 'últimos 7 dias' : 'geral'}`}>
      {visiveis.map((linha) => <Linha key={linha.posicao} linha={linha} lider={lider} semana={semana} />)}
    </ol>

    {ate100Linhas.length > 0 && <button type="button" className="botao cem-mais" aria-expanded={ate100} onClick={() => definirAte100(!ate100)}>
      <Icone nome={ate100 ? 'cima' : 'baixo'} tamanho={16} /> {ate100 ? 'Mostrar apenas o Top 50' : 'Mostrar até o Top 100'}
    </button>}

    {foraDoTop && <>
      <p className="cem-lista__intervalo" aria-hidden="true"><span>⋯</span></p>
      <ol className="cem-linhas cem-linhas--eu" aria-label="Sua posição">
        <Linha linha={foraDoTop} lider={lider} semana={semana} />
      </ol>
    </>}
  </section>
}
