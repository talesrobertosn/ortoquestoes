import { useMemo, useState } from 'react'
import { confirmar } from '../Confirmar'
import { AdminFichaUsuario } from './AdminFichaUsuario'
import type { LinhaUsuario } from './AdminUsuarios'
import { Icone } from '../Icone'
import { PARTE_COBRANCAS, lerEvento, linkDoEvento, reprocessarEvento, type EventoPagamento } from './pagamentos'
import { STATUS_EVENTO, TIPOS_EVENTO, corresponde, dataHora, nomeErro, normalizar } from './formatos'

type LinhaEvento = EventoPagamento

/**
 * Receita › Avisos do processador (endereço ?aba=pagamentos, mantido pelos e-mails de alerta).
 * Reprocessar consulta o Mercado Pago de novo e aplica o estado; não cobra nem reembolsa. Um aviso por vez,
 * sempre com confirmação; nada de reprocessamento em massa.
 */
export function AdminAvisosProcessador({ eventos, usuarios, recarregar, lidos, marcar }: { eventos: LinhaEvento[]; usuarios: LinhaUsuario[] | null; recarregar: () => Promise<void>; lidos: Set<string>; marcar: (chaves: string[], lido?: boolean) => void }) {
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
      <h2 id="adm-titulo-pagamentos">Avisos do processador</h2>
      <p>Cada vez que um pagamento ou uma assinatura muda, o Mercado Pago avisa o site, e o site aplica a mudança (últimos {eventos.length} avisos). "Ignorado" é normal: são avisos que não mudam nada. Só "Precisa de atenção" pede ação. O dinheiro recebido está em Receita › Cobranças.</p>
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
