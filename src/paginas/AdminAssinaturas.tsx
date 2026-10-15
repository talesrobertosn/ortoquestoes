import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { confirmar } from '../componentes/Confirmar'
import { AdminFichaUsuario } from '../componentes/admin/AdminFichaUsuario'
import { PARTE_COBRANCAS, lerEvento, linkDoEvento, reprocessarEvento, type EventoPagamento } from '../componentes/admin/pagamentos'
import { href, navegar } from '../util/rotas'
import { Icone } from '../componentes/Icone'
import { AdminConteudo, type VistaConteudo } from '../componentes/admin/AdminConteudo'
import { AdminQuestoes } from '../componentes/admin/AdminQuestoes'
import { AdminCrescimento } from '../componentes/admin/AdminCrescimento'
import { AdminConfiguracoes } from '../componentes/admin/AdminConfiguracoes'
import { AdminLembretes } from '../componentes/admin/AdminLembretes'
import { AdminRelatorioMensal } from '../componentes/admin/AdminRelatorioMensal'
import { AdminEmails } from '../componentes/admin/AdminEmails'
import { AdminSimulados } from '../componentes/admin/AdminSimulados'
import { SECOES, abaPadrao, definicaoDe, lerUrl, secaoDe, urlAntiga, urlDe, type Aba, type EstadoUrl, type Secao } from '../componentes/admin/secoes'
import { AdminUsuarios, ativoHoje, type FiltroUsuarios, type LinhaUsuario } from '../componentes/admin/AdminUsuarios'
import { AdminFinanceiro } from '../componentes/admin/AdminFinanceiro'
import { AdminOpinioesFlashcards } from '../componentes/admin/AdminOpinioesFlashcards'
import { contaDeTeste } from '../componentes/admin/contasTeste'
import { meioDe } from '../componentes/admin/receita'
import { usarLidos } from '../componentes/admin/lidos'
import { usarRpc } from '../componentes/admin/usarRpc'
import { usarContadoresAdmin } from '../componentes/admin/contadores'
import {
  PLANOS, STATUS_ASSINATURA, STATUS_EVENTO, TIPOS_EVENTO, baixarCsv, corresponde, data, dataHora, erroDoPainel, haQuanto, nomeErro, normalizar,
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
interface Resumo {
  online_agora: number
  usuarios: number; novos_7d: number
  ativos_hoje: number; ativos_7d: number; ativos_30d: number
  respondidas_hoje: number; respondidas_7d: number
  assinantes_vigentes: number
}

const MIGRACAO = '202609290100_painel_admin.sql'

/** Assinatura que dá acesso agora (em dia, ou cancelada que ainda vale até o fim do período). */
const vigente = (a: LinhaAssinatura) =>
  (a.status === 'ativa' || (a.status === 'cancelada' && !!a.cancelar_ao_fim)) && (!a.fim_periodo || new Date(a.fim_periodo) > new Date())
const inicioDe = (a: LinhaAssinatura) => a.criada_em ?? a.inicio_periodo ?? a.ultima_atualizacao

/** Partes cujo número é um alerta (vermelho); ele também sobe para a seção. */
const ALERTAS: Aba[] = ['pagamentos', 'conteudo']

/** Painel do administrador: cinco seções (Hoje, Pessoas, Receita, Conteúdo, Operações), cada uma com as suas partes. */
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
  // Cada seção lembra a última parte aberta: voltar a Receita reabre Pagamentos, se era lá.
  const [ultimaParte, definirUltimaParte] = useState<Partial<Record<Secao, Aba>>>({})
  useEffect(() => { definirUltimaParte(antes => antes[secao] === aba ? antes : { ...antes, [secao]: aba }) }, [secao, aba])
  // Cada consulta tem um dono só e fica em cache (usarRpc): trocar de seção não pede de novo,
  // clique duplo não duplica, e a lista pesada de usuários só vem para as partes que a mostram.
  const conta = sessao?.user.id
  const assinaturasQ = usarRpc<LinhaAssinatura[]>(conta, 'listar_assinaturas_admin')
  const eventosQ = usarRpc<LinhaEvento[]>(conta, 'listar_eventos_pagamento_admin')
  const resumoQ = usarRpc<Resumo[]>(conta, 'resumo_admin')
  const contadoresQ = usarContadoresAdmin(conta)
  // Sem a RPC leve (parte 22 ainda não colada), o número de contas sai da própria lista.
  const semContadores = !!contadoresQ.erro || !!contadoresQ.dados?.derivado
  const usuariosQ = usarRpc<LinhaUsuario[]>(conta, 'listar_usuarios_admin', {}, {
    // Só Hoje, Pessoas › Usuários e Pessoas › Crescimento mostram a lista.
    ativo: aba === 'hoje' || aba === 'usuarios' || aba === 'crescimento' || semContadores,
    // "Ao vivo" só em Pessoas › Usuários e com a aba do navegador visível.
    atualizarCada: aba === 'usuarios' ? 30_000 : undefined,
    prazoMs: 20_000,
  })
  const assinaturas = assinaturasQ.dados ?? null
  const eventos = eventosQ.dados ?? null
  const usuarios = usuariosQ.dados ?? null
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
  // Compras de teste do dono ficam fora das estatísticas; a lista completa continua em Receita › Assinaturas.
  const reais = useMemo(() => assinaturas?.filter(a => !contaDeTeste(a)) ?? null, [assinaturas])
  const testes = (assinaturas?.length ?? 0) - (reais?.length ?? 0)
  const usuariosReais = useMemo(() => usuarios?.filter(u => !contaDeTeste({ nome: u.nome, usuario: u.email })) ?? null, [usuarios])

  // Um clique por vez: o botão fica ocupado e os pedidos em voo são reaproveitados.
  const atualizando = assinaturasQ.carregando || eventosQ.carregando || resumoQ.carregando || usuariosQ.carregando || contadoresQ.carregando
  const { recarregar: recAssinaturas } = assinaturasQ
  const { recarregar: recEventos } = eventosQ
  const { recarregar: recResumo } = resumoQ
  const { recarregar: recUsuarios } = usuariosQ
  const { recarregar: recContadores } = contadoresQ
  const carregar = useCallback(async () => {
    await Promise.all([recAssinaturas(), recEventos(), recResumo(), recUsuarios(), recContadores()])
  }, [recAssinaturas, recEventos, recResumo, recUsuarios, recContadores])
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
      <button className="botao adm-heroi__atualizar" type="button" onClick={() => void carregar()} disabled={atualizando} aria-busy={atualizando}><Icone nome="reiniciar" tamanho={16} /> {atualizando ? 'Atualizando…' : 'Atualizar'}</button>
    </header>

    {/* Falha ao atualizar não derruba o painel: o aviso aparece em cima dos dados que já estavam na tela. */}
    {erroAcesso && <p role="alert" className="adm-alerta">{erroAcesso}{assinaturas !== null && ' Os dados abaixo são da última atualização.'}</p>}
    {assinaturas === null ? (!erroAcesso && <p role="status">Carregando o painel…</p>) : <div className="adm-corpo">
      {/* Computador: coluna à esquerda. Celular: barra presa embaixo da tela. */}
      <nav className="adm-nav" aria-label="Seções do painel">
        <ul>
          {SECOES.map(s => {
            const alertas = alertasDa(s.id)
            const numero = s.id === 'pessoas' ? contadores.usuarios : undefined
            const destino = destinoDaSecao(s.id)
            return <li key={s.id}>
              <a className="adm-nav__item" href={href(urlDe({ ...url, vista, id: idEditar, aba: destino, filtro: 'todos' }))}
                aria-current={secao === s.id ? 'page' : undefined}
                onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); trocarAba(destino) }}>
                <span className="adm-nav__icone"><Icone nome={s.icone} tamanho={20} />{alertas > 0 && <i className="adm-nav__ponto" aria-hidden="true" />}</span>
                <span className="adm-nav__rotulo">{s.rotulo}</span>
                {alertas > 0 ? <b className="adm-nav__numero adm-nav__numero--alerta">{alertas}<span className="so-leitor"> para ver</span></b>
                  : numero ? <b className="adm-nav__numero">{numero}</b> : null}
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
          {erroNovo && (aba === 'hoje' || aba === 'usuarios') && <p role="alert" className="adm-alerta">{erroNovo} Sem ela, usuários ativos e o ranking privado não aparecem; assinaturas, pagamentos e avaliações continuam funcionando.</p>}

          {aba === 'hoje' && <Hoje resumo={resumo} usuarios={usuarios} assinaturas={reais ?? []} errosPagamento={errosPagamento} mensagens={pendenciasConteudo} irPara={trocarAba} verUsuarios={abrirUsuarios} />}

          {aba === 'usuarios' && (usuarios
            ? <AdminUsuarios usuarios={usuarios} atualizadoEm={usuariosQ.atualizadoEm} filtro={url.filtro} aoMudarFiltro={filtro => irPara({ filtro })} />
            : !usuariosQ.erro && <p role="status">Carregando usuários…</p>)}
          {aba === 'crescimento' && <AdminCrescimento usuarios={usuariosReais} assinaturas={reais ?? []} />}

          {aba === 'financeiro' && <AdminFinanceiro assinaturas={reais ?? []} testes={testes} usuarios={resumo?.usuarios ?? usuarios?.length ?? null} />}
          {aba === 'assinaturas' && <Assinaturas linhas={assinaturas} />}
          {aba === 'pagamentos' && <Pagamentos eventos={eventos ?? []} usuarios={usuarios} recarregar={carregar} lidos={lidosPagamento.lidos} marcar={lidosPagamento.marcar} />}

          {/* Montada só na própria parte: o contador da navegação vem de contadores_admin. */}
          {aba === 'conteudo' && <AdminConteudo vista={vista} aoMudarVista={nova => { definirVista(nova); irPara({ vista: nova }) }} aoMudarPendencias={registrarPendencias} aoEditar={editarQuestao} />}
          {aba === 'questoes' && <AdminQuestoes idInicial={idEditar} aoAbrir={id => { definirIdEditar(id); irPara({ id }) }} />}
          {aba === 'opinioes' && <AdminOpinioesFlashcards />}

          {aba === 'lembretes' && <><AdminLembretes /><AdminRelatorioMensal /><AdminEmails /></>}
          {aba === 'simulados' && <AdminSimulados />}
          {aba === 'ajustes' && <AdminConfiguracoes />}
        </div>
      </div>
    </div>}
  </article>
}

/** Seção Hoje: números do dia e o que pede atenção, cada um com atalho para a parte certa. */
function Hoje({ resumo, usuarios, assinaturas, errosPagamento, mensagens, irPara, verUsuarios }: {
  resumo: Resumo | null; usuarios: LinhaUsuario[] | null; assinaturas: LinhaAssinatura[]
  errosPagamento: number; mensagens: number | null; irPara: (aba: Aba) => void; verUsuarios: (filtro: FiltroUsuarios) => void
}) {
  // Recalculados só quando a lista muda (antes, a cada render do painel).
  const { hoje, novos, semana } = useMemo(() => {
    const lista = usuarios ?? []
    return {
      hoje: lista.filter(ativoHoje).sort((a, b) => new Date(b.ultima_atividade ?? 0).getTime() - new Date(a.ultima_atividade ?? 0).getTime()),
      novos: lista.filter(u => Date.now() - new Date(u.criado_em).getTime() < 14 * 86_400_000).sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()),
      semana: lista.filter(u => u.respondidas_7d > 0).sort((a, b) => b.respondidas_7d - a.respondidas_7d).slice(0, 5),
    }
  }, [usuarios])
  const vigentes = useMemo(() => assinaturas.filter(vigente), [assinaturas])
  const novasAssinaturas = useMemo(() => [...assinaturas].sort((a, b) => new Date(inicioDe(b)).getTime() - new Date(inicioDe(a)).getTime()).slice(0, 4), [assinaturas])
  const n = (valor: number | undefined) => valor === undefined ? '—' : valor.toLocaleString('pt-BR')

  return <div className="empilha-2">
    <section className="adm-kpis" aria-label="Números principais">
      <button type="button" className="adm-kpi adm-kpi--botao adm-kpi--online" onClick={() => irPara('usuarios')}><span><i className="adm-online" aria-hidden="true" /> Online agora</span><strong>{n(resumo?.online_agora)}</strong><small>com a conta aberta nos últimos 3 minutos</small></button>
      <button type="button" className="adm-kpi adm-kpi--botao adm-kpi--destaque" onClick={() => verUsuarios('novos')}><span>Usuários cadastrados</span><strong>{n(resumo?.usuarios)}</strong><small>{resumo ? `+${resumo.novos_7d} nos últimos 7 dias · ver quem chegou` : 'rode a migração nova'}</small></button>
      <button type="button" className="adm-kpi adm-kpi--botao" onClick={() => verUsuarios('hoje')}><span>Ativos hoje</span><strong>{n(resumo?.ativos_hoje)}</strong><small>toque para ver os nomes</small></button>
      <button type="button" className="adm-kpi adm-kpi--botao" onClick={() => verUsuarios('ativos')}><span>Ativos na semana</span><strong>{n(resumo?.ativos_7d)}</strong><small>{resumo ? `${n(resumo.ativos_30d)} nos últimos 30 dias · ver nomes` : ''}</small></button>
      <div className="adm-kpi"><span>Questões respondidas</span><strong>{n(resumo?.respondidas_hoje)}</strong><small>{resumo ? `hoje · ${n(resumo.respondidas_7d)} na semana` : 'hoje'}</small></div>
      <div className="adm-kpi"><span>Assinantes com acesso</span><strong>{vigentes.length}</strong><small>{assinaturas.length} assinatura(s) no histórico</small></div>
      <button type="button" className={'adm-kpi adm-kpi--botao' + (errosPagamento ? ' adm-kpi--alerta' : '')} onClick={() => irPara('pagamentos')}><span>Pagamentos com problema</span><strong>{errosPagamento}</strong><small>{errosPagamento ? 'toque para revisar' : 'tudo certo'}</small></button>
      <button type="button" className={'adm-kpi adm-kpi--botao' + (mensagens ? ' adm-kpi--alerta' : '')} onClick={() => irPara('conteudo')}><span>Conteúdo para revisar</span><strong>{mensagens ?? '—'}</strong><small>relatos de erro e "não ajudou" com texto</small></button>
    </section>

    <div className="adm-duas">
      <section className="adm-secao empilha">
        <div className="adm-secao__cabeca"><h2>Estudaram hoje <span className="adm-contagem">{hoje.length}</span></h2><button type="button" className="adm-link" onClick={() => verUsuarios('hoje')}>Ver todos <Icone nome="direita" tamanho={14} /></button></div>
        {!usuarios ? <p className="adm-vazio">Disponível depois da migração nova.</p> : hoje.length === 0 ? <p className="adm-vazio">Ninguém respondeu questões hoje ainda.</p> : <ol className="adm-mini">
          {hoje.slice(0, 8).map(u => <li key={u.id_usuario}><span className="adm-mini__nome"><span>{u.online && <i className="adm-online" aria-label="Online agora" />}{u.nome ?? u.email}</span><small>{[u.servico, haQuanto(u.ultima_atividade)].filter(Boolean).join(' · ')}</small></span><span className="adm-mini__valor numerico">{u.respondidas_7d}<small>na semana</small></span></li>)}
        </ol>}
      </section>
      <section className="adm-secao empilha">
        <div className="adm-secao__cabeca"><h2>Recém-cadastrados <span className="adm-contagem">{novos.length}</span></h2><button type="button" className="adm-link" onClick={() => verUsuarios('novos_parados')}>Quem parou <Icone nome="direita" tamanho={14} /></button></div>
        {!usuarios ? <p className="adm-vazio">Disponível depois da migração nova.</p> : novos.length === 0 ? <p className="adm-vazio">Ninguém se cadastrou nas últimas duas semanas.</p> : <ol className="adm-mini">
          {novos.slice(0, 8).map(u => <li key={u.id_usuario}><span className="adm-mini__nome">{u.nome ?? u.email}<small>{[u.servico, `chegou ${haQuanto(u.criado_em)}`].filter(Boolean).join(' · ')}</small></span><span className={'adm-selo ' + (u.respondidas === 0 ? 'adm-selo--ruim' : u.respondidas < 10 ? 'adm-selo--neutro' : 'adm-selo--ok')}>{u.respondidas === 0 ? 'não começou' : `${u.respondidas} questões`}</span></li>)}
        </ol>}
      </section>
    </div>

    <div className="adm-duas">
      <section className="adm-secao empilha">
        <div className="adm-secao__cabeca"><h2>Mais ativos na semana</h2><button type="button" className="adm-link" onClick={() => irPara('usuarios')}>Ver todos <Icone nome="direita" tamanho={14} /></button></div>
        {!usuarios ? <p className="adm-vazio">Disponível depois da migração nova.</p> : semana.length === 0 ? <p className="adm-vazio">Ninguém respondeu questões nos últimos 7 dias.</p> : <ol className="adm-mini">
          {semana.map(u => <li key={u.id_usuario}><span className="adm-mini__nome">{u.nome ?? u.email}</span><span className="adm-mini__valor numerico">{u.respondidas_7d}</span></li>)}
        </ol>}
      </section>
      <section className="adm-secao empilha">
        <div className="adm-secao__cabeca"><h2>Assinaturas recentes</h2><button type="button" className="adm-link" onClick={() => irPara('assinaturas')}>Ver todas <Icone nome="direita" tamanho={14} /></button></div>
        {novasAssinaturas.length === 0 ? <p className="adm-vazio">Nenhuma assinatura ainda.</p> : <ol className="adm-mini">
          {novasAssinaturas.map(a => <li key={`${a.id_usuario}:${a.ultima_atualizacao}`}><span className="adm-mini__nome">{a.nome ?? a.usuario}<small>{PLANOS[a.plano] ?? a.plano} · {STATUS_ASSINATURA[a.status] ?? a.status}</small></span><span className="adm-mini__valor">{haQuanto(inicioDe(a))}</span></li>)}
        </ol>}
      </section>
    </div>
  </div>
}

type FiltroAssinatura = 'vigentes' | 'todas' | 'pendente' | 'falha_pagamento' | 'encerradas'
type Periodo = 'tudo' | '7' | '30' | '90' | '365'
const FILTROS_ASSINATURA: Array<[FiltroAssinatura, string]> = [
  ['vigentes', 'Pagantes com acesso'], ['todas', 'Todas'], ['pendente', 'Aguardando pagamento'],
  ['falha_pagamento', 'Falha no pagamento'], ['encerradas', 'Canceladas e encerradas'],
]
const PERIODOS: Array<[Periodo, string]> = [['tudo', 'Desde sempre'], ['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['90', 'Últimos 3 meses'], ['365', 'Último ano']]

function Assinaturas({ linhas }: { linhas: LinhaAssinatura[] }) {
  const [filtro, definirFiltro] = useState<FiltroAssinatura>('vigentes')
  const [periodo, definirPeriodo] = useState<Periodo>('tudo')
  const [ordem, definirOrdem] = useState<'recentes' | 'antigas'>('recentes')
  const [busca, definirBusca] = useState('')

  const passa = useCallback((a: LinhaAssinatura, f: FiltroAssinatura) =>
    f === 'todas' ? true : f === 'vigentes' ? vigente(a) : f === 'encerradas' ? !vigente(a) && ['cancelada', 'vencida', 'reembolsada', 'pausada'].includes(a.status) : a.status === f, [])

  const noPeriodo = useCallback((a: LinhaAssinatura) =>
    periodo === 'tudo' || Date.now() - new Date(inicioDe(a)).getTime() <= Number(periodo) * 86_400_000, [periodo])

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim())
    return linhas.filter(a => passa(a, filtro) && noPeriodo(a) && corresponde([a.nome, a.usuario, PLANOS[a.plano], STATUS_ASSINATURA[a.status]], termo))
      .sort((x, y) => (new Date(inicioDe(y)).getTime() - new Date(inicioDe(x)).getTime()) * (ordem === 'recentes' ? 1 : -1))
  }, [linhas, filtro, noPeriodo, busca, ordem, passa])

  return <section className="empilha adm-secao" aria-labelledby="adm-titulo-assinaturas">
    <div className="adm-secao__cabeca"><div>
      <h2 id="adm-titulo-assinaturas">Assinaturas</h2>
      <p>Quem paga, desde quando e até quando vale o acesso.</p>
    </div></div>
    <div className="adm-filtros" role="group" aria-label="Filtrar assinaturas">
      {FILTROS_ASSINATURA.map(([valor, rotulo]) => <button key={valor} type="button" className="adm-chip" aria-pressed={filtro === valor} onClick={() => definirFiltro(valor)}>{rotulo}<span>{linhas.filter(a => passa(a, valor) && noPeriodo(a)).length}</span></button>)}
    </div>
    <div className="adm-busca adm-busca--tres">
      <label className="campo">Buscar nome ou e-mail<input className="entrada" type="search" value={busca} onChange={e => definirBusca(e.target.value)} /></label>
      <label className="campo">Assinou em<select className="entrada" value={periodo} onChange={e => definirPeriodo(e.target.value as Periodo)}>
        {PERIODOS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
      </select></label>
      <label className="campo">Ordem<select className="entrada" value={ordem} onChange={e => definirOrdem(e.target.value as 'recentes' | 'antigas')}>
        <option value="recentes">Mais recentes primeiro</option><option value="antigas">Mais antigas primeiro</option>
      </select></label>
    </div>
    <div className="adm-linha-nota">
      <p className="adm-nota" role="status">Mostrando {visiveis.length} de {linhas.length} assinatura(s).</p>
      <button type="button" className="adm-link" onClick={() => baixarCsv(`ortoquestoes-assinaturas-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Nome', 'E-mail', 'Plano', 'Status', 'Assinante desde', 'Última cobrança paga', 'Acesso até', 'Cancela ao fim'],
        visiveis.map(a => [a.nome, a.usuario, PLANOS[a.plano] ?? a.plano, STATUS_ASSINATURA[a.status] ?? a.status, data(inicioDe(a)), a.ultima_cobranca_em ? data(a.ultima_cobranca_em) : '', a.fim_periodo ? data(a.fim_periodo) : '', a.cancelar_ao_fim ? 'sim' : 'não']))}>
        <Icone nome="baixar" tamanho={15} /> Exportar planilha
      </button>
    </div>
    {visiveis.length === 0 ? <p className="adm-vazio">Nenhuma assinatura neste filtro.</p> : <ul className="adm-cartoes">
      {visiveis.map(a => {
        const inicio = inicioDe(a)
        return <li key={`${a.id_usuario}:${a.ultima_atualizacao}`} className={'adm-cartao' + (vigente(a) ? ' adm-cartao--ok' : a.status === 'falha_pagamento' ? ' adm-cartao--ruim' : '')}>
          <div className="adm-cartao__topo">
            <div><strong>{a.nome ?? a.usuario}</strong>{a.nome && <span className="adm-usuario__email">{a.usuario}</span>}</div>
            <span>{contaDeTeste(a) && <span className="adm-selo">Teste</span>} <span className="adm-selo adm-selo--neutro">{meioDe(a) === 'pix' ? 'Pix' : 'Cartão'}</span> <span className={`adm-selo adm-estado--${a.status}`}>{STATUS_ASSINATURA[a.status] ?? a.status}</span></span>
          </div>
          <dl className="adm-cartao__dados">
            <div><dt>Plano</dt><dd>{PLANOS[a.plano] ?? a.plano}</dd></div>
            <div><dt>Assinante desde</dt><dd>{data(inicio)} <small>({haQuanto(inicio)})</small></dd></div>
            <div><dt>Última cobrança paga</dt><dd>{a.ultima_cobranca_em !== undefined ? data(a.ultima_cobranca_em) : '—'}</dd></div>
            <div><dt>{a.cancelar_ao_fim || a.status === 'cancelada' || meioDe(a) === 'pix' ? 'Acesso até' : 'Próxima cobrança'}</dt><dd>{data(a.proxima_cobranca ?? a.fim_periodo)}</dd></div>
          </dl>
          {a.status === 'falha_pagamento' && <small className="adm-ajuda">A cobrança não foi confirmada. Veja Receita › Pagamentos e o Mercado Pago.</small>}
          {a.cancelar_ao_fim && a.status !== 'cancelada' && a.status !== 'reembolsada' && <small className="adm-ajuda">{meioDe(a) === 'pix' ? 'Pago no Pix: não renova sozinho; o acesso vale até o fim do período pago.' : 'Pediu cancelamento: o acesso vale até o fim do período pago.'}</small>}
        </li>
      })}
    </ul>}
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
      <h2 id="adm-titulo-pagamentos">Pagamentos</h2>
      <p>Avisos que o Mercado Pago mandou para o site (últimos {eventos.length}). "Ignorado" é normal: são avisos que não mudam nada. Só "Precisa de atenção" pede ação.</p>
    </div></div>
    <div className="adm-filtros" role="group" aria-label="Filtrar pagamentos">
      {(['erro', 'todos', 'processado', 'ignorado', 'recebido'] as const).map(valor => <button key={valor} type="button" className="adm-chip" aria-pressed={status === valor} onClick={() => definirStatus(valor)}>{valor === 'todos' ? 'Todos' : STATUS_EVENTO[valor]}<span>{valor === 'todos' ? eventos.length : eventos.filter(e => e.status_processamento === valor).length}</span></button>)}
    </div>
    <label className="campo adm-busca__unica">{comDono ? 'Buscar por pessoa, tipo, número ou erro' : 'Buscar por tipo, número ou erro'}<input className="entrada" type="search" value={busca} onChange={e => definirBusca(e.target.value)} /></label>
    {!comDono && eventos.length > 0 && <p className="adm-nota">Para ver de quem é cada aviso e abrir a ficha da pessoa, cole no Supabase a {PARTE_COBRANCAS}.</p>}
    {aviso && <p role={aviso.erro ? 'alert' : 'status'} className={'adm-nota adm-mensagem' + (aviso.erro ? ' adm-mensagem--erro' : '')}>{aviso.texto}</p>}
    {status === 'erro' && naoVistos.length > 0 && <div className="adm-lidos__barra"><span>{naoVistos.length} {naoVistos.length === 1 ? 'problema não visto' : 'problemas não vistos'}</span><button type="button" className="botao botao--fantasma" onClick={() => marcar(naoVistos.map(e => String(e.id)))}><Icone nome="certo" tamanho={16} /> Marcar todos como vistos</button></div>}
    {visiveis.length === 0 ? <p className="adm-vazio">{status === 'erro' ? 'Nenhum pagamento com problema.' : 'Nenhum aviso neste filtro.'}</p> : <ul className="adm-eventos">
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
              {usuarioDe(e.id_usuario) && <button className="botao botao--fantasma" type="button" onClick={() => definirFicha(usuarioDe(e.id_usuario))}><Icone nome="usuario" tamanho={16} /> Assinatura da pessoa</button>}
              {linkDoEvento(e) && <a className="botao botao--fantasma" href={linkDoEvento(e)!} target="_blank" rel="noopener noreferrer">Abrir no Mercado Pago</a>}
            </div>
          </div>}
        </li>
      })}
    </ul>}
    {ficha && <AdminFichaUsuario usuario={ficha} abaInicial="pagamentos" aoFechar={() => definirFicha(null)} />}
  </section>
}
