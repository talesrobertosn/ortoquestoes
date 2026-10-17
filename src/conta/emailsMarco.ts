import { conquistaAtual } from '../estado/conquistas'
import { gravar, ler } from '../estado/armazenamento'
import { chamarFuncao, chamarRpc } from '../servicos/supabase'

/**
 * E-mail de parabéns ao atingir um emblema de volume. O site só avisa o
 * servidor; é ele que confere o total sincronizado, respeita quem não quer
 * e-mails e manda uma vez por emblema (ver supabase/functions/enviar-email).
 */
const CHAVE = 'emails:marco-avisado'
let ultimaTentativa = 0

export async function verificarMarcoEmail(totalRespondidas: number) {
  const marco = conquistaAtual(totalRespondidas)
  if (!marco || ler<number>(CHAVE, 0) >= marco.minimo) return
  // Uma tentativa a cada 5 minutos no máximo: a sincronização avisa várias vezes seguidas.
  if (Date.now() - ultimaTentativa < 5 * 60_000) return
  ultimaTentativa = Date.now()
  try {
    const { resultado } = await chamarFuncao<{ resultado: string }>('enviar-email', { acao: 'marco' })
    // "ainda_nao": o servidor ainda não recebeu as respostas; "falhou": o envio não saiu
    // (Resend fora ou mal configurado); "adiado": a pessoa recebeu outro e-mail há pouco
    // (teto de cadência). Nos três casos tenta de novo mais tarde.
    if (resultado !== 'ainda_nao' && resultado !== 'falhou' && resultado !== 'adiado') gravar(CHAVE, marco.minimo)
  } catch { /* função não publicada ou sem rede: tenta mais tarde */ }
}

/** Avisa o administrador quando alguém diz que o comentário não ajudou e explica por quê. */
export function alertarAvaliacao(idQuestao: string) {
  void chamarFuncao('enviar-email', { acao: 'alerta_avaliacao', id_questao: idQuestao }).catch(() => undefined)
}

/** Preferência "e-mails de conquistas", guardada no servidor (vale para o link de descadastro também). */
export async function lerPreferenciaConquistas(): Promise<boolean | null> {
  try { return await chamarRpc<boolean>('obter_preferencias_email', {}) } catch { return null }
}
export async function gravarPreferenciaConquistas(valor: boolean): Promise<boolean> {
  try { await chamarRpc('definir_preferencias_email', { p_conquistas: valor }); return true } catch { return false }
}
