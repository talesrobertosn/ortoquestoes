/**
 * O comentário de cada alternativa no cartão da questão mostra o texto da
 * alternativa como título. Muitos comentários abrem a explicação repetindo esse
 * mesmo texto ("**Inibe a ação dos osteoclastos.** O osteoclasto engole…",
 * "**II.** Esclerose do semilunar…", "**Correta: D (corpo vertebral).** …"),
 * e no celular a pessoa lia a mesma frase duas vezes seguidas. Aqui sai só
 * essa abertura repetida; o resto da explicação fica intacto.
 *
 * Só sai quando a abertura é um eco fechado: um parágrafo inteiro em negrito,
 * um negrito que termina antes do texto seguir, ou uma frase que termina em
 * ponto ou dois-pontos logo depois do texto da alternativa. "A **tróclea** pode
 * ser acometida…" é uma frase de verdade e fica como está.
 */

const MARCAS_DIACRITICAS = /[̀-ͯ]/g

/** Minúsculas, sem acento, só letras e números separados por um espaço. */
export function normalizarEco(texto: string): string {
  return texto.normalize('NFD').replace(MARCAS_DIACRITICAS, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Normaliza mantendo, para cada caractere normalizado, a posição no texto
 * original logo depois dele: é o que permite cortar o original exatamente onde
 * o eco termina.
 */
function normalizarComMapa(texto: string): { normal: string; fim: number[] } {
  let normal = ''
  const fim: number[] = []
  for (let i = 0; i < texto.length; i++) {
    const base = texto[i].normalize('NFD').replace(MARCAS_DIACRITICAS, '').toLowerCase()
    for (const c of base) {
      if (/[a-z0-9]/.test(c)) { normal += c; fim.push(i + 1) }
      else if (normal && !normal.endsWith(' ')) { normal += ' '; fim.push(i + 1) }
    }
  }
  return { normal, fim }
}

/** "Correta: D (", "Incorreta. ", "Alternativa B: ", "A: ", "(B) ": rótulo que às vezes precede o eco. */
const ROTULO_INICIAL = /^(?:\*\*)?\s*(?:(?:(?:in)?corret[ao]|errad[ao]|cert[ao]|alternativa)\b\s*[:.\-–—]?\s*(?:\(?[A-E]\)?(?![\p{L}\p{N}]))?\s*[:.\-–—]?\s*\(?\s*|\(?[A-E]\)\s*[:.\-–—]?\s*|[A-E]\s*[:\-–—]\s*)/iu

function primeiraMaiuscula(texto: string): string {
  return texto.replace(/^(\s*[*_"“(]*)(\p{Ll})/u, (_, antes: string, letra: string) => antes + letra.toUpperCase())
}

/**
 * Posição, no texto, logo depois da abertura que repete a alternativa (e da
 * pontuação e do negrito que a fecham), ou -1 quando a abertura não é eco.
 */
function fimDoEco(texto: string, alternativa: string): number {
  const alvo = normalizarEco(alternativa)
  if (!alvo) return -1
  const negrito = texto.startsWith('**')
  const rotulo = ROTULO_INICIAL.exec(texto)
  const inicios = rotulo && rotulo[0].length > (negrito ? 2 : 0) ? [rotulo[0].length, 0] : [0]
  for (const inicio of inicios) {
    const { normal, fim } = normalizarComMapa(texto.slice(inicio))
    // O eco precisa cobrir palavras inteiras: "II" não é eco de "III".
    if (!normal.startsWith(alvo) || /[a-z0-9]/.test(normal[alvo.length] ?? '')) continue
    const corte = inicio + fim[alvo.length - 1]
    const resto = texto.slice(corte)
    // Fecho do eco: pontuação final e, se abriu em negrito, o fechamento do negrito
    // (sem pontuação, "**Grácil e semimembranáceo** ficam…" é o sujeito da frase e fica).
    const fecho = negrito
      ? /^[)\]"”'’\s]*(?:[.:;!?…—–-][)\]"”'’\s]*\*\*|\*\*\s*[:.\-–—])\s*/.exec(resto)
      : /^[)\]"”'’]*\s*(?:[.:;!?…]|\s[—–-])\s*/.exec(resto)
    if (fecho) return corte + fecho[0].length
  }
  return -1
}

/**
 * Tira do começo da explicação o eco do texto da alternativa. Sem eco, ou se
 * não sobrar explicação depois dele, devolve o texto como veio.
 */
export function semEco(texto: string, alternativa?: string): string {
  if (!alternativa) return texto
  const original = texto.replace(/^\s+/, '')
  const [primeiro, ...resto] = original.split(/\n\s*\n|\n(?=- )/)

  // Parágrafo inteiro em negrito que repete a alternativa (com ou sem rótulo antes).
  const so = /^\*\*([^*]+)\*\*\s*$/.exec(primeiro.trim())
  if (so && resto.join('').trim()) {
    const a = normalizarEco(so[1].replace(ROTULO_INICIAL, '')), b = normalizarEco(alternativa)
    if (a && (b.startsWith(a) || a.startsWith(b) || b.includes(a))) {
      return original.slice(primeiro.length).replace(/^\s+/, '')
    }
  }

  const corte = fimDoEco(original, alternativa)
  if (corte < 0) return texto
  const depois = original.slice(corte).replace(/^[\s]+/, '')
  // Só sobrou pontuação ou nada: a abertura era a explicação inteira.
  if (normalizarEco(depois).length < 3) return texto
  return primeiraMaiuscula(depois)
}
