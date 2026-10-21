import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { confirmar } from '../componentes/Confirmar'
import { AdminFichaUsuario } from '../componentes/admin/AdminFichaUsuario'
import { PARTE_COBRANCAS, codigoDaFalha, funcaoAusente, lerEvento, linkDoEvento, reprocessarEvento, type EventoPagamento } from '../componentes/admin/pagamentos'
import { href, navegar } from '../util/rotas'
import { Icone } from '../componentes/Icone'
import { AdminConteudo, type VistaConteudo } from '../componentes/admin/AdminConteudo'
import { AdminQuestoes } from '../componentes/admin/AdminQuestoes'
import { AdminCrescimento } from '../componentes/admin/AdminCrescimento'
import { AdminConfiguracoes } from '../componentes/admin/AdminConfiguracoes'
import { AdminLembretes } from '../componentes/admin/AdminLembretes'
import { AdminRelatorioMensal } from '../componentes/admin/AdminRelatorioMensal'
import { AdminEmails } from '../componentes/admin/AdminEmails'
import { AdminCartas } from '../componentes/admin/AdminCartas'
import { AdminTodasCartas } from '../componentes/admin/AdminTodasCartas'
import { AdminSimulados } from '../componentes/admin/AdminSimulados'
import { SECOES, abaPadrao, definicaoDe, lerUrl, secaoDe, urlAntiga, urlDe, type Aba, type EstadoUrl, type Secao } from '../componentes/admin/secoes'
import { AdminUsuarios, estaOnline, type FiltroUsuarios, type LinhaUsuario } from '../componentes/admin/AdminUsuarios'
import { AdminAgora, type ResumoAdmin } from '../componentes/admin/AdminAgora'
import { AdminFinanceiro } from '../componentes/admin/AdminFinanceiro'
import { AdminCobrancas } from '../componentes/admin/AdminCobrancas'
import { AdminExportar } from '../componentes/admin/AdminExportar'
import { proximaData, rotuloMeio, rotuloPlano, situacaoAssinatura } from '../componentes/admin/rotulos'
import type { CobrancaReal } from '../componentes/admin/receita'
import { AdminOpinioesFlashcards } from '../componentes/admin/AdminOpinioesFlashcards'
import { contaDeTeste } from '../componentes/admin/contasTeste'
import { meioDe, precoDe } from '../componentes/admin/receita'
import { real } from '../dados/planos'
import { usarLidos } from '../componentes/admin/lidos'
import { CINCO_MIN, usarRpc } from '../componentes/admin/usarRpc'
import { usarContadoresAdmin } from '../componentes/admin/contadores'
import {
  STATUS_EVENTO, TIPOS_EVENTO, baixarCsv, corresponde, data, dataHora, erroDoPainel, haQuanto, nomeErro, normalizar,
} from '../componentes/admin/formatos'
import '../estilos/paginas/AdminAssinaturas.css'

interface LinhaAssinatura {
  id_usuario: string
  usuario: string
  plano: string
  status: string
  proxima_cobranca: string | null
  ultima_atualizacao: string
  // Da migração 202609290100 em diante.
  nome?: string | null
  criada_em?: string | null
  inicio_periodo?: string | null
  fim_periodo?: string | null
  ultima_cobranca_em?: string | null
  cancelar_ao_fim?: boolean
  // Da migração 202609290200 em diante.
  cancelada_em?: string | null
  // Da migração 202610060100 em diante: 'pix' ou 'cartao'.
  meio?: string | null
}
type LinhaEvento = EventoPagamento
type Resumo = ResumoAdmin

const MIGRACAO = '202609290100_painel_admin.sql'

/** Assinatura que dá acesso agora (em dia, ou cancelada que ainda vale até o fim do período). */
const vigente = (a: LinhaAssinatura) =>
  (a.status === 'ativa' || (a.status === 'cancelada' && !!a.cancelar_ao_fim)) && (!a.fim_periodo || new Date(a.fim_periodo) > new Date())
const inicioDe = (a: LinhaAssinatura) => a.criada_em ?? a.inicio_periodo ?? a.ultima_atualizacao

/** Partes cujo número é um alerta (vermelho); ele também sobe para a seção. */
const ALERTAS: Aba[] = ['pagamentos', 'conteudo']

/**
 * Painel do administrador como painel de observação (17/10/2026): seis seções (Agora, Pessoas, Financeiro,
 * Conteúdo, E-mails, Ajustes), cada uma com as suas partes; cada número mora num lugar só.
 */
export function AdminAssinaturas({ consulta }: { consulta: URLSearchParams }) {
  const { sessao } = usarConta()
  // Lido do endereço a cada render: Voltar, F5 e links externos (hashchange) já chegam aqui pelo App.
  const url = lerUrl(consulta)
  const { aba } = url
  const secao = secaoDe(aba)
  // Endereço antigo (?aba=geral, ?aba=configuracoes…): reescreve no formato novo sem criar histórico.
  const antiga = urlAntiga(consulta)
  const destinoNovo = urlDe(url)
  useEffect(() => { if (antiga) navegar(destinoNovo, true) }, [antiga, destinoNovo])
  // Vista e questão ficam lembradas fora da parte: voltar a Conteúdo ou ao editor reabre onde estava.
  const [vista, definirVista] = useState<VistaConteudo>(url.vista)
  const [idEditar, definirIdEditar] = useState<string | null>(url.id)
  useEffect(() => { if (aba === 'conteudo') definirVista(url.vista) }, [aba, url.vista])
  useEffect(() => { if (aba === 'questoes' && url.id) definirIdEditar(url.id) }, [aba, url.id])
  // Cada seção lembra a última parte aberta: voltar a Financeiro reabre Pagamentos, se era lá.
  const [ultimaParte, definirUltimaParte] = useState<Partial<Record<Secao, Aba>>>({})
  useEffect(() => { definirUltimaParte(antes => antes[secao] === aba ? antes : { ...antes, [secao]: aba }) }, [secao, aba])
  // Cada consulta tem um dono só e fica em cache (usarRpc): trocar de seção não pede de novo,
  // clique duplo não duplica, e a lista pesada de usuários só vem para as partes que a mostram.
  const conta = sessao?.user.id
  const assinaturasQ = usarRpc<LinhaAssinatura[]>(conta, 'listar_assinaturas_admin')
  const eventosQ = usarRpc<LinhaEvento[]>(conta, 'listar_eventos_pagamento_admin')
  const resumoQ = usarRpc<Resumo[]>(conta, 'resumo_admin', {}, { atualizarCada: aba === 'agora' ? CINCO_MIN : undefined })
  const contadoresQ = usarContadoresAdmin(conta)
  // Sem a RPC leve (parte 22 ainda não colada), o número de contas sai da própria lista.
  const semContadores = !!contadoresQ.erro || !!contadoresQ.dados?.derivado
  const usuariosQ = usarRpc<LinhaUsuario[]>(conta, 'listar_usuarios_admin', {}, {
    // Agora, Pessoas › Usuários, Crescimento e Cartas mostram a lista; Assinaturas, Pagamentos e Avisos usam para abrir a ficha.
    ativo: ['agora', 'usuarios', 'crescimento', 'cartas', 'assinaturas', 'cobrancas', 'pagamentos'].includes(aba) || semContadores,
    // "Ao vivo" em Agora e em Pessoas › Usuários, com a aba do navegador visível.
    atualizarCada: aba === 'usuarios' || aba === 'agora' ? CINCO_MIN : undefined,
    prazoMs: 20_000,
  })
  // Cobranças gravadas no banco (parte 23): Financeiro e Cobranças leem da mesma consulta. Sem a RPC, tudo pelo preço dos planos.
  // Agora também lê as cobranças: "Pagaram hoje" com nomes e valores.
  const cobrancasQ = usarRpc<CobrancaReal[]>(conta, 'cobrancas_admin', {}, { ativo: aba === 'financeiro' || aba === 'cobrancas' || aba === 'agora' })
  const cobrancasReais = cobrancasQ.erro ? null : cobrancasQ.dados ?? null
  const avisoReais = !cobrancasQ.erro ? null : funcaoAusente(cobrancasQ.erro)
    ? `Para usar os valores gravados no banco (Pix pelo valor pago, cartão pelo valor contratado), cole no Supabase a ${PARTE_COBRANCAS}. Enquanto isso, os valores são estimados pelos planos.`
    : `As cobranças gravadas não carregaram (código: ${codigoDaFalha(cobrancasQ.erro)}); os valores abaixo são estimados pelos planos.`
  const assinaturas = assinaturasQ.dados ?? null
  const eventos = eventosQ.dados ?? null
  // "Online" refeito no painel a cada 10 s pelo último sinal (estaOnline), sem esperar o servidor.
  const [agoraOnline, definirAgoraOnline] = useState(() => Date.now())
  useEffect(() => { const t = window.setInterval(() => definirAgoraOnline(Date.now()), 10_000); return () => window.clearInterval(t) }, [])
  const usuarios = useMemo(() => usuariosQ.dados?.map(u => ({ ...u, online: estaOnline(u, Math.max(agoraOnline, usuariosQ.atualizadoEm ?? 0)) })) ?? null, [usuariosQ.dados, usuariosQ.atualizadoEm, agoraOnline])
  const resumo = resumoQ.dados?.[0] ?? null
  const erroAcesso = assinaturasQ.erro ? erroDoPainel(assinaturasQ.erro, MIGRACAO) : ''
  const falhaNova = resumoQ.erro ?? usuariosQ.erro
  const erroNovo = falhaNova ? erroDoPainel(falhaNova, MIGRACAO) : ''
  const atualizadoEm = assinaturasQ.atualizadoEm ? new Date(assinaturasQ.atualizadoEm) : null
  // Pendências de conteúdo: a RPC leve dá o número; com Conteúdo › Para revisar aberto, vale o que ela
  // acabou de contar (resolver um relato baixa na hora). O mais recente dos dois ganha.
  const [pendenciasAoVivo, definirPendenciasAoVivo] = useState<{ valor: number; em: number } | null>(null)
  const registrarPendencias = useCallback((valor: number) => definirPendenciasAoVivo({ valor, em: Date.now() }), [])
  const pendenciasConteudo = pendenciasAoVivo && pendenciasAoVivo.em >= (contadoresQ.atualizadoEm ?? 0) ? pendenciasAoVivo.valor : contadoresQ.dados?.conteudo ?? null
  const lidosPagamento = usarLidos('pagamento')
  // Compras de teste do dono ficam fora das estatísticas; a lista completa continua em Financeiro › Assinaturas.
  const reais = useMemo(() => assinaturas?.filter(a => !contaDeTeste(a)) ?? null, [assinaturas])
  const testes = (assinaturas?.length ?? 0) - (reais?.length ?? 0)
  const usuariosReais = useMemo(() => usuarios?.filter(u => !contaDeTeste({ nome: u.nome, usuario: u.email })) ?? null, [usuarios])

  // Um clique por vez: o botão fica ocupado e os pedidos em voo são reaproveitados.
  const atualizando = assinaturasQ.carregando || eventosQ.carregando || resumoQ.carregando || usuariosQ.carregando || contadoresQ.carregando || cobrancasQ.carregando
  const { recarregar: recAssinaturas } = assinaturasQ
  const { recarregar: recEventos } = eventosQ
  const { recarregar: recResumo } = resumoQ
  const { recarregar: recUsuarios } = usuariosQ
  const { recarregar: recContadores } = contadoresQ
  const { recarregar: recCobrancas } = cobrancasQ
  const carregar = useCallback(async () => {
    await Promise.all([recAssinaturas(), recEventos(), recResumo(), recUsuarios(), recContadores(), recCobrancas()])
  }, [recAssinaturas, recEventos, recResumo, recUsuarios, recContadores, recCobrancas])
  // Saindo de Conteúdo › Para revisar, o contador volta a vir do servidor já com o que foi resolvido lá.
  const abaAnterior = useRef(aba)
  useEffect(() => {
    if (abaAnterior.current === 'conteudo' && aba !== 'conteudo') void recContadores()
    abaAnterior.current = aba
  }, [aba, recContadores])
  // No celular as partes rolam de lado: a escolhida precisa ficar à vista.
  useEffect(() => {
    document.querySelector('.adm-parte[aria-selected="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [aba, assinaturas !== null])

  // Trocar de parte cria entrada no histórico (Voltar volta à anterior);
  // filtro, vista e questão dentro da mesma parte só substituem o endereço.
  function irPara(mudanca: Partial<EstadoUrl>) {
    const novo = { ...url, vista, id: idEditar, ...mudanca }
    const outraAba = novo.aba !== aba
    navegar(urlDe(novo), !outraAba)
    if (outraAba) window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const trocarAba = (nova: Aba) => irPara({ aba: nova, filtro: 'todos' })
  // Tocar na seção em que já se está volta à primeira parte dela; em outra, reabre a última parte vista lá.
  const destinoDaSecao = (s: Secao): Aba => s === secao ? abaPadrao(s) : ultimaParte[s] ?? abaPadrao(s)
  const abrirUsuarios = (filtro: FiltroUsuarios) => irPara({ aba: 'usuarios', filtro })
  const editarQuestao = (id: string) => { definirIdEditar(id); irPara({ aba: 'questoes', id }) }

  if (!sessao) return <article className="empilha limite-leitura"><h1>Painel do administrador</h1><p>Entre na sua conta para continuar.</p><a className="botao" href={href('/conta')}>Entrar</a></article>

  const errosPagamento = eventos?.filter(ev => ev.status_processamento === 'erro' && !lidosPagamento.lidos.has(String(ev.id))).length ?? 0
  const contadores: Partial<Record<Aba, number>> = {
    usuarios: contadoresQ.dados?.usuarios ?? usuarios?.length, assinaturas: reais?.filter(vigente).length,
    pagamentos: errosPagamento || undefined, conteudo: pendenciasConteudo || undefined,
  }
  const onlineAgora = usuarios ? usuarios.filter(u => u.online).length : contadoresQ.dados?.online ?? undefined
  const alertasDa = (s: Secao) => definicaoDe(s).abas.reduce((soma, a) => soma + (ALERTAS.includes(a.id) ? contadores[a.id] ?? 0 : 0), 0)
  const definicao = definicaoDe(secao)
  const variasPartes = definicao.abas.length > 1
  const rotuloAba = definicao.abas.find(a => a.id === aba)?.rotulo ?? definicao.rotulo

  // Setas e Home/End andam entre as partes da seção (padrão de abas acessíveis).
  function teclaNasPartes(evento: KeyboardEvent<HTMLDivElement>) {
    const ids = definicao.abas.map(a => a.id)
    const atual = ids.indexOf(aba)
    const destino = evento.key === 'ArrowRight' ? (atual + 1) % ids.length : evento.key === 'ArrowLeft' ? (atual - 1 + ids.length) % ids.length
      : evento.key === 'Home' ? 0 : evento.key === 'End' ? ids.length - 1 : -1
    if (destino < 0) return
    evento.preventDefault()
    trocarAba(ids[destino])
    requestAnimationFrame(() => document.getElementById(`adm-parte-${ids[destino]}`)?.focus())
  }

  return <article className="adm">
    <header className="adm-heroi">
      <div>
        <p className="adm-heroi__sobre"><Icone nome="cadeado" tamanho={14} /> Área restrita</p>
        <h1>Painel do administrador</h1>
        <p>{atualizadoEm ? `Dados de ${atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.` : 'Verificando acesso…'} Só contas em administradores conseguem abrir.</p>
      </div>
      <div className="adm-heroi__acoes">
        {assinaturas !== null && <AdminExportar />}
        <button className="botao adm-heroi__atualizar" type="button" onClick={() => void carregar()} disabled={atualizando} aria-busy={atualizando}><Icone nome="reiniciar" tamanho={16} /> {atualizando ? 'Atualizando…' : 'Atualizar'}</button>
      </div>
    </header>

    {/* Falha ao atualizar não derruba o painel: o aviso aparece em cima dos dados que já estavam na tela. */}
    {erroAcesso && <p role="alert" className="adm-alerta">{erroAcesso}{assinaturas !== null && ' Os dados abaixo são da última atualização.'}</p>}
    {assinaturas === null ? (!erroAcesso && <p role="status">Carregando o painel…</p>) : <div className="adm-corpo">
      {/* Computador: coluna à esquerda. Celular: barra presa embaixo da tela. */}
      <nav className="adm-nav" aria-label="Seções do painel">
        <ul>
          {SECOES.map(s => {
            const alertas = alertasDa(s.id)
            // Agora mostra quantos estão online (o mesmo número do quadro, refeito a cada 10 s); Pessoas, quantas contas.
            const numero = s.id === 'agora' ? onlineAgora : s.id === 'pessoas' ? contadores.usuarios : undefined
            const destino = destinoDaSecao(s.id)
            return <li key={s.id}>
              <a className="adm-nav__item" href={href(urlDe({ ...url, vista, id: idEditar, aba: destino, filtro: 'todos' }))}
                aria-current={secao === s.id ? 'page' : undefined}
                onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); trocarAba(destino) }}>
                <span className="adm-nav__icone"><Icone nome={s.icone} tamanho={20} />{alertas > 0 && <i className="adm-nav__ponto" aria-hidden="true" />}</span>
                <span className="adm-nav__rotulo">{s.rotulo}</span>
                {alertas > 0 ? <b className="adm-nav__numero adm-nav__numero--alerta">{alertas}<span className="so-leitor"> para ver</span></b>
                  : numero ? <b className={'adm-nav__numero' + (s.id === 'agora' ? ' adm-nav__numero--vivo' : '')}>{numero}{s.id === 'agora' && <span className="so-leitor"> online</span>}</b> : null}
              </a>
            </li>
          })}
        </ul>
      </nav>

      <div className="adm-area empilha-2">
        <div className="adm-area__cabeca">
          <h2 className="adm-area__titulo">{definicao.rotulo}{variasPartes && <span className="so-leitor">: {rotuloAba}</span>}</h2>
          {variasPartes && <div className="adm-partes" role="tablist" aria-label={`Partes de ${definicao.rotulo}`} onKeyDown={teclaNasPartes}>
            {definicao.abas.map(a => <button key={a.id} id={`adm-parte-${a.id}`} type="button" role="tab" aria-selected={aba === a.id} aria-controls="adm-painel" tabIndex={aba === a.id ? 0 : -1} className="adm-parte" onClick={() => trocarAba(a.id)}>
              <span>{a.rotulo}</span>{contadores[a.id] ? <b className={ALERTAS.includes(a.id) ? 'adm-parte__alerta' : ''}>{contadores[a.id]}</b> : null}
            </button>)}
          </div>}
        </div>

        <div id="adm-painel" className="empilha-2" role={variasPartes ? 'tabpanel' : undefined} aria-labelledby={variasPartes ? `adm-parte-${aba}` : undefined}>
          {erroNovo && (aba === 'agora' || aba === 'usuarios') && <p role="alert" className="adm-alerta">{erroNovo} Sem ela, usuários ativos e o ranking privado não aparecem; assinaturas, pagamentos e avaliações continuam funcionando.</p>}

          {aba === 'agora' && <AdminAgora conta={conta} resumo={resumo} usuarios={usuarios} atualizadoEm={usuariosQ.atualizadoEm} assinaturas={reais} cobrancas={cobrancasQ.dados === undefined && !cobrancasQ.erro ? null : cobrancasReais} avisoCobrancas={avisoReais} errosPagamento={errosPagamento} pendenciasConteudo={pendenciasConteudo} irPara={trocarAba} verUsuarios={abrirUsuarios} />}

          {aba === 'usuarios' && (usuarios
            ? <AdminUsuarios usuarios={usuarios} filtro={url.filtro} aoMudarFiltro={filtro => irPara({ filtro })} aoVerAgora={() => trocarAba('agora')} />
            : !usuariosQ.erro && <p role="status">Carregando usuários…</p>)}
          {aba === 'crescimento' && <AdminCrescimento usuarios={usuariosReais} assinaturas={reais ?? []} />}

          {aba === 'financeiro' && (cobrancasQ.dados === undefined && !cobrancasQ.erro
            ? <p role="status">Carregando as cobranças…</p>
            : <AdminFinanceiro assinaturas={reais ?? []} testes={testes} usuarios={resumo?.usuarios ?? usuarios?.length ?? null} reais={cobrancasReais} avisoReais={avisoReais} errosPagamento={errosPagamento} irPara={trocarAba} />)}
          {aba === 'assinaturas' && <Assinaturas linhas={assinaturas} usuarios={usuarios} />}
          {aba === 'cobrancas' && (cobrancasQ.dados === undefined && !cobrancasQ.erro
            ? <p role="status">Carregando as cobranças…</p>
            : <AdminCobrancas assinaturas={reais ?? []} reais={cobrancasReais} avisoReais={avisoReais} usuarios={usuarios} testes={testes} />)}
          {aba === 'pagamentos' && <Pagamentos eventos={eventos ?? []} usuarios={usuarios} recarregar={carregar} lidos={lidosPagamento.lidos} marcar={lidosPagamento.marcar} />}

          {/* Montada só na própria parte: o contador da navegação vem de contadores_admin. */}
          {aba === 'conteudo' && <AdminConteudo vista={vista} aoMudarVista={nova => { definirVista(nova); irPara({ vista: nova }) }} aoMudarPendencias={registrarPendencias} aoEditar={editarQuestao} />}
          {aba === 'questoes' && <AdminQuestoes idInicial={idEditar} aoAbrir={id => { definirIdEditar(id); irPara({ id }) }} />}
          {aba === 'opinioes' && <AdminOpinioesFlashcards />}
          {aba === 'simulados' && <AdminSimulados />}

          {aba === 'lembretes' && <><AdminLembretes /><AdminRelatorioMensal /><AdminEmails /></>}
          {aba === 'cartas' && <AdminCartas usuarios={usuarios} />}
          {aba === 'todas' && <AdminTodasCartas />}

          {aba === 'ajustes' && <AdminConfiguracoes />}
        </div>
      </div>
    </div>}
  </article>
}

type FiltroAssinatura = 'vigentes' | 'todas' | 'pendente' | 'falha_pagamento' | 'encerradas'
type Periodo = 'tudo' | '7' | '30' | '90' | '365'
const FILTROS_ASSINATURA: Array<[FiltroAssinatura, string]> = [
  ['vigentes', 'Com acesso'], ['todas', 'Todas'], ['pendente', 'Pendentes'],
  ['falha_pagamento', 'Falha no pagamento'], ['encerradas', 'Canceladas, expiradas e reembolsadas'],
]
const PERIODOS: Array<[Periodo, string]> = [['tudo', 'Desde sempre'], ['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['90', 'Últimos 3 meses'], ['365', 'Último ano']]
const TOM_SELO = { ok: 'adm-selo--ok', aviso: 'adm-selo--aviso', ruim: 'adm-selo--ruim', neutro: 'adm-selo--neutro' } as const

/** Financeiro › Assinaturas: quem paga, por qual meio e plano, e até quando vale o acesso. Nomes de rotulos.ts. */
function Assinaturas({ linhas, usuarios }: { linhas: LinhaAssinatura[]; usuarios: LinhaUsuario[] | null }) {
  const [filtro, definirFiltro] = useState<FiltroAssinatura>('vigentes')
  const [periodo, definirPeriodo] = useState<Periodo>('tudo')
  const [ordem, definirOrdem] = useState<'recentes' | 'antigas'>('recentes')
  const [plano, definirPlano] = useState<'todos' | 'mensal' | 'semestral' | 'anual'>('todos')
  const [meio, definirMeio] = useState<'todos' | 'pix' | 'cartao'>('todos')
  const [busca, definirBusca] = useState('')
  const [ficha, definirFicha] = useState<LinhaUsuario | null>(null)

  const passa = useCallback((a: LinhaAssinatura, f: FiltroAssinatura) =>
    f === 'todas' ? true : f === 'vigentes' ? vigente(a) : f === 'encerradas' ? !vigente(a) && ['cancelada', 'vencida', 'reembolsada', 'pausada'].includes(a.status) : a.status === f, [])

  // Período, plano e meio valem para os números dos filtros também.
  const recorte = useCallback((a: LinhaAssinatura) =>
    (periodo === 'tudo' || Date.now() - new Date(inicioDe(a)).getTime() <= Number(periodo) * 86_400_000)
    && (plano === 'todos' || a.plano === plano) && (meio === 'todos' || meioDe(a) === meio), [periodo, plano, meio])

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim())
    return linhas.filter(a => passa(a, filtro) && recorte(a) && corresponde([a.nome, a.usuario, rotuloPlano(a.plano), situacaoAssinatura(a).rotulo, rotuloMeio(meioDe(a))], termo))
      .sort((x, y) => (new Date(inicioDe(y)).getTime() - new Date(inicioDe(x)).getTime()) * (ordem === 'recentes' ? 1 : -1))
  }, [linhas, filtro, recorte, busca, ordem, passa])
  const usuarioDe = (id: string) => usuarios?.find(u => u.id_usuario === id) ?? null

  return <section className="empilha adm-secao" aria-labelledby="adm-titulo-assinaturas">
    <div className="adm-secao__cabeca"><div>
      <h2 id="adm-titulo-assinaturas">Assinaturas</h2>
      <p>Quem paga, por qual meio e plano, desde quando e até quando vale o acesso. Cartão renova sozinho; Pix é pago uma vez e termina no fim do período.</p>
    </div>
      <button type="button" className="adm-link" onClick={() => baixarCsv(`ortoquestoes-assinaturas-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Nome', 'E-mail', 'Plano', 'Meio', 'Situação', 'Assinante desde', 'Última cobrança paga', 'Data', 'Qual data', 'Cancela ao fim', 'Teste'],
        visiveis.map(a => { const p = proximaData(a); return [a.nome, a.usuario, rotuloPlano(a.plano), rotuloMeio(meioDe(a)), situacaoAssinatura(a).rotulo, data(inicioDe(a)), a.ultima_cobranca_em ? data(a.ultima_cobranca_em) : '', p.valor ? data(p.valor) : '', p.rotulo, a.cancelar_ao_fim ? 'sim' : 'não', contaDeTeste(a) ? 'sim' : ''] }))}>
        <Icone nome="baixar" tamanho={15} /> Exportar planilha
      </button>
    </div>
    <div className="adm-filtros" role="group" aria-label="Filtrar assinaturas">
      {FILTROS_ASSINATURA.map(([valor, rotulo]) => <button key={valor} type="button" className="adm-chip" aria-pressed={filtro === valor} onClick={() => definirFiltro(valor)}>{rotulo}<span>{linhas.filter(a => passa(a, valor) && recorte(a)).length}</span></button>)}
    </div>
    <div className="adm-busca adm-busca--filtros">
      <label className="campo">Buscar nome ou e-mail<input className="entrada" type="search" value={busca} onChange={e => definirBusca(e.target.value)} /></label>
      <label className="campo">Plano<select className="entrada" value={plano} onChange={e => definirPlano(e.target.value as typeof plano)}>
        <option value="todos">Todos</option><option value="mensal">Mensal</option><option value="semestral">Semestral</option><option value="anual">Anual</option>
      </select></label>
      <label className="campo">Meio<select className="entrada" value={meio} onChange={e => definirMeio(e.target.value as typeof meio)}>
        <option value="todos">Pix e cartão</option><option value="pix">Só Pix</option><option value="cartao">Só cartão</option>
      </select></label>
      <label className="campo">Assinou em<select className="entrada" value={periodo} onChange={e => definirPeriodo(e.target.value as Periodo)}>
        {PERIODOS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
      </select></label>
      <label className="campo">Ordem<select className="entrada" value={ordem} onChange={e => definirOrdem(e.target.value as 'recentes' | 'antigas')}>
        <option value="recentes">Mais recentes primeiro</option><option value="antigas">Mais antigas primeiro</option>
      </select></label>
    </div>
    <p className="adm-nota" role="status">Mostrando {visiveis.length} de {linhas.length} assinatura(s). As de teste do dono aparecem aqui com o selo "Teste" e ficam fora dos números.</p>
    {visiveis.length === 0 ? <p className="adm-vazio">Nenhuma assinatura neste filtro.</p> : <ul className="adm-cartoes">
      {visiveis.map(a => {
        const inicio = inicioDe(a)
        const s = situacaoAssinatura(a)
        const proxima = proximaData(a)
        const preco = precoDe(a.plano)
        const u = usuarioDe(a.id_usuario)
        return <li key={`${a.id_usuario}:${a.ultima_atualizacao}`} className={`adm-cartao adm-cartao--${s.tom}`}>
          <div className="adm-cartao__topo">
            <div><strong className="adm-reticencias" title={a.nome ?? a.usuario}>{a.nome ?? a.usuario}</strong>{a.nome && <span className="adm-usuario__email adm-reticencias" title={a.usuario}>{a.usuario}</span>}</div>
            <span className={`adm-selo ${TOM_SELO[s.tom]}`}>{s.rotulo}</span>
          </div>
          <div className="adm-cartao__selos">
            <span className="adm-selo adm-selo--neutro">{rotuloPlano(a.plano)}{preco ? ` · ${real(preco.total)}` : ''}</span>
            <span className={'adm-selo adm-selo--meio adm-selo--' + meioDe(a)}>{rotuloMeio(meioDe(a))}</span>
            {contaDeTeste(a) && <span className="adm-selo adm-selo--aviso">Teste</span>}
          </div>
          <dl className="adm-cartao__dados">
            <div><dt>Assinante desde</dt><dd>{data(inicio)} <small>({haQuanto(inicio)})</small></dd></div>
            <div><dt>Última cobrança paga</dt><dd>{a.ultima_cobranca_em ? data(a.ultima_cobranca_em) : '—'}</dd></div>
            <div><dt>{proxima.rotulo}</dt><dd>{data(proxima.valor)}</dd></div>
            {a.cancelada_em && <div><dt>Cancelou em</dt><dd>{data(a.cancelada_em)}</dd></div>}
          </dl>
          {s.detalhe && <small className="adm-ajuda">{s.detalhe}</small>}
          {u && <button type="button" className="adm-link adm-cartao__acao" onClick={() => definirFicha(u)}><Icone nome="usuario" tamanho={15} /> Abrir a ficha e os pagamentos</button>}
        </li>
      })}
    </ul>}
    {ficha && <AdminFichaUsuario usuario={ficha} abaInicial="pagamentos" aoFechar={() => definirFicha(null)} />}
  </section>
}

function Pagamentos({ eventos, usuarios, recarregar, lidos, marcar }: { eventos: LinhaEvento[]; usuarios: LinhaUsuario[] | null; recarregar: () => Promise<void>; lidos: Set<string>; marcar: (chaves: string[], lido?: boolean) => void }) {
  const [busca, definirBusca] = useState('')
  const [status, definirStatus] = useState<'erro' | 'todos' | 'processado' | 'ignorado' | 'recebido'>(() => eventos.some(e => e.status_processamento === 'erro' && !lidos.has(String(e.id))) ? 'erro' : 'todos')
  const [aberto, definirAberto] = useState<number | null>(null)
  const naoVistos = eventos.filter(e => e.status_processamento === 'erro' && !lidos.has(String(e.id)))
  const [reprocessando, definirReprocessando] = useState<number | null>(null)
  const [aviso, definirAviso] = useState<{ texto: string; erro: boolean } | null>(null)
  const [ficha, definirFicha] = useState<LinhaUsuario | null>(null)
  // Da parte 23 em diante cada aviso diz de quem é; antes disso a coluna não vem.
  const comDono = eventos.some(e => e.id_usuario !== undefined)
  const usuarioDe = (id: string | null | undefined) => id ? usuarios?.find(u => u.id_usuario === id) ?? null : null

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim())
    return eventos.filter(e => (status === 'todos' || e.status_processamento === status)
      && corresponde([e.id_evento, e.tipo, TIPOS_EVENTO[e.tipo ?? ''], e.id_recurso, e.erro, nomeErro(e.erro), e.nome, e.usuario], termo))
  }, [eventos, busca, status])

  // A Function responde 202 e processa depois: espera o aviso sair da fila antes de dizer o resultado.
  async function reprocessar(id: number) {
    if (reprocessando !== null) return
    if (!(await confirmar({ titulo: 'Reprocessar este aviso?', texto: 'O site consulta o Mercado Pago de novo e aplica o que ele disser sobre este pagamento. Nada é cobrado nem reembolsado.', sim: 'Reprocessar' }))) return
    definirReprocessando(id); definirAviso(null)
    const resultado = await reprocessarEvento(id, () => lerEvento(id))
    definirAviso({ texto: resultado.texto, erro: !resultado.ok })
    await recarregar()
    definirReprocessando(null)
  }

  return <section className="empilha adm-secao" aria-labelledby="adm-titulo-pagamentos">
    <div className="adm-secao__cabeca"><div>
      <h2 id="adm-titulo-pagamentos">Avisos de pagamento</h2>
      <p>Cada vez que um pagamento ou uma assinatura muda, o Mercado Pago avisa o site, e o site aplica a mudança (últimos {eventos.length} avisos). "Ignorado" é normal: são avisos que não mudam nada. Só "Precisa de atenção" pede ação. O dinheiro recebido está em Financeiro › Pagamentos.</p>
    </div></div>
    <div className="adm-filtros" role="group" aria-label="Filtrar pagamentos">
      {(['erro', 'todos', 'processado', 'ignorado', 'recebido'] as const).map(valor => <button key={valor} type="button" className="adm-chip" aria-pressed={status === valor} onClick={() => definirStatus(valor)}>{valor === 'todos' ? 'Todos' : STATUS_EVENTO[valor]}<span>{valor === 'todos' ? eventos.length : eventos.filter(e => e.status_processamento === valor).length}</span></button>)}
    </div>
    <label className="campo adm-busca__unica">{comDono ? 'Buscar pessoa, tipo, número ou erro' : 'Buscar tipo, número ou erro'}<input className="entrada" type="search" value={busca} onChange={e => definirBusca(e.target.value)} /></label>
    {!comDono && eventos.length > 0 && <p className="adm-nota">Para ver de quem é cada aviso e abrir a ficha da pessoa, cole no Supabase a {PARTE_COBRANCAS}.</p>}
    {aviso && <p role={aviso.erro ? 'alert' : 'status'} className={'adm-nota adm-mensagem' + (aviso.erro ? ' adm-mensagem--erro' : '')}>{aviso.texto}</p>}
    {status === 'erro' && naoVistos.length > 0 && <div className="adm-lidos__barra"><span>{naoVistos.length} {naoVistos.length === 1 ? 'problema não visto' : 'problemas não vistos'}</span><button type="button" className="botao botao--fantasma" onClick={() => marcar(naoVistos.map(e => String(e.id)))}><Icone nome="certo" tamanho={16} /> Marcar todos como vistos</button></div>}
    {visiveis.length === 0 ? <p className="adm-vazio">{status === 'erro' ? 'Nenhum aviso com problema.' : 'Nenhum aviso neste filtro.'}</p> : <ul className="adm-eventos">
      {visiveis.map(e => {
        const erro = e.status_processamento === 'erro'
        const visto = lidos.has(String(e.id))
        const expandido = aberto === e.id
        return <li key={e.id} className={'adm-evento' + (erro && !visto ? ' adm-evento--ruim' : '') + (expandido ? ' adm-evento--aberto' : '')}>
          <button type="button" className="adm-evento__linha" aria-expanded={expandido} onClick={() => definirAberto(expandido ? null : e.id)}>
            <span className="adm-evento__quando">{dataHora(e.recebido_em)}</span>
            <span className="adm-evento__tipo">{TIPOS_EVENTO[e.tipo ?? ''] ?? 'Aviso do Mercado Pago'}{(e.nome || e.usuario) && <small>{e.nome ?? e.usuario}</small>}{erro && e.erro ? <small>{nomeErro(e.erro)}</small> : null}</span>
            <span className={`adm-selo adm-estado--${e.status_processamento}`}>{erro && visto ? 'Visto' : STATUS_EVENTO[e.status_processamento] ?? e.status_processamento}</span>
            <Icone nome="baixo" tamanho={16} />
          </button>
          {expandido && <div className="adm-evento__detalhe">
            <dl>
              {comDono && <div><dt>Pessoa</dt><dd>{e.id_usuario ? <>{e.nome ?? e.usuario}{e.nome && e.usuario && <small className="adm-usuario__email">{e.usuario}</small>}</> : 'Não deu para ligar a uma pessoa (cobrança mensal do cartão ou aviso sem assinatura no banco).'}</dd></div>}
              <div><dt>Número no Mercado Pago</dt><dd className="numerico">{e.id_recurso ?? '—'}</dd></div>
              <div><dt>Processado em</dt><dd>{dataHora(e.processado_em)}</dd></div>
              <div><dt>Códigos técnicos</dt><dd className="adm-evento__codigo">evento {e.id_evento} · tipo {e.tipo ?? '—'}{e.erro ? ` · erro ${e.erro}` : ''}</dd></div>
            </dl>
            <div className="linha">
              {erro && <button className="botao" type="button" disabled={reprocessando !== null} aria-busy={reprocessando === e.id} onClick={() => void reprocessar(e.id)}>{reprocessando === e.id ? 'Reprocessando… aguardando o resultado' : 'Reprocessar'}</button>}
              {erro && <button className="botao botao--fantasma" type="button" onClick={() => marcar([String(e.id)], !visto)}>{visto ? 'Marcar como não visto' : 'Marcar como visto'}</button>}
              {usuarioDe(e.id_usuario) && <button className="botao botao--fantasma" type="button" onClick={() => definirFicha(usuarioDe(e.id_usuario))}><Icone nome="usuario" tamanho={16} /> Ficha e assinatura da pessoa</button>}
              {linkDoEvento(e) && <a className="botao botao--fantasma" href={linkDoEvento(e)!} target="_blank" rel="noopener noreferrer">Abrir no Mercado Pago</a>}
            </div>
          </div>}
        </li>
      })}
    </ul>}
    {ficha && <AdminFichaUsuario usuario={ficha} abaInicial="pagamentos" aoFechar={() => definirFicha(null)} />}
  </section>
}
