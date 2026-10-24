/**
 * Alternativas embaralhadas na revisão (pedido do Tales em 19/10/2026): quem
 * revisa uma questão lembrava a posição da certa ("era a B") em vez de raciocinar.
 *
 * - Na primeira vez, a questão aparece na ordem da prova.
 * - Nas revisões, numa ordem nova, com a certa numa letra diferente da última vez.
 * - Alternativas numéricas só invertem a ordem (crescente ou decrescente).
 * - Certo/Errado, dissertativas e as questões que public/acervo/letras.json marca
 *   como fixas (o texto cita letras que não dá para trocar com segurança) ficam como estão.
 *
 * A permutação 'CADB' quer dizer que a letra nova A mostra a original C (o mesmo
 * formato do Simulado Nacional). Tudo o que é guardado (respostas, riscadas, turma,
 * histórico) continua na letra original; só a tela usa a nova.
 * Sem React: os testes em fixtures/testar_ordem_alternativas.mjs importam daqui.
 */
import type { ComentarioIA, Letra } from './tipos'

const LETRAS = 'ABCDE'

export interface LetrasAcervo {
  versao: number
  /** Questões que ficam sempre na ordem da prova, com o motivo. */
  fixas: Record<string, string>
  /** Questões de alternativas numéricas: só invertem a ordem. */
  numeros: string[]
  /** Onde o comentário cita uma alternativa pela letra: assinatura do texto e [campo, posição, letra]. */
  refs: Record<string, { h: string; r: Array<[string, number, string]> }>
}

/** Gerador determinístico (mulberry32): a mesma semente dá a mesma ordem. */
function gerador(semente: number): () => number {
  let s = semente >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashTexto(texto: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

function misturar(n: number, semente: number): string {
  const lista = [...LETRAS.slice(0, n)]
  const aleatorio = gerador(semente)
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1))
    ;[lista[i], lista[j]] = [lista[j], lista[i]]
  }
  return lista.join('')
}

/** Letra nova (a que a tela mostra) de uma letra original. */
export function letraExibida(ordem: string | null | undefined, original: string): string {
  if (!ordem) return original
  const i = ordem.indexOf(original)
  return i < 0 ? original : LETRAS[i]
}

/** Letra original (a que é guardada) de uma letra que a tela mostra. */
export function letraGuardada(ordem: string | null | undefined, exibida: string): string {
  if (!ordem) return exibida
  const i = LETRAS.indexOf(exibida)
  return i < 0 || i >= ordem.length ? exibida : ordem[i]
}

export interface QuestaoParaOrdem {
  id: string
  tipo?: string
  gabarito: Letra | null
  alternativas: Array<{ letra: Letra }>
}

export interface RegistroParaOrdem {
  q: number
  historico?: Array<{ em: number }>
}

/** Já tinha sido respondida antes deste momento (a revisão começa na segunda vez). */
export function respondidaAntes(registro: RegistroParaOrdem | null | undefined, desde: number): boolean {
  if (!registro) return false
  if (registro.historico?.length) return registro.historico.some((h) => h.em < desde)
  return registro.q < desde
}

export interface OpcoesOrdem {
  letras: LetrasAcervo | null
  registro: RegistroParaOrdem | null | undefined
  /** Início da sessão (ou da página): a decisão não muda depois de responder. */
  desde: number
  /** Semente da sessão: outra sessão, outra ordem. */
  semente: string
  /** Letra em que a certa apareceu da última vez (antes de `desde`); sem ela, a da prova. */
  ultimaExibida?: { l: string; em: number } | null
}

/**
 * A ordem desta questão nesta sessão, ou null para a ordem da prova.
 * Pura e determinística: recarregar a página mostra a mesma ordem.
 */
export function ordemParaRevisao(questao: QuestaoParaOrdem, opcoes: OpcoesOrdem): string | null {
  const n = questao.alternativas.length
  if (questao.tipo === 'dissertativa' || n < 3 || n > LETRAS.length) return null
  if (questao.alternativas.some((a, i) => a.letra !== LETRAS[i])) return null
  const { letras } = opcoes
  if (!letras || letras.fixas[questao.id]) return null
  if (!respondidaAntes(opcoes.registro, opcoes.desde)) return null
  const identidade = LETRAS.slice(0, n)
  const ultima = opcoes.ultimaExibida && opcoes.ultimaExibida.em < opcoes.desde ? opcoes.ultimaExibida.l : questao.gabarito
  if (letras.numeros.includes(questao.id)) {
    const invertida = [...identidade].reverse().join('')
    // Cinco alternativas com a certa no meio (C): inverter não a tira do lugar. Fica na ordem da prova.
    if (questao.gabarito && letraExibida(invertida, questao.gabarito) === questao.gabarito) return null
    // Alterna: se da última vez a certa estava na posição da ordem invertida, volta a da prova.
    if (questao.gabarito && ultima === letraExibida(invertida, questao.gabarito) && ultima !== questao.gabarito) return null
    return invertida
  }
  const base = hashTexto(`${opcoes.semente}:${questao.id}`)
  let reserva: string | null = null
  for (let k = 0; k < 24; k++) {
    const ordem = misturar(n, base + k * 7919)
    if (ordem === identidade) continue
    reserva ??= ordem
    if (!questao.gabarito || letraExibida(ordem, questao.gabarito) !== ultima) return ordem
  }
  return reserva
}

/** Assinatura FNV-1a dos campos do comentário (a mesma de scripts/letras_alternativas.py). */
export function assinaturaComentario(c: ComentarioIA): string {
  const partes = [c.alerta ?? '', c.conceito ?? '', c.correta ?? '', ...[...LETRAS].map((l) => c.incorretas?.[l as Letra] ?? '')]
  const bytes = new TextEncoder().encode(partes.join('\u0000'))
  let h = 0x811c9dc5
  for (const b of bytes) {
    h ^= b
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/**
 * Sem posições conferidas no letras.json, o comentário não deveria citar alternativa pela letra.
 * Se cita (texto editado depois, inclusive pelo painel), a tela avisa em vez de deixar a letra errada.
 */
const CITA_ALTERNATIVA = /(?:[Cc]orreta|[Ii]ncorreta|[Aa]lternativas?|[Ll]etras?|[Oo]p[çc][ãa]o|[Gg]abarito|[Rr]esposta)[\s*:(]{1,4}[A-E](?![\w-])/

export interface ComentarioReordenado {
  comentario: ComentarioIA
  /** O texto mudou depois do letras.json: as letras citadas no texto podem ser as da prova. */
  letrasDaProva: boolean
}

/**
 * O comentário na ordem da tela: a análise de cada alternativa vai para a letra nova,
 * a resposta provável também, e cada letra que o texto usa para falar de uma alternativa
 * (as que o letras.json conferiu) troca pela nova.
 */
export function reordenarComentario(
  comentario: ComentarioIA,
  ordem: string,
  refs: LetrasAcervo['refs'][string] | undefined,
): ComentarioReordenado {
  const incorretas: ComentarioIA['incorretas'] = {}
  const campos: Record<string, string> = {
    alerta: comentario.alerta ?? '',
    conceito: comentario.conceito ?? '',
    correta: comentario.correta ?? '',
  }
  for (const [l, t] of Object.entries(comentario.incorretas ?? {})) campos['i' + l] = t ?? ''
  let letrasDaProva = false
  if (refs) {
    if (refs.h === assinaturaComentario(comentario)) {
      const porCampo = new Map<string, string[]>()
      for (const [campo, pos, letra] of refs.r) {
        if (!(campo in campos)) continue
        const chars = porCampo.get(campo) ?? Array.from(campos[campo])
        if (chars[pos] === letra) chars[pos] = letraExibida(ordem, letra)
        porCampo.set(campo, chars)
      }
      for (const [campo, chars] of porCampo) campos[campo] = chars.join('')
    } else letrasDaProva = true
  } else letrasDaProva = Object.values(campos).some((t) => CITA_ALTERNATIVA.test(t))
  for (const [l, t] of Object.entries(campos)) {
    if (l.startsWith('i')) incorretas[letraExibida(ordem, l.slice(1)) as Letra] = t
  }
  return {
    comentario: {
      ...comentario,
      alerta: comentario.alerta == null ? comentario.alerta : campos.alerta,
      conceito: comentario.conceito == null ? comentario.conceito : campos.conceito,
      correta: campos.correta,
      incorretas,
      provavel: comentario.provavel ? (letraExibida(ordem, comentario.provavel) as Letra) : comentario.provavel,
    },
    letrasDaProva,
  }
}
