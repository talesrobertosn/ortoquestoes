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
 * Bilhete de preço de inauguração embaixo dos planos (Tales, 31/10/2026; texto novo em 03/11/2026).
 * Os valores ainda são de inauguração e vão subir mais para frente; quem assina agora guarda o preço
 * do plano enquanto renovar. Liga e desliga por PRECO_DE_ABERTURA em src/dados/planos.ts.
 */
export function AvisoAbertura() {
  return (
    <aside className="vd-abertura" aria-labelledby="vd-abertura-titulo">
      <span className="vd-abertura__ampulheta"><Sprite grade={AMPULHETA} paleta={PALETA_AMPULHETA} px={3} /></span>
      <div className="vd-abertura__texto">
        <p className="vd-abertura__selo">Preço de inauguração</p>
        <h2 id="vd-abertura-titulo">Quem chega na inauguração guarda o preço</h2>
        <p>O Orto Questões acabou de abrir, e estes ainda são os valores de inauguração. Assinando agora, o seu preço fica guardado: enquanto você renovar, ele não muda, mesmo quando os planos subirem. Um carinho para quem chegou primeiro.</p>
      </div>
    </aside>
  )
}
