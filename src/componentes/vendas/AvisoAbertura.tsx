import { Sprite } from '../../biblioteca/salao/Sprite'
import type { Grade, Paleta } from '../../biblioteca/salao/sprites'
import { CADEADO, PALETA_CADEADO } from './AvisoPrecoGuardado'

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
 * Preço de inauguração dentro da caixa dos planos (Tales, 31/10/2026; refeito em 03/11/2026; em 09/11/2026 vira
 * uma faixa fina logo abaixo dos cartões, na mesma linguagem da caixa verde, porque o bilhete grande solto
 * embaixo dela deixava a página desconexa). O cadeado diz "preço travado". Quem assina agora guarda o preço do
 * plano enquanto renovar. Liga e desliga por PRECO_DE_ABERTURA em src/dados/planos.ts.
 */
export function AvisoAbertura() {
  return (
    <p className="vd-abertura vd-abertura--faixa">
      <span className="vd-abertura__cadeado" aria-hidden="true"><Sprite grade={CADEADO} paleta={PALETA_CADEADO} px={2} /></span>
      <span><strong>Preço de inauguração:</strong> assine hoje e este preço é seu para sempre, enquanto você renovar.</span>
    </p>
  )
}
