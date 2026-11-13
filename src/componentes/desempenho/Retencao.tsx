import type { CSSProperties } from 'react'
import { Icone } from '../Icone'
import { href } from '../../util/rotas'
import { DIAS_CONSOLIDAR, intervalo, MINIMO_LEITURA, type EstadoRetencao, type ResumoIndicado } from '../../dados/desempenho'

/*
 * Erros e retenção (14/11/2026): "acertei uma vez depois de errar" diz pouco. Cada questão errada fica num de quatro
 * estados (erro novo, recuperada, consolidada, reincidente), mostrados como um funil; os erros marcados com certeza
 * ganham destaque próprio (o erro que a pessoa não sabe que tem); e os resumos que mais cobrem os erros vêm logo
 * abaixo, para ler antes de refazer.
 */

const ESTADOS: Array<[Exclude<EstadoRetencao, 'nunca_errou'>, string, string]> = [
  ['erro_novo', 'Erros novos', 'Errou e ainda não acertou de novo.'],
  ['recuperada', 'Recuperadas', `Acertou depois do erro, há menos de ${DIAS_CONSOLIDAR} dias. Ainda pode escapar.`],
  ['consolidada', 'Consolidadas', `Acertou de novo ${DIAS_CONSOLIDAR} dias ou mais depois do erro. Isso é aprendizado.`],
  ['reincidente', 'Reincidentes', 'Já tinha acertado e errou de novo. O ponto que mais engana.'],
]

export function Retencao({ conta, erradas, onRevisar }: {
  conta: Record<EstadoRetencao, number>; erradas: number; onRevisar: (estado: EstadoRetencao) => void
}) {
  if (!erradas) return <section className="ds-cartao"><div className="ds-cartao__cabeca"><h3>Erros e retenção</h3></div><p className="ds-vazio">Nenhum erro registrado ainda. Quando errar uma questão, ela aparece aqui até ficar consolidada.</p></section>
  const consolidadas = conta.consolidada
  const taxa = Math.round((consolidadas / erradas) * 100)
  return (
    <section className="ds-cartao rt" aria-labelledby="rt-titulo">
      <div className="ds-cartao__cabeca">
        <h3 id="rt-titulo">O que você errou e já fixou</h3>
        <p>Das {erradas.toLocaleString('pt-BR')} questões que você já errou alguma vez, <b>{taxa}%</b> estão consolidadas: acertadas de novo {DIAS_CONSOLIDAR} dias ou mais depois do erro.</p>
      </div>
      <ol className="rt__funil">
        {ESTADOS.map(([estado, rotulo, ajuda]) => {
          const n = conta[estado]
          const p = erradas ? n / erradas : 0
          return <li key={estado} className={`rt__etapa rt__etapa--${estado}`} style={{ '--p': `${Math.max(2, p * 100)}%` } as CSSProperties}>
            <span className="rt__barra" aria-hidden="true"><i /></span>
            <span className="rt__texto"><strong><b className="ds-num">{n.toLocaleString('pt-BR')}</b> {rotulo}</strong><small>{ajuda}</small></span>
            {n > 0 && estado !== 'consolidada' && <button type="button" className="rt__acao" onClick={() => onRevisar(estado)}>Refazer {Math.min(20, n)} <Icone nome="direita" tamanho={14} /></button>}
          </li>
        })}
      </ol>
    </section>
  )
}

/** Erros com certeza: a última resposta foi erro e a pessoa marcou "certeza". */
export function ErrosComCerteza({ ids, porConfianca, onRevisar }: {
  ids: string[]; porConfianca: Record<'seguro' | 'duvida' | 'chute', { certas: number; total: number }>; onRevisar: () => void
}) {
  const linhas = ([['seguro', 'Certeza', 'certo'], ['duvida', 'Dúvida', 'olho'], ['chute', 'Chute', 'interrogacao']] as const)
  return (
    <section className="ds-cartao cf" aria-labelledby="cf-titulo">
      <div className="ds-cartao__cabeca">
        <h3 id="cf-titulo">Sua sensação combina com o resultado?</h3>
        <p>Acerto pelo que você marcou ao responder. Com menos de {MINIMO_LEITURA} respostas, a porcentagem ainda não diz muito.</p>
      </div>
      {ids.length > 0 && <div className="cf__alarme">
        <span className="cf__icone" aria-hidden="true"><Icone nome="alerta" tamanho={20} /></span>
        <div>
          <strong>{ids.length} {ids.length === 1 ? 'questão errada com certeza' : 'questões erradas com certeza'}</strong>
          <span>É o erro mais perigoso: você tinha certeza e a prova diria o contrário. Vale ler o comentário com calma.</span>
        </div>
        <button type="button" className="botao botao--principal" onClick={onRevisar}>Revisar {Math.min(20, ids.length)}</button>
      </div>}
      <div className="cf__linhas">
        {linhas.map(([tipo, rotulo, icone]) => {
          const g = porConfianca[tipo]
          const p = g.total ? Math.round((g.certas / g.total) * 100) : null
          const [lo, hi] = intervalo(g.certas, g.total)
          const pouco = g.total < MINIMO_LEITURA
          return <div className={'cf__linha' + (pouco ? ' cf__linha--pouco' : '')} key={tipo}>
            <span className="cf__rotulo"><Icone nome={icone} tamanho={16} /> {rotulo}</span>
            <span className="as-barra__trilho" aria-hidden="true">
              {g.total > 0 && <i className="as-barra__margem" style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%` }} />}
              <i className="as-barra__valor" style={{ width: `${p ?? 0}%` }} />
            </span>
            <span className="cf__valor ds-num"><strong>{p === null ? '–' : `${p}%`}</strong> <small>{g.total} {g.total === 1 ? 'resposta' : 'respostas'}{pouco && g.total ? ' · poucos dados' : ''}</small></span>
          </div>
        })}
      </div>
    </section>
  )
}

/** Resumos que mais cobrem as questões que você errou. */
export function ResumosIndicados({ lista, titulo = 'Leia antes de refazer' }: { lista: ResumoIndicado[]; titulo?: string }) {
  if (!lista.length) return null
  return (
    <section className="ds-cartao ri" aria-labelledby="ri-titulo">
      <div className="ds-cartao__cabeca">
        <h3 id="ri-titulo"><Icone nome="livro" tamanho={18} /> {titulo}</h3>
        <p>Os resumos da Biblioteca que mais cobrem as questões que você errou: citam a própria questão ou ensinam o assunto dela.</p>
      </div>
      <ul className="ri__lista">
        {lista.map((r, i) => <li key={r.capitulo.id} style={{ '--i': i } as CSSProperties}>
          <a className="ri__livro" href={href(`/resumos/${r.capitulo.id}`)}>
            <span className="ri__lombada" aria-hidden="true" />
            <span className="ri__texto">
              <small>{r.capitulo.livro}</small>
              <strong>{r.capitulo.titulo}</strong>
              <span>Cobre <b>{r.cobre}</b> {r.cobre === 1 ? 'questão que você errou' : 'questões que você errou'}{r.assuntos.length ? ` · ${r.assuntos.join(', ')}` : ''}</span>
            </span>
            <span className="ri__min ds-num">{r.capitulo.minutos} min{r.capitulo.acesso === 'assinante' ? <Icone nome="cadeado" tamanho={12} /> : null}</span>
          </a>
        </li>)}
      </ul>
    </section>
  )
}

