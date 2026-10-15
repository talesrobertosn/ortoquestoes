/**
 * Continuidade do jogo entre aparelhos (15/10/2026).
 *
 * Bug relatado pelo Tales: "no notebook eu estava no Golem; no computador, no Senhor do Anel
 * Pélvico". A partida em andamento, o Bestiário, o Altar e o patamar da Torre viviam só no
 * localStorage de cada aparelho. Aqui fica a parte pura (e testável) da solução:
 *
 *  - cada partida ganha uma identidade (`idPartida`), um carimbo (`atualizadoEm`) e o aparelho
 *    que mexeu nela por último; entre aparelho e servidor, vale a mais recente;
 *  - partida encerrada (morte, desistência, vitória, "começar do zero") vira uma lápide com data
 *    e entra na lista `encerradas`: nenhuma cópia antiga dela ressuscita em outro aparelho;
 *  - Bestiário: união de vistos e vencidos;
 *  - Altar: talentos pelo maior nível e cristais ganhos por aparelho (o maior de cada um, somados);
 *    o saldo é ganhos menos o custo dos talentos. Nada do que foi ganho se perde;
 *  - patamar da Torre: o mais recente (limpar o patamar também tem data).
 *
 * O formato local continua o de antes (as mesmas chaves), só com campos a mais; uma partida
 * salva por uma versão anterior do site abre normalmente (sem carimbo, ela conta como antiga).
 * A conversa com o servidor fica em servidor.ts (sincronizarJogo, agendarEnvioJogo).
 */
import { gravar, ler } from '../estado/armazenamento'
import { ALTAR_VAZIO, TALENTOS, type EstadoAltar } from './motor/altar'
import type { Modo } from './motor/bestiario'
import { migrarPartida, type Partida, type Talentos } from './motor/regras'
import { BESTIARIO_VAZIO, CHAVE_ALTAR, CHAVE_BESTIARIO, CHAVE_PARTIDA, CHAVE_PARTIDA_TORRE, CHAVE_PATAMAR, type Bestiario } from './progresso'

/** Partidas encerradas recentemente (lápides), para nenhum aparelho ressuscitá-las. */
export const CHAVE_ENCERRADAS = 'flashcards:encerradas'
/** Identidade deste aparelho (por conta): diz de onde veio a última mudança. */
export const CHAVE_APARELHO = 'flashcards:aparelho'
export const CHAVE_DO_MODO: Record<Modo, string> = { masmorra: CHAVE_PARTIDA, torre: CHAVE_PARTIDA_TORRE }
export const MODOS: Modo[] = ['masmorra', 'torre']
const MAX_ENCERRADAS = 30
/** Evento disparado quando chega do servidor uma partida mais nova para o modo que está aberto. */
export const EVENTO_PARTIDA_REMOTA = 'flashcards:partida-remota'

/** Partida encerrada guardada no lugar da partida (o site antigo lê como "sem partida"). */
export interface Lapide { encerrada: true; idPartida: string; modo: Modo; andar: number; atualizadoEm: number; aparelho?: string }
/** Uma vaga de partida (por modo): a partida viva ou, com `partida: null`, a lápide. */
export interface Vaga { id: string; em: number; andar: number; aparelho: string; partida: Partida | null }
export interface Encerrada { id: string; modo: Modo; andar: number; em: number }
export interface AltarNuvem extends EstadoAltar { porAparelho?: Record<string, number> }
export interface PatamarNuvem { em: number; partida: Partida | null }
export interface JogoNuvem {
  versao: 1
  atualizadoEm: number
  partidas: Partial<Record<Modo, Vaga>>
  patamar: PatamarNuvem | null
  encerradas: Encerrada[]
  bestiario: Bestiario
  altar: AltarNuvem
}

const novoId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)))
export const novoIdPartida = novoId

/** Este aparelho (criado na primeira vez, guardado por conta). */
export function idDoAparelho(): string {
  let id = ler<string>(CHAVE_APARELHO, '')
  if (!id) { id = novoId(); gravar(CHAVE_APARELHO, id) }
  return id
}

/** Partidas antigas não têm id: o modo e a semente da masmorra identificam a partida. */
export function idDaPartida(p: Pick<Partida, 'idPartida' | 'modo' | 'sementeBase'>): string {
  return p.idPartida ?? `${p.modo}-${p.sementeBase}`
}

export function carimbar(p: Partida, em: number, aparelho: string): Partida {
  return { ...p, idPartida: idDaPartida(p), atualizadoEm: em, aparelho }
}

const ehLapide = (x: unknown): x is Lapide => !!x && typeof x === 'object' && (x as Lapide).encerrada === true && typeof (x as Lapide).idPartida === 'string'
const numero = (x: unknown, padrao = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : padrao)

/** Lê o que está guardado no lugar da partida de um modo (partida, lápide ou nada). */
export function vagaDe(bruto: unknown, modo: Modo, aparelho: string): Vaga | undefined {
  if (ehLapide(bruto)) return bruto.modo === modo ? { id: bruto.idPartida, em: numero(bruto.atualizadoEm), andar: numero(bruto.andar), aparelho: bruto.aparelho ?? aparelho, partida: null } : undefined
  const p = migrarPartida(bruto)
  if (!p || p.modo !== modo) return undefined
  const base = { id: idDaPartida(p), em: numero(p.atualizadoEm), andar: p.andar, aparelho: p.aparelho ?? aparelho }
  return p.fase === 'fim' ? { ...base, partida: null } : { ...base, partida: p }
}

/** O que gravar no lugar da partida para uma vaga. */
export function brutoDaVaga(v: Vaga, modo: Modo): Partida | Lapide {
  return v.partida
    ? { ...v.partida, idPartida: v.id, atualizadoEm: v.em, aparelho: v.aparelho }
    : { encerrada: true, idPartida: v.id, modo, andar: v.andar, atualizadoEm: v.em, aparelho: v.aparelho }
}

/* ------------------------------------------------------------------ mescla (funções puras) */

export function mesclarBestiario(a: Partial<Bestiario> | null | undefined, b: Partial<Bestiario> | null | undefined): Bestiario {
  const lista = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is string => typeof i === 'string') : [])
  const vencidos = [...new Set([...lista(a?.vencidos), ...lista(b?.vencidos)])]
  const vistos = [...new Set([...lista(a?.vistos), ...lista(b?.vistos), ...vencidos])]
  return { vistos, vencidos }
}

/** Cristais já gastos nos talentos comprados (custo de cada nível). */
export function gastoDoAltar(talentos: Talentos | undefined): number {
  let total = 0
  for (const t of TALENTOS) total += t.custos.slice(0, Math.max(0, Math.min(t.custos.length, numero(talentos?.[t.id])))).reduce((s, c) => s + c, 0)
  return total
}

const somar = (r: Record<string, number>) => Object.values(r).reduce((s, v) => s + v, 0)

/**
 * O Altar deste aparelho com a parte dele em `porAparelho`. O que este aparelho ganhou desde a
 * última mescla (ganhos ou cristais acima do que os outros explicam) vai para a conta dele.
 */
export function normalizarAltar(bruto: Partial<AltarNuvem> | null | undefined, aparelho: string): AltarNuvem {
  const a = { ...ALTAR_VAZIO, ...(bruto ?? {}) } as AltarNuvem
  const talentos: Talentos = {}
  for (const t of TALENTOS) { const n = numero(a.talentos?.[t.id]); if (n > 0) talentos[t.id] = Math.min(n, t.custos.length) }
  const gasto = gastoDoAltar(talentos)
  const por: Record<string, number> = {}
  for (const [k, v] of Object.entries(a.porAparelho ?? {})) if (numero(v) > 0) por[k] = numero(v)
  const outros = somar(por) - (por[aparelho] ?? 0)
  const meu = Math.max(por[aparelho] ?? 0, numero(a.ganhos) - outros, numero(a.cristais) + gasto - outros, 0)
  if (meu > 0) por[aparelho] = meu
  const ganhos = somar(por)
  return { versao: 1, talentos, porAparelho: por, ganhos, cristais: Math.max(0, ganhos - gasto) }
}

export function mesclarAltar(a: AltarNuvem, b: AltarNuvem | null | undefined): AltarNuvem {
  if (!b) return a
  const talentos: Talentos = {}
  for (const t of TALENTOS) { const n = Math.max(numero(a.talentos?.[t.id]), numero(b.talentos?.[t.id])); if (n > 0) talentos[t.id] = Math.min(n, t.custos.length) }
  // sem porAparelho (não deveria acontecer): o que o lado explica vira uma conta "antiga"
  const por = (x: AltarNuvem) => x.porAparelho ?? { antigo: Math.max(numero(x.ganhos), numero(x.cristais) + gastoDoAltar(x.talentos)) }
  const porAparelho: Record<string, number> = { ...por(a) }
  for (const [k, v] of Object.entries(por(b))) porAparelho[k] = Math.max(porAparelho[k] ?? 0, numero(v))
  const ganhos = somar(porAparelho)
  return { versao: 1, talentos, porAparelho, ganhos, cristais: Math.max(0, ganhos - gastoDoAltar(talentos)) }
}

export function mesclarEncerradas(...listas: Array<Encerrada[] | undefined>): Encerrada[] {
  const porId = new Map<string, Encerrada>()
  for (const lista of listas) for (const e of lista ?? []) {
    if (!e || typeof e.id !== 'string') continue
    const atual = porId.get(e.id)
    if (!atual || numero(e.em) > atual.em) porId.set(e.id, { id: e.id, modo: e.modo, andar: numero(e.andar), em: numero(e.em) })
  }
  return [...porId.values()].sort((x, y) => y.em - x.em).slice(0, MAX_ENCERRADAS)
}

/**
 * Entre duas vagas do mesmo modo:
 *  1. partida encerrada (na lista de lápides) vira lápide, mesmo que a cópia viva seja "mais nova";
 *  2. vale a mais recente;
 *  3. empate (partidas antigas, sem carimbo): a mais funda; depois, a do aparelho (`a`).
 */
export function mesclarVaga(a: Vaga | undefined, b: Vaga | undefined, encerradas: Encerrada[] = []): Vaga | undefined {
  const mortas = new Map(encerradas.map((e) => [e.id, e]))
  const enterrar = (v: Vaga | undefined): Vaga | undefined => {
    const e = v?.partida ? mortas.get(v.id) : undefined
    // o que a cópia viva fez depois do fim não vale: a lápide fica com a data do encerramento
    return v && e ? { ...v, partida: null, em: e.em } : v
  }
  const x = enterrar(a), y = enterrar(b)
  if (!x || !y) return x ?? y
  if (x.id === y.id && !x.partida !== !y.partida) return x.partida ? y : x
  if (x.em !== y.em) return x.em > y.em ? x : y
  if (x.partida && y.partida && y.andar > x.andar) return y
  return x
}

export function mesclarPatamar(a: PatamarNuvem | null | undefined, b: PatamarNuvem | null | undefined): PatamarNuvem | null {
  if (!a || !b) return a ?? b ?? null
  if (a.em !== b.em) return a.em > b.em ? a : b
  return a.partida || !b.partida ? a : b
}

/** Mescla o jogo do aparelho (`local`) com o da conta (`remoto`). Nunca perde progresso. */
export function mesclarJogos(local: JogoNuvem, remoto: JogoNuvem | null | undefined): JogoNuvem {
  if (!remoto) return local
  const lapides = (j: JogoNuvem): Encerrada[] => MODOS.flatMap((m) => { const v = j.partidas[m]; return v && !v.partida ? [{ id: v.id, modo: m, andar: v.andar, em: v.em }] : [] })
  const encerradas = mesclarEncerradas(local.encerradas, remoto.encerradas, lapides(local), lapides(remoto))
  const partidas: Partial<Record<Modo, Vaga>> = {}
  for (const m of MODOS) { const v = mesclarVaga(local.partidas[m], remoto.partidas[m], encerradas); if (v) partidas[m] = v }
  return {
    versao: 1,
    atualizadoEm: Math.max(local.atualizadoEm, remoto.atualizadoEm),
    partidas,
    patamar: mesclarPatamar(local.patamar, remoto.patamar),
    encerradas,
    bestiario: mesclarBestiario(local.bestiario, remoto.bestiario),
    altar: mesclarAltar(local.altar, remoto.altar),
  }
}

/** Confere o que veio do servidor (ou de uma versão futura): formato estranho é ignorado. */
export function validarJogo(x: unknown): JogoNuvem | null {
  const j = x as Partial<JogoNuvem> | null
  if (!j || typeof j !== 'object' || j.versao !== 1) return null
  const partidas: Partial<Record<Modo, Vaga>> = {}
  for (const m of MODOS) {
    const v = j.partidas?.[m] as Vaga | undefined
    if (!v || typeof v.id !== 'string') continue
    const p = v.partida ? migrarPartida(v.partida) : null
    if (v.partida && (!p || p.modo !== m)) continue
    partidas[m] = { id: v.id, em: numero(v.em), andar: numero(v.andar), aparelho: typeof v.aparelho === 'string' ? v.aparelho : '', partida: p }
  }
  const pat = j.patamar
  const patPartida = pat?.partida ? migrarPartida(pat.partida) : null
  return {
    versao: 1, atualizadoEm: numero(j.atualizadoEm),
    partidas,
    patamar: pat && typeof pat === 'object' ? { em: numero(pat.em), partida: patPartida && patPartida.modo === 'torre' ? patPartida : null } : null,
    encerradas: mesclarEncerradas(Array.isArray(j.encerradas) ? j.encerradas : []),
    bestiario: mesclarBestiario(j.bestiario, null),
    altar: j.altar && typeof j.altar === 'object' ? mesclarAltar(j.altar as AltarNuvem, j.altar as AltarNuvem) : { ...ALTAR_VAZIO, porAparelho: {} },
  }
}

/** Texto estável (chaves em ordem) para saber se dois jogos são iguais: o jsonb reordena as chaves. */
export function estavel(x: unknown): string {
  if (Array.isArray(x)) return '[' + x.map(estavel).join(',') + ']'
  if (x && typeof x === 'object') return '{' + Object.keys(x).filter((k) => (x as Record<string, unknown>)[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + estavel((x as Record<string, unknown>)[k])).join(',') + '}'
  return JSON.stringify(x ?? null)
}

/* ------------------------------------------------------------------ aparelho (localStorage) */

function patamarLocal(): PatamarNuvem | null {
  const bruto = ler<unknown>(CHAVE_PATAMAR, null)
  if (bruto && typeof bruto === 'object' && 'limpoEm' in bruto) return { em: numero((bruto as { limpoEm: number }).limpoEm), partida: null }
  const p = migrarPartida(bruto)
  return p && p.modo === 'torre' ? { em: numero(p.atualizadoEm), partida: p } : null
}

/** O jogo como está neste aparelho, no formato do servidor. */
export function lerJogoLocal(aparelho = idDoAparelho()): JogoNuvem {
  const partidas: Partial<Record<Modo, Vaga>> = {}
  for (const m of MODOS) { const v = vagaDe(ler<unknown>(CHAVE_DO_MODO[m], null), m, aparelho); if (v) partidas[m] = v }
  const encerradas = mesclarEncerradas(ler<Encerrada[]>(CHAVE_ENCERRADAS, []))
  const patamar = patamarLocal()
  const em = Math.max(0, ...MODOS.map((m) => partidas[m]?.em ?? 0), patamar?.em ?? 0, ...encerradas.map((e) => e.em))
  return {
    versao: 1, atualizadoEm: em, partidas, patamar, encerradas,
    bestiario: mesclarBestiario(ler<Partial<Bestiario>>(CHAVE_BESTIARIO, BESTIARIO_VAZIO), null),
    altar: normalizarAltar(ler<Partial<AltarNuvem>>(CHAVE_ALTAR, {}), aparelho),
  }
}

/** Modo aberto na tela agora: a partida dele não é trocada por baixo (a Arena decide quando adotar). */
let protegido: Modo | null = null
const pendentes: Partial<Record<Modo, Vaga>> = {}
export function protegerModo(m: Modo | null) { protegido = m }
const vindasNaoVistas: Partial<Record<Modo, number>> = {}
/** Andar da partida que chegou de outro aparelho desde a última vez que a arena perguntou (para o aviso). */
export function tomarVinda(m: Modo): number | undefined { const v = vindasNaoVistas[m]; delete vindasNaoVistas[m]; return v }
/** Partida mais nova que chegou do servidor para o modo aberto (uma vez). */
export function tomarPendente(m: Modo): Vaga | undefined { const v = pendentes[m]; delete pendentes[m]; return v }

const mudou = (a: Vaga | undefined, b: Vaga | undefined) => !a !== !b || (!!a && !!b && (a.id !== b.id || a.em !== b.em || !a.partida !== !b.partida))
const gravarSeMudou = (chave: string, valor: unknown) => { if (estavel(ler<unknown>(chave, null)) !== estavel(valor)) gravar(chave, valor) }

/**
 * Grava o jogo mesclado no aparelho. Devolve os modos cuja partida veio de outro aparelho
 * (com o andar, para o aviso). O modo aberto na tela não é trocado: fica pendente.
 */
export function gravarJogoLocal(jogo: JogoNuvem, antes: JogoNuvem, aparelho = idDoAparelho()): Partial<Record<Modo, number>> {
  const vindas: Partial<Record<Modo, number>> = {}
  for (const m of MODOS) {
    const v = jogo.partidas[m], a = antes.partidas[m]
    if (!v || !mudou(v, a)) continue
    if (v.partida && v.aparelho !== aparelho) vindas[m] = vindasNaoVistas[m] = v.andar
    else delete vindasNaoVistas[m]
    if (m === protegido) {
      pendentes[m] = v
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENTO_PARTIDA_REMOTA, { detail: { modo: m } }))
      continue
    }
    gravar(CHAVE_DO_MODO[m], brutoDaVaga(v, m))
  }
  const pa = jogo.patamar, pb = antes.patamar
  if (pa && (!pb || pa.em !== pb.em || !pa.partida !== !pb.partida)) gravar(CHAVE_PATAMAR, pa.partida ? { ...pa.partida, atualizadoEm: pa.em } : { limpoEm: pa.em })
  gravarSeMudou(CHAVE_ENCERRADAS, jogo.encerradas)
  gravarSeMudou(CHAVE_BESTIARIO, jogo.bestiario)
  if (estavel(normalizarAltar(ler<Partial<AltarNuvem>>(CHAVE_ALTAR, {}), aparelho)) !== estavel(jogo.altar)) gravar(CHAVE_ALTAR, jogo.altar)
  return vindas
}

/* ------------------------------------------------------------------ gravações do jogo */

/** Guarda a partida em andamento com o carimbo. Encerrada, ela entra nas lápides. */
export function salvarPartidaLocal(p: Partida, em = Date.now(), aparelho = idDoAparelho()): Partida {
  const c = carimbar(p, em, aparelho)
  gravar(CHAVE_DO_MODO[p.modo], c)
  if (p.fase === 'fim') registrarEncerrada(c)
  return c
}

export function registrarEncerrada(p: Pick<Partida, 'idPartida' | 'modo' | 'sementeBase' | 'andar' | 'atualizadoEm'>, em = p.atualizadoEm ?? Date.now()) {
  const lista = ler<Encerrada[]>(CHAVE_ENCERRADAS, [])
  const id = idDaPartida(p)
  if (lista.some((e) => e.id === id)) return
  gravar(CHAVE_ENCERRADAS, mesclarEncerradas(lista, [{ id, modo: p.modo, andar: p.andar, em }]))
}

/** "Começar do zero" fora da arena: a partida salva vira lápide (não volta por outro aparelho). */
export function encerrarPartidaSalva(modo: Modo, aparelho = idDoAparelho(), em = Date.now()) {
  const v = vagaDe(ler<unknown>(CHAVE_DO_MODO[modo], null), modo, aparelho)
  if (!v) { gravar(CHAVE_DO_MODO[modo], null); return }
  const lapide: Vaga = { ...v, partida: null, em: Math.max(em, v.em + 1), aparelho }
  gravar(CHAVE_DO_MODO[modo], brutoDaVaga(lapide, modo))
  registrarEncerrada({ idPartida: v.id, modo, sementeBase: 0, andar: v.andar, atualizadoEm: lapide.em })
}

/** Torre: guarda o patamar com data; limpar também tem data (outro aparelho não traz o antigo de volta). */
export function salvarPatamar(p: Partida, em = Date.now()) { gravar(CHAVE_PATAMAR, { ...p, atualizadoEm: em }) }
export function limparPatamar(em = Date.now()) { gravar(CHAVE_PATAMAR, { limpoEm: em }) }
