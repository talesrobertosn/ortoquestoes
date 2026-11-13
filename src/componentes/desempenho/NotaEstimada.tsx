import type { CSSProperties } from 'react'
import { Icone } from '../Icone'
import { href } from '../../util/rotas'
import { MINIMO_NOTA, META_TEMA, type ComparacaoTurma, type NotaEstimada as Nota, type ResumoIndicado } from '../../dados/desempenho'

/*
 * Nota estimada na prova (14/11/2026, Tales: "dar um destaque"). Um mostrador de 0 a 100 com a faixa provável
 * pintada no arco, a nota no centro e, ao lado, os três temas que mais sobem a nota se chegarem a 80%, cada um
 * com treinar os erros e o resumo indicado. Sem respostas suficientes, o mostrador vira uma barra de progresso
 * até a primeira estimativa.
 */

const R = 92, CX = 110, CY = 112
/** Ponto do arco de 180° (da esquerda, 0, para a direita, 100). */
const ponto = (v: number, r = R) => {
  const a = Math.PI * (1 - v / 100)
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const
}
const arco = (de: number, ate: number, r = R) => {
  const [x1, y1] = ponto(de, r), [x2, y2] = ponto(ate, r)
  return `M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`
}
const ROTULO_CONFIANCA = { alta: 'Estimativa firme', media: 'Estimativa razoável', baixa: 'Estimativa inicial' } as const

export function NotaEstimadaCartao({ nota, base, turma, resumos, exemplo = false }: {
  nota: Nota | null; base: number; turma: ComparacaoTurma | null; resumos: Map<string, ResumoIndicado>; exemplo?: boolean
}) {
  if (!nota) {
    const falta = Math.max(0, MINIMO_NOTA - base)
    return (
      <section className="ne ne--vazia" aria-labelledby="ne-titulo">
        <div className="ne__cabeca">
          <p className="ne__selo"><Icone nome="alvo" tamanho={14} /> Nota estimada na prova</p>
          <h2 id="ne-titulo">Faltam {falta} {falta === 1 ? 'questão nova' : 'questões novas'} para a primeira estimativa</h2>
          <p>A nota sai do seu acerto de primeira vez em cada tema, pesado por quanto o tema cai nas provas oficiais. Questões que você já tinha visto não contam.</p>
        </div>
        <div className="ne__progresso" role="img" aria-label={`${base} de ${MINIMO_NOTA} questões novas`}>
          <span style={{ width: `${Math.min(100, (base / MINIMO_NOTA) * 100)}%` }} />
        </div>
        <a className="botao botao--principal" href={href('/treinar?situacao=naoRespondidas&limite=10')}>Fazer 10 questões novas <Icone nome="direita" tamanho={16} /></a>
      </section>
    )
  }
  const sobe = nota.areas.filter((a) => a.ganho >= 0.3).slice(0, 3)
  const [px, py] = ponto(nota.nota)
  return (
    <section className="ne" aria-labelledby="ne-titulo">
      <div className="ne__mostrador">
        <p className="ne__selo"><Icone nome="alvo" tamanho={14} /> Nota estimada na prova {exemplo && <span className="ne__exemplo">exemplo</span>}</p>
        <svg viewBox="-12 -14 244 146" className="ne__arco" role="img" aria-labelledby="ne-titulo ne-faixa">
          <path d={arco(0, 100)} className="ne__trilho" />
          {/* A faixa provável: um anel de fora, com as pontas marcadas. */}
          <path d={arco(nota.baixa, nota.alta, R + 14)} className="ne__faixa" />
          {[nota.baixa, nota.alta].map((v) => { const [a1, b1] = ponto(v, R + 9), [a2, b2] = ponto(v, R + 19); return <line key={v} x1={a1} y1={b1} x2={a2} y2={b2} className="ne__faixa-ponta" /> })}
          <path d={arco(0, nota.nota)} className="ne__valor" />
          {[0, 50, 100].map((v) => { const [x, y] = ponto(v); return <text key={v} x={x} y={y + 16} textAnchor="middle" className="ne__tique">{v}</text> })}
          <circle cx={px} cy={py} r={7} className="ne__ponta" />
        </svg>
        <h2 id="ne-titulo" className="ne__nota"><span className="so-leitor">Nota estimada: </span><b>{nota.nota}</b><small> de 100</small></h2>
        <p id="ne-faixa" className="ne__faixa-texto">Provável entre <b>{nota.baixa}</b> e <b>{nota.alta}</b></p>
        <p className="ne__base"><span className={`ne__chip ne__chip--${nota.confianca}`}>{ROTULO_CONFIANCA[nota.confianca]}</span> {nota.base.toLocaleString('pt-BR')} respostas de primeira vez · temas com dados somam {nota.cobertura}% da prova</p>
        {turma && <p className={'ne__turma' + (turma.diferenca >= 0 ? ' ne__turma--acima' : '')}>
          <Icone nome={turma.diferenca >= 0 ? 'cima' : 'baixo'} tamanho={15} />
          {turma.diferenca === 0 ? 'Igual à turma' : `${Math.abs(turma.diferenca)} ${Math.abs(turma.diferenca) === 1 ? 'ponto' : 'pontos'} ${turma.diferenca > 0 ? 'acima' : 'abaixo'} da turma`} nas mesmas questões
        </p>}
      </div>
      <div className="ne__sobe">
        <h3>O que mais sobe a sua nota</h3>
        <p className="ne__sobe-ajuda">Se cada tema chegar a {Math.round(META_TEMA * 100)}% de acerto, quanto a nota ganha. O peso é a fatia do tema nas provas.</p>
        {sobe.length === 0 ? <p className="ne__sobe-ajuda">Todos os temas já estão perto de {Math.round(META_TEMA * 100)}%. Agora é manter com revisões.</p> :
          <ol className="ne__lista">{sobe.map((a, i) => {
            const resumo = resumos.get(a.slug)
            return <li key={a.slug} style={{ '--i': i } as CSSProperties}>
              <span className="ne__ganho"><b>+{a.ganho.toFixed(1).replace('.', ',')}</b><small>pontos</small></span>
              <span className="ne__tema">
                <strong>{a.nome}</strong>
                <span>{a.n >= 5 ? `você acerta ${Math.round((a.certas / a.n) * 100)}% de primeira` : 'ainda poucas respostas'} · {a.peso.toLocaleString('pt-BR')}% da prova</span>
                <span className="ne__acoes">
                  <a href={href(`/treinar?temas=${a.slug}&situacao=erradas&limite=10`)}><Icone nome="alvo" tamanho={14} /> Treinar erros</a>
                  {resumo && <a href={href(`/resumos/${resumo.capitulo.id}`)} title={resumo.capitulo.titulo}><Icone nome="livro" tamanho={14} /> Resumo: {resumo.capitulo.titulo}</a>}
                </span>
              </span>
            </li>
          })}</ol>}
        <p className="ne__aviso">Estimativa pelo seu desempenho e pelo peso de cada tema nas provas oficiais (TEOT, TARO, TECOC e ENARE). Não é a nota da prova.</p>
      </div>
    </section>
  )
}
