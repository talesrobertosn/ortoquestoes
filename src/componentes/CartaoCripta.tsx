import { useEffect, useRef } from 'react'
import { href } from '../util/rotas'
import { pintarPersonagem, type Personagem } from '../flashcards/efeitos/personagens'
import '../estilos/componentes/CartaoCripta.css'

/** Sprite parado da Cripta (o mesmo pixel art do jogo), sem carregar o jogo inteiro. */
function Retrato({ quem, variante, escala }: { quem: Personagem; variante?: string; escala: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => { if (ref.current) pintarPersonagem(ref.current, quem, 'parado', variante) }, [quem, variante])
  return <canvas ref={ref} className={`cripta-cartao__sprite cripta-cartao__sprite--${quem}`} style={{ ['--escala' as string]: escala }} aria-hidden="true" />
}

/**
 * Cartão da Cripta do Residente para a página inicial (ao lado do banner do
 * ranking) e para a página de planos. Pronto, mas só aparece com as travas
 * VITE_FLASHCARDS_CAPA e VITE_FLASHCARDS_VENDA (config.ts).
 */
export function CartaoCripta({ variante = 'capa' }: { variante?: 'capa' | 'venda' }) {
  return (
    <section className={`cripta-cartao cripta-cartao--${variante}`} aria-labelledby={`cripta-titulo-${variante}`}>
      <div className="cripta-cartao__arte" aria-hidden="true">
        <Retrato quem="dragao" escala={1.1} />
        <Retrato quem="heroi" variante="heroi-3" escala={2.4} />
      </div>
      <div className="cripta-cartao__texto">
        <p className="cripta-cartao__selo">Novo · masmorra dos flashcards</p>
        <h2 id={`cripta-titulo-${variante}`}>Cripta do <em>Residente</em></h2>
        <p>{variante === 'venda'
          ? 'Os flashcards das provas reais viram um RPG: cada acerto é um golpe, cada erro volta para a sua revisão. Cripta sem fim, Torre do Título com 100 andares, chefes, dragões e ranking.'
          : 'Desça a Cripta ou suba a Torre do Título: flashcards das provas reais viram combate, e cada erro volta para a sua revisão.'}</p>
        {variante === 'venda' && (
          <ul className="cripta-cartao__lista">
            <li>Milhares de flashcards tirados das questões comentadas do acervo</li>
            <li>Grátis: 10 flashcards por dia · Assinante: sem limite</li>
            <li>Ranking do andar mais fundo, da Torre e de flashcards únicos</li>
          </ul>
        )}
      </div>
      <a className="botao botao--ouro cripta-cartao__entrar" href={href('/flashcards')}>Entrar na Cripta</a>
    </section>
  )
}
