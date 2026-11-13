import { useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { RECEBEDOR, dataDoPagamento, nomeMeio, nomePlano, numeroRecibo, temRecibo, valorEmReais, type Pagamento } from '../conta/recibo'
import { chamarRpc } from '../servicos/supabase'
import { Icone } from './Icone'
import '../estilos/paginas/Recibo.css'

/**
 * Recibos dos pagamentos (13/11/2026, pedido do Tales: "deixa o botão meio escondido"). Fica recolhido no fim de
 * Detalhes da assinatura; aberto, lista os pagamentos aprovados e mostra o recibo de um deles, pronto para imprimir
 * ou salvar em PDF pelo navegador. Se a consulta meus_recibos() ainda não existir no servidor, nada aparece.
 */
export function Recibos() {
  const { sessao } = usarConta()
  const [aberto, definirAberto] = useState(false)
  const [pagamentos, definirPagamentos] = useState<Pagamento[] | null>(null)
  const [falhou, definirFalhou] = useState(false)
  const [escolhido, definirEscolhido] = useState<Pagamento | null>(null)

  useEffect(() => {
    if (!aberto || pagamentos || !sessao) return
    chamarRpc<Pagamento[]>('meus_recibos', {}).then((l) => definirPagamentos(Array.isArray(l) ? l : [])).catch(() => definirFalhou(true))
  }, [aberto, pagamentos, sessao])

  if (!sessao) return null
  const nome = [sessao.user.user_metadata?.nome, sessao.user.user_metadata?.sobrenome].map((v) => String(v ?? '').trim()).filter(Boolean).join(' ')

  return (
    <details className="recibos" onToggle={(e) => definirAberto((e.target as HTMLDetailsElement).open)}>
      <summary>Recibos dos pagamentos</summary>
      <div className="recibos__corpo">
        {falhou && <p className="ct-nota">Não foi possível consultar os recibos agora. Se precisar de um comprovante, fale com o suporte.</p>}
        {!falhou && !pagamentos && aberto && <p className="ct-nota">Carregando…</p>}
        {pagamentos && pagamentos.length === 0 && <p className="ct-nota">Ainda não há pagamentos aprovados nesta conta.</p>}
        {pagamentos && pagamentos.length > 0 && (
          <ul className="recibos__lista">
            {pagamentos.map((p) => (
              <li key={`${p.meio}-${p.id_pagamento}`}>
                <span>{dataDoPagamento(p.em) ?? 'Data não informada'} · {nomePlano(p.plano)} · {nomeMeio(p.meio)}{valorEmReais(p.valor) ? ` · ${valorEmReais(p.valor)}` : ''}</span>
                {temRecibo(p)
                  ? <button type="button" className="recibos__ver" onClick={() => definirEscolhido(p)}>Ver recibo</button>
                  : <span className="recibos__sem">{p.situacao === 'reembolsada' ? 'Reembolsado' : 'Sem recibo'}</span>}
              </li>
            ))}
          </ul>
        )}
        {escolhido && <Recibo pagamento={escolhido} pagador={nome} email={sessao.user.email ?? ''} aoFechar={() => definirEscolhido(null)} />}
      </div>
    </details>
  )
}

function Recibo({ pagamento, pagador, email, aoFechar }: { pagamento: Pagamento; pagador: string; email: string; aoFechar: () => void }) {
  useEffect(() => {
    document.body.classList.add('imprimindo-recibo')
    return () => document.body.classList.remove('imprimindo-recibo')
  }, [])
  const valor = valorEmReais(pagamento.valor)
  const data = dataDoPagamento(pagamento.em)
  return (
    <section className="recibo" aria-labelledby="recibo-titulo">
      <header className="recibo__cabeca">
        <div>
          <p className="recibo__selo">Orto Questões</p>
          <h3 id="recibo-titulo">Recibo de pagamento</h3>
        </div>
        <p className="recibo__numero">Nº <span className="numerico">{numeroRecibo(pagamento)}</span></p>
      </header>
      <p className="recibo__texto">
        Recebi de <strong>{pagador || email}</strong>{pagador && email ? <> ({email})</> : null} a quantia de <strong>{valor}</strong>,
        referente à assinatura do <strong>{nomePlano(pagamento.plano).toLowerCase()}</strong> do Orto Questões
        (ortoquestoes.com.br), pago em {data} por {nomeMeio(pagamento.meio).toLowerCase()}.
      </p>
      <dl className="recibo__dados">
        <div><dt>Valor</dt><dd>{valor}</dd></div>
        <div><dt>Data do pagamento</dt><dd>{data}</dd></div>
        <div><dt>Serviço</dt><dd>{nomePlano(pagamento.plano)}, acesso digital</dd></div>
        <div><dt>Meio</dt><dd>{nomeMeio(pagamento.meio)}, pelo Mercado Pago</dd></div>
        <div><dt>Operação no Mercado Pago</dt><dd className="numerico">{pagamento.id_pagamento}</dd></div>
      </dl>
      <div className="recibo__recebedor">
        <p><strong>{RECEBEDOR.nome}</strong></p>
        <p>{RECEBEDOR.documento} · {RECEBEDOR.endereco}</p>
      </div>
      <p className="recibo__nota">Recibo de prestação de serviço digital, emitido por pessoa física, sem valor de nota fiscal.</p>
      <div className="recibo__acoes nao-imprime">
        <button type="button" className="botao botao--principal" onClick={() => window.print()}><Icone nome="impressora" tamanho={16} /> Imprimir ou salvar em PDF</button>
        <button type="button" className="botao" onClick={aoFechar}>Fechar</button>
      </div>
    </section>
  )
}
