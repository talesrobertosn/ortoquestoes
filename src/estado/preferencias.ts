import { useCallback } from 'react'
import { usarArmazenado } from './usarArmazenado'

export const CHAVE_ETIQUETAS = 'etiquetas'

/**
 * Etiquetas de assunto entregam a questão: ler "Fratura de Salter-Harris"
 * antes do enunciado já elimina metade das alternativas. Quem quer treinar
 * como em prova pode escondê-las — elas voltam sozinhas junto com o gabarito,
 * que é quando servem para estudar. O padrão continua sendo mostrar.
 */
export function usarEtiquetas() {
  const [mostrar, definir] = usarArmazenado<boolean>(CHAVE_ETIQUETAS, true)
  const alternar = useCallback(() => definir((anterior) => !anterior), [definir])
  return { mostrarEtiquetas: mostrar, definirEtiquetas: definir, alternarEtiquetas: alternar }
}
