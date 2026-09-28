import { useEffect, useState } from 'react'
import { chamarRpc } from '../servicos/supabase'

let cache: { usuario: string; admin: boolean } | null = null

/** Se a conta está em public.administradores. Quem decide é o servidor; aqui só mostra o atalho. */
export function usarAdministrador(usuario: string | null | undefined): boolean {
  const [admin, definirAdmin] = useState(() => !!usuario && cache?.usuario === usuario && cache.admin)
  useEffect(() => {
    if (!usuario) { definirAdmin(false); return }
    if (cache?.usuario === usuario) { definirAdmin(cache.admin); return }
    let vivo = true
    chamarRpc<boolean>('eh_administrador', {})
      .then(resposta => { cache = { usuario, admin: resposta === true }; if (vivo) definirAdmin(cache.admin) })
      .catch(() => undefined)
    return () => { vivo = false }
  }, [usuario])
  return admin
}
