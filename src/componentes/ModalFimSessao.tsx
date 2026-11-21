import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CorujaPixel } from '../biblioteca/sala/CorujaPixel'
import { porExtenso } from '../util/extenso'
import { Icone } from './Icone'
import '../estilos/componentes/FimSessao.css'

/** Como ficou cada questão, na ordem da sessão (a folha de respostas em miniatura). */
export type SituacaoFim = 'certa' | 'errada' | 'anulada' | 'pulada'

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
  /** A folha da sessão, questão por questão. */
  folha?: SituacaoFim[]
  /** Soma do tempo das respostas, em segundos. */
  segundos?: number
  aoConcluir: () => void
  /** Fechar para ler o comentário da última questão; o botão flutuante assume. */
  aoLer: () => void
}

/** "45 s", "4 min", "1 h 05 min": o tempo da sessão em uma palavra. */
function tempo(segundos: number): string {
  const s = Math.max(0, Math.round(segundos))
  if (s < 60) return `${s} s`
  if (s < 3600) return `${Math.round(s / 60)} min`
  return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`
}

/**
 * Fim de sessão (refeito do zero em 21/11/2026, Tales: "refazer do zero, no design padrão do site").
 * Cartão branco na linguagem do Desempenho (verde-azulado e azul-ardósia, Plus Jakarta nos títulos e números,
 * botões de verdade), com a coruja bibliotecária no lugar do guerreiro antigo: ela "corrige" a folha de respostas,
 * que aparece em miniatura logo abaixo dela. O tato dos e-mails continua (docs/emails/TOM.md): contagens pequenas
 * por extenso e as cores de certo e errado, os acertos e a porcentagem só a partir de 50%; abaixo disso, a folha
 * mostra só que tudo foi respondido e o texto aponta o tema a revisar como a próxima conquista.
 */
export function ModalFimSessao({ total, acertos, simulado, nome = '', melhorTema = null, oportunidade = null, folha = [], segundos = 0, aoConcluir, aoLer }: Props) {
  const caixa = useRef<HTMLDivElement>(null)
  const ler = useRef(aoLer)
  ler.current = aoLer
  useEffect(() => {
    caixa.current?.querySelector<HTMLElement>('.fs-acao')?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { ler.current(); return }
      // Foco preso no cartão: Tab circula entre os botões dele.
      if (e.key !== 'Tab' || !caixa.current) return
      const focaveis = [...caixa.current.querySelectorAll<HTMLElement>('button')]
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo?.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro?.focus() }
    }
    document.addEventListener('keydown', tecla)
    const rolagem = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = rolagem }
  }, [])

  // A mesma conta do resultado: anuladas e sem resposta não entram na porcentagem.
  const contadas = folha.length ? folha.filter((s) => s === 'certa' || s === 'errada').length : total
  const taxa = acertos !== null && contadas > 0 ? Math.round((acertos / contadas) * 100) : null
  const mostraResultado = !simulado && taxa !== null && taxa >= 50
  const comNome = (frase: string) => (nome ? `${nome}, ${frase.charAt(0).toLowerCase()}${frase.slice(1)}` : frase)
  const titulo = simulado ? comNome('Prova respondida.') : mostraResultado && taxa! >= 80 ? comNome('Que sessão!') : comNome('Você chegou ao fim.')
  const estadoCoruja = simulado ? 'olhando' : mostraResultado && taxa! >= 70 ? 'acenando' : 'lendo'

  const numeros: Array<{ valor: string; rotulo: string; destaque?: boolean }> = []
  if (mostraResultado) numeros.push({ valor: `${taxa}%`, rotulo: 'de acerto', destaque: true })
  numeros.push({ valor: porExtenso(total), rotulo: total === 1 ? 'questão' : 'questões' })
  if (mostraResultado && acertos) numeros.push({ valor: porExtenso(acertos, 'm'), rotulo: acertos === 1 ? 'acerto' : 'acertos' })
  if (segundos > 0) numeros.push({ valor: tempo(segundos), rotulo: 'de estudo' })

  // A folha em miniatura: até 60 casas; acima disso, uma faixa contínua com as mesmas cores.
  const casas = folha.length ? folha : Array.from({ length: total }, () => 'certa' as SituacaoFim)
  const compacta = casas.length > 60

  return createPortal(
    <div className="fs-veu" role="presentation">
      <div className="fs-caixa" role="dialog" aria-modal="true" aria-labelledby="fs-titulo" aria-describedby="fs-texto" ref={caixa}>
        <button type="button" className="fs-fechar" onClick={aoLer} aria-label="Fechar e ler o comentário da última questão"><Icone nome="fechar" tamanho={18} /></button>

        <div className="fs-mesa" aria-hidden="true">
          <CorujaPixel estado={estadoCoruja} className="fs-coruja" />
          <ol className={`fs-folha${compacta ? ' fs-folha--compacta' : ''}${mostraResultado ? '' : ' fs-folha--neutra'}`}>
            {casas.map((s, i) => <li key={i} className={`fs-casa fs-casa--${s}`} style={{ animationDelay: `${Math.min(i, 40) * 18}ms` }} />)}
          </ol>
        </div>

        <p className="fs-rotulo"><Icone nome={simulado ? 'bandeira' : 'certo'} tamanho={14} /> {simulado ? 'Simulado completo' : 'Sessão concluída'}</p>
        <h2 id="fs-titulo">{titulo}</h2>

        <dl className="fs-numeros">
          {numeros.map((n) => (
            <div key={n.rotulo} className={n.destaque ? 'fs-numero fs-numero--destaque' : 'fs-numero'}>
              <dt>{n.rotulo}</dt>
              <dd>{n.valor}</dd>
            </div>
          ))}
        </dl>

        <div className="fs-texto" id="fs-texto">
          {simulado ? (
            <p>Você respondeu todas. Entregue para ver a <b>nota</b> e o <b>gabarito comentado</b>.</p>
          ) : (
            <>
              {melhorTema && <p><b>{melhorTema}</b> foi o seu ponto forte nesta sessão.</p>}
              <p>
                {oportunidade
                  ? <><b>{oportunidade}</b> é a próxima conquista: o resultado mostra o que revisar e o resumo certo para ler.</>
                  : 'O resultado mostra cada questão, o tempo e o que vale revisar.'}
              </p>
            </>
          )}
        </div>

        <div className="fs-acoes">
          <button type="button" className="fs-botao fs-botao--principal fs-acao" onClick={aoConcluir}>
            {simulado ? 'Entregar o simulado' : 'Ver meu resultado'} <Icone nome="direita" tamanho={18} />
          </button>
          <button type="button" className="fs-botao" onClick={aoLer}>
            <Icone nome="livro" tamanho={16} /> {simulado ? 'Revisar antes de entregar' : 'Ler o comentário da última'}
          </button>
        </div>
        <p className="fs-dica">Enter para continuar · Esc para voltar à questão</p>
      </div>
    </div>,
    document.body,
  )
}

/** Botão fixo embaixo da tela, para concluir sem rolar até o fim da página. */
export function BotaoConcluirFlutuante({ aoConcluir, simulado }: { aoConcluir: () => void; simulado: boolean }) {
  return createPortal(
    <button type="button" className="concluir-flutuante" onClick={aoConcluir}>
      <Icone nome={simulado ? 'bandeira' : 'certo'} tamanho={18} /> {simulado ? 'Entregar o simulado' : 'Concluir e ver resultado'}
    </button>,
    document.body,
  )
}
