import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { PARTE_COBRANCAS, codigoDaFalha, funcaoAusente, type EventoPagamento } from '../componentes/admin/pagamentos'
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
import { GuiaEmails } from '../componentes/admin/GuiaEmails'
import { AdminSimulados } from '../componentes/admin/AdminSimulados'
import {
  ROTULO_MODO, SECOES, abaPadrao, definicaoDe, lerUrl, parteDe, secaoDe, urlAntiga, urlDe,
  type Aba, type EstadoUrl, type Periodo, type Secao,
} from '../componentes/admin/secoes'
import { AdminUsuarios, estaOnline, type FiltroUsuarios, type LinhaUsuario } from '../componentes/admin/AdminUsuarios'
import { AdminAgora, type ResumoAdmin } from '../componentes/admin/AdminAgora'
import { AdminComando, type Destino } from '../componentes/admin/AdminComando'
import { AdminFinanceiro } from '../componentes/admin/AdminFinanceiro'
import { AdminReceitaPeriodo } from '../componentes/admin/AdminReceitaPeriodo'
import { AdminCobrancas } from '../componentes/admin/AdminCobrancas'
import { AdminExportar } from '../componentes/admin/AdminExportar'
import { AdminListaAssinaturas, type LinhaAssinatura } from '../componentes/admin/AdminListaAssinaturas'
import { AdminAvisosProcessador } from '../componentes/admin/AdminAvisosProcessador'
import type { CobrancaReal } from '../componentes/admin/receita'
import { AdminOpinioesFlashcards } from '../componentes/admin/AdminOpinioesFlashcards'
import { contaDeTeste } from '../componentes/admin/contasTeste'
import { vigentesPorPessoa } from '../componentes/admin/receita'
import { usarLidos } from '../componentes/admin/lidos'
import { CINCO_MIN, usarRpc } from '../componentes/admin/usarRpc'
import { usarContadoresAdmin } from '../componentes/admin/contadores'
import { Atualizado } from '../componentes/admin/PainelDados'
import { erroDoPainel } from '../componentes/admin/formatos'
import '../estilos/paginas/AdminAssinaturas.css'
import '../estilos/paginas/AdminPainel.css'

type LinhaEvento = EventoPagamento
type Resumo = ResumoAdmin

const MIGRACAO = '202609290100_painel_admin.sql'

/** Partes cujo número é um alerta (vermelho); ele também sobe para a área. */
const ALERTAS: Aba[] = ['pagamentos', 'conteudo']

/**
 * Painel do administrador, "Mesa de Comando do Atlas" (01/11/2026, docs/admin/RECONSTRUCAO-2026-11.md).
 * Seis áreas (Comando, Pessoas, Estudo, Receita, Comunicação, Configurações), cada uma com as suas partes.
 * Barra fina no topo (trilha, atualizado, Atualizar, Exportar); navegação lateral em dois níveis no computador
 * e barra inferior com as áreas no celular, com as partes num trilho rolável acima do conteúdo.
 * Cada parte abre com o modo (ver, investigar, agir) e a pergunta que responde.
 */
export function AdminAssinaturas({ consulta }: { consulta: URLSearchParams }) {
  const { sessao } = usarConta()
  // Lido do endereço a cada render: Voltar, F5 e links externos (hashchange) já chegam aqui pelo App.
  const url = lerUrl(consulta)
  const { aba } = url
  const secao = secaoDe(aba)
  const parte = parteDe(aba)
  // Endereço antigo (?aba=geral, ?aba=configuracoes…): reescreve no formato novo sem criar histórico.
  const antiga = urlAntiga(consulta)
  const destinoNovo = urlDe(url)
  useEffect(() => { if (antiga) navegar(destinoNovo, true) }, [antiga, destinoNovo])
  // Vista e questão ficam lembradas fora da parte: voltar à Triagem ou ao editor reabre onde estava.
  const [vista, definirVista] = useState<VistaConteudo>(url.vista)
  const [idEditar, definirIdEditar] = useState<string | null>(url.id)
  useEffect(() => { if (aba === 'conteudo') definirVista(url.vista) }, [aba, url.vista])
  useEffect(() => { if (aba === 'questoes' && url.id) definirIdEditar(url.id) }, [aba, url.id])
  // Cada área lembra a última parte aberta: voltar a Receita reabre Avisos, se era lá.
  const [ultimaParte, definirUltimaParte] = useState<Partial<Record<Secao, Aba>>>({})
  useEffect(() => { definirUltimaParte(antes => antes[secao] === aba ? antes : { ...antes, [secao]: aba }) }, [secao, aba])

  // Cada consulta tem um dono só e fica em cache (usarRpc): trocar de parte não pede de novo,
  // clique duplo não duplica, e a lista pesada de usuários só vem para as partes que a mostram.
  const conta = sessao?.user.id
  const assinaturasQ = usarRpc<LinhaAssinatura[]>(conta, 'listar_assinaturas_admin')
  const eventosQ = usarRpc<LinhaEvento[]>(conta, 'listar_eventos_pagamento_admin')
  const resumoQ = usarRpc<Resumo[]>(conta, 'resumo_admin', {}, { atualizarCada: aba === 'agora' || aba === 'comando' ? CINCO_MIN : undefined })
  const contadoresQ = usarContadoresAdmin(conta)
  // Sem a RPC leve (parte 22 ainda não colada), o número de contas sai da própria lista.
  const semContadores = !!contadoresQ.erro || !!contadoresQ.dados?.derivado
  const usuariosQ = usarRpc<LinhaUsuario[]>(conta, 'listar_usuarios_admin', {}, {
    // Comando, Hoje, Explorador, Análise e Campanhas mostram a lista; Assinaturas, Cobranças e Avisos usam para abrir a ficha.
    ativo: ['comando', 'agora', 'usuarios', 'crescimento', 'lembretes', 'assinaturas', 'cobrancas', 'pagamentos'].includes(aba) || semContadores,
    // "Ao vivo" no Comando, em Hoje e no Explorador, com a aba do navegador visível.
    atualizarCada: aba === 'usuarios' || aba === 'agora' || aba === 'comando' ? CINCO_MIN : undefined,
    prazoMs: 20_000,
  })
  // Cobranças gravadas no banco (parte 23): Comando, Resultados, Cobranças e Hoje leem da mesma consulta.
  // Sem a RPC, Resultados e Cobranças estimam pelos planos; o Comando não mistura estimativa com confirmado.
  const cobrancasQ = usarRpc<CobrancaReal[]>(conta, 'cobrancas_admin', {}, { ativo: ['comando', 'financeiro', 'cobrancas', 'agora'].includes(aba) })
  const cobrancasReais = cobrancasQ.erro ? null : cobrancasQ.dados ?? null
  const cobrancasCarregando = cobrancasQ.dados === undefined && !cobrancasQ.erro
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
  // Pendências de conteúdo: a RPC leve dá o número; com a Triagem aberta, vale o que ela acabou de contar
  // (resolver um relato baixa na hora). O mais recente dos dois ganha.
  const [pendenciasAoVivo, definirPendenciasAoVivo] = useState<{ valor: number; em: number } | null>(null)
  const registrarPendencias = useCallback((valor: number) => definirPendenciasAoVivo({ valor, em: Date.now() }), [])
  const pendenciasConteudo = pendenciasAoVivo && pendenciasAoVivo.em >= (contadoresQ.atualizadoEm ?? 0) ? pendenciasAoVivo.valor : contadoresQ.dados?.conteudo ?? null
  const lidosPagamento = usarLidos('pagamento')
  // Compras de teste do dono ficam fora das estatísticas; a lista completa continua em Receita › Assinaturas.
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
  // O "atualizado" do topo é o da consulta mais antiga entre as que a parte usa (a de assinaturas vale para todas).
  const atualizadoEm = assinaturasQ.atualizadoEm ?? null
  // Saindo da Triagem, o contador volta a vir do servidor já com o que foi resolvido lá.
  const abaAnterior = useRef(aba)
  useEffect(() => {
    if (abaAnterior.current === 'conteudo' && aba !== 'conteudo') void recContadores()
    abaAnterior.current = aba
  }, [aba, recContadores])
  // No celular as partes rolam de lado: a escolhida precisa ficar à vista.
  useEffect(() => {
    document.querySelector('.adm-partes [aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [aba, assinaturas !== null])

  // Trocar de parte cria entrada no histórico (Voltar volta à anterior);
  // filtro, vista, questão e período dentro da mesma parte só substituem o endereço.
  function irPara(mudanca: Partial<EstadoUrl>) {
    const novo = { ...url, vista, id: idEditar, ...mudanca }
    const outraAba = novo.aba !== aba
    navegar(urlDe(novo), !outraAba)
    if (outraAba) window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const trocarAba = (nova: Aba) => irPara({ aba: nova, filtro: 'todos' })
  // Destinos vindos da fila de atenção e dos atalhos do Comando passam pela mesma validação do endereço.
  const irParaDestino = (d: Destino) => {
    const consultaDestino = new URLSearchParams({ aba: d.aba, ...(d.filtro ? { filtro: d.filtro } : {}), ...(d.vista ? { vista: d.vista } : {}) })
    const lido = lerUrl(consultaDestino)
    if (lido.aba === 'conteudo') definirVista(lido.vista)
    irPara({ aba: lido.aba, filtro: lido.filtro, ...(d.vista ? { vista: lido.vista } : {}) })
  }
  const mudarPeriodo = (periodo: Periodo) => irPara({ periodo })
  // Tocar na área em que já se está volta à primeira parte dela; em outra, reabre a última parte vista lá.
  const destinoDaSecao = (s: Secao): Aba => s === secao ? abaPadrao(s) : ultimaParte[s] ?? abaPadrao(s)
  const abrirUsuarios = (filtro: FiltroUsuarios) => irPara({ aba: 'usuarios', filtro })
  const editarQuestao = (id: string) => { definirIdEditar(id); irPara({ aba: 'questoes', id }) }
  const hrefDe = (a: Aba) => href(urlDe({ ...url, vista, id: idEditar, aba: a, filtro: 'todos' }))
  // Clique simples navega pelo histórico do painel; Ctrl/Cmd/Shift/meio abrem em outra aba normalmente.
  const cliqueNavega = (destino: Aba) => (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault(); trocarAba(destino)
  }

  if (!sessao) return <article className="empilha limite-leitura"><h1>Painel do administrador</h1><p>Entre na sua conta para continuar.</p><a className="botao" href={href('/conta')}>Entrar</a></article>

  const errosPagamento = eventos?.filter(ev => ev.status_processamento === 'erro' && !lidosPagamento.lidos.has(String(ev.id))).length ?? 0
  const contadores: Partial<Record<Aba, number>> = {
    usuarios: contadoresQ.dados?.usuarios ?? usuarios?.length, assinaturas: reais ? vigentesPorPessoa(reais).length : undefined,
    pagamentos: errosPagamento || undefined, conteudo: pendenciasConteudo || undefined,
  }
  const onlineAgora = usuarios ? usuarios.filter(u => u.online).length : contadoresQ.dados?.online ?? undefined
  if (onlineAgora) contadores.agora = onlineAgora
  const alertasDa = (s: Secao) => definicaoDe(s).abas.reduce((soma, a) => soma + (ALERTAS.includes(a.id) ? contadores[a.id] ?? 0 : 0), 0)
  const definicao = definicaoDe(secao)
  // Fontes que falharam viram item técnico na fila do Comando (nunca zero).
  const fontesIndisponiveis = [
    ...(eventosQ.erro && !eventos ? ['Avisos do processador'] : []),
    ...(usuariosQ.erro && !usuariosQ.dados ? ['Lista de usuários'] : []),
    ...(resumoQ.erro && !resumoQ.dados ? ['Resumo do painel'] : []),
  ]

  // Setas e Home/End andam entre as partes da área no trilho do celular (padrão de navegação por teclado).
  function teclaNasPartes(evento: KeyboardEvent<HTMLElement>) {
    const ids = definicao.abas.map(a => a.id)
    const atual = ids.indexOf(aba)
    const destino = evento.key === 'ArrowRight' ? (atual + 1) % ids.length : evento.key === 'ArrowLeft' ? (atual - 1 + ids.length) % ids.length
      : evento.key === 'Home' ? 0 : evento.key === 'End' ? ids.length - 1 : -1
    if (destino < 0) return
    evento.preventDefault()
    trocarAba(ids[destino])
    requestAnimationFrame(() => document.getElementById(`adm-parte-${ids[destino]}`)?.focus())
  }

  const Numero = ({ a }: { a: Aba }) => contadores[a]
    ? <b className={'adm-num' + (ALERTAS.includes(a) ? ' adm-num--alerta' : a === 'agora' ? ' adm-num--vivo' : '')}>{contadores[a]}<span className="so-leitor">{ALERTAS.includes(a) ? ' para ver' : a === 'agora' ? ' online' : ''}</span></b>
    : null

  return <article className="adm adm-mesa">
    <a className="adm-pular" href="#adm-painel" onClick={e => { e.preventDefault(); document.getElementById('adm-painel')?.focus() }}>Pular para o conteúdo do painel</a>

    <header className="adm-topo-painel">
      <nav className="adm-migalhas" aria-label="Você está em">
        <a href={href('/admin')} onClick={cliqueNavega('comando')}><Icone nome="cadeado" tamanho={13} /> Painel</a>
        <span aria-hidden="true">›</span>
        <a href={hrefDe(abaPadrao(secao))} onClick={cliqueNavega(abaPadrao(secao))}>{definicao.rotulo}</a>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{parte.rotulo}</span>
      </nav>
      <div className="adm-topo-painel__acoes">
        <Atualizado em={atualizadoEm} carregando={atualizando} />
        <button className="botao botao--fantasma adm-topo-painel__botao" type="button" onClick={() => void carregar()} disabled={atualizando} aria-busy={atualizando}>
          <Icone nome="reiniciar" tamanho={16} /> <span>{atualizando ? 'Atualizando…' : 'Atualizar'}</span>
        </button>
        {aba !== 'exportar' && <a className="botao botao--fantasma adm-topo-painel__botao" href={hrefDe('exportar')} onClick={cliqueNavega('exportar')}>
          <Icone nome="baixar" tamanho={16} /> <span>Exportar</span>
        </a>}
      </div>
    </header>

    {/* Falha ao atualizar não derruba o painel: o aviso aparece em cima dos dados que já estavam na tela. */}
    {erroAcesso && <p role="alert" className="adm-alerta">{erroAcesso}{assinaturas !== null && ' Os dados abaixo são da última atualização.'}</p>}
    {assinaturas === null ? (!erroAcesso && <p role="status" className="adm-carregando">Carregando o painel…</p>) : <div className="adm-corpo">
      {/* Computador: coluna à esquerda com as áreas e as partes da área aberta. Celular: barra presa embaixo, só as áreas. */}
      <nav className="adm-nav" aria-label="Áreas do painel">
        <ul className="adm-nav__areas">
          {SECOES.map(s => {
            const alertas = alertasDa(s.id)
            const aberta = secao === s.id
            // Comando mostra quantos estão online (o mesmo número do quadro, refeito a cada 10 s); Pessoas, quantas contas.
            const numero = s.id === 'comando' ? onlineAgora : s.id === 'pessoas' ? contadores.usuarios : undefined
            const destino = destinoDaSecao(s.id)
            return <li key={s.id} className={aberta ? 'adm-nav__area adm-nav__area--aberta' : 'adm-nav__area'}>
              <a className="adm-nav__item" href={hrefDe(destino)} aria-current={aberta ? 'true' : undefined} onClick={cliqueNavega(destino)}>
                <span className="adm-nav__icone"><Icone nome={s.icone} tamanho={20} />{alertas > 0 && <i className="adm-nav__ponto" aria-hidden="true" />}</span>
                <span className="adm-nav__rotulo">{s.rotulo}</span><span className="adm-nav__curto" aria-hidden="true">{s.curto}</span>
                {alertas > 0 ? <b className="adm-num adm-num--alerta adm-nav__numero">{alertas}<span className="so-leitor"> para ver</span></b>
                  : numero ? <b className={'adm-num adm-nav__numero' + (s.id === 'comando' ? ' adm-num--vivo' : '')}>{numero}<span className="so-leitor">{s.id === 'comando' ? ' online' : ' contas'}</span></b> : null}
              </a>
              {aberta && s.abas.length > 1 && <ul className="adm-nav__partes" aria-label={`Partes de ${s.rotulo}`}>
                {s.abas.map(a => <li key={a.id}>
                  <a className="adm-nav__parte" href={hrefDe(a.id)} aria-current={aba === a.id ? 'page' : undefined} onClick={cliqueNavega(a.id)}>
                    <span>{a.rotulo}</span><Numero a={a.id} />
                  </a>
                </li>)}
              </ul>}
            </li>
          })}
        </ul>
      </nav>

      <div className="adm-area">
        {/* Celular: as partes da área num trilho rolável (no computador elas ficam aninhadas na coluna). */}
        {definicao.abas.length > 1 && <nav className="adm-partes" aria-label={`Partes de ${definicao.rotulo}`} onKeyDown={teclaNasPartes}>
          <div className="seletor adm-partes__trilho">
            {definicao.abas.map(a => <a key={a.id} id={`adm-parte-${a.id}`} className="adm-partes__item" href={hrefDe(a.id)} aria-current={aba === a.id ? 'page' : undefined}
              onClick={cliqueNavega(a.id)}><span>{a.rotulo}</span><Numero a={a.id} /></a>)}
          </div>
        </nav>}

        <div id="adm-painel" className="adm-painel empilha-2" tabIndex={-1}>
          {aba !== 'comando' && <header className="adm-parte-cabeca">
            <span className={`adm-modo adm-modo--${parte.modo}`}>{ROTULO_MODO[parte.modo]}</span>
            <h1>{parte.rotulo}</h1>
            <p>{parte.pergunta}</p>
          </header>}

          {erroNovo && (aba === 'comando' || aba === 'agora' || aba === 'usuarios') && <p role="alert" className="adm-alerta">{erroNovo} Sem ela, usuários ativos e o ranking privado não aparecem; assinaturas, pagamentos e avaliações continuam funcionando.</p>}

          {aba === 'comando' && <AdminComando conta={conta} periodo={url.periodo} aoMudarPeriodo={mudarPeriodo} usuarios={usuarios} usuariosEm={usuariosQ.atualizadoEm ?? null}
            resumo={resumo} assinaturas={reais} cobrancas={cobrancasReais} cobrancasFalharam={!!cobrancasQ.erro} eventos={eventos} lidosPagamento={lidosPagamento.lidos}
            pendenciasConteudo={pendenciasConteudo} fontesIndisponiveis={fontesIndisponiveis} irPara={irParaDestino} recarregar={carregar} />}
          {aba === 'agora' && <AdminAgora conta={conta} resumo={resumo} usuarios={usuarios} atualizadoEm={usuariosQ.atualizadoEm} assinaturas={reais} cobrancas={cobrancasCarregando ? null : cobrancasReais} avisoCobrancas={avisoReais} errosPagamento={errosPagamento} pendenciasConteudo={pendenciasConteudo} irPara={trocarAba} verUsuarios={abrirUsuarios} />}

          {aba === 'usuarios' && (usuarios
            ? <AdminUsuarios usuarios={usuarios} filtro={url.filtro} aoMudarFiltro={filtro => irPara({ filtro })} aoVerAgora={() => trocarAba('agora')} />
            : !usuariosQ.erro && <p role="status">Carregando usuários…</p>)}
          {aba === 'crescimento' && <AdminCrescimento usuarios={usuariosReais} assinaturas={reais ?? []} />}

          {aba === 'financeiro' && (cobrancasCarregando
            ? <p role="status">Carregando as cobranças…</p>
            : <>
              {cobrancasReais && <AdminReceitaPeriodo assinaturas={reais ?? []} cobrancas={cobrancasReais} periodo={url.periodo} aoMudarPeriodo={mudarPeriodo} />}
              <AdminFinanceiro assinaturas={reais ?? []} testes={testes} usuarios={resumo?.usuarios ?? usuarios?.length ?? null} reais={cobrancasReais} avisoReais={avisoReais} errosPagamento={errosPagamento} irPara={trocarAba} />
            </>)}
          {aba === 'assinaturas' && <AdminListaAssinaturas linhas={assinaturas} usuarios={usuarios} />}
          {aba === 'cobrancas' && (cobrancasCarregando
            ? <p role="status">Carregando as cobranças…</p>
            : <AdminCobrancas assinaturas={reais ?? []} reais={cobrancasReais} avisoReais={avisoReais} usuarios={usuarios} testes={testes} />)}
          {aba === 'pagamentos' && <AdminAvisosProcessador eventos={eventos ?? []} usuarios={usuarios} recarregar={carregar} lidos={lidosPagamento.lidos} marcar={lidosPagamento.marcar} />}

          {/* Montada só na própria parte: o contador da navegação vem de contadores_admin. */}
          {aba === 'conteudo' && <AdminConteudo vista={vista} aoMudarVista={nova => { definirVista(nova); irPara({ vista: nova }) }} aoMudarPendencias={registrarPendencias} aoEditar={editarQuestao} />}
          {aba === 'questoes' && <AdminQuestoes idInicial={idEditar} aoAbrir={id => { definirIdEditar(id); irPara({ id }) }} />}
          {aba === 'opinioes' && <AdminOpinioesFlashcards />}
          {aba === 'simulados' && <AdminSimulados />}

          {aba === 'lembretes' && <><GuiaEmails /><AdminLembretes /><AdminCartas usuarios={usuarios} /><AdminRelatorioMensal /><AdminEmails /></>}
          {aba === 'todas' && <AdminTodasCartas />}

          {aba === 'ajustes' && <AdminConfiguracoes />}
          {aba === 'exportar' && <section className="empilha adm-secao adm-exportar-parte" aria-label="Exportação">
            <p className="adm-nota">Escolha o que levar e com que privacidade (com ou sem nome e e-mail). A planilha é gerada no seu navegador; nada é enviado a outro lugar.</p>
            <div><AdminExportar /></div>
          </section>}
        </div>
      </div>
    </div>}
  </article>
}
