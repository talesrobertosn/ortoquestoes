import { DIAS_LEITURA_MAXIMO, type DocBiblioteca, type Leitura, type Marca } from './tipos'

/**
 * Junta duas versões do mesmo item da Biblioteca, alteradas em aparelhos diferentes antes de
 * sincronizar. Regras explícitas (e a mesma resposta nos dois aparelhos, qualquer que seja a ordem):
 * - marcação: vale a edição mais recente para cor, âncora e favorita; uma exclusão só vence se for
 *   posterior à última edição do outro lado; **nota**: se as duas mudaram para textos diferentes, a
 *   mais recente fica como nota e a outra vai para `notasDeOutroAparelho` (a pessoa decide). Nada some.
 * - leitura: vale a posição mais recente; progresso e conclusão ficam com o maior/primeiro; o tempo
 *   de leitura fica com o maior e os dias de leitura se somam (união).
 * - preferências: vale a mais recente.
 */
export function juntarBiblioteca(a: unknown, b: unknown): unknown {
  const x = a as DocBiblioteca | null, y = b as DocBiblioteca | null
  if (!x || typeof x !== 'object') return b
  if (!y || typeof y !== 'object' || x.tipo !== y.tipo) return a
  if (x.tipo === 'marca' && y.tipo === 'marca') return juntarMarca(x, y)
  if (x.tipo === 'leitura' && y.tipo === 'leitura') return juntarLeitura(x, y)
  if (x.tipo === 'pref' && y.tipo === 'pref') return x.em >= y.em ? x : y
  return a
}

const momento = (m: Marca) => Math.max(m.editadaEm, m.apagadaEm ?? 0)
/** Desempate estável (mesmo milissegundo): pela serialização, igual nos dois aparelhos. */
const maisNova = <T>(p: T, q: T, tp: number, tq: number): [T, T] => tp > tq || (tp === tq && JSON.stringify(p) >= JSON.stringify(q)) ? [p, q] : [q, p]

function juntarMarca(a: Marca, b: Marca): Marca {
  const [nova, velha] = maisNova(a, b, momento(a), momento(b))
  const alternativas = new Set([...(a.notasDeOutroAparelho ?? []), ...(b.notasDeOutroAparelho ?? [])])
  if (velha.nota.trim() && velha.nota !== nova.nota && !nova.nota.includes(velha.nota)) alternativas.add(velha.nota)
  alternativas.delete(nova.nota)
  const r: Marca = { ...nova, criadaEm: Math.min(a.criadaEm, b.criadaEm) }
  // Apagada de um lado e editada depois do outro: a edição posterior "ressuscita" de propósito.
  if (nova.apagadaEm === undefined) delete r.apagadaEm
  if (alternativas.size) r.notasDeOutroAparelho = [...alternativas].sort()
  else delete r.notasDeOutroAparelho
  return r
}

function juntarLeitura(a: Leitura, b: Leitura): Leitura {
  const [nova] = maisNova(a, b, a.em, b.em)
  const concluido = [a.concluidoEm, b.concluidoEm].filter((v): v is number => typeof v === 'number')
  const aberturas = [...new Set([...(a.aberturas ?? []), ...(b.aberturas ?? [])])].sort((p, q) => q - p).slice(0, 20)
  const r: Leitura = { ...nova, progresso: Math.max(a.progresso, b.progresso), aberturas }
  if (concluido.length) r.concluidoEm = Math.min(...concluido)
  else delete r.concluidoEm
  // Tempo: fica o maior (somar contaria duas vezes o que veio da mesma base). Dias: a união.
  const segundos = Math.max(a.segundos ?? 0, b.segundos ?? 0)
  if (segundos > 0) r.segundos = segundos
  else delete r.segundos
  const dias = [...new Set([...(a.dias ?? []), ...(b.dias ?? [])])].sort((p, q) => p - q).slice(-DIAS_LEITURA_MAXIMO)
  if (dias.length) r.dias = dias
  else delete r.dias
  return r
}
