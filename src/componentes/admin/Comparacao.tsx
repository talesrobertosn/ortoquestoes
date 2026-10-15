import { compararMeses } from './rotulos'

/**
 * Seta e texto da comparação com o período anterior ("▲ +12% sobre setembro (R$ 300,00)").
 * `bom` diz se subir é bom (receita, pessoas estudando) ou ruim (cancelamentos); a cor segue isso.
 */
export function Comparacao({ atual, anterior, base, bom = 'sobe', formato = (v: number) => v.toLocaleString('pt-BR') }: {
  atual: number; anterior: number; base: string; bom?: 'sobe' | 'desce'; formato?: (v: number) => string
}) {
  const c = compararMeses(atual, anterior)
  const tom = c.sentido === 'igual' ? 'igual' : c.sentido === bom ? 'bom' : 'ruim'
  const seta = c.sentido === 'sobe' ? '▲' : c.sentido === 'desce' ? '▼' : '='
  const quanto = c.sentido === 'igual' ? 'igual a' : c.pct !== null ? `${c.pct > 0 ? '+' : ''}${c.pct}% sobre` : `${c.delta > 0 ? '+' : ''}${formato(c.delta)} sobre`
  return <small className={`adm-comparacao adm-comparacao--${tom}`}><b aria-hidden="true">{seta}</b> {quanto} {base} ({formato(anterior)})</small>
}
