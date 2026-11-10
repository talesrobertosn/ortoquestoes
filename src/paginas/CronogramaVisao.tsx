import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { avisoVistoNaConta, marcarAvisoNaConta } from '../conta/avisosVistos'
import type { Indice } from '../dados/tipos'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { balancoDiaAnterior, incluiSimulados, indiceDoPlano, proximoDiaParaPuxar, soTeot, DIA_MINIMO, MINUTOS_POR_QUESTAO, ROTULO_PASSADA, TAMANHO_MINI, TETO_ATRASO, type CalculoPlano, type DiaPlano, type Passada, type PlanoSalvo } from '../dados/planoEstudo'
import { errosDoCronograma, idsRevanche, resumosDoDia, TAMANHO_REVANCHE, type ResumoDoDia } from '../dados/cronogramaRoteiro'
import { formatarTempo } from '../dados/hubCronograma'
import { AvisoDiagnostico, AvisoEsquecimento, CartaoConstancia, CartaoDesempenho, CartaoSimulados, ComoFuncionaCompleto, HojeRetaFinal, MapaRisco } from './CronogramaHub'
import { diaCurto, textoPuxar } from '../dados/frasesAdiantar'
import { ComoEstouIndo, Depois, ExportarCalendario, fraseAdiantadoHoje, PainelAdiantar, porQueHoje, Prontidao, Recolhido, ResumoSemana } from './CronogramaPainel'
import { corDaArea } from '../dados/coresAreas'
import { CalendarioCronograma } from './CronogramaCalendario'
import { FaixaFicticio, type MotivoConvite } from './CronogramaFicticio'
import { CenaTorre } from '../componentes/cronograma/CenaTorre'
import { Icone } from '../componentes/Icone'
import { href } from '../util/rotas'
import { chaveCivil, diaCivil } from '../util/dia'
import { CHAVE_RESUMAO_HOJE, lidoHoje, RESUMAO_HOJE_VAZIO, type ResumaoHoje } from '../estado/resumaoLido'
import { usarIndiceBiblioteca } from '../biblioteca/recomendar'
import { usarBiblioteca } from '../biblioteca/usarBiblioteca'
import type { HubDados } from './PlanoEstudo'
import '../estilos/paginas/CronogramaNovo.css'

/**
 * A página do Cronograma de TEOT e TARO, refeita em 10/11/2026 (pedido do Tales).
 * Ordem da tela: a estrada até a prova (cena, dias que faltam, o botão do dia e as fases), o roteiro de
 * hoje em passos (1. ler os resumos do dia, 2. as questões de hoje, 3. os erros dos dias anteriores),
 * o calendário do mês, as respostas de "como funciona" e, recolhido, o resto (andamento, risco,
 * simulados, exportar e as opções). A conta do plano continua em dados/planoEstudo.ts.
 */

type Respondidas = Record<string, RegistroQuestao>
const DIA = 86_400_000
const FORMATO_CURTA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const FORMATO_HOJE = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const FORMATO_SEMANA = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
const curta = (d: Date) => FORMATO_CURTA.format(d)
const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`
const juntar = (nomes: string[]) => nomes.length <= 1 ? nomes.join('') : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`

function primeiroNome(nome?: unknown): string {
  const primeiro = String(nome ?? '').trim().split(/\s+/)[0] ?? ''
  if (!primeiro || /[@\d_]/.test(primeiro) || primeiro.length < 2 || primeiro.length > 20) return ''
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR')
}

export interface AcoesVisao {
  /** Abre uma sessão só com os erros dos dias anteriores (alternativas em ordem nova). */
  aoRevanche: (ids: string[]) => void
  /** Liga ou desliga "só questões do TEOT". */
  aoSoTeot: (ligar: boolean) => void
  /** Reserva (ou libera) um dia da semana para a revisão dos erros. */
  aoDiaErros: (dia: number | null) => void
}

export function VisaoCronograma({ plano, calculo, indice, respondidas, aoComecar, aoAdiantar, aoPuxar, pendente = null, hub = null, aoAjustar, ficticio = null, acoes, detalheSemanas }: {
  plano: PlanoSalvo; calculo: CalculoPlano; indice: Indice; respondidas: Respondidas
  /** Mantido por compatibilidade: o cronograma só aparece aberto (assinante ou cenário fictício). */
  aberto?: boolean
  aoComecar?: () => void; aoAdiantar?: (n: number) => void; aoPuxar?: (dia: string) => void
  pendente?: { feitas: number; total: number; tema: string; simulado?: boolean } | null
  hub?: HubDados | null; aoAjustar?: () => void
  ficticio?: { nome: string; aoConvidar: (motivo: MotivoConvite) => void } | null
  acoes?: AcoesVisao
  /** A lista "semana a semana, em detalhe" (PlanoEstudo.tsx). */
  detalheSemanas?: ReactNode
}) {
  const { sessao: sessaoConta } = usarConta()
  const minutos = hub?.minutosQuestao ?? MINUTOS_POR_QUESTAO
  const nome = ficticio?.nome ?? primeiroNome(sessaoConta?.user.user_metadata?.nome)
  const [resumaoHoje] = usarArmazenado<ResumaoHoje>(CHAVE_RESUMAO_HOJE, RESUMAO_HOJE_VAZIO)
  const [tourVisto, definirTourVisto] = usarArmazenado<boolean>('cronograma:tour-v2', false)
  const primeiraVisita = !ficticio && !tourVisto && !avisoVistoNaConta(sessaoConta?.user.user_metadata, 'cronograma-tour')
  useEffect(() => { if (!ficticio && tourVisto && sessaoConta) marcarAvisoNaConta(sessaoConta.user.user_metadata, 'cronograma-tour') }, [ficticio, tourVisto, sessaoConta])
  const fecharBoasVindas = () => { definirTourVisto(true); marcarAvisoNaConta(sessaoConta?.user.user_metadata, 'cronograma-tour') }

  const naRetaFinal = calculo.fase === 'revisao' || calculo.fase === 'prova' || calculo.fase === 'vespera'
  const conteudo = !calculo.provaPassou && !calculo.naRetaFinal
  const feitos = hub?.feitosDia ?? { data: '' }

  // ── Hoje ──
  const itensDia = calculo.hoje?.itens ?? []
  const principal = itensDia.find((i) => !i.mistura) ?? itensDia[0] ?? null
  const folgaHoje = calculo.tipoHoje === 'folga'
  const metaFeita = calculo.metaDiaria > 0 && calculo.faltaHoje === 0
  const corHoje = corDaArea(principal?.slug ?? calculo.dias.find((d) => d.itens.length)?.itens[0]?.slug)
  const proximoPuxar = aoPuxar && !pendente ? proximoDiaParaPuxar(calculo) : null
  const podeAdiantar = !!aoAdiantar && conteudo && calculo.restante > 0

  // ── Resumos do dia: das questões de hoje; com hoje terminado (ou folga), as do próximo dia de estudo ──
  const indicePlano = useMemo(() => indiceDoPlano(indice, plano), [indice, plano])
  const biblioteca = usarIndiceBiblioteca()
  const { leituras } = usarBiblioteca()
  const diaDosResumos: { ids: string[]; deHoje: boolean; data: Date | null } = useMemo(() => {
    const deHoje = (calculo.hoje?.itens ?? []).flatMap((i) => i.ids)
    if (deHoje.length) return { ids: deHoje, deHoje: true, data: null }
    const proximo = calculo.dias.slice(1).find((d) => d.total > 0)
    return { ids: proximo?.itens.flatMap((i) => i.ids) ?? [], deHoje: false, data: proximo?.data ?? null }
  }, [calculo])
  const resumos = useMemo(() => resumosDoDia(biblioteca, indicePlano, diaDosResumos.ids), [biblioteca, indicePlano, diaDosResumos])
  // O dia tocado no calendário: os resumos dele aparecem logo abaixo do calendário.
  const [diaEscolhido, definirDiaEscolhido] = useState<{ data: Date; ehHoje: boolean; ids: string[] } | null>(null)
  const resumosEscolhido = useMemo(() => (diaEscolhido && !diaEscolhido.ehHoje && diaEscolhido.ids.length ? resumosDoDia(biblioteca, indicePlano, diaEscolhido.ids) : []), [biblioteca, indicePlano, diaEscolhido])

  // ── Erros dos dias anteriores e o balanço de ontem ──
  const erros = useMemo(() => errosDoCronograma(indice, respondidas, plano), [indice, respondidas, plano])
  const balanco = useMemo(() => (conteudo ? balancoDiaAnterior(indice, respondidas, plano) : null), [indice, respondidas, plano, conteudo])
  const diaErros = plano.opcoes?.diaErros ?? null
  const hojeEhDiaDosErros = diaErros !== null && diaCivil().getDay() === diaErros && erros.pendentes.length > 0

  // ── O botão do dia (um só, o mesmo no topo e no roteiro) ──
  let botao: { rotulo: string; detalhe?: string; aoClicar?: () => void; href?: string } | null = null
  if (!naRetaFinal && !calculo.provaPassou) {
    if (pendente) botao = { rotulo: `Continuar: faltam ${pendente.total - pendente.feitas}`, detalhe: `Você parou na ${pendente.feitas + 1}ª questão. As respondidas ficam salvas.`, href: href('/sessao') }
    else if (calculo.hoje && calculo.faltaHoje + calculo.adiantarFalta > 0) {
      const n = calculo.faltaHoje + calculo.adiantarFalta
      const so = calculo.faltaHoje === 0
      botao = { rotulo: so ? `Continuar: faltam ${n} adiantadas` : calculo.feitasHoje > 0 ? `Continuar: faltam ${n} questões` : `Começar: ${n} questões`, detalhe: `~${formatarTempo(n * minutos)}${calculo.adiantarFalta > 0 && !so ? ` · ${calculo.adiantarFalta} adiantadas` : ''}`, aoClicar: aoComecar }
    } else if (calculo.miniHoje && !feitos.mini && hub) botao = { rotulo: 'Fazer o mini-simulado', detalhe: `${TAMANHO_MINI} questões · ~45 min`, aoClicar: hub.aoMini }
    else if (proximoPuxar) {
      const t = textoPuxar(proximoPuxar)
      botao = { rotulo: t.rotulo, detalhe: `${t.detalhe} · ~${formatarTempo(proximoPuxar.total * minutos)} · contam para ${diaCurto(proximoPuxar.data).split(',')[0]}`, aoClicar: () => aoPuxar!(chaveCivil(proximoPuxar.data)) }
    }
  }
  const renderBotao = (grande = false) => !botao ? null : botao.href
    ? <a className={'cristal cn-acao' + (grande ? ' cn-acao--grande' : '')} href={botao.href}><strong>{botao.rotulo}</strong>{botao.detalhe && <small>{botao.detalhe}</small>}</a>
    : <button type="button" className={'cristal cn-acao' + (grande ? ' cn-acao--grande' : '')} onClick={botao.aoClicar}><strong>{botao.rotulo}</strong>{botao.detalhe && <small>{botao.detalhe}</small>}</button>

  const tituloHoje = calculo.provaPassou ? 'A prova chegou' : folgaHoje ? 'Hoje é folga'
    : calculo.restante === 0 && conteudo ? 'Você cumpriu o cronograma inteiro'
    : calculo.metaDiaria === 0 && calculo.adiantadoHoje > 0 ? 'Hoje já está adiantado'
    : metaFeita && !calculo.miniHoje ? 'Meta de hoje feita'
    : principal ? principal.nome : calculo.miniHoje ? 'Dia de mini-simulado' : 'Hoje'
  const porQue = folgaHoje ? 'Dia de descanso no seu plano: a meta foi espalhada pelos outros dias.'
    : calculo.metaDiaria === 0 && calculo.adiantadoHoje > 0 ? 'Você fez as questões de hoje num dia anterior. Pode descansar ou adiantar mais.'
    : metaFeita ? 'O que você fizer a partir de agora sai dos próximos dias.'
    : calculo.tipoHoje === 'leve' ? `Dia leve (plantão): só ${calculo.metaDiaria} questões.`
    : calculo.tipoHoje === 'dificil' ? `Semana difícil: só o dia mínimo (${calculo.metaDiaria} questões), para não quebrar a sequência.`
    : principal ? porQueHoje(calculo, principal.slug, plano.prova) : ''

  return <>
    {ficticio && <FaixaFicticio nome={ficticio.nome} />}

    <Topo plano={plano} calculo={calculo} nome={nome} selo={ficticio ? 'Cenário fictício' : undefined} aoAjustar={aoAjustar} botao={renderBotao()}
      semana={hub?.semana ? <ResumoSemana {...hub.semana} /> : null} />

    {primeiraVisita && <aside className="cn-boasvindas" aria-label="Primeira vez no cronograma">
      <p><strong>Primeira vez aqui?</strong> A página tem três partes: a <b>estrada</b> até a prova (onde você está), o <b>roteiro de hoje</b> (o que fazer, na ordem) e o <b>calendário</b> do mês. As regras estão em <a href="#como-funciona">Como funciona</a>.</p>
      <button type="button" className="cn-btn" onClick={fecharBoasVindas}>Entendi</button>
    </aside>}

    {/* ── O roteiro de hoje ── */}
    {naRetaFinal && hub
      ? <section className="cn-hoje cn-hoje--reta" aria-label="Hoje, na reta final"><HojeRetaFinal calculo={calculo} acoes={hub.retaFinal} minutos={minutos} /></section>
      : <section className="cn-hoje" aria-labelledby="cn-hoje-titulo" style={{ ['--cn-area' as string]: corHoje }}>
        <header className="cn-hoje__cabeca">
          <p className="cn-rotulo">Hoje · {FORMATO_HOJE.format(diaCivil())}</p>
          <h2 id="cn-hoje-titulo"><i className="cn-ponto" aria-hidden="true" />{tituloHoje}</h2>
          {porQue && <p className="cn-hoje__porque">{porQue}</p>}
        </header>

        {balanco && balanco.faltou > 0 && !folgaHoje && <AvisoOntem balanco={balanco} calculo={calculo} />}

        <ol className="cn-passos">
          {/* 1. Os resumos do dia, antes das questões */}
          {!calculo.provaPassou && <li className="cn-passo">
            <span className="cn-passo__n" aria-hidden="true">1</span>
            <div className="cn-passo__corpo">
              <h3>{diaDosResumos.deHoje ? 'Leia antes de começar' : 'Leitura para o próximo dia de estudo'}</h3>
              <ResumosDoDia resumos={resumos} leituras={leituras} carregando={!biblioteca} total={diaDosResumos.ids.length} deHoje={diaDosResumos.deHoje} data={diaDosResumos.data}
                area={principal ?? calculo.dias.find((d) => d.itens.length)?.itens[0] ?? null}
                frasesLidas={!!principal && ((!ficticio && lidoHoje(resumaoHoje, principal.slug)) || (hub?.resumaoLido ?? []).includes(principal.slug))} />
            </div>
          </li>}

          {/* 2. As questões de hoje */}
          <li className={'cn-passo' + (metaFeita ? ' cn-passo--feito' : '')}>
            <span className="cn-passo__n" aria-hidden="true">{metaFeita ? <Icone nome="check" tamanho={16} /> : 2}</span>
            <div className="cn-passo__corpo">
              <h3>{folgaHoje ? 'Sem questões hoje' : calculo.metaDiaria > 0 ? `As ${calculo.metaDiaria} questões de hoje` : calculo.adiantadoHoje > 0 ? 'As questões de hoje já foram feitas' : 'Questões de hoje'}
                {calculo.metaDiaria > 0 && <small> · ~{formatarTempo(calculo.metaDiaria * minutos)}</small>}</h3>
              {calculo.metaDiaria > 0 && <>
                <div className="cn-barra" role="img" aria-label={`${Math.min(calculo.feitasHoje, calculo.metaDiaria)} de ${calculo.metaDiaria} feitas`}><span style={{ width: `${Math.min(100, (calculo.feitasHoje / calculo.metaDiaria) * 100)}%` }} /></div>
                <p className="cn-passo__conta"><b>{Math.min(calculo.feitasHoje, calculo.metaDiaria)}</b> de {calculo.metaDiaria} feitas{calculo.adiantadoHoje > 0 ? ` · ${fraseAdiantadoHoje(calculo)}` : ''}</p>
              </>}
              {!metaFeita && itensDia.length > 0 && <ul className="cn-areas">
                {itensDia.map((i) => <li key={i.slug + String(i.mistura)} style={{ ['--cn-area' as string]: corDaArea(i.slug) }}>
                  <b className="numerico">{i.n}</b>
                  <span><strong>{i.nome}</strong>{i.mistura && <em> para misturar</em>}<small>{i.assuntos.slice(0, 4).join(' · ')}{i.assuntos.length > 4 ? ` · +${i.assuntos.length - 4}` : ''}</small></span>
                </li>)}
              </ul>}
              {!metaFeita && itensDia.length > 0 && <p className="cn-nota">São questões que você ainda não respondeu{soTeot(plano) ? ', só do TEOT' : ''}{incluiSimulados(plano) ? ', com alguns OrtoQuestões Simulados no meio' : ''}. A mistura vem espalhada pela sessão.</p>}
              {folgaHoje && <p className="cn-nota">Se quiser estudar mesmo assim, o botão abaixo puxa as questões do próximo dia: elas contam para ele.{aoAjustar && <> Para mudar as folgas, use <button type="button" className="cn-link" onClick={aoAjustar}>Ajustar</button>.</>}</p>}
              {calculo.miniHoje && <p className="cn-nota"><b>Hoje tem mini-simulado</b>: {TAMANHO_MINI} questões cronometradas do que você já viu{feitos.mini ? ' (feito)' : ''}. Por isso a meta de questões novas é a metade.{!feitos.mini && hub && botao?.aoClicar !== hub.aoMini && <> <button type="button" className="cn-link" onClick={hub.aoMini}>Fazer o mini-simulado</button></>}</p>}
              {renderBotao(true)}
              {calculo.amanha && <p className="cn-amanha"><Icone nome="direita" tamanho={14} /> <b>{FORMATO_SEMANA.format(calculo.amanha.data)}</b>: {resumoDoDia(calculo.amanha)}</p>}
            </div>
          </li>

          {/* 3. Os erros dos dias anteriores do cronograma */}
          {conteudo && <li className={'cn-passo cn-passo--erros' + (hojeEhDiaDosErros ? ' cn-passo--destaque' : '')}>
            <span className="cn-passo__n" aria-hidden="true">3</span>
            <div className="cn-passo__corpo">
              <h3>Refaça o que você errou{erros.pendentes.length > 0 && <small> · {plural(erros.pendentes.length, 'questão', 'questões')}</small>}</h3>
              <Revanche erros={erros} minutos={minutos} aoRevanche={acoes?.aoRevanche} diaErros={diaErros} hojeEhODia={hojeEhDiaDosErros} />
            </div>
          </li>}
        </ol>

        {/* O resto do dia: opção visível, fechada de início (a tela abre limpa). */}
        {hub && conteudo && <details className="cn-mais" open={metaFeita || undefined}>
          <summary><span>Mais para hoje</span><small>adiantar, revisões do dia, flashcards e frases que caem</small><Icone nome="baixo" tamanho={16} /></summary>
          <div className="cn-mais__corpo">
            {podeAdiantar && <PainelAdiantar calculo={calculo} minutos={minutos} destaque={false} salvando={hub.salvandoOpcoes} aoAdiantar={aoAdiantar!} aoCancelar={hub.aoCancelarAdiantar} />}
            <ul className="cn-extras">
              {hub.revisoesHoje > 0 && <li><Icone nome="reiniciar" tamanho={18} /><span><strong>{plural(hub.revisoesHoje, 'revisão', 'revisões')} do dia</strong><small>Erros, chutes e dúvidas de qualquer época que voltam hoje pela revisão espaçada · ~{formatarTempo(hub.revisoesHoje * minutos)}</small></span><a className="cn-btn" href={href('/revisao')}>Revisar</a></li>}
              <li><Icone nome="raio" tamanho={18} /><span><strong>Flashcards{feitos.flashcards ? ' (feito)' : ''}</strong><small>Uma rodada curta para fixar · ~5 min</small></span><a className="cn-btn" href={href('/flashcards')} onClick={() => hub.aoMarcar('flashcards')}>Abrir</a></li>
              {principal && <li><Icone nome="livro" tamanho={18} /><span><strong>Frases que caem de {principal.nome.toLowerCase()}</strong><small>As frases "Na prova" dos comentários, para ler em minutos · ~4 min</small></span><a className="cn-btn" href={href(`/resumos/frases?tema=${principal.slug}`)}>Ler</a></li>}
            </ul>
            <p className="cn-nota">Nada aqui é obrigatório nem conta na meta: a meta é só de questões novas.</p>
          </div>
        </details>}
      </section>}

    {(hub?.mostrarDiagnostico || (hub?.esquecidos.length ?? 0) > 0) && <div className="cn-avisos">
      {hub?.mostrarDiagnostico && <AvisoDiagnostico aoFazer={hub.aoDiagnostico} simulados={incluiSimulados(plano)} />}
      {hub && <AvisoEsquecimento esquecidos={hub.esquecidos} aoReativar={hub.aoReativar} />}
    </div>}

    {/* ── O calendário do mês ── */}
    <CalendarioCronograma embutido ficticio={!!ficticio} nome={nome} plano={plano} calculo={calculo} indice={indice} respondidas={respondidas} minutos={minutos} revisoesHoje={hub?.revisoesHoje ?? 0}
      acoes={{ aoComecar, pendente, aoPuxar: podeAdiantar ? aoPuxar : undefined, proximo: proximoPuxar, salvando: hub?.salvandoOpcoes }} aoSelecionar={definirDiaEscolhido} />
    {diaEscolhido && !diaEscolhido.ehHoje && resumosEscolhido.length > 0 && <section className="cn-doescolhido" aria-label="Resumos do dia escolhido no calendário">
      <p className="cn-rotulo">Resumos de {diaCurto(diaEscolhido.data)}</p>
      <ListaResumos resumos={resumosEscolhido} leituras={leituras} total={diaEscolhido.ids.length} />
    </section>}

    <ComoFunciona plano={plano} calculo={calculo} minutos={minutos} />

    {/* ── O resto, recolhido ── */}
    {hub && <section className="cn-resto" aria-labelledby="cn-resto-titulo">
      <h2 id="cn-resto-titulo" className="cn-secao__titulo">Seu andamento</h2>
      <ComoEstouIndo calculo={calculo} constancia={hub.constancia} minutosQuestao={minutos} />
      <div className="cp-recolhidos cp-recolhidos--grade">
        <Recolhido titulo="Constância: os últimos 14 dias" icone="fogo"><CartaoConstancia constancia={hub.constancia} elogio={hub.elogio} /></Recolhido>
        <Recolhido titulo="Desempenho e prontidão por área" icone="grafico"><Prontidao areas={hub.prontidao} /><CartaoDesempenho areas={hub.desempenho} media={hub.media} /></Recolhido>
        <Recolhido titulo="Mapa de risco" icone="alvo"><MapaRisco riscos={hub.riscos} cegos={hub.cegos} aoTreinar={hub.aoTreinarFoco} /></Recolhido>
        <Recolhido titulo="OrtoQuestões Simulados" icone="estrela"><CartaoSimulados plano={plano} feitas={hub.simulados.feitas} total={hub.simulados.total} acerto={hub.simulados.acerto} aoTrocar={hub.aoTrocarSimulados} /></Recolhido>
        {!calculo.provaPassou && <Recolhido titulo="Até a prova, semana a semana" icone="rota"><Depois calculo={calculo} plano={plano} detalhe={detalheSemanas} /></Recolhido>}
        {!ficticio && <Recolhido titulo="Levar para o calendário do celular" icone="calendario"><ExportarCalendario calculo={calculo} plano={plano} /></Recolhido>}
        {conteudo && hub.aoSemanaDificil && <Recolhido titulo="Semana difícil" icone="relogio"><SemanaDificil plano={plano} aoMudar={hub.aoSemanaDificil} salvando={hub.salvandoOpcoes} /></Recolhido>}
        <ComoFuncionaCompleto aberto={false} plano={plano} />
      </div>
    </section>}

    {/* ── Opções discretas, no pé ── */}
    <footer className="cn-pe">
      {acoes && !calculo.provaPassou && <div className="cn-opcoes" role="group" aria-label="Opções do cronograma">
        <Chave ligado={soTeot(plano)} aoMudar={acoes.aoSoTeot} desabilitado={hub?.salvandoOpcoes}
          titulo="Só questões do TEOT" texto="Deixa de fora o TARO e as outras provas. O que você já fez continua contando." />
        <label className="cn-opcao"><span><strong>Dia dos erros</strong><small>Um dia da semana em que o roteiro abre pelos erros.</small></span>
          <select value={diaErros ?? ''} disabled={hub?.salvandoOpcoes} onChange={(e) => acoes.aoDiaErros(e.target.value === '' ? null : Number(e.target.value))}>
            <option value="">Nenhum</option>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d}>{DIAS_SEMANA[d]}</option>)}
          </select></label>
      </div>}
      <p className="cn-pe__links">
        {aoAjustar && <button type="button" className="cn-link" onClick={aoAjustar}><Icone nome="lapis" tamanho={15} /> Ajustar data, ritmo e folgas</button>}
        <a className="cn-link" href={href('/temas-que-mais-caem')}><Icone nome="grafico" tamanho={15} /> Temas que mais caem</a>
        <a className="cn-link" href={href('/resumos')}><Icone nome="livro" tamanho={15} /> Biblioteca de resumos</a>
      </p>
    </footer>
  </>
}

/** "62 questões: Trauma adulto, com Joelho para misturar" de um dia do plano. */
function resumoDoDia(d: DiaPlano): string {
  if (!d.total) return d.adiantado > 0 ? 'livre, você já adiantou' : d.mini ? 'mini-simulado' : 'sem questões novas'
  const foco = d.itens.filter((i) => !i.mistura).map((i) => i.nome)
  const mist = d.itens.filter((i) => i.mistura).map((i) => i.nome)
  return `${plural(d.total, 'questão', 'questões')} de ${juntar(foco.length ? foco : mist)}${foco.length && mist.length ? `, com ${juntar(mist)} para misturar` : ''}${d.mini ? ' e o mini-simulado' : ''}`
}

// ─── O topo: a estrada até a prova ───────────────────────────────────────────

interface Trecho { id: string; nome: string; de: Date; ate: Date; texto: ReactNode }

function Topo({ plano, calculo, nome, selo, aoAjustar, botao, semana }: { plano: PlanoSalvo; calculo: CalculoPlano; nome: string; selo?: string; aoAjustar?: () => void; botao: ReactNode; semana: ReactNode }) {
  const hoje = diaCivil()
  const prova = diaCivil(plano.data_prova)
  const criado = diaCivil(Date.parse(plano.criado_em))
  const vespera = new Date(prova.getFullYear(), prova.getMonth(), prova.getDate() - 1)
  const passadas = ([1, 2, 3] as Passada[]).filter((p) => calculo.inicioPassada[p] || calculo.passadaAtual === p)
  const inicioDe = (p: Passada) => calculo.inicioPassada[p] ?? hoje
  const trechos: Trecho[] = []
  if (calculo.fase === 'conteudo') passadas.forEach((p, i) => {
    const de = i === 0 ? (criado < inicioDe(p) ? criado : inicioDe(p)) : inicioDe(p)
    const ate = passadas[i + 1] ? inicioDe(passadas[i + 1]) : calculo.inicioRetaFinal
    if (ate > de) trechos.push({ id: `p${p}`, nome: ROTULO_PASSADA[p].nome, de, ate, texto: <>Questões novas: {ROTULO_PASSADA[p].texto}. {p === 1 ? 'É a parte que garante o que mais cai, mesmo se a rotina apertar depois.' : p === 2 ? 'Entra quando a prioridade máxima de todas as áreas já foi vista.' : 'Fecha o acervo do seu plano; se faltar tempo, é daqui que o plano corta.'}</> })
  })
  else trechos.push({ id: 'conteudo', nome: 'Conteúdo novo', de: criado, ate: calculo.inicioRetaFinal, texto: 'A fase de questões novas terminou.' })
  if (calculo.diasRetaFinal > 7) trechos.push({ id: 'revisao', nome: 'Revisão forte', de: calculo.inicioRetaFinal, ate: calculo.inicioModoProva, texto: <>Sem conteúdo novo. Cada dia traz uma fatia da prova (duas áreas) com cerca de <b>{calculo.metaMedia} questões que você já viu</b>: primeiro os seus erros, depois as marcadas como chute ou dúvida e, por fim, os assuntos que mais caem que você não vê há mais tempo.</> })
  trechos.push({ id: 'prova', nome: 'Modo prova', de: calculo.inicioModoProva, ate: prova, texto: <>A última semana, com menos volume para chegar descansado. Três tarefas por dia, na ordem que preferir: um <b>simulado cronometrado</b> no horário e na duração da prova, os <b>erros que importam</b> (só de prioridade alta e máxima) e as <b>frases que caem</b>. Na véspera ({curta(vespera)}), só um aquecimento de 25 questões quase todas já acertadas, e descanso.</> })
  const inicio = trechos[0].de.getTime(), fim = prova.getTime()
  const pos = Math.min(100, Math.max(0, ((hoje.getTime() - inicio) / Math.max(1, fim - inicio)) * 100))
  const atual = trechos.findIndex((t) => hoje >= t.de && hoje < t.ate)
  const [aberto, definirAberto] = useState<string | null>(null)
  const painel = useId()
  const escolhido = aberto === 'dia' ? null : trechos.find((t) => t.id === aberto) ?? null
  const extra = plano.opcoes?.provaExtra
  const colunas = trechos.map((t) => `minmax(3.2rem, ${Math.max(1, (t.ate.getTime() - t.de.getTime()) / DIA)}fr)`).join(' ') + ' auto'

  return (
    <section className="cn-topo" aria-labelledby="cn-topo-titulo">
      <div className="cn-topo__palco">
        <div className="cn-topo__cena"><CenaTorre /></div>
        <div className="cn-topo__texto">
          <p className="cn-topo__selo">{selo ?? 'Cronograma'} · {plano.prova}{soTeot(plano) ? ' · só TEOT' : ''}</p>
          <h1 id="cn-topo-titulo">{calculo.provaPassou ? (nome ? `${nome}, é o dia da prova` : 'Dia da prova') : <>{nome ? `${nome}, faltam` : 'Faltam'} <em className="numerico">{calculo.diasAteProva}</em> {calculo.diasAteProva === 1 ? 'dia' : 'dias'}</>}</h1>
          <p className="cn-topo__sub">Prova em {prova.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })} · semana {Math.min(calculo.semanaNumero, calculo.semanasTotal)} de {calculo.semanasTotal}</p>
          <div className="cn-topo__acoes">
            {botao}
            {aoAjustar && <button type="button" className="cn-topo__ajustar" onClick={aoAjustar}><Icone nome="lapis" tamanho={15} /> Ajustar</button>}
          </div>
        </div>
      </div>

      {!calculo.provaPassou && <div className="cn-estrada">
        <p className="cn-estrada__titulo">A estrada até a prova <small>toque numa etapa para ver como ela funciona</small></p>
        <div className="cn-estrada__trilho" style={{ gridTemplateColumns: colunas }}>
          {trechos.map((t, i) => <button key={t.id} type="button" className={'cn-etapa' + (i < atual ? ' cn-etapa--feita' : i === atual ? ' cn-etapa--atual' : '')} aria-expanded={aberto === t.id} aria-controls={painel} onClick={() => definirAberto(aberto === t.id ? null : t.id)}>
            <i className="cn-etapa__faixa" aria-hidden="true" />
            <b><span className="cn-largo">{t.nome}</span><span className="cn-estreito">{t.id.startsWith('p') && t.id !== 'prova' ? t.nome.split(' ')[0] : t.id === 'revisao' ? 'Revisão' : t.id === 'prova' ? 'Modo prova' : 'Conteúdo'}</span></b><small>{i === atual ? <><span className="cn-largo">você está aqui</span><span className="cn-estreito">você</span></> : curta(t.de)}</small>
          </button>)}
          <button type="button" className="cn-etapa cn-etapa--prova" aria-expanded={aberto === 'dia'} aria-controls={painel} onClick={() => definirAberto(aberto === 'dia' ? null : 'dia')}>
            <i className="cn-etapa__faixa" aria-hidden="true" /><b>Prova</b><small>{curta(prova)}</small>
          </button>
          <span className="cn-estrada__voce" style={{ left: `${pos}%` }} aria-hidden="true" />
        </div>
        <div id={painel} className="cn-estrada__painel" aria-live="polite">
          {escolhido && <p><b>{escolhido.nome}</b> ({curta(escolhido.de)} a {curta(new Date(escolhido.ate.getTime() - DIA))}). {escolhido.texto}</p>}
          {aberto === 'dia' && <p><b>O dia da prova</b> ({prova.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}). O cronograma termina na véspera: no dia não há tarefa, só a prova. Chegue cedo, com documento e caneta. Depois dela, você pode montar um cronograma novo quando quiser.{extra?.nome && extra.data >= chaveCivil(hoje) ? <> Antes, no caminho: <b>{extra.nome}</b> em {curta(new Date(`${extra.data}T00:00:00`))}.</> : null}</p>}
          {!aberto && <p className="cn-estrada__frase">{fraseDaFase(calculo)}</p>}
        </div>
        {semana}
      </div>}
    </section>
  )
}

function fraseDaFase(calculo: CalculoPlano): ReactNode {
  const hoje = diaCivil()
  if (calculo.fase === 'conteudo' && calculo.passadaAtual) {
    const proxima = ([2, 3] as Passada[]).find((p) => p > calculo.passadaAtual! && calculo.inicioPassada[p] && calculo.inicioPassada[p]! > hoje)
    return <>Agora: <b>{ROTULO_PASSADA[calculo.passadaAtual].nome}</b>, {ROTULO_PASSADA[calculo.passadaAtual].texto}. {proxima ? <>Em {curta(calculo.inicioPassada[proxima]!)} começa a {ROTULO_PASSADA[proxima].nome}.</> : <>Em {curta(calculo.inicioRetaFinal)} começa a reta final, sem conteúdo novo.</>}</>
  }
  if (calculo.fase === 'conteudo') return <>Conteúdo novo até {curta(new Date(calculo.inicioRetaFinal.getTime() - DIA))}. Depois, a reta final.</>
  if (calculo.fase === 'revisao') return <>Reta final: <b>revisão forte</b>, uma fatia da prova por dia. Em {curta(calculo.inicioModoProva)} começa o modo prova.</>
  if (calculo.fase === 'prova') return <>Reta final: <b>modo prova</b>. Simulado, os erros que importam e as frases que caem.</>
  return <>Véspera: aquecimento leve e descanso.</>
}

// ─── Passo 1: os resumos do dia ──────────────────────────────────────────────

type Leituras = Record<string, { progresso: number; concluidoEm?: number | null } | undefined>

function ListaResumos({ resumos, leituras, total }: { resumos: ResumoDoDia[]; leituras: Leituras; total: number }) {
  return (
    <ul className="cn-resumos">
      {resumos.map(({ resumo: r, questoes, assuntos }) => {
        const l = leituras[r.id]
        const lido = !!l?.concluidoEm || (l?.progresso ?? 0) >= 95
        const andamento = lido ? 100 : l?.progresso ?? 0
        const resta = Math.max(1, Math.round(r.minutos * (1 - andamento / 100)))
        return <li key={r.id}>
          <a className={'cn-resumo' + (lido ? ' cn-resumo--lido' : '')} href={href(`/resumos/${r.id}`)} style={{ ['--cn-area' as string]: corDaArea(r.especialidade) }}>
            <span className="cn-resumo__lombada" aria-hidden="true"><Icone nome={lido ? 'check' : 'livro'} tamanho={16} /></span>
            <span className="cn-resumo__texto">
              <strong>{r.titulo}</strong>
              <small>{questoes > 0 ? `Explica ${questoes === 1 ? '1 questão' : `${questoes} das ${total} questões`} deste dia` : `Ensina ${assuntos.slice(0, 2).join(' e ').toLowerCase()}`}<span className="cn-resumo__livro"> · {r.livro}</span></small>
              {andamento > 0 && !lido && <span className="cn-resumo__barra" aria-hidden="true"><i style={{ width: `${andamento}%` }} /></span>}
            </span>
            <span className="cn-resumo__tempo">{lido ? 'Lido' : andamento > 0 ? <>Continuar<small>~{resta} min</small></> : <>Ler<small>~{r.minutos} min</small></>}</span>
          </a>
        </li>
      })}
    </ul>
  )
}

function ResumosDoDia({ resumos, leituras, carregando, total, deHoje, data, area, frasesLidas }: { resumos: ResumoDoDia[]; leituras: Leituras; carregando: boolean; total: number; deHoje: boolean; data: Date | null; area: { slug: string; nome: string } | null; frasesLidas: boolean }) {
  if (!total) return <p className="cn-nota">Sem questões novas agendadas: aproveite para reler um resumo na <a href={href('/resumos')}>Biblioteca</a>.</p>
  if (carregando) return <p className="cn-nota" aria-busy="true">Procurando os resumos deste dia…</p>
  if (!resumos.length) return <>
    <p className="cn-nota">Os assuntos {deHoje ? 'de hoje' : 'desse dia'} ainda não têm resumo próprio na Biblioteca.{area && <> Leia as frases que caem de {area.nome.toLowerCase()} ou procure o capítulo pela área.</>}</p>
    {area && <p className="cn-linha-btn"><a className="cn-btn" href={href(`/resumos/frases?tema=${area.slug}`)}>Frases que caem{frasesLidas ? ' (lidas hoje)' : ''}</a><a className="cn-btn" href={href(`/resumos?area=${area.slug}`)}>Resumos de {area.nome.toLowerCase()}</a></p>}
  </>
  const todosLidos = resumos.every(({ resumo: r }) => !!leituras[r.id]?.concluidoEm || (leituras[r.id]?.progresso ?? 0) >= 95)
  return <>
    <p className="cn-passo__porque">{deHoje
      ? <>{resumos.length === 1 ? 'Este é o resumo mais próximo' : `Estes são os ${resumos.length} resumos mais próximos`} das questões de hoje. Leia primeiro: as questões viram treino do que você acabou de ver, e não um chute.{todosLidos ? ' Você já leu todos; pode ir direto às questões.' : ''}</>
      : <>Para {data ? FORMATO_SEMANA.format(data) : 'o próximo dia'}: {resumos.length === 1 ? 'o resumo mais próximo' : `os ${resumos.length} resumos mais próximos`} das questões que vêm.</>}</p>
    <ListaResumos resumos={resumos} leituras={leituras} total={total} />
  </>
}

// ─── O aviso de ontem ────────────────────────────────────────────────────────

function AvisoOntem({ balanco, calculo }: { balanco: NonNullable<ReturnType<typeof balancoDiaAnterior>>; calculo: CalculoPlano }) {
  const quando = diaCivil().getTime() - balanco.data.getTime() <= DIA ? 'Ontem' : `Na ${FORMATO_SEMANA.format(balanco.data).replace('-feira', '')}`
  return (
    <p className="cn-ontem" role="note">
      <Icone nome="relogio" tamanho={18} />
      <span><strong>{quando} {balanco.feitas === 0 ? `as ${balanco.meta} questões ficaram sem fazer` : `ficaram ${plural(balanco.faltou, 'questão', 'questões')} sem fazer`}.</strong> Nada se perdeu: elas voltaram para a fila e foram divididas pelos dias que faltam{calculo.projecao.tetoAtivo ? <>. Como o atraso acumulou, a meta parou no teto de {Math.round((TETO_ATRASO - 1) * 100)}% acima do planejado e o que não coube sai do fim da fila, a parte que menos cai</> : <>, por isso a meta de hoje é {calculo.metaHojeSemAdiantar}</>}. Não precisa compensar tudo hoje.</span>
    </p>
  )
}

// ─── Passo 3: os erros dos dias anteriores ───────────────────────────────────

function Revanche({ erros, minutos, aoRevanche, diaErros, hojeEhODia }: { erros: ReturnType<typeof errosDoCronograma>; minutos: number; aoRevanche?: (ids: string[]) => void; diaErros: number | null; hojeEhODia: boolean }) {
  if (!erros.pendentes.length) return <p className="cn-nota">{erros.total > 0
    ? `Você refez e acertou os ${erros.total} erros das últimas duas semanas do cronograma. Quando errar de novo, eles aparecem aqui no dia seguinte.`
    : 'Nenhum erro pendente dos dias anteriores do cronograma. O que você errar hoje aparece aqui amanhã.'}</p>
  const ids = idsRevanche(erros)
  const [ontem, ...outros] = erros.dias.filter((d) => d.pendentes.length)
  const hoje = diaCivil().getTime()
  const rotulo = (d: { data: Date }) => hoje - d.data.getTime() <= DIA ? 'ontem' : `${FORMATO_SEMANA.format(d.data).replace('-feira', '')}, ${curta(d.data)}`
  return <>
    <p className="cn-passo__porque">{hojeEhODia ? <><b>Hoje é o seu dia dos erros.</b> </> : null}As questões que você errou nos dias anteriores do cronograma e ainda não acertou. Elas voltam com as <b>alternativas em ordem nova</b>, para você raciocinar em vez de lembrar a letra. Acertou, sai da fila.</p>
    <ul className="cn-erros">
      {[ontem, ...outros].slice(0, 5).map((d) => <li key={d.chave}><b className="numerico">{d.pendentes.length}</b><span>{rotulo(d)}</span>
        {aoRevanche && <button type="button" className="cn-link" onClick={() => aoRevanche(d.pendentes.slice(0, 40))} aria-label={`Refazer os ${d.pendentes.length} erros de ${rotulo(d)}`}>refazer</button>}</li>)}
      {outros.length > 4 && <li className="cn-erros__resto"><b className="numerico">{outros.slice(4).reduce((s, d) => s + d.pendentes.length, 0)}</b><span>de dias mais antigos</span></li>}
    </ul>
    {aoRevanche && <p className="cn-linha-btn"><button type="button" className="cn-btn cn-btn--forte" onClick={() => aoRevanche(ids)}><Icone nome="reiniciar" tamanho={16} /> Refazer {ids.length === erros.pendentes.length ? (ids.length === 1 ? 'o erro' : `os ${ids.length} erros`) : `${ids.length} dos ${erros.pendentes.length} erros`}<small>~{formatarTempo(ids.length * minutos)}</small></button></p>}
    <p className="cn-nota">Não conta na meta de questões novas. {erros.resolvidos > 0 ? `Você já resolveu ${plural(erros.resolvidos, 'erro', 'erros')} das últimas duas semanas. ` : ''}{diaErros === null ? 'Se preferir juntar tudo num dia, escolha o "Dia dos erros" no fim da página.' : `Seu dia dos erros: ${DIAS_SEMANA[diaErros]}.`}{ids.length < erros.pendentes.length ? ` Cada sessão traz até ${TAMANHO_REVANCHE}, das mais recentes para as mais antigas.` : ''}</p>
  </>
}

// ─── Como funciona: as perguntas que a página precisa responder ──────────────

function ComoFunciona({ plano, calculo, minutos }: { plano: PlanoSalvo; calculo: CalculoPlano; minutos: number }) {
  const prova = diaCivil(plano.data_prova)
  const vespera = new Date(prova.getFullYear(), prova.getMonth(), prova.getDate() - 1)
  const fimRevisao = new Date(calculo.inicioModoProva.getTime() - DIA)
  const teto = Math.round((TETO_ATRASO - 1) * 100)
  const perguntas: Array<{ p: string; r: ReactNode }> = [
    { p: 'Quais questões eu faço hoje?', r: <>As do passo 2 do roteiro: <b>só questões que você ainda não respondeu</b>, na quantidade da meta do dia{calculo.metaDiaNormal > 0 ? <> (num dia normal, {calculo.metaDiaNormal}, cerca de {formatarTempo(calculo.metaDiaNormal * minutos)})</> : null}. Cerca de 70% são da área em foco, que fica uns 3 dias seguidos, e 30% de outra área, para misturar. Dentro da área, vêm primeiro os assuntos que mais caem. O botão dourado abre exatamente essas questões, já na ordem; você não precisa escolher nada.</> },
    { p: 'Em que ordem eu faço as coisas?', r: <>1. Leia os resumos do dia (são os mais próximos das questões que vêm). 2. Faça as questões de hoje. 3. Refaça o que errou nos dias anteriores. Só o passo 2 conta na meta; os outros dois são o que faz a questão virar aprendizado.</> },
    { p: 'E se eu não terminar o dia?', r: <>Nada se perde e nada "vence". No dia seguinte, o que faltou volta para a fila e é dividido pelos dias que restam até a reta final: a meta sobe um pouco em todos, não só no dia seguinte. Há um limite: a meta nunca passa de <b>{teto}% acima do planejado</b>. Se o atraso for maior que isso, o que não cabe sai do fim da fila (os assuntos que menos caem), e a página avisa. A sessão de ontem que ficou pela metade não reabre: as questões que você não respondeu simplesmente continuam no plano.</> },
    { p: 'E se eu fizer a mais?', r: <>Tudo o que passar da meta sai dos próximos dias, começando pelo seguinte: fez 30 a mais, amanhã tem 30 a menos. Com a meta feita, o botão passa a puxar as questões do próximo dia de estudo, e elas contam para ele.</> },
    { p: 'Onde entram os erros e as revisões?', r: <>São duas coisas. <b>Os erros do cronograma</b> (passo 3) são as questões que você errou nos últimos 14 dias do plano e ainda não acertou; voltam no dia seguinte, com as alternativas em ordem nova, e saem quando você acerta. <b>As revisões do dia</b> (em "Mais para hoje") são da revisão espaçada do site inteiro: erros, chutes e dúvidas de qualquer época, que voltam em intervalos crescentes. Nenhuma das duas conta na meta, que é só de questões novas.</> },
    { p: 'O que é o mini-simulado?', r: <>A cada duas semanas, {TAMANHO_MINI} questões cronometradas do que você já viu, misturadas como na prova, com os seus erros e dúvidas primeiro. Nesse dia a meta de questões novas cai pela metade.</> },
    ...(calculo.diasRetaFinal > 7 ? [{ p: 'Como funciona a revisão forte?', r: <>De {curta(calculo.inicioRetaFinal)} a {curta(fimRevisao)}, a penúltima semana. <b>Acabam as questões novas.</b> Cada dia traz uma fatia da prova (duas áreas), com cerca de {calculo.metaMedia} questões que você já viu, nesta ordem: os seus erros, as que marcou como chute ou dúvida e os assuntos que mais caem que você não vê há mais tempo. Os erros que importam e as frases que caem ficam como complemento.</> }] : []),
    { p: 'Como funciona o modo prova?', r: <>De {curta(calculo.inicioModoProva)} até a véspera, a última semana{calculo.diasRetaFinal <= 7 ? ' (planos com menos de 6 semanas têm só esta semana de reta final)' : ''}. Menos volume, para chegar descansado. Todo dia tem três tarefas, na ordem que você preferir: um <b>simulado cronometrado</b> no horário e com a duração da prova, para treinar ritmo e cansaço; os <b>erros que importam</b> (só os dos assuntos de prioridade alta e máxima); e as <b>frases que caem</b>, para ler em minutos.</> },
    { p: 'E na véspera e no dia da prova?', r: <>Na véspera ({curta(vespera)}): um aquecimento de 25 questões dos assuntos que mais caem, quase todas já acertadas por você, para chegar confiante; deixar documento, caneta e o caminho prontos; e dormir cedo. No dia da prova ({curta(prova)}) o cronograma não pede nada.</> },
    { p: 'E folga, plantão e semana difícil?', r: <>Folga não tem meta e não quebra a sequência. Dia leve (plantão) tem poucas questões. Na semana difícil, a meta fica no dia mínimo de {DIA_MINIMO} questões, e o resto é redistribuído. Tudo isso muda quando você quiser, em "Ajustar".</> },
  ]
  return (
    <section className="cn-como" id="como-funciona" aria-labelledby="cn-como-titulo">
      <h2 id="cn-como-titulo" className="cn-secao__titulo">Como o cronograma funciona</h2>
      <p className="cn-secao__sub">As respostas usam as datas e os números do seu plano.</p>
      <div className="cn-como__lista">
        {perguntas.map((x, i) => <details key={x.p} className="cn-pergunta" open={i === 0 || undefined}>
          <summary><span>{x.p}</span><Icone nome="baixo" tamanho={16} /></summary>
          <p>{x.r}</p>
        </details>)}
      </div>
    </section>
  )
}

// ─── Opções ──────────────────────────────────────────────────────────────────

function Chave({ ligado, aoMudar, titulo, texto, desabilitado }: { ligado: boolean; aoMudar: (v: boolean) => void; titulo: string; texto: string; desabilitado?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} className="cn-opcao cn-chave" disabled={desabilitado} onClick={() => aoMudar(!ligado)}>
      <span><strong>{titulo}</strong><small>{texto}</small></span>
      <i className="cn-chave__trilho" aria-hidden="true"><i /></i>
    </button>
  )
}

function SemanaDificil({ plano, aoMudar, salvando }: { plano: PlanoSalvo; aoMudar: (ativar: boolean) => void; salvando: boolean }) {
  const hoje = diaCivil()
  const seg = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - ((hoje.getDay() + 6) % 7))
  const ativa = (plano.opcoes?.semanasDificeis ?? []).includes(chaveCivil(seg))
  return (
    <div className="cn-dificil">
      <p>Plantão pesado ou semana corrida? Nesta semana a meta fica no dia mínimo de <b>{DIA_MINIMO} questões</b>, que mantém a sequência, e o resto é redistribuído pelas semanas seguintes.</p>
      <button type="button" className="cn-btn" aria-pressed={ativa} disabled={salvando} onClick={() => aoMudar(!ativa)}>{ativa ? 'Voltar à meta normal' : 'Aliviar esta semana'}</button>
    </div>
  )
}
