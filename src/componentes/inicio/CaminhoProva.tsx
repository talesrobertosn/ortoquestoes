import type { CSSProperties } from 'react'
import { recurso } from '../../config'
import type { CalculoPlano, PlanoSalvo } from '../../dados/planoEstudo'
import { diasAte, proximaProva } from '../../dados/ritmos'
import { href } from '../../util/rotas'
import { Icone } from '../Icone'
import { Mascote } from '../mascote/Mascote'

/**
 * O caminho até a prova, na base do topo do painel (16/10/2026): a linha do dia em
 * que o cronograma nasceu até a prova, as semanas como marcos, o mascote onde a
 * pessoa está hoje e a bandeira de chegada (pixel art de scripts/gerar_pixel_inicio.py).
 * Embaixo, hoje, amanhã e a projeção do plano, para o caminho ter conteúdo, não só forma.
 */
const DIA = 86400000
const curta = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }).replace('.', '')

export function CaminhoProva({ calculo, plano }: { calculo: CalculoPlano; plano: PlanoSalvo }) {
  const inicio = new Date(`${plano.criado_em.slice(0, 10)}T12:00:00Z`)
  const prova = new Date(`${plano.data_prova}T12:00:00Z`)
  const hoje = new Date()
  const total = Math.max(1, (prova.getTime() - inicio.getTime()) / DIA)
  const andado = Math.min(1, Math.max(0, (hoje.getTime() - inicio.getTime()) / DIA / total))
  const pct = Math.round(andado * 1000) / 10
  const semanas = Math.max(1, calculo.semanasTotal)
  const marcos = semanas <= 40 ? Array.from({ length: semanas - 1 }, (_, i) => (i + 1) / semanas) : []
  const ritmo = Math.round(calculo.ritmo)
  const chip = ritmo >= 5 ? { classe: 'adiantado', texto: `Adiantado ${ritmo}%` } : ritmo <= -5 ? { classe: 'atras', texto: 'Um pouco atrás · a meta já se ajusta' } : { classe: 'ritmo', texto: 'No ritmo do plano' }
  const amanha = calculo.amanha?.itens[0]?.nome
  const metaFeita = calculo.hoje && !calculo.faltaHoje && calculo.metaDiaria > 0

  return (
    <a className="ip-caminho" href={href('/cronograma')} aria-label={`Cronograma: semana ${calculo.semanaNumero} de ${semanas}, ${calculo.diasAteProva} dias até a prova. Abrir o cronograma`}>
      <div className="ip-caminho__cabeca">
        <span className="ip-caminho__selo"><Icone nome="rota" tamanho={15} /> Cronograma até a prova</span>
        <strong className="ip-caminho__semana">Semana {calculo.semanaNumero} <span>de {semanas}</span></strong>
        <span className={`ip-caminho__chip ip-caminho__chip--${chip.classe}`}>{chip.texto}</span>
        <span className="ip-caminho__abrir">Abrir o cronograma <Icone nome="direita" tamanho={15} /></span>
      </div>

      <div className="ip-trilha" style={{ '--andado': `${pct}%` } as CSSProperties}>
        <span className="ip-trilha__linha" aria-hidden="true"><span className="ip-trilha__feito" /></span>
        {marcos.map((m, i) => (
          <span key={i} className={`ip-trilha__marco${m <= andado ? ' ip-trilha__marco--feito' : ''}`} style={{ left: `${m * 100}%` }} aria-hidden="true" />
        ))}
        <span className="ip-trilha__inicio" aria-hidden="true"><i /><small>Início · {curta(inicio)}</small></span>
        <span className="ip-trilha__voce" aria-hidden="true">
          <Mascote className="ip-trilha__mascote" comportamento="acenar" falar={false} interativo={false} />
          <small>Hoje</small>
        </span>
        <span className="ip-trilha__prova" aria-hidden="true">
          <img src={recurso('pixel/inicio/prova.png')} width={52} height={60} alt="" />
          <small>Prova · {curta(prova)}</small>
        </span>
      </div>

      <dl className="ip-caminho__fatos">
        <div>
          <dt>Hoje</dt>
          <dd>{calculo.hoje ? <>{calculo.hoje.nome} · {metaFeita ? <b className="ip-caminho__ok"><Icone nome="certo" tamanho={13} /> meta cumprida</b> : <b>{calculo.feitasHoje} de {calculo.metaDiaria}</b>}</> : 'Dia de folga no plano'}</dd>
        </div>
        <div>
          <dt>Amanhã</dt>
          <dd>{amanha ?? 'Folga ou revisão'}</dd>
        </div>
        <div>
          <dt>Faltam</dt>
          <dd><b>{calculo.diasAteProva} dias</b> para a prova</dd>
        </div>
        {calculo.projecao.maisCaiPct > 0 && (
          <div>
            <dt>No ritmo do plano</dt>
            <dd><b>{Math.min(100, Math.round(calculo.projecao.maisCaiPct))}%</b> do que mais cai até a prova</dd>
          </div>
        )}
      </dl>
    </a>
  )
}

/**
 * Quem ainda não tem cronograma vê o mesmo caminho, vazio: hoje no início, a próxima prova
 * teórica do TEOT no fim e o convite para montar (assinante) ou ver um exemplo (gratuito).
 */
export function CaminhoConvite({ premium }: { premium: boolean }) {
  const data = proximaProva()
  const dias = diasAte(data)
  const prova = new Date(`${data}T12:00:00Z`)
  return (
    <a className="ip-caminho ip-caminho--convite" href={href('/cronograma')}>
      <div className="ip-caminho__cabeca">
        <span className="ip-caminho__selo"><Icone nome="rota" tamanho={15} /> Cronograma até a prova</span>
        <strong className="ip-caminho__semana">Faltam {dias} dias <span>para a prova teórica do TEOT</span></strong>
        <span className="ip-caminho__abrir">{premium ? 'Montar meu cronograma' : 'Ver um exemplo com o meu histórico'} <Icone nome="direita" tamanho={15} /></span>
      </div>
      <div className="ip-trilha" style={{ '--andado': '0%' } as CSSProperties}>
        <span className="ip-trilha__linha" aria-hidden="true" />
        <span className="ip-trilha__inicio" aria-hidden="true"><i /><small>Hoje</small></span>
        <span className="ip-trilha__voce" aria-hidden="true">
          <Mascote className="ip-trilha__mascote" comportamento="acenar" falar={false} interativo={false} />
          <small>Você</small>
        </span>
        <span className="ip-trilha__convite" aria-hidden="true">Diga a data e o seu tempo: o caminho de cada dia aparece aqui, passando primeiro pelo que mais cai.</span>
        <span className="ip-trilha__prova" aria-hidden="true">
          <img src={recurso('pixel/inicio/prova.png')} width={52} height={60} alt="" />
          <small>Prova · {curta(prova)}</small>
        </span>
      </div>
      {!premium && <p className="ip-caminho__nota">Ver o exemplo é grátis; criar e seguir o seu é do assinante.</p>}
    </a>
  )
}
