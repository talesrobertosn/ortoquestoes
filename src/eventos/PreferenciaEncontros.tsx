import { InterruptorLocal } from '../componentes/conta/PecasConta'
import { usarEventosLigados, usarMetasLigadas } from './preferencias'

/** Mantém as escolhas do aparelho; o antigo sistema de visitas foi retirado. */
export function PreferenciaEncontros() {
  const [ligados, definir] = usarEventosLigados()
  const [metas, definirMetas] = usarMetasLigadas()
  return <>
    <InterruptorLocal ligado={ligados} aoMudar={definir} detalhe="Medalhas reais do inventário, com arte e comemoração breve, além dos avisos do dia durante o treino. Sem som. Simulados esperam a entrega.">Mostrar avisos de conquistas</InterruptorLocal>
    {ligados && <InterruptorLocal ligado={metas} aoMudar={definirMetas} detalhe="Lembretes ocasionais do próximo marco, incluindo metas maiores. No treino, só depois de responder; no máximo dois por sessão.">Mostrar metas próximas enquanto estudo</InterruptorLocal>}
  </>
}
