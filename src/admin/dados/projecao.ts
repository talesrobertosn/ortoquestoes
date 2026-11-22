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
  /*
   * Ciclo do TEOT (Tales, 22/11/2026). Opcionais: sem eles o modelo é o de 11/11, sem estação.
   * A prova é no começo de janeiro; quem é R3 estuda até ela e depois sai. Em março a turma muda de ano:
   * os R2 viram R3 (a turma do próximo TEOT) e entram os R1 novos.
   */
  /** Fração dos mensais do início que são R3 (vão fazer o próximo TEOT). */
  fracaoR3Inicio?: number
  /** Dos mensais R3, quantos saem no mês da prova (e de novo, os que sobraram, no mês seguinte). */
  saidaPosTeot?: number
  /** Em março, a fração dos outros mensais que vira R3 (os R2 de antes). */
  viramR3?: number
  /** Mês da prova (1 = janeiro). */
  mesProva?: number
  /**
   * Gente que deixa o público no mês seguinte ao da prova (a turma de R3 que terminou a residência). Sai do
   * público e, na mesma proporção, das contas já cadastradas e das grátis. Sem isso, a turma nova de março
   * só somaria e o público cresceria para sempre (Tales, 22/11/2026: "quanto mais gente se cadastra, menos
   * gente sobra para se cadastrar").
   */
  turmaSaiDepoisDaProva?: number
  /** Multiplicador dos cadastros por mês do ano (índice 0 = janeiro). */
  sazonalCadastros?: number[]
  /** Multiplicador da vontade de assinar por mês do ano (índice 0 = janeiro): aplica na conversão do mês e na atrasada. */
  sazonalCompra?: number[]
  /** Das compras novas de cada mês do ano, a fração feita por R3 (índice 0 = janeiro). */
  fracaoR3Novos?: number[]
}

export interface MesProjetado {
  mes: string
  cadastros: number
  novosPagantes: number
  novosMensais: number; novosSemestrais: number; novosAnuais: number
  mensaisAtivos: number; longosAtivos: number
  /** Mensais que são R3 no fim do mês (saem depois do TEOT). */
  mensaisR3: number
  /** Mensais que saíram por causa do TEOT neste mês (além da saída normal). */
  saidaTeot: number
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
  let acumulado = p.jaCadastrados, mercado = p.mercado, gratis = p.gratisNoInicio
  const fr3 = p.fracaoR3Inicio ?? 0, mesProva = p.mesProva ?? 1, saida = p.saidaPosTeot ?? 0
  let r3 = p.mensaisNoInicio * fr3, outros = p.mensaisNoInicio - r3
  // Coortes de semestrais e anuais: quando vencem, quantos e por quanto.
  let longos = p.longosNoInicio.map(x => ({ ...x }))
  const lista: MesProjetado[] = []
  for (let i = 0; i < p.meses; i++) {
    const mes = somarMesChave(p.inicio, i)
    const mesAno = Number(mes.slice(5, 7))
    if (p.turmaSaiDepoisDaProva && mesAno === mesProva % 12 + 1 && mercado > 0) {
      const sai = Math.min(1, p.turmaSaiDepoisDaProva / mercado)
      acumulado -= acumulado * sai; gratis -= gratis * sai; mercado -= p.turmaSaiDepoisDaProva
    }
    if (mes.endsWith('-03')) mercado += p.turmaNovaMarco
    const restante = Math.max(0, mercado - acumulado)
    const cadastros = Math.min(restante, restante * fracao * p.marketing * (p.sazonalCadastros?.[mesAno - 1] ?? 1))
    acumulado += cadastros
    const vontade = p.sazonalCompra?.[mesAno - 1] ?? 1
    const atrasados = Math.min(gratis, gratis * p.conversaoAtrasada * vontade)
    const doMes = Math.min(cadastros, cadastros * p.conversao * vontade)
    gratis = gratis - atrasados + (cadastros - doMes)
    const novos = doMes + atrasados
    // Quem é R3 perto da prova só compra o mensal (a prova está a semanas); o resto segue o mix.
    const novosR3 = novos * (p.fracaoR3Novos?.[mesAno - 1] ?? 0)
    const pertoDaProva = mesAno === mesProva || mesAno === (mesProva + 10) % 12 + 1
    const nR3M = pertoDaProva ? novosR3 : novosR3 * p.mixMensal
    const nM = (novos - novosR3) * p.mixMensal + nR3M
    const nS = (novos - novosR3) * p.mixSemestral + (pertoDaProva ? 0 : novosR3 * p.mixSemestral)
    const nA = (novos - novosR3) * p.mixAnual + (pertoDaProva ? 0 : novosR3 * p.mixAnual)
    // Mensais: os de antes renovam pela retenção; os novos pagam no mês da compra. No mês da prova e no
    // seguinte, a maior parte dos R3 não renova mais; no seguinte, quem sobrou deixa de ser R3 (virou R4,
    // fellowship, título). Em março, parte dos outros vira R3 (os R2 de antes).
    let r3Continua = r3 * retem
    let saidaTeot = 0
    if (fr3 > 0 && (mesAno === mesProva || mesAno === mesProva % 12 + 1)) { saidaTeot = r3Continua * saida; r3Continua -= saidaTeot }
    let outrosContinua = outros * retem
    if (fr3 > 0 && mesAno === mesProva % 12 + 1) { outrosContinua += r3Continua; r3Continua = 0 }
    if (fr3 > 0 && mesAno === 3) { const viram = outrosContinua * (p.viramR3 ?? 0); outrosContinua -= viram; r3Continua += viram }
    const continuam = r3Continua + outrosContinua
    const renovacoesMensais = continuam * p.precos.mensal
    r3 = r3Continua + nR3M
    outros = outrosContinua + (nM - nR3M)
    const mensais = r3 + outros
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
      mensaisAtivos: mensais, longosAtivos, mensaisR3: r3, saidaTeot, ativosFim: mensais + longosAtivos,
      receitaEquivalente: mensais * p.precos.mensal + longos.reduce((s, c) => s + c.quantidade * c.valor / c.meses, 0),
      faturamento: novas + renovacoesMensais + renovacoesLongas,
      partes: { novas, renovacoesMensais, renovacoesLongas },
      alcance: mercado ? Math.min(1, acumulado / mercado) : 1,
    })
  }
  return lista
}

/**
 * Os parâmetros do plano de 11/11/2026 (guardado para comparação, sem o ciclo do TEOT) (dados reais de 11/11/2026, conferidos no painel):
 * 170 cadastros reais até outubro e cerca de 125 em novembro (45 em 10,8 dias); 37% de cada turma de
 * cadastro assina; 136 contas grátis antigas; nas compras novas de novembro, 80% mensal, 5% semestral e 15% anual;
 * 37 dos 41 mensais pagam por Pix; 6 de 8 Pix vencidos renovaram (75%) e o plano supõe 80%;
 * 42 pagantes no início de novembro (21 mensais, 4 semestrais e 17 anuais pelo preço antigo).
 */
export const PARAMETROS_PLANO_11_11: ParametrosModelo = {
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

/**
 * O plano oficial desde 22/11/2026 (Tales: "dia 10 de janeiro é a prova do TEOT, então os R3 não vão assinar
 * mais; dia 01 de março entram os novos R1, mas na loucura do começo nem todo mundo assina; calibre as metas").
 * Mesmo modelo, agora com o ano da residência:
 * - Público de cerca de 3.000 residentes (Tales): em fevereiro sai a turma de ~1.000 R3 que terminou (do público,
 *   das contas e das grátis, na mesma proporção) e em março entra uma turma nova de ~1.000 R1. Os cadastros caem
 *   conforme o público se esgota e só se renovam com a turma nova.
 * - Retenção medida em 22/11: 10 dos 15 Pix mensais de outubro que venceram pagaram de novo (67%; o plano usa 68%).
 * - Cerca de metade dos mensais era R3 em novembro (24 de 47). 80% deles saem no mês da prova e 80% dos que
 *   sobram no mês seguinte; quem fica (R4, fellowship, título) passa a contar como os outros.
 * - Em março, 35% dos outros mensais viram R3 (os R2 de hoje, a turma do TEOT 2028).
 * - Vontade de assinar por mês do ano: baixa em janeiro e fevereiro (pós-prova, férias, troca de ano),
 *   subindo devagar a partir de março (os R1 só se acomodam em abril) até o pico de out–dez, antes da prova.
 * - Perto da prova (dezembro e janeiro), o R3 só compra o mensal.
 * - Conversão de 32% e 2% ao mês das contas grátis antigas; mix 75% mensal, 5% semestral e 20% anual;
 *   cartão 90% continuando; 50% dos semestrais e anuais renovando.
 * Começa no estado do início de novembro (o mesmo do plano de 11/11) e vai até janeiro de 2028, para mostrar
 * a segunda queda depois do TEOT 2028. O mês de novembro de 2026 das metas continua o do plano de 11/11:
 * o mês em andamento não troca de alvo.
 */
export const PARAMETROS_PLANO: ParametrosModelo = {
  ...PARAMETROS_PLANO_11_11,
  meses: 15, mercado: 3000, cadastrosPrimeiroMes: 108, turmaNovaMarco: 1000,
  conversao: 0.32, conversaoAtrasada: 0.02,
  mixMensal: 0.75, mixSemestral: 0.05, mixAnual: 0.2,
  pixRenova: 0.68, cartaoContinua: 0.9, longoRenova: 0.5,
  fracaoR3Inicio: 0.5, saidaPosTeot: 0.8, viramR3: 0.35, mesProva: 1, turmaSaiDepoisDaProva: 1000,
  //                 jan   fev   mar   abr   mai   jun   jul   ago   set   out   nov   dez
  sazonalCadastros: [0.75, 0.8, 1.05, 1, 1, 0.95, 0.95, 1, 1, 1, 1, 0.85],
  sazonalCompra: [0.5, 0.55, 0.7, 0.8, 0.8, 0.8, 0.85, 0.9, 0.95, 1, 1.1, 1.05],
  fracaoR3Novos: [0.3, 0.1, 0.15, 0.2, 0.2, 0.25, 0.3, 0.3, 0.35, 0.4, 0.5, 0.6],
}

/**
 * A faixa em volta do plano (22/11/2026): piso (o mínimo aceitável) e ousada (com marketing forte), sobre os
 * mesmos parâmetros. A meta é o plano; o piso diz quando acender o alerta, a ousada até onde dá para ir.
 */
export const CENARIOS_PLANO: Array<{ id: 'piso' | 'meta' | 'ousada'; nome: string; explica: string; ajuste: Partial<ParametrosModelo> }> = [
  { id: 'piso', nome: 'Piso', explica: 'Marketing 20% mais fraco, 28% dos cadastros assinando e 60% dos Pix renovando.', ajuste: { marketing: 0.8, conversao: 0.28, pixRenova: 0.6 } },
  { id: 'meta', nome: 'Meta', explica: 'O plano oficial.', ajuste: {} },
  { id: 'ousada', nome: 'Ousada', explica: 'Marketing 25% mais forte, 36% assinando e 75% dos Pix renovando.', ajuste: { marketing: 1.25, conversao: 0.36, pixRenova: 0.75 } },
]
