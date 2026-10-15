/**
 * "Estudo de hoje" no topo do painel (Hoje): quantas pessoas estudaram, quantas fizeram questões
 * e quantas usaram flashcards hoje, no dia de São Paulo, com a comparação a ontem. Só lê o que
 * as consultas do painel já trazem (nenhuma RPC nova):
 * - serie_diaria_admin (dia, ativos, respostas): pessoas com ao menos 1 questão no dia e
 *   questões respondidas, hoje e ontem, contados da mesma forma (data da resposta);
 * - listar_usuarios_admin (respondidas_hoje, ultima_atividade) e sinais_usuarios_admin
 *   (flashcards_ultima): quem estudou hoje por qualquer um dos dois caminhos.
 * Flashcards de ontem não têm contagem por dia nessas consultas (só o último uso de cada pessoa),
 * por isso esse número sai sem comparação.
 */

export interface DiaSerie { dia: string; cadastros: number; ativos: number; respostas: number }
interface PessoaHoje { id_usuario: string; respondidas_hoje?: number; ultima_atividade: string | null }
interface SinalFlash { id_usuario: string; flashcards_ultima: string | null }

const FORMATO_DIA = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' })
/** "2026-10-15" no relógio de São Paulo. */
export const diaSP = (quando: string | number | Date) => FORMATO_DIA.format(new Date(quando))
/** O dia anterior a uma chave "AAAA-MM-DD". */
export const diaAnterior = (dia: string) => {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d - 1)).toISOString().slice(0, 10)
}

export interface EstudoHoje {
  hoje: string; ontem: string
  /** Pessoas com questão ou flashcard hoje (null sem a lista de pessoas). */
  estudaram: number | null
  /** Pessoas com ao menos 1 questão: hoje e ontem (null sem a série diária). */
  pessoasQuestoes: { hoje: number; ontem: number } | null
  /** Questões respondidas: hoje e ontem (null sem a série diária). */
  questoes: { hoje: number; ontem: number } | null
  /** Pessoas que usaram flashcards hoje (null sem os sinais da parte 25). */
  flashcards: number | null
}

export function estudoDeHoje({ serie, usuarios, sinais, agora = Date.now() }: {
  serie?: DiaSerie[] | null; usuarios?: PessoaHoje[] | null; sinais?: SinalFlash[] | null; agora?: number
}): EstudoHoje {
  const hoje = diaSP(agora), ontem = diaAnterior(hoje)
  const linha = (dia: string) => serie?.find(d => String(d.dia).slice(0, 10) === dia)
  const h = linha(hoje), o = linha(ontem)
  const temSerie = !!serie && serie.length > 0
  const comFlash = new Set((sinais ?? []).filter(s => s.flashcards_ultima && diaSP(s.flashcards_ultima) === hoje).map(s => s.id_usuario))
  let estudaram: number | null = null
  if (usuarios) {
    const ids = new Set(comFlash)
    for (const u of usuarios) if ((u.respondidas_hoje ?? 0) > 0 || (u.ultima_atividade && diaSP(u.ultima_atividade) === hoje)) ids.add(u.id_usuario)
    // A série conta pela data da resposta; a lista, pela última atividade sincronizada: fica o maior.
    estudaram = Math.max(ids.size, temSerie ? Number(h?.ativos ?? 0) : 0)
  }
  return {
    hoje, ontem, estudaram,
    pessoasQuestoes: temSerie ? { hoje: Number(h?.ativos ?? 0), ontem: Number(o?.ativos ?? 0) } : null,
    questoes: temSerie ? { hoje: Number(h?.respostas ?? 0), ontem: Number(o?.respostas ?? 0) } : null,
    flashcards: sinais ? comFlash.size : null,
  }
}
