import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { recurso } from '../config'
import { porExtenso } from '../util/extenso'
import '../estilos/componentes/ModalConfirmarEmail.css'
import '../estilos/componentes/EsperaPixel.css'

interface Props {
  total: number
  acertos: number | null
  simulado: boolean
  /** Primeiro nome do cadastro; vazio, as frases funcionam sem ele. */
  nome?: string
  /** Tema com mais acertos na sessão (ao menos dois), se houver. */
  melhorTema?: string | null
  /** Tema que mais pediu revisão (ao menos dois erros), dito como oportunidade e sem número. */
  oportunidade?: string | null
  aoConcluir: () => void
  /** Fechar para ler o comentário da última questão; o botão flutuante assume. */
  aoLer: () => void
}

/**
 * Fim de sessão no meio da tela: a última questão foi respondida e o botão
 * "Concluir" ficava lá embaixo da página (no celular, uma rolagem longa).
 * Mesmo cartão de missão do pop-up de e-mail, com o guerreiro comemorando.
 * Redesenho de 18/10/2026: o nome da pessoa no título e os números da sessão em placas
 * de pixel, com o tato dos e-mails (docs/emails/TOM.md): contagens abaixo de dez por
 * extenso, porcentagem só a partir de 50%, o tema fraco como a próxima conquista.
 */
export function ModalFimSessao({ total, acertos, simulado, nome = '', melhorTema = null, oportunidade = null, aoConcluir, aoLer }: Props) {
  const caixa = useRef<HTMLDivElement>(null)
  const ler = useRef(aoLer)
  ler.current = aoLer
  useEffect(() => {
    caixa.current?.querySelector<HTMLElement>('.cf-email__acao')?.focus()
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') ler.current() }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [])
  const comNome = (frase: string) => (nome ? `${nome}, ${frase.charAt(0).toLowerCase()}${frase.slice(1)}` : frase)
  const titulo = simulado ? comNome('Pronto para entregar.') : comNome('Sessão vencida.')
  const taxa = acertos !== null && total > 0 ? Math.round((acertos / total) * 100) : null
  const placas: Array<{ valor: string; rotulo: string }> = [
    { valor: porExtenso(total), rotulo: total === 1 ? 'questão' : 'questões' },
  ]
  if (!simulado && acertos !== null && acertos > 0 && taxa !== null && taxa >= 50) placas.push({ valor: porExtenso(acertos, 'm'), rotulo: acertos === 1 ? 'acerto' : 'acertos' })
  if (!simulado && taxa !== null && taxa >= 50 && total >= 5) placas.push({ valor: `${taxa}%`, rotulo: 'de acerto' })
  return createPortal(
    <div className="cf-email__veu" role="presentation">
      <div className="cf-email fim-sessao" role="dialog" aria-modal="true" aria-labelledby="fim-sessao-titulo" aria-describedby="fim-sessao-texto" ref={caixa}>
        <button type="button" className="cf-email__fechar" onClick={aoLer} aria-label="Fechar e ler o comentário">X</button>
        <span className="espera-pixel__guerreiro fim-sessao__guerreiro" aria-hidden="true" style={{ backgroundImage: `url(${recurso('ranking/guerreiro.png')})` }} />
        <p className="cf-email__selo">{simulado ? 'Simulado completo' : 'Missão cumprida'}</p>
        <h2 id="fim-sessao-titulo">{titulo}</h2>
        <dl className="fim-sessao__placas">
          {placas.map((p) => (
            <div key={p.rotulo} className="fim-sessao__placa">
              <dt>{p.rotulo}</dt>
              <dd className={p.valor.length > 4 ? 'fim-sessao__valor--palavra' : undefined}>{p.valor}</dd>
            </div>
          ))}
        </dl>
        <div className="cf-email__texto fim-sessao__texto" id="fim-sessao-texto">
          {simulado ? (
            <p>Você respondeu todas. Entregue para ver a nota e o gabarito comentado.</p>
          ) : (
            <>
              {melhorTema && <p><strong>{melhorTema}</strong> foi o seu ponto forte nesta sessão.</p>}
              <p>
                {oportunidade
                  ? <><strong>{oportunidade}</strong> é a próxima conquista: o resumo mostra o que revisar.</>
                  : 'O resumo mostra o que revisar.'}
              </p>
            </>
          )}
        </div>
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
