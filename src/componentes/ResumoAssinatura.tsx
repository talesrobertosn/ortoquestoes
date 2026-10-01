import { useCallback, useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { chamarFuncao, chamarRpc } from '../servicos/supabase'
import { href } from '../util/rotas'

interface EstadoAssinatura {
  plano: string | null
  status_assinatura: string | null
  fim_periodo: string | null
  ultima_cobranca_em: string | null
  cancelar_ao_fim: boolean
}

const data = (valor: string | null) => valor ? new Date(valor).toLocaleDateString('pt-BR') : 'Não informada'
const mensagensStatus: Record<string, { titulo: string; explicacao: string }> = {
  ativa: { titulo: 'Em dia', explicacao: 'Seu plano está ativo. A próxima cobrança, se houver, aparece abaixo.' },
  cancelada: { titulo: 'Assinatura encerrada', explicacao: 'O período pago terminou e a renovação está cancelada. Não houve reembolso desta cobrança. Seu histórico permanece salvo.' },
  pendente: { titulo: 'Pendente', explicacao: 'Aguardamos a confirmação do Mercado Pago. Não considere o acesso pago ativo ainda.' },
  falha_pagamento: { titulo: 'Falha no pagamento', explicacao: 'O pagamento não foi aprovado. Você pode continuar usando a modalidade gratuita.' },
  pausada: { titulo: 'Pausada', explicacao: 'A assinatura está pausada. Consulte o Mercado Pago antes de esperar uma nova cobrança.' },
  vencida: { titulo: 'Vencida', explicacao: 'O período desta assinatura terminou. Seu histórico de estudos permanece salvo.' },
  reembolsada: { titulo: 'Encerrada e reembolsada', explicacao: 'O Mercado Pago confirmou o reembolso. O acesso pago terminou e sua conta voltou à modalidade gratuita, com o histórico preservado.' },
}

export function ResumoAssinatura({ detalhada = false }: { detalhada?: boolean }) {
  const { sessao } = usarConta()
  const [estado, definirEstado] = useState<EstadoAssinatura | null>(null)
  const [carregando, definirCarregando] = useState(true)
  const [processando, definirProcessando] = useState(false)
  const [acaoPendente, definirAcaoPendente] = useState<'cancelar' | 'reembolsar' | null>(null)
  const [mensagem, definirMensagem] = useState('')

  const atualizar = useCallback(async () => {
    if (!sessao) return
    try {
      const linhas = await chamarRpc<EstadoAssinatura[]>('obter_estado_conta', {})
      let proximoEstado = linhas[0] ?? null
      if (proximoEstado?.plano && ['ativa', 'cancelada', 'pendente', 'falha_pagamento', 'pausada'].includes(proximoEstado.status_assinatura ?? '')) {
        try {
          await chamarFuncao('gerenciar-plano', { acao: 'sincronizar_cobranca' })
          proximoEstado = (await chamarRpc<EstadoAssinatura[]>('obter_estado_conta', {}))[0] ?? proximoEstado
        } catch { /* A consulta da conta permanece disponível se a conciliação falhar. */ }
      }
      definirEstado(proximoEstado)
    } catch { definirMensagem('Não foi possível consultar a assinatura agora. Atualize a página e tente novamente.') }
    finally { definirCarregando(false) }
  }, [sessao])

  useEffect(() => { void atualizar() }, [atualizar])

  async function gerenciar(acao: 'cancelar' | 'reembolsar') {
    definirProcessando(true)
    definirMensagem(acao === 'reembolsar' ? 'Solicitando e confirmando o reembolso com o Mercado Pago…' : 'Interrompendo as próximas renovações…')
    try {
      await chamarFuncao('gerenciar-plano', { acao })
      await atualizar()
      definirMensagem(acao === 'cancelar'
        ? 'Renovação cancelada. O acesso pago continua até o fim do período já cobrado; não houve reembolso.'
        : 'Reembolso confirmado pelo Mercado Pago. O acesso voltou ao gratuito e seu histórico foi preservado.')
    } catch (erro) {
      const texto = erro instanceof Error ? erro.message : ''
      definirMensagem(texto.includes('Mercado Pago não confirmou')
        ? 'Não recebemos confirmação do reembolso. Sua assinatura não foi alterada. Entre em contato pelo canal do site para atendimento manual da garantia; confira o pagamento no Mercado Pago antes de tentar novamente.'
        : 'Não foi possível confirmar o resultado da solicitação. Atualize a página e confira o estado no Mercado Pago antes de tentar novamente.')
    } finally { definirProcessando(false); definirAcaoPendente(null) }
  }

  if (!sessao) return null
  const ativo = Boolean(estado?.status_assinatura === 'ativa' && (!estado.fim_periodo || new Date(estado.fim_periodo).getTime() > Date.now()))
  const statusAtual = estado?.status_assinatura ?? ''
  const descricao = mensagensStatus[statusAtual]
  const periodoPagoVigente = Boolean(estado?.fim_periodo && new Date(estado.fim_periodo).getTime() > Date.now())
  const renovacaoCancelada = (ativo && estado?.cancelar_ao_fim) || (statusAtual === 'cancelada' && periodoPagoVigente)
  const statusExibido = renovacaoCancelada ? 'Sem renovação automática' : descricao?.titulo ?? 'Sem assinatura'
  const planoVisivel = estado?.plano && (ativo || (statusAtual === 'cancelada' && periodoPagoVigente))
    ? `Plano ${estado.plano}`
    : 'Plano gratuito'
  const idadeCobranca = Date.now() - new Date(estado?.ultima_cobranca_em ?? '').getTime()
  const garantia = (ativo || statusAtual === 'cancelada') && Number.isFinite(idadeCobranca)
    && idadeCobranca >= 0 && idadeCobranca <= 7 * 864e5

  return <section className="ct-cartao ct-cartao--largo" aria-label="Minha assinatura">
    <header className="ct-cartao__cabeca"><div><h2>Minha assinatura</h2>{detalhada && <p>Seu histórico permanece preservado ao cancelar ou usar a garantia.</p>}</div></header>
    {carregando ? <p role="status">Carregando assinatura…</p> : <>
      <dl className="conta-assinatura__dados conta-assinatura__dados--resumo">
        <div><dt>Plano</dt><dd>{planoVisivel}</dd></div>
        <div><dt>Status</dt><dd>{statusExibido}</dd></div>
      </dl>
      {detalhada ? <>
      {estado?.plano && !ativo && <p className="ct-nota">Plano desta assinatura: {estado.plano}. Seu acesso atual é {planoVisivel.toLowerCase()}.</p>}
      <dl className="conta-assinatura__dados">
        <div><dt>{estado?.cancelar_ao_fim || ['cancelada', 'vencida', 'reembolsada'].includes(statusAtual) ? 'Término do acesso' : ativo ? 'Próxima cobrança' : 'Data informada pelo provedor'}</dt><dd>{data(estado?.fim_periodo ?? null)}</dd></div>
        <div><dt>Última cobrança</dt><dd>{data(estado?.ultima_cobranca_em ?? null)}</dd></div>
      </dl>
      <p className="ct-nota">{renovacaoCancelada
        ? 'Este período não tem renovação automática: não haverá nova cobrança. A cobrança já feita não foi reembolsada; você mantém o acesso ilimitado até o término indicado. Seu histórico permanece salvo.'
        : descricao?.explicacao ?? 'Você está na modalidade gratuita. Pode continuar estudando normalmente.'}</p>
      {(garantia || (ativo && !estado?.cancelar_ao_fim)) && <div className="conta-assinatura__escolhas" aria-label="Opções da assinatura">
        {garantia && <section className="conta-assinatura__escolha">
          <h3>Desistir da compra e pedir reembolso integral</h3>
          <p>Disponível até sete dias após a última cobrança. Se o Mercado Pago confirmar o reembolso, esta assinatura termina, o acesso volta ao gratuito e seu histórico continua salvo.</p>
          <button className="botao botao--principal" type="button" disabled={processando} onClick={() => { definirAcaoPendente('reembolsar'); definirMensagem('') }}>Desistir e solicitar reembolso integral</button>
        </section>}
        {ativo && !estado?.cancelar_ao_fim && <section className="conta-assinatura__escolha">
          <h3>Apenas impedir a próxima renovação</h3>
          <p>Não há reembolso da cobrança já feita. Você continua com acesso ilimitado até o fim do período pago; depois volta ao gratuito.</p>
          <button className="botao" type="button" disabled={processando} onClick={() => { definirAcaoPendente('cancelar'); definirMensagem('') }}>Impedir a próxima renovação</button>
        </section>}
      </div>}
      {acaoPendente && <section className="conta-assinatura__confirmacao" aria-label="Confirmar escolha da assinatura">
        <h3>{acaoPendente === 'reembolsar' ? 'Confirmar pedido de reembolso integral?' : 'Confirmar fim das renovações?'}</h3>
        <p>{acaoPendente === 'reembolsar'
          ? 'O pedido será enviado ao Mercado Pago. Somente após a confirmação do reembolso o acesso pago será encerrado; suas respostas e revisões continuarão salvas.'
          : 'As cobranças futuras desta assinatura serão interrompidas. A cobrança atual não será reembolsada e o acesso pago continuará até o término do período.'}</p>
        <div className="linha linha--empilha-celular">
          <button className="botao botao--principal" type="button" disabled={processando} onClick={() => void gerenciar(acaoPendente)}>{acaoPendente === 'reembolsar' ? 'Confirmar pedido de reembolso' : 'Confirmar fim das renovações'}</button>
          <button className="botao" type="button" disabled={processando} onClick={() => definirAcaoPendente(null)}>Voltar</button>
        </div>
      </section>}
      <a className="botao botao--fantasma" href={href('/assinatura')}>Ver planos</a>
      </> : <a className="conta-assinatura__detalhes-link" href={href('/conta/assinatura')}>Mais dados sobre minha assinatura <span aria-hidden="true">↗</span></a>}
    </>}
    {mensagem && <p role="status">{mensagem}</p>}
  </section>
}

