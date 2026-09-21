import { usarArmazenado } from './usarArmazenado'

/** Alterar a versão torna necessária uma nova concordância no próximo acesso. */
export const VERSAO_TERMOS = '2026-09-15'
const CHAVE_TERMOS = 'termos:aceite'

export interface AceiteTermos {
  versao: string
  aceitoEm: string
}

export function usarAceiteTermos() {
  const [aceite, definirAceite] = usarArmazenado<AceiteTermos | null>(CHAVE_TERMOS, null)
  return {
    aceito: aceite?.versao === VERSAO_TERMOS,
    aceite,
    aceitar: () => definirAceite({ versao: VERSAO_TERMOS, aceitoEm: new Date().toISOString() }),
  }
}
