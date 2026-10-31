import { Sprite } from '../../biblioteca/salao/Sprite'
import type { Grade, Paleta } from '../../biblioteca/salao/sprites'

/** Ampulheta em pixel: madeira em cima e embaixo, areia dourada caindo pelo meio. */
export const AMPULHETA: Grade = [
  'kMMMMMMMMMk',
  'kmmmmmmmmmk',
  '.kvaaaaavk.',
  '.kvaaaaavk.',
  '..kvaaavk..',
  '...kvavk...',
  '....kak....',
  '....kak....',
  '...kvavk...',
  '..kvvavvk..',
  '.kvvvAvvvk.',
  '.kvAAAAAvk.',
  'kmmmmmmmmmk',
  'kMMMMMMMMMk',
]
export const PALETA_AMPULHETA: Paleta = { k: '#1b1208', M: '#5a3a1a', m: '#8a5a2b', v: '#d9eef0', a: '#f0c46a', A: '#c8962f' }

/**
 * Bilhete de preço de abertura acima dos planos (Tales, 31/10/2026). O semestral e o anual vão subir
 * só para quem ainda não assina: quem assinar agora mantém o valor nas renovações. Liga e desliga por
 * PRECO_DE_ABERTURA em src/dados/planos.ts.
 */
export function AvisoAbertura() {
  return (
    <aside className="vd-abertura" aria-labelledby="vd-abertura-titulo">
      <span className="vd-abertura__ampulheta"><Sprite grade={AMPULHETA} paleta={PALETA_AMPULHETA} px={3} /></span>
      <div className="vd-abertura__texto">
        <p className="vd-abertura__selo">Preço de abertura</p>
        <h2 id="vd-abertura-titulo">O semestral e o anual estão com preço de inauguração</h2>
        <p>O Orto Questões acabou de abrir e, em breve, esses dois planos vão subir. Quem assinar agora mantém este valor nas renovações, como um carinho por ter chegado primeiro. Aproveite enquanto ainda está assim.</p>
      </div>
    </aside>
  )
}
