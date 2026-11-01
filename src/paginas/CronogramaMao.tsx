import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { usarPremium } from '../conta/premium'
import { usarIndice } from '../dados/usarIndice'
import { FILTROS_VAZIOS } from '../dados/tipos'
import { calcularPlanoMao, comAdiantado, comSemanaDificil, configInicial, itemConfigMao, lerConfig, MINUTOS_POR_QUESTAO_MAO, type ConfigMao, type ProvaMao, type TemaDoPlano } from '../dados/cronogramaMao'
import { idsDoDiaMao, idsParaAdiantar, painelMao, resumoSemanaMao } from '../dados/painelMao'
import { calcularConstancia, desempenhoPorArea, elogio, formatarTempo, prontidaoPorArea } from '../dados/hubCronograma'
import { corDaArea } from '../dados/coresAreas'
import { diaCurto, textoPuxar } from '../dados/frasesAdiantar'
import { usarConta } from '../conta/ContextoConta'
import { CartaoHoje, ComoEstouIndo, Depois, EstaSemana, ExportarCalendario, LinhaAmanha, OndeVoceEsta, PainelAdiantar, Prontidao, Recolhido, ResumoSemana, TourCronograma, type ItemChecklist } from './CronogramaPainel'
import { CHAVE_RESUMAO_HOJE, lidoHoje, RESUMAO_HOJE_VAZIO, type ResumaoHoje } from '../estado/resumaoLido'
import { avisoVistoNaConta, marcarAvisoNaConta } from '../conta/avisosVistos'
import { CartaoConstancia, CartaoDesempenho } from './CronogramaHub'
import { CalendarioCronograma } from './CronogramaCalendario'
import { CaixaResumos } from '../biblioteca/CaixaResumos'
import { resumosDosSubtemas, subtemasDasQuestoes, usarIndiceBiblioteca } from '../biblioteca/recomendar'
import { usarBiblioteca } from '../biblioteca/usarBiblioteca'
import '../estilos/paginas/CronogramaPainel.css'
import '../estilos/paginas/PlanoEstudo.css'
import '../estilos/paginas/Cronograma.css'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { usarSessao } from '../estado/sessao'
import { Carregando } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { chaveCivil, hojeBR, somarDias } from '../util/dia'
import { href, navegar } from '../util/rotas'
import '../estilos/paginas/CronogramaTorre.css'
import '../estilos/componentes/Cristal.css'
import '../estilos/paginas/CronogramaMao.css'
import { CenaOficina } from '../componentes/cronograma/CenaOficina'
import { TrocaCronograma } from '../componentes/TrocaCronograma'

const PROVAS: Record<ProvaMao, { titulo: string; curto: string; texto: string }> = {
  ingresso: { titulo: 'Ingresso em Cirurgia da Mão', curto: 'Ingresso (residência)', texto: 'Para as provas de seleção da residência e dos programas de Cirurgia da Mão. Você faz todo tipo de questão da mão, das provas de ingresso e do padrão SBCM e SIMÃO, na ordem do que as provas de ingresso mais cobram.' },
  titulo: { titulo: 'Título de Cirurgia da Mão: SBCM e SIMÃO', curto: 'Título: SBCM e SIMÃO', texto: 'Para o exame de título da SBCM e o SIMÃO, o simulado do exame. O foco são as questões no padrão da SBCM e do SIMÃO, na ordem do que a prova mais cobra; questões de ingresso dos mesmos assuntos entram só como reforço.' },
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
  const { premium, logado } = usarPremium()
  const [respondidas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  const [mapa, definirMapa] = usarArmazenado<Mapa>('biblioteca', {})
  const [provaSalva, salvarProva] = usarArmazenado<ProvaMao>('cronograma-mao:prova', 'ingresso')
  const pedida = consulta?.get('prova')
  const prova: ProvaMao = pedida === 'titulo' || pedida === 'ingresso' ? pedida : provaSalva
  const config = lerConfig(mapa[itemConfigMao(prova)])
  // lembra a última prova aberta (o link do menu abre direto nela)
  useEffect(() => { if (prova !== provaSalva) salvarProva(prova) }, [prova, provaSalva, salvarProva])
  const [editando, definirEditando] = useState(false)
  const { iniciarComAviso } = usarSessao()

  const salvar = (c: ConfigMao | null) => {
    definirMapa((antes) => ({ ...antes, [itemConfigMao(prova)]: c ? { ...c, em: Date.now() } : null }))
    definirEditando(false)
  }
  async function estudar(ids: string[]) {
    if (!premium) { navegar('/assinatura'); return }
    if (!ids.length) return
    if (await iniciarComAviso({ ...FILTROS_VAZIOS, areas: ['mao'], embaralhar: false, limite: ids.length }, ids, { origem: 'cronograma' })) navegar('/sessao')
  }

  return (
    // As mesmas classes do cronograma de ortopedia (cr--torre): cartões, botões, chips e estados iguais nas três variantes.
    <div className={`empilha-2 cm pe ${indice && (!config || editando) ? 'cr-form' : 'cp cr cf'} cr--torre`}>
      <TrocaCronograma atual={prova} />
      {!indice ? <Carregando linhas={5} rotulo="Montando o plano" />
        : !config || editando
          ? <Formulario prova={prova} inicial={config ?? configInicial(prova)} novo={!config} aoSalvar={salvar} aoCancelar={config ? () => definirEditando(false) : undefined} logado={logado} />
          : <Painel prova={prova} config={config} premium={premium} indice={indice} respondidas={respondidas} aoEstudar={estudar} aoConfig={(c) => definirMapa((antes) => ({ ...antes, [itemConfigMao(prova)]: { ...c, em: Date.now() } }))} aoEditar={() => definirEditando(true)} aoApagar={() => { if (window.confirm('Apagar este plano? Suas respostas continuam salvas.')) salvar(null) }} />}
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
            <button type="button" role="radio" aria-checked={c.cobertura === 'completa'} className="pe-intensidade" onClick={() => definir({ ...c, cobertura: 'completa' })}><strong>Completo</strong><span>{prova === 'titulo' ? 'Todos os assuntos do título, com questões de ingresso como reforço.' : 'Todos os assuntos, com todo tipo de questão da mão.'}</span></button>
            <button type="button" role="radio" aria-checked={c.cobertura === 'essencial'} className="pe-intensidade" onClick={() => definir({ ...c, cobertura: 'essencial' })}><strong>Essencial</strong><span>Só os assuntos de prioridade máxima e alta{prova === 'titulo' ? ', só com questões no padrão SBCM e SIMÃO' : ''}. Bom para pouco tempo.</span></button>
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

interface PropsPainel { prova: ProvaMao; config: ConfigMao; premium: boolean; indice: NonNullable<ReturnType<typeof usarIndice>['indice']>; respondidas: Record<string, RegistroQuestao>; aoEstudar: (ids: string[]) => void; aoConfig: (c: ConfigMao) => void; aoEditar: () => void; aoApagar: () => void }

/**
 * O plano da mão na mesma arquitetura do cronograma de ortopedia (pedido do Tales, 26/10/2026): o topo
 * "Onde você está" com as passadas e a reta final, o calendário, o cartão Hoje com a lista do dia e o botão
 * único, amanhã, como você está indo, esta semana e o que vem depois, e os blocos que abrem (constância,
 * prontidão por grande área, prioridades, semana a semana, levar para o calendário do celular). As peças são
 * as mesmas da página de ortopedia; o motor é o da mão (src/dados/cronogramaMao.ts, traduzido em painelMao.ts).
 */
function Painel({ prova, config, premium, indice, respondidas, aoEstudar, aoConfig, aoEditar, aoApagar }: PropsPainel) {
  const mao = useMemo(() => calcularPlanoMao(indice, respondidas, config), [indice, respondidas, config])
  const { plano, calculo } = useMemo(() => painelMao(mao), [mao])
  // a constância conta só as questões da mão (as de ortopedia têm o próprio cronograma)
  const idsDoPlano = useMemo(() => new Set(mao.temas.flatMap((t) => t.ids)), [mao])
  const respondidasMao = useMemo(() => Object.fromEntries(Object.entries(respondidas).filter(([id]) => idsDoPlano.has(id))), [respondidas, idsDoPlano])
  const constancia = useMemo(() => calcularConstancia(respondidasMao, plano, calculo), [respondidasMao, plano, calculo])
  const subtemasHoje = useMemo(() => subtemasDasQuestoes(indice, mao.idsHoje), [indice, mao.idsHoje])
  // O dia escolhido no calendário: os resumos ao lado acompanham o dia tocado (1/11/2026).
  const [diaEscolhido, definirDiaEscolhido] = useState<{ data: Date; ehHoje: boolean; ids: string[] } | null>(null)
  const subtemasEscolhido = useMemo(() => (diaEscolhido && !diaEscolhido.ehHoje && diaEscolhido.ids.length ? subtemasDasQuestoes(indice, diaEscolhido.ids) : subtemasHoje), [indice, diaEscolhido, subtemasHoje])
  const rotuloEscolhido = diaEscolhido && !diaEscolhido.ehHoje && diaEscolhido.ids.length ? diaEscolhido.data.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'numeric' }).replace('.', '') : undefined
  const biblioteca = usarIndiceBiblioteca()
  const { leituras } = usarBiblioteca()
  const resumoHoje = resumosDosSubtemas(biblioteca, subtemasHoje)[0] ?? null
  const minutos = MINUTOS_POR_QUESTAO_MAO
  const { sessao: sessaoConta } = usarConta()
  const nome = String(sessaoConta?.user.user_metadata?.nome ?? '').trim().split(/\s+/)[0] ?? ''
  const [resumaoHoje] = usarArmazenado<ResumaoHoje>(CHAVE_RESUMAO_HOJE, RESUMAO_HOJE_VAZIO)
  const [tourVisto, definirTourVisto] = usarArmazenado<boolean>('cronograma:tour-v2', false)
  const semana = useMemo(() => resumoSemanaMao(mao, respondidasMao, calculo), [mao, respondidasMao, calculo])
  // O que passou da meta de hoje fica guardado na conta: amanhã (em qualquer aparelho) o próximo dia vem mais leve.
  const extraHoje = premium && !calculo.naRetaFinal ? calculo.extraHoje : 0
  useEffect(() => {
    if ((config.adiantados?.[mao.hoje.data] ?? 0) !== extraHoje) aoConfig(comAdiantado(config, mao.hoje.data, extraHoje))
  }, [extraHoje]) // eslint-disable-line react-hooks/exhaustive-deps

  if (mao.encerrado) return (
    <section className="cp-bloco cm-cartao">
      <h1>A data da prova passou</h1>
      <p className="texto-2">Seu histórico continua salvo. Coloque a data da próxima prova para montar um plano novo.</p>
      <button type="button" className="botao botao--principal" onClick={aoEditar}>Mudar a data</button>
    </section>
  )

  const itensHoje = calculo.hoje?.itens ?? []
  const principal = itensHoje[0] ?? null
  const mistura = itensHoje.slice(1)
  const folgaHoje = calculo.tipoHoje === 'folga'
  const metaFeita = calculo.metaDiaria > 0 && calculo.faltaHoje === 0
  const comecar = () => aoEstudar(mao.idsHoje)

  // ── a lista do dia, como no cronograma de ortopedia ──
  const lista: ItemChecklist[] = []
  if (!calculo.naRetaFinal) {
    // As frases "Na prova" da mão, como o "Frases que caem do tema" do cronograma de ortopedia.
    if (!folgaHoje) lista.push({ id: 'resumao', titulo: 'Frases que caem da mão', texto: 'As frases "Na prova" dos comentários de Cirurgia da Mão, para chegar às questões sabendo o que procurar.', minutos: 4, estado: lidoHoje(resumaoHoje, 'mao') ? 'feito' : 'afazer', acao: premium ? { rotulo: 'Ler', href: href('/resumos/frases?tema=mao') } : undefined })
    if (resumoHoje) {
      const l = leituras[resumoHoje.id]
      lista.push({ id: 'resumo-biblioteca', titulo: 'Resumo do capítulo', texto: <>{resumoHoje.titulo}: o capítulo na ordem em que a prova cobra.{l?.progresso && !l.concluidoEm ? ` ${l.progresso}% lido.` : ''}</>, minutos: Math.max(1, Math.round(resumoHoje.minutos * (1 - (l?.progresso ?? 0) / 100))), estado: l?.concluidoEm || (l?.progresso ?? 0) >= 95 ? 'feito' : 'afazer', acao: { rotulo: l?.progresso ? 'Continuar' : 'Ler', href: href(`/resumos/${resumoHoje.id}`) }, opcional: true, icone: 'livro' })
    }
    if (calculo.miniHoje) lista.push({ id: 'mini', titulo: `Mini-simulado de ${mao.idsHoje.length} questões`, texto: 'Questões de todos os assuntos do plano, na proporção do quanto caem. Faça de uma vez, como na prova.', minutos: mao.idsHoje.length * minutos, estado: metaFeita ? 'feito' : calculo.feitasHoje > 0 ? 'agora' : 'afazer', progresso: { feitas: Math.min(calculo.feitasHoje, calculo.metaDiaria), total: calculo.metaDiaria }, acao: premium ? { rotulo: 'Começar', aoClicar: comecar } : undefined })
    else if (calculo.metaDiaria > 0) lista.push({
      id: 'novas', titulo: `${calculo.metaDiaria} questões`,
      texto: <>{principal ? <>{principal.assuntos.slice(0, 2).join(', ')}{mistura.length ? <>, com {mistura.map((m) => m.nome.toLocaleLowerCase('pt-BR')).join(' e ')} para misturar</> : null}</> : 'Do plano'}{mao.revisaoHoje ? `, e ${mao.revisaoHoje} ${mao.revisaoHoje === 1 ? 'erro' : 'erros'} para revisar no meio` : ''}. {calculo.feitasHoje > 0 ? `${Math.min(calculo.feitasHoje, calculo.metaDiaria)} de ${calculo.metaDiaria} feitas.` : ''}</>,
      minutos: calculo.metaDiaria * minutos, estado: metaFeita ? 'feito' : calculo.feitasHoje > 0 ? 'agora' : 'afazer',
      progresso: { feitas: Math.min(calculo.feitasHoje, calculo.metaDiaria), total: calculo.metaDiaria },
    })
    lista.push({ id: 'flashcards', titulo: 'Flashcards', texto: 'Uma rodada curta para fixar o que você errou · ~5 min', minutos: 5, estado: 'afazer', opcional: true, icone: 'raio', acao: { rotulo: 'Abrir', href: href('/flashcards') } })
  } else if (mao.idsHoje.length) lista.push({
    id: 'novas', titulo: `Reta final: ${mao.idsHoje.length} questões`, texto: `Seus erros e os assuntos de prioridade máxima, sem conteúdo novo${mao.revisaoHoje ? ` (${mao.revisaoHoje} revisões de erros)` : ''}.`,
    minutos: mao.idsHoje.length * minutos, estado: calculo.feitasHoje >= mao.idsHoje.length ? 'feito' : calculo.feitasHoje > 0 ? 'agora' : 'afazer',
  })

  // ── o botão único ──
  const n = calculo.naRetaFinal ? mao.idsHoje.length : calculo.faltaHoje
  let botao: Parameters<typeof CartaoHoje>[0]['botao'] = !premium
    ? { rotulo: 'Assinar para começar', detalhe: 'O seu plano já está montado', href: href('/assinatura'), ouro: true }
    : !folgaHoje && n > 0 && mao.idsHoje.length
      ? { rotulo: calculo.feitasHoje > 0 ? `Continuar: faltam ${n} questões` : `Começar: ${n} questões`, detalhe: `${principal ? principal.nome : calculo.miniHoje ? 'Mini-simulado' : 'Reta final'} · ~${formatarTempo(n * minutos)}`, aoClicar: comecar }
      : null
  const tituloHoje = folgaHoje ? 'Hoje é folga' : calculo.naRetaFinal ? 'Reta final' : metaFeita ? 'Meta de hoje feita' : calculo.miniHoje ? 'Dia de mini-simulado' : principal ? principal.nome : 'Hoje'
  const porQue = folgaHoje ? 'Dia de descanso no seu plano: a meta foi espalhada pelos outros dias.'
    : metaFeita ? `Feito: ${calculo.metaDiaria} questões. Se quiser, adiante pelo calendário.`
    : calculo.naRetaFinal ? 'Sem conteúdo novo: revisar o que mais cai e os seus erros.'
    : principal ? `Por que hoje: é a vez desta área na fila (${calculo.passadaAtual === 1 ? 'prioridade máxima' : calculo.passadaAtual === 2 ? 'prioridade alta' : 'o resto do conteúdo'})${principal.assuntos[0] ? `, a começar por ${principal.assuntos[0].toLocaleLowerCase('pt-BR')}` : ''}.` : ''
  const recados: ReactNode[] = []
  if (premium) {
    if (calculo.naRetaFinal) recados.push(<>Reta final: agora é revisar o que mais cai, sem conteúdo novo.</>)
    else if (folgaHoje) recados.push(<>Hoje é dia de descanso.{calculo.amanha?.total ? <> O plano segue com <b>{calculo.amanha.total} questões</b> no próximo dia de estudo.</> : ''}</>)
    else if (metaFeita) recados.push(<>A meta de hoje está feita.</>)
    else if (calculo.metaDiaria > 0) recados.push(<>A meta de hoje: <b>{calculo.metaDiaria} questões</b>, cerca de {formatarTempo(calculo.metaDiaria * minutos)}.</>)
    if (mao.acerto !== null && mao.acerto >= 50) recados.push(<>Seu acerto nas questões do plano: <b>{mao.acerto}%</b>.</>)
  }
  // Hoje feito (ou folga): o botão passa a puxar o próximo dia de estudo, com as mesmas palavras do cronograma de
  // ortopedia ("Puxar amanhã", "Puxar sex").
  const proximoDia = premium && !calculo.naRetaFinal && calculo.amanha ? chaveCivil(calculo.amanha.data) : null
  let acaoTopo = botao
  if (!botao && proximoDia) {
    const t = textoPuxar(calculo.amanha!)
    const semana = diaCurto(calculo.amanha!.data).split(',')[0]
    const aoClicar = () => aoEstudar(idsDoDiaMao(mao, proximoDia))
    botao = { rotulo: t.rotulo, detalhe: `${t.detalhe} · ~${formatarTempo(calculo.amanha!.total * minutos)}`, aoClicar, ouro: true }
    acaoTopo = { rotulo: t.rotulo.includes('amanhã') ? 'Puxar amanhã' : `Puxar ${semana}`, detalhe: `${diaCurto(calculo.amanha!.data)} · ${t.detalhe}`, aoClicar, ouro: true }
  }
  const podeAdiantar = premium && !calculo.naRetaFinal && calculo.restante > 0
  const painelAdiantar = podeAdiantar ? <PainelAdiantar calculo={calculo} minutos={minutos} destaque={!botao} aoAdiantar={(n) => aoEstudar([...mao.idsHoje, ...idsParaAdiantar(mao, n)])} aoCancelar={() => undefined} /> : null
  const resumoAviso = resumoHoje && !leituras[resumoHoje.id]?.concluidoEm
    ? <a className="cp-hoje__resumo" href={href(`/resumos/${resumoHoje.id}`)}><Icone nome="livro" tamanho={16} /><span><strong>Antes das questões, leia o resumo</strong><small>{resumoHoje.titulo} · ~{resumoHoje.minutos} min · o que já caiu, ano a ano</small></span><Icone nome="direita" tamanho={15} /></a>
    : undefined
  const mostrarTour = premium && !tourVisto && !avisoVistoNaConta(sessaoConta?.user.user_metadata, 'cronograma-tour')
  const prioridades = mao.temas.slice(0, 8)
  const prontidao = prontidaoPorArea(calculo)
  const desempenho = desempenhoPorArea(calculo)
  const media = mao.acerto

  return <>
    {/* A Oficina da Mão (01/11/2026): a cena do topo, na mesma praça da Torre do Tempo; o tour da primeira visita
        fica curto, logo abaixo do botão do dia, como no cronograma de ortopedia. */}
    <OndeVoceEsta plano={plano} calculo={calculo} aoAjustar={aoEditar} acao={acaoTopo} nome={nome} recados={recados} rodape={premium && semana ? <ResumoSemana {...semana} /> : undefined}
      cena={<CenaOficina />} depois={mostrarTour ? <TourCronograma compacto aoFechar={() => { definirTourVisto(true); marcarAvisoNaConta(sessaoConta?.user.user_metadata, 'cronograma-tour') }} /> : undefined} />

    <CalendarioCronograma embutido aoSelecionar={definirDiaEscolhido} nome={nome} plano={plano} calculo={calculo} indice={indice} respondidas={respondidasMao} minutos={minutos}
      acoes={{ aoComecar: premium ? comecar : undefined, aoPuxar: premium ? (dia) => aoEstudar(idsDoDiaMao(mao, dia)) : undefined, proximo: calculo.amanha }} />

    <div className="cp-colunas">
      <div className="cp-col cp-col--principal">
        <div className="cp-ordem-1"><CartaoHoje calculo={calculo} titulo={tituloHoje} porQue={porQue} assuntos={principal ? [...principal.assuntos, ...mistura.flatMap((m) => m.assuntos.slice(0, 1))] : []} itens={lista} botao={botao} cor={corDaArea(principal?.slug ?? 'mao')} adiantar={painelAdiantar}
          aviso={folgaHoje ? <p className="cp-hoje__ajustar"><span>Vai estudar hoje ou quer mudar os dias?</span><button type="button" className="botao botao--principal" onClick={aoEditar}><Icone nome="lapis" tamanho={15} /> Ajustar o cronograma</button></p> : resumoAviso} /></div>
      </div>
      <div className="cp-col cp-col--lado">
        {!calculo.naRetaFinal && <div className="cp-ordem-3"><CaixaResumos subtemasHoje={subtemasEscolhido} rotuloDia={rotuloEscolhido} especialidade="mao" /></div>}
        {!calculo.naRetaFinal && <div className="cp-ordem-3"><LinhaAmanha dia={calculo.amanha} /></div>}
        <div className="cp-ordem-4"><ComoEstouIndo calculo={calculo} constancia={constancia} minutosQuestao={minutos} /></div>
        {!calculo.naRetaFinal && <div className="cp-ordem-4"><EstaSemana calculo={calculo} plano={plano} constancia={constancia} compacta={false} aoSemanaDificil={premium ? (ativar) => aoConfig(comSemanaDificil(config, ativar)) : undefined} /></div>}
      </div>
    </div>

    <div className="cp-recolhidos cp-recolhidos--grade">
      <Recolhido titulo="Constância: os últimos 14 dias" icone="fogo"><CartaoConstancia constancia={constancia} elogio={elogio(constancia, calculo)} /></Recolhido>
      <Recolhido titulo="Desempenho e prontidão por área" icone="grafico">
        <Prontidao areas={prontidao} /><CartaoDesempenho areas={desempenho} media={media} />
        <p className="cp-indo__nota">Prontidão estimada do plano: <b>{mao.prontidao}%</b> (domínio dos assuntos pesado pelo quanto caem). É uma estimativa para orientar o estudo, não a chance de passar.</p>
      </Recolhido>
      <Recolhido titulo="Prioridades agora" icone="alvo">
        <p className="texto-2">O que mais cai, onde você mais erra e o que falta fazer.</p>
        <ol className="cm-prioridades">{prioridades.map((t) => <LinhaPrioridade key={t.nome} t={t} premium={premium} aoEstudar={aoEstudar} />)}</ol>
        <a className="cm-link" href={href(`/temas-que-mais-caem?prova=${prova === 'titulo' ? 'mao-titulo' : 'mao-ingresso'}`)}>Ver o ranking completo<Icone nome="direita" tamanho={14} /></a>
      </Recolhido>
      {!calculo.naRetaFinal && <Recolhido titulo="Até a prova, semana a semana" icone="rota"><Depois calculo={calculo} plano={plano} maximo={8} /></Recolhido>}
      <Recolhido titulo="Levar para o calendário do celular" icone="calendario"><ExportarCalendario calculo={calculo} plano={plano} rota={`/cronograma-mao?prova=${prova}`} /></Recolhido>
      <Recolhido titulo="Como este plano funciona" icone="interrogacao">
        <ul className="cm-como">
          <li><b>Passadas:</b> primeiro os assuntos de prioridade máxima da {prova === 'titulo' ? 'prova de título' : 'prova de ingresso'}, depois os de prioridade alta e, por fim, o resto.</li>
          <li><b>{prova === 'titulo' ? 'Foco na SBCM e no SIMÃO:' : 'Todo tipo de questão:'}</b> {prova === 'titulo' ? 'as questões no padrão da prova vêm primeiro; as de ingresso dos mesmos assuntos entram só como reforço.' : 'as provas de ingresso e as questões no padrão SBCM e SIMÃO, misturadas em cada assunto.'}</li>
          <li><b>Se ajusta sozinho:</b> errou, o assunto sobe na fila; atrasou, a meta sobe no máximo 25% e o resto sai do fim da fila; mudou a data, o plano se refaz sem apagar o que você já fez.</li>
          <li><b>Adiantar e semana difícil:</b> o que você fizer além da meta sai do próximo dia de estudo; numa semana corrida, a semana difícil deixa só 10 questões por dia e espalha o resto.</li>
          <li><b>Resumos:</b> os resumos da Biblioteca de Cirurgia da Mão aparecem ao lado do dia; quando um ensina o assunto de hoje, ele vem primeiro, com o convite para ler antes das questões.</li>
          <li><b>Revisão e simulado:</b> até um quarto do dia é revisão dos seus erros; a cada 14 dias, um mini-simulado; nas duas últimas semanas, a reta final.</li>
        </ul>
      </Recolhido>
    </div>

    <p className="cr-rodape">
      <a className="cr-rodape__link" href={href(`/temas-que-mais-caem?prova=${prova === 'titulo' ? 'mao-titulo' : 'mao-ingresso'}`)}><Icone nome="grafico" tamanho={16} /> Temas que mais caem</a>
      <button type="button" className="cm-apagar" onClick={aoApagar}>Apagar este plano</button>
    </p>
  </>
}

function LinhaPrioridade({ t, premium, aoEstudar }: { t: TemaDoPlano; premium: boolean; aoEstudar: (ids: string[]) => void }) {
  const porque = t.feitas ? (t.acerto !== null ? `você acerta ${t.acerto}%` : `você fez ${num(t.feitas)}`) : 'você ainda não fez'
  const ids = [...t.pendentes, ...t.ids.filter((id) => !t.pendentes.includes(id))].slice(0, 20)
  return (
    <li>
      <span className="cm-prioridades__nome"><strong>{t.nome}</strong><small>{num(t.pctEdicao)}% por prova · {porque} · {num(t.pendentes.length)} por fazer</small></span>
      <button type="button" className="cm-treinar" onClick={() => aoEstudar(ids)} aria-label={`Treinar ${t.nome}`}>{premium ? 'Treinar' : 'Assinar'}<Icone nome="direita" tamanho={14} /></button>
    </li>
  )
}
