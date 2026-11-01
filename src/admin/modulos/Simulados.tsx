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
} from '../../componentes/admin/montagemSimulado'
import { href } from '../../util/rotas'
import { defParte } from '../rotas'
import { Icone } from '../ui/Icone'
import { inteiro } from '../ui/formato'
import { Cabeca, Carregando, Estado, Faixa, Interruptor, Painel, Segmento, Selo, Situacao } from '../ui/kit'
import { avisoRapido, confirmar } from '../ui/sobreposicoes'
import { Tabela } from '../ui/tabela'

/*
 * Estudo › Simulados: o Simulado Nacional 2.0 (docs/superpowers/specs/2026-10-19-simulado-nacional-contrato.md).
 * Calendário das edições → montagem (identificação, sorteio, prévia, revisão) → edição publicada (acompanhar e ajustar).
 * As regras de sorteio, cotas, trava por participantes e publicação são as de montagemSimulado.ts e da API, sem mudança.
 */

interface AcervoNacional { candidatas: CandidataNacional[]; enunciados: Map<string, string> }
let promessaAcervo: Promise<AcervoNacional> | null = null
function carregarAcervoNacional(): Promise<AcervoNacional> {
  promessaAcervo ??= (async () => {
    const indice = await carregarIndice()
    const provaveis = indice.questoes.filter(q => !q.dup && q.an !== 1 && q.sim !== 1 && q.p !== null && PROVAS_NACIONAL.has(indice.provas[q.p]))
    const questoes = await carregarQuestoes(indice, provaveis.map(q => q.id))
    const porId = new Map(questoes.map(q => [q.id, q]))
    // Anulada ou com figura pendente: sem gabarito, fica de fora.
    const valida = (id: string) => { const q = porId.get(id); return q && !q.anulada && !q.figuraPendente && q.tipo !== 'dissertativa' ? q : undefined }
    const candidatas = candidatasDoIndice(indice, id => valida(id)?.gabarito ?? undefined, id => valida(id)?.alternativas.length)
    return { candidatas, enunciados: new Map(questoes.map(q => [q.id, q.enunciado])) }
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
    carregarAcervoNacional().then(a => { if (vivo) definirAcervo(a) }, () => { if (vivo) definirFalhou(true) })
    return () => { vivo = false }
  }, [ativo, acervo])
  return { acervo, falhou }
}

const duracaoTexto = (min: number) => (min % 60 === 0 ? `${min / 60} ${min === 60 ? 'hora' : 'horas'}` : `${min} minutos`)
const media = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${String(Math.round(v * 10) / 10).replace('.', ',')}%`)
const maiuscula = (t: string) => t.replace(/^./, c => c.toUpperCase())
const TOM_STATUS: Record<StatusEdicao, 'ok' | 'aviso' | 'erro' | 'neutro' | 'vivo'> = { rascunho: 'neutro', agendada: 'aviso', inscricoes: 'ok', 'no-ar': 'vivo', encerrada: 'neutro' }
const Status = ({ s }: { s: StatusEdicao }) => <Situacao tom={TOM_STATUS[s]}>{ROTULO_STATUS[s]}</Situacao>
const Tipo = ({ e }: { e: Pick<EdicaoAdminSN, 'tipo' | 'aberto_a_todos'> }) => <>{e.tipo === 'vespera' ? <Selo tom="acento">Véspera</Selo> : <Selo contorno>Mensal</Selo>}{e.aberto_a_todos && <Selo tom="ok">Aberto a todos</Selo>}</>

type Vista = { tipo: 'lista' } | { tipo: 'montar'; base: EdicaoAdminSN | null; mes?: string } | { tipo: 'edicao'; edicao: string }

export default function Simulados() {
  const [edicoes, definirEdicoes] = useState<EdicaoAdminSN[] | null>(null)
  const [erro, definirErro] = useState('')
  const [vista, definirVista] = useState<Vista>({ tipo: 'lista' })
  const { acervo, falhou } = usarAcervo(vista.tipo !== 'lista')
  const parte = defParte('simulados')
  const carregar = useCallback(async () => {
    try { definirEdicoes((await snAdminListar()).filter(e => ehEdicaoNova(e.edicao))); definirErro('') } catch (f) { definirErro(mensagemDeFalha(f)) }
  }, [])
  useEffect(() => { void carregar() }, [carregar])
  const ir = (v: Vista) => { definirVista(v); document.querySelector('.a3-conteudo')?.scrollTo?.({ top: 0 }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const atualizar = (nova: EdicaoAdminSN) => definirEdicoes(lista => [nova, ...(lista ?? []).filter(e => e.edicao !== nova.edicao)].sort((a, b) => b.abre_em.localeCompare(a.abre_em) || b.edicao.localeCompare(a.edicao)))

  if (erro && !edicoes) return <div className="a3-pilha a3-pilha--larga"><Cabeca area="Estudo e conteúdo" titulo={parte.rotulo} pergunta={parte.pergunta} />
    <Estado tipo="erro" titulo="As edições não carregaram" texto={erro} acao={<button type="button" className="a3-botao" onClick={() => void carregar()}>Tentar de novo</button>} /></div>
  if (!edicoes) return <Carregando linhas={6} texto="Carregando as edições…" />
  const aberta = vista.tipo === 'edicao' ? edicoes.find(e => e.edicao === vista.edicao) ?? null : null

  if (vista.tipo !== 'lista' && !acervo) return <div className="a3-pilha a3-pilha--larga">
    <button type="button" className="a3-botao a3-botao--fantasma a3-voltar" onClick={() => ir({ tipo: 'lista' })}><Icone nome="esquerda" tamanho={15} />Edições</button>
    {falhou ? <Estado tipo="erro" titulo="O acervo não carregou" texto="Índice ou arquivos dos temas. Atualize a página e tente de novo." /> : <Carregando linhas={6} texto="Lendo o acervo: gabaritos, alternativas e focos das questões oficiais…" />}
  </div>
  if (vista.tipo === 'montar' && acervo) return <Montagem key={vista.base?.edicao ?? vista.mes ?? 'nova'} edicoes={edicoes} base={vista.base} mesInicial={vista.mes} acervo={acervo}
    aoVoltar={() => ir({ tipo: 'lista' })}
    aoSalvar={(nova, publicou) => { atualizar(nova); avisoRapido(publicou ? `${nova.titulo} publicada. As inscrições já estão abertas.` : `Rascunho de ${nova.titulo} salvo. Ainda não aparece no site.`); ir(publicou ? { tipo: 'edicao', edicao: nova.edicao } : { tipo: 'lista' }) }} />
  if (vista.tipo === 'edicao' && acervo && aberta) return <EdicaoPublicada e={aberta} edicoes={edicoes} acervo={acervo} aoVoltar={() => ir({ tipo: 'lista' })} aoMudar={atualizar} aoEditarMontagem={() => ir({ tipo: 'montar', base: aberta })} />
  return <Lista edicoes={edicoes} aoMontar={mes => ir({ tipo: 'montar', base: null, mes })} aoAbrir={e => ir(e.publicado ? { tipo: 'edicao', edicao: e.edicao } : { tipo: 'montar', base: e })} />
}

/* ───────────── 1. Calendário das edições ───────────── */

function Lista({ edicoes, aoMontar, aoAbrir }: { edicoes: EdicaoAdminSN[]; aoMontar: (mes?: string) => void; aoAbrir: (e: EdicaoAdminSN) => void }) {
  const parte = defParte('simulados')
  const atrasada = mensalAtrasada(edicoes)
  const rascunhoAtrasada = atrasada ? edicoes.find(e => e.edicao === atrasada) : undefined
  const sugerido = mesPadrao(edicoes)
  const agora = Date.now()
  // Doze meses a partir de 3 atrás: cada mês mostra a mensal (ou o vazio) e as vésperas que abrem nele.
  const meses = useMemo(() => Array.from({ length: 12 }, (_, i) => somarMeses(somarMeses(mesPadrao([]), -3), i)), [])
  const doMes = (m: string) => edicoes.filter(e => e.tipo === 'mensal' ? e.edicao === m : e.abre_em.slice(0, 7) === m)
  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Estudo e conteúdo" titulo={parte.rotulo} pergunta="Uma prova por mês com as questões oficiais do TEOT e do TARO, a mesma para todo o país, e o simulado de véspera quando a prova chega."
      acoes={<><button type="button" className="a3-botao" onClick={() => aoMontar(sugerido)}><Icone nome="lapis" tamanho={15} />Montar {nomeDoMes(sugerido).replace(/ de \d+$/, '')}</button>
        <button type="button" className="a3-botao a3-botao--contorno" onClick={() => aoMontar()}>Outra edição ou véspera</button></>} />
    {atrasada && <Faixa tom="aviso" titulo={`A edição de ${nomeDoMes(atrasada)} ainda não está pronta`}
      acao={<button type="button" className="a3-botao a3-botao--pequeno" onClick={() => rascunhoAtrasada ? aoAbrir(rascunhoAtrasada) : aoMontar(atrasada)}>Montar agora</button>}>
      {rascunhoAtrasada ? 'Tem um rascunho salvo: falta conferir e publicar.' : 'O mês vira em poucos dias e a página promete a próxima edição.'}
    </Faixa>}

    <section className="a3-painel" aria-label="Calendário de edições">
      <div className="a3-painel__cabeca"><h2 className="a3-titulo-3">Calendário</h2><span className="a3-mudo a3-pequeno">3 meses atrás a 8 à frente</span></div>
      <ol className="a3-calendario">{meses.map(m => {
        const lista = doMes(m), mensal = lista.find(e => e.tipo === 'mensal')
        const passado = m < mesPadrao([])
        return <li key={m} className={'a3-calendario__mes' + (m === sugerido ? ' sugerido' : '') + (passado ? ' passado' : '')}>
          <span className="a3-calendario__nome">{maiuscula(nomeDoMes(m).replace(/ de (\d+)$/, ' $1'))}</span>
          {lista.length ? lista.map(e => { const s = statusEdicao(e, agora); return <button key={e.edicao} type="button" className={`a3-calendario__edicao s-${s}`} onClick={() => aoAbrir(e)}>
            <span className="a3-nome">{e.tipo === 'vespera' ? 'Véspera · ' : ''}{e.titulo}</span>
            <span className="a3-sub">{ROTULO_STATUS[s]} · {e.inscritos} inscritos</span>
          </button> }) : null}
          {!mensal && !passado && <button type="button" className="a3-calendario__vazio" onClick={() => aoMontar(m)}><Icone nome="mais" tamanho={14} />Montar mensal</button>}
          {!mensal && passado && !lista.length && <span className="a3-mudo a3-pequeno">sem edição</span>}
        </li>
      })}</ol>
    </section>

    <Painel justo titulo="Todas as edições" descricao="A mais nova no alto. As edições antigas (antes da versão 2.0) não aparecem aqui.">
      <Tabela rotulo="Edições" linhas={edicoes} chave={e => e.edicao} porPagina={20} aoAbrir={aoAbrir}
        vazio={<div style={{ padding: 20 }}><Estado icone="calendario" titulo="Nenhuma edição nova ainda" texto={`Comece por ${nomeDoMes(sugerido)}: o painel sugere as datas, sorteia as questões e mostra a prévia antes de publicar.`} /></div>}
        colunas={[
          { id: 'e', titulo: 'Edição', celula: e => <span style={{ display: 'grid', gap: 4 }}><span className="a3-nome">{e.titulo}</span><span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}><Tipo e={e} /><code className="a3-codigo">{e.edicao}</code></span></span> },
          { id: 's', titulo: 'Situação', rotuloCelular: 'Situação', celula: e => <Status s={statusEdicao(e, agora)} /> },
          { id: 'd', titulo: 'Quando', soLargo: true, celula: e => <span>{dataCurta(e.abre_em)} → {dataCurta(e.fecha_em)}<span className="a3-sub">{e.total} questões · {duracaoTexto(e.duracao_min)}</span></span> },
          { id: 'i', titulo: 'Inscritos', numero: true, rotuloCelular: 'Inscritos', ordem: e => e.inscritos, celula: e => inteiro(e.inscritos) },
          { id: 'p', titulo: 'Começaram', numero: true, soLargo: true, ordem: e => e.participantes, celula: e => inteiro(e.participantes) },
          { id: 'n', titulo: 'Entregas', numero: true, rotuloCelular: 'Entregas', ordem: e => e.entregas, celula: e => inteiro(e.entregas) },
          { id: 'm', titulo: 'Média', numero: true, rotuloCelular: 'Média', ordem: e => e.media ?? -1, celula: e => media(e.media) },
        ]} />
    </Painel>
  </div>
}

/* ───────────── 2. Montagem ───────────── */

const PROVAS: Array<[string, string]> = [['TEOT', 'TEOT'], ['TARO', 'TARO'], ['Ortopedia', 'Ortopedia (origem não confirmada)']]
const ROTULO_NIVEL = ['Sem classificação', 'Nível 1', 'Nível 2', 'Nível 3', 'Nível 4']

function Etapa({ n, id, titulo, ajuda, children }: { n: number; id: string; titulo: string; ajuda?: ReactNode; children: ReactNode }) {
  return <section className="a3-painel a3-editor__bloco" aria-labelledby={id} id={`${id}-secao`}>
    <div><h3 id={id} className="a3-editor__titulo"><span>{n}</span>{titulo}</h3>{ajuda && <p className="a3-mudo a3-pequeno" style={{ marginTop: 6 }}>{ajuda}</p>}</div>
    {children}
  </section>
}

function Montagem({ edicoes, base, mesInicial, acervo, aoVoltar, aoSalvar }: { edicoes: EdicaoAdminSN[]; base: EdicaoAdminSN | null; mesInicial?: string; acervo: AcervoNacional; aoVoltar: () => void; aoSalvar: (e: EdicaoAdminSN, publicou: boolean) => void }) {
  const [f, definirF] = useState<FormEdicao>(() => base ? formularioDaEdicao(base) : formularioPadrao(mesInicial ?? mesPadrao(edicoes)))
  const [tamanhoLivre, definirTamanhoLivre] = useState(() => !TAMANHOS.includes(f.total as typeof TAMANHOS[number]))
  const [salvando, definirSalvando] = useState<'rascunho' | 'publicar' | null>(null)
  const [verTabela, definirVerTabela] = useState(false)
  const mudar = (patch: Partial<FormEdicao>) => definirF(a => ({ ...a, ...patch }))
  const mudarConfig = (patch: Partial<ConfigSorteio>) => definirF(a => ({ ...a, config: { ...a.config, ...patch } }))
  /** Mês, tipo ou dia da prova mudaram: título, datas e "aberto a todos" seguem o padrão se ninguém mexeu neles. */
  const mudarIdentificacao = (patch: Partial<Pick<FormEdicao, 'mes' | 'tipo' | 'dataProva'>>) => definirF(antes => {
    const depois = { ...antes, ...patch }
    const padraoAntes = formularioPadrao(antes.mes, antes.tipo, antes.dataProva), padraoDepois = formularioPadrao(depois.mes, depois.tipo, depois.dataProva)
    const dAntes = datasPadrao(antes)
    if (antes.abre === dAntes.abre && antes.fecha === dAntes.fecha) Object.assign(depois, datasPadrao(depois))
    if (antes.titulo === tituloPadrao(antes)) depois.titulo = tituloPadrao(depois)
    if (antes.abertoATodos === padraoAntes.abertoATodos) depois.abertoATodos = padraoDepois.abertoATodos
    if (patch.tipo === 'vespera' && !antes.slug) depois.slug = 'prova'
    return depois
  })

  const codigo = codigoEdicao(f)
  const existente = edicoes.find(e => e.edicao === codigo) ?? null
  const comParticipantes = !!existente && existente.participantes > 0
  const sobrescreve = !!existente && existente.edicao !== base?.edicao
  const semente = sementeDe(codigo, f.variante)
  const provas = useMemo(() => new Set(f.config.provas), [f.config.provas])
  const filtradas = useMemo(() => acervo.candidatas.filter(c => c.prova === undefined || provas.has(c.prova)), [acervo.candidatas, provas])
  const disponiveis = useMemo(() => new Map(contarPor(filtradas, c => c.area)), [filtradas])
  const usadas = useMemo(() => idsUsados(edicoes, codigo), [edicoes, codigo])
  const opcoesPeso = { pesoRecentes: f.config.pesoRecentes, anosRecentes: f.config.anosRecentes }
  const cotasAuto = useMemo(() => cotasPorArea(filtradas, f.total, opcoesPeso),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtradas, f.total, f.config.pesoRecentes, f.config.anosRecentes])
  const conferencia = f.config.cotas ? conferirCotas(f.config.cotas, f.total, disponiveis) : null
  const cotasValidas = !conferencia || conferencia.ok
  // O sorteio é refeito ao vivo; ao abrir um rascunho valem os itens salvos até mexer na configuração.
  const chave = JSON.stringify([semente, f.total, f.config, filtradas.length, cotasValidas])
  const [salvos] = useState(() => base ? { chave, ...itensDaEdicao(acervo.candidatas, base.ids, sementeDe(base.edicao, lerConfig(base.config).variante)) } : null)
  const sorteado = useMemo(() => (salvos && salvos.chave === chave && salvos.itens.length) ? salvos.itens : sortearEdicao(filtradas, semente, {
    total: f.total, usadas, nivelAltoPct: f.config.nivelAltoPct, cotas: cotasValidas ? f.config.cotas : null, ...opcoesPeso,
  }), // eslint-disable-next-line react-hooks/exhaustive-deps
  [chave, salvos, usadas])
  const [trocas, definirTrocas] = useState<{ chave: string; por: Record<number, ItemSorteado>; saidas: string[] }>({ chave, por: {}, saidas: [] })
  const trocasValem = trocas.chave === chave
  const itens = useMemo(() => sorteado.map(i => (trocasValem ? trocas.por[i.ordem] : undefined) ?? i), [sorteado, trocas, trocasValem])
  const repetidas = itens.filter(i => usadas.has(i.id)).length

  function trocar(ordem: number) {
    const sai = itens.find(i => i.ordem === ordem)
    if (!sai) return
    const saidas = trocasValem ? trocas.saidas : []
    const novo = trocarItem(filtradas, itens, ordem, semente, new Set([...saidas, sai.id, ...usadas]))
    if (!novo) { avisoRapido(`Não há outra questão de ${sai.area} para trocar.`, 'erro'); return }
    definirTrocas({ chave, por: { ...(trocasValem ? trocas.por : {}), [ordem]: novo }, saidas: [...saidas, sai.id] })
    avisoRapido(`Questão ${ordem} trocada: saiu ${sai.id}, entrou ${novo.id}${novo.foco && novo.foco === sai.foco ? ' (mesmo foco)' : ''}.`)
  }
  function mudarCota(area: string, valor: string) {
    const atuais = f.config.cotas ?? Object.fromEntries(cotasAuto.map(c => [c.area, c.alvo]))
    mudarConfig({ cotas: { ...atuais, [area]: valor === '' ? 0 : Number(valor) } })
  }
  const problema = conferirFormulario(f)
    ?? (!cotasValidas ? `As cotas por área não fecham: ${conferencia!.mensagem}` : null)
    ?? (itens.length !== f.total ? `O acervo só tem ${itens.length} questões elegíveis com essas provas; diminua o número de questões ou marque mais provas.` : null)
    ?? (comParticipantes ? `${existente!.titulo} já tem participantes: a prova não muda mais. Abra a edição para ajustar texto, destaque e prazo.` : null)

  async function salvar(publicar: boolean) {
    if (problema) { avisoRapido(problema, 'erro'); return }
    if (sobrescreve && !(await confirmar({ titulo: `Regravar ${codigo}?`, texto: `Já existe a edição "${existente!.titulo}" com esse código. Salvar troca as questões e as datas dela.`, sim: 'Regravar', perigo: true }))) return
    if (publicar && !(await confirmar({ titulo: `Publicar "${f.titulo.trim()}"?`, texto: `${f.total} questões em ${duracaoTexto(f.duracao)}, de ${dataPorExtenso(localParaIso(f.abre))} a ${dataPorExtenso(localParaIso(f.fecha, true))}. As inscrições abrem na hora${f.abertoATodos ? ', para qualquer conta' : ''}.`, sim: 'Publicar' }))) return
    definirSalvando(publicar ? 'publicar' : 'rascunho')
    try {
      const salva = await snAdminSalvar({
        edicao: codigo, tipo: f.tipo, titulo: f.titulo.trim(), abreEm: localParaIso(f.abre), fechaEm: localParaIso(f.fecha, true),
        duracaoMin: f.duracao, itens: itensParaBanco(itens), publicar,
        descricao: f.descricao.trim(), destaqueInicio: f.destaqueInicio, config: configParaBanco(f.config, f.variante), abertoATodos: f.abertoATodos,
      })
      aoSalvar(salva, publicar)
    } catch (falha) { avisoRapido(`Não foi possível salvar. ${mensagemDeFalha(falha)}`, 'erro') } finally { definirSalvando(null) }
  }

  const meses = useMemo(() => { const ini = mesPadrao([]); const l = Array.from({ length: 13 }, (_, i) => somarMeses(ini, i)); if (!l.includes(f.mes)) l.unshift(f.mes); return l }, [f.mes])
  const mensais = new Set(edicoes.filter(e => e.tipo === 'mensal').map(e => e.edicao))
  const porNivel = contarPor([...itens].sort((a, b) => b.nivel - a.nivel), i => ROTULO_NIVEL[i.nivel])
  const porAno = contarPor([...itens].sort((a, b) => (b.ano ?? 0) - (a.ano ?? 0)), i => (i.ano === null ? 'sem ano' : String(i.ano)))
  const tetoAno = Math.ceil(f.total / 3)
  const sorteadoPorArea = new Map(contarPor(itens, i => i.area))
  const linhasCotas = cotasAuto.map(c => ({ ...c, sua: f.config.cotas?.[c.area] ?? c.alvo, sorteado: sorteadoPorArea.get(c.area) ?? 0, disponivel: disponiveis.get(c.area) ?? 0 }))
  const alvoDe = (area: string) => (cotasValidas && f.config.cotas ? f.config.cotas[area] ?? 0 : cotasAuto.find(c => c.area === area)?.alvo ?? 0)
  const escala = Math.max(1, ...linhasCotas.map(l => Math.max(alvoDe(l.area), l.sorteado)))
  const checagens: Array<[boolean, string]> = [
    [!conferirFormulario(f), conferirFormulario(f) ?? 'Identificação e datas'],
    [cotasValidas, cotasValidas ? 'Cotas por área fecham' : 'Cotas por área não fecham'],
    [itens.length === f.total, itens.length === f.total ? `${f.total} questões sorteadas` : `Só ${itens.length} de ${f.total} elegíveis`],
    [!comParticipantes, comParticipantes ? 'Já tem participantes: trava' : 'Ninguém começou: pode mudar'],
    [!porAno.some(([, q]) => q > tetoAno), `No máximo ${tetoAno} do mesmo ano`],
  ]

  return <div className="a3-pilha a3-pilha--larga">
    <button type="button" className="a3-botao a3-botao--fantasma a3-voltar" onClick={aoVoltar}><Icone nome="esquerda" tamanho={15} />Edições</button>
    <Cabeca area={base ? (base.publicado ? 'Editar a montagem publicada' : 'Continuar o rascunho') : 'Nova edição'} titulo={f.titulo.trim() || tituloPadrao(f)}
      pergunta={`${codigo} · ${f.total} questões · ${duracaoTexto(f.duracao)}${repetidas ? ` · ${repetidas} já usadas antes` : ''}`} />
    {sobrescreve && !comParticipantes && <Faixa tom="aviso">Já existe uma edição {codigo} ({existente!.publicado ? 'publicada' : 'rascunho'}). Salvar regrava as questões dela.</Faixa>}
    {comParticipantes && <Faixa tom="erro">{existente!.titulo} já tem participantes: a prova não muda mais. Só dá para mudar título, descrição, destaque e estender o prazo, na tela da edição.</Faixa>}
    {salvos && salvos.faltando.length > 0 && <Faixa tom="aviso">{salvos.faltando.length} questão(ões) salvas não são mais elegíveis ({salvos.faltando.join(', ')}). Sorteie de novo ou troque antes de publicar.</Faixa>}

    <div className="a3-montagem">
      <form className="a3-pilha" onSubmit={e => { e.preventDefault(); void salvar(false) }} noValidate>
        <Etapa n={1} id="sn-1" titulo="Identificação" ajuda="O mês, o tipo, o texto da página e as datas, no horário de Brasília.">
          <div className="a3-editor__linha">
            <div className="a3-campo"><span>Tipo</span><Segmento rotulo="Tipo" valor={f.tipo} aoMudar={t => !base && mudarIdentificacao({ tipo: t })} opcoes={[['mensal', 'Mensal'], ['vespera', 'Véspera']]} /></div>
            {f.tipo === 'mensal' ? <label className="a3-campo"><span>Mês</span>
              <select className="a3-entrada" value={f.mes} disabled={!!base} onChange={e => mudarIdentificacao({ mes: e.target.value })}>{meses.map(m => <option key={m} value={m}>{maiuscula(nomeDoMes(m))}{mensais.has(m) && m !== base?.edicao ? ' (já existe)' : ''}</option>)}</select></label>
              : <label className="a3-campo"><span>Dia da prova</span><input className="a3-entrada" type="date" value={f.dataProva} disabled={!!base} onChange={e => mudarIdentificacao({ dataProva: e.target.value })} /></label>}
          </div>
          {f.tipo === 'vespera' && <label className="a3-campo"><span>Nome curto da prova</span><input className="a3-entrada" value={f.slug} disabled={!!base} maxLength={40} onChange={e => mudar({ slug: e.target.value })} placeholder="teot" /><small>Vira o código: <code>{codigo}</code></small></label>}
          <label className="a3-campo"><span>Título</span><input className="a3-entrada" value={f.titulo} maxLength={120} onChange={e => mudar({ titulo: e.target.value })} /></label>
          <label className="a3-campo"><span>Descrição (aparece no topo da página)</span><textarea className="a3-entrada" rows={3} maxLength={600} value={f.descricao} onChange={e => mudar({ descricao: e.target.value })} placeholder="Ex.: a edição de lançamento, aberta a todas as contas." /><small>{f.descricao.length}/600. Sem descrição, a página mostra só as datas e as regras.</small></label>
          <div className="a3-tres-campos">
            <label className="a3-campo"><span>Abre em</span><input className="a3-entrada" type="datetime-local" value={f.abre} onChange={e => mudar({ abre: e.target.value })} /></label>
            <label className="a3-campo"><span>Fecha em</span><input className="a3-entrada" type="datetime-local" value={f.fecha} onChange={e => mudar({ fecha: e.target.value })} /></label>
            <label className="a3-campo"><span>Duração (min)</span><input className="a3-entrada num" type="number" inputMode="numeric" min={10} max={360} step={10} value={f.duracao} onChange={e => mudar({ duracao: Number(e.target.value) })} /><small>{duracaoTexto(f.duracao)} desde o começo da pessoa</small></label>
          </div>
          <div className="a3-campo"><span>Número de questões</span>
            <div className="a3-acoes-linha">
              {TAMANHOS.map(n => <button key={n} type="button" className="a3-filtro" aria-pressed={!tamanhoLivre && f.total === n} onClick={() => { definirTamanhoLivre(false); mudar({ total: n }) }}>{n}</button>)}
              <button type="button" className="a3-filtro" aria-pressed={tamanhoLivre} onClick={() => definirTamanhoLivre(true)}>Outro</button>
              {tamanhoLivre && <input className="a3-entrada num" style={{ width: 96 }} type="number" inputMode="numeric" min={MIN_QUESTOES} max={MAX_QUESTOES} value={f.total} aria-label={`Número de questões (${MIN_QUESTOES} a ${MAX_QUESTOES})`} onChange={e => mudar({ total: Math.round(Number(e.target.value)) })} />}
            </div></div>
          <Interruptor marcado={f.abertoATodos} aoMudar={v => mudar({ abertoATodos: v })} titulo="Aberto a todos" descricao="Qualquer conta grátis faz a prova e entra no ranking." />
          <Interruptor marcado={f.destaqueInicio} aoMudar={v => mudar({ destaqueInicio: v })} titulo="Mostrar na página inicial" descricao="O cartão do Início chama para a prova (aberta ou abrindo em até 7 dias)." />
        </Etapa>

        <Etapa n={2} id="sn-2" titulo="Sorteio" ajuda="O que entra e quanto cada área pesa. A prévia refaz o sorteio na hora.">
          <div className="a3-campo"><span>Provas que entram</span>
            <div className="a3-acoes-linha">{PROVAS.map(([p, r]) => <label key={p} className="a3-filtro"><input type="checkbox" checked={f.config.provas.includes(p)} onChange={e => mudarConfig({ provas: e.target.checked ? [...f.config.provas, p] : f.config.provas.filter(x => x !== p), cotas: null })} />{r}</label>)}</div>
            <small>{inteiro(filtradas.length)} questões elegíveis (sem anuladas, cópias, autorais e figura pendente).</small></div>
          <div className="a3-tres-campos">
            <label className="a3-campo"><span>Peso das recentes</span><input className="a3-entrada num" type="number" inputMode="decimal" min={1} max={5} step={0.5} value={f.config.pesoRecentes} onChange={e => mudarConfig({ pesoRecentes: Math.max(1, Number(e.target.value) || 1) })} /><small>As demais pesam 1.</small></label>
            <label className="a3-campo"><span>Recentes = últimos (anos)</span><input className="a3-entrada num" type="number" inputMode="numeric" min={1} max={20} value={f.config.anosRecentes} onChange={e => mudarConfig({ anosRecentes: Math.min(20, Math.max(1, Math.round(Number(e.target.value)) || 1)) })} /></label>
            <label className="a3-campo"><span>Assuntos que mais caem: <b className="num">{f.config.nivelAltoPct}%</b></span><input type="range" min={0} max={100} step={5} value={f.config.nivelAltoPct} style={{ accentColor: 'var(--a3-tinta)' }} onChange={e => mudarConfig({ nivelAltoPct: Number(e.target.value) })} /><small>Níveis 3 e 4, dentro de cada área.</small></label>
          </div>
          <div className="a3-campo"><span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>Cotas por área
            <span className={conferencia && !conferencia.ok ? 'a3-erro-texto' : 'a3-mudo'} aria-live="polite">{conferencia ? conferencia.mensagem : `Automático · soma ${cotasAuto.reduce((s, c) => s + c.alvo, 0)} de ${f.total}`}</span></span>
            <Tabela rotulo="Cotas por área" compacta porPagina={40} linhas={linhasCotas} chave={l => l.area} colunas={[
              { id: 'a', titulo: 'Área', celula: l => <span style={{ display: 'grid' }}><span className="a3-nome">{l.area}</span><span className="a3-sub">{String(Math.round(l.pct * 10) / 10).replace('.', ',')}% · {l.disponivel} no acervo</span></span> },
              { id: 'u', titulo: 'Automático', numero: true, rotuloCelular: 'Auto', celula: l => l.alvo },
              { id: 's', titulo: 'Sua cota', numero: true, rotuloCelular: 'Sua', celula: l => <input className="a3-entrada num" style={{ width: 72, height: 30 }} type="number" inputMode="numeric" min={0} max={l.disponivel} value={l.sua} aria-label={`Cota de ${l.area}`} onChange={e => mudarCota(l.area, e.target.value)} /> },
              { id: 'o', titulo: 'Sorteado', numero: true, rotuloCelular: 'Saiu', celula: l => <b style={{ color: l.sorteado !== alvoDe(l.area) ? 'var(--a3-aviso)' : undefined }}>{l.sorteado}</b> },
            ]} />
            {f.config.cotas && <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" style={{ justifySelf: 'start' }} onClick={() => mudarConfig({ cotas: null })}><Icone nome="atualizar" tamanho={14} />Voltar ao automático</button>}
          </div>
        </Etapa>

        <Etapa n={3} id="sn-3" titulo="Prévia do sorteio" ajuda={<>Semente <code>{semente}</code>: o mesmo sorteio sai sempre igual e pode ser conferido. "Sortear de novo" muda só a variante.</>}>
          <div className="a3-acoes-linha">
            <button type="button" className="a3-botao a3-botao--contorno" onClick={() => mudar({ variante: f.variante + 1 })}><Icone nome="atualizar" tamanho={15} />Sortear de novo</button>
            {f.variante > 0 && <button type="button" className="a3-botao a3-botao--fantasma" onClick={() => mudar({ variante: 0 })}>Voltar ao sorteio original</button>}
            {trocasValem && Object.keys(trocas.por).length > 0 && <span className="a3-mudo a3-pequeno">{Object.keys(trocas.por).length} troca(s). Mudar a configuração desfaz as trocas.</span>}
          </div>
          <figure className="a3-alvo">
            <figcaption><span className="a3-rotulo">Alvo × sorteado por área</span><button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" aria-pressed={verTabela} onClick={() => definirVerTabela(!verTabela)}>{verTabela ? 'Ver gráfico' : 'Ver dados'}</button></figcaption>
            {verTabela ? <dl className="a3-pares">{linhasCotas.map(l => <div key={l.area}><dt>{l.area}</dt><dd>{l.sorteado} / {alvoDe(l.area)}</dd></div>)}</dl> :
              <ul>{linhasCotas.map(l => { const alvo = alvoDe(l.area); return <li key={l.area} title={`${l.area}: alvo ${alvo}, sorteado ${l.sorteado}`}>
                <span className="a3-alvo__nome">{l.area}</span>
                <span className="a3-alvo__trilho" aria-hidden="true"><i style={{ width: `${(l.sorteado / escala) * 100}%` }} /><b style={{ left: `${(alvo / escala) * 100}%` }} /></span>
                <span className="num"><b>{l.sorteado}</b>/{alvo}</span>
              </li> })}</ul>}
          </figure>
          <div className="a3-editor__linha">
            <div className="a3-campo"><span>Por nível de incidência</span><div className="a3-acoes-linha">{porNivel.map(([n, q]) => <Selo key={n} contorno>{n} · {q}</Selo>)}</div></div>
            <div className="a3-campo"><span>Por ano (máximo {tetoAno})</span><div className="a3-acoes-linha">{porAno.map(([a, q]) => <Selo key={a} tom={q > tetoAno ? 'erro' : undefined} contorno={q <= tetoAno}>{a} · {q}</Selo>)}</div></div>
          </div>
          <ListaQuestoes itens={itens} enunciados={acervo.enunciados} usadas={usadas} aoTrocar={trocar} />
        </Etapa>

        <Etapa n={4} id="sn-4" titulo="Prévia da página" ajuda="Como o topo de /simulado-nacional aparece para quem chega."><PreviaPagina f={f} /></Etapa>
      </form>

      <aside className="a3-montagem__resumo" aria-label="Revisão antes de salvar">
        <div className="a3-painel">
          <div className="a3-painel__cabeca"><h3 className="a3-titulo-3">Revisão</h3></div>
          <ul className="a3-checagens">{checagens.map(([ok, t]) => <li key={t} className={ok ? 'ok' : 'falha'}><Icone nome={ok ? 'certo' : 'alerta'} tamanho={15} />{t}</li>)}</ul>
          <dl className="a3-pares" style={{ padding: '0 20px' }}>
            <div><dt>Código</dt><dd className="a3-codigo">{codigo}</dd></div>
            <div><dt>Abre</dt><dd>{f.abre ? dataPorExtenso(localParaIso(f.abre)) : '—'}</dd></div>
            <div><dt>Fecha</dt><dd>{f.fecha ? dataPorExtenso(localParaIso(f.fecha, true)) : '—'}</dd></div>
            <div><dt>Já usadas antes</dt><dd>{repetidas}</dd></div>
          </dl>
          <div className="a3-montagem__botoes">
            {problema && <p className="a3-erro-texto a3-pequeno" role="status">{problema}</p>}
            <button type="button" className="a3-botao" disabled={!!salvando || comParticipantes || !!problema} onClick={() => void salvar(true)}>{salvando === 'publicar' ? 'Publicando…' : base?.publicado ? 'Salvar e manter publicada' : 'Publicar'}</button>
            <button type="button" className="a3-botao a3-botao--contorno" disabled={!!salvando || comParticipantes} onClick={() => void salvar(false)}>{salvando === 'rascunho' ? 'Salvando…' : 'Salvar como rascunho'}</button>
            <button type="button" className="a3-botao a3-botao--fantasma" onClick={aoVoltar}>Descartar</button>
            <small className="a3-mudo">O rascunho fica só no painel. Publicar abre as inscrições na hora; sempre pede confirmação.</small>
          </div>
        </div>
      </aside>
    </div>
  </div>
}

const PRIMEIRAS = 10
function ListaQuestoes({ itens, enunciados, usadas, aoTrocar, trocando }: { itens: ItemSorteado[]; enunciados: Map<string, string>; usadas: Set<string>; aoTrocar?: (ordem: number) => void; trocando?: number | null }) {
  const [todas, definirTodas] = useState(false)
  const visiveis = todas ? itens : itens.slice(0, PRIMEIRAS)
  return <div className="a3-campo"><span>As {itens.length} questões, na ordem da prova</span>
    <ol className="a3-prova-lista" id="a3-sn-lista">{visiveis.map(i => <li key={i.ordem}>
      <span className="a3-prova-lista__ordem num">{i.ordem}</span>
      <div style={{ minWidth: 0, display: 'grid', gap: 4 }}>
        <span className="a3-pequeno"><b>{i.area}</b>{i.foco && <span className="a3-mudo"> · {i.foco}</span>}</span>
        <span className="a3-prova-lista__texto">{trechoEnunciado(enunciados.get(i.id)) || <em className="a3-mudo">Enunciado não carregado</em>}</span>
        <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Selo contorno>{i.prova ?? 'Prova'} · {i.ano ?? 'sem ano'}</Selo><Selo contorno>{ROTULO_NIVEL[i.nivel]}</Selo>
          <span title="Letra no acervo → letra nesta edição"><Selo>Gabarito {i.gabarito} → {i.gabaritoNovo}</Selo></span>
          {usadas.has(i.id) && <Selo tom="aviso">já usada</Selo>}
        </span>
      </div>
      <div className="a3-prova-lista__acoes">
        <a className="a3-botao a3-botao--fantasma a3-botao--icone a3-botao--pequeno" href={href(`/questao/${i.id}`)} target="_blank" rel="noopener noreferrer" aria-label={`Abrir a questão ${i.id} numa nova aba`}><Icone nome="externo" tamanho={15} /></a>
        {aoTrocar && <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" disabled={trocando !== undefined && trocando !== null} onClick={() => aoTrocar(i.ordem)} aria-label={`Trocar a questão ${i.ordem}`}><Icone nome="atualizar" tamanho={14} />{trocando === i.ordem ? 'Trocando…' : 'Trocar'}</button>}
      </div>
    </li>)}</ol>
    {itens.length > PRIMEIRAS && <button type="button" className="a3-botao a3-botao--contorno" style={{ justifySelf: 'start' }} aria-expanded={todas} aria-controls="a3-sn-lista" onClick={() => definirTodas(!todas)}><Icone nome={todas ? 'cima' : 'baixo'} tamanho={15} />{todas ? `Só as ${PRIMEIRAS} primeiras` : `Ver as ${itens.length} questões`}</button>}
  </div>
}

function PreviaPagina({ f }: { f: Pick<FormEdicao, 'tipo' | 'titulo' | 'descricao' | 'abre' | 'fecha' | 'total' | 'duracao' | 'abertoATodos' | 'destaqueInicio'> }) {
  const abre = localParaIso(f.abre), fecha = localParaIso(f.fecha, true)
  return <div className="a3-pilha">
    <div className="a3-previa-sn" aria-label="Prévia do topo da página">
      <span className="a3-rotulo">{f.tipo === 'vespera' ? 'Simulado de véspera' : 'Simulado Nacional'}</span>
      <p className="a3-previa-sn__titulo">{f.titulo.trim() || 'Sem título'}</p>
      {f.abertoATodos && <span className="a3-previa-sn__aberto">Aberto a todos · não precisa assinar</span>}
      <dl className="a3-pares">
        <div><dt>Quando</dt><dd>De {f.abre ? dataPorExtenso(abre) : '—'} a {f.fecha ? dataPorExtenso(fecha) : '—'}</dd></div>
        <div><dt>O que é</dt><dd>{f.total} questões oficiais · {duracaoTexto(f.duracao)} · ranking nacional</dd></div>
        <div><dt>Como participar</dt><dd>Inscreva-se agora; no dia, comece a prova</dd></div>
      </dl>
      {f.descricao.trim() && <p>{f.descricao.trim()}</p>}
      <span className="a3-botao" aria-hidden="true" style={{ justifySelf: 'start' }}>Quero participar</span>
    </div>
    <p className="a3-mudo a3-pequeno">{f.destaqueInicio ? 'Também aparece como cartão na página inicial, da semana antes de abrir até fechar.' : 'Não aparece na página inicial.'}{f.abertoATodos ? '' : ' Fazer a prova é para quem assina; quem não assina vê a página e o ranking.'}</p>
  </div>
}

/* ───────────── 3. Edição publicada ───────────── */

function EdicaoPublicada({ e, edicoes, acervo, aoVoltar, aoMudar, aoEditarMontagem }: { e: EdicaoAdminSN; edicoes: EdicaoAdminSN[]; acervo: AcervoNacional; aoVoltar: () => void; aoMudar: (e: EdicaoAdminSN) => void; aoEditarMontagem: () => void }) {
  const status = statusEdicao(e)
  const travada = e.participantes > 0
  const aberta = e.publicado && Date.parse(e.abre_em) <= Date.now()
  const { variante } = lerConfig(e.config)
  const semente = sementeDe(e.edicao, variante)
  const { itens: salvos, faltando } = useMemo(() => itensDaEdicao(acervo.candidatas, e.ids, semente), [acervo.candidatas, e.ids, semente])
  const usadas = useMemo(() => idsUsados(edicoes, e.edicao), [edicoes, e.edicao])
  const [aba, definirAba] = useState<'acompanhar' | 'ajustes' | 'questoes'>('acompanhar')
  const [saidas, definirSaidas] = useState<string[]>([])
  const [trocando, definirTrocando] = useState<number | null>(null)
  const [ocupado, definirOcupado] = useState<string | null>(null)
  const [texto, definirTexto] = useState({ titulo: e.titulo, descricao: e.descricao ?? '', destaque: e.destaque_inicio, aberto: e.aberto_a_todos })
  const textoMudou = texto.titulo !== e.titulo || texto.descricao !== (e.descricao ?? '') || texto.destaque !== e.destaque_inicio || texto.aberto !== e.aberto_a_todos
  const [datas, definirDatas] = useState({ abre: isoParaLocal(e.abre_em), fecha: isoParaLocal(e.fecha_em) })
  const datasMudaram = datas.abre !== isoParaLocal(e.abre_em) || datas.fecha !== isoParaLocal(e.fecha_em)

  async function rodar(nome: string, acao: () => Promise<EdicaoAdminSN>, ok: string) {
    definirOcupado(nome)
    try { aoMudar(await acao()); avisoRapido(ok) } catch (falha) { avisoRapido(mensagemDeFalha(falha), 'erro') } finally { definirOcupado(null) }
  }
  const salvarTexto = () => rodar('texto', () => snAdminConfig(e.edicao, { titulo: texto.titulo.trim(), descricao: texto.descricao.trim(), destaqueInicio: texto.destaque, abertoATodos: texto.aberto }), 'Texto e destaque salvos. A página já mostra a versão nova.')
  const salvarDatas = () => {
    if (datas.fecha.slice(0, 16) <= datas.abre.slice(0, 16)) { avisoRapido('O fechamento precisa vir depois da abertura.', 'erro'); return }
    const abreMudou = datas.abre !== isoParaLocal(e.abre_em), fechaMudou = datas.fecha !== isoParaLocal(e.fecha_em)
    return rodar('datas', () => snAdminDatas(e.edicao, abreMudou ? localParaIso(datas.abre) : null, fechaMudou ? localParaIso(datas.fecha, true) : null), 'Datas salvas.')
  }
  async function publicar(publicado: boolean) {
    if (!publicado && !(await confirmar({ titulo: `Despublicar "${e.titulo}"?`, texto: 'A edição sai do site e as inscrições deixam de valer na página. Dá para publicar de novo depois.', sim: 'Despublicar', perigo: true }))) return
    if (publicado && !(await confirmar({ titulo: `Publicar "${e.titulo}"?`, texto: 'A edição aparece no site e as inscrições abrem na hora.', sim: 'Publicar' }))) return
    await rodar('publicar', () => snAdminPublicar(e.edicao, publicado), publicado ? 'Edição publicada.' : 'Edição despublicada: voltou a ser rascunho.')
  }
  async function trocar(ordem: number) {
    const sai = salvos.find(i => i.ordem === ordem)
    if (!sai) return
    const novo = trocarItem(acervo.candidatas.filter(c => c.prova === undefined || lerConfig(e.config).config.provas.includes(c.prova)), salvos, ordem, semente, new Set([...saidas, sai.id, ...usadas]))
    if (!novo) { avisoRapido(`Não há outra questão de ${sai.area} para trocar.`, 'erro'); return }
    if (!(await confirmar({ titulo: `Trocar a questão ${ordem}?`, texto: `Sai ${sai.id} (${sai.area}${sai.foco ? ` · ${sai.foco}` : ''}); entra ${novo.id}${novo.foco ? ` (${novo.foco})` : ''}. A troca vale na hora.`, sim: 'Trocar' }))) return
    definirTrocando(ordem)
    try { const nova = await snAdminTrocarItem(e.edicao, ordem, itensParaBanco([novo])[0]); definirSaidas(s => [...s, sai.id]); aoMudar(nova); avisoRapido(`Questão ${ordem} trocada: entrou ${novo.id}.`) }
    catch (falha) { avisoRapido(mensagemDeFalha(falha), 'erro') } finally { definirTrocando(null) }
  }

  return <div className="a3-pilha a3-pilha--larga">
    <button type="button" className="a3-botao a3-botao--fantasma a3-voltar" onClick={aoVoltar}><Icone nome="esquerda" tamanho={15} />Edições</button>
    <Cabeca area="Simulado Nacional" titulo={e.titulo} pergunta={`${dataCurta(e.abre_em)} → ${dataCurta(e.fecha_em)} · ${e.total} questões · ${duracaoTexto(e.duracao_min)}`}
      extra={<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}><Status s={status} /><Tipo e={e} /><code className="a3-codigo">{e.edicao}</code>{travada && <Selo tom="aviso">{e.participantes} começaram: prova travada</Selo>}</div>} />
    <Segmento rotulo="Parte da edição" valor={aba} aoMudar={definirAba} opcoes={[['acompanhar', 'Acompanhar'], ['ajustes', 'Ajustes'], ['questoes', `Questões (${salvos.length})`]]} />
    {aba === 'acompanhar' && <Acompanhar e={e} enunciados={acervo.enunciados} />}
    {aba === 'ajustes' && <div className="a3-grade a3-grade--2" style={{ alignItems: 'start' }}>
      <Painel titulo="Texto e destaque" descricao="Muda a qualquer momento, mesmo com participantes.">
        <div className="a3-pilha">
          <label className="a3-campo"><span>Título</span><input className="a3-entrada" value={texto.titulo} maxLength={120} onChange={ev => definirTexto({ ...texto, titulo: ev.target.value })} /></label>
          <label className="a3-campo"><span>Descrição</span><textarea className="a3-entrada" rows={3} maxLength={600} value={texto.descricao} onChange={ev => definirTexto({ ...texto, descricao: ev.target.value })} /></label>
          <Interruptor marcado={texto.aberto} aoMudar={v => definirTexto({ ...texto, aberto: v })} titulo="Aberto a todos" descricao="Qualquer conta faz a prova." />
          <Interruptor marcado={texto.destaque} aoMudar={v => definirTexto({ ...texto, destaque: v })} titulo="Mostrar na página inicial" />
          <button type="button" className="a3-botao" style={{ justifySelf: 'start' }} disabled={!textoMudou || !!ocupado || texto.titulo.trim().length < 3} onClick={() => void salvarTexto()}>{ocupado === 'texto' ? 'Salvando…' : 'Salvar texto'}</button>
        </div>
      </Painel>
      <div className="a3-pilha">
        <Painel titulo="Datas" descricao={aberta ? 'Já abriu: só dá para estender o fechamento.' : 'Antes de abrir, as duas datas mudam livremente.'}>
          <div className="a3-pilha">
            <div className="a3-editor__linha">
              <label className="a3-campo"><span>Abre em</span><input className="a3-entrada" type="datetime-local" value={datas.abre} disabled={aberta} onChange={ev => definirDatas({ ...datas, abre: ev.target.value })} /></label>
              <label className="a3-campo"><span>Fecha em</span><input className="a3-entrada" type="datetime-local" value={datas.fecha} min={aberta ? isoParaLocal(e.fecha_em) : undefined} onChange={ev => definirDatas({ ...datas, fecha: ev.target.value })} /></label>
            </div>
            <button type="button" className="a3-botao a3-botao--contorno" style={{ justifySelf: 'start' }} disabled={!datasMudaram || !!ocupado} onClick={() => void salvarDatas()}>{ocupado === 'datas' ? 'Salvando…' : 'Salvar datas'}</button>
          </div>
        </Painel>
        <Painel titulo="Publicação e montagem" descricao={travada ? `${e.participantes} pessoa(s) já começaram: a prova não muda mais.` : 'Ninguém começou ainda: dá para despublicar, trocar questões ou refazer a montagem.'}>
          <div className="a3-acoes-linha">
            {e.publicado ? <button type="button" className="a3-botao a3-botao--perigo" disabled={travada || !!ocupado} onClick={() => void publicar(false)}>{ocupado === 'publicar' ? 'Despublicando…' : 'Despublicar'}</button>
              : <button type="button" className="a3-botao" disabled={!!ocupado} onClick={() => void publicar(true)}>Publicar</button>}
            <button type="button" className="a3-botao a3-botao--contorno" disabled={travada} onClick={aoEditarMontagem}><Icone nome="filtro" tamanho={15} />Refazer a montagem</button>
          </div>
        </Painel>
      </div>
    </div>}
    {aba === 'questoes' && <Painel titulo="Questões da edição" descricao={travada ? 'Para conferir. Achou uma com problema? Corrija no Editor de questões: a edição usa a questão do acervo.' : 'Trocar põe outra da mesma área (e do mesmo foco, se houver), ainda não usada.'}>
      <div className="a3-pilha">
        {faltando.length > 0 && <Faixa tom="aviso">{faltando.length} questão(ões) desta edição não estão mais entre as elegíveis do acervo: {faltando.join(', ')}.</Faixa>}
        <ListaQuestoes itens={salvos} enunciados={acervo.enunciados} usadas={new Set()} aoTrocar={travada ? undefined : o => void trocar(o)} trocando={trocando} />
      </div>
    </Painel>}
  </div>
}

function Acompanhar({ e, enunciados }: { e: EdicaoAdminSN; enunciados: Map<string, string> }) {
  const [dados, definirDados] = useState<EstatisticasSN | null>(null)
  const [erro, definirErro] = useState('')
  const [carregando, definirCarregando] = useState(false)
  const carregar = useCallback(async () => {
    definirCarregando(true)
    try { definirDados(await snAdminEstatisticas(e.edicao)); definirErro('') } catch (f) { definirErro(mensagemDeFalha(f)) } finally { definirCarregando(false) }
  }, [e.edicao])
  useEffect(() => { void carregar() }, [carregar])
  const areas = dados ? [...dados.por_area].sort((a, b) => (b.media ?? 0) - (a.media ?? 0)) : []
  if (erro) return <Estado tipo="erro" titulo="Não deu para contar as participações" texto={erro} acao={<button type="button" className="a3-botao" onClick={() => void carregar()}>Tentar de novo</button>} />
  if (!dados) return <Carregando linhas={4} texto="Contando as participações…" />
  const funil = [['Inscritos', dados.inscritos], ['Começaram', dados.participantes], ['Entregaram', dados.entregas], ['No prazo', dados.no_tempo]] as const
  const topo = Math.max(1, dados.inscritos)
  return <div className="a3-pilha">
    <section className="a3-painel">
      <div className="a3-painel__cabeca"><h3 className="a3-titulo-3">Como a edição está indo</h3>
        <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" disabled={carregando} onClick={() => void carregar()}><Icone nome="atualizar" tamanho={14} />{carregando ? 'Atualizando…' : 'Atualizar'}</button></div>
      <div className="a3-funil-sn">
        {funil.map(([n, v]) => <div key={n}><span className="a3-rotulo">{n}</span><b className="num">{inteiro(v)}</b><i style={{ '--p': `${(v / topo) * 100}%` } as React.CSSProperties} /></div>)}
        <div><span className="a3-rotulo">Média de acerto</span><b className="num">{media(dados.media)}</b></div>
      </div>
    </section>
    {dados.entregas === 0 ? <Estado compacto titulo="Ninguém entregou ainda" texto="As médias por área e as questões que mais erraram aparecem com as primeiras entregas." /> :
      <div className="a3-grade a3-grade--2" style={{ alignItems: 'start' }}>
        <Painel titulo="Acerto médio por área" descricao="Só entregas no prazo">
          <ul className="a3-rank">{areas.map(a => <li key={a.area}><span title={`${a.certas} de ${a.total}`}>{a.area}</span><b>{media(a.media)}</b><i style={{ '--p': `${a.media ?? 0}%` } as React.CSSProperties} aria-hidden="true" /></li>)}</ul>
        </Painel>
        <Painel justo titulo="Questões que mais erraram" descricao="Boa para post e para achar questão com problema (gabarito discutível, figura ruim).">
          <Tabela rotulo="Questões que mais erraram" compacta linhas={dados.mais_erradas} chave={q => q.id_questao} colunas={[
            { id: 'q', titulo: 'Questão', celula: q => <span style={{ display: 'grid' }}><a className="a3-nome" href={href(`/questao/${q.id_questao}`)} target="_blank" rel="noopener noreferrer">{q.ordem}. {q.id_questao}</a><span className="a3-sub">{trechoEnunciado(enunciados.get(q.id_questao), 90)}</span></span> },
            { id: 'e', titulo: 'Erraram', numero: true, rotuloCelular: 'Erraram', celula: q => <span><b>{q.erros}</b> de {q.total}<span className="a3-sub">{q.total ? `${Math.round((q.erros / q.total) * 100)}%` : ''}</span></span> },
          ]} />
        </Painel>
      </div>}
  </div>
}
