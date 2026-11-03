import { Sprite } from '../../biblioteca/salao/Sprite'
import type { Grade, Paleta } from '../../biblioteca/salao/sprites'
import { Icone } from '../Icone'
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
 * Bilhete de preço de inauguração embaixo dos planos, acima do suporte (Tales, 31/10/2026; refeito em
 * 03/11/2026 porque o texto anterior ficou confuso e sem impacto). A promessa vai no título; as regras,
 * em três linhas curtas. O cadeado diz "preço travado" (a ampulheta sugeria pressa). Quem assina agora
 * guarda o preço do plano enquanto renovar. Liga e desliga por PRECO_DE_ABERTURA em src/dados/planos.ts.
 */
const PONTOS = [
  'Estes são os preços de inauguração',
  'Quando os planos subirem, o seu continua igual',
  'Vale enquanto você renovar, no Pix ou no cartão',
] as const

export function AvisoAbertura() {
  return (
    <aside className="vd-abertura vd-abertura--inauguracao" aria-labelledby="vd-abertura-titulo">
      <span className="vd-abertura__cadeado"><Sprite grade={CADEADO} paleta={PALETA_CADEADO} px={4} /></span>
      <div className="vd-abertura__texto">
        <p className="vd-abertura__selo">Vantagem de quem chega primeiro</p>
        <h2 id="vd-abertura-titulo">Assine hoje e este preço é seu para sempre</h2>
        <ul className="vd-abertura__pontos">
          {PONTOS.map((ponto) => <li key={ponto}><Icone nome="certo" tamanho={15} espesso={2.6} /> {ponto}</li>)}
        </ul>
      </div>
    </aside>
  )
}
