import { useEffect, useMemo, useState } from 'react'
import { usarPremium } from '../conta/premium'
import { chamarRpc } from '../servicos/supabase'
import { usarIndice } from '../dados/usarIndice'
import { TOP_ASSUNTOS, areaPorId } from '../dados/incidencia'
import { calcularPlano, type PlanoSalvo } from '../dados/planoEstudo'
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
    chamarRpc<PlanoSalvo[]>('obter_plano_estudo', {}).then(([p]) => { if (vivo) definirPlano(p ?? null) }).catch(() => { if (vivo) definirPlano(null) })
    return () => { vivo = false }
  }, [premium])
  const calculo = useMemo(() => (indice && plano ? calcularPlano(indice, respondidas, plano) : null), [indice, plano, respondidas])
  return { premium, logado, calculo: premium ? calculo : null, pendente }
}
export type CronogramaHoje = ReturnType<typeof usarCronogramaHoje>

/** Início: o convite do cronograma (quem ainda não tem um) e os temas que mais caem. */
export function CaixasAssinante({ cronograma }: { cronograma: CronogramaHoje }) {
  return (
    <div className="empilha cx-bloco">
      {!cronograma.calculo && <CaixaCronograma cronograma={cronograma} />}
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
  { icone: 'calendario' as const, titulo: 'Você diz a data da prova', texto: 'E quantos dias por semana consegue estudar.' },
  { icone: 'rota' as const, titulo: 'Ele monta o caminho', texto: 'A meta de cada dia e o tema de cada semana, começando pelo que mais cai.' },
  { icone: 'reiniciar' as const, titulo: 'E se ajusta sozinho', texto: 'Atrasou, a meta sobe um pouco; adiantou, alivia. A última semana é de reta final.' },
]

function CaixaCronograma({ cronograma }: { cronograma: CronogramaHoje }) {
  const { premium, logado, calculo, pendente } = cronograma

  const titulo = (
    <div className="cr-destaque__texto">
      <p className="cr-destaque__selo"><Icone nome="rota" tamanho={15} /> {premium ? 'Seu estudo até a prova' : 'Novo para assinantes'}</p>
      <h2 id="cr-destaque-titulo" className="cr-destaque__nome">Cronograma</h2>
      <p className="cr-destaque__lide">{calculo
        ? (calculo.provaPassou ? 'A prova chegou. Boa sorte!' : <>Faltam <strong>{calculo.diasAteProva} dias</strong> para a sua prova. Siga a meta de hoje e o cronograma cuida do resto.</>)
        : 'Um plano de estudo até o dia da sua prova: quanto fazer por dia e qual tema em cada semana, começando pelo que mais cai no TEOT e no TARO.'}</p>
    </div>
  )

  // Assinante com cronograma: o dia de hoje em destaque.
  if (premium && calculo) {
    const pct = calculo.metaDiaria ? Math.min(100, Math.round((calculo.feitasHoje / calculo.metaDiaria) * 100)) : 100
    return (
      <section className="cr-destaque" aria-labelledby="cr-destaque-titulo">
        {titulo}
        <div className="cr-destaque__painel">
          <span className="cr-destaque__rotulo">Meta de hoje</span>
          <div className="cr-destaque__meta"><strong className="numerico">{calculo.feitasHoje}</strong><span>de {calculo.metaDiaria} questões</span></div>
          <span className="cr-destaque__barra"><span style={{ width: `${pct}%` }} /></span>
          <p>{calculo.naRetaFinal ? 'Reta final: erros, dúvidas e simulado.' : calculo.hoje ? <>Hoje: <strong>{calculo.hoje.nome}</strong>{calculo.hoje.focos[0] ? `, começando por ${calculo.hoje.focos[0].toLowerCase()}` : ''}.</> : 'Meta de hoje cumprida. Bom trabalho!'}</p>
          {pendente
            ? <a className="botao botao--claro botao--grande" href={href('/sessao')}>Continuar de onde parei · {pendente.feitas}/{pendente.total}</a>
            : <a className="botao botao--claro botao--grande" href={href('/cronograma')}>{calculo.hoje && calculo.faltaHoje ? 'Começar a meta de hoje' : 'Abrir o cronograma'}</a>}
          {pendente && <a className="cr-destaque__link" href={href('/cronograma')}>Ver o cronograma completo</a>}
        </div>
      </section>
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
