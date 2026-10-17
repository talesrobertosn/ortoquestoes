import { useEffect, useState, type CSSProperties } from 'react'
import { recurso } from '../config'

/**
 * O cavaleirinho chibi (o mesmo herói dos Flashcards) parado na vitrine da tela de entrar
 * (pedido do Tales, 17/10/2026: "ao logar poderia ter uma imagem animada do nosso mascote").
 * Usa a folha assada dos flashcards (public/flashcards/sprites/heroi-N.png, 6 colunas × 6 linhas
 * de 136 × 108): respira em loop, comemora de vez em quando e dá um golpe quando tocado.
 * Cada visita sorteia um dos estágios do herói. Com "reduzir movimento", fica parado.
 */
const QUADRO = { w: 136, h: 108 }
const ANIMACOES = { parado: { linha: 0, quadros: 4, ms: 260 }, golpe: { linha: 2, quadros: 6, ms: 70 }, vitoria: { linha: 5, quadros: 4, ms: 160 } }
type Anim = keyof typeof ANIMACOES

export function MascoteAcesso({ escala = 2 }: { escala?: number }) {
  const [estagio] = useState(() => 1 + Math.floor(Math.random() * 6))
  const [anim, definirAnim] = useState<Anim>('parado')
  useEffect(() => {
    if (anim !== 'parado') {
      const a = ANIMACOES[anim]
      const t = setTimeout(() => definirAnim('parado'), a.quadros * a.ms * (anim === 'vitoria' ? 3 : 1))
      return () => clearTimeout(t)
    }
    // comemora sozinho a cada 7 a 12 segundos
    const t = setTimeout(() => definirAnim('vitoria'), 7000 + Math.random() * 5000)
    return () => clearTimeout(t)
  }, [anim])
  const a = ANIMACOES[anim]
  const w = QUADRO.w * escala, h = QUADRO.h * escala
  const estilo = {
    width: w, height: h,
    backgroundImage: `url(${recurso(`flashcards/sprites/heroi-${estagio}.png`)})`,
    backgroundSize: `${6 * w}px ${6 * h}px`,
    backgroundPositionY: -a.linha * h,
    ['--mascote-fim' as string]: `${-a.quadros * w}px`,
    animation: `mascote-quadros ${a.quadros * a.ms}ms steps(${a.quadros}) infinite`,
  } as CSSProperties
  return (
    <button type="button" className="mascote-acesso" onClick={() => definirAnim('golpe')} aria-label="Cavaleiro do Orto Questões" title="Oi! Bom estudo.">
      <span className="mascote-acesso__sombra" aria-hidden="true" />
      <span key={anim} className="mascote-acesso__folha" style={estilo} aria-hidden="true" />
    </button>
  )
}
