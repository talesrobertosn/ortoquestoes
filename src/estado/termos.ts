import { usarArmazenado } from './usarArmazenado'

import { VERSAO_TERMOS } from '../conta/termos'

/**
 * Aceite guardado só no aparelho (legado). A versão vem de conta/termos.ts, a
 * única fonte: assim as duas constantes nunca divergem. Alterar a versão lá torna
 * necessária uma nova concordância no próximo acesso.
 */
export { VERSAO_TERMOS }
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
