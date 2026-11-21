import { alternarData, type AjusteDia } from '../dados/planoEstudo'
import { useEffect, useMemo, useState } from 'react'
import { vistaDoCronograma } from '../dados/vistaCronograma'
import { ConviteFicticio, type MotivoConvite } from './CronogramaFicticio'
import { usarPremium } from '../conta/premium'
import { usarIndice } from '../dados/usarIndice'
import { FILTROS_VAZIOS, type EstadoSessao } from '../dados/tipos'
import { acervoMao, calcularPlanoMao, comAdiantado, comSemanaDificil, configInicial, itemConfigMao, lerConfig, MINUTOS_POR_QUESTAO_MAO, zerarConfigMao, type ConfigMao, type ProvaMao, type TemaDoPlano } from '../dados/cronogramaMao'
import { idsDoDiaMao, idsParaAdiantar, painelMao, resumoSemanaMao } from '../dados/painelMao'
import { calcularConstancia, desempenhoPorArea, elogio, formatarTempo, prontidaoPorArea } from '../dados/hubCronograma'
import { CHAVE_RESUMAO_HOJE, lidoHoje, RESUMAO_HOJE_VAZIO, type ResumaoHoje } from '../estado/resumaoLido'
import { VisaoCronograma } from './CronogramaVisao'
import type { HubDados } from './PlanoEstudo'
import { slugDaAreaMao } from '../dados/modalidades'
import '../estilos/paginas/CronogramaPainel.css'
import '../estilos/paginas/PlanoEstudo.css'
import '../estilos/paginas/Cronograma.css'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { usarSessao } from '../estado/sessao'
import { Carregando } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { diaDaSemana, hojeBR, inicioDaChave, somarDias } from '../util/dia'
import { href, navegar } from '../util/rotas'
import '../estilos/paginas/CronogramaTorre.css'
import '../estilos/componentes/Cristal.css'
import '../estilos/paginas/CronogramaMao.css'
import { CenaOficina } from '../componentes/cronograma/CenaOficina'
import { TrocaCronograma } from '../componentes/TrocaCronograma'

const PROVAS: Record<ProvaMao, { titulo: string; curto: string; texto: string }> = {
  ingresso: { titulo: 'Ingresso em Cirurgia da Mão', curto: 'Ingresso (residência)', texto: 'Para as provas de seleção da residência e dos programas de Cirurgia da Mão. Você faz todo tipo de questão da mão, das provas de ingresso e do padrão da prova de título, na ordem do que as provas de ingresso mais cobram.' },
  titulo: { titulo: 'Prova de título em Cirurgia da Mão', curto: 'Prova de título', texto: 'Para a prova de título de especialista em Cirurgia da Mão. O foco são as questões no padrão da prova de título, na ordem do que a prova mais cobra; questões de ingresso dos mesmos assuntos entram só como reforço.' },
}
const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const NOME_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const MINUTOS = [30, 45, 60, 90, 120, 180]
const num = (n: number) => n.toLocaleString('pt-BR')
const duracao = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60} h`)
type Mapa = Record<string, unknown>

/**
 * Cronograma de Cirurgia da Mão (27/10/2026): ingresso e título, cada um com o seu plano.
 * A configuração fica na conta (sincroniza entre aparelhos); o plano é recalculado a cada abertura.
 */
export function CronogramaMao({ consulta }: { consulta?: URLSearchParams }) {
  const { indice } = usarIndice()
  const acesso = usarPremium()
  const { premium, logado } = acesso
  const vista = vistaDoCronograma(acesso)
  const ficticio = vista === 'ficticio'
  const [convite, definirConvite] = useState<MotivoConvite | null>(null)
  const [respondidas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  const [mapa, definirMapa] = usarArmazenado<Mapa>('biblioteca', {})
  const [provaSalva, salvarProva] = usarArmazenado<ProvaMao>('cronograma-mao:prova', 'ingresso')
  const pedida = consulta?.get('prova')
  const prova: ProvaMao = pedida === 'titulo' || pedida === 'ingresso' ? pedida : provaSalva
  const config = lerConfig(mapa[itemConfigMao(prova)])
  // lembra a última prova aberta (o link do menu abre direto nela)
  useEffect(() => { if (vista === 'real' && prova !== provaSalva) salvarProva(prova) }, [vista, prova, provaSalva, salvarProva])
  const [editando, definirEditando] = useState(false)
  const { iniciarComAviso, sessao } = usarSessao()

  const salvar = (c: ConfigMao | null) => {
    definirMapa((antes) => ({ ...antes, [itemConfigMao(prova)]: c ? { ...c, em: Date.now() } : null }))
    definirEditando(false)
  }
  async function estudar(ids: string[], tarefa?: { dia: string; meta?: number; feitas?: number; simulado?: boolean }) {
    if (!premium) { navegar('/assinatura'); return }
    if (!ids.length) return
    if (await iniciarComAviso({ ...FILTROS_VAZIOS, areas: ['mao'], embaralhar: false, limite: ids.length }, ids, {
      origem: 'cronograma',
      cronograma: { modalidade: prova === 'titulo' ? 'mao-titulo' : 'mao-ingresso', meta: tarefa?.meta, feitasAntes: tarefa?.feitas },
      diaPlano: tarefa?.dia,
      simulado: tarefa?.simulado,
      limiteSegundos: tarefa?.simulado ? ids.length * 90 : undefined,
    })) navegar('/sessao')
  }

  const exemplo = useMemo(() => {
    if (!ficticio || !indice) return null
    const hoje = hojeBR()
    const config = { ...configInicial(prova), dataProva: somarDias(hoje, prova === 'titulo' ? 126 : 105), criadoEm: somarDias(hoje, -8) }
    const vazio = calcularPlanoMao(indice, {}, config)
    const amostra = vazio.temas.slice(0, 8).flatMap((t) => t.ids.slice(0, 18))
    const dias = [0, 1, 2, 3, 4, 5, 6, 7].map((n) => somarDias(hoje, -n)).filter((d) => config.dias.includes(diaDaSemana(d)))
    const respostas: Record<string, RegistroQuestao> = Object.fromEntries(amostra.map((id, n) => {
      const em = inicioDaChave(dias[n < 8 ? 0 : 1 + n % Math.max(1, dias.length - 1)] ?? hoje) + (8 * 60 + n) * 60_000
      const c = n % 4 !== 0
      return [id, { c, q: em, historico: [{ em, correta: c, confianca: 'seguro' }] }]
    }))
    return { config, respostas }
  }, [ficticio, indice, prova])

  if (!indice || vista === 'carregando') return <Carregando linhas={5} rotulo="Montando o plano" />
  if (exemplo) return (
    <div className="empilha-2 cm pe cp cr cg cf cr--torre">
      <TrocaCronograma atual={prova} />
      <Painel prova={prova} config={exemplo.config} premium={false} indice={indice} respondidas={exemplo.respostas}
        ficticio={definirConvite} aoEstudar={() => definirConvite('comecar')} aoConfig={() => definirConvite('outro')}
        aoEditar={() => definirConvite('outro')} aoApagar={() => undefined} aoZerar={() => undefined} />
      {convite && <ConviteFicticio motivo={convite} nome="" area={null} aoTreinar={() => undefined} aoFechar={() => definirConvite(null)} />}
    </div>
  )

  return (
    // As mesmas classes do cronograma de ortopedia (cr--torre): cartões, botões, chips e estados iguais nas três variantes.
    <div className={`empilha-2 cm pe ${indice && (!config || editando) ? 'cr-form' : 'cp cr cg cf'} cr--torre`}>
      <TrocaCronograma atual={prova} />
      {!indice ? <Carregando linhas={5} rotulo="Montando o plano" />
        : !config || editando
          ? <Formulario prova={prova} inicial={config ?? configInicial(prova)} novo={!config} aoSalvar={salvar} aoCancelar={config ? () => definirEditando(false) : undefined} logado={logado} />
          : <Painel prova={prova} config={config} premium={premium} indice={indice} respondidas={respondidas} aoEstudar={estudar} sessao={sessao} aoConfig={(c) => definirMapa((antes) => ({ ...antes, [itemConfigMao(prova)]: { ...c, em: Date.now() } }))} aoEditar={() => definirEditando(true)} aoApagar={() => { if (window.confirm(`Abandonar o cronograma de ${prova === 'titulo' ? 'prova de título' : 'ingresso'}?\n\nO plano deixa de existir e dá para montar outro quando quiser. Suas respostas, o desempenho e as revisões continuam salvos.`)) salvar(null) }}
              aoZerar={() => { if (window.confirm(`Começar o cronograma de ${prova === 'titulo' ? 'prova de título' : 'ingresso'} do zero?\n\nTodas as questões voltam para o plano, como no primeiro dia, com a mesma data e o mesmo ritmo. Suas respostas, o desempenho e as revisões continuam salvos.`)) salvar(zerarConfigMao(config)) }} />}
    </div>
  )
}

function Formulario({ prova, inicial, novo, aoSalvar, aoCancelar, logado }: { prova: ProvaMao; inicial: ConfigMao; novo: boolean; aoSalvar: (c: ConfigMao) => void; aoCancelar?: () => void; logado: boolean }) {
  const [c, definir] = useState<ConfigMao>(inicial)
  const hoje = hojeBR()
  const valida = c.dataProva > hoje && c.dias.length > 0
  const questoesDia = Math.round(c.minutosDia / MINUTOS_POR_QUESTAO_MAO)
  // As mesmas peças do formulário do cronograma de ortopedia (01/11/2026): a cena no topo, o cartão com os campos,
  // as pílulas dos dias e do tempo, os cartões de escolha e os botões de sempre.
  return (
    <form className="cm-form empilha-2" onSubmit={(e) => { e.preventDefault(); if (valida) aoSalvar({ ...c, criadoEm: novo ? hoje : c.criadoEm }) }}>
      <section className="pe-heroi pe-heroi--convite pe-heroi--form pe-heroi--torre">
        <CenaOficina />
        <div>
          <p className="tr-heroi__selo">{novo ? 'Novo plano' : 'Ajustar o plano'} · Cirurgia da Mão</p>
          <h1>{PROVAS[prova].titulo}</h1>
          <p>{PROVAS[prova].texto}</p>
        </div>
      </section>
      <section className="cartao cartao__corpo pe-form">
        <div className="pe-form__campos">
          <label className="campo">Data da prova<input className="entrada" type="date" value={c.dataProva} min={somarDias(hoje, 1)} onChange={(e) => definir({ ...c, dataProva: e.target.value })} required /></label>
          <p className="texto-2">Ainda sem edital? Coloque a data que você espera. Dá para mudar depois.</p>
        </div>
        <fieldset className="pe-form__campos cm-campo">
          <legend className="pe-form__sub">Em que dias você estuda?</legend>
          <p className="texto-2">Plantão e folga ficam fora; o plano conta só estes dias.</p>
          <div className="tr-pilulas cm-dias">
            {SEMANA.map((d, i) => <button key={i} type="button" className="tr-pilula" aria-pressed={c.dias.includes(i)} aria-label={NOME_SEMANA[i]} onClick={() => definir({ ...c, dias: c.dias.includes(i) ? c.dias.filter((x) => x !== i) : [...c.dias, i].sort() })}>{d}</button>)}
          </div>
        </fieldset>
        <fieldset className="pe-form__campos cm-campo">
          <legend className="pe-form__sub">Quanto tempo por dia?</legend>
          <p className="texto-2">Cerca de {num(questoesDia)} questões com o comentário.</p>
          <div className="tr-pilulas cm-opcoes">{MINUTOS.map((m) => <button key={m} type="button" className="tr-pilula" aria-pressed={c.minutosDia === m} onClick={() => definir({ ...c, minutosDia: m })}>{duracao(m)}</button>)}</div>
        </fieldset>
        <fieldset className="pe-form__campos cm-campo">
          <legend className="pe-form__sub">Até onde ir?</legend>
          <div className="pe-intensidades" role="radiogroup" aria-label="Até onde ir">
            <button type="button" role="radio" aria-checked={c.cobertura === 'completa'} className="pe-intensidade" onClick={() => definir({ ...c, cobertura: 'completa' })}><strong>Completo</strong><span>{prova === 'titulo' ? 'Todos os assuntos do título, com foco no padrão da prova de título e questões de seleção do mesmo assunto misturadas, como treino.' : 'Todos os assuntos, com todo tipo de questão da mão.'}</span></button>
            <button type="button" role="radio" aria-checked={c.cobertura === 'essencial'} className="pe-intensidade" onClick={() => definir({ ...c, cobertura: 'essencial' })}><strong>Essencial</strong><span>Só os assuntos de prioridade máxima e alta{prova === 'titulo' ? ', só com questões no padrão da prova de título' : ''}. Bom para pouco tempo.</span></button>
          </div>
        </fieldset>
        <div className="pe-form__navegacao">
          {aoCancelar && <button type="button" className="botao botao--fantasma" onClick={aoCancelar}>Cancelar</button>}
          <button type="submit" className="botao botao--principal botao--grande" disabled={!valida}>{novo ? 'Montar meu plano' : 'Salvar ajustes'}</button>
        </div>
        {!logado && <p className="texto-2 cm-nota">Sem conta, o plano fica só neste aparelho. <a href={href('/conta?modo=criar&voltar=%2Fcronograma-mao')}>Crie a conta grátis</a> para levá-lo ao celular e ao computador.</p>}
      </section>
    </form>
  )
}

interface PropsPainel { sessao?: EstadoSessao | null; ficticio?: (motivo: MotivoConvite) => void; prova: ProvaMao; config: ConfigMao; premium: boolean; indice: NonNullable<ReturnType<typeof usarIndice>['indice']>; respondidas: Record<string, RegistroQuestao>; aoEstudar: (ids: string[], tarefa?: { dia: string; meta?: number; feitas?: number; simulado?: boolean }) => void; aoConfig: (c: ConfigMao) => void; aoEditar: () => void; aoApagar: () => void; aoZerar: () => void }

/**
 * O plano da mão na mesma arquitetura do cronograma de ortopedia (pedido do Tales, 26/10/2026): o topo
 * "Onde você está" com as passadas e a reta final, o calendário, o cartão Hoje com a lista do dia e o botão
 * único, amanhã, como você está indo, esta semana e o que vem depois, e os blocos que abrem (constância,
 * prontidão por grande área, prioridades, semana a semana, levar para o calendário do celular). As peças são
 * as mesmas da página de ortopedia; o motor é o da mão (src/dados/cronogramaMao.ts, traduzido em painelMao.ts).
 */
function Painel({ prova, config, premium, ficticio, sessao, indice, respondidas, aoEstudar, aoConfig, aoEditar, aoApagar, aoZerar }: PropsPainel) {
  const mao = useMemo(() => calcularPlanoMao(indice, respondidas, config), [indice, respondidas, config])
  const acervo = useMemo(() => acervoMao(indice), [indice])
  const { plano, calculo } = useMemo(() => painelMao(mao), [mao])
  // a constância conta só as questões da mão (as de ortopedia têm o próprio cronograma)
  const idsDoPlano = useMemo(() => new Set(mao.temas.flatMap((t) => t.ids)), [mao])
  const respondidasMao = useMemo(() => Object.fromEntries(Object.entries(respondidas).filter(([id]) => idsDoPlano.has(id))), [respondidas, idsDoPlano])
  const constancia = useMemo(() => calcularConstancia(respondidasMao, plano, calculo), [respondidasMao, plano, calculo])
  const minutos = MINUTOS_POR_QUESTAO_MAO
  const [resumaoHoje] = usarArmazenado<ResumaoHoje>(CHAVE_RESUMAO_HOJE, RESUMAO_HOJE_VAZIO)
  const semana = useMemo(() => resumoSemanaMao(mao, respondidasMao, calculo), [mao, respondidasMao, calculo])
  // O plano da mão como um índice próprio para o painel (10/11/2026): só as questões do plano, e cada grande área
  // da mão no lugar de um tema. É o que alimenta o histórico, os erros, a previsão e os resumos do dia.
  const indiceMao = useMemo(() => {
    const areas = [...new Set(mao.temas.map((t) => t.area))]
    const areaDe = new Map(mao.temas.flatMap((t) => t.ids.map((id) => [id, areas.indexOf(t.area)] as const)))
    return { ...indice, temas: areas.map((nome) => ({ ...indice.temas[0], slug: slugDaAreaMao(nome), nome })), questoes: indice.questoes.filter((q) => areaDe.has(q.id)).map((q) => ({ ...q, t: areaDe.get(q.id)!, ar: undefined, dup: undefined })) }
  }, [indice, mao])
  // Questões que entraram no acervo da mão desde a última visita: já estão no plano, e a página avisa.
  const pendentesMao = useMemo(() => mao.temas.flatMap((t) => t.pendentes), [mao])
  const [acervoVisto, definirAcervoVisto] = usarArmazenado<number>(`cronograma-mao:acervo:${prova}:${config.cobertura}`, 0)
  const mediaAntes = acervoVisto > 0 ? Math.max(0, mao.metaNormal - Math.ceil(Math.max(0, mao.total - acervoVisto) / Math.max(1, mao.diasDeEstudo))) : mao.metaNormal
  const novasNoAcervo = acervoVisto > 0 && mao.total > acervoVisto ? mao.total - acervoVisto : 0
  useEffect(() => { if (!ficticio && !acervoVisto && mao.total) definirAcervoVisto(mao.total) }, [ficticio, acervoVisto, mao.total, definirAcervoVisto])
  // O que passou da meta de hoje fica guardado na conta: amanhã (em qualquer aparelho) o próximo dia vem mais leve.
  const extraHoje = premium && !calculo.naRetaFinal ? calculo.extraHoje : 0
  useEffect(() => {
    if (!ficticio && (config.adiantados?.[mao.hoje.data] ?? 0) !== extraHoje) aoConfig(comAdiantado(config, mao.hoje.data, extraHoje))
  }, [extraHoje]) // eslint-disable-line react-hooks/exhaustive-deps

  if (mao.encerrado) return (
    <section className="cg cg-caixa">
      <h1 className="cg-caixa__titulo">{config.dataProva === hojeBR() ? 'Dia da prova' : 'A data da prova passou'} <small>seu histórico continua salvo; coloque a data da próxima prova para montar um plano novo</small></h1>
      {pendentesMao.length > 0 && <p className="cg-nota">Enquanto isso, o acervo da mão continua crescendo: há <b>{num(pendentesMao.length)} {pendentesMao.length === 1 ? 'questão' : 'questões'}</b> deste plano que você ainda não fez.</p>}
      <p className="cg-linha">
        {premium && pendentesMao.length > 0 && <button type="button" className="cg-btn cg-btn--forte" onClick={() => aoEstudar(pendentesMao.slice(0, 100))}>Fazer {pendentesMao.length > 100 ? 'as próximas 100' : pendentesMao.length === 1 ? 'a questão que falta' : `as ${pendentesMao.length} que faltam`}</button>}
        <button type="button" className="cg-btn" onClick={aoEditar}>Mudar a data</button>
      </p>
    </section>
  )

  const tarefaHoje = { dia: mao.hoje.data, meta: mao.metaHoje, feitas: mao.feitasHoje, simulado: mao.hoje.tipo === 'simulado' }
  const comecar = () => aoEstudar(mao.idsHoje, tarefaHoje)
  const daModalidade = sessao?.cronograma?.modalidade === (prova === 'titulo' ? 'mao-titulo' : 'mao-ingresso')
  const miniFeito = mao.hoje.tipo === 'simulado' && (!mao.idsHoje.length || Boolean(daModalidade && sessao?.diaPlano === mao.hoje.data && sessao.simulado && sessao.concluidaEm))
  const pendente = daModalidade && sessao?.diaPlano === mao.hoje.data && !sessao.concluidaEm
    ? { feitas: Object.keys(sessao.respostas).length, total: sessao.ids.length, tema: 'Cirurgia da Mão' }
    : null
  const treinarArea = (slug: string) => {
    const temas = mao.temas.filter((t) => slugDaAreaMao(t.area) === slug)
    aoEstudar([...temas.flatMap((t) => t.ids.filter((id) => respondidas[id]?.c === false)), ...temas.flatMap((t) => t.pendentes)].slice(0, 15))
  }
  const principalSlug = calculo.hoje?.itens[0]?.slug
  // As ações do painel, no formato do cronograma de ortopedia; o que não existe na mão fica sem efeito e sem botão.
  const hub: HubDados = {
    constancia, elogio: elogio(constancia, calculo), esquecidos: [], riscos: [], cegos: [],
    desempenho: desempenhoPorArea(calculo), prontidao: prontidaoPorArea(calculo), media: mao.acerto,
    revisoesHoje: 0, mostrarDiagnostico: false, simulados: { feitas: 0, total: 0, acerto: null }, semana,
    retaFinal: { revisaoHoje: null, aoRevisaoForte: comecar, errosQueImportam: 0, aoErros: () => undefined, aoAquecimento: comecar },
    aoDiagnostico: () => undefined, aoReativar: treinarArea, aoTreinarFoco: () => undefined, aoTrocarSimulados: async () => undefined,
    aoMini: comecar, aoMarcar: () => undefined, feitosDia: { data: mao.hoje.data, mini: miniFeito }, resumaoLido: principalSlug && lidoHoje(resumaoHoje, 'mao') ? [principalSlug] : [],
    minutosQuestao: minutos, aoSemanaDificil: (ativar) => aoConfig(comSemanaDificil(config, ativar)), aoCancelarAdiantar: () => undefined, salvandoOpcoes: false,
  }
  const nReta = mao.idsHoje.length
  const prioridades = mao.temas.slice(0, 8)
  const ranking = href(`/temas-que-mais-caem?prova=${prova === 'titulo' ? 'mao-titulo' : 'mao-ingresso'}`)

  function comDiaAvulso(dia: string, tipo: AjusteDia): ConfigMao {
    const chave = tipo === 'leve' ? 'diasLevesAvulsos' : 'diasExtras'
    const hoje = hojeBR()
    const metaPreservada = config.metaPreservada?.em === hoje
      ? config.metaPreservada
      : { em: hoje, n: mao.metaHoje + (mao.hoje.adiantado ?? 0) }
    return { ...config, [chave]: alternarData(config[chave], dia), metaPreservada }
  }

  return <>
    {!ficticio && novasNoAcervo > 0 && <p className="cm-novas" role="status"><Icone nome="estrela" tamanho={18} /><span><strong>Entraram {num(novasNoAcervo)} {novasNoAcervo === 1 ? 'questão nova' : 'questões novas'} de cirurgia da mão no seu plano.</strong> Elas já estão no calendário. A meta normal agora é de {num(mao.metaNormal)} por dia{mediaAntes < mao.metaNormal ? ` (uma estimativa de +${num(mao.metaNormal - mediaAntes)} por dia)` : ''}.</span><button type="button" className="botao" onClick={() => definirAcervoVisto(mao.total)}>Entendi</button></p>}
    <VisaoCronograma plano={plano} calculo={calculo} indice={indice} respondidas={respondidas} hub={hub} aoAjustar={aoEditar} ficticio={ficticio ? { nome: '', aoConvidar: ficticio } : null}
      pendente={pendente && pendente.feitas < pendente.total ? pendente : null} aoComecar={comecar} aoPuxar={(dia) => {
        if (ficticio) { ficticio('outro'); return }
        const simulado = mao.agenda.find((d) => d.data === dia)?.tipo === 'simulado'
        aoEstudar(idsDoDiaMao(mao, dia), simulado ? { dia, simulado: true } : undefined)
      }} aoAdiantar={(n) => ficticio ? ficticio('adiantar') : aoEstudar([...mao.idsHoje, ...idsParaAdiantar(mao, n)])}
      acoes={{ aoRevanche: aoEstudar, ajusteDia: {
        previa: (dia, tipo) => {
          if (dia <= hojeBR()) return null
          const previsto = calcularPlanoMao(indice, respondidas, comDiaAvulso(dia, tipo))
          return { carga: previsto.agenda.find((d) => d.data === dia)?.n ?? 0, metaNormal: previsto.metaNormal, cobertura: previsto.projecaoMaisCai }
        },
        aplicar: (dia, tipo) => { if (dia > hojeBR()) aoConfig(comDiaAvulso(dia, tipo)) },
      }, aoDiaErros: () => undefined, aoComecarCurto: (n) => tarefaHoje.simulado ? comecar() : aoEstudar(mao.idsHoje.slice(0, n), tarefaHoje) }}
      mao={{
        cena: <CenaOficina />, indice: indiceMao, revisoesHoje: mao.revisaoHoje, novasHoje: mao.idsHoje.length - mao.revisaoHoje,
        acaoRetaFinal: nReta ? { rotulo: `${calculo.feitasHoje > 0 ? 'Continuar' : 'Começar'} a reta final: ${nReta} questões`, detalhe: `cerca de ${formatarTempo(nReta * minutos)}${mao.revisaoHoje ? ` · ${mao.revisaoHoje} revisões de erros` : ''}`, aoClicar: comecar } : null,
        extras: <>
          {!calculo.naRetaFinal && <TamanhoPlano mao={mao} acervo={acervo} minutos={minutos} aoAjustar={aoEditar} />}
          <section className="cg-caixa" aria-labelledby="cm-prioridades-titulo">
            <h2 className="cg-caixa__titulo" id="cm-prioridades-titulo">Prioridades agora <small>o que mais cai, onde você mais erra e o que falta fazer</small></h2>
            <ul className="cg-riscos">{prioridades.map((t) => <LinhaPrioridade key={t.nome} t={t} premium={premium} aoEstudar={aoEstudar} />)}</ul>
            <p className="cg-nota cg-linha--sep"><a className="cg-link" href={ranking}>Ver o ranking completo da {prova === 'titulo' ? 'prova de título' : 'prova de ingresso'}</a></p>
          </section>
        </>,
        ajustes: <>
          <li className="cg-ajuste"><span><strong>Começar do zero</strong><small>todas as questões voltam ao plano; as respostas continuam salvas</small></span><button type="button" className="cg-mini" onClick={aoZerar}>recomeçar</button></li>
          <li className="cg-ajuste"><span><strong>Abandonar o cronograma</strong><small>o plano deixa de existir; as respostas continuam salvas</small></span><button type="button" className="cg-mini" onClick={aoApagar}>abandonar</button></li>
        </>,
      }} />
  </>
}

function LinhaPrioridade({ t, premium, aoEstudar }: { t: TemaDoPlano; premium: boolean; aoEstudar: (ids: string[]) => void }) {
  const porque = t.feitas ? (t.acerto !== null ? `você acerta ${t.acerto}%` : `você fez ${num(t.feitas)}`) : 'você ainda não fez'
  const ids = [...t.pendentes, ...t.ids.filter((id) => !t.pendentes.includes(id))].slice(0, 20)
  return (
    <li>
      <span><strong>{t.nome}</strong><small>{num(t.pctEdicao)}% por prova · {porque} · {num(t.pendentes.length)} por fazer</small></span>
      <b className="cg-riscos__pct">{t.acerto !== null ? `${t.acerto}%` : ''}</b>
      <button type="button" className="cg-mini" onClick={() => aoEstudar(ids)} aria-label={`Treinar ${t.nome}`}>{premium ? 'treinar' : 'assinar'}</button>
    </li>
  )
}

function TamanhoPlano({ mao, acervo, minutos, aoAjustar }: { mao: ReturnType<typeof calcularPlanoMao>; acervo: number; minutos: number; aoAjustar: () => void }) {
  const faltam = Math.max(0, mao.total - mao.feitas)
  const pct = mao.total ? Math.round((100 * mao.feitas) / mao.total) : 0
  return (
    <section className="cg-caixa" aria-labelledby="cm-tamanho-titulo">
      <h2 className="cg-caixa__titulo" id="cm-tamanho-titulo">{num(mao.total)} questões de cirurgia da mão no seu plano <small>de {num(acervo)} no acervo · {mao.config.cobertura === 'completa' ? 'cobertura completa' : 'cobertura essencial'}</small></h2>
      <span className="cg-trilho" role="img" aria-label={`${pct}% do plano feito`}><i style={{ width: `${pct}%` }} /></span>
      <p className="cg-nota"><b>{num(mao.feitas)}</b> feitas · faltam <b>{num(faltam)}</b>. {mao.tetoAtivo
        ? <>Para você ver <b>todas</b> até a reta final, o dia fica com cerca de <b>{mao.metaNormal} questões</b> (≈ {formatarTempo(mao.metaNormal * minutos)}), mais do que o tempo que você marcou. Nenhuma fica de fora. Se precisar de dias mais curtos, mude a data, os dias de estudo ou a cobertura.</>
        : <>São cerca de <b>{mao.metaNormal} por dia</b> (≈ {formatarTempo(mao.metaNormal * minutos)}), e o plano inteiro cabe até a reta final.{mao.config.cobertura === 'essencial' ? ' O plano Completo usa as questões de todos os assuntos.' : ''}</>} <button type="button" className="cg-link" onClick={aoAjustar}>Ajustar</button></p>
    </section>
  )
}
