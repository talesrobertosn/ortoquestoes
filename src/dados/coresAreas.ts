/**
 * A cor de cada área do acervo (reforma do cronograma, 14/10/2026): a mesma em
 * todo o site (cronograma, semana, sessão, desempenho), para a pessoa
 * reconhecer a área sem ler. Tons médios, legíveis no tema claro e no escuro.
 */
export const COR_AREA: Record<string, string> = {
  trauma: '#c8513c',
  pediatria: '#2e64a8',
  // Não usar dourado: ele é a cor dos marcos (reta final, prova, mini-simulado).
  mao: '#12a1a8',
  'ombro-cotovelo': '#3a8fb7',
  quadril: '#b5527a',
  joelho: '#1f8a70',
  coluna: '#6b4fa0',
  'pe-tornozelo': '#7a8b2e',
  tumores: '#8b5a2b',
  'conceitos-basicos': '#5f6b73',
  osteometabolicas: '#a0522d',
}

export const corDaArea = (slug: string | null | undefined): string => (slug && COR_AREA[slug]) || '#5f6b73'
