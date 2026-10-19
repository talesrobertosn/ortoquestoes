/**
 * Quem vê o quê no cronograma (pedido do Tales, 19/10/2026): "O usuário gratuito, quando entra no
 * cronograma, não consegue ver, fica tudo bloqueado. Vamos fazer um cronograma fictício [...] mostra
 * só a semana; se quiser o mês inteiro, aí tem que pagar."
 *
 * - `real`: o cronograma da pessoa (assinante, cortesia, administrador) ou o modo demo de desenvolvimento.
 * - `ficticio`: o painel inteiro do assinante, alimentado por um plano e um progresso de exemplo, sem
 *   gravar nada no plano real (visitante e conta sem assinatura).
 * - `carregando`: conta logada cujo acesso ainda não chegou do servidor; esperar evita piscar o exemplo
 *   para um assinante.
 */
export type VistaCronograma = 'carregando' | 'real' | 'ficticio'

export function vistaDoCronograma(acesso: { premium: boolean; logado: boolean; carregado: boolean; demo?: boolean }): VistaCronograma {
  if (acesso.demo) return 'real'
  if (acesso.logado && !acesso.carregado) return 'carregando'
  return acesso.premium ? 'real' : 'ficticio'
}

/** Semanas do calendário abertas no cenário fictício: só a de hoje; o resto é do assinante. */
export function semanaAbertaNoFicticio(segundaVista: Date, segundaDeHoje: Date): boolean {
  return segundaVista.getTime() === segundaDeHoje.getTime()
}
