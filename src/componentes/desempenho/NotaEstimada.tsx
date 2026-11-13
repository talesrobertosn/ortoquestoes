import { Icone } from '../Icone'
import { href } from '../../util/rotas'
import { MINIMO_NOTA, META_TEMA, type ComparacaoTurma, type NotaEstimada as Nota, type ResumoIndicado } from '../../dados/desempenho'

/*
 * Nota estimada na prova (14/11/2026). Fica no painel do topo, ao lado da mensagem e dos números (Tales: "junto com o
 * primeiro painel que tem a arte"), nas cores da página: o verde e o azul-ardósia da SBOT sobre o branco. Um
 * mostrador de 0 a 100 com a faixa provável num anel de fora; logo abaixo do painel, os temas que mais sobem a nota,
 * cada um com os botões de treinar os erros e de ler o resumo indicado.
 */

const R = 92, CX = 110, CY = 112
const ponto = (v: number, r = R) => {
  const a = Math.PI * (1 - v / 100)
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const
}
const arco = (de: number, ate: number, r = R) => {
  const [x1, y1] = ponto(de, r), [x2, y2] = ponto(ate, r)
  return `M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`
}
const ROTULO_CONFIANCA = { alta: 'Estimativa firme', media: 'Estimativa razoável', baixa: 'Estimativa inicial' } as const

export function NotaEstimadaCartao({ nota, base, turma, exemplo = false }: {
  nota: Nota | null; base: number; turma: ComparacaoTurma | null; resumos?: Map<string, ResumoIndicado>; exemplo?: boolean
}) {
  if (!nota) {
    const falta = Math.max(0, MINIMO_NOTA - base)
    return (
      <div className="dp-nota dp-nota--vazia" aria-labelledby="dp-nota-titulo">
        <p className="dp-rotulo"><Icone nome="alvo" tamanho={14} /> Nota estimada na prova</p>
        <h2 id="dp-nota-titulo">Faltam <b>{falta}</b> {falta === 1 ? 'questão nova' : 'questões novas'} para a primeira estimativa</h2>
        <div className="dp-nota__progresso" role="img" aria-label={`${base} de ${MINIMO_NOTA} questões novas`}><span style={{ width: `${Math.min(100, (base / MINIMO_NOTA) * 100)}%` }} /></div>
        <p>A nota sai do seu acerto de primeira vez em cada tema, pesado por quanto o tema cai nas provas oficiais.</p>
        <span className="dp-nota__acoes">
          <a className="dp-botao dp-botao--principal" href={href('/treinar?situacao=naoRespondidas&limite=10')}>Fazer 10 questões novas</a>
          <a className="dp-botao dp-botao--contorno" href={href('/dados?exemplo=1')}><Icone nome="olho" tamanho={15} /> Ver um exemplo</a>
        </span>
      </div>
    )
  }
  const [px, py] = ponto(nota.nota)
  return (
    <div className="dp-nota" aria-labelledby="dp-nota-titulo">
      <p className="dp-rotulo"><Icone nome="alvo" tamanho={14} /> Nota estimada na prova {exemplo && <span className="dp-chip">exemplo</span>}</p>
      <div className="dp-nota__mostrador">
        <svg viewBox="-12 -14 244 146" className="dp-nota__arco" role="img" aria-labelledby="dp-nota-titulo dp-nota-faixa">
          <path d={arco(0, 100)} className="dp-nota__trilho" />
          <path d={arco(0, nota.nota)} className="dp-nota__valor" />
          <path d={arco(nota.baixa, nota.alta, R + 14)} className="dp-nota__faixa" />
          {[nota.baixa, nota.alta].map((v) => { const [a1, b1] = ponto(v, R + 9), [a2, b2] = ponto(v, R + 19); return <line key={v} x1={a1} y1={b1} x2={a2} y2={b2} className="dp-nota__faixa" /> })}
          {[0, 50, 100].map((v) => { const [x, y] = ponto(v); return <text key={v} x={x} y={y + 18} textAnchor="middle" className="dp-nota__tique">{v}</text> })}
          <circle cx={px} cy={py} r={9} className="dp-nota__ponta" />
        </svg>
        <h2 id="dp-nota-titulo" className="dp-nota__numero"><span className="so-leitor">Nota estimada: </span><b>{nota.nota}</b><small>de 100</small></h2>
      </div>
      <p id="dp-nota-faixa" className="dp-nota__faixa-texto">Provável entre <b>{nota.baixa}</b> e <b>{nota.alta}</b></p>
      <p className="dp-nota__base"><span className={`dp-chip dp-chip--${nota.confianca}`}>{ROTULO_CONFIANCA[nota.confianca]}</span> {nota.base.toLocaleString('pt-BR')} respostas de primeira vez · temas com dados somam {nota.cobertura}% da prova</p>
      {turma && <p className={'dp-nota__turma' + (turma.diferenca >= 0 ? ' dp-nota__turma--acima' : '')}>
        <Icone nome={turma.diferenca >= 0 ? 'cima' : 'baixo'} tamanho={15} />
        <span><b>{turma.diferenca === 0 ? 'Igual à turma' : `${Math.abs(turma.diferenca)} ${Math.abs(turma.diferenca) === 1 ? 'ponto' : 'pontos'} ${turma.diferenca > 0 ? 'acima' : 'abaixo'} da turma`}</b> nas mesmas questões</span>
      </p>}
    </div>
  )
}

/** Os temas que mais sobem a nota se chegarem a 80%, com os botões de treinar os erros e de ler o resumo. */
export function SobeNota({ nota, resumos }: { nota: Nota; resumos: Map<string, ResumoIndicado> }) {
  const sobe = nota.areas.filter((a) => a.ganho >= 0.3).slice(0, 3)
  return (
    <div className="dp-sobe" aria-labelledby="dp-sobe-titulo">
      <div className="dp-sobe__cabeca">
        <h3 id="dp-sobe-titulo">O que mais sobe a sua nota</h3>
        <p>Quanto a nota ganha se cada tema chegar a {Math.round(META_TEMA * 100)}% de acerto. O peso é a fatia do tema nas provas.</p>
      </div>
      {sobe.length === 0 ? <p className="dp-sobe__vazio">Todos os temas já estão perto de {Math.round(META_TEMA * 100)}%. Agora é manter com revisões.</p> :
        <ol className="dp-sobe__lista">{sobe.map((a) => {
          const resumo = resumos.get(a.slug)
          return <li key={a.slug} className="dp-sobe__item">
            <span className="dp-sobe__ganho"><b>+{a.ganho.toFixed(1).replace('.', ',')}</b><small>pontos</small></span>
            <span className="dp-sobe__tema">
              <strong>{a.nome}</strong>
              <span>{a.n >= 5 ? `Você acerta ${Math.round((a.certas / a.n) * 100)}% de primeira` : 'Ainda poucas respostas'} · {a.peso.toLocaleString('pt-BR')}% da prova</span>
              {resumo && <span className="dp-sobe__resumo"><Icone nome="livro" tamanho={13} /> {resumo.capitulo.titulo}</span>}
            </span>
            <span className="dp-sobe__acoes">
              <a className="dp-botao dp-botao--principal dp-botao--pequeno" href={href(`/treinar?temas=${a.slug}&situacao=erradas&limite=10`)}><Icone nome="alvo" tamanho={15} /> Treinar erros</a>
              {resumo && <a className="dp-botao dp-botao--contorno dp-botao--pequeno" href={href(`/resumos/${resumo.capitulo.id}`)} title={resumo.capitulo.titulo}><Icone nome="livro" tamanho={15} /> Ler o resumo</a>}
            </span>
          </li>
        })}</ol>}
      <p className="dp-sobe__aviso">Estimativa pelo seu desempenho e pelo peso de cada tema nas provas oficiais (TEOT, TARO, TECOC e ENARE). Não é a nota da prova.</p>
    </div>
  )
}
