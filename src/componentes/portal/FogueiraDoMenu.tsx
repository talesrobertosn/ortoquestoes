import { useMemo, type CSSProperties } from 'react'
import { urlCss } from '../../config'
import { META_STREAK_DIARIA, calcularStreak } from '../../estado/streak'
import { usarContextoLocal } from '../../estado/usarContextoLocal'
import { primeiroNome } from '../../util/primeiroNome'
import { estagioDaSequencia, textoProximoEstagio } from '../inicio/estagiosFogueira'

/**
 * O topo do menu (01/11/2026, pedido do Tales: a caixa laranja escrita "Menu" "não faz sentido nenhum"): no lugar de um
 * selo decorativo, a fogueira de quem está estudando. A chama é a mesma da página inicial (a cor e o tamanho seguem
 * os dias seguidos), com o cumprimento pela hora e o que importa hoje: os dias seguidos e quantas das 5 questões do
 * dia já foram. Para quem ainda não tem conta, a fogueira apagada convida a acender.
 */
const cumprimento = (h: number) => (h >= 5 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite')

export function FogueiraDoMenu({ nome, logado }: { nome?: string | null; logado: boolean }) {
  const { contexto } = usarContextoLocal('')
  const streak = useMemo(() => calcularStreak(contexto.respondidas), [contexto.respondidas])
  const { indice, estagio } = estagioDaSequencia(streak.atual)
  const quem = primeiroNome(nome)
  const titulo = `${cumprimento(new Date().getHours())}${quem ? `, ${quem}` : ''}`
  const hoje = Math.min(streak.hojeContagem, META_STREAK_DIARIA)
  const proximo = textoProximoEstagio(streak.atual)
  const linha = !logado && streak.atual === 0
    ? 'Responda 5 questões por dia para acender a sua fogueira.'
    : streak.atual === 0
      ? `Acenda a fogueira: ${hoje} de ${META_STREAK_DIARIA} questões hoje.`
      : `${streak.atual === 1 ? '1 dia seguido' : `${streak.atual} dias seguidos`} · ${estagio.nome}${streak.metaHojeAtingida ? ' · meta de hoje feita' : ` · hoje ${hoje} de ${META_STREAK_DIARIA}`}`
  return (
    <div className="pt-fogueira">
      <span className={`pt-fogueira__chama${indice === 0 ? ' pt-fogueira__chama--apagada' : ''}`} aria-hidden="true"
        style={{ '--sprite-fogo': urlCss('pixel/inicio/fogo.png'), '--linha': indice } as CSSProperties} />
      <span className="pt-fogueira__texto">
        <strong>{titulo}</strong>
        <small title={proximo ?? undefined}>{linha}</small>
      </span>
      <h2 id="pt-titulo" className="so-leitor">Menu</h2>
    </div>
  )
}
