import { PREFIXO_ARMAZENAMENTO } from '../config'

let cacheDisponivel: boolean | null = null
const memoria = new Map<string, string>()
let usuario: string | null = null
const GLOBAIS = new Set(['tema', 'etiquetas'])
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
function lerCompleta<T>(completa: string, padrao: T): T {
  try {
    const bruto = memoria.get(completa) ?? (armazenamentoDisponivel() ? window.localStorage.getItem(completa) : null)
    return bruto === null || bruto === undefined ? padrao : JSON.parse(bruto) as T
  } catch { return padrao }
}
export function ler<T>(chave: string, padrao: T): T { return lerCompleta(chaveCompleta(chave), padrao) }
export function lerVisitante<T>(chave: string, padrao: T): T { return lerCompleta(chaveCompleta(chave, null), padrao) }
export function gravar(chave: string, valor: unknown, origem: 'local' | 'nuvem' = 'local'): void {
  const completa = chaveCompleta(chave), antes = ler(chave, null), bruto = JSON.stringify(valor)
  try {
    // Visitantes usam apenas a memória da aba; somente contas autenticadas
    // persistem o progresso entre sessões e dispositivos.
    if (usuario !== null && armazenamentoDisponivel()) { window.localStorage.setItem(completa, bruto); memoria.delete(completa) }
    else memoria.set(completa, bruto)
  } catch { memoria.set(completa, bruto) }
  window.dispatchEvent(new CustomEvent<MudancaDados>(EVENTO_DADOS, { detail: { chave, antes, valor, usuario, origem } }))
}
export function remover(chave: string): void {
  const completa = chaveCompleta(chave)
  try { if (armazenamentoDisponivel()) window.localStorage.removeItem(completa) } catch { /* memória */ }
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
