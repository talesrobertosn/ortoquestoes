import { useMemo, useState } from 'react'
import { rpcInexistente, usarRpc } from '../../componentes/admin/usarRpc'
import { chamarRpc } from '../../servicos/supabase'
import { nomeErro } from '../../componentes/admin/formatos'
import { PARTE_COBRANCAS, lerEvento, linkDoEvento, reprocessarEvento, type EventoPagamento } from '../../componentes/admin/pagamentos'
import { STATUS_EVENTO, TIPOS_EVENTO } from '../../componentes/admin/rotulos'
import { usarPainel } from '../dados/painel'
import { usarNav } from '../nav'
import { defParte } from '../rotas'
import { Icone } from '../ui/Icone'
import { combina, dataHora, haQuanto, inteiro, normalizar } from '../ui/formato'
import { Busca, Cabeca, Carregando, Estado, Faixa, Filtro, Situacao } from '../ui/kit'
import { avisoRapido, confirmar } from '../ui/sobreposicoes'

type Status = 'erro' | 'certo' | 'todos'
const TOM: Record<string, 'ok' | 'aviso' | 'erro' | 'neutro'> = { processado: 'ok', ignorado: 'neutro', recebido: 'aviso', erro: 'erro' }

/**
 * Receita › Avisos do processador: cada aviso que o Mercado Pago manda ao site, numa fila com detalhe ao lado.
 * Só "Precisa de atenção" pede ação; reprocessar consulta o Mercado Pago de novo e nunca cobra nem reembolsa.
 */
export default function Avisos() {
  const p = usarPainel()
  const nav = usarNav()
  const eventos = p.eventos
  const { lidos: lidosLocais, marcar } = p.lidosPagamento
  // Decisões com histórico (Tales, 05/11/2026): "conciliado" só quando o pagamento foi conferido; cada aviso
  // tem a sua decisão, e uma falha nova nunca herda a decisão de outra. Sem o SQL, vale a marcação antiga.
  const decisoesQ = usarRpc<Decisao[]>(p.conta, 'listar_decisoes_eventos_admin')
  const auditoriaQ = usarRpc<Inconsistencia[]>(p.conta, 'auditoria_pagamentos_admin')
  const semDecisoes = !!decisoesQ.erro && rpcInexistente(decisoesQ.erro)
  const decisoes = useMemo(() => { const m = new Map<number, Decisao[]>(); for (const d of Array.isArray(decisoesQ.dados) ? decisoesQ.dados : []) m.set(Number(d.id_evento), [...(m.get(Number(d.id_evento)) ?? []), d]); return m }, [decisoesQ.dados])
  const lidos = useMemo(() => {
    if (semDecisoes || !Array.isArray(decisoesQ.dados)) return lidosLocais
    const s = new Set<string>()
    for (const [id, l] of decisoes) if (l[0] && l[0].decisao !== 'reaberto') s.add(String(id))
    return s
  }, [semDecisoes, decisoesQ.dados, decisoes, lidosLocais])
  const [soConsulta, definirSoConsulta] = useState(false)
  const [status, definirStatus] = useState<Status>(() => (p.eventos ?? []).some(e => e.status_processamento === 'erro' && !lidos.has(String(e.id))) ? 'erro' : 'todos')
  const [busca, definirBusca] = useState('')
  const [escolhido, escolher] = useState<number | null>(nav.estado.id ? Number(nav.estado.id) || null : null)
  const [reprocessando, definirReprocessando] = useState<number | null>(null)
  const parte = defParte('pagamentos')
  const termo = normalizar(busca.trim())
  const visiveis = useMemo(() => (eventos ?? []).filter(e => (!soConsulta || (e.erro ?? '').includes('consulta_mercado_pago_falhou')) && (status === 'todos' || (status === 'certo' ? ['processado', 'ignorado'].includes(e.status_processamento) : e.status_processamento === 'erro' && !lidos.has(String(e.id)))) && combina([e.id_evento, e.tipo, TIPOS_EVENTO[e.tipo ?? ''], e.id_recurso, e.erro, nomeErro(e.erro), e.nome, e.usuario], termo)), [eventos, status, termo, lidos, soConsulta])
  if (!eventos) return p.eventosQ.erro ? <Estado tipo="erro" titulo="Os avisos não carregaram" texto={p.erroDados} /> : <Carregando linhas={6} texto="Carregando os avisos…" />

  const naoVistos = eventos.filter(e => e.status_processamento === 'erro' && !lidos.has(String(e.id)))
  const comDono = eventos.some(e => e.id_usuario !== undefined)
  const atual = visiveis.find(e => e.id === escolhido) ?? visiveis[0] ?? null
  const abrir = (id: number) => { escolher(id); nav.ajustar({ id: String(id) }) }

  async function reprocessar(e: EventoPagamento) {
    if (reprocessando !== null) return
    if (!(await confirmar({ titulo: 'Reprocessar este aviso?', texto: 'O site consulta o Mercado Pago de novo e aplica o que ele disser sobre este pagamento. Nada é cobrado nem reembolsado.', sim: 'Reprocessar' }))) return
    definirReprocessando(e.id)
    const r = await reprocessarEvento(e.id, () => lerEvento(e.id))
    avisoRapido(r.texto, r.ok ? 'ok' : 'erro')
    await p.atualizar()
    definirReprocessando(null)
  }

  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Financeiro" titulo={parte.rotulo} pergunta={`${parte.pergunta} Últimos ${inteiro(eventos.length)} avisos. "Ignorado" é normal: são avisos que não mudam nada.`} />
    {naoVistos.length > 0 && <Faixa tom="erro" titulo={`${naoVistos.length} ${naoVistos.length === 1 ? 'aviso precisa' : 'avisos precisam'} de atenção`}
      acao={semDecisoes ? <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => marcar(naoVistos.map(e => String(e.id)))}><Icone nome="certo" tamanho={14} />Marcar todos como resolvidos</button> : undefined}>
      {semDecisoes ? 'Abra cada um, confira no Mercado Pago e reprocesse se o pagamento existir. "Resolvido" só tira o alerta (vale no celular e no computador); não muda nada na assinatura.'
        : 'Abra cada um e confira no Mercado Pago. Marque "Conciliado" só depois de ver que o pagamento correspondente está certo no site (ou "Ignorar", com o motivo). Cada decisão fica no histórico; uma falha nova nunca herda a decisão de outra.'}
    </Faixa>}
    {!comDono && eventos.length > 0 && <Faixa>Para ver de quem é cada aviso e abrir a ficha da pessoa, cole no Supabase a {PARTE_COBRANCAS}.</Faixa>}

    <Auditoria lista={Array.isArray(auditoriaQ.dados) ? auditoriaQ.dados : null} semSql={!!auditoriaQ.erro && rpcInexistente(auditoriaQ.erro)} aoFicha={id => nav.abrirPessoa(id, 'assinatura')} />

    <section className="a3-painel a3-caixa-entrada" aria-label="Avisos do Mercado Pago">
      <div className="a3-caixa-entrada__lista">
        <div className="a3-filtros"><Busca valor={busca} aoMudar={definirBusca} rotulo={comDono ? 'Buscar pessoa, tipo, número ou erro' : 'Buscar tipo, número ou erro'} /></div>
        <div className="a3-filtros" style={{ paddingTop: 0 }} role="group" aria-label="Situação do aviso">
          <Filtro ativo={status === 'erro'} aoClicar={() => definirStatus('erro')} contagem={eventos.filter(e => e.status_processamento === 'erro' && !lidos.has(String(e.id))).length}>Precisam de você</Filtro>
          <Filtro ativo={status === 'certo'} aoClicar={() => definirStatus('certo')} contagem={eventos.filter(e => ['processado', 'ignorado'].includes(e.status_processamento)).length}>Tudo certo</Filtro>
          <Filtro ativo={status === 'todos'} aoClicar={() => definirStatus('todos')} contagem={eventos.length}>Todos</Filtro>
          <Filtro ativo={soConsulta} aoClicar={() => definirSoConsulta(v => !v)} contagem={eventos.filter(e => (e.erro ?? '').includes('consulta_mercado_pago_falhou')).length}>Falha de consulta</Filtro>
        </div>
        {visiveis.length === 0 ? <div style={{ padding: 20 }}><Estado icone={status === 'erro' ? 'certo' : undefined} titulo={status === 'erro' ? 'Nenhum aviso com problema' : 'Nenhum aviso neste filtro'} texto={status === 'erro' ? 'O Mercado Pago e o site estão de acordo.' : undefined} /></div> :
          <ul className="a3-fila-avisos">{visiveis.map(e => {
            const erro = e.status_processamento === 'erro', visto = lidos.has(String(e.id))
            return <li key={e.id}><button type="button" className="a3-fila-avisos__item" aria-current={atual?.id === e.id ? 'true' : undefined} onClick={() => abrir(e.id)}>
              <span className={'a3-ponto' + (erro && !visto ? ' a3-ponto--erro' : '')} aria-hidden="true" />
              <span className="a3-fila-avisos__texto">
                <span className="a3-nome">{TIPOS_EVENTO[e.tipo ?? ''] ?? 'Aviso do Mercado Pago'}</span>
                <span className="a3-sub">{[e.nome ?? e.usuario ?? 'pessoa não identificada', erro && e.erro ? nomeErro(e.erro) : null].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="a3-fila-avisos__quando">{haQuanto(e.recebido_em)}</span>
            </button></li>
          })}</ul>}
      </div>
      <div className="a3-caixa-entrada__detalhe" aria-live="polite">
        {!atual ? <Estado compacto titulo="Escolha um aviso" /> : <Detalhe e={atual} visto={lidos.has(String(atual.id))} comDono={comDono} reprocessando={reprocessando}
          aoReprocessar={() => void reprocessar(atual)} aoVisto={v => marcar([String(atual.id)], v)} decisoes={semDecisoes ? null : decisoes.get(atual.id) ?? []} aoDecidir={() => void decisoesQ.recarregar()} aoFicha={() => atual.id_usuario && nav.abrirPessoa(atual.id_usuario, 'assinatura')} />}
      </div>
    </section>
  </div>
}

function Detalhe({ e, visto, comDono, reprocessando, aoReprocessar, aoVisto, aoFicha, decisoes, aoDecidir }: {
  e: EventoPagamento; visto: boolean; comDono: boolean; reprocessando: number | null; aoReprocessar: () => void; aoVisto: (v: boolean) => void; aoFicha: () => void
  /** null = SQL de decisões ainda não colado (vale a marcação antiga). */
  decisoes: Decisao[] | null; aoDecidir: () => void
}) {
  const erro = e.status_processamento === 'erro'
  const link = linkDoEvento(e)
  return <div className="a3-pilha">
    <div style={{ display: 'grid', gap: 6 }}>
      <Situacao tom={erro && visto ? 'neutro' : TOM[e.status_processamento] ?? 'neutro'}>{erro && visto ? 'Resolvido' : STATUS_EVENTO[e.status_processamento] ?? e.status_processamento}</Situacao>
      <h3 className="a3-titulo-2">{TIPOS_EVENTO[e.tipo ?? ''] ?? 'Aviso do Mercado Pago'}</h3>
      <p className="a3-mudo">Recebido em {dataHora(e.recebido_em)}{e.processado_em ? ` · processado em ${dataHora(e.processado_em)}` : ' · ainda na fila'}</p>
    </div>
    {erro && e.erro && <Faixa tom="erro" titulo={nomeErro(e.erro)}>O site não conseguiu aplicar este aviso. Confira o pagamento no Mercado Pago; se ele existir, reprocesse.</Faixa>}
    <dl className="a3-pares">
      {comDono && <div><dt>Pessoa</dt><dd>{e.id_usuario ? <>{e.nome ?? e.usuario}{e.nome && e.usuario && <span className="a3-mudo" style={{ display: 'block', fontWeight: 400 }}>{e.usuario}</span>}</> : <span className="a3-mudo" style={{ fontWeight: 400 }}>não deu para ligar a uma pessoa</span>}</dd></div>}
      <div><dt>Número no Mercado Pago</dt><dd className="num">{e.id_recurso ?? '—'}</dd></div>
    </dl>
    {erro && decisoes !== null && <Decidir key={e.id} e={e} decisoes={decisoes} aoDecidir={aoDecidir} />}
    <details className="a3-detalhes-tecnicos"><summary>Detalhes técnicos</summary><span className="a3-codigo">evento {e.id_evento} · tipo {e.tipo ?? '—'}{e.erro ? ` · erro ${e.erro}` : ''}</span></details>
    <div className="a3-acoes-linha">
      {erro && <button type="button" className="a3-botao" disabled={reprocessando !== null} aria-busy={reprocessando === e.id} onClick={aoReprocessar}><Icone nome="atualizar" tamanho={15} />{reprocessando === e.id ? 'Reprocessando… aguardando o resultado' : 'Reprocessar'}</button>}
      {erro && decisoes === null && <button type="button" className="a3-botao a3-botao--contorno" onClick={() => aoVisto(!visto)}><Icone nome={visto ? 'olho' : 'certo'} tamanho={15} />{visto ? 'Reabrir' : 'Marcar resolvido'}</button>}
      {e.id_usuario && <button type="button" className="a3-botao a3-botao--contorno" onClick={aoFicha}><Icone nome="usuario" tamanho={15} />Ficha e assinatura</button>}
      {link && <a className="a3-botao a3-botao--fantasma" href={link} target="_blank" rel="noopener noreferrer"><Icone nome="externo" tamanho={15} />Abrir no Mercado Pago</a>}
    </div>
  </div>
}

interface Decisao { id: number; id_evento: number; decisao: 'conciliado' | 'ignorado' | 'reaberto'; nota: string | null; referencia_pagamento: string | null; decidido_em: string; quem: string | null }
interface Inconsistencia { tipo: string; id_usuario: string | null; email: string | null; detalhe: string; referencia: string | null; em: string | null }
const ROTULO_DECISAO: Record<Decisao['decisao'], string> = { conciliado: 'Conciliado', ignorado: 'Ignorado', reaberto: 'Reaberto' }

/** A decisão sobre um aviso com erro, com nota e referência, e o histórico de decisões. */
function Decidir({ e, decisoes, aoDecidir }: { e: EventoPagamento; decisoes: Decisao[]; aoDecidir: () => void }) {
  const [nota, definirNota] = useState('')
  const [ref, definirRef] = useState(e.id_recurso ?? '')
  const [ocupado, definirOcupado] = useState(false)
  const ultima = decisoes[0]
  async function decidir(decisao: Decisao['decisao']) {
    if (decisao === 'conciliado' && !(await confirmar({ titulo: 'Marcar como conciliado?', texto: 'Use só depois de conferir no Mercado Pago que o pagamento correspondente está certo no site (acesso dado, valor certo). Fica registrado no histórico.', sim: 'Conciliado' }))) return
    if (decisao === 'ignorado' && !nota.trim()) { avisoRapido('Escreva o motivo para ignorar.', 'erro'); return }
    definirOcupado(true)
    try { await chamarRpc('registrar_decisao_evento_admin', { p_evento: e.id, p_decisao: decisao, p_nota: nota, p_referencia: ref }); avisoRapido(`Decisão registrada: ${ROTULO_DECISAO[decisao].toLowerCase()}.`); definirNota(''); aoDecidir() }
    catch { avisoRapido('Não foi possível registrar a decisão.', 'erro') } finally { definirOcupado(false) }
  }
  return <div className="av-decisao">
    <span className="cc-sub">Decisão {ultima ? `· agora: ${ROTULO_DECISAO[ultima.decisao].toLowerCase()}` : '· pendente'}</span>
    <div className="a3-grade a3-grade--2">
      <label className="a3-campo"><span>Referência do pagamento</span><input className="a3-entrada" value={ref} maxLength={80} onChange={x => definirRef(x.target.value)} placeholder="número no Mercado Pago" /></label>
      <label className="a3-campo"><span>Nota</span><input className="a3-entrada" value={nota} maxLength={1000} onChange={x => definirNota(x.target.value)} placeholder="o que foi conferido, ou por que ignorar" /></label>
    </div>
    <div className="a3-acoes-linha">
      <button type="button" className="a3-botao" disabled={ocupado} onClick={() => void decidir('conciliado')}><Icone nome="certo" tamanho={15} />Conciliado</button>
      <button type="button" className="a3-botao a3-botao--contorno" disabled={ocupado} onClick={() => void decidir('ignorado')}>Ignorar</button>
      {ultima && ultima.decisao !== 'reaberto' && <button type="button" className="a3-botao a3-botao--fantasma" disabled={ocupado} onClick={() => void decidir('reaberto')}>Reabrir</button>}
    </div>
    {decisoes.length > 0 && <ol className="av-historico">{decisoes.map(d => <li key={d.id}><b>{ROTULO_DECISAO[d.decisao]}</b> · {dataHora(d.decidido_em)}{d.quem ? ` · ${d.quem}` : ''}{d.referencia_pagamento ? ` · ref. ${d.referencia_pagamento}` : ''}{d.nota && <small>{d.nota}</small>}</li>)}</ol>}
  </div>
}

const TIPOS_AUDITORIA: Record<string, { titulo: string; texto: string }> = {
  pix_aprovado_sem_acesso: { titulo: 'Pix aprovado sem acesso', texto: 'Pagou e a assinatura não foi criada. Reprocesse o aviso ou dê o acesso manualmente.' },
  cartao_renovando_duas_vezes: { titulo: 'Dois cartões renovando', texto: 'Mais de uma assinatura de cartão ativa e renovando: risco de cobrança dupla.' },
  ativa_sem_cobranca: { titulo: 'Ativa sem cobrança gravada', texto: 'Assinatura ativa sem pagamento registrado: confira no Mercado Pago.' },
  consulta_falhou_sem_decisao: { titulo: 'Falha de consulta sem decisão', texto: 'O Mercado Pago não respondeu e ninguém conciliou ainda.' },
}

/** Inconsistências para conferir (só leitura): nada aqui muda assinatura ou pagamento. */
function Auditoria({ lista, semSql, aoFicha }: { lista: Inconsistencia[] | null; semSql: boolean; aoFicha: (id: string) => void }) {
  if (semSql) return <Faixa>Para ver a auditoria (Pix pago sem acesso, cartão renovando duas vezes, assinatura sem cobrança), rode o SQL 202611050100_metas_e_publico.sql.</Faixa>
  if (!lista) return null
  const grupos = Object.keys(TIPOS_AUDITORIA).map(t => ({ t, l: lista.filter(x => x.tipo === t) }))
  return <section className="av-auditoria" aria-label="Auditoria dos pagamentos">
    <header><h2>Auditoria dos pagamentos</h2><p>{lista.length ? `${lista.length} ${lista.length === 1 ? 'ponto' : 'pontos'} para conferir. Nada aqui muda assinatura ou pagamento.` : 'Nenhuma inconsistência encontrada nas quatro verificações abaixo.'}</p></header>
    <div className="av-auditoria__grade">{grupos.map(({ t, l }) => <div key={t} className={'av-auditoria__item' + (l.length ? ' tem' : '')}>
      <span>{TIPOS_AUDITORIA[t].titulo}</span><b>{l.length}</b><small>{TIPOS_AUDITORIA[t].texto}</small>
      {l.length > 0 && <ul>{l.slice(0, 5).map((x, k) => <li key={k}>{x.id_usuario ? <button type="button" onClick={() => aoFicha(x.id_usuario!)}>{x.email ?? 'ficha'}</button> : null} <span>{x.detalhe}</span></li>)}</ul>}
    </div>)}</div>
  </section>
}
