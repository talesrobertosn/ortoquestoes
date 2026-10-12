import { useState } from 'react'
import { recurso } from '../../config'
import { href } from '../../util/rotas'
import type { Flashcard } from '../tipos'
import { Sprite } from './Sprite'
import { Texto } from './Texto'

export const NOME_RARIDADE = { lendaria: 'Lendária', epica: 'Épica', rara: 'Rara', comum: 'Comum' } as const
export const NOME_DIFICULDADE = { 1: 'Fácil', 2: 'Moderada', 3: 'Difícil' } as const

interface Props {
  carta: Flashcard
  virada: boolean
  /** Batalha: a gema mostra o dano que você leva se errar. */
  intencao?: { dano: number; bloqueado: boolean; furia: boolean } | null
  /** Rodapé da frente ("Responda com uma da sua mão", "Toque para virar"). */
  dicaFrente: string
  aoTocar?: () => void
  aoAmpliar: (img: { src: string; legenda: string }) => void
  /** Muda a cada compra, para a animação de entrada recomeçar. */
  chave: string | number
  resultado?: 'certo' | 'errado' | null
  assistida?: boolean
}

export function Cartao({ carta, virada, intencao, dicaFrente, aoTocar, aoAmpliar, chave, resultado, assistida }: Props) {
  const [origemAberta, definirOrigem] = useState(false)
  const img = carta.imagem && { src: recurso('imagens/' + carta.imagem.arquivo), legenda: carta.imagem.legenda }
  const cabeca = (
    <header className="fc-carta__cabeca">
      <Sprite nome="brasao" className="fc-carta__brasao" />
      <div className="fc-carta__titulo">
        <strong>{carta.assunto}</strong>
        <small>{carta.area} · {NOME_DIFICULDADE[carta.dificuldade]}</small>
      </div>
      <span className={`fc-raridade fc-raridade--${carta.raridade}`}>{NOME_RARIDADE[carta.raridade]}</span>
    </header>
  )
  return (
    <div className={`fc-carta fc-carta--${carta.raridade}${virada ? ' fc-carta--virada' : ''}${resultado ? ' fc-carta--' + resultado : ''}`} key={chave}>
      <div className="fc-carta__corpo">
        <section
          className="fc-carta__face fc-carta__frente"
          aria-hidden={virada}
          onClick={aoTocar}
          role={aoTocar ? 'button' : undefined}
          tabIndex={aoTocar && !virada ? 0 : -1}
          aria-label={aoTocar ? 'Virar o flashcard' : undefined}
          onKeyDown={(e) => { if (aoTocar && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); aoTocar() } }}
        >
          {intencao && (
            <span className={'fc-intencao-gema' + (intencao.bloqueado ? ' fc-intencao-gema--bloqueado' : '') + (intencao.furia ? ' fc-intencao-gema--furia' : '')} title={intencao.bloqueado ? 'O escudo bloqueia o próximo golpe' : `Se errar, você leva ${intencao.dano} de dano`}>
              <b>{intencao.bloqueado ? '0' : `-${intencao.dano}`}</b>
            </span>
          )}
          <div className="fc-carta__moldura">
            {cabeca}
            <div className="fc-carta__miolo">
              <p className="fc-carta__tipo">{carta.tipo}</p>
              <p className="fc-carta__pergunta"><Texto texto={carta.frente} /></p>
              {img && (
                <button type="button" className="fc-carta__imagem" onClick={(e) => { e.stopPropagation(); aoAmpliar(img) }} aria-label="Ampliar a imagem" tabIndex={virada ? -1 : 0}>
                  <img src={img.src} alt="Figura da questão de origem" loading="eager" />
                  <span className="fc-carta__lupa" aria-hidden="true">Ampliar</span>
                </button>
              )}
            </div>
            <footer className="fc-carta__pe">
              <span>{img ? carta.imagem!.legenda : dicaFrente}</span>
            </footer>
          </div>
        </section>
        <section className="fc-carta__face fc-carta__verso" aria-hidden={!virada} aria-live="polite">
          <div className="fc-carta__moldura">
            {cabeca}
            <div className="fc-carta__miolo">
              <p className="fc-carta__tipo">
                Resposta{resultado === 'certo' && (assistida ? ' · acerto assistido' : ' · você acertou')}{resultado === 'errado' && ' · você errou'}
              </p>
              <p className="fc-carta__resposta">{carta.resposta}</p>
              <p className="fc-carta__explicacao"><Texto texto={carta.explicacao} lacunasAbertas /></p>
              {carta.frente.includes('{{') && <p className="fc-carta__completa"><Texto texto={carta.frente} lacunasAbertas /></p>}
              {carta.alerta && <p className="fc-carta__alerta"><strong>Divergência:</strong> {carta.alerta}</p>}
              <div className="fc-carta__acoes">
                <button type="button" className="fc-botao-pequeno" onClick={() => definirOrigem((v) => !v)} aria-expanded={origemAberta} tabIndex={virada ? 0 : -1}>De onde veio</button>
                <a className="fc-botao-pequeno" href={href(`/questao/${carta.questao}`)} target="_blank" rel="noopener" tabIndex={virada ? 0 : -1}>Fazer a questão</a>
              </div>
              {origemAberta && (
                <p className="fc-carta__origem">
                  Questão <strong>{carta.questao}</strong> do acervo · {carta.area} · {carta.assunto}. O flashcard resume o comentário dessa questão e segue o gabarito oficial.
                </p>
              )}
            </div>
            <footer className="fc-carta__pe"><span>Orto Questões · {carta.questao}</span></footer>
          </div>
        </section>
      </div>
    </div>
  )
}
