import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { avisoVistoNaConta, marcarAvisoNaConta } from '../conta/avisosVistos'
import type { Indice } from '../dados/tipos'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { balancoDiaAnterior, incluiSimulados, indiceDoPlano, proximoDiaParaPuxar, soTeot, DIA_MINIMO, MINUTOS_POR_QUESTAO, ROTULO_INTENSIDADE, ROTULO_PASSADA, TAMANHO_MINI, TETO_ATRASO, type CalculoPlano, type DiaPlano, type Passada, type PlanoSalvo } from '../dados/planoEstudo'
import { areasParaMelhorar, errosDoCronograma, historicoDosDias, idsRevanche, previsaoDeTermino, resumosDoDia, TAMANHO_REVANCHE, type DiaFeito, type ResumoDoDia } from '../dados/cronogramaRoteiro'
import { formatarTempo } from '../dados/hubCronograma'
import { gerarIcs } from '../dados/calendarioIcs'
import { fraseAdiantadoHoje } from '../dados/frasesAdiantar'
import { corDaArea } from '../dados/coresAreas'
import { FaixaFicticio, type MotivoConvite } from './CronogramaFicticio'
import { CenaTorre } from '../componentes/cronograma/CenaTorre'
import { Icone } from '../componentes/Icone'
import { href } from '../util/rotas'
import { chaveCivil, diaCivil } from '../util/dia'
import { usarIndiceBiblioteca } from '../biblioteca/recomendar'
import { usarBiblioteca } from '../biblioteca/usarBiblioteca'
import type { HubDados } from './PlanoEstudo'
import '../estilos/paginas/CronogramaNovo.css'

/**
 * O Cronograma de TEOT e TARO como painel de controle (10/11/2026, segunda versão, a pedido do Tales: página
 * carregada de informação, em caixas pequenas, com gráficos, sem palavra cortada e sem botão em degradê).
 * Tudo aqui é desenhado nesta página (classes `cg-*`, CronogramaNovo.css); a conta do plano continua em
 * dados/planoEstudo.ts e dados/cronogramaRoteiro.ts, por isso quem já tem cronograma continua de onde estava.
 *
 * Ordem: a cena com os dias que faltam e os indicadores; a estrada (etapas); HOJE (resumos, questões, erros, extras);
 * o calendário do mês com o dia escolhido; os gráficos (ritmo, progresso); o desempenho por área e os assuntos em
 * risco; como funciona; os ajustes.
 */

type Respondidas = Record<string, RegistroQuestao>
const DIA = 86_400_000
const F_CURTA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const F_HOJE = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const F_SEMANA = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
const F_MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const curta = (d: Date) => F_CURTA.format(d)
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const SEM3 = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`
const juntar = (nomes: string[]) => nomes.length <= 1 ? nomes.join('') : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
const area = (slug: string) => ({ ['--cg-area' as string]: corDaArea(slug) })

function primeiroNome(nome?: unknown): string {
  const primeiro = String(nome ?? '').trim().split(/\s+/)[0] ?? ''
  if (!primeiro || /[@\d_]/.test(primeiro) || primeiro.length < 2 || primeiro.length > 20) return ''
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR')
}

export interface AcoesVisao {
  aoRevanche: (ids: string[]) => void
  aoSoTeot: (ligar: boolean) => void
  aoDiaErros: (dia: number | null) => void
  /** Dia curto: abre a sessão de hoje só com as primeiras `n` questões. */
  aoComecarCurto?: (n: number) => void
}

export function VisaoCronograma({ plano, calculo, indice, respondidas, aoComecar, aoAdiantar, aoPuxar, pendente = null, hub = null, aoAjustar, ficticio = null, acoes }: {
  plano: PlanoSalvo; calculo: CalculoPlano; indice: Indice; respondidas: Respondidas
  aberto?: boolean; detalheSemanas?: ReactNode
  aoComecar?: () => void; aoAdiantar?: (n: number) => void; aoPuxar?: (dia: string) => void
  pendente?: { feitas: number; total: number; tema: string; simulado?: boolean } | null
  hub?: HubDados | null; aoAjustar?: () => void
  ficticio?: { nome: string; aoConvidar: (motivo: MotivoConvite) => void } | null
  acoes?: AcoesVisao
}) {
  const { sessao: sessaoConta } = usarConta()
  const minutos = hub?.minutosQuestao ?? MINUTOS_POR_QUESTAO
  const nome = ficticio?.nome ?? primeiroNome(sessaoConta?.user.user_metadata?.nome)
  const [tourVisto, definirTourVisto] = usarArmazenado<boolean>('cronograma:tour-v2', false)
  const primeiraVisita = !ficticio && !tourVisto && !avisoVistoNaConta(sessaoConta?.user.user_metadata, 'cronograma-tour')
  useEffect(() => { if (!ficticio && tourVisto && sessaoConta) marcarAvisoNaConta(sessaoConta.user.user_metadata, 'cronograma-tour') }, [ficticio, tourVisto, sessaoConta])

  const hoje = diaCivil()
  const prova = diaCivil(plano.data_prova)
  const naRetaFinal = calculo.fase === 'revisao' || calculo.fase === 'prova' || calculo.fase === 'vespera'
  const conteudo = !calculo.provaPassou && !calculo.naRetaFinal
  const feitos = hub?.feitosDia ?? { data: '' }
  const itensDia = calculo.hoje?.itens ?? []
  const principal = itensDia.find((i) => !i.mistura) ?? itensDia[0] ?? null
  const folgaHoje = calculo.tipoHoje === 'folga'
  const metaFeita = calculo.metaDiaria > 0 && calculo.faltaHoje === 0
  const proximoPuxar = aoPuxar && !pendente ? proximoDiaParaPuxar(calculo) : null
  const podeAdiantar = !!aoAdiantar && conteudo && calculo.restante > 0

  // ── Dados (todos saem do histórico e do plano; nada é gravado aqui) ──
  const indicePlano = useMemo(() => indiceDoPlano(indice, plano), [indice, plano])
  const biblioteca = usarIndiceBiblioteca()
  const { leituras } = usarBiblioteca()
  const diaLeitura = useMemo(() => {
    const deHoje = (calculo.hoje?.itens ?? []).flatMap((i) => i.ids)
    if (deHoje.length) return { ids: deHoje, deHoje: true, data: null as Date | null }
    const proximo = calculo.dias.slice(1).find((d) => d.total > 0)
    return { ids: proximo?.itens.flatMap((i) => i.ids) ?? [], deHoje: false, data: proximo?.data ?? null }
  }, [calculo])
  const resumos = useMemo(() => resumosDoDia(biblioteca, indicePlano, diaLeitura.ids), [biblioteca, indicePlano, diaLeitura])
  const erros = useMemo(() => errosDoCronograma(indice, respondidas, plano), [indice, respondidas, plano])
  const balanco = useMemo(() => (conteudo ? balancoDiaAnterior(indice, respondidas, plano) : null), [indice, respondidas, plano, conteudo])
  const historico = useMemo(() => historicoDosDias(indice, respondidas, plano), [indice, respondidas, plano])
  const previsao = useMemo(() => previsaoDeTermino(indice, respondidas, plano, calculo), [indice, respondidas, plano, calculo])
  const { areas, media } = useMemo(() => areasParaMelhorar(calculo.temas), [calculo.temas])
  const diaErros = plano.opcoes?.diaErros ?? null
  const diaDosErrosHoje = diaErros !== null && hoje.getDay() === diaErros && erros.pendentes.length > 0

  // ── O botão do dia ──
  let botao: { rotulo: string; detalhe?: string; aoClicar?: () => void; href?: string } | null = null
  if (!naRetaFinal && !calculo.provaPassou) {
    if (pendente) botao = { rotulo: `Continuar: faltam ${pendente.total - pendente.feitas}`, detalhe: `Você parou na ${pendente.feitas + 1}ª questão`, href: href('/sessao') }
    else if (calculo.hoje && calculo.faltaHoje + calculo.adiantarFalta > 0) {
      const n = calculo.faltaHoje + calculo.adiantarFalta
      botao = { rotulo: calculo.faltaHoje === 0 ? `Continuar: faltam ${n} adiantadas` : calculo.feitasHoje > 0 ? `Continuar: faltam ${n} questões` : `Começar: ${n} questões`, detalhe: `cerca de ${formatarTempo(n * minutos)}`, aoClicar: aoComecar }
    } else if (calculo.miniHoje && !feitos.mini && hub) botao = { rotulo: 'Fazer o mini-simulado', detalhe: `${TAMANHO_MINI} questões, cerca de 45 min`, aoClicar: hub.aoMini }
    else if (proximoPuxar) botao = { rotulo: `Adiantar ${F_SEMANA.format(proximoPuxar.data)}: ${proximoPuxar.total} questões`, detalhe: `contam para ${curta(proximoPuxar.data)}, cerca de ${formatarTempo(proximoPuxar.total * minutos)}`, aoClicar: () => aoPuxar!(chaveCivil(proximoPuxar.data)) }
  } else if (hub && naRetaFinal) {
    const r = hub.retaFinal
    if (calculo.fase === 'revisao' && r.revisaoHoje?.n) botao = { rotulo: `Começar a revisão: ${r.revisaoHoje.n} questões`, detalhe: `cerca de ${formatarTempo(r.revisaoHoje.n * minutos)}`, aoClicar: r.aoRevisaoForte }
    else if (calculo.fase === 'prova') botao = { rotulo: 'Ir para o simulado cronometrado', href: href('/simulado-nacional') }
    else if (calculo.fase === 'vespera') botao = { rotulo: 'Começar o aquecimento: 25 questões', detalhe: `cerca de ${formatarTempo(25 * minutos)}`, aoClicar: r.aoAquecimento }
    else if (r.errosQueImportam) botao = { rotulo: 'Refazer os erros que importam', aoClicar: r.aoErros }
  }
  const Acao = (extra = '') => !botao ? null : botao.href
    ? <a className={`cg-ir ${extra}`} href={botao.href}><strong>{botao.rotulo}</strong>{botao.detalhe && <small>{botao.detalhe}</small>}</a>
    : <button type="button" className={`cg-ir ${extra}`} onClick={botao.aoClicar}><strong>{botao.rotulo}</strong>{botao.detalhe && <small>{botao.detalhe}</small>}</button>

  const tituloHoje = calculo.provaPassou ? 'A prova chegou' : calculo.fase === 'revisao' ? 'Revisão forte' : calculo.fase === 'prova' ? 'Modo prova' : calculo.fase === 'vespera' ? 'Véspera da prova'
    : folgaHoje ? 'Hoje é folga' : calculo.restante === 0 ? 'Você cumpriu o cronograma inteiro' : calculo.metaDiaria === 0 && calculo.adiantadoHoje > 0 ? 'Hoje já está adiantado'
    : metaFeita && !calculo.miniHoje ? 'Meta de hoje feita' : principal ? principal.nome : calculo.miniHoje ? 'Dia de mini-simulado' : 'Hoje'
  const pctPlano = calculo.alvo ? Math.min(100, Math.round((calculo.feitas / calculo.alvo) * 100)) : 100

  return <>
    {ficticio && <FaixaFicticio nome={ficticio.nome} />}

    {/* ── 1. A cena, os dias que faltam e os indicadores ── */}
    <section className="cg-topo" aria-labelledby="cg-titulo">
      <div className="cg-topo__cena"><CenaTorre /></div>
      <div className="cg-topo__texto">
        <p className="cg-topo__selo">{ficticio ? 'Cenário fictício' : 'Cronograma'} · {plano.prova}{soTeot(plano) ? ' · só TEOT' : ''}</p>
        <h1 id="cg-titulo">{calculo.provaPassou ? (nome ? `${nome}, é o dia da prova` : 'Dia da prova') : <>{nome ? `${nome}, faltam` : 'Faltam'} <em>{calculo.diasAteProva}</em> {calculo.diasAteProva === 1 ? 'dia' : 'dias'}</>}</h1>
        <p className="cg-topo__sub">Prova em {prova.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })} · semana {Math.min(calculo.semanaNumero, calculo.semanasTotal)} de {calculo.semanasTotal} · plano {ROTULO_INTENSIDADE[plano.intensidade].nome.toLowerCase()}</p>
        <div className="cg-topo__acoes">{Acao()}{aoAjustar && <button type="button" className="cg-btn cg-btn--vidro" onClick={aoAjustar}><Icone nome="lapis" tamanho={15} /> Ajustar plano</button>}</div>
      </div>
      <dl className="cg-indicadores">
        <Indicador rotulo="Hoje" valor={conteudo ? `${calculo.feitasHoje}/${calculo.metaDiaria}` : '—'} nota={conteudo ? (metaFeita ? 'meta feita' : `faltam ${calculo.faltaHoje}`) : 'reta final'} />
        <Indicador rotulo="Sequência" valor={hub ? `${hub.constancia.sequencia}` : '—'} nota={hub ? `${hub.constancia.sequencia === 1 ? 'dia' : 'dias'} · recorde ${hub.constancia.melhor}` : ''} />
        <Indicador rotulo="Seu ritmo" valor={previsao.ritmo !== null ? `${Math.round(previsao.ritmo)}` : '—'} nota={`por dia · o plano pede ${previsao.precisa}`} tom={previsao.ritmo !== null && previsao.ritmo < previsao.precisa * 0.85 ? 'aviso' : undefined} />
        <Indicador rotulo="Plano feito" valor={`${pctPlano}%`} nota={`${calculo.feitas} de ${calculo.alvo}`} />
        <Indicador rotulo="Acerto" valor={media !== null ? `${media}%` : '—'} nota="média das áreas" />
        <Indicador rotulo="Erros a refazer" valor={`${erros.pendentes.length}`} nota={erros.resolvidos ? `${erros.resolvidos} já resolvidos` : 'últimos 14 dias'} tom={erros.pendentes.length > 30 ? 'aviso' : undefined} />
      </dl>
      {!calculo.provaPassou && <Estrada plano={plano} calculo={calculo} />}
    </section>

    {primeiraVisita && <p className="cg-boasvindas"><span><strong>Primeira vez aqui?</strong> Em cima, onde você está na estrada até a prova. Em <b>Hoje</b>, o que fazer, na ordem. Depois, o mês, os gráficos e o seu desempenho por área. As regras estão em <a className="cg-link" href="#como-funciona">Como funciona</a>.</span><button type="button" className="cg-btn" onClick={() => { definirTourVisto(true); marcarAvisoNaConta(sessaoConta?.user.user_metadata, 'cronograma-tour') }}>Entendi</button></p>}

    <div className="cg-grade">
      {/* ── 2. Hoje ── */}
      <section className="cg-caixa cg-hoje cg-col-7" aria-labelledby="cg-hoje-titulo" style={area(principal?.slug ?? '')}>
        <header className="cg-caixa__cabeca">
          <div><p className="cg-rotulo">Hoje · {F_HOJE.format(hoje)}</p><h2 id="cg-hoje-titulo"><i className="cg-ponto" aria-hidden="true" />{tituloHoje}</h2></div>
          {conteudo && calculo.metaDiaria > 0 && <Anel pct={Math.min(100, (calculo.feitasHoje / calculo.metaDiaria) * 100)} rotulo={`${Math.min(calculo.feitasHoje, calculo.metaDiaria)} de ${calculo.metaDiaria} questões de hoje`}><b>{Math.min(calculo.feitasHoje, calculo.metaDiaria)}</b><small>de {calculo.metaDiaria}</small></Anel>}
        </header>

        {balanco && balanco.faltou > 0 && !folgaHoje && <p className="cg-aviso" role="note"><Icone nome="relogio" tamanho={16} /><span><strong>{hoje.getTime() - balanco.data.getTime() <= DIA ? 'Ontem' : `Na ${F_SEMANA.format(balanco.data).replace('-feira', '')}`} {balanco.feitas === 0 ? `as ${balanco.meta} questões ficaram sem fazer` : `ficaram ${plural(balanco.faltou, 'questão', 'questões')} sem fazer`}.</strong> Nada se perdeu: voltaram para a fila e foram divididas pelos dias que faltam{calculo.projecao.tetoAtivo ? `; a meta parou no teto de ${Math.round((TETO_ATRASO - 1) * 100)}% acima do planejado` : `, por isso hoje são ${calculo.metaHojeSemAdiantar}`}.</span></p>}

        {naRetaFinal && hub ? <RetaFinal calculo={calculo} hub={hub} minutos={minutos} /> : <div className="cg-passos">
          <div className="cg-passo">
            <h3><b>1</b>{diaLeitura.deHoje ? 'Leia antes' : `Leitura para ${diaLeitura.data ? F_SEMANA.format(diaLeitura.data) : 'o próximo dia'}`}<small>os resumos mais próximos das questões {diaLeitura.deHoje ? 'de hoje' : 'que vêm'}</small></h3>
            <ResumosDoDia resumos={resumos} leituras={leituras} carregando={!biblioteca} total={diaLeitura.ids.length} deHoje={diaLeitura.deHoje} area={principal ?? calculo.dias.find((d) => d.itens.length)?.itens[0] ?? null} frasesLidas={false} />
          </div>
          <div className={'cg-passo cg-questoes' + (metaFeita ? ' cg-passo--feito' : '')}>
            <h3><b>{metaFeita ? <Icone nome="certo" tamanho={13} /> : 2}</b>{folgaHoje ? 'Sem questões hoje' : calculo.metaDiaria > 0 ? `${calculo.metaDiaria} questões novas` : 'Questões de hoje'}<small>{calculo.metaDiaria > 0 ? `${Math.min(calculo.feitasHoje, calculo.metaDiaria)} de ${calculo.metaDiaria} feitas · cerca de ${formatarTempo(calculo.metaDiaria * minutos)}` : calculo.adiantadoHoje > 0 ? fraseAdiantadoHoje(calculo) : 'nenhuma agendada'}</small></h3>
            {!metaFeita && itensDia.length > 0 && <ul className="cg-areas">{itensDia.map((i) => <li key={i.slug + String(i.mistura)} style={area(i.slug)}><b>{i.n}</b><span><strong>{i.nome}</strong>{i.mistura && <em>mistura</em>}<small>{i.assuntos.slice(0, 3).join(' · ')}{i.assuntos.length > 3 ? ` · +${i.assuntos.length - 3}` : ''}</small></span></li>)}</ul>}
            <p className="cg-nota">{folgaHoje ? 'Dia de descanso: a meta foi espalhada pelos outros dias. Se quiser estudar, adiante o próximo dia.' : metaFeita ? 'Feito. O que vier agora sai dos próximos dias.' : `Só questões que você ainda não respondeu${soTeot(plano) ? ', do TEOT' : ''}${incluiSimulados(plano) ? ', com alguns OrtoQuestões Simulados' : ''}; o que mais cai vem primeiro.`}{calculo.miniHoje ? ` Hoje tem mini-simulado de ${TAMANHO_MINI} questões${feitos.mini ? ' (feito)' : ''}, por isso a meta é a metade.` : ''}</p>
            <div className="cg-linha">
              {Acao('cg-ir--claro')}
              {acoes?.aoComecarCurto && !metaFeita && !pendente && calculo.faltaHoje > DIA_MINIMO && <button type="button" className="cg-btn" onClick={() => acoes.aoComecarCurto!(DIA_MINIMO)} title="Abre só as 10 primeiras de hoje; mantém a sequência">Pouco tempo? Só {DIA_MINIMO}</button>}
              {calculo.miniHoje && !feitos.mini && hub && botao?.aoClicar !== hub.aoMini && <button type="button" className="cg-btn" onClick={hub.aoMini}>Mini-simulado</button>}
            </div>
          </div>
          {conteudo && <div className={'cg-passo cg-passo--erros' + (diaDosErrosHoje ? ' cg-passo--destaque' : '')}>
            <h3><b>3</b>Refaça o que errou<small>{erros.pendentes.length ? `${plural(erros.pendentes.length, 'questão', 'questões')} · alternativas em ordem nova${diaDosErrosHoje ? ' · hoje é o seu dia dos erros' : ''}` : erros.total ? `você zerou os ${erros.total} erros das últimas duas semanas` : 'nenhum erro pendente'}</small></h3>
            {erros.pendentes.length > 0 && <>
              <ul className="cg-erros">{erros.dias.filter((d) => d.pendentes.length).slice(0, 6).map((d) => {
                const rot = hoje.getTime() - d.data.getTime() <= DIA ? 'ontem' : `${SEM3[d.data.getDay()]} ${curta(d.data)}`
                return <li key={d.chave}><button type="button" onClick={() => acoes?.aoRevanche(d.pendentes.slice(0, 40))} disabled={!acoes} aria-label={`Refazer ${plural(d.pendentes.length, 'erro', 'erros')} de ${rot}`}><b>{d.pendentes.length}</b>{rot}</button></li>
              })}</ul>
              {acoes && <div className="cg-linha"><button type="button" className="cg-btn cg-btn--forte" onClick={() => acoes.aoRevanche(idsRevanche(erros))}><Icone nome="reiniciar" tamanho={15} /> Refazer {Math.min(TAMANHO_REVANCHE, erros.pendentes.length)}{erros.pendentes.length > TAMANHO_REVANCHE ? ` de ${erros.pendentes.length}` : ''} erros</button><span className="cg-nota">Acertou, sai da fila. Não conta na meta.</span></div>}
            </>}
          </div>}
        </div>}
      </section>

      {/* ── 3. Ao lado de hoje: próximos dias, extras e a previsão ── */}
      <div className="cg-col-5 cg-pilha">
        {conteudo && <section className="cg-caixa" aria-label="Próximos dias">
          <p className="cg-rotulo">Próximos dias</p>
          <ol className="cg-proximos">{calculo.dias.slice(1, 6).map((d) => <li key={d.data.getTime()} className={d.tipo === 'folga' ? 'cg-proximos__folga' : ''}>
            <span className="cg-proximos__dia"><b>{SEM3[d.data.getDay()]}</b>{curta(d.data)}</span>
            <span className="cg-proximos__faixa" aria-hidden="true">{d.itens.map((i) => <i key={i.slug + String(i.mistura)} style={{ flexGrow: i.n, background: corDaArea(i.slug) }} />)}</span>
            <span className="cg-proximos__texto">{resumoDoDia(d)}</span>
            {podeAdiantar && aoPuxar && d.total > 0 && <button type="button" className="cg-mini" onClick={() => aoPuxar(chaveCivil(d.data))} disabled={hub?.salvandoOpcoes} aria-label={`Fazer agora as questões de ${F_SEMANA.format(d.data)}`}>fazer</button>}
          </li>)}</ol>
          {podeAdiantar && <div className="cg-linha cg-linha--sep"><span className="cg-nota">Adiantar hoje:</span>{[10, 20, 30].map((n) => <button key={n} type="button" className="cg-mini" disabled={hub?.salvandoOpcoes} onClick={() => aoAdiantar!(n)}>+{n}</button>)}{calculo.adiantarFalta > 0 && hub && <button type="button" className="cg-mini" onClick={hub.aoCancelarAdiantar}>cancelar</button>}<span className="cg-nota">{calculo.extraHoje > 0 ? `${calculo.extraHoje} feitas a mais hoje` : 'sai dos próximos dias'}</span></div>}
        </section>}

        {hub && conteudo && <section className="cg-caixa" aria-label="Mais para hoje">
          <p className="cg-rotulo">Mais para hoje <small>não conta na meta</small></p>
          <ul className="cg-extras">
            <li><Icone nome="reiniciar" tamanho={16} /><span><strong>{hub.revisoesHoje ? plural(hub.revisoesHoje, 'revisão do dia', 'revisões do dia') : 'Revisões em dia'}</strong><small>{hub.revisoesHoje ? `revisão espaçada · cerca de ${formatarTempo(hub.revisoesHoje * minutos)}` : 'nada vence hoje na revisão espaçada'}</small></span>{hub.revisoesHoje > 0 && <a className="cg-mini" href={href('/revisao')}>revisar</a>}</li>
            <li><Icone nome="raio" tamanho={16} /><span><strong>Flashcards{feitos.flashcards ? ' · feito' : ''}</strong><small>uma rodada curta, cerca de 5 min</small></span><a className="cg-mini" href={href('/flashcards')} onClick={() => hub.aoMarcar('flashcards')}>abrir</a></li>
            {principal && <li><Icone nome="livro" tamanho={16} /><span><strong>Frases que caem{hub.resumaoLido.includes(principal.slug) ? ' · lidas' : ''}</strong><small>{principal.nome.toLowerCase()}, cerca de 4 min</small></span><a className="cg-mini" href={href(`/resumos/frases?tema=${principal.slug}`)}>ler</a></li>}
            {hub.mostrarDiagnostico && <li><Icone nome="alvo" tamanho={16} /><span><strong>Diagnóstico inicial</strong><small>30 questões para calibrar o plano</small></span><button type="button" className="cg-mini" onClick={hub.aoDiagnostico}>fazer</button></li>}
            {hub.esquecidos.slice(0, 2).map((e) => <li key={e.slug}><Icone nome="relogio" tamanho={16} /><span><strong>{e.nome} está parado</strong><small>{e.dias} dias sem resposta · {e.erros} erros guardados</small></span><button type="button" className="cg-mini" onClick={() => hub.aoReativar(e.slug)}>reativar</button></li>)}
          </ul>
        </section>}

        <section className="cg-caixa" aria-label="Previsão no seu ritmo">
          <p className="cg-rotulo">Previsão no seu ritmo</p>
          <Previsao previsao={previsao} calculo={calculo} minutos={minutos} />
        </section>
      </div>

      {/* ── 4. O mês ── */}
      <Mes plano={plano} calculo={calculo} historico={historico} biblioteca={biblioteca} indice={indicePlano} leituras={leituras} minutos={minutos} botaoHoje={Acao('cg-ir--claro')} aoPuxar={podeAdiantar ? aoPuxar : undefined} salvando={hub?.salvandoOpcoes} />

      {/* ── 5. Os gráficos ── */}
      <section className="cg-caixa cg-col-6" aria-labelledby="cg-g-ritmo">
        <h2 className="cg-caixa__titulo" id="cg-g-ritmo">Questões novas por dia <small>últimos 14 dias · a linha é a meta de um dia normal</small></h2>
        <GraficoRitmo historico={historico} plano={plano} meta={calculo.metaDiaNormal} />
      </section>
      <section className="cg-caixa cg-col-6" aria-labelledby="cg-g-prog">
        <h2 className="cg-caixa__titulo" id="cg-g-prog">Progresso do plano <small>feito, planejado e a projeção no seu ritmo</small></h2>
        <GraficoProgresso historico={historico} plano={plano} calculo={calculo} previsao={previsao} />
      </section>

      <section className="cg-caixa cg-col-6" aria-labelledby="cg-g-acerto">
        <h2 className="cg-caixa__titulo" id="cg-g-acerto">Acerto por dia <small>questões novas dos últimos 14 dias · a linha tracejada é a sua média</small></h2>
        <GraficoAcerto historico={historico} media={media} />
      </section>
      <section className="cg-caixa cg-col-6" aria-labelledby="cg-g-falta">
        <h2 className="cg-caixa__titulo" id="cg-g-falta">O que ainda vem, por área <small>{calculo.restante} questões novas até a reta final · cerca de {formatarTempo(calculo.restante * minutos)} de estudo</small></h2>
        <FaltaPorArea calculo={calculo} minutos={minutos} />
      </section>

      {/* ── 6. Desempenho por área e assuntos em risco ── */}
      <section className="cg-caixa cg-col-7" aria-labelledby="cg-areas-titulo">
        <h2 className="cg-caixa__titulo" id="cg-areas-titulo">Desempenho por área <small>na ordem de onde vale mais melhorar{media !== null ? ` · sua média: ${media}%` : ''}</small></h2>
        <TabelaAreas areas={areas} media={media} aoTreinar={hub ? hub.aoReativar : undefined} />
      </section>
      <div className="cg-col-5 cg-pilha">
        {hub && <section className="cg-caixa" aria-labelledby="cg-risco-titulo">
          <h2 className="cg-caixa__titulo" id="cg-risco-titulo">Assuntos em risco <small>caem muito e você acerta menos de 65%</small></h2>
          {hub.riscos.length ? <ul className="cg-riscos">{hub.riscos.slice(0, 6).map((r) => <li key={r.area.id + r.foco.nome}>
            <span><strong>{r.foco.nome}</strong><small>{r.area.nome} · {r.respondidas} respondidas</small></span>
            <b className="cg-riscos__pct">{r.acerto}%</b>
            <button type="button" className="cg-mini" onClick={() => hub.aoTreinarFoco(r.area, r.foco)}>treinar</button>
          </li>)}</ul> : <p className="cg-nota">Nenhum assunto de prioridade alta abaixo de 65% (com pelo menos 3 respostas). Continue.</p>}
          {hub.cegos.length > 0 && <p className="cg-nota cg-linha--sep"><b>Ainda sem nenhuma resposta:</b> {hub.cegos.slice(0, 4).map((c, i) => <span key={c.area.id + c.foco.nome}>{i > 0 && ' · '}<button type="button" className="cg-link" onClick={() => hub.aoTreinarFoco(c.area, c.foco)}>{c.foco.nome}</button></span>)}</p>}
        </section>}
        {hub && <section className="cg-caixa" aria-labelledby="cg-const-titulo">
          <h2 className="cg-caixa__titulo" id="cg-const-titulo">Constância <small>{hub.constancia.aderencia !== null ? `${hub.constancia.aderencia}% dos dias de estudo cumpridos` : 'os últimos 14 dias'}</small></h2>
          <ol className="cg-const">{hub.constancia.ultimos.map((d) => <li key={d.dia.getTime()} className={`cg-const--${d.estado}`} title={`${SEM3[d.dia.getDay()]} ${curta(d.dia)}: ${d.estado === 'folga' ? 'folga' : d.estado === 'antes' ? 'antes do plano' : `${d.n} questões`}`}><i aria-hidden="true" /><small>{SEM3[d.dia.getDay()][0]}</small><span className="so-leitor">{curta(d.dia)}: {d.estado === 'folga' ? 'folga' : `${d.n} questões`}</span></li>)}</ol>
          <p className="cg-nota"><b>{hub.elogio.titulo}.</b> {hub.elogio.texto} Dia com {hub.constancia.minimo}+ questões conta; folga não quebra.</p>
        </section>}
      </div>

      {/* ── 7. Como funciona e os ajustes ── */}
      <ComoFunciona plano={plano} calculo={calculo} minutos={minutos} />
      <Ajustes plano={plano} calculo={calculo} hub={hub} acoes={acoes} aoAjustar={aoAjustar} ficticio={!!ficticio} />
    </div>
  </>
}

// ─── Peças pequenas ──────────────────────────────────────────────────────────

function Indicador({ rotulo, valor, nota, tom }: { rotulo: string; valor: string; nota: string; tom?: 'aviso' }) {
  return <div className={'cg-ind' + (tom ? ` cg-ind--${tom}` : '')}><dt>{rotulo}</dt><dd><b>{valor}</b><small>{nota}</small></dd></div>
}

function Anel({ pct, rotulo, children }: { pct: number; rotulo: string; children: ReactNode }) {
  const r = 26, c = 2 * Math.PI * r
  return (
    <div className="cg-anel" role="img" aria-label={rotulo}>
      <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r={r} className="cg-anel__fundo" /><circle cx="32" cy="32" r={r} className="cg-anel__valor" strokeDasharray={`${(Math.max(0, Math.min(100, pct)) / 100) * c} ${c}`} transform="rotate(-90 32 32)" /></svg>
      <span>{children}</span>
    </div>
  )
}

function resumoDoDia(d: DiaPlano): string {
  if (d.tipo === 'folga') return 'folga'
  if (!d.total) return d.adiantado > 0 ? 'livre: você já adiantou' : d.mini ? 'mini-simulado' : 'sem questões novas'
  const foco = d.itens.filter((i) => !i.mistura).map((i) => i.nome)
  const mist = d.itens.filter((i) => i.mistura).map((i) => i.nome)
  return `${d.total} · ${juntar(foco.length ? foco : mist)}${foco.length && mist.length ? ` + ${juntar(mist)}` : ''}${d.mini ? ' + mini-simulado' : ''}`
}

// ─── A estrada: as etapas do plano, sem cortar nome nenhum ───────────────────

function Estrada({ plano, calculo }: { plano: PlanoSalvo; calculo: CalculoPlano }) {
  const hoje = diaCivil()
  const prova = diaCivil(plano.data_prova)
  const criado = diaCivil(Date.parse(plano.criado_em))
  const vespera = new Date(prova.getFullYear(), prova.getMonth(), prova.getDate() - 1)
  const passadas = ([1, 2, 3] as Passada[]).filter((p) => calculo.inicioPassada[p] || calculo.passadaAtual === p)
  const inicioDe = (p: Passada) => calculo.inicioPassada[p] ?? hoje
  const etapas: Array<{ id: string; nome: string; de: Date; ate: Date; texto: ReactNode }> = []
  if (calculo.fase === 'conteudo') passadas.forEach((p, i) => {
    const de = i === 0 ? (criado < inicioDe(p) ? criado : inicioDe(p)) : inicioDe(p)
    const ate = passadas[i + 1] ? inicioDe(passadas[i + 1]) : calculo.inicioRetaFinal
    if (ate > de) etapas.push({ id: `p${p}`, nome: ROTULO_PASSADA[p].nome, de, ate, texto: <>Questões novas: {ROTULO_PASSADA[p].texto}. {p === 1 ? 'Garante o que mais cai, mesmo se a rotina apertar depois.' : p === 2 ? 'Entra quando a prioridade máxima de todas as áreas já foi vista.' : 'Fecha o acervo do seu plano; se faltar tempo, é daqui que o plano corta.'}</> })
  })
  else etapas.push({ id: 'conteudo', nome: 'Conteúdo novo', de: criado, ate: calculo.inicioRetaFinal, texto: 'A fase de questões novas terminou.' })
  if (calculo.diasRetaFinal > 7) etapas.push({ id: 'revisao', nome: 'Revisão forte', de: calculo.inicioRetaFinal, ate: calculo.inicioModoProva, texto: <>Sem questão nova. Cada dia traz uma fatia da prova (duas áreas) com cerca de <b>{calculo.metaMedia} questões que você já viu</b>: os seus erros, depois chutes e dúvidas e, por fim, o que mais cai e você não vê há mais tempo.</> })
  etapas.push({ id: 'prova', nome: 'Modo prova', de: calculo.inicioModoProva, ate: prova, texto: <>A última semana, com menos volume. Três tarefas por dia: um <b>simulado cronometrado</b> no horário e na duração da prova, os <b>erros que importam</b> e as <b>frases que caem</b>. Na véspera ({curta(vespera)}), só aquecimento de 25 questões e descanso.</> })
  etapas.push({ id: 'dia', nome: 'Prova', de: prova, ate: new Date(prova.getTime() + DIA), texto: <>No dia ({prova.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}) o cronograma não pede nada: só a prova. Depois dela você monta um plano novo quando quiser.</> })
  const inicio = etapas[0].de.getTime(), fim = prova.getTime()
  const pos = Math.min(100, Math.max(0, ((hoje.getTime() - inicio) / Math.max(1, fim - inicio)) * 100))
  const atual = etapas.findIndex((t) => hoje >= t.de && hoje < t.ate)
  const [aberta, definirAberta] = useState<string | null>(null)
  const mostrada = etapas.find((t) => t.id === aberta) ?? etapas[Math.max(0, atual)]
  return (
    <div className="cg-estrada">
      <div className="cg-estrada__barra" aria-hidden="true">
        {etapas.slice(0, -1).map((t, i) => <i key={t.id} className={i < atual ? 'cg-feita' : i === atual ? 'cg-atual' : ''} style={{ flexGrow: Math.max(1, (t.ate.getTime() - t.de.getTime()) / DIA) }} />)}
        <span className="cg-estrada__voce" style={{ left: `${pos}%` }} />
      </div>
      {/* Os nomes ficam em pílulas que quebram de linha: nenhum nome é cortado, em nenhuma largura. */}
      <ol className="cg-estrada__etapas">
        {etapas.map((t, i) => <li key={t.id}><button type="button" className={'cg-etapa' + (i < atual ? ' cg-etapa--feita' : i === atual ? ' cg-etapa--atual' : '')} aria-pressed={mostrada.id === t.id} onClick={() => definirAberta(t.id)}>
          <b>{t.nome}</b><small>{i === atual ? 'você está aqui' : t.id === 'dia' ? curta(t.de) : `a partir de ${curta(t.de)}`}</small>
        </button></li>)}
      </ol>
      <p className="cg-estrada__texto" aria-live="polite"><b>{mostrada.nome}{mostrada.id !== 'dia' ? ` (${curta(mostrada.de)} a ${curta(new Date(mostrada.ate.getTime() - DIA))})` : ''}.</b> {mostrada.texto}{plano.opcoes?.provaExtra?.nome && plano.opcoes.provaExtra.data >= chaveCivil(hoje) && mostrada.id === 'dia' ? ` Antes, no caminho: ${plano.opcoes.provaExtra.nome} em ${curta(new Date(`${plano.opcoes.provaExtra.data}T00:00:00`))}.` : ''}</p>
    </div>
  )
}

// ─── Resumos do dia (também usados pelos cronogramas da Mão) ─────────────────

type Leituras = Record<string, { progresso: number; concluidoEm?: number | null } | undefined>

export function ListaResumos({ resumos, leituras, total }: { resumos: ResumoDoDia[]; leituras: Leituras; total: number }) {
  return (
    <ul className="cg-resumos">
      {resumos.map(({ resumo: r, questoes, assuntos }) => {
        const l = leituras[r.id]
        const lido = !!l?.concluidoEm || (l?.progresso ?? 0) >= 95
        const andamento = lido ? 100 : l?.progresso ?? 0
        return <li key={r.id}><a className={'cg-resumo' + (lido ? ' cg-resumo--lido' : '')} href={href(`/resumos/${r.id}`)} style={area(r.especialidade)}>
          <i className="cg-resumo__marca" aria-hidden="true"><Icone nome={lido ? 'certo' : 'livro'} tamanho={14} /></i>
          <span className="cg-resumo__texto"><strong>{r.titulo}</strong><small>{questoes > 0 ? `explica ${questoes === 1 ? '1 questão' : `${questoes} das ${total} questões`} do dia` : `ensina ${assuntos.slice(0, 2).join(' e ').toLowerCase()}`}{andamento > 0 && !lido ? ` · ${andamento}% lido` : ''}</small></span>
          <span className="cg-resumo__tempo">{lido ? 'lido' : `${Math.max(1, Math.round(r.minutos * (1 - andamento / 100)))} min`}</span>
        </a></li>
      })}
    </ul>
  )
}

export function ResumosDoDia({ resumos, leituras, carregando, total, deHoje, area: a, frasesLidas }: { resumos: ResumoDoDia[]; leituras: Leituras; carregando: boolean; total: number; deHoje: boolean; data?: Date | null; area: { slug: string; nome: string } | null; frasesLidas: boolean }) {
  if (!total) return <p className="cg-nota">Sem questões novas agendadas: aproveite para reler um resumo na <a className="cg-link" href={href('/resumos')}>Biblioteca</a>.</p>
  if (carregando) return <p className="cg-nota" aria-busy="true">Procurando os resumos deste dia…</p>
  if (!resumos.length) return <p className="cg-nota">Os assuntos {deHoje ? 'de hoje' : 'desse dia'} ainda não têm resumo próprio.{a && <> Veja as <a className="cg-link" href={href(`/resumos/frases?tema=${a.slug}`)}>frases que caem{frasesLidas ? ' (lidas hoje)' : ''}</a> ou os <a className="cg-link" href={href(`/resumos?area=${a.slug}`)}>resumos de {a.nome.toLowerCase()}</a>.</>}</p>
  return <ListaResumos resumos={resumos} leituras={leituras} total={total} />
}

// ─── Reta final: revisão forte, modo prova e véspera ─────────────────────────

function RetaFinal({ calculo, hub, minutos }: { calculo: CalculoPlano; hub: HubDados; minutos: number }) {
  const r = hub.retaFinal
  const linhas: Array<{ t: string; s: string; acao?: ReactNode }> = []
  const erros = { t: `Os erros que importam${r.errosQueImportam ? ` (${r.errosQueImportam})` : ''}`, s: 'só os erros dos assuntos de prioridade alta e máxima', acao: r.errosQueImportam ? <button type="button" className="cg-mini" onClick={r.aoErros}>refazer</button> : undefined }
  const frases = { t: 'Frases que caem', s: 'as frases "Na prova" dos assuntos que mais caem, cerca de 10 min', acao: <a className="cg-mini" href={href('/resumos/frases')}>ler</a> }
  if (calculo.fase === 'revisao') linhas.push({ t: r.revisaoHoje ? `${r.revisaoHoje.n} questões de revisão: ${r.revisaoHoje.areas.map((a) => a.nome).join(' e ')}` : 'Revisão do que você já viu', s: `seus erros, chutes e dúvidas e o que mais cai · cerca de ${formatarTempo((r.revisaoHoje?.n ?? 0) * minutos)}` }, erros, frases)
  else if (calculo.fase === 'prova') linhas.push({ t: 'Simulado cronometrado', s: 'no horário e com a duração da prova, para treinar ritmo e cansaço', acao: <a className="cg-mini" href={href('/simulado-nacional')}>abrir</a> }, erros, frases)
  else linhas.push({ t: 'Aquecimento de 25 questões', s: 'do que mais cai, quase todas já acertadas por você', acao: <button type="button" className="cg-mini" onClick={r.aoAquecimento}>começar</button> }, frases, { t: 'Deixar tudo pronto', s: 'documento, caneta, o caminho até o local e cama cedo' })
  return <>
    <p className="cg-nota">{calculo.fase === 'revisao' ? 'Reta final, penúltima semana: nada de questão nova.' : calculo.fase === 'prova' ? 'A semana da prova: menos volume, para chegar descansado. Três tarefas, na ordem que preferir.' : 'Hoje não é dia de aprender coisa nova.'}</p>
    <ul className="cg-extras">{linhas.map((l, i) => <li key={l.t}><b className="cg-num">{i + 1}</b><span><strong>{l.t}</strong><small>{l.s}</small></span>{l.acao}</li>)}</ul>
  </>
}

// ─── Previsão ────────────────────────────────────────────────────────────────

function Previsao({ previsao: p, calculo, minutos }: { previsao: ReturnType<typeof previsaoDeTermino>; calculo: CalculoPlano; minutos: number }) {
  if (calculo.naRetaFinal || calculo.provaPassou) return <p className="cg-nota">O conteúdo novo terminou; agora o plano é de revisão.</p>
  if (calculo.restante === 0) return <p className="cg-nota"><b>Você fez todas as questões do plano.</b> Mantenha a revisão em dia até a reta final.</p>
  if (p.ritmo === null || !p.termina) return <p className="cg-nota">Ainda sem dias de estudo para medir o seu ritmo. O plano pede <b>{p.precisa} questões por dia</b> (cerca de {formatarTempo(p.precisa * minutos)}) e a reta final começa em {curta(calculo.inicioRetaFinal)}.</p>
  const atrasa = (p.folga ?? 0) < 0
  return <>
    <p className={'cg-previsao' + (atrasa ? ' cg-previsao--aviso' : '')}><b>{curta(p.termina)}</b><span>{atrasa ? `${-p.folga!} dias depois do começo da reta final (${curta(calculo.inicioRetaFinal)})` : `${p.folga} dias antes da reta final (${curta(calculo.inicioRetaFinal)})`}</span></p>
    <p className="cg-nota">É quando o conteúdo novo acaba se você mantiver <b>{String(p.ritmo).replace('.', ',')} questões por dia de estudo</b>, a média dos últimos 7 dias. {atrasa ? <>Para fechar no prazo, o plano pede <b>{p.precisa} por dia</b> (cerca de {formatarTempo(p.precisa * minutos)}); o que não couber sai do fim da fila, a parte que menos cai.</> : <>O plano pede {p.precisa} por dia: você está com folga.</>} Faltam <b>{calculo.restante}</b> questões novas em {calculo.diasEstudoRestantes} dias de estudo.</p>
  </>
}

// ─── O mês ───────────────────────────────────────────────────────────────────

interface CelulaMes { data: Date; chave: string; fora: boolean; hoje: boolean; passado: boolean; plano: DiaPlano | null; feito: DiaFeito | null; fase: 'antes' | 'conteudo' | 'revisao' | 'prova' | 'vespera' | 'dia' | 'depois'; folga: boolean }

function Mes({ plano, calculo, historico, biblioteca, indice, leituras, minutos, botaoHoje, aoPuxar, salvando }: { plano: PlanoSalvo; calculo: CalculoPlano; historico: Map<string, DiaFeito>; biblioteca: ReturnType<typeof usarIndiceBiblioteca>; indice: Indice; leituras: Leituras; minutos: number; botaoHoje: ReactNode; aoPuxar?: (dia: string) => void; salvando?: boolean }) {
  const hoje = diaCivil()
  const prova = diaCivil(plano.data_prova)
  const criado = diaCivil(Date.parse(plano.criado_em))
  const [mes, definirMes] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1))
  const [escolhida, definirEscolhida] = useState(() => chaveCivil(hoje))
  const primeiro = new Date(criado.getFullYear(), criado.getMonth(), 1), ultimo = new Date(prova.getFullYear(), prova.getMonth(), 1)
  const doPlano = useMemo(() => new Map(calculo.dias.map((d) => [chaveCivil(d.data), d])), [calculo.dias])
  const vespera = calculo.vespera
  const celulas = useMemo(() => {
    const inicio = new Date(mes.getFullYear(), mes.getMonth(), 1 - ((mes.getDay() + 6) % 7))
    const lista: CelulaMes[] = []
    for (let i = 0; i < 42; i++) {
      const data = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i)
      if (i >= 35 && data.getMonth() !== mes.getMonth()) break
      const chave = chaveCivil(data)
      const fase: CelulaMes['fase'] = data < criado ? 'antes' : data > prova ? 'depois' : data.getTime() === prova.getTime() ? 'dia' : data.getTime() === vespera.getTime() ? 'vespera' : data >= calculo.inicioModoProva ? 'prova' : data >= calculo.inicioRetaFinal ? 'revisao' : 'conteudo'
      lista.push({ data, chave, fora: data.getMonth() !== mes.getMonth(), hoje: data.getTime() === hoje.getTime(), passado: data < hoje, plano: doPlano.get(chave) ?? null, feito: historico.get(chave) ?? null, fase, folga: plano.folgas.includes(data.getDay()) })
    }
    return lista
  }, [mes, doPlano, historico]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = celulas.find((c) => c.chave === escolhida) ?? celulas.find((c) => c.hoje) ?? celulas.find((c) => !c.fora)!
  const doMes = celulas.filter((c) => !c.fora)
  const totais = { novas: doMes.reduce((s, c) => s + (c.passado ? 0 : c.plano?.total ?? 0), 0), feitas: doMes.reduce((s, c) => s + (c.feito?.n ?? 0), 0), estudo: doMes.filter((c) => c.fase === 'conteudo' && !c.folga && !c.passado).length }
  const resumosSel = useMemo(() => (sel.plano && !sel.passado ? resumosDoDia(biblioteca, indice, sel.plano.itens.flatMap((i) => i.ids)) : []), [biblioteca, indice, sel])
  const ir = (n: number) => definirMes(new Date(mes.getFullYear(), mes.getMonth() + n, 1))
  const rotuloFase: Record<string, string> = { revisao: 'revisão forte', prova: 'modo prova', vespera: 'véspera', dia: 'PROVA' }
  return <>
    <section className="cg-caixa cg-col-8 cg-mes" id="calendario" aria-labelledby="cg-mes-titulo">
      <header className="cg-caixa__cabeca">
        <h2 className="cg-caixa__titulo" id="cg-mes-titulo"><span className="cg-mes__nome">{F_MES.format(mes)}</span> <small>{totais.estudo} dias de estudo pela frente · {totais.novas} questões agendadas · {totais.feitas} feitas</small></h2>
        <div className="cg-linha">
          <button type="button" className="cg-mini" onClick={() => ir(-1)} disabled={mes <= primeiro} aria-label="Mês anterior"><Icone nome="esquerda" tamanho={14} /></button>
          <button type="button" className="cg-mini" onClick={() => { definirMes(new Date(hoje.getFullYear(), hoje.getMonth(), 1)); definirEscolhida(chaveCivil(hoje)) }}>hoje</button>
          <button type="button" className="cg-mini" onClick={() => ir(1)} disabled={mes >= ultimo} aria-label="Próximo mês"><Icone nome="direita" tamanho={14} /></button>
        </div>
      </header>
      <ol className="cg-mes__semana" aria-hidden="true">{[1, 2, 3, 4, 5, 6, 0].map((d) => <li key={d}>{SEM3[d]}</li>)}</ol>
      <ol className="cg-mes__grade">
        {celulas.map((c) => {
          const itens = c.passado || (c.hoje && !c.plano?.itens.length) ? (c.feito?.areas ?? []).slice(0, 4).map((a) => ({ slug: a.slug, n: a.n })) : (c.plano?.itens ?? []).map((i) => ({ slug: i.slug, n: i.n }))
          const estado = c.fase === 'antes' || c.fase === 'depois' ? 'fora' : c.fase !== 'conteudo' ? c.fase : c.folga ? 'folga' : c.passado ? (c.feito ? 'feito' : 'vazio') : 'plano'
          const n = c.passado ? c.feito?.n ?? 0 : c.hoje ? calculo.metaDiaria : c.plano?.total ?? 0
          const topo = !c.passado ? (c.plano?.itens.find((i) => !i.mistura) ?? c.plano?.itens[0]) : null
          const texto = estado === 'folga' ? 'folga' : rotuloFase[estado] ?? (estado === 'vazio' ? 'sem estudo' : n ? `${n}${c.passado ? ' feitas' : ''}` : c.plano?.mini ? 'mini' : '')
          // No celular a célula é estreita: só o número (ou um traço); o texto inteiro fica no nome acessível e no dia escolhido.
          const curto = estado === 'vazio' ? '0' : estado === 'revisao' ? 'revisão' : estado === 'prova' ? 'prova' : n && c.passado ? String(n) : texto
          return <li key={c.chave} className={c.fora ? 'cg-dia--outro' : ''}><button type="button" className={`cg-dia cg-dia--${estado}${c.hoje ? ' cg-dia--hoje' : ''}`} aria-pressed={sel.chave === c.chave} disabled={estado === 'fora'} onClick={() => definirEscolhida(c.chave)}
            aria-label={`${c.data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}: ${texto || 'sem tarefa'}${topo ? `, ${topo.nome}` : ''}`}>
            <span className="cg-dia__n">{c.data.getDate()}{c.plano?.mini && <i title="Mini-simulado">★</i>}</span>
            {!c.passado && c.plano && c.plano.itens.length > 0 && <span className="cg-dia__area">{c.plano.itens.slice(0, 3).map((i) => <span key={i.slug + String(i.mistura)} style={area(i.slug)}>{i.nome}</span>)}</span>}
            <span className="cg-dia__pe"><span className="cg-largo">{texto}</span><span className="cg-estreito">{curto}</span></span>
            {itens.length > 0 && estado !== 'folga' && <span className="cg-dia__faixa" aria-hidden="true">{itens.map((i) => <i key={i.slug} style={{ flexGrow: i.n, background: corDaArea(i.slug) }} />)}</span>}
          </button></li>
        })}
      </ol>
      <p className="cg-legenda"><span className="cg-legenda--feito">feito</span><span className="cg-legenda--hoje">hoje</span><span className="cg-legenda--folga">folga</span><span className="cg-legenda--reta">reta final</span><span>★ mini-simulado</span><span>a faixa colorida mostra as áreas do dia</span></p>
    </section>

    <section className="cg-caixa cg-col-4 cg-diasel" aria-live="polite" aria-label="O dia escolhido">
      <p className="cg-rotulo">{sel.hoje ? 'Hoje' : sel.passado ? 'Dia que passou' : 'Dia escolhido'}</p>
      <h2 className="cg-caixa__titulo">{sel.data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
      {sel.fase === 'dia' ? <p className="cg-nota"><b>O dia da prova.</b> Sem tarefa: só a prova. Boa prova.</p>
        : sel.fase === 'vespera' ? <p className="cg-nota"><b>Véspera.</b> Aquecimento de 25 questões, frases que caem, tudo pronto e cama cedo.</p>
        : sel.fase === 'prova' ? <p className="cg-nota"><b>Modo prova.</b> Simulado cronometrado, os erros que importam e as frases que caem.</p>
        : sel.fase === 'revisao' ? <p className="cg-nota"><b>Revisão forte.</b> Cerca de {calculo.metaMedia} questões que você já viu: erros, dúvidas e o que mais cai.</p>
        : sel.passado ? (sel.feito ? <>
            <p className="cg-diasel__num"><b>{sel.feito.n}</b> questões novas{sel.feito.validas ? <> · <b>{Math.round((100 * sel.feito.certas) / sel.feito.validas)}%</b> de acerto</> : null}</p>
            <ul className="cg-areas cg-areas--mini">{sel.feito.areas.map((a) => <li key={a.slug} style={area(a.slug)}><b>{a.n}</b><span><strong>{indice.temas.find((t) => t.slug === a.slug)?.nome ?? a.slug}</strong></span></li>)}</ul>
          </> : <p className="cg-nota">{sel.folga ? 'Folga.' : 'Nenhuma questão nova nesse dia. O que estava previsto voltou para a fila e foi redistribuído.'}</p>)
        : sel.folga ? <p className="cg-nota">Folga no seu plano: sem meta.</p>
        : sel.plano && (sel.plano.total > 0 || sel.plano.mini) ? <>
            <p className="cg-diasel__num"><b>{sel.hoje ? calculo.metaDiaria : sel.plano.total}</b> questões novas · cerca de {formatarTempo((sel.hoje ? calculo.metaDiaria : sel.plano.total) * minutos)}{sel.plano.tipo === 'leve' ? ' · dia leve' : sel.plano.tipo === 'dificil' ? ' · semana difícil' : ''}{sel.plano.mini ? ' · mini-simulado' : ''}</p>
            <ul className="cg-areas cg-areas--mini">{sel.plano.itens.map((i) => <li key={i.slug + String(i.mistura)} style={area(i.slug)}><b>{i.n}</b><span><strong>{i.nome}</strong>{i.mistura && <em>mistura</em>}<small>{i.assuntos.slice(0, 3).join(' · ')}</small></span></li>)}</ul>
            {resumosSel.length > 0 && <><p className="cg-rotulo cg-linha--sep">Resumos desse dia</p><ListaResumos resumos={resumosSel} leituras={leituras} total={sel.plano.itens.reduce((s, i) => s + i.ids.length, 0)} /></>}
            <div className="cg-linha cg-linha--sep">{sel.hoje ? botaoHoje : aoPuxar && sel.plano.total > 0 && <button type="button" className="cg-btn cg-btn--forte" disabled={salvando} onClick={() => aoPuxar(sel.chave)}>Fazer agora as questões deste dia</button>}</div>
            {!sel.hoje && aoPuxar && <p className="cg-nota">O que você fizer conta para este dia; o resto continua nele.</p>}
          </> : <p className="cg-nota">{sel.plano && sel.plano.adiantado > 0 ? 'Livre: você já adiantou as questões deste dia.' : 'Sem questões novas agendadas.'}</p>}
    </section>
  </>
}

// ─── Gráficos (SVG desenhado aqui; uma cor por série, texto nos tons de texto) ───

function GraficoRitmo({ historico, plano, meta }: { historico: Map<string, DiaFeito>; plano: PlanoSalvo; meta: number }) {
  const hoje = diaCivil()
  const dias = Array.from({ length: 14 }, (_, k) => { const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (13 - k)); const f = historico.get(chaveCivil(d)); return { d, n: f?.n ?? 0, acerto: f?.validas ? Math.round((100 * f.certas) / f.validas) : null, folga: plano.folgas.includes(d.getDay()) } })
  const [foco, definirFoco] = useState(13)
  const teto = Math.max(meta, ...dias.map((x) => x.n), 10)
  const W = 560, H = 150, base = 124, larg = W / 14
  const y = (v: number) => base - (v / teto) * (base - 10)
  const f = dias[foco]
  const total = dias.reduce((s, x) => s + x.n, 0)
  return <>
    <svg className="cg-grafico" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Questões novas por dia nos últimos 14 dias: ${total} no total; meta de um dia normal: ${meta}.`}>
      <line x1="0" x2={W} y1={base} y2={base} className="cg-g-eixo" />
      {dias.map((x, i) => <g key={i} onMouseEnter={() => definirFoco(i)} onFocus={() => definirFoco(i)} tabIndex={0} aria-label={`${SEM3[x.d.getDay()]} ${curta(x.d)}: ${x.folga && !x.n ? 'folga' : `${x.n} questões`}`}>
        <rect x={i * larg} y="0" width={larg} height={H} fill="transparent" />
        {x.n > 0 ? <path d={barra(i * larg + 5, y(x.n), larg - 10, base - y(x.n))} className={'cg-g-barra' + (x.n >= meta ? ' cg-g-barra--meta' : '') + (i === foco ? ' cg-g-foco' : '')} /> : <rect x={i * larg + 5} y={base - 2} width={larg - 10} height="2" className={x.folga ? 'cg-g-folga' : 'cg-g-zero'} />}
        <text x={i * larg + larg / 2} y={H - 8} className={'cg-g-texto' + (i === foco ? ' cg-g-texto--foco' : '')} textAnchor="middle">{x.d.getDate()}</text>
      </g>)}
      {meta > 0 && <><line x1="0" x2={W} y1={y(meta)} y2={y(meta)} className="cg-g-meta" /><text x={W - 2} y={y(meta) - 4} className="cg-g-texto" textAnchor="end">meta {meta}</text></>}
    </svg>
    <p className="cg-leitura"><b>{SEM3[f.d.getDay()]} {curta(f.d)}</b>: {f.folga && !f.n ? 'folga' : <>{f.n} questões novas{f.acerto !== null ? `, ${f.acerto}% de acerto` : ''}{f.n >= meta && meta > 0 ? ' · meta batida' : ''}</>} <span>· 14 dias: {total} questões, média de {Math.round(total / Math.max(1, dias.filter((x) => !x.folga).length))} por dia de estudo</span></p>
  </>
}
/** Barra com o topo arredondado e a base reta. */
const barra = (x: number, y: number, w: number, h: number) => { const r = Math.min(4, h, w / 2); return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z` }

function GraficoProgresso({ historico, plano, calculo, previsao }: { historico: Map<string, DiaFeito>; plano: PlanoSalvo; calculo: CalculoPlano; previsao: ReturnType<typeof previsaoDeTermino> }) {
  const hoje = diaCivil()
  const criado = diaCivil(Date.parse(plano.criado_em))
  const fimConteudo = calculo.inicioRetaFinal > criado ? calculo.inicioRetaFinal : diaCivil(plano.data_prova)
  const total = Math.max(1, Math.round((fimConteudo.getTime() - criado.getTime()) / DIA))
  const W = 560, H = 150, topo = 12, base = 126
  const alvo = Math.max(1, calculo.alvo)
  const x = (d: Date) => Math.min(W, Math.max(0, ((d.getTime() - criado.getTime()) / DIA / total) * W))
  const y = (v: number) => base - (Math.min(alvo, v) / alvo) * (base - topo)
  const pontos: Array<[number, number]> = [[0, y(0)]]
  let soma = 0
  for (let d = new Date(criado); d <= hoje && d <= fimConteudo; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) { soma += historico.get(chaveCivil(d))?.n ?? 0; pontos.push([x(new Date(d.getTime() + DIA)), y(soma)]) }
  const ultimo = pontos[pontos.length - 1]
  const projetado = previsao.ritmo ? Math.min(alvo, soma + previsao.ritmo * calculo.diasEstudoRestantes) : null
  const esperado = Math.min(alvo, calculo.esperadoAteHoje)
  const linha = (ps: Array<[number, number]>) => ps.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join(' ')
  return <>
    <svg className="cg-grafico" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Progresso: ${soma} de ${alvo} questões do plano feitas; o planejado para hoje era ${esperado}.`}>
      <line x1="0" x2={W} y1={base} y2={base} className="cg-g-eixo" /><line x1="0" x2={W} y1={topo} y2={topo} className="cg-g-grade" />
      <text x="2" y={topo - 3} className="cg-g-texto">{alvo} questões</text>
      <line x1="0" y1={y(0)} x2={W} y2={y(alvo)} className="cg-g-plano" />
      {projetado !== null && calculo.fase === 'conteudo' && <line x1={ultimo[0]} y1={ultimo[1]} x2={W} y2={y(projetado)} className="cg-g-proj" />}
      <path d={`${linha(pontos)} L${ultimo[0]},${base} L0,${base} Z`} className="cg-g-area" /><path d={linha(pontos)} className="cg-g-linha" />
      <circle cx={ultimo[0]} cy={ultimo[1]} r="4.5" className="cg-g-ponto" />
      <text x="0" y={H - 6} className="cg-g-texto">{curta(criado)}</text><text x={W} y={H - 6} className="cg-g-texto" textAnchor="end">reta final {curta(fimConteudo)}</text>
      {ultimo[0] > 60 && ultimo[0] < W - 90 && <text x={ultimo[0]} y={H - 6} className="cg-g-texto cg-g-texto--foco" textAnchor="middle">hoje</text>}
    </svg>
    <p className="cg-legenda cg-legenda--grafico"><span className="cg-l-feito">feito: <b>{soma}</b></span><span className="cg-l-plano">planejado até hoje: <b>{esperado}</b></span>{projetado !== null && <span className="cg-l-proj">no seu ritmo você chega a <b>{Math.round((100 * projetado) / alvo)}%</b></span>}<span>{soma >= esperado ? `${soma - esperado} à frente` : `${esperado - soma} atrás`} do planejado</span></p>
  </>
}

function GraficoAcerto({ historico, media }: { historico: Map<string, DiaFeito>; media: number | null }) {
  const hoje = diaCivil()
  const dias = Array.from({ length: 14 }, (_, k) => { const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (13 - k)); const f = historico.get(chaveCivil(d)); return { d, pct: f && f.validas >= 3 ? Math.round((100 * f.certas) / f.validas) : null, n: f?.validas ?? 0 } })
  const com = dias.map((x, i) => ({ ...x, i })).filter((x) => x.pct !== null)
  const [foco, definirFoco] = useState<number | null>(null)
  if (com.length < 2) return <p className="cg-nota">O gráfico aparece com dois dias de estudo (3 respostas ou mais em cada um). Ele mostra se o seu acerto está subindo ou caindo.</p>
  const W = 560, H = 150, topo = 12, base = 124, larg = W / 14
  const x = (i: number) => i * larg + larg / 2, y = (v: number) => base - (v / 100) * (base - topo)
  const f = com.find((c) => c.i === foco) ?? com[com.length - 1]
  const melhor = com.reduce((a, b) => (b.pct! > a.pct! ? b : a)), pior = com.reduce((a, b) => (b.pct! < a.pct! ? b : a))
  return <>
    <svg className="cg-grafico" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Acerto por dia nos últimos 14 dias; melhor dia ${melhor.pct}%, pior ${pior.pct}%.`}>
      <line x1="0" x2={W} y1={base} y2={base} className="cg-g-eixo" /><line x1="0" x2={W} y1={y(50)} y2={y(50)} className="cg-g-grade" /><line x1="0" x2={W} y1={y(100)} y2={y(100)} className="cg-g-grade" />
      <text x="2" y={y(100) - 2} className="cg-g-texto">100%</text><text x="2" y={y(50) - 2} className="cg-g-texto">50%</text>
      {media !== null && <><line x1="0" x2={W} y1={y(media)} y2={y(media)} className="cg-g-meta" /><text x={W - 2} y={y(media) - 4} className="cg-g-texto" textAnchor="end">média {media}%</text></>}
      <path d={com.map((c, k) => `${k ? 'L' : 'M'}${x(c.i)},${y(c.pct!)}`).join(' ')} className="cg-g-linha" />
      {com.map((c) => <g key={c.i} tabIndex={0} onMouseEnter={() => definirFoco(c.i)} onFocus={() => definirFoco(c.i)} aria-label={`${SEM3[c.d.getDay()]} ${curta(c.d)}: ${c.pct}% em ${c.n} questões`}>
        <rect x={c.i * larg} y="0" width={larg} height={H} fill="transparent" /><circle cx={x(c.i)} cy={y(c.pct!)} r={c.i === f.i ? 6 : 4.5} className="cg-g-ponto" />
      </g>)}
      {dias.map((d, i) => <text key={i} x={x(i)} y={H - 8} className={'cg-g-texto' + (i === f.i ? ' cg-g-texto--foco' : '')} textAnchor="middle">{d.d.getDate()}</text>)}
    </svg>
    <p className="cg-leitura"><b>{SEM3[f.d.getDay()]} {curta(f.d)}</b>: {f.pct}% de acerto em {f.n} questões <span>· melhor dia: {melhor.pct}% ({curta(melhor.d)}) · mais difícil: {pior.pct}% ({curta(pior.d)})</span></p>
  </>
}

function FaltaPorArea({ calculo, minutos }: { calculo: CalculoPlano; minutos: number }) {
  const soma = new Map<string, { nome: string; n: number; p1: number }>()
  for (const d of calculo.dias) for (const i of d.itens) { const a = soma.get(i.slug) ?? { nome: i.nome, n: 0, p1: 0 }; a.n += i.n; if (i.passada === 1) a.p1 += i.n; soma.set(i.slug, a) }
  const lista = [...soma].map(([slug, a]) => ({ slug, ...a })).sort((a, b) => b.n - a.n)
  if (!lista.length) return <p className="cg-nota">Nenhuma questão nova agendada: o conteúdo do plano está feito.</p>
  const maior = lista[0].n, total = lista.reduce((s, a) => s + a.n, 0)
  return <>
    <div className="cg-pilhada" role="img" aria-label={`Distribuição das ${total} questões que faltam por área`}>{lista.map((a) => <i key={a.slug} style={{ flexGrow: a.n, background: corDaArea(a.slug) }} title={`${a.nome}: ${a.n}`} />)}</div>
    <ul className="cg-falta">{lista.map((a) => <li key={a.slug} style={area(a.slug)}>
      <strong>{a.nome}</strong><span className="cg-trilho cg-trilho--area" aria-hidden="true"><i style={{ width: `${(a.n / maior) * 100}%` }} /></span><b>{a.n}</b><small>{Math.round((100 * a.n) / total)}% · {formatarTempo(a.n * minutos)}{a.p1 ? ` · ${a.p1} de prioridade máxima` : ''}</small>
    </li>)}</ul>
  </>
}

// ─── Desempenho por área ─────────────────────────────────────────────────────

function TabelaAreas({ areas, media, aoTreinar }: { areas: ReturnType<typeof areasParaMelhorar>['areas']; media: number | null; aoTreinar?: (slug: string) => void }) {
  if (!areas.some((a) => a.acerto !== null)) return <p className="cg-nota">O desempenho aparece aqui depois das primeiras respostas (3 por área). Cada área ganha a sua barra de acerto, comparada com a sua média.</p>
  const rot = { melhorar: 'melhorar', 'na-media': 'na média', forte: 'forte', 'sem-dados': 'sem dados' } as const
  return (
    <div className="cg-tabela" role="table" aria-label="Desempenho por área">
      <div className="cg-tabela__cab" role="row"><span role="columnheader">Área</span><span role="columnheader">Acerto</span><span role="columnheader">Já vistas</span><span role="columnheader" className="so-leitor">Ação</span></div>
      {areas.map((a) => <div key={a.slug} className={`cg-tabela__linha cg-sit--${a.situacao}`} role="row" style={area(a.slug)}>
        <span role="cell" className="cg-tabela__nome"><i aria-hidden="true" /><strong>{a.nome}</strong><em>{rot[a.situacao]}</em></span>
        <span role="cell" className="cg-tabela__barra">{a.acerto !== null ? <>
          <span className="cg-trilho" aria-hidden="true"><i style={{ width: `${a.acerto}%` }} />{media !== null && <u style={{ left: `${media}%` }} />}</span>
          <b>{a.acerto}%</b><small>{a.diferenca !== null && a.diferenca !== 0 ? `${a.diferenca > 0 ? '+' : ''}${a.diferenca} pts` : 'na média'}</small></> : <small>menos de 3 respostas</small>}</span>
        <span role="cell" className="cg-tabela__vistas"><b>{a.cobertura}%</b><small>{a.respondidas} de {a.respondidas + a.faltam}</small></span>
        <span role="cell">{aoTreinar && a.respondidas > 0 && <button type="button" className="cg-mini" onClick={() => aoTreinar(a.slug)} aria-label={`Treinar 15 questões de ${a.nome}`}>treinar 15</button>}</span>
      </div>)}
      <p className="cg-nota">O traço em cada barra é a sua média. "Melhorar" são as áreas 5 pontos ou mais abaixo dela; quanto mais a área cai na prova, mais acima ela aparece. O cronograma já reforça essas áreas sozinho.</p>
    </div>
  )
}

// ─── Como funciona ───────────────────────────────────────────────────────────

function ComoFunciona({ plano, calculo, minutos }: { plano: PlanoSalvo; calculo: CalculoPlano; minutos: number }) {
  const prova = diaCivil(plano.data_prova)
  const teto = Math.round((TETO_ATRASO - 1) * 100)
  const perguntas: Array<{ p: string; r: ReactNode }> = [
    { p: 'Quais questões eu faço hoje?', r: <>As do passo 2: <b>só questões que você ainda não respondeu</b>, na quantidade da meta{calculo.metaDiaNormal > 0 ? <> (num dia normal, {calculo.metaDiaNormal}, cerca de {formatarTempo(calculo.metaDiaNormal * minutos)})</> : null}. Cerca de 70% da área em foco, que fica uns 3 dias, e 30% de outra, para misturar; o que mais cai vem primeiro. O botão abre exatamente essas, já na ordem.</> },
    { p: 'E se eu não terminar o dia?', r: <>Nada se perde. O que faltou volta para a fila e é dividido pelos dias que restam, não só no dia seguinte. A meta nunca passa de <b>{teto}% acima do planejado</b>; se o atraso for maior, o que não cabe sai do fim da fila (o que menos cai) e a previsão avisa. A sessão de ontem não reabre.</> },
    { p: 'E se eu fizer a mais?', r: <>Tudo o que passar da meta sai dos próximos dias, começando pelo seguinte. Com a meta feita, o botão passa a adiantar o próximo dia, e as questões contam para ele.</> },
    { p: 'Onde entram os erros e as revisões?', r: <><b>Erros do cronograma</b> (passo 3): o que você errou nos últimos 14 dias do plano e ainda não acertou; voltam com as alternativas em ordem nova e saem quando você acerta. <b>Revisões do dia</b>: a revisão espaçada do site inteiro. Nenhuma conta na meta.</> },
    { p: 'O que é o mini-simulado?', r: <>A cada duas semanas, {TAMANHO_MINI} questões cronometradas do que você já viu, com os seus erros e dúvidas primeiro. Nesse dia a meta de novas cai pela metade.</> },
    ...(calculo.diasRetaFinal > 7 ? [{ p: 'Como funciona a revisão forte?', r: <>De {curta(calculo.inicioRetaFinal)} a {curta(new Date(calculo.inicioModoProva.getTime() - DIA))}. <b>Acabam as questões novas.</b> Cada dia traz duas áreas, com cerca de {calculo.metaMedia} questões que você já viu: erros, depois chutes e dúvidas, depois o que mais cai e você não vê há mais tempo.</> }] : []),
    { p: 'Como funciona o modo prova?', r: <>De {curta(calculo.inicioModoProva)} até a véspera. Menos volume. Três tarefas por dia: <b>simulado cronometrado</b> no horário e na duração da prova, <b>erros que importam</b> e <b>frases que caem</b>.</> },
    { p: 'E na véspera e no dia da prova?', r: <>Na véspera: aquecimento de 25 questões quase todas já acertadas, documento e caneta prontos, cama cedo. No dia ({curta(prova)}) o cronograma não pede nada.</> },
    { p: 'Folga, plantão e semana difícil?', r: <>Folga não tem meta e não quebra a sequência. Dia leve tem poucas questões. Na semana difícil a meta fica no mínimo de {DIA_MINIMO}, e o resto é redistribuído.</> },
  ]
  return (
    <section className="cg-caixa cg-col-7" id="como-funciona" aria-labelledby="cg-como-titulo">
      <h2 className="cg-caixa__titulo" id="cg-como-titulo">Como o cronograma funciona <small>com as datas e os números do seu plano</small></h2>
      <div className="cg-faq">{perguntas.map((x, i) => <details key={x.p} open={i === 0 || undefined}><summary>{x.p}<Icone nome="baixo" tamanho={14} /></summary><p>{x.r}</p></details>)}</div>
    </section>
  )
}

// ─── Ajustes ─────────────────────────────────────────────────────────────────

function Ajustes({ plano, calculo, hub, acoes, aoAjustar, ficticio }: { plano: PlanoSalvo; calculo: CalculoPlano; hub: HubDados | null; acoes?: AcoesVisao; aoAjustar?: () => void; ficticio: boolean }) {
  const hoje = diaCivil()
  const seg = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - ((hoje.getDay() + 6) % 7))
  const dificil = (plano.opcoes?.semanasDificeis ?? []).includes(chaveCivil(seg))
  const [hora, definirHora] = useState(7)
  const baixar = () => {
    const url = URL.createObjectURL(new Blob([gerarIcs(calculo, plano, hora)], { type: 'text/calendar;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'cronograma-orto-questoes.ics'; document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  const ocupado = hub?.salvandoOpcoes
  const conteudo = !calculo.naRetaFinal && !calculo.provaPassou
  return (
    <section className="cg-caixa cg-col-5" aria-labelledby="cg-ajustes-titulo">
      <h2 className="cg-caixa__titulo" id="cg-ajustes-titulo">Ajustes do plano <small>mudam na hora; o andamento continua</small></h2>
      <ul className="cg-ajustes">
        {acoes && conteudo && <Chave ligado={soTeot(plano)} aoMudar={acoes.aoSoTeot} desabilitado={ocupado} titulo="Só questões do TEOT" texto="deixa de fora o TARO e as outras provas" />}
        {hub && <Chave ligado={incluiSimulados(plano)} aoMudar={(v) => { void hub.aoTrocarSimulados(v) }} desabilitado={ocupado} titulo="OrtoQuestões Simulados" texto={`cerca de 1 a cada 5 no dia · ${hub.simulados.feitas} de ${hub.simulados.total} feitos${hub.simulados.acerto !== null ? ` · ${hub.simulados.acerto}%` : ''}`} />}
        {hub && conteudo && <Chave ligado={dificil} aoMudar={hub.aoSemanaDificil} desabilitado={ocupado} titulo="Semana difícil" texto={`só ${DIA_MINIMO} por dia nesta semana; o resto é redistribuído`} />}
        {acoes && conteudo && <li className="cg-ajuste"><span><strong>Dia dos erros</strong><small>o roteiro destaca os erros nesse dia</small></span>
          <select value={plano.opcoes?.diaErros ?? ''} disabled={ocupado} aria-label="Dia dos erros" onChange={(e) => acoes.aoDiaErros(e.target.value === '' ? null : Number(e.target.value))}><option value="">nenhum</option>{[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d}>{SEMANA[d]}</option>)}</select></li>}
        {!ficticio && !calculo.provaPassou && <li className="cg-ajuste"><span><strong>Levar para o calendário do celular</strong><small>cada dia vira um compromisso com lembrete</small></span>
          <span className="cg-linha"><select value={hora} aria-label="Horário do lembrete" onChange={(e) => definirHora(Number(e.target.value))}><option value={7}>7h</option><option value={12}>12h</option><option value={19}>19h</option></select><button type="button" className="cg-mini" onClick={baixar}>baixar</button></span></li>}
      </ul>
      <p className="cg-linha cg-linha--sep">
        {aoAjustar && <button type="button" className="cg-btn" onClick={aoAjustar}><Icone nome="lapis" tamanho={14} /> Data, ritmo e folgas</button>}
        <a className="cg-btn" href={href('/temas-que-mais-caem')}><Icone nome="grafico" tamanho={14} /> Temas que mais caem</a>
        <a className="cg-btn" href={href('/resumos')}><Icone nome="livro" tamanho={14} /> Biblioteca</a>
        <a className="cg-btn" href={href('/desempenho')}><Icone nome="alvo" tamanho={14} /> Desempenho completo</a>
      </p>
    </section>
  )
}

function Chave({ ligado, aoMudar, titulo, texto, desabilitado }: { ligado: boolean; aoMudar: (v: boolean) => void; titulo: string; texto: string; desabilitado?: boolean }) {
  return <li><button type="button" role="switch" aria-checked={ligado} className="cg-ajuste cg-chave" disabled={desabilitado} onClick={() => aoMudar(!ligado)}><span><strong>{titulo}</strong><small>{texto}</small></span><i aria-hidden="true"><i /></i></button></li>
}
