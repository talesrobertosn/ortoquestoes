import { useEffect, useState } from 'react'
import { consumirRetornoAuth, obterUsuario, type UsuarioConta } from '../servicos/supabase'

export function usarConta() {
  const [usuario, definirUsuario] = useState<UsuarioConta | null>(() => obterUsuario())
  useEffect(() => {
    consumirRetornoAuth()
    const atualizar = () => definirUsuario(obterUsuario())
    atualizar()
    window.addEventListener('storage', atualizar)
    window.addEventListener('ortoquestoes:auth', atualizar)
    return () => { window.removeEventListener('storage', atualizar); window.removeEventListener('ortoquestoes:auth', atualizar) }
  }, [])
  return usuario
}
