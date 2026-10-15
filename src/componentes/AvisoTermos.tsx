import { useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { supabase } from '../conta/supabase'
import { dadosAceiteTermos, dataDaVersao, MUDANCAS_TERMOS, VERSAO_TERMOS } from '../conta/termos'
import { href } from '../util/rotas'
import { Icone } from './Icone'

/** "Agora não" vale só para esta aba: o aviso volta na próxima visita até a pessoa concordar. */
const CHAVE_ADIADO = 'oq-termos-adiado'

function adiadoNestaAba(): boolean {
  try { return sessionStorage.getItem(CHAVE_ADIADO) === VERSAO_TERMOS } catch { return false }
}

/**
 * Aviso de Termos atualizados para quem tem conta e aceitou uma versão anterior
 * (ou nenhuma). Mostra o que mudou, leva aos textos completos e registra a
 * concordância na conta (metadados `termos_versao` e `termos_aceitos_em`).
 *
 * - `faixa` (padrão): no topo de todas as páginas, com "Agora não" (adia nesta aba).
 * - `cartao`: dentro de Minha conta, sem a opção de adiar.
 *
 * A conta continua funcionando enquanto a pessoa lê; quem não concordar pode
 * encerrar a conta e cancelar a renovação, como dizem os próprios Termos.
 */
export function AvisoTermos({ variante = 'faixa' }: { variante?: 'faixa' | 'cartao' }) {
  const { sessao } = usarConta()
  const [estado, definirEstado] = useState<'aberto' | 'enviando' | 'feito' | 'erro'>('aberto')
  const [adiado, definirAdiado] = useState(adiadoNestaAba)
  const versaoAceita = sessao?.user.user_metadata?.termos_versao
  if (!supabase || !sessao || versaoAceita === VERSAO_TERMOS) return null
  if (variante === 'faixa' && adiado) return null
  if (estado === 'feito') {
    return variante === 'cartao'
      ? <p className="aviso-formulario" role="status">Sua concordância com os Termos de Uso e as Condições da Assinatura de {dataDaVersao(VERSAO_TERMOS)} foi registrada.</p>
      : null
  }

  const concordar = async () => {
    if (!supabase || estado === 'enviando') return
    definirEstado('enviando')
    try {
      const { error } = await supabase.auth.updateUser({ data: dadosAceiteTermos() })
      if (error) throw error
      definirEstado('feito')
    } catch { definirEstado('erro') }
  }
  const adiar = () => {
    try { sessionStorage.setItem(CHAVE_ADIADO, VERSAO_TERMOS) } catch { /* sem armazenamento: some só agora */ }
    definirAdiado(true)
  }

  return <section className={`aviso-termos aviso-termos--${variante} nao-imprime`} aria-labelledby="aviso-termos-titulo">
    <div className={variante === 'faixa' ? 'conteudo aviso-termos__interno' : 'aviso-termos__interno'}>
      <div className="aviso-termos__texto">
        <h2 id="aviso-termos-titulo"><Icone nome="livro" tamanho={18} /> Atualizamos os Termos de Uso e as Condições da Assinatura</h2>
        <p>
          A nova versão vale a partir de {dataDaVersao(VERSAO_TERMOS)}. Nada mudou em preços, planos, limites ou na garantia
          de 7 dias. Sua conta continua funcionando normalmente enquanto você lê.
        </p>
        <details className="aviso-termos__mudancas" open={variante === 'cartao'}>
          <summary>O que mudou, em resumo</summary>
          <ul>{MUDANCAS_TERMOS.map((m) => <li key={m}>{m}</li>)}</ul>
        </details>
        {estado === 'erro' && <p className="aviso-termos__erro" role="alert">Não foi possível registrar agora. Confira sua conexão e tente de novo; sua conta continua disponível.</p>}
      </div>
      <div className="aviso-termos__acoes">
        <a className="botao" href={href('/termos')}>Ler os Termos</a>
        <a className="botao" href={href('/condicoes-assinatura')}>Ler as Condições</a>
        <button className="botao botao--principal" type="button" disabled={estado === 'enviando'} onClick={() => void concordar()}>
          {estado === 'enviando' ? 'Registrando…' : 'Li e concordo'}
        </button>
        {variante === 'faixa' && <button className="botao botao--fantasma" type="button" onClick={adiar}>Agora não</button>}
      </div>
    </div>
  </section>
}
