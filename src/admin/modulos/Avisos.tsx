import { useMemo, useState } from 'react'
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

type Status = 'erro' | 'todos' | 'processado' | 'ignorado' | 'recebido'
const TOM: Record<string, 'ok' | 'aviso' | 'erro' | 'neutro'> = { processado: 'ok', ignorado: 'neutro', recebido: 'aviso', erro: 'erro' }

/**
 * Receita › Avisos do processador: cada aviso que o Mercado Pago manda ao site, numa fila com detalhe ao lado.
 * Só "Precisa de atenção" pede ação; reprocessar consulta o Mercado Pago de novo e nunca cobra nem reembolsa.
 */
export default function Avisos() {
  const p = usarPainel()
  const nav = usarNav()
  const eventos = p.eventos
  const { lidos, marcar } = p.lidosPagamento
  const [status, definirStatus] = useState<Status>(() => (p.eventos ?? []).some(e => e.status_processamento === 'erro' && !lidos.has(String(e.id))) ? 'erro' : 'todos')
  const [busca, definirBusca] = useState('')
  const [escolhido, escolher] = useState<number | null>(nav.estado.id ? Number(nav.estado.id) || null : null)
  const [reprocessando, definirReprocessando] = useState<number | null>(null)
  const parte = defParte('pagamentos')
  const termo = normalizar(busca.trim())
  const visiveis = useMemo(() => (eventos ?? []).filter(e => (status === 'todos' || e.status_processamento === status) && combina([e.id_evento, e.tipo, TIPOS_EVENTO[e.tipo ?? ''], e.id_recurso, e.erro, nomeErro(e.erro), e.nome, e.usuario], termo)), [eventos, status, termo])
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
    <Cabeca area="Receita" titulo={parte.rotulo} pergunta={`${parte.pergunta} Últimos ${inteiro(eventos.length)} avisos. "Ignorado" é normal: são avisos que não mudam nada.`} />
    {naoVistos.length > 0 && <Faixa tom="erro" titulo={`${naoVistos.length} ${naoVistos.length === 1 ? 'aviso precisa' : 'avisos precisam'} de atenção`}
      acao={<button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => marcar(naoVistos.map(e => String(e.id)))}><Icone nome="certo" tamanho={14} />Marcar todos como vistos</button>}>
      Abra cada um, confira no Mercado Pago e reprocesse se o pagamento existir. Marcar como visto só tira o alerta; não muda nada na assinatura.
    </Faixa>}
    {!comDono && eventos.length > 0 && <Faixa>Para ver de quem é cada aviso e abrir a ficha da pessoa, cole no Supabase a {PARTE_COBRANCAS}.</Faixa>}

    <section className="a3-painel a3-caixa-entrada" aria-label="Avisos do Mercado Pago">
      <div className="a3-caixa-entrada__lista">
        <div className="a3-filtros"><Busca valor={busca} aoMudar={definirBusca} rotulo={comDono ? 'Buscar pessoa, tipo, número ou erro' : 'Buscar tipo, número ou erro'} /></div>
        <div className="a3-filtros" style={{ paddingTop: 0 }} role="group" aria-label="Situação do aviso">
          {(['erro', 'todos', 'processado', 'ignorado', 'recebido'] as const).map(s => <Filtro key={s} ativo={status === s} aoClicar={() => definirStatus(s)} contagem={s === 'todos' ? eventos.length : eventos.filter(e => e.status_processamento === s).length}>{s === 'todos' ? 'Todos' : s === 'ignorado' ? 'Ignorados' : STATUS_EVENTO[s]}</Filtro>)}
        </div>
        {visiveis.length === 0 ? <div style={{ padding: 20 }}><Estado icone={status === 'erro' ? 'certo' : undefined} titulo={status === 'erro' ? 'Nenhum aviso com problema' : 'Nenhum aviso neste filtro'} texto={status === 'erro' ? 'O Mercado Pago e o site estão de acordo.' : undefined} /></div> :
          <ul className="a3-fila-avisos">{visiveis.map(e => {
            const erro = e.status_processamento === 'erro', visto = lidos.has(String(e.id))
            return <li key={e.id}><button type="button" className="a3-fila-avisos__item" aria-current={atual?.id === e.id ? 'true' : undefined} onClick={() => abrir(e.id)}>
              <span className={'a3-ponto' + (erro && !visto ? ' a3-ponto--erro' : '')} aria-hidden="true" />
              <span className="a3-fila-avisos__texto">
                <span className="a3-nome">{e.nome ?? e.usuario ?? TIPOS_EVENTO[e.tipo ?? ''] ?? 'Aviso do Mercado Pago'}</span>
                <span className="a3-sub">{erro && e.erro ? nomeErro(e.erro) : TIPOS_EVENTO[e.tipo ?? ''] ?? e.tipo ?? '—'}</span>
              </span>
              <span className="a3-fila-avisos__quando">{haQuanto(e.recebido_em)}</span>
            </button></li>
          })}</ul>}
      </div>
      <div className="a3-caixa-entrada__detalhe" aria-live="polite">
        {!atual ? <Estado compacto titulo="Escolha um aviso" /> : <Detalhe e={atual} visto={lidos.has(String(atual.id))} comDono={comDono} reprocessando={reprocessando}
          aoReprocessar={() => void reprocessar(atual)} aoVisto={v => marcar([String(atual.id)], v)} aoFicha={() => atual.id_usuario && nav.abrirPessoa(atual.id_usuario, 'assinatura')} />}
      </div>
    </section>
  </div>
}

function Detalhe({ e, visto, comDono, reprocessando, aoReprocessar, aoVisto, aoFicha }: {
  e: EventoPagamento; visto: boolean; comDono: boolean; reprocessando: number | null; aoReprocessar: () => void; aoVisto: (v: boolean) => void; aoFicha: () => void
}) {
  const erro = e.status_processamento === 'erro'
  const link = linkDoEvento(e)
  return <div className="a3-pilha">
    <div style={{ display: 'grid', gap: 6 }}>
      <Situacao tom={erro && visto ? 'neutro' : TOM[e.status_processamento] ?? 'neutro'}>{erro && visto ? 'Visto' : STATUS_EVENTO[e.status_processamento] ?? e.status_processamento}</Situacao>
      <h3 className="a3-titulo-2">{TIPOS_EVENTO[e.tipo ?? ''] ?? 'Aviso do Mercado Pago'}</h3>
      <p className="a3-mudo">Recebido em {dataHora(e.recebido_em)}{e.processado_em ? ` · processado em ${dataHora(e.processado_em)}` : ' · ainda na fila'}</p>
    </div>
    {erro && e.erro && <Faixa tom="erro" titulo={nomeErro(e.erro)}>O site não conseguiu aplicar este aviso. Confira o pagamento no Mercado Pago; se ele existir, reprocesse.</Faixa>}
    <dl className="a3-pares">
      {comDono && <div><dt>Pessoa</dt><dd>{e.id_usuario ? <>{e.nome ?? e.usuario}{e.nome && e.usuario && <span className="a3-mudo" style={{ display: 'block', fontWeight: 400 }}>{e.usuario}</span>}</> : <span className="a3-mudo" style={{ fontWeight: 400 }}>não deu para ligar a uma pessoa</span>}</dd></div>}
      <div><dt>Número no Mercado Pago</dt><dd className="num">{e.id_recurso ?? '—'}</dd></div>
      <div><dt>Códigos técnicos</dt><dd className="a3-codigo">evento {e.id_evento} · tipo {e.tipo ?? '—'}{e.erro ? ` · erro ${e.erro}` : ''}</dd></div>
    </dl>
    <div className="a3-acoes-linha">
      {erro && <button type="button" className="a3-botao" disabled={reprocessando !== null} aria-busy={reprocessando === e.id} onClick={aoReprocessar}><Icone nome="atualizar" tamanho={15} />{reprocessando === e.id ? 'Reprocessando… aguardando o resultado' : 'Reprocessar'}</button>}
      {erro && <button type="button" className="a3-botao a3-botao--contorno" onClick={() => aoVisto(!visto)}><Icone nome={visto ? 'olho' : 'certo'} tamanho={15} />{visto ? 'Marcar como não visto' : 'Marcar como visto'}</button>}
      {e.id_usuario && <button type="button" className="a3-botao a3-botao--contorno" onClick={aoFicha}><Icone nome="usuario" tamanho={15} />Ficha e assinatura</button>}
      {link && <a className="a3-botao a3-botao--fantasma" href={link} target="_blank" rel="noopener noreferrer"><Icone nome="externo" tamanho={15} />Abrir no Mercado Pago</a>}
    </div>
  </div>
}
