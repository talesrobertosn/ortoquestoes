import { useEffect } from 'react'
import { usarConta } from './ContextoConta'
import { chamarRpc } from '../servicos/supabase'
import { gravar, ler, usuarioLocal } from '../estado/armazenamento'
import { usarArmazenado } from '../estado/usarArmazenado'
// Dia de São Paulo, de propósito: é o mesmo dia que o servidor grava em registrar_feito.
import { chaveDia } from '../estado/limiteDiario'
import { EVENTO_DADOS, type MudancaDados } from '../estado/armazenamento'
import { revisarHoje, type RegistroQuestao } from '../estado/revisao'
import { META_STREAK_DIARIA } from '../estado/streak'

/**
 * O que os emblemas difíceis precisam e só o servidor sabe (RPC meus_feitos,
 * migração 202610070500): indicações, Simulado Nacional, pódio, relatos,
 * avaliações, contra a corrente, o plano do Cronograma, os dias registrados
 * e os emblemas já conquistados (que ficam travados para sempre).
 * Enquanto o SQL não estiver aplicado, a RPC falha e tudo fica em zero.
 */
export type TipoFeito = 'questao_do_dia' | 'fila_zerada' | 'meta_cronograma'
export interface FeitosServidor {
  conquistas: string[]
  dias: Partial<Record<TipoFeito, string[]>>
  indicados_assinantes: number
  indicados_30_dias: number
  simulado_edicoes: string[]
  simulado_participacoes: Array<{ edicao: string; posicao: number; classificados: number }>
  ranking_semana: Array<{ dia: string; posicao: number }>
  relatos_resolvidos: number
  comentarios_avaliados: number
  contra_corrente: number
  plano: { data_prova: string; folgas: number[]; criado_em: string } | null
}

const CHAVE = 'feitos:servidor'
const CHAVE_REGISTRADOS = 'feitos:registrados'
const VALIDADE = 10 * 60_000

let consultando: Promise<void> | null = null

function consultar(id: string, forcar = false) {
  const salvo = ler<{ em: number; conta: string; dados: FeitosServidor } | null>(CHAVE, null)
  if (!forcar && salvo?.conta === id && Date.now() - salvo.em < VALIDADE) return Promise.resolve()
  consultando ??= chamarRpc<FeitosServidor>('meus_feitos', {})
    .then((dados) => { if (usuarioLocal() === id) gravar(CHAVE, { em: Date.now(), conta: id, dados }) })
    .catch(() => { /* SQL ainda não aplicado ou sem rede: os emblemas de servidor ficam em zero */ })
    .finally(() => { consultando = null })
  return consultando
}

/** Os feitos da conta logada (null para visitantes ou antes da primeira leitura). */
export function usarFeitos(): FeitosServidor | null {
  const { sessao } = usarConta()
  const id = sessao?.user.id
  const [salvo] = usarArmazenado<{ em: number; conta: string; dados: FeitosServidor } | null>(CHAVE, null)
  useEffect(() => { if (id) void consultar(id) }, [id])
  return id && salvo?.conta === id ? salvo.dados : null
}

/** Marca o dia de hoje para um feito; uma chamada por tipo e por dia. */
export function registrarFeito(tipo: TipoFeito) {
  const id = usuarioLocal()
  if (!id) return
  const hoje = chaveDia()
  const registrados = ler<Partial<Record<TipoFeito, string>>>(CHAVE_REGISTRADOS, {})
  if (registrados[tipo] === hoje) return
  gravar(CHAVE_REGISTRADOS, { ...registrados, [tipo]: hoje })
  chamarRpc('registrar_feito', { p_tipo: tipo })
    .then(() => {
      const salvo = ler<{ em: number; conta: string; dados: FeitosServidor } | null>(CHAVE, null)
      if (salvo?.conta !== id) return
      const dias = salvo.dados.dias[tipo] ?? []
      if (!dias.includes(hoje)) gravar(CHAVE, { ...salvo, dados: { ...salvo.dados, dias: { ...salvo.dados.dias, [tipo]: [...dias, hoje] } } })
    })
    .catch(() => {
      // Falhou (sem rede ou SQL ainda não aplicado): libera para tentar de novo.
      const atual = ler<Partial<Record<TipoFeito, string>>>(CHAVE_REGISTRADOS, {})
      if (atual[tipo] === hoje) gravar(CHAVE_REGISTRADOS, { ...atual, [tipo]: '' })
    })
}

let enviando = false
/** Trava no servidor os emblemas recém-conquistados (só os que ele ainda não tem). */
export function registrarConquistas(ids: readonly string[]) {
  const id = usuarioLocal()
  const salvo = ler<{ em: number; conta: string; dados: FeitosServidor } | null>(CHAVE, null)
  if (!id || enviando || salvo?.conta !== id) return
  const ja = new Set(salvo.dados.conquistas)
  const novos = ids.filter((e) => !ja.has(e))
  if (!novos.length) return
  enviando = true
  chamarRpc('registrar_conquistas', { p_ids: novos.slice(0, 300) })
    .then(() => {
      const atual = ler<{ em: number; conta: string; dados: FeitosServidor } | null>(CHAVE, null)
      if (atual?.conta === id) gravar(CHAVE, { ...atual, dados: { ...atual.dados, conquistas: [...new Set([...atual.dados.conquistas, ...novos])] } })
    })
    .catch(() => { /* tenta de novo na próxima mudança */ })
    .finally(() => { enviando = false })
}

/** Meta do Cronograma: registra o dia quando a meta de hoje está cumprida. */
export function conferirMetaCronograma(calculo: { metaDiaria: number; faltaHoje: number; adiantadoHoje?: number; naRetaFinal?: boolean; provaPassou?: boolean } | null | undefined) {
  // Dia todo adiantado antes (meta zerada por adiantamento) também conta como meta cumprida.
  const cumprida = calculo && (calculo.metaDiaria > 0 ? calculo.faltaHoje === 0 : (calculo.adiantadoHoje ?? 0) > 0)
  if (calculo && cumprida && !calculo.naRetaFinal && !calculo.provaPassou) registrarFeito('meta_cronograma')
}

/**
 * Fila zerada: depois de cada resposta, se o dia já tem a meta diária de
 * questões e nada ficou em Revisar hoje, o dia conta.
 */
export function vigiarFilaZerada(): () => void {
  const aoMudar = (evento: Event) => {
    const m = (evento as CustomEvent<MudancaDados>).detail
    if (m.chave !== 'respondidas' || m.origem !== 'local' || !m.usuario) return
    const respondidas = (m.valor ?? {}) as Record<string, RegistroQuestao>
    const hoje = chaveDia()
    let deHoje = 0
    for (const r of Object.values(respondidas)) {
      if (revisarHoje(r)) return
      for (const e of r.historico?.length ? r.historico : r.q ? [{ em: r.q }] : []) if (chaveDia(e.em) === hoje) deHoje++
    }
    if (deHoje >= META_STREAK_DIARIA) registrarFeito('fila_zerada')
  }
  window.addEventListener(EVENTO_DADOS, aoMudar)
  return () => window.removeEventListener(EVENTO_DADOS, aoMudar)
}
