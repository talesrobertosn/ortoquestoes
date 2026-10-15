import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { recurso } from '../config'
import '../estilos/componentes/ModalConfirmarEmail.css'
import '../estilos/componentes/EsperaPixel.css'

interface Props {
  total: number
  acertos: number | null
  simulado: boolean
  aoConcluir: () => void
  /** Fechar para ler o comentário da última questão; o botão flutuante assume. */
  aoLer: () => void
}

/**
 * Fim de sessão no meio da tela: a última questão foi respondida e o botão
 * "Concluir" ficava lá embaixo da página (no celular, uma rolagem longa).
 * Mesmo cartão de missão do pop-up de e-mail, com o guerreiro comemorando.
 */
export function ModalFimSessao({ total, acertos, simulado, aoConcluir, aoLer }: Props) {
  const caixa = useRef<HTMLDivElement>(null)
  const ler = useRef(aoLer)
  ler.current = aoLer
  useEffect(() => {
    caixa.current?.querySelector<HTMLElement>('.cf-email__acao')?.focus()
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') ler.current() }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [])
  return createPortal(
    <div className="cf-email__veu" role="presentation">
      <div className="cf-email fim-sessao" role="dialog" aria-modal="true" aria-labelledby="fim-sessao-titulo" ref={caixa}>
        <button type="button" className="cf-email__fechar" onClick={aoLer} aria-label="Fechar e ler o comentário">X</button>
        <span className="espera-pixel__guerreiro fim-sessao__guerreiro" aria-hidden="true" style={{ backgroundImage: `url(${recurso('ranking/guerreiro.png')})` }} />
        <p className="cf-email__selo">{simulado ? 'Simulado completo' : 'Missão cumprida'}</p>
        <h2 id="fim-sessao-titulo">{simulado ? 'Pronto para entregar!' : 'Sessão vencida!'}</h2>
        <p className="cf-email__texto">
          {simulado
            ? <>Você respondeu as <strong>{total}</strong> questões. Entregue para ver a nota e o gabarito comentado.</>
            : <>Você respondeu as <strong>{total}</strong> questões{acertos !== null && <> e acertou <strong>{acertos}</strong></>}. O resumo mostra o que revisar.</>}
        </p>
        <button type="button" className="botao botao--principal cf-email__acao" onClick={aoConcluir}>{simulado ? 'Entregar o simulado' : 'Ver meu resultado'}</button>
        {!simulado && <button type="button" className="cf-email__corrigir" onClick={aoLer}>Ler o comentário da última antes</button>}
      </div>
    </div>,
    document.body,
  )
}

/** Botão fixo embaixo da tela, para concluir sem rolar até o fim da página. */
export function BotaoConcluirFlutuante({ aoConcluir, simulado }: { aoConcluir: () => void; simulado: boolean }) {
  return createPortal(
    <button type="button" className="concluir-flutuante" onClick={aoConcluir}>
      {simulado ? 'Entregar o simulado' : 'Concluir e ver resultado'}
    </button>,
    document.body,
  )
}
