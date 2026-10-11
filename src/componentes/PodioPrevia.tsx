import { useEffect, useState } from 'react'
import { supabase } from '../conta/supabase'

interface Linha { posicao: number; apelido: string; total: number }

/**
 * Os três primeiros do ranking, ao vivo, no cartão da página inicial de quem
 * ainda não tem conta. Usa a função aberta (só iniciais); sem ela, não mostra nada.
 */
export function PodioPrevia() {
  const [linhas, definirLinhas] = useState<Linha[] | null>(null)
  useEffect(() => {
    if (!supabase) return
    let vivo = true
    supabase.rpc('obter_ranking_visitante', { periodo: 'semana' }).then((r) => {
      if (vivo && !r.error) definirLinhas(((r.data ?? []) as Linha[]).slice(0, 3))
    })
    return () => { vivo = false }
  }, [])
  if (!linhas || linhas.length < 3) return null
  return <ol className="podio-previa" aria-label="Os três primeiros da semana">
    {linhas.map((l) => <li key={l.posicao} className={`podio-previa__lugar podio-previa__lugar--${l.posicao}`}>
      <span className="podio-previa__posicao">{l.posicao}º</span>
      <span className="podio-previa__nome">{l.apelido}</span>
      <span className="podio-previa__total numerico">{Number(l.total).toLocaleString('pt-BR')}</span>
    </li>)}
    <li className="podio-previa__legenda">mais questões nos últimos 7 dias</li>
  </ol>
}
