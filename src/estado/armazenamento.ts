import { PREFIXO_ARMAZENAMENTO } from '../config'

/**
 * Camada fina sobre o localStorage. Se o armazenamento estiver indisponível
 * (navegação privada, cookies bloqueados, cota estourada), o site continua
 * funcionando: os dados ficam apenas em memória durante a visita.
 */

let cacheDisponivel: boolean | null = null
const memoria = new Map<string, string>()

export function armazenamentoDisponivel(): boolean {
  if (cacheDisponivel !== null) return cacheDisponivel
  try {
    const teste = PREFIXO_ARMAZENAMENTO + 'teste'
    window.localStorage.setItem(teste, '1')
    window.localStorage.removeItem(teste)
    cacheDisponivel = true
  } catch {
    cacheDisponivel = false
  }
  return cacheDisponivel
}

export function ler<T>(chave: string, padrao: T): T {
  const completa = PREFIXO_ARMAZENAMENTO + chave
  try {
    const bruto = armazenamentoDisponivel()
      ? window.localStorage.getItem(completa)
      : (memoria.get(completa) ?? null)
    if (bruto === null) return padrao
    return JSON.parse(bruto) as T
  } catch {
    return padrao
  }
}

export function gravar(chave: string, valor: unknown): void {
  const completa = PREFIXO_ARMAZENAMENTO + chave
  const bruto = JSON.stringify(valor)
  try {
    if (armazenamentoDisponivel()) window.localStorage.setItem(completa, bruto)
    else memoria.set(completa, bruto)
  } catch {
    memoria.set(completa, bruto)
  }
}

export function remover(chave: string): void {
  const completa = PREFIXO_ARMAZENAMENTO + chave
  try {
    if (armazenamentoDisponivel()) window.localStorage.removeItem(completa)
  } catch {
    /* segue em memória */
  }
  memoria.delete(completa)
}

/** Apaga todos os dados locais do OrtoQuestões, e nada mais. */
export function limparTudo(): void {
  try {
    if (armazenamentoDisponivel()) {
      const chaves: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const c = window.localStorage.key(i)
        if (c && c.startsWith(PREFIXO_ARMAZENAMENTO)) chaves.push(c)
      }
      for (const c of chaves) window.localStorage.removeItem(c)
    }
  } catch {
    /* nada a apagar */
  }
  memoria.clear()
}

/** Quantidade aproximada de dados guardados, para a página de dados locais. */
export function tamanhoArmazenado(): number {
  let total = 0
  try {
    if (armazenamentoDisponivel()) {
      for (let i = 0; i < window.localStorage.length; i++) {
        const c = window.localStorage.key(i)
        if (c && c.startsWith(PREFIXO_ARMAZENAMENTO)) {
          total += (window.localStorage.getItem(c)?.length ?? 0) + c.length
        }
      }
    } else {
      for (const [c, v] of memoria) total += c.length + v.length
    }
  } catch {
    /* ignora */
  }
  return total
}

/** Backup portátil de todos os dados pessoais, sem incluir nada de outros sites. */
export function exportarDados(): string {
  const dados: Record<string, unknown> = {}
  if (armazenamentoDisponivel()) {
    for (let i = 0; i < window.localStorage.length; i++) {
      const chave = window.localStorage.key(i)
      if (chave?.startsWith(PREFIXO_ARMAZENAMENTO)) {
        const valor = window.localStorage.getItem(chave)
        if (valor !== null) dados[chave.slice(PREFIXO_ARMAZENAMENTO.length)] = JSON.parse(valor)
      }
    }
  }
  return JSON.stringify({ produto: 'OrtoQuestões', versao: 1, exportadoEm: new Date().toISOString(), dados }, null, 2)
}

export function importarDados(conteudo: string): void {
  const backup = JSON.parse(conteudo) as { produto?: string; versao?: number; dados?: Record<string, unknown> }
  if (backup.produto !== 'OrtoQuestões' || backup.versao !== 1 || !backup.dados) {
    throw new Error('Este arquivo não é um backup válido do OrtoQuestões.')
  }
  for (const [chave, valor] of Object.entries(backup.dados)) gravar(chave, valor)
}
