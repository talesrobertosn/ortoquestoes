import { useCallback, useEffect, useRef, useState } from 'react'
import { EVENTO_DADOS, chaveCompleta, type MudancaDados, gravar, ler } from './armazenamento'

/** useState que persiste em localStorage e se mantém em sincronia entre abas. */
export function usarArmazenado<T>(chave: string, padrao: T) {
  const [valor, definir] = useState<T>(() => ler(chave, padrao))

  const atual = useRef(valor)

  const atualizar = useCallback(
    (proximo: T | ((anterior: T) => T)) => {
      // Outra aba pode ter gravado antes de seu evento storage chegar aqui.
      // A persistência é a fonte atual para não regravar um retrato antigo.
      const resultado = typeof proximo === 'function' ? (proximo as (a: T) => T)(ler(chave, padrao)) : proximo
      atual.current = resultado
      gravar(chave, resultado)
      definir(resultado)
    },
    [chave],
  )

  useEffect(() => {
    function aoMudar(evento: StorageEvent) {
      if (evento.key !== chaveCompleta(chave)) return
      atual.current = ler(chave, padrao)
      definir(atual.current)
    }
    const aoMudarAqui = (evento: Event) => {
      if ((evento as CustomEvent<MudancaDados>).detail.chave !== chave) return
      atual.current = ler(chave, padrao)
      definir(atual.current)
    }
    window.addEventListener(EVENTO_DADOS, aoMudarAqui)
    window.addEventListener('storage', aoMudar)
    return () => { window.removeEventListener('storage', aoMudar); window.removeEventListener(EVENTO_DADOS, aoMudarAqui) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  return [valor, atualizar] as const
}
