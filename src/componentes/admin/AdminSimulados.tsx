import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { carregarIndice, carregarQuestoes } from '../../dados/acervo'
import {
  PROVAS_NACIONAL, candidatasDoIndice, cotasPorArea, sortearEdicao, trocarItem,
  type CandidataNacional, type ConfigSorteio, type ItemSorteado,
} from '../../dados/simuladoNacional'
import {
  snAdminConfig, snAdminDatas, snAdminEstatisticas, snAdminListar, snAdminPublicar, snAdminSalvar, snAdminTrocarItem,
  type EdicaoAdminSN, type EstatisticasSN,
} from '../../dados/apiSimuladoNacional'
import {
  MAX_QUESTOES, MIN_QUESTOES, ROTULO_STATUS, TAMANHOS,
  codigoEdicao, conferirCotas, conferirFormulario, configParaBanco, contarPor, dataCurta, dataPorExtenso, datasPadrao, ehEdicaoNova,
  formularioDaEdicao, formularioPadrao, idsUsados, isoParaLocal, itensDaEdicao, itensParaBanco, localParaIso, lerConfig,
  mensagemDeFalha, mensalAtrasada, mesPadrao, nomeDoMes, sementeDe, somarMeses, statusEdicao, tituloPadrao, trechoEnunciado,
  type FormEdicao, type StatusEdicao,
} from './montagemSimulado'
import { confirmar } from '../Confirmar'
import { Icone } from '../Icone'
import { href } from '../../util/rotas'
import '../../estilos/paginas/AdminSimulados.css'

/*
 * Painel › Conteúdo › Simulados: o Simulado Nacional 2.0 (parte D do plano,
 * docs/superpowers/specs/2026-10-19-simulado-nacional-contrato.md).
 * Três vistas: a linha do tempo das edições, a montagem (identificação,
 * sorteio, prévia das questões, prévia da página, salvar) e a edição publicada
 * (texto, datas, publicação, troca de questão e Acompanhar).
 */

// ---------------------------------------------------------------------------
// Acervo: as candidatas, com gabarito e alternativas lidos dos arquivos dos temas
// ---------------------------------------------------------------------------

interface AcervoNacional { candidatas: CandidataNacional[]; enunciados: Map<string, string> }
let promessaAcervo: Promise<AcervoNacional> | null = null

function carregarAcervoNacional(): Promise<AcervoNacional> {
  promessaAcervo ??= (async () => {
    const indice = await carregarIndice()
    const provaveis = indice.questoes.filter((q) => !q.dup && q.an !== 1 && q.sim !== 1 && q.p !== null && PROVAS_NACIONAL.has(indice.provas[q.p]))
    const questoes = await carregarQuestoes(indice, provaveis.map((q) => q.id))
    const porId = new Map(questoes.map((q) => [q.id, q]))
    // Anulada ou com figura pendente: sem gabarito, fica de fora.
    const valida = (id: string) => { const q = porId.get(id); return q && !q.anulada && !q.figuraPendente && q.tipo !== 'dissertativa' ? q : undefined }
    const candidatas = candidatasDoIndice(indice, (id) => valida(id)?.gabarito ?? undefined, (id) => valida(id)?.alternativas.length)
    return { candidatas, enunciados: new Map(questoes.map((q) => [q.id, q.enunciado])) }
  })()
  promessaAcervo.catch(() => { promessaAcervo = null })
  return promessaAcervo
}

function usarAcervo(ativo: boolean) {
  const [acervo, definirAcervo] = useState<AcervoNacional | null>(null)
  const [falhou, definirFalhou] = useState(false)
  useEffect(() => {
    if (!ativo || acervo) return
    let vivo = true
    carregarAcervoNacional().then((a) => { if (vivo) definirAcervo(a) }, () => { if (vivo) definirFalhou(true) })
    return () => { vivo = false }
  }, [ativo, acervo])
  return { acervo, falhou }
}

// ---------------------------------------------------------------------------
// Pedaços comuns
// ---------------------------------------------------------------------------

type Recado = { texto: string; erro: boolean } | null
const duracaoTexto = (min: number) => (min % 60 === 0 ? `${min / 60} ${min === 60 ? 'hora' : 'horas'}` : `${min} minutos`)
const media = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${String(Math.round(v * 10) / 10).replace('.', ',')}%`)
const maiuscula = (t: string) => t.replace(/^./, (c) => c.toUpperCase())

function SeloStatus({ status }: { status: StatusEdicao }) {
  return <span className={`asn-status asn-status--${status}`}>{ROTULO_STATUS[status]}</span>
}

function Selos({ e }: { e: Pick<EdicaoAdminSN, 'tipo' | 'aberto_a_todos' | 'destaque_inicio'> }) {
  return <>
    <span className={'asn-selo' + (e.tipo === 'vespera' ? ' asn-selo--vespera' : '')}>{e.tipo === 'vespera' ? 'Véspera' : 'Mensal'}</span>
    {e.aberto_a_todos && <span className="asn-selo asn-selo--aberto">Aberto a todos</span>}
  </>
}

function Passo({ n, titulo, ajuda, children, id }: { n: number; titulo: string; ajuda?: ReactNode; children: ReactNode; id: string }) {
  return <section className="asn-passo" aria-labelledby={id}>
    <header className="asn-passo__cabeca">
      <span className="px-numero" aria-hidden="true">{n}</span>
      <div><h3 id={id}>{titulo}</h3>{ajuda && <p>{ajuda}</p>}</div>
    </header>
    <div className="asn-passo__corpo">{children}</div>
  </section>
}

function Aviso({ recado, aoFechar }: { recado: Recado; aoFechar: () => void }) {
  if (!recado) return null
  return <div role={recado.erro ? 'alert' : 'status'} className={'asn-recado' + (recado.erro ? ' asn-recado--erro' : '')}>
    <Icone nome={recado.erro ? 'alerta' : 'certo'} tamanho={18} />
    <p>{recado.texto}</p>
    <button type="button" className="asn-recado__fechar" aria-label="Fechar o aviso" onClick={aoFechar}><Icone nome="fechar" tamanho={16} /></button>
  </div>
}

// ---------------------------------------------------------------------------
// O painel
// ---------------------------------------------------------------------------

type Vista = { tipo: 'lista' } | { tipo: 'montar'; base: EdicaoAdminSN | null; mes?: string } | { tipo: 'edicao'; edicao: string }

/** Painel › Conteúdo › Simulados: Simulado Nacional mensal e de véspera. */
export function AdminSimulados() {
  const [edicoes, definirEdicoes] = useState<EdicaoAdminSN[] | null>(null)
  const [erro, definirErro] = useState('')
  const [vista, definirVista] = useState<Vista>({ tipo: 'lista' })
  const [recado, definirRecado] = useState<Recado>(null)
  const { acervo, falhou } = usarAcervo(vista.tipo !== 'lista')

  const carregar = useCallback(async () => {
    try { definirEdicoes((await snAdminListar()).filter((e) => ehEdicaoNova(e.edicao))); definirErro('') }
    catch (f) { definirErro(mensagemDeFalha(f)) }
  }, [])
  useEffect(() => { void carregar() }, [carregar])

  const ir = (v: Vista) => { definirVista(v); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const atualizar = (nova: EdicaoAdminSN) => definirEdicoes((lista) => {
    const resto = (lista ?? []).filter((e) => e.edicao !== nova.edicao)
    return [nova, ...resto].sort((a, b) => b.abre_em.localeCompare(a.abre_em) || b.edicao.localeCompare(a.edicao))
  })

  if (erro && !edicoes) return <section className="adm-secao asn"><h2>Simulado Nacional</h2><p role="alert" className="adm-alerta">{erro}</p><button type="button" className="botao" onClick={() => void carregar()}>Tentar de novo</button></section>
  if (!edicoes) return <section className="adm-secao asn"><p role="status" className="asn-carregando">Carregando as edições…</p></section>

  const aberta = vista.tipo === 'edicao' ? edicoes.find((e) => e.edicao === vista.edicao) ?? null : null

  return <div className="asn empilha-2">
    <Aviso recado={recado} aoFechar={() => definirRecado(null)} />
    {vista.tipo === 'lista' && <Lista edicoes={edicoes} aoMontar={(mes) => ir({ tipo: 'montar', base: null, mes })} aoAbrir={(e) => ir(e.publicado ? { tipo: 'edicao', edicao: e.edicao } : { tipo: 'montar', base: e })} />}
    {vista.tipo !== 'lista' && !acervo && <section className="adm-secao asn-carregando-acervo" aria-live="polite">
      {falhou ? <p role="alert" className="adm-alerta">O acervo não carregou (índice ou arquivos dos temas). Atualize a página e tente de novo.</p>
        : <><span className="asn-girando" aria-hidden="true" /><p role="status">Lendo o acervo: gabaritos, alternativas e focos das questões oficiais…</p></>}
      <button type="button" className="botao botao--fantasma" onClick={() => ir({ tipo: 'lista' })}>Voltar às edições</button>
    </section>}
    {vista.tipo === 'montar' && acervo && <Montagem key={vista.base?.edicao ?? vista.mes ?? 'nova'} edicoes={edicoes} base={vista.base} mesInicial={vista.mes} acervo={acervo}
      aoVoltar={() => ir({ tipo: 'lista' })}
      aoSalvar={(nova, publicou) => { atualizar(nova); definirRecado({ texto: publicou ? `${nova.titulo} publicada. As inscrições já estão abertas.` : `Rascunho de ${nova.titulo} salvo. Ainda não aparece no site.`, erro: false }); ir(publicou ? { tipo: 'edicao', edicao: nova.edicao } : { tipo: 'lista' }) }} />}
    {vista.tipo === 'edicao' && acervo && aberta && <EdicaoPublicada e={aberta} edicoes={edicoes} acervo={acervo}
      aoVoltar={() => ir({ tipo: 'lista' })} aoMudar={atualizar}
      aoEditarMontagem={() => ir({ tipo: 'montar', base: aberta })} />}
  </div>
}

// ---------------------------------------------------------------------------
// 1. As edições, numa linha do tempo
// ---------------------------------------------------------------------------

function Lista({ edicoes, aoMontar, aoAbrir }: { edicoes: EdicaoAdminSN[]; aoMontar: (mes?: string) => void; aoAbrir: (e: EdicaoAdminSN) => void }) {
  const atrasada = mensalAtrasada(edicoes)
  const rascunhoAtrasada = atrasada ? edicoes.find((e) => e.edicao === atrasada) : undefined
  const sugerido = mesPadrao(edicoes)
  const agora = Date.now()
  return <>
    {atrasada && <div className="asn-banner" role="status">
      <Icone nome="calendario" tamanho={22} />
      <div><strong>A edição de {nomeDoMes(atrasada)} ainda não está pronta.</strong><p>{rascunhoAtrasada ? 'Tem um rascunho salvo: falta conferir e publicar.' : 'O mês vira em poucos dias e a página promete a próxima edição.'}</p></div>
      <button type="button" className="botao asn-botao-ouro" onClick={() => rascunhoAtrasada ? aoAbrir(rascunhoAtrasada) : aoMontar(atrasada)}>Montar agora</button>
    </div>}

    <section className="adm-secao asn-topo" aria-labelledby="asn-titulo">
      <div className="asn-topo__texto">
        <p className="asn-sobretitulo">Simulado Nacional</p>
        <h2 id="asn-titulo">Edições</h2>
        <p>Uma prova por mês com as questões oficiais do TEOT e do TARO, a mesma para todo o país, e o simulado de véspera quando a prova chega. A mais nova fica no alto.</p>
      </div>
      <div className="asn-topo__acoes">
        <button type="button" className="botao botao--principal" onClick={() => aoMontar(sugerido)}><Icone nome="lapis" tamanho={18} /> Montar {nomeDoMes(sugerido).replace(/ de \d+$/, '')}</button>
        <button type="button" className="botao botao--fantasma" onClick={() => aoMontar()}>Outra edição ou véspera</button>
      </div>
    </section>

    {edicoes.length === 0 ? <section className="adm-secao asn-vazio">
      <h3>Nenhuma edição nova ainda</h3>
      <p>As edições antigas (tabelas de antes da versão 2.0) não aparecem aqui. Comece por {nomeDoMes(sugerido)}: o painel sugere as datas, sorteia as questões e mostra a prévia antes de publicar.</p>
    </section> : <ol className="asn-linha">
      {edicoes.map((e) => {
        const status = statusEdicao(e, agora)
        return <li key={e.edicao} className={`asn-linha__item asn-linha__item--${status}`}>
          <span className="asn-linha__ponto" aria-hidden="true" />
          <article className="asn-cartao">
            <div className="asn-cartao__cabeca">
              <div className="asn-cartao__selos"><SeloStatus status={status} /><Selos e={e} /></div>
              <code className="asn-codigo">{e.edicao}</code>
            </div>
            <h3>{e.titulo}</h3>
            <p className="asn-cartao__datas"><Icone nome="relogio" tamanho={15} /><span>{dataCurta(e.abre_em)} → {dataCurta(e.fecha_em)} · {e.total} questões · {duracaoTexto(e.duracao_min)}</span></p>
            <dl className="asn-numeros">
              <div><dt>Inscritos</dt><dd>{e.inscritos}</dd></div>
              <div><dt>Começaram</dt><dd>{e.participantes}</dd></div>
              <div><dt>Entregas</dt><dd>{e.entregas}</dd></div>
              <div><dt>Média</dt><dd>{media(e.media)}</dd></div>
            </dl>
            <div className="asn-cartao__acoes">
              {e.publicado
                ? <button type="button" className="botao" onClick={() => aoAbrir(e)}><Icone nome="grafico" tamanho={17} /> Acompanhar e ajustar</button>
                : <button type="button" className="botao botao--principal" onClick={() => aoAbrir(e)}><Icone nome="lapis" tamanho={17} /> Continuar montando</button>}
            </div>
          </article>
        </li>
      })}
    </ol>}
  </>
}

// ---------------------------------------------------------------------------
// 2. Montar ou editar a edição
// ---------------------------------------------------------------------------

interface PropsMontagem {
  edicoes: EdicaoAdminSN[]
  base: EdicaoAdminSN | null
  mesInicial?: string
  acervo: AcervoNacional
  aoVoltar: () => void
  aoSalvar: (e: EdicaoAdminSN, publicou: boolean) => void
}

const PROVAS: Array<[string, string]> = [['TEOT', 'TEOT'], ['TARO', 'TARO'], ['Ortopedia', 'Ortopedia (origem não confirmada)']]
const ROTULO_NIVEL = ['Sem classificação', 'Nível 1', 'Nível 2', 'Nível 3', 'Nível 4']

function Montagem({ edicoes, base, mesInicial, acervo, aoVoltar, aoSalvar }: PropsMontagem) {
  const [f, definirF] = useState<FormEdicao>(() => base ? formularioDaEdicao(base) : formularioPadrao(mesInicial ?? mesPadrao(edicoes)))
  const [tamanhoLivre, definirTamanhoLivre] = useState(() => !TAMANHOS.includes(f.total as typeof TAMANHOS[number]))
  const [salvando, definirSalvando] = useState<'rascunho' | 'publicar' | null>(null)
  const [recado, definirRecado] = useState<Recado>(null)
  const [verTabela, definirVerTabela] = useState(false)
  const mudar = (patch: Partial<FormEdicao>) => definirF((atual) => ({ ...atual, ...patch }))
  const mudarConfig = (patch: Partial<ConfigSorteio>) => definirF((atual) => ({ ...atual, config: { ...atual.config, ...patch } }))

  /** Mês, tipo ou dia da prova mudaram: título, datas e "aberto a todos" seguem o padrão se ninguém mexeu neles. */
  const mudarIdentificacao = (patch: Partial<Pick<FormEdicao, 'mes' | 'tipo' | 'dataProva'>>) => definirF((antes) => {
    const depois = { ...antes, ...patch }
    const padraoAntes = formularioPadrao(antes.mes, antes.tipo, antes.dataProva)
    const padraoDepois = formularioPadrao(depois.mes, depois.tipo, depois.dataProva)
    const dAntes = datasPadrao(antes)
    if (antes.abre === dAntes.abre && antes.fecha === dAntes.fecha) Object.assign(depois, datasPadrao(depois))
    if (antes.titulo === tituloPadrao(antes)) depois.titulo = tituloPadrao(depois)
    if (antes.abertoATodos === padraoAntes.abertoATodos) depois.abertoATodos = padraoDepois.abertoATodos
    if (patch.tipo === 'vespera' && !antes.slug) depois.slug = 'prova'
    return depois
  })

  const codigo = codigoEdicao(f)
  const existente = edicoes.find((e) => e.edicao === codigo) ?? null
  const comParticipantes = !!existente && existente.participantes > 0
  const sobrescreve = !!existente && existente.edicao !== base?.edicao
  const semente = sementeDe(codigo, f.variante)

  // As candidatas das provas marcadas e o que cada área tem.
  const provas = useMemo(() => new Set(f.config.provas), [f.config.provas])
  const filtradas = useMemo(() => acervo.candidatas.filter((c) => c.prova === undefined || provas.has(c.prova)), [acervo.candidatas, provas])
  const disponiveis = useMemo(() => new Map(contarPor(filtradas, (c) => c.area)), [filtradas])
  const usadas = useMemo(() => idsUsados(edicoes, codigo), [edicoes, codigo])
  const opcoesPeso = { pesoRecentes: f.config.pesoRecentes, anosRecentes: f.config.anosRecentes }
  const cotasAuto = useMemo(() => cotasPorArea(filtradas, f.total, opcoesPeso),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtradas, f.total, f.config.pesoRecentes, f.config.anosRecentes])
  const conferencia = f.config.cotas ? conferirCotas(f.config.cotas, f.total, disponiveis) : null
  const cotasValidas = !conferencia || conferencia.ok

  // O sorteio: refeito ao vivo a cada mudança de configuração. Ao abrir um rascunho, valem os itens salvos
  // até mexer na configuração. As trocas valem para o sorteio em que foram feitas.
  const chave = JSON.stringify([semente, f.total, f.config, filtradas.length, cotasValidas])
  const [salvos] = useState(() => base ? { chave, ...itensDaEdicao(acervo.candidatas, base.ids, sementeDe(base.edicao, lerConfig(base.config).variante)) } : null)
  const sorteado = useMemo(() => (salvos && salvos.chave === chave && salvos.itens.length) ? salvos.itens : sortearEdicao(filtradas, semente, {
    total: f.total, usadas, nivelAltoPct: f.config.nivelAltoPct, cotas: cotasValidas ? f.config.cotas : null, ...opcoesPeso,
  }), // eslint-disable-next-line react-hooks/exhaustive-deps
  [chave, salvos, usadas])
  const [trocas, definirTrocas] = useState<{ chave: string; por: Record<number, ItemSorteado>; saidas: string[] }>({ chave, por: {}, saidas: [] })
  const trocasValem = trocas.chave === chave
  const itens = useMemo(() => sorteado.map((i) => (trocasValem ? trocas.por[i.ordem] : undefined) ?? i), [sorteado, trocas, trocasValem])
  const repetidas = itens.filter((i) => usadas.has(i.id)).length

  function trocar(ordem: number) {
    const sai = itens.find((i) => i.ordem === ordem)
    if (!sai) return
    const saidas = trocasValem ? trocas.saidas : []
    const novo = trocarItem(filtradas, itens, ordem, semente, new Set([...saidas, sai.id, ...usadas]))
    if (!novo) { definirRecado({ texto: `Não há outra questão de ${sai.area} para trocar.`, erro: true }); return }
    definirTrocas({ chave, por: { ...(trocasValem ? trocas.por : {}), [ordem]: novo }, saidas: [...saidas, sai.id] })
    definirRecado({ texto: `Questão ${ordem} trocada: saiu ${sai.id}, entrou ${novo.id}${novo.foco && novo.foco === sai.foco ? ' (mesmo foco)' : ''}.`, erro: false })
  }

  function mudarCota(area: string, valor: string) {
    const n = valor === '' ? 0 : Number(valor)
    const atuais = f.config.cotas ?? Object.fromEntries(cotasAuto.map((c) => [c.area, c.alvo]))
    mudarConfig({ cotas: { ...atuais, [area]: n } })
  }

  const problema = conferirFormulario(f)
    ?? (!cotasValidas ? `As cotas por área não fecham: ${conferencia!.mensagem}` : null)
    ?? (itens.length !== f.total ? `O acervo só tem ${itens.length} questões elegíveis com essas provas; diminua o número de questões ou marque mais provas.` : null)
    ?? (comParticipantes ? `${existente!.titulo} já tem participantes: a prova não muda mais. Abra a edição para ajustar texto, destaque e prazo.` : null)

  async function salvar(publicar: boolean) {
    if (problema) { definirRecado({ texto: problema, erro: true }); return }
    if (sobrescreve && !(await confirmar({ titulo: `Regravar ${codigo}?`, texto: `Já existe a edição "${existente!.titulo}" com esse código. Salvar troca as questões e as datas dela.`, sim: 'Regravar' }))) return
    if (publicar && !(await confirmar({
      titulo: `Publicar "${f.titulo.trim()}"?`,
      texto: `${f.total} questões em ${duracaoTexto(f.duracao)}, de ${dataPorExtenso(localParaIso(f.abre))} a ${dataPorExtenso(localParaIso(f.fecha, true))}. As inscrições abrem na hora${f.abertoATodos ? ', para qualquer conta' : ''}.`,
      sim: 'Publicar',
    }))) return
    definirSalvando(publicar ? 'publicar' : 'rascunho'); definirRecado(null)
    try {
      const salva = await snAdminSalvar({
        edicao: codigo, tipo: f.tipo, titulo: f.titulo.trim(), abreEm: localParaIso(f.abre), fechaEm: localParaIso(f.fecha, true),
        duracaoMin: f.duracao, itens: itensParaBanco(itens), publicar,
        descricao: f.descricao.trim(), destaqueInicio: f.destaqueInicio, config: configParaBanco(f.config, f.variante), abertoATodos: f.abertoATodos,
      })
      aoSalvar(salva, publicar)
    } catch (falha) { definirRecado({ texto: `Não foi possível salvar. ${mensagemDeFalha(falha)}`, erro: true }) }
    finally { definirSalvando(null) }
  }

  // Meses que dá para escolher: do atual a um ano à frente (e o da edição aberta).
  const meses = useMemo(() => {
    const inicio = mesPadrao([])
    const lista = Array.from({ length: 13 }, (_, i) => somarMeses(inicio, i))
    if (!lista.includes(f.mes)) lista.unshift(f.mes)
    return lista
  }, [f.mes])
  const mensais = new Set(edicoes.filter((e) => e.tipo === 'mensal').map((e) => e.edicao))

  const porNivel = contarPor([...itens].sort((a, b) => b.nivel - a.nivel), (i) => ROTULO_NIVEL[i.nivel])
  const porAno = contarPor([...itens].sort((a, b) => (b.ano ?? 0) - (a.ano ?? 0)), (i) => (i.ano === null ? 'sem ano' : String(i.ano)))
  const tetoAno = Math.ceil(f.total / 3)
  const sorteadoPorArea = new Map(contarPor(itens, (i) => i.area))
  const linhasCotas = cotasAuto.map((c) => ({ ...c, sua: f.config.cotas?.[c.area] ?? c.alvo, sorteado: sorteadoPorArea.get(c.area) ?? 0, disponivel: disponiveis.get(c.area) ?? 0 }))
  const alvoDe = (area: string) => (cotasValidas && f.config.cotas ? f.config.cotas[area] ?? 0 : cotasAuto.find((c) => c.area === area)?.alvo ?? 0)
  const escala = Math.max(1, ...linhasCotas.map((l) => Math.max(alvoDe(l.area), l.sorteado)))

  return <form className="asn-montagem empilha-2" onSubmit={(e) => { e.preventDefault(); void salvar(false) }} noValidate>
    <section className="asn-montagem__topo">
      <button type="button" className="botao botao--vinculo asn-voltar" onClick={aoVoltar}><Icone nome="esquerda" tamanho={18} /> Edições</button>
      <p className="asn-sobretitulo">{base ? (base.publicado ? 'Editar a montagem publicada' : 'Continuar o rascunho') : 'Nova edição'}</p>
      <h2>{f.titulo.trim() || tituloPadrao(f)}</h2>
      <p className="asn-montagem__resumo"><code className="asn-codigo">{codigo}</code> · {f.total} questões · {duracaoTexto(f.duracao)} · {itens.length === f.total ? 'sorteio pronto' : 'sorteio incompleto'}{repetidas ? ` · ${repetidas} já usadas antes` : ''}</p>
    </section>

    {sobrescreve && !comParticipantes && <p className="adm-alerta" role="status">Já existe uma edição {codigo} ({existente!.publicado ? 'publicada' : 'rascunho'}). Salvar regrava as questões dela.</p>}
    {comParticipantes && <p className="adm-alerta" role="alert">{existente!.titulo} já tem participantes: a prova não muda mais. Só dá para mudar título, descrição, destaque e estender o prazo, na tela da edição.</p>}
    {salvos && salvos.faltando.length > 0 && <p className="adm-alerta" role="status">{salvos.faltando.length} questão(ões) salvas não são mais elegíveis ({salvos.faltando.join(', ')}). Sorteie de novo ou troque antes de publicar.</p>}

    <Passo n={1} id="asn-p1" titulo="Identificação" ajuda="O mês, o tipo, o texto da página e as datas. As datas são no horário de Brasília.">
      <div className="asn-grade">
        <div className="campo">
          <span className="campo__rotulo" id="asn-rotulo-tipo">Tipo</span>
          <span className="asn-segmentos" role="radiogroup" aria-labelledby="asn-rotulo-tipo">
            {(['mensal', 'vespera'] as const).map((t) => <button key={t} type="button" role="radio" aria-checked={f.tipo === t} disabled={!!base} className="asn-segmento" onClick={() => mudarIdentificacao({ tipo: t })}>{t === 'mensal' ? 'Mensal' : 'Véspera'}</button>)}
          </span>
        </div>
        {f.tipo === 'mensal' ? <label className="campo">
          <span className="campo__rotulo">Mês</span>
          <select className="entrada" value={f.mes} disabled={!!base} onChange={(e) => mudarIdentificacao({ mes: e.target.value })}>
            {meses.map((m) => <option key={m} value={m}>{maiuscula(nomeDoMes(m))}{mensais.has(m) && m !== base?.edicao ? ' (já existe)' : ''}</option>)}
          </select>
        </label> : <>
          <label className="campo">
            <span className="campo__rotulo">Dia da prova</span>
            <input className="entrada" type="date" value={f.dataProva} disabled={!!base} onChange={(e) => mudarIdentificacao({ dataProva: e.target.value })} />
          </label>
          <label className="campo">
            <span className="campo__rotulo">Nome curto da prova</span>
            <input className="entrada" value={f.slug} disabled={!!base} maxLength={40} onChange={(e) => mudar({ slug: e.target.value })} placeholder="teot" />
            <span className="campo__auxilio">Vira o código: <code>{codigo}</code></span>
          </label>
        </>}
      </div>
      <label className="campo">
        <span className="campo__rotulo">Título</span>
        <input className="entrada" value={f.titulo} maxLength={120} onChange={(e) => mudar({ titulo: e.target.value })} />
      </label>
      <label className="campo">
        <span className="campo__rotulo">Descrição (aparece no topo da página)</span>
        <textarea className="entrada asn-textarea" rows={3} maxLength={600} value={f.descricao} onChange={(e) => mudar({ descricao: e.target.value })} placeholder="Ex.: a edição de lançamento, aberta a todas as contas. Uma semana para caber na rotina de plantão." />
        <span className="campo__auxilio">{f.descricao.length}/600. Frases curtas; sem descrição, a página mostra só as datas e as regras.</span>
      </label>
      <div className="asn-grade">
        <label className="campo">
          <span className="campo__rotulo">Abre em</span>
          <input className="entrada" type="datetime-local" value={f.abre} onChange={(e) => mudar({ abre: e.target.value })} />
        </label>
        <label className="campo">
          <span className="campo__rotulo">Fecha em</span>
          <input className="entrada" type="datetime-local" value={f.fecha} onChange={(e) => mudar({ fecha: e.target.value })} />
        </label>
        <label className="campo">
          <span className="campo__rotulo">Duração (minutos)</span>
          <input className="entrada" type="number" inputMode="numeric" min={10} max={360} step={10} value={f.duracao} onChange={(e) => mudar({ duracao: Number(e.target.value) })} />
          <span className="campo__auxilio">{duracaoTexto(f.duracao)} a partir do momento em que a pessoa começa.</span>
        </label>
      </div>
      <fieldset className="asn-campo-grupo">
        <legend className="campo__rotulo">Número de questões</legend>
        <div className="asn-segmentos">
          {TAMANHOS.map((n) => <button key={n} type="button" className="asn-segmento" aria-pressed={!tamanhoLivre && f.total === n} onClick={() => { definirTamanhoLivre(false); mudar({ total: n }) }}>{n}</button>)}
          <button type="button" className="asn-segmento" aria-pressed={tamanhoLivre} onClick={() => definirTamanhoLivre(true)}>Outro</button>
          {tamanhoLivre && <input className="entrada asn-numero" type="number" inputMode="numeric" min={MIN_QUESTOES} max={MAX_QUESTOES} value={f.total} aria-label="Número de questões (10 a 200)" onChange={(e) => mudar({ total: Math.round(Number(e.target.value)) })} />}
        </div>
      </fieldset>
      <div className="asn-chaves">
        <label className="caixa"><input type="checkbox" checked={f.abertoATodos} onChange={(e) => mudar({ abertoATodos: e.target.checked })} /><span><strong>Aberto a todos</strong> · qualquer conta grátis faz a prova e entra no ranking</span></label>
        <label className="caixa"><input type="checkbox" checked={f.destaqueInicio} onChange={(e) => mudar({ destaqueInicio: e.target.checked })} /><span><strong>Mostrar na página inicial</strong> · o cartão do Início chama para a prova (aberta ou abrindo em até 7 dias)</span></label>
      </div>
    </Passo>

    <Passo n={2} id="asn-p2" titulo="Configuração do sorteio" ajuda="O que entra e quanto cada área pesa. A prévia abaixo refaz o sorteio na hora.">
      <fieldset className="asn-campo-grupo">
        <legend className="campo__rotulo">Provas que entram</legend>
        <div className="asn-chaves asn-chaves--linha">
          {PROVAS.map(([p, rotulo]) => <label key={p} className="caixa"><input type="checkbox" checked={f.config.provas.includes(p)} onChange={(e) => mudarConfig({ provas: e.target.checked ? [...f.config.provas, p] : f.config.provas.filter((x) => x !== p), cotas: null })} /><span>{rotulo}</span></label>)}
        </div>
        <span className="campo__auxilio">{filtradas.length} questões elegíveis (sem anuladas, cópias, autorais e figura pendente).</span>
      </fieldset>
      <div className="asn-grade">
        <label className="campo">
          <span className="campo__rotulo">Peso das provas recentes</span>
          <input className="entrada" type="number" inputMode="decimal" min={1} max={5} step={0.5} value={f.config.pesoRecentes} onChange={(e) => mudarConfig({ pesoRecentes: Math.max(1, Number(e.target.value) || 1) })} />
          <span className="campo__auxilio">As demais pesam 1.</span>
        </label>
        <label className="campo">
          <span className="campo__rotulo">Contam como recentes os últimos</span>
          <span className="asn-unidade"><input className="entrada" type="number" inputMode="numeric" min={1} max={20} value={f.config.anosRecentes} onChange={(e) => mudarConfig({ anosRecentes: Math.min(20, Math.max(1, Math.round(Number(e.target.value)) || 1)) })} /><span>anos</span></span>
        </label>
        <label className="campo">
          <span className="campo__rotulo">Assuntos que mais caem (níveis 3 e 4): <b className="asn-num">{f.config.nivelAltoPct}%</b></span>
          <input className="asn-faixa" type="range" min={0} max={100} step={5} value={f.config.nivelAltoPct} onChange={(e) => mudarConfig({ nivelAltoPct: Number(e.target.value) })} />
          <span className="campo__auxilio">Dentro de cada área. O resto se espalha pelos outros assuntos.</span>
        </label>
      </div>

      <div className="asn-cotas">
        <div className="asn-cotas__cabeca">
          <h4>Cotas por área</h4>
          <p className={'asn-soma' + (conferencia && !conferencia.ok ? ' asn-soma--erro' : ' asn-soma--ok')} aria-live="polite">
            <Icone nome={conferencia && !conferencia.ok ? 'alerta' : 'certo'} tamanho={16} />
            {conferencia ? conferencia.mensagem : `Automático · soma ${cotasAuto.reduce((s, c) => s + c.alvo, 0)} de ${f.total}`}
          </p>
          {f.config.cotas && <button type="button" className="botao botao--fantasma" onClick={() => mudarConfig({ cotas: null })}><Icone nome="reiniciar" tamanho={16} /> Voltar ao automático</button>}
        </div>
        <div className="asn-tabela-rola">
          <table className="asn-tabela">
            <thead><tr><th scope="col">Área</th><th scope="col"><span className="asn-longo">Automático</span><span className="asn-curto" aria-hidden="true">Auto</span></th><th scope="col">Sua cota</th><th scope="col"><span className="asn-longo">Sorteado</span><span className="asn-curto" aria-hidden="true">Saiu</span></th></tr></thead>
            <tbody>
              {linhasCotas.map((l) => <tr key={l.area} className={l.sua !== l.alvo ? 'asn-tabela__mudou' : undefined}>
                <th scope="row">{l.area}<small>{String(Math.round(l.pct * 10) / 10).replace('.', ',')}% · {l.disponivel} no acervo</small></th>
                <td className="asn-num">{l.alvo}</td>
                <td><input className="entrada asn-numero" type="number" inputMode="numeric" min={0} max={l.disponivel} value={l.sua} aria-label={`Cota de ${l.area}`} onChange={(e) => mudarCota(l.area, e.target.value)} /></td>
                <td className={'asn-num' + (l.sorteado !== alvoDe(l.area) ? ' asn-num--difere' : '')}>{l.sorteado}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </Passo>

    <Passo n={3} id="asn-p3" titulo="Prévia do sorteio" ajuda={<>Semente <code>{semente}</code>: o mesmo sorteio sai sempre igual e pode ser conferido. "Sortear de novo" muda só a variante.</>}>
      <div className="asn-previa-acoes">
        <button type="button" className="botao" onClick={() => mudar({ variante: f.variante + 1 })}><Icone nome="reiniciar" tamanho={17} /> Sortear de novo</button>
        {f.variante > 0 && <button type="button" className="botao botao--vinculo" onClick={() => mudar({ variante: 0 })}>Voltar ao sorteio original</button>}
        {trocasValem && Object.keys(trocas.por).length > 0 && <span className="asn-nota">{Object.keys(trocas.por).length} troca(s) feitas. Mudar a configuração desfaz as trocas.</span>}
      </div>

      <figure className="asn-grafico">
        <figcaption>
          <span>Alvo × sorteado por área</span>
          <span className="asn-legenda" aria-hidden="true"><span><i className="asn-legenda__barra" /> Sorteado</span><span><i className="asn-legenda__marca" /> Alvo</span></span>
          <button type="button" className="botao botao--vinculo" aria-pressed={verTabela} onClick={() => definirVerTabela(!verTabela)}>{verTabela ? 'Ver como gráfico' : 'Ver como tabela'}</button>
        </figcaption>
        {verTabela ? <table className="asn-tabela">
          <thead><tr><th scope="col">Área</th><th scope="col">Alvo</th><th scope="col">Sorteado</th></tr></thead>
          <tbody>{linhasCotas.map((l) => <tr key={l.area}><th scope="row">{l.area}</th><td className="asn-num">{alvoDe(l.area)}</td><td className="asn-num">{l.sorteado}</td></tr>)}</tbody>
        </table> : <ul className="asn-barras">
          {linhasCotas.map((l) => {
            const alvo = alvoDe(l.area)
            return <li key={l.area} title={`${l.area}: alvo ${alvo}, sorteado ${l.sorteado}`}>
              <span className="asn-barras__nome">{l.area}</span>
              <span className="asn-barras__trilho" aria-hidden="true">
                <span className="asn-barras__barra" style={{ width: `${(l.sorteado / escala) * 100}%` }} />
                <span className="asn-barras__alvo" style={{ left: `${(alvo / escala) * 100}%` }} />
              </span>
              <span className="asn-barras__valor"><b>{l.sorteado}</b> / {alvo}<span className="so-leitor"> (sorteado / alvo)</span></span>
            </li>
          })}
        </ul>}
      </figure>

      <div className="asn-contagens">
        <div><h4>Por nível de incidência</h4><ul className="asn-fichas">{porNivel.map(([n, q]) => <li key={n}><span>{n}</span><b>{q}</b></li>)}</ul></div>
        <div><h4>Por ano <small>(máximo {tetoAno} do mesmo ano)</small></h4><ul className="asn-fichas">{porAno.map(([a, q]) => <li key={a} className={q > tetoAno ? 'asn-fichas--alerta' : undefined}><span>{a}</span><b>{q}</b></li>)}</ul></div>
      </div>

      <ListaQuestoes itens={itens} enunciados={acervo.enunciados} usadas={usadas} aoTrocar={trocar} />
    </Passo>

    <Passo n={4} id="asn-p4" titulo="Prévia da página" ajuda="Como o topo de /simulado-nacional vai aparecer para quem chega.">
      <PreviaPagina f={f} />
    </Passo>

    <Passo n={5} id="asn-p5" titulo="Salvar" ajuda="O rascunho fica só no painel. Publicar põe a edição no site e abre as inscrições na hora.">
      <Aviso recado={recado} aoFechar={() => definirRecado(null)} />
      {problema && !recado && <p className="adm-alerta" role="status">{problema}</p>}
      <div className="asn-salvar">
        <button type="submit" className="botao" disabled={!!salvando || comParticipantes}>{salvando === 'rascunho' ? 'Salvando…' : 'Salvar como rascunho'}</button>
        <button type="button" className="botao botao--principal asn-botao-ouro" disabled={!!salvando || comParticipantes} onClick={() => void salvar(true)}>{salvando === 'publicar' ? 'Publicando…' : base?.publicado ? 'Salvar e manter publicada' : 'Publicar'}</button>
        <button type="button" className="botao botao--fantasma" onClick={aoVoltar}>Descartar</button>
      </div>
    </Passo>
  </form>
}

const PRIMEIRAS = 10

function ListaQuestoes({ itens, enunciados, usadas, aoTrocar, trocando }: { itens: ItemSorteado[]; enunciados: Map<string, string>; usadas: Set<string>; aoTrocar?: (ordem: number) => void; trocando?: number | null }) {
  const [todas, definirTodas] = useState(false)
  const visiveis = todas ? itens : itens.slice(0, PRIMEIRAS)
  return <div className="asn-questoes">
    <h4>As {itens.length} questões, na ordem da prova</h4>
    <ol className="asn-questoes__lista" id="asn-lista-questoes">
      {visiveis.map((i) => <li key={i.ordem} className="asn-questao">
        <span className="asn-questao__ordem">{i.ordem}</span>
        <div className="asn-questao__corpo">
          <p className="asn-questao__meta"><strong>{i.area}</strong>{i.foco && <> · {i.foco}</>}</p>
          <p className="asn-questao__texto">{trechoEnunciado(enunciados.get(i.id)) || <em>Enunciado não carregado</em>}</p>
          <p className="asn-questao__dados">
            <span>{i.prova ?? 'Prova'} · {i.ano ?? 'sem ano'}</span>
            <span>{ROTULO_NIVEL[i.nivel]}</span>
            <span title="Letra no acervo → letra nesta edição">Gabarito {i.gabarito} → <b>{i.gabaritoNovo}</b></span>
            {usadas.has(i.id) && <span className="asn-questao__usada">já usada</span>}
          </p>
        </div>
        <div className="asn-questao__acoes">
          <a className="botao botao--fantasma" href={href(`/questao/${i.id}`)} target="_blank" rel="noopener noreferrer" aria-label={`Abrir a questão ${i.id} numa nova aba`}><Icone nome="link" tamanho={16} /> Abrir</a>
          {aoTrocar && <button type="button" className="botao botao--fantasma" disabled={trocando !== undefined && trocando !== null} onClick={() => aoTrocar(i.ordem)} aria-label={`Trocar a questão ${i.ordem}`}><Icone nome="reiniciar" tamanho={16} /> {trocando === i.ordem ? 'Trocando…' : 'Trocar'}</button>}
        </div>
      </li>)}
    </ol>
    {itens.length > PRIMEIRAS && <button type="button" className="botao asn-ver-todas" aria-expanded={todas} aria-controls="asn-lista-questoes" onClick={() => definirTodas(!todas)}>
      <Icone nome={todas ? 'cima' : 'baixo'} tamanho={17} /> {todas ? `Mostrar só as ${PRIMEIRAS} primeiras` : `Ver as ${itens.length} questões`}
    </button>}
  </div>
}

/** O topo da página, montado com as mesmas regras de texto: quando, o que é, como participar. */
function PreviaPagina({ f }: { f: Pick<FormEdicao, 'tipo' | 'titulo' | 'descricao' | 'abre' | 'fecha' | 'total' | 'duracao' | 'abertoATodos' | 'destaqueInicio'> }) {
  const abre = localParaIso(f.abre), fecha = localParaIso(f.fecha, true)
  return <div className="asn-previa-pagina">
    <div className="asn-heroi" aria-label="Prévia do topo da página">
      <span className="tr-heroi__selo">{f.tipo === 'vespera' ? 'Simulado de véspera' : 'Simulado Nacional'}</span>
      <p className="asn-heroi__titulo">{f.titulo.trim() || 'Sem título'}</p>
      {f.abertoATodos && <span className="asn-heroi__aberto">Aberto a todos · não precisa assinar</span>}
      <dl className="asn-heroi__fatos">
        <div><dt>Quando</dt><dd>De {f.abre ? dataPorExtenso(abre) : '—'} a {f.fecha ? dataPorExtenso(fecha) : '—'} (horário de Brasília)</dd></div>
        <div><dt>O que é</dt><dd>{f.total} questões oficiais do TEOT e do TARO · {duracaoTexto(f.duracao)} · ranking nacional</dd></div>
        <div><dt>Como participar</dt><dd>Inscreva-se agora; no dia, comece a prova</dd></div>
      </dl>
      {f.descricao.trim() && <p className="asn-heroi__descricao">{f.descricao.trim()}</p>}
      <span className="asn-heroi__botao" aria-hidden="true">Quero participar</span>
    </div>
    <p className="asn-nota">{f.destaqueInicio ? 'Também aparece como cartão na página inicial, da semana antes de abrir até fechar.' : 'Não aparece na página inicial.'}{f.abertoATodos ? '' : ' Fazer a prova é para quem assina; quem não assina vê a página e o ranking.'}</p>
  </div>
}

// ---------------------------------------------------------------------------
// 3. A edição publicada: ajustar e acompanhar
// ---------------------------------------------------------------------------

interface PropsEdicao {
  e: EdicaoAdminSN
  edicoes: EdicaoAdminSN[]
  acervo: AcervoNacional
  aoVoltar: () => void
  aoMudar: (e: EdicaoAdminSN) => void
  aoEditarMontagem: () => void
}

function EdicaoPublicada({ e, edicoes, acervo, aoVoltar, aoMudar, aoEditarMontagem }: PropsEdicao) {
  const status = statusEdicao(e)
  const travada = e.participantes > 0
  const aberta = e.publicado && Date.parse(e.abre_em) <= Date.now()
  const { variante } = lerConfig(e.config)
  const semente = sementeDe(e.edicao, variante)
  const { itens: salvos, faltando } = useMemo(() => itensDaEdicao(acervo.candidatas, e.ids, semente), [acervo.candidatas, e.ids, semente])
  const usadas = useMemo(() => idsUsados(edicoes, e.edicao), [edicoes, e.edicao])
  const [saidas, definirSaidas] = useState<string[]>([])
  const [trocando, definirTrocando] = useState<number | null>(null)
  const [ocupado, definirOcupado] = useState<string | null>(null)
  const [recado, definirRecado] = useState<Recado>(null)

  const [texto, definirTexto] = useState({ titulo: e.titulo, descricao: e.descricao ?? '', destaque: e.destaque_inicio, aberto: e.aberto_a_todos })
  const textoMudou = texto.titulo !== e.titulo || texto.descricao !== (e.descricao ?? '') || texto.destaque !== e.destaque_inicio || texto.aberto !== e.aberto_a_todos
  const [datas, definirDatas] = useState({ abre: isoParaLocal(e.abre_em), fecha: isoParaLocal(e.fecha_em) })
  const datasMudaram = datas.abre !== isoParaLocal(e.abre_em) || datas.fecha !== isoParaLocal(e.fecha_em)

  async function rodar(nome: string, acao: () => Promise<EdicaoAdminSN>, ok: string) {
    definirOcupado(nome); definirRecado(null)
    try { const nova = await acao(); aoMudar(nova); definirRecado({ texto: ok, erro: false }) }
    catch (falha) { definirRecado({ texto: mensagemDeFalha(falha), erro: true }) }
    finally { definirOcupado(null) }
  }

  const salvarTexto = () => rodar('texto', () => snAdminConfig(e.edicao, { titulo: texto.titulo.trim(), descricao: texto.descricao.trim(), destaqueInicio: texto.destaque, abertoATodos: texto.aberto }), 'Texto e destaque salvos. A página já mostra a versão nova.')
  const salvarDatas = () => {
    if (datas.fecha.slice(0, 16) <= datas.abre.slice(0, 16)) { definirRecado({ texto: 'O fechamento precisa vir depois da abertura.', erro: true }); return }
    const abreMudou = datas.abre !== isoParaLocal(e.abre_em)
    const fechaMudou = datas.fecha !== isoParaLocal(e.fecha_em)
    return rodar('datas', () => snAdminDatas(e.edicao, abreMudou ? localParaIso(datas.abre) : null, fechaMudou ? localParaIso(datas.fecha, true) : null), 'Datas salvas.')
  }
  async function publicar(publicado: boolean) {
    if (!publicado && !(await confirmar({ titulo: `Despublicar "${e.titulo}"?`, texto: 'A edição sai do site e as inscrições deixam de valer na página. Dá para publicar de novo depois.', sim: 'Despublicar' }))) return
    await rodar('publicar', () => snAdminPublicar(e.edicao, publicado), publicado ? 'Edição publicada.' : 'Edição despublicada: voltou a ser rascunho.')
  }
  async function trocar(ordem: number) {
    const sai = salvos.find((i) => i.ordem === ordem)
    if (!sai) return
    const novo = trocarItem(acervo.candidatas.filter((c) => c.prova === undefined || lerConfig(e.config).config.provas.includes(c.prova)), salvos, ordem, semente, new Set([...saidas, sai.id, ...usadas]))
    if (!novo) { definirRecado({ texto: `Não há outra questão de ${sai.area} para trocar.`, erro: true }); return }
    if (!(await confirmar({ titulo: `Trocar a questão ${ordem}?`, texto: `Sai ${sai.id} (${sai.area}${sai.foco ? ` · ${sai.foco}` : ''}); entra ${novo.id}${novo.foco ? ` (${novo.foco})` : ''}. A troca vale na hora.`, sim: 'Trocar' }))) return
    definirTrocando(ordem)
    try {
      const nova = await snAdminTrocarItem(e.edicao, ordem, itensParaBanco([novo])[0])
      definirSaidas((s) => [...s, sai.id]); aoMudar(nova)
      definirRecado({ texto: `Questão ${ordem} trocada: entrou ${novo.id}.`, erro: false })
    } catch (falha) { definirRecado({ texto: mensagemDeFalha(falha), erro: true }) }
    finally { definirTrocando(null) }
  }

  return <div className="asn-edicao empilha-2">
    <section className="asn-montagem__topo">
      <button type="button" className="botao botao--vinculo asn-voltar" onClick={aoVoltar}><Icone nome="esquerda" tamanho={18} /> Edições</button>
      <div className="asn-cartao__selos"><SeloStatus status={status} /><Selos e={e} /><code className="asn-codigo">{e.edicao}</code></div>
      <h2>{e.titulo}</h2>
      <p className="asn-montagem__resumo">{dataCurta(e.abre_em)} → {dataCurta(e.fecha_em)} · {e.total} questões · {duracaoTexto(e.duracao_min)}</p>
    </section>
    <Aviso recado={recado} aoFechar={() => definirRecado(null)} />

    <Acompanhar e={e} enunciados={acervo.enunciados} />

    <div className="asn-ajustes">
      <section className="asn-passo" aria-labelledby="asn-texto">
        <header className="asn-passo__cabeca"><Icone nome="lapis" tamanho={20} /><div><h3 id="asn-texto">Texto e destaque</h3><p>Muda a qualquer momento, mesmo com participantes.</p></div></header>
        <div className="asn-passo__corpo">
          <label className="campo"><span className="campo__rotulo">Título</span><input className="entrada" value={texto.titulo} maxLength={120} onChange={(ev) => definirTexto({ ...texto, titulo: ev.target.value })} /></label>
          <label className="campo"><span className="campo__rotulo">Descrição</span><textarea className="entrada asn-textarea" rows={3} maxLength={600} value={texto.descricao} onChange={(ev) => definirTexto({ ...texto, descricao: ev.target.value })} /></label>
          <div className="asn-chaves">
            <label className="caixa"><input type="checkbox" checked={texto.aberto} onChange={(ev) => definirTexto({ ...texto, aberto: ev.target.checked })} /><span><strong>Aberto a todos</strong> · qualquer conta faz a prova</span></label>
            <label className="caixa"><input type="checkbox" checked={texto.destaque} onChange={(ev) => definirTexto({ ...texto, destaque: ev.target.checked })} /><span><strong>Mostrar na página inicial</strong></span></label>
          </div>
          <button type="button" className="botao botao--principal" disabled={!textoMudou || !!ocupado || texto.titulo.trim().length < 3} onClick={() => void salvarTexto()}>{ocupado === 'texto' ? 'Salvando…' : 'Salvar texto'}</button>
        </div>
      </section>

      <div className="asn-ajustes__lado">
      <section className="asn-passo" aria-labelledby="asn-datas">
        <header className="asn-passo__cabeca"><Icone nome="calendario" tamanho={20} /><div><h3 id="asn-datas">Datas</h3><p>{aberta ? 'Já abriu: só dá para estender o fechamento.' : 'Antes de abrir, as duas datas mudam livremente.'}</p></div></header>
        <div className="asn-passo__corpo">
          <div className="asn-grade asn-grade--datas">
            <label className="campo"><span className="campo__rotulo">Abre em</span><input className="entrada" type="datetime-local" value={datas.abre} disabled={aberta} onChange={(ev) => definirDatas({ ...datas, abre: ev.target.value })} /></label>
            <label className="campo"><span className="campo__rotulo">Fecha em</span><input className="entrada" type="datetime-local" value={datas.fecha} min={aberta ? isoParaLocal(e.fecha_em) : undefined} onChange={(ev) => definirDatas({ ...datas, fecha: ev.target.value })} /></label>
          </div>
          <button type="button" className="botao" disabled={!datasMudaram || !!ocupado} onClick={() => void salvarDatas()}>{ocupado === 'datas' ? 'Salvando…' : 'Salvar datas'}</button>
        </div>
      </section>

      <section className="asn-passo" aria-labelledby="asn-publicacao">
        <header className="asn-passo__cabeca"><Icone nome="bandeira" tamanho={20} /><div><h3 id="asn-publicacao">Publicação e montagem</h3><p>{travada ? `${e.participantes} pessoa(s) já começaram: a prova não muda mais.` : 'Ninguém começou ainda: dá para despublicar, trocar questões ou refazer a montagem.'}</p></div></header>
        <div className="asn-passo__corpo asn-linha-botoes">
          {e.publicado
            ? <button type="button" className="botao botao--perigo" disabled={travada || !!ocupado} onClick={() => void publicar(false)}>{ocupado === 'publicar' ? 'Despublicando…' : 'Despublicar'}</button>
            : <button type="button" className="botao botao--principal" disabled={!!ocupado} onClick={() => void publicar(true)}>Publicar</button>}
          <button type="button" className="botao" disabled={travada} onClick={aoEditarMontagem}><Icone nome="filtro" tamanho={17} /> Refazer a montagem</button>
        </div>
      </section>
      </div>
    </div>

    <section className="asn-passo" aria-labelledby="asn-questoes-pub">
      <header className="asn-passo__cabeca"><Icone nome="livro" tamanho={20} /><div><h3 id="asn-questoes-pub">Questões da edição</h3><p>{travada ? 'Para conferir. Achou uma com problema? Corrija no editor de questões: a edição usa a questão do acervo.' : 'Trocar põe outra da mesma área (e do mesmo foco, se houver), ainda não usada.'}</p></div></header>
      <div className="asn-passo__corpo">
        {faltando.length > 0 && <p className="adm-alerta" role="status">{faltando.length} questão(ões) desta edição não estão mais entre as elegíveis do acervo: {faltando.join(', ')}.</p>}
        <ListaQuestoes itens={salvos} enunciados={acervo.enunciados} usadas={new Set()} aoTrocar={travada ? undefined : (o) => void trocar(o)} trocando={trocando} />
      </div>
    </section>
  </div>
}

/** Acompanhar: inscritos, participantes, entregas no prazo, média, por área e as questões que mais erraram. */
function Acompanhar({ e, enunciados }: { e: EdicaoAdminSN; enunciados: Map<string, string> }) {
  const [dados, definirDados] = useState<EstatisticasSN | null>(null)
  const [erro, definirErro] = useState('')
  const [carregando, definirCarregando] = useState(false)
  const carregar = useCallback(async () => {
    definirCarregando(true)
    try { definirDados(await snAdminEstatisticas(e.edicao)); definirErro('') }
    catch (f) { definirErro(mensagemDeFalha(f)) }
    finally { definirCarregando(false) }
  }, [e.edicao])
  useEffect(() => { void carregar() }, [carregar])

  const areas = dados ? [...dados.por_area].sort((a, b) => (b.media ?? 0) - (a.media ?? 0)) : []
  return <section className="asn-acompanhar" aria-labelledby="asn-acomp">
    <header className="asn-acompanhar__cabeca">
      <div><p className="asn-sobretitulo">Acompanhar</p><h3 id="asn-acomp">Como a edição está indo</h3></div>
      <button type="button" className="botao botao--fantasma" disabled={carregando} onClick={() => void carregar()}><Icone nome="reiniciar" tamanho={16} /> {carregando ? 'Atualizando…' : 'Atualizar'}</button>
    </header>
    {erro && <p role="alert" className="adm-alerta">{erro}</p>}
    {!dados && !erro && <p role="status" className="asn-carregando">Contando as participações…</p>}
    {dados && <>
      <dl className="asn-placar">
        <div><dt>Inscritos</dt><dd>{dados.inscritos}</dd></div>
        <div><dt>Começaram</dt><dd>{dados.participantes}</dd></div>
        <div><dt>Entregas no prazo</dt><dd>{dados.no_tempo}<small> de {dados.entregas}</small></dd></div>
        <div><dt>Média de acerto</dt><dd>{media(dados.media)}</dd></div>
      </dl>
      {dados.entregas === 0 ? <p className="asn-nota">Ninguém entregou ainda. As médias por área e as questões que mais erraram aparecem com as primeiras entregas.</p> : <div className="asn-acompanhar__grade">
        <figure className="asn-grafico">
          <figcaption><span>Acerto médio por área (entregas no prazo)</span></figcaption>
          <ul className="asn-barras asn-barras--pct">
            {areas.map((a) => <li key={a.area} title={`${a.area}: ${media(a.media)} (${a.certas} de ${a.total})`}>
              <span className="asn-barras__nome">{a.area}</span>
              <span className="asn-barras__trilho" aria-hidden="true"><span className="asn-barras__barra" style={{ width: `${a.media ?? 0}%` }} /></span>
              <span className="asn-barras__valor"><b>{media(a.media)}</b></span>
            </li>)}
          </ul>
        </figure>
        <div className="asn-erradas">
          <h4>Questões que mais erraram</h4>
          <p className="asn-nota">Boa para os posts e para achar questão com problema (gabarito discutível, figura ruim).</p>
          <ol className="asn-erradas__lista">
            {dados.mais_erradas.map((q) => <li key={q.id_questao}>
              <span className="asn-questao__ordem">{q.ordem}</span>
              <div>
                <a href={href(`/questao/${q.id_questao}`)} target="_blank" rel="noopener noreferrer">{q.id_questao}</a>
                <p>{trechoEnunciado(enunciados.get(q.id_questao), 90)}</p>
              </div>
              <span className="asn-erradas__taxa"><span><b>{q.erros}</b> de {q.total}</span><small>{q.total ? `${Math.round((q.erros / q.total) * 100)}% erraram` : ''}</small></span>
            </li>)}
          </ol>
        </div>
      </div>}
    </>}
  </section>
}
