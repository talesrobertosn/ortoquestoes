import { normalizar } from './formatos'

/**
 * Contas do dono do projeto usadas para testar compras e reembolsos. Continuam
 * listadas na aba Assinaturas, com o selo "Teste", mas ficam fora dos números
 * do painel (financeiro, crescimento e visão geral).
 */
const NOMES_TESTE = ['thales roberto', 'tales roberto']
const EMAILS_TESTE = ['thalesroberto23@']

export function contaDeTeste(a: { nome?: string | null; usuario?: string | null }) {
  const nome = normalizar(a.nome ?? '').trim().replace(/\s+/g, ' ')
  const email = (a.usuario ?? '').toLowerCase()
  return NOMES_TESTE.some(n => nome === n || nome.startsWith(n + ' ')) || EMAILS_TESTE.some(e => email.startsWith(e))
}
