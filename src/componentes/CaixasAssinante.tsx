import { useEffect, useMemo, useState } from 'react'
import { conferirMetaCronograma } from '../conta/feitos'
import { usarPremium } from '../conta/premium'
import { obterPlano } from '../conta/cronograma'
import { NovidadeSimulados } from './NovidadeSimulados'
import { usarIndice } from '../dados/usarIndice'
import { TOP_ASSUNTOS, areaPorId } from '../dados/incidencia'
import { calcularPlano, type CalculoPlano, type PlanoSalvo } from '../dados/planoEstudo'
import { recurso } from '../config'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { CHAVE_SESSAO } from '../estado/sessao'
import type { EstadoSessao } from '../dados/tipos'
import { href } from '../util/rotas'
import { Icone } from './Icone'
import { Degustacao, SeloAssinante } from './Premium'
import { NivelCobranca } from './NivelCobranca'

/** Cronograma do assinante e o dia de hoje. Lido uma vez no início: a meta
 * vira a ação principal do topo, e a caixa do cronograma só aparece para quem
 * ainda não montou o seu (ou não assina). */
export function usarCronogramaHoje() {
  const { premium, logado } = usarPremium()
  const { indice } = usarIndice()
  const [respondidas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  const [plano, definirPlano] = useState<PlanoSalvo | null | undefined>(undefined)
  const [sessaoLocal] = usarArmazenado<EstadoSessao | null>(CHAVE_SESSAO, null)
  const pendente = sessaoLocal && !sessaoLocal.concluidaEm && sessaoLocal.origem === 'cronograma' && Object.keys(sessaoLocal.respostas).length < sessaoLocal.ids.length
    ? { feitas: Object.keys(sessaoLocal.respostas).length, total: sessaoLocal.ids.length } : null

  useEffect(() => {
    if (!premium) { definirPlano(null); return }
    let vivo = true
    obterPlano().then((p) => { if (vivo) definirPlano(p) }).catch(() => { if (vivo) definirPlano(null) })
    return () => { vivo = false }
  }, [premium])
  const calculo = useMemo(() => (indice && plano ? calcularPlano(indice, respondidas, plano) : null), [indice, plano, respondidas])
  useEffect(() => { if (premium) conferirMetaCronograma(calculo) }, [premium, calculo])
  return { premium, logado, calculo: premium ? calculo : null, pendente, plano: premium ? plano : null, definirPlano }
}
export type CronogramaHoje = ReturnType<typeof usarCronogramaHoje>

/** Início: os temas que mais caem. O cronograma tem cartão próprio, logo abaixo do topo. */
export function CaixasAssinante() {
  return (
    <div className="empilha cx-bloco">
      <CaixaTemas />
    </div>
  )
}

function CaixaTemas() {
  const { premium } = usarPremium()
  const visiveis = premium ? 6 : 2
  return (
    <section className="cx cx--temas" aria-labelledby="cx-temas-titulo">
      <header className="cx__cabeca">
        <span className="cx__icone" aria-hidden="true"><Icone nome="grafico" tamanho={20} /></span>
        <div>
          <h2 id="cx-temas-titulo">O que a prova mais cobra</h2>
        </div>
        {!premium && <SeloAssinante />}
      </header>
      <ol className="cx-top">
        {TOP_ASSUNTOS.slice(0, visiveis).map((t, i) => (
          <li key={`${t.area}-${t.nome}`}>
            <span className="cx-top__posicao numerico">{i + 1}</span>
            <span className="cx-top__nome"><strong>{t.rotulo}</strong><small>{areaPorId(t.area)?.nome}</small></span>
          </li>
        ))}
      </ol>
      {!premium && (
        <Degustacao className="dg--compacta" titulo="Os outros 18 assuntos e as 12 áreas" acao="Ver o ranking completo">
          <ol className="cx-top">
            {['Assunto guardado para assinantes', 'Outro assunto do ranking', 'Mais um assunto campeão'].map((nome, i) => (
              <li key={nome}><span className="cx-top__posicao numerico">{visiveis + i + 1}</span><span className="cx-top__nome"><strong>{nome}</strong><small>Área</small></span><NivelCobranca nivel={4} /></li>
            ))}
          </ol>
        </Degustacao>
      )}
      <a className="cx__link" href={href('/temas-que-mais-caem')}>{premium ? 'Ver o ranking completo e treinar' : 'Abrir o ranking'} <Icone nome="direita" tamanho={15} /></a>
    </section>
  )
}

const COMO_FUNCIONA = [
  { icone: 'calendario' as const, titulo: 'Você diz a data e o seu tempo', texto: 'A data da prova, quanto tempo tem por dia, as folgas e os dias de plantão.' },
  { icone: 'rota' as const, titulo: 'Ele monta o caminho', texto: 'Três passadas, a primeira pelo que mais cai em todas as áreas, com a lista de cada dia e o tempo de cada parte.' },
  { icone: 'reiniciar' as const, titulo: 'E se ajusta sozinho', texto: 'Atrasou, a meta sobe no máximo 25%; adiantou, alivia. Mini-simulado a cada duas semanas e reta final com revisão forte e modo prova.' },
]

/** Trilha da jornada: as semanas do cronograma como casas de um mapa de RPG, até a prova. */
function TrilhaJornada({ semanas }: { semanas: CalculoPlano['semanas'] }) {
  const atual = Math.max(0, semanas.findIndex((s) => s.atual))
  const inicio = Math.max(0, Math.min(atual - 2, semanas.length - 6))
  const janela = semanas.slice(inicio, inicio + 6)
  return (
    <ol className="cr-trilha" aria-label={`Semana ${atual + 1} de ${semanas.length}`}>
      {janela.map((_, i) => {
        const n = inicio + i
        const estado = n < atual ? 'feita' : n === atual ? 'atual' : 'futura'
        return (
          <li key={n} className={`cr-trilha__casa cr-trilha__casa--${estado}`}>
            {estado === 'atual' && <img className="cr-trilha__heroi" src={recurso('ranking/mensageiro.png')} width={32} height={40} alt="" />}
            <span className="cr-trilha__bloco">{estado === 'feita' ? <Icone nome="certo" tamanho={14} /> : n + 1}</span>
            <small>{estado === 'atual' ? 'agora' : `sem ${n + 1}`}</small>
          </li>
        )
      })}
      <li className="cr-trilha__casa cr-trilha__casa--prova">
        <img src={recurso('emblemas/podio-1.png')} width={34} height={34} alt="" />
        <small>prova</small>
      </li>
    </ol>
  )
}

/** Início: o cronograma em destaque, logo abaixo do topo. Quem não tem um vê como montar. */
export function CartaoCronograma({ cronograma }: { cronograma: CronogramaHoje }) {
  const { premium, logado, calculo, pendente, plano, definirPlano } = cronograma

  const titulo = (
    <div className="cr-destaque__texto">
      <p className="cr-destaque__selo"><Icone nome="rota" tamanho={15} /> {premium ? 'Sua jornada até a prova' : 'Novo para assinantes'}</p>
      <h2 id="cr-destaque-titulo" className="cr-destaque__nome">Cronograma</h2>
      <p className="cr-destaque__lide">{calculo
        ? (calculo.provaPassou ? 'A prova chegou. Boa sorte!' : <>Faltam <strong>{calculo.diasAteProva} dias</strong> para a sua prova. Siga a meta de hoje e o cronograma cuida do resto.</>)
        : 'Você não perde tempo decidindo o que estudar: ele mostra a lista de hoje, o que vem amanhã e as semanas até a prova, passando primeiro pelo que mais cai em todas as áreas. Um pouco por dia, e no dia da prova você chega pronto.'}</p>
    </div>
  )

  // Assinante com cronograma: o dia de hoje em destaque.
  if (premium && calculo) {
    const pct = calculo.metaDiaria ? Math.min(100, Math.round((calculo.feitasHoje / calculo.metaDiaria) * 100)) : 100
    return (
      <>
      <NovidadeSimulados plano={plano} aoMudarPlano={definirPlano} />
      <section className="cr-destaque cr-destaque--jornada" aria-labelledby="cr-destaque-titulo">
        <div className="cr-destaque__texto-trilha">
          {titulo}
          {calculo.semanas.length > 0 && <TrilhaJornada semanas={calculo.semanas} />}
        </div>
        <div className="cr-destaque__painel">
          <span className="cr-destaque__rotulo">Meta de hoje</span>
          <div className="cr-destaque__meta"><strong className="numerico">{calculo.feitasHoje}</strong><span>de {calculo.metaDiaria} questões</span></div>
          {calculo.metaDiaria > 0 && calculo.metaDiaria <= 40
            ? <span className="cr-blocos" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${calculo.metaDiaria}, minmax(0, 1fr))` }}>{Array.from({ length: calculo.metaDiaria }, (_, i) => <span key={i} className={i < calculo.feitasHoje ? 'cheio' : ''} />)}</span>
            : <span className="cr-destaque__barra"><span style={{ width: `${pct}%` }} /></span>}
          <p>{calculo.naRetaFinal ? (calculo.fase === 'revisao' ? 'Reta final: revisão forte do que mais cai.' : calculo.fase === 'vespera' ? 'Véspera: aquecimento leve e descanso.' : 'Reta final: modo prova, simulado e resumão.') : calculo.hoje ? <>Hoje: <strong>{calculo.hoje.nome}</strong>{calculo.hoje.itens.some((i) => i.mistura) ? ` + ${calculo.hoje.itens.filter((i) => i.mistura).map((i) => i.nome).join(' e ')}` : ''}{calculo.hoje.focos[0] ? `, começando por ${calculo.hoje.focos[0].toLowerCase()}` : ''}.</> : 'Meta de hoje cumprida. Bom trabalho!'}</p>
          {pendente
            ? <a className="botao botao--claro botao--grande" href={href('/sessao')}>Continuar de onde parei · {pendente.feitas}/{pendente.total}</a>
            : <a className="botao botao--ouro botao--grande" href={href('/cronograma')}>{calculo.hoje && calculo.faltaHoje ? 'Seguir o cronograma' : 'Abrir o cronograma'}</a>}
          {pendente && <a className="cr-destaque__link" href={href('/cronograma')}>Ver o cronograma completo</a>}
        </div>
      </section>
      </>
    )
  }

  // Assinante sem cronograma, ou quem não assina: como funciona e o convite.
  return (
    <section className="cr-destaque" aria-labelledby="cr-destaque-titulo">
      {titulo}
      <ol className="cr-destaque__passos">
        {COMO_FUNCIONA.map((p, i) => (
          <li key={p.titulo}>
            <span className="cr-destaque__passo-num numerico">{i + 1}</span>
            <span><strong>{p.titulo}</strong><small>{p.texto}</small></span>
          </li>
        ))}
      </ol>
      <div className="cr-destaque__acoes">
        {premium
          ? <a className="botao botao--claro botao--grande" href={href('/cronograma')}>Montar meu cronograma</a>
          : <>
            <a className="botao botao--ouro botao--grande" href={href(logado ? '/cronograma' : '/conta?modo=entrar')}>{logado ? 'Ver a prévia do meu cronograma' : 'Entrar e ver o meu cronograma'}</a>
            <span className="cr-destaque__nota"><SeloAssinante /> A prévia é grátis; seguir o cronograma é do assinante.</span>
          </>}
      </div>
    </section>
  )
}
