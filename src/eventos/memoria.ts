export interface Lembrancas { vistos: Record<string, number>; marcos: number[]; selo: boolean; arquivo: boolean; ultimo: number }
const memoria = new Map<string, Lembrancas>()
export const vazias = (): Lembrancas => ({ vistos: {}, marcos: [], selo: false, arquivo: false, ultimo: 0 })
function chave(id: string) { return `oq:eventos:lembrancas:v1:${id}` }
export function lerLembrancas(id: string): Lembrancas {
  try {
    const bruto = JSON.parse(localStorage.getItem(chave(id)) ?? 'null')
    if (bruto && typeof bruto === 'object') return {
      vistos: bruto.vistos && typeof bruto.vistos === 'object' ? bruto.vistos : {},
      marcos: Array.isArray(bruto.marcos) ? bruto.marcos.filter((n: unknown) => typeof n === 'number') : [],
      selo: bruto.selo === true, arquivo: bruto.arquivo === true, ultimo: typeof bruto.ultimo === 'number' ? bruto.ultimo : 0,
    }
  } catch { /* armazenamento bloqueado */ }
  return memoria.get(id) ?? vazias()
}
export function guardarLembrancas(id: string, valor: Lembrancas) {
  // Datas recentes bastam para frequência; marcos, selo e sala permanecem separados.
  valor = { ...valor, vistos: Object.fromEntries(Object.entries(valor.vistos).sort((a, b) => b[1] - a[1]).slice(0, 80)) }
  memoria.set(id, valor)
  try { localStorage.setItem(chave(id), JSON.stringify(valor)) } catch { /* só nesta aba */ }
  window.dispatchEvent(new Event('oq:eventos:lembrancas'))
}

/*
 * Limite global de aparições (pedido do Tales, 16/10/2026: "no máximo uma vez a cada uma hora").
 * Uma única marca de tempo por NAVEGADOR, somada a todas as surpresas e a todas as contas que
 * usarem este aparelho. Fica fora de `estado/armazenamento` (ler/gravar) de propósito: aquele
 * armazenamento é por conta, entra na sincronização e é limpo ao sair da conta, o que zeraria o
 * limite. Como a preferência e as lembranças, usa só localStorage com prefixo `oq:eventos:` e,
 * se o navegador recusar, vale na memória da aba.
 */
const CHAVE_ULTIMA = 'oq:eventos:ultima-aparicao:v1'
let ultimaNaMemoria = 0
export function ultimaAparicao(): number {
  try {
    const n = Number(localStorage.getItem(CHAVE_ULTIMA) ?? 0)
    if (Number.isFinite(n) && n > 0) return Math.max(n, ultimaNaMemoria)
  } catch { /* armazenamento bloqueado */ }
  return ultimaNaMemoria
}
export function registrarAparicao(agora: number) {
  ultimaNaMemoria = Math.max(ultimaNaMemoria, agora)
  try { localStorage.setItem(CHAVE_ULTIMA, String(agora)) } catch { /* só nesta aba */ }
}
