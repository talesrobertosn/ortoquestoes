/**
 * Quem desligou os e-mails não recebe e-mail (18/10/2026, pedido do Tales).
 *
 * A regra fica num lugar só e é conferida na hora de cada envio, pessoa por
 * pessoa: nos lotes (lembretes, Pix, relatórios), nos automáticos (inclusive os
 * transacionais, como o recibo e o obrigado pelo tempo), na carta da ficha, no
 * parabéns, no marco e no aviso de relato resolvido. A lista do banco pode ter
 * sido montada antes de a pessoa desligar; a preferência lida aqui é a de agora.
 *
 * Interruptores de Minha conta › E-mails e mensagens (tabela preferencias_email):
 *   conquistas        parabéns pelos emblemas e marcos
 *   relatorio_mensal  resumo quinzenal e relatório do mês
 *   lembretes         lembretes de estudo e de renovação do Pix
 *   cartas            mensagens pessoais do Tales (cartas, automáticos, recibos, relato resolvido)
 * Com os quatro desligados, nada sai. Sem linha na tabela, tudo ligado (o padrão
 * da tabela). Se a leitura falhar, nada sai: na dúvida, não se manda e-mail.
 * Ficam de fora só a confirmação de cadastro e a senha nova, que o Supabase
 * manda porque a própria pessoa pediu na hora.
 */
export interface PreferenciasEmail {
  conquistas: boolean
  relatorio_mensal: boolean
  lembretes: boolean
  cartas: boolean
}

export type CategoriaEmail = 'conquistas' | 'relatorio' | 'lembretes' | 'cartas'

export const PREFERENCIAS_PADRAO: PreferenciasEmail = { conquistas: true, relatorio_mensal: true, lembretes: true, cartas: true }

const COLUNA: Record<CategoriaEmail, keyof PreferenciasEmail> = {
  conquistas: 'conquistas', relatorio: 'relatorio_mensal', lembretes: 'lembretes', cartas: 'cartas',
}

/** A linha do banco (ou a falta dela) vira preferências completas; só `false` explícito desliga. */
export function preferenciasDaLinha(linha: Partial<Record<keyof PreferenciasEmail, unknown>> | null | undefined): PreferenciasEmail {
  if (!linha) return { ...PREFERENCIAS_PADRAO }
  return {
    conquistas: linha.conquistas !== false,
    relatorio_mensal: linha.relatorio_mensal !== false,
    lembretes: linha.lembretes !== false,
    cartas: linha.cartas !== false,
  }
}

export const desligouTudo = (p: PreferenciasEmail) => !p.conquistas && !p.relatorio_mensal && !p.lembretes && !p.cartas

/** Pode mandar um e-mail desta categoria para quem tem estas preferências? `null` (leitura falhou) é não. */
export function permiteEnvio(p: PreferenciasEmail | null, categoria: CategoriaEmail): boolean {
  if (!p) return false
  if (desligouTudo(p)) return false
  return p[COLUNA[categoria]]
}
