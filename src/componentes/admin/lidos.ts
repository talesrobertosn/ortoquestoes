import { useCallback, useEffect, useState } from 'react'
import { chamarRpc } from '../../servicos/supabase'

export type TipoLido = 'avaliacao' | 'pagamento' | 'relato'

export const EVENTO_LIDOS_ADMIN = 'oq:admin:lidos'
const chaveLocal = (tipo: TipoLido) => `oq-admin-lidos:${tipo}`
/** Chave com que uma avaliação de comentário é marcada como lida (a mesma no banco: ver contadores_admin). */
export const chaveAvaliacao = (l: { id_questao: string; usuario: string | null; atualizado_em: string }) => `${l.id_questao}|${l.usuario ?? ''}|${l.atualizado_em}`

export function lerLocal(tipo: TipoLido): string[] {
  try { return JSON.parse(localStorage.getItem(chaveLocal(tipo)) ?? '[]') as string[] } catch { return [] }
}
function gravarLocal(tipo: TipoLido, chaves: Set<string>) {
  try { localStorage.setItem(chaveLocal(tipo), JSON.stringify([...chaves].slice(-3000))) } catch { /* sem armazenamento: fica só na sessão */ }
}

/**
 * Avisos do painel já lidos pelo administrador. Guarda no Supabase
 * (migração 202610010100_admin_lidos.sql) para valer em qualquer aparelho;
 * sem a migração, guarda neste navegador.
 */
export function aplicarLidosLocais(tipo: TipoLido, chaves: string[], lido = true, persistido = false) {
  const conjunto = new Set(lerLocal(tipo))
  for (const c of chaves) { if (lido) conjunto.add(c); else conjunto.delete(c) }
  gravarLocal(tipo, conjunto)
  window.dispatchEvent(new CustomEvent(EVENTO_LIDOS_ADMIN, { detail: { tipo, persistido } }))
}

export function usarLidos(tipo: TipoLido) {
  const [lidos, definirLidos] = useState<Set<string>>(() => new Set(lerLocal(tipo)))
  const [noServidor, definirNoServidor] = useState(false)

  useEffect(() => {
    const atualizar = () => definirLidos(new Set(lerLocal(tipo)))
    window.addEventListener(EVENTO_LIDOS_ADMIN, atualizar)
    window.addEventListener('storage', atualizar)
    return () => { window.removeEventListener(EVENTO_LIDOS_ADMIN, atualizar); window.removeEventListener('storage', atualizar) }
  }, [tipo])

  useEffect(() => {
    let vivo = true
    chamarRpc<Array<{ chave: string }>>('listar_lidos_admin', { p_tipo: tipo })
      .then(linhas => {
        if (!vivo) return
        const conjunto = new Set([...lerLocal(tipo), ...linhas.map(l => l.chave)])
        gravarLocal(tipo, conjunto); definirLidos(conjunto); definirNoServidor(true)
        window.dispatchEvent(new CustomEvent(EVENTO_LIDOS_ADMIN, { detail: { tipo, persistido: false } }))
        // O que foi lido antes da migração sobe para o servidor uma vez.
        const soLocal = lerLocal(tipo).filter(c => !linhas.some(l => l.chave === c))
        if (soLocal.length) void chamarRpc('marcar_lidos_admin', { p_tipo: tipo, p_chaves: soLocal, p_lido: true }).catch(() => undefined)
      })
      .catch(() => undefined)
    return () => { vivo = false }
  }, [tipo])

  const marcar = useCallback(async (chaves: string[], lido = true): Promise<boolean> => {
    if (!chaves.length) return true
    aplicarLidosLocais(tipo, chaves, lido)
    if (!noServidor) return false
    try {
      await chamarRpc('marcar_lidos_admin', { p_tipo: tipo, p_chaves: chaves, p_lido: lido })
      window.dispatchEvent(new CustomEvent(EVENTO_LIDOS_ADMIN, { detail: { tipo, persistido: true } }))
      return true
    } catch { return false }
  }, [tipo, noServidor])

  return { lidos, marcar }
}
