import { PREFIXO_ARMAZENAMENTO } from '../config'

let cacheDisponivel: boolean | null = null
const memoria = new Map<string, string>()
let usuario: string | null = null
const GLOBAIS = new Set(['tema', 'etiquetas'])
/**
 * Visitantes não persistem progresso entre dispositivos, mas uma sessão de
 * questões em andamento é frágil demais para viver só na memória do processo
 * JS: o celular recarrega a aba ao voltar de outro app, e isso apagava a
 * sessão sem o usuário ter feito nada. sessionStorage resolve exatamente
 * esse caso — sobrevive a um recarregamento da mesma aba, mas ainda some ao
 * fechar a aba de verdade, mantendo o espírito de "só dura enquanto a aba
 * está aberta".
 */
const PERSISTE_ABA = new Set(['sessao:atual'])
export const EVENTO_DADOS = 'ortoquestoes:dados'
export interface MudancaDados { chave: string; antes: unknown; valor: unknown; usuario: string | null; origem: 'local' | 'nuvem' }
export function definirUsuarioLocal(id: string | null) {
  usuario = id
  if (id === null) {
    try {
      if (armazenamentoDisponivel()) {
        const apagar: string[] = []
        for (let i = 0; i < window.localStorage.length; i++) {
          const chave = window.localStorage.key(i)
          if (chave?.startsWith(PREFIXO_ARMAZENAMENTO) && !chave.startsWith(`${PREFIXO_ARMAZENAMENTO}conta:`) && ![`${PREFIXO_ARMAZENAMENTO}tema`, `${PREFIXO_ARMAZENAMENTO}etiquetas`].includes(chave)) apagar.push(chave)
        }
        apagar.forEach(chave => window.localStorage.removeItem(chave))
      }
    } catch { /* armazenamento indisponível */ }
  }
}
export function usuarioLocal() { return usuario }
export function chaveCompleta(chave: string, id = usuario): string {
  return PREFIXO_ARMAZENAMENTO + (id && !GLOBAIS.has(chave) ? `conta:${id}:` : '') + chave
}
export function armazenamentoDisponivel(): boolean {
  if (cacheDisponivel !== null) return cacheDisponivel
  try {
    const teste = PREFIXO_ARMAZENAMENTO + 'teste'
    window.localStorage.setItem(teste, '1'); window.localStorage.removeItem(teste)
    cacheDisponivel = true
  } catch { cacheDisponivel = false }
  return cacheDisponivel
}
function lerCompleta<T>(completa: string, padrao: T, fonte: 'local' | 'aba' | null): T {
  try {
    if (memoria.has(completa)) return JSON.parse(memoria.get(completa)!) as T
    const bruto =
      fonte === 'local' && armazenamentoDisponivel() ? window.localStorage.getItem(completa)
      : fonte === 'aba' ? window.sessionStorage.getItem(completa)
      : null
    return bruto === null || bruto === undefined ? padrao : JSON.parse(bruto) as T
  } catch { return padrao }
}
export function ler<T>(chave: string, padrao: T): T {
  // Preferências do aparelho (tema, etiquetas) persistem também para visitantes.
  return lerCompleta(chaveCompleta(chave), padrao, usuario !== null || GLOBAIS.has(chave) ? 'local' : PERSISTE_ABA.has(chave) ? 'aba' : null)
}
/** Visitantes nunca recuperam dados persistidos; a memória dura apenas enquanto a aba está aberta. */
export function lerVisitante<T>(_chave: string, padrao: T): T { return padrao }
export function gravar(chave: string, valor: unknown, origem: 'local' | 'nuvem' = 'local'): void {
  const completa = chaveCompleta(chave), antes = ler(chave, null), bruto = JSON.stringify(valor)
  try {
    // Visitantes usam apenas a memória da aba (com a exceção de PERSISTE_ABA,
    // abaixo); somente contas autenticadas persistem entre sessões e
    // dispositivos.
    if ((usuario !== null || GLOBAIS.has(chave)) && armazenamentoDisponivel()) { window.localStorage.setItem(completa, bruto); memoria.delete(completa) }
    else if (usuario === null && PERSISTE_ABA.has(chave)) { window.sessionStorage.setItem(completa, bruto); memoria.delete(completa) }
    else memoria.set(completa, bruto)
  } catch { memoria.set(completa, bruto) }
  window.dispatchEvent(new CustomEvent<MudancaDados>(EVENTO_DADOS, { detail: { chave, antes, valor, usuario, origem } }))
}
export function remover(chave: string): void {
  const completa = chaveCompleta(chave)
  try {
    if (armazenamentoDisponivel()) window.localStorage.removeItem(completa)
    if (usuario === null && PERSISTE_ABA.has(chave)) window.sessionStorage.removeItem(completa)
  } catch { /* memória */ }
  memoria.delete(completa)
}
/** Limpa apenas o perfil atual; a autenticação e os outros perfis ficam separados. */
export function limparTudo(origem: 'local' | 'nuvem' = 'local'): void {
  gravar('respondidas', {}, origem); gravar('favoritos', [], origem); gravar('notas', {}, origem); gravar('historico', [], origem)
  gravar('sessao:atual', null); remover('backup:anterior')
}
export function tamanhoArmazenado(): number {
  if (!usuario) return 0
  const prefixo = PREFIXO_ARMAZENAMENTO + (usuario ? `conta:${usuario}:` : '')
  const corresponde = (c: string) => c.startsWith(prefixo) && (usuario || !c.startsWith(PREFIXO_ARMAZENAMENTO + 'conta:'))
  const dados = new Map(memoria)
  try {
    if (armazenamentoDisponivel()) for (let i = 0; i < window.localStorage.length; i++) {
      const c = window.localStorage.key(i)
      if (c && !dados.has(c)) dados.set(c, window.localStorage.getItem(c) ?? '')
    }
  } catch { /* memória */ }
  return [...dados].reduce((s, [c, v]) => s + (corresponde(c) ? c.length + v.length : 0), 0)
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
