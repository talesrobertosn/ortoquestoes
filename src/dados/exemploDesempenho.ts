/*
 * Residente fictício do Desempenho de exemplo (14/11/2026, pedido do Tales: "um cenário fictício para o não usuário
 * ver como seria o desempenho, mostrando notas boas"; "como uma conta que já fez mais de 3 mil questões"). Seis meses de estudo, de 72% a 84% de acerto de primeira,
 * revisões que consolidam, um Cronograma em dia e a turma ao lado. Sempre o mesmo (gerador com semente fixa), com
 * as datas contadas a partir de hoje, e só com questões reais do acervo, para os temas, o mapa e os resumos baterem.
 */
import type { Indice } from './tipos'
import type { RegistroQuestao } from '../estado/revisao'
import type { ResumoHistorico } from '../estado/sessao'
import type { PlanoSalvo } from './planoEstudo'

export const NOME_EXEMPLO = 'Marina'

/** Acerto de primeira de cada tema no começo; todos sobem ao longo dos meses. */
const BASE: Record<string, number> = {
  trauma: 0.74, pediatria: 0.7, mao: 0.8, 'ombro-cotovelo': 0.76, joelho: 0.82, quadril: 0.75, coluna: 0.68,
  'pe-tornozelo': 0.73, tumores: 0.64, 'conceitos-basicos': 0.81, osteometabolicas: 0.78,
}
const DIA = 86_400_000
const DIAS = 180

export interface ExemploDesempenho {
  respondidas: Record<string, RegistroQuestao>
  historico: ResumoHistorico[]
  turma: Map<string, { acerto: number }>
  plano: PlanoSalvo
}

const cache = new WeakMap<Indice, ExemploDesempenho>()

export function gerarExemplo(indice: Indice, agora = Date.now()): ExemploDesempenho {
  const pronto = cache.get(indice)
  if (pronto) return pronto
  let semente = 20261114
  const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647
  // Um dia de estudo começa às 19h (com variação), como quem estuda depois do serviço.
  const hoje = new Date(agora); hoje.setHours(19, 0, 0, 0)
  const momento = (diasAtras: number) => Math.min(agora - 60_000, hoje.getTime() - diasAtras * DIA + Math.floor(rnd() * 3) * 3_600_000 + Math.floor(rnd() * 50) * 60_000)
  const validas = indice.questoes.filter((q) => !q.dup && q.an !== 1 && indice.temas[q.t])
  // As questões entram tema a tema, misturadas, sem repetir.
  const ordem = validas.map((q) => ({ q, k: rnd() })).sort((a, b) => a.k - b.k).map((x) => x.q)
  const respondidas: Record<string, RegistroQuestao> = {}
  const turma = new Map<string, { acerto: number }>()
  const historico: ResumoHistorico[] = []
  let i = 0
  for (let d = DIAS; d >= 0; d--) {
    // Folga em parte dos domingos e alguns dias de plantão; mais questões no fim de semana.
    const dia = new Date(hoje.getTime() - d * DIA)
    if ((dia.getDay() === 0 && rnd() < 0.6) || rnd() < 0.1) continue
    const quantas = Math.round((dia.getDay() === 6 ? 32 : 17) + rnd() * 10)
    let certasDia = 0
    for (let k = 0; k < quantas && i < ordem.length; k++, i++) {
      const q = ordem[i]
      const slug = indice.temas[q.t].slug
      // Sobe ao longo dos meses e um pouco mais no último mês (a reta final do cronograma).
      const p = Math.min(0.94, (BASE[slug] ?? 0.74) + ((DIAS - d) / DIAS) * 0.08 + (d < 30 ? 0.05 : 0))
      const certa = rnd() < p
      if (certa) certasDia++
      const confianca = certa ? (rnd() < 0.82 ? 'seguro' : rnd() < 0.8 ? 'duvida' : 'chute') : rnd() < 0.02 ? 'seguro' : rnd() < 0.6 ? 'duvida' : 'chute'
      const em = momento(d)
      const historicoQ: NonNullable<RegistroQuestao['historico']> = [{ em, correta: certa, confianca }]
      // Revisões: errou, volta em poucos dias; a maioria acerta e boa parte consolida depois de uma semana.
      if (!certa && d > 1) {
        const d2 = Math.max(0, d - 1 - Math.floor(rnd() * 4))
        const acertou = rnd() < 0.85
        historicoQ.push({ em: momento(d2), correta: acertou, confianca: acertou ? (rnd() < 0.6 ? 'seguro' : 'duvida') : rnd() < 0.15 ? 'seguro' : 'chute' })
        if (acertou && d2 > 9) { const fixou = rnd() < 0.92; historicoQ.push({ em: momento(d2 - 8 - Math.floor(rnd() * 4)), correta: fixou, confianca: fixou ? 'seguro' : 'duvida' }) }
      } else if (certa && d > 12 && rnd() < 0.15) {
        { const manteve = rnd() < 0.95; historicoQ.push({ em: momento(d - 10 - Math.floor(rnd() * 3)), correta: manteve, confianca: manteve ? 'seguro' : 'duvida' }) }
      }
      const ultima = historicoQ[historicoQ.length - 1]
      respondidas[q.id] = { c: ultima.correta, q: ultima.em, tentativas: historicoQ.length, confianca: ultima.confianca, historico: historicoQ }
      // A turma acerta uns 12 pontos a menos que a Marina, com variação por questão.
      turma.set(q.id, { acerto: Math.round(Math.max(15, Math.min(95, (p - 0.12) * 100 + (rnd() - 0.5) * 30))) })
    }
    if (quantas) historico.push({
      id: `exemplo-${d}`, criadaEm: momento(d), concluidaEm: momento(d) + 40 * 60_000, total: quantas, respondidas: quantas,
      acertos: certasDia, segundos: quantas * 80, descricao: dia.getDay() === 6 ? 'Simulado de sábado' : 'Sessão do cronograma',
    })
  }
  const plano: PlanoSalvo = {
    data_prova: new Date(agora + 150 * DIA).toISOString().slice(0, 10), intensidade: 'firme', folgas: [0], prova: 'teot',
    // Plano de 90 dias atrás, sem base: a Marina fica uns 30% à frente do ritmo planejado.
    base_respondidas: 0, criado_em: new Date(agora - 90 * DIA).toISOString(), incluir_simulados: true, opcoes: null,
  }
  const exemplo = { respondidas, historico, turma, plano }
  cache.set(indice, exemplo)
  return exemplo
}
