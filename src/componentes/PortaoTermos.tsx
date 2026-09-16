import { useEffect, useRef, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { supabase } from '../conta/supabase'
import { registrarAceiteConta, registrarAceiteLocal, termosAceitos } from '../conta/termos'
import { href, usarRota } from '../util/rotas'

/**
 * Portão bloqueante de aceite dos Termos de Uso e Consentimento. Fica visível
 * até a pessoa marcar a caixa e confirmar — sem fechar por Esc ou clique fora,
 * porque o aceite não é opcional. A página de termos em si fica de fora do
 * bloqueio, para dar para ler o texto completo antes de aceitar.
 */
export function PortaoTermos() {
  const { sessao } = usarConta()
  const rota = usarRota()
  const [visivel, definirVisivel] = useState(() => !termosAceitos(sessao))
  const [concordo, definirConcordo] = useState(false)
  const [ocupado, definirOcupado] = useState(false)
  const [erro, definirErro] = useState('')
  const referencia = useRef<HTMLDivElement>(null)

  useEffect(() => {
    definirVisivel(!termosAceitos(sessao))
  }, [sessao])

  useEffect(() => {
    if (!visivel || rota.caminho === '/termos') return
    const caixa = referencia.current
    caixa?.querySelector('.portao-termos__caixa')?.scrollTo({ top: 0 })
    caixa?.focus()
    function aoTeclar(evento: KeyboardEvent) {
      // Sem atalho de Esc: o aceite não pode ser dispensado sem marcar a caixa.
      if (evento.key !== 'Tab' || !caixa) return
      const focaveis = caixa.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled])')
      if (focaveis.length === 0) return
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      if (evento.shiftKey && document.activeElement === primeiro) { evento.preventDefault(); ultimo.focus() }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro.focus() }
    }
    document.addEventListener('keydown', aoTeclar, true)
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTeclar, true)
      document.body.style.overflow = anterior
    }
  }, [visivel, rota.caminho])

  if (!visivel || rota.caminho === '/termos') return null

  async function aceitar() {
    if (!concordo || ocupado) return
    definirOcupado(true)
    definirErro('')
    try {
      if (sessao) {
        const { error } = await registrarAceiteConta()
        if (error) throw error
      } else {
        registrarAceiteLocal()
      }
      definirVisivel(false)
    } catch {
      definirErro('Não foi possível registrar seu aceite agora. Confira sua conexão e tente novamente.')
    } finally {
      definirOcupado(false)
    }
  }

  async function sair() {
    if (!supabase || ocupado) return
    definirOcupado(true)
    try { await supabase.auth.signOut({ scope: 'local' }) } finally { definirOcupado(false) }
  }

  return (
    <>
      <div className="veu" style={{ zIndex: 90 }} />
      <div className="portao-termos" role="dialog" aria-modal="true" aria-labelledby="portao-termos-titulo" ref={referencia} tabIndex={-1}>
        <div className="cartao cartao__corpo empilha portao-termos__caixa">
          <p className="meta">ANTES DE CONTINUAR</p>
          <h2 id="portao-termos-titulo">Termos de Uso e Consentimento</h2>
          <p>
            Para usar o {sessao ? 'OrtoQuestões com sua conta' : 'OrtoQuestões'}, você precisa ler e
            aceitar os nossos Termos de Uso e Consentimento. Em resumo:
          </p>
          <ul className="lista">
            <li>O acervo mistura questões antigas de prova (TEOT, TARO, R4 do ENARE), simulados e questões próprias, inspiradas em provas fechadas ao público (como a da SBQ), sempre identificadas quando é o caso.</li>
            <li>Os comentários explicativos são produzidos com apoio de IA a partir de livros-texto: podem conter erros e não substituem o estudo pelos livros de verdade, mesmo quando estão certos.</li>
            <li>Nada no site substitui avaliação médica de paciente real nem serve como orientação clínica.</li>
            <li>O site é gratuito hoje, mas isso pode mudar no futuro.</li>
          </ul>
          <p>
            <a href={href('/termos')}>Leia o termo completo antes de aceitar</a> — inclui as
            limitações de responsabilidade, a política de dados pessoais e todos os detalhes acima.
          </p>
          <label className="campo campo--checkbox">
            <input type="checkbox" checked={concordo} onChange={e => definirConcordo(e.target.checked)} />
            Li e concordo com os Termos de Uso e Consentimento do OrtoQuestões, incluindo as limitações
            sobre o conteúdo gerado por IA e a ausência de qualquer orientação médica.
          </label>
          {erro && <p role="alert" className="aviso-ia aviso-ia--gabarito">{erro}</p>}
          <div className="linha">
            <button type="button" className="botao botao--principal" disabled={!concordo || ocupado} onClick={() => void aceitar()}>
              {ocupado ? 'Aguarde…' : 'Aceitar e continuar'}
            </button>
            {sessao && (
              <button type="button" className="botao botao--fantasma" disabled={ocupado} onClick={() => void sair()}>
                Não aceito, sair da conta
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
