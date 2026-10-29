import { useCallback, useEffect, useState } from 'react'
import { chamarRpc } from '../../servicos/supabase'
import { real } from '../../dados/planos'
import { confirmar } from '../Confirmar'
import { Icone } from '../Icone'
import { STATUS_EVENTO, TIPOS_EVENTO, data, dataHora, nomeErro } from './formatos'
import { STATUS_PIX, proximaData, rotuloMeio, rotuloPlano, situacaoAssinatura } from './rotulos'
import { PARTE_COBRANCAS, codigoDaFalha, funcaoAusente, linkDoEvento, linkMercadoPago, reprocessarEvento, type EventoPagamento } from './pagamentos'

/** Resposta de assinatura_usuario_admin (parte 23). */
interface AssinaturaDoUsuario {
  assinaturas: Array<{
    id: string; plano: string; status: string; meio: 'pix' | 'cartao'; id_externo: string | null
    inicio_periodo: string | null; fim_periodo: string | null; cancelar_ao_fim: boolean; cancelada_em: string | null
    ultima_cobranca_id: string | null; ultima_cobranca_em: string | null; criada_em: string; atualizada_em: string
    valor: number | null
  }>
  pix: Array<{ id: string; plano: string; valor: number; status: string; pagamento_id: string | null; expira_em: string; criada_em: string; atualizada_em: string }>
  eventos: EventoPagamento[]
  conta_teste: boolean
}

const TOM_SELO = { ok: 'adm-selo--ok', aviso: 'adm-selo--aviso', ruim: 'adm-selo--ruim', neutro: 'adm-selo--neutro' } as const

function LinkMP({ id, rotulo = 'Abrir no Mercado Pago' }: { id: string | null | undefined; rotulo?: string }) {
  const url = linkMercadoPago(id)
  return url ? <a className="adm-link" href={url} target="_blank" rel="noopener noreferrer">{rotulo} <Icone nome="direita" tamanho={13} /></a> : null
}

/**
 * Aba "Assinatura e pagamentos" da ficha: assinaturas da pessoa, pedidos Pix e os
 * avisos do Mercado Pago ligados a ela, com o reprocessamento ali mesmo.
 */
export function AdminAssinaturaUsuario({ idUsuario, email }: { idUsuario: string; email: string | null }) {
  const [dados, definirDados] = useState<AssinaturaDoUsuario | null>(null)
  const [erro, definirErro] = useState<{ texto: string; ausente: boolean } | null>(null)
  const [reprocessando, definirReprocessando] = useState<number | null>(null)
  const [aviso, definirAviso] = useState<{ texto: string; erro: boolean } | null>(null)

  const ler = useCallback(() => chamarRpc<AssinaturaDoUsuario>('assinatura_usuario_admin', { p_usuario: idUsuario }), [idUsuario])
  const carregar = useCallback(async () => {
    try { definirDados(await ler()); definirErro(null) }
    catch (falha) {
      definirErro(funcaoAusente(falha)
        ? { ausente: true, texto: `Para ver a assinatura e os pagamentos aqui, cole no Supabase a ${PARTE_COBRANCAS}. Enquanto isso, use as abas Assinaturas e Pagamentos do painel.` }
        : { ausente: false, texto: `Não foi possível carregar a assinatura agora (código: ${codigoDaFalha(falha)}).` })
    }
  }, [ler])
  useEffect(() => { void carregar() }, [carregar])

  async function reprocessar(e: EventoPagamento) {
    if (reprocessando !== null) return
    if (!(await confirmar({ titulo: 'Reprocessar este aviso?', texto: 'O site consulta o Mercado Pago de novo e aplica o que ele disser sobre este pagamento. Nada é cobrado nem reembolsado.', sim: 'Reprocessar' }))) return
    definirReprocessando(e.id); definirAviso(null)
    const r = await reprocessarEvento(e.id, async () => (await ler()).eventos.find(x => x.id === e.id) ?? null)
    definirAviso({ texto: r.texto, erro: !r.ok })
    await carregar()
    definirReprocessando(null)
  }

  if (erro) return <p role={erro.ausente ? 'status' : 'alert'} className={erro.ausente ? 'adm-nota' : 'adm-alerta'}>{erro.texto}</p>
  if (!dados) return <p role="status">Carregando a assinatura…</p>

  const { assinaturas, pix, eventos } = dados
  const pixAbertos = pix.filter(p => !assinaturas.some(a => a.id_externo === `pix:${p.id}`))
  return <div className="empilha adm-ficha__corpo">
    {aviso && <p role={aviso.erro ? 'alert' : 'status'} className={'adm-nota adm-mensagem' + (aviso.erro ? ' adm-mensagem--erro' : '')}>{aviso.texto}</p>}
    {dados.conta_teste && <p className="adm-nota"><span className="adm-selo">Teste</span> Conta de teste do checkout: fica fora das estatísticas.</p>}

    <section className="empilha">
      <h3 className="adm-subtitulo">Assinaturas <span className="adm-contagem">{assinaturas.length}</span></h3>
      {assinaturas.length === 0 ? <p className="adm-vazio">Nenhuma assinatura{email ? ` para ${email}` : ''}. Se a pessoa diz que pagou, confira os pedidos Pix abaixo e o Mercado Pago.</p> : <ul className="adm-cartoes">
        {assinaturas.map(a => {
          const base = { ...a, id_usuario: idUsuario }
          const s = situacaoAssinatura(base), proxima = proximaData(base)
          return <li key={a.id} className={`adm-cartao adm-cartao--${s.tom}`}>
          <div className="adm-cartao__topo">
            <div><strong>{rotuloPlano(a.plano)}</strong>{a.valor !== null && <span className="adm-usuario__email">{real(Number(a.valor))} {a.meio === 'pix' ? 'pagos no Pix' : 'contratados no cartão'}</span>}</div>
            <span className="adm-cartao__selos"><span className={'adm-selo adm-selo--meio adm-selo--' + a.meio}>{rotuloMeio(a.meio)}</span> <span className={`adm-selo ${TOM_SELO[s.tom]}`}>{s.rotulo}</span></span>
          </div>
          <dl className="adm-cartao__dados">
            <div><dt>Criada em</dt><dd>{data(a.criada_em)}</dd></div>
            <div><dt>Última cobrança paga</dt><dd>{a.ultima_cobranca_em ? dataHora(a.ultima_cobranca_em) : '—'}</dd></div>
            <div><dt>{proxima.rotulo}</dt><dd>{data(proxima.valor)}</dd></div>
            {a.cancelada_em && <div><dt>Desligou a renovação em</dt><dd>{data(a.cancelada_em)}</dd></div>}
          </dl>
          {s.detalhe && <small className="adm-ajuda">{s.detalhe}</small>}
          <small className="adm-evento__codigo">{a.meio === 'cartao' ? `assinatura ${a.id_externo ?? '—'}` : `pedido ${a.id_externo?.slice(4) ?? '—'}`}{a.ultima_cobranca_id ? ` · pagamento ${a.ultima_cobranca_id}` : ''} · atualizada {dataHora(a.atualizada_em)}</small>
          <LinkMP id={a.ultima_cobranca_id} rotulo="Ver o último pagamento no Mercado Pago" />
        </li>
        })}
      </ul>}
    </section>

    {pix.length > 0 && <section className="empilha">
      <h3 className="adm-subtitulo">Pedidos Pix <span className="adm-contagem">{pix.length}</span>{pixAbertos.length > 0 && <small className="adm-nota"> ({pixAbertos.length} sem assinatura: não pagos ou ainda abertos)</small>}</h3>
      <ul className="adm-mini">{pix.map(p => <li key={p.id}>
        <span className="adm-mini__nome">{rotuloPlano(p.plano)} · {real(Number(p.valor))}<small>criado {dataHora(p.criada_em)}{p.pagamento_id ? ` · pagamento ${p.pagamento_id}` : ''}{p.status === 'pending' ? ` · expira ${dataHora(p.expira_em)}` : ''}</small>{p.pagamento_id && <LinkMP id={p.pagamento_id} />}</span>
        <span className={'adm-selo ' + (p.status === 'approved' ? 'adm-selo--ok' : ['refunded', 'charged_back', 'rejected'].includes(p.status) ? 'adm-selo--ruim' : 'adm-selo--neutro')}>{STATUS_PIX[p.status] ?? p.status}</span>
      </li>)}</ul>
    </section>}

    <section className="empilha">
      <h3 className="adm-subtitulo">Avisos do Mercado Pago <span className="adm-contagem">{eventos.length}</span></h3>
      <p className="adm-nota">Avisos ligados às assinaturas, aos pagamentos e aos pedidos Pix desta pessoa. As cobranças mensais do cartão ("Cobrança da assinatura") nem sempre dá para ligar; elas aparecem na aba Pagamentos.</p>
      {eventos.length === 0 ? <p className="adm-vazio">Nenhum aviso ligado a esta pessoa.</p> : <ul className="adm-eventos">
        {eventos.map(e => {
          const comErro = e.status_processamento === 'erro'
          return <li key={e.id} className={'adm-evento adm-evento--aberto' + (comErro ? ' adm-evento--ruim' : '')}>
            <div className="adm-evento__linha">
              <span className="adm-evento__quando">{dataHora(e.recebido_em)}</span>
              <span className="adm-evento__tipo">{TIPOS_EVENTO[e.tipo ?? ''] ?? 'Aviso do Mercado Pago'}{comErro && e.erro ? <small>{nomeErro(e.erro)}</small> : null}</span>
              <span className={`adm-selo adm-estado--${e.status_processamento}`}>{STATUS_EVENTO[e.status_processamento] ?? e.status_processamento}</span>
            </div>
            <div className="adm-evento__detalhe">
              <dl>
                <div><dt>Número no Mercado Pago</dt><dd className="numerico">{e.id_recurso ?? '—'}</dd></div>
                <div><dt>Processado em</dt><dd>{dataHora(e.processado_em)}</dd></div>
                <div><dt>Códigos técnicos</dt><dd className="adm-evento__codigo">evento {e.id_evento} · tipo {e.tipo ?? '—'}{e.erro ? ` · erro ${e.erro}` : ''}</dd></div>
              </dl>
              <div className="linha">
                {comErro && <button className="botao" type="button" disabled={reprocessando !== null} aria-busy={reprocessando === e.id} onClick={() => void reprocessar(e)}>{reprocessando === e.id ? 'Reprocessando… aguardando o resultado' : 'Reprocessar'}</button>}
                {linkDoEvento(e) && <a className="botao botao--fantasma" href={linkDoEvento(e)!} target="_blank" rel="noopener noreferrer">Abrir no Mercado Pago</a>}
              </div>
            </div>
          </li>
        })}
      </ul>}
    </section>
  </div>
}
