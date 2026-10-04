import { normalizar } from './formatos'

/**
 * Contas do dono do projeto usadas para testar compras e reembolsos com
 * dinheiro real. Continuam listadas na aba Assinaturas, com o selo "Teste",
 * mas ficam fora dos números do painel (financeiro, crescimento e visão geral).
 * Os e-mails entram só como hash (FNV-1a), para não ficarem expostos no site.
 */
const NOMES_TESTE = ['thales roberto', 'tales roberto']
const EMAILS_TESTE = new Set(['d0140159', '9e0ee00a'])

function fnv1a(texto: string) {
  let h = 0x811c9dc5
  for (const c of new TextEncoder().encode(texto)) { h ^= c; h = Math.imul(h, 0x01000193) >>> 0 }
  return h.toString(16).padStart(8, '0')
}

export function contaDeTeste(a: { nome?: string | null; usuario?: string | null }) {
  const nome = normalizar(a.nome ?? '').trim().replace(/\s+/g, ' ')
  const email = (a.usuario ?? '').trim().toLowerCase()
  return NOMES_TESTE.some(n => nome === n || nome.startsWith(n + ' ')) || (!!email && EMAILS_TESTE.has(fnv1a(email)))
}
