import { somarMesChave } from '../../componentes/admin/receita'

/**
 * Modelo de crescimento do Orto Questões (Tales, 11/11/2026): o público é finito. Cada mês, uma fração das
 * pessoas que ainda não conhecem o site se cadastra; quanto mais gente já entrou, menos sobra para entrar,
 * e o número de cadastros novos cai devagar. Em março, uma turma nova de R1 renova parte do público.
 * Dos cadastros, uma parte assina (no mesmo mês, em média); quem ainda é grátis também pode assinar depois.
 * Mensais renovam todo mês (cartão sozinho; Pix se a pessoa pagar de novo); semestrais e anuais pagam de
 * uma vez e voltam a pagar quando vencem.
 *
 * Tudo é mês a mês, sem sorteio: os mesmos parâmetros dão sempre o mesmo resultado. O plano oficial das
 * metas (`PLANO_2026_11`, em metas.ts) é esta conta feita uma vez com os dados de 11/11/2026 e congelada.
 */
export interface ParametrosModelo {
  /** Primeiro mês da projeção ("2026-11"). */
  inicio: string
  meses: number
  /** Pessoas que o site consegue alcançar (residentes de ortopedia e afins). */
  mercado: number
  /** Cadastros feitos antes do primeiro mês. */
  jaCadastrados: number
  /** Cadastros esperados no primeiro mês (o ritmo de hoje). */
  cadastrosPrimeiroMes: number
  /** Público novo que chega em março (turma nova de R1). */
  turmaNovaMarco: number
  /** Fração dos cadastros do mês que assina. */
  conversao: number
  /** Fração das contas grátis antigas que assina em cada mês. */
  conversaoAtrasada: number
  /** Contas grátis antigas no início (quem se cadastrou e ainda não assinou). */
  gratisNoInicio: number
  /** Multiplicador do marketing (1 = ritmo de hoje; 1,3 = 30% mais cadastros). */
  marketing: number
  /** Planos escolhidos nas compras novas (somam 1). */
  mixMensal: number; mixSemestral: number; mixAnual: number
  /** Dos mensais, a fração que paga por Pix (o resto, cartão). */
  mensaisNoPix: number
  /** Chance de um Pix mensal pagar de novo quando o acesso acaba. */
  pixRenova: number
  /** Chance de um cartão mensal continuar (não cancelar) a cada mês. */
  cartaoContinua: number
  /** Chance de um semestral ou anual pagar de novo quando vence. */
  longoRenova: number
  precos: { mensal: number; semestral: number; anual: number }
  /** Quem já assina no início: mensais e os vencimentos de semestrais e anuais ("2027-03" → quantidade e valor). */
  mensaisNoInicio: number
  longosNoInicio: Array<{ vence: string; meses: number; quantidade: number; valor: number }>
}

export interface MesProjetado {
  mes: string
  cadastros: number
  novosPagantes: number
  novosMensais: number; novosSemestrais: number; novosAnuais: number
  mensaisAtivos: number; longosAtivos: number
  /** Pagantes com acesso no fim do mês. */
  ativosFim: number
  receitaEquivalente: number
  /** Dinheiro que entra no mês. */
  faturamento: number
  partes: { novas: number; renovacoesMensais: number; renovacoesLongas: number }
  /** Quanto do público alcançável já se cadastrou no fim do mês (0 a 1). */
  alcance: number
}

/** Retenção mensal dos mensais: Pix pela chance de pagar de novo, cartão pela chance de não cancelar. */
export const retencaoMensal = (p: Pick<ParametrosModelo, 'mensaisNoPix' | 'pixRenova' | 'cartaoContinua'>) => p.mensaisNoPix * p.pixRenova + (1 - p.mensaisNoPix) * p.cartaoContinua

export function projetarCrescimento(p: ParametrosModelo): MesProjetado[] {
  const retem = retencaoMensal(p)
  const disponivel0 = Math.max(1, p.mercado - p.jaCadastrados)
  // A fração do público ainda não cadastrado que entra por mês, tirada do ritmo de hoje.
  const fracao = Math.min(0.9, p.cadastrosPrimeiroMes / disponivel0)
  let acumulado = p.jaCadastrados, mercado = p.mercado, gratis = p.gratisNoInicio, mensais = p.mensaisNoInicio
  // Coortes de semestrais e anuais: quando vencem, quantos e por quanto.
  let longos = p.longosNoInicio.map(x => ({ ...x }))
  const lista: MesProjetado[] = []
  for (let i = 0; i < p.meses; i++) {
    const mes = somarMesChave(p.inicio, i)
    if (mes.endsWith('-03')) mercado += p.turmaNovaMarco
    const restante = Math.max(0, mercado - acumulado)
    const cadastros = Math.min(restante, restante * fracao * p.marketing)
    acumulado += cadastros
    const atrasados = gratis * p.conversaoAtrasada
    const doMes = cadastros * p.conversao
    gratis = gratis - atrasados + (cadastros - doMes)
    const novos = doMes + atrasados
    const nM = novos * p.mixMensal, nS = novos * p.mixSemestral, nA = novos * p.mixAnual
    // Mensais: os de antes renovam pela retenção; os novos pagam no mês da compra.
    const continuam = mensais * retem
    const renovacoesMensais = continuam * p.precos.mensal
    mensais = continuam + nM
    // Longos: quem vence neste mês paga de novo pela chance de renovar e ganha um novo vencimento.
    let renovacoesLongas = 0
    const seguem: typeof longos = []
    for (const c of longos) {
      if (c.vence === mes) {
        const q = c.quantidade * p.longoRenova
        renovacoesLongas += q * c.valor
        if (q > 0) seguem.push({ ...c, vence: somarMesChave(mes, c.meses), quantidade: q })
      } else if (c.vence > mes) seguem.push(c)
    }
    if (nS > 0) seguem.push({ vence: somarMesChave(mes, 6), meses: 6, quantidade: nS, valor: p.precos.semestral })
    if (nA > 0) seguem.push({ vence: somarMesChave(mes, 12), meses: 12, quantidade: nA, valor: p.precos.anual })
    longos = seguem
    const longosAtivos = longos.reduce((s, c) => s + c.quantidade, 0)
    const novas = nM * p.precos.mensal + nS * p.precos.semestral + nA * p.precos.anual
    lista.push({
      mes, cadastros, novosPagantes: novos, novosMensais: nM, novosSemestrais: nS, novosAnuais: nA,
      mensaisAtivos: mensais, longosAtivos, ativosFim: mensais + longosAtivos,
      receitaEquivalente: mensais * p.precos.mensal + longos.reduce((s, c) => s + c.quantidade * c.valor / c.meses, 0),
      faturamento: novas + renovacoesMensais + renovacoesLongas,
      partes: { novas, renovacoesMensais, renovacoesLongas },
      alcance: mercado ? Math.min(1, acumulado / mercado) : 1,
    })
  }
  return lista
}

/**
 * Os parâmetros com que o plano oficial foi feito (dados reais de 11/11/2026, conferidos no painel):
 * 170 cadastros reais até outubro e cerca de 125 em novembro (45 em 10,8 dias); 37% de cada turma de
 * cadastro assina; 136 contas grátis antigas; nas compras novas de novembro, 80% mensal, 5% semestral e 15% anual;
 * 37 dos 41 mensais pagam por Pix; 6 de 8 Pix vencidos renovaram (75%) e o plano supõe 80%;
 * 42 pagantes no início de novembro (21 mensais, 4 semestrais e 17 anuais pelo preço antigo).
 */
export const PARAMETROS_PLANO: ParametrosModelo = {
  inicio: '2026-11', meses: 12,
  mercado: 2000, jaCadastrados: 170, cadastrosPrimeiroMes: 125, turmaNovaMarco: 650,
  conversao: 0.37, conversaoAtrasada: 0.025, gratisNoInicio: 136, marketing: 1,
  mixMensal: 0.8, mixSemestral: 0.05, mixAnual: 0.15,
  mensaisNoPix: 0.9, pixRenova: 0.8, cartaoContinua: 0.95, longoRenova: 0.7,
  precos: { mensal: 39.9, semestral: 209.4, anual: 358.8 },
  mensaisNoInicio: 21,
  longosNoInicio: [
    { vence: '2027-03', meses: 6, quantidade: 1, valor: 179.9 },
    { vence: '2027-04', meses: 6, quantidade: 3, valor: 179.9 },
    { vence: '2027-09', meses: 12, quantidade: 2, valor: 239.9 },
    { vence: '2027-10', meses: 12, quantidade: 15, valor: 239.9 },
  ],
}
