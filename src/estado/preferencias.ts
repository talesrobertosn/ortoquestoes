import { useCallback } from 'react'
import { usarArmazenado } from './usarArmazenado'

export const CHAVE_ETIQUETAS = 'etiquetas'
export type DensidadeLeitura = 'confortavel' | 'compacta' | 'foco'
export const CHAVE_DENSIDADE = 'densidade-leitura'
export const CHAVE_FONTE = 'tamanho-fonte'

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

export function usarLeitura() {
  const [densidade, definirDensidade] = usarArmazenado<DensidadeLeitura>(CHAVE_DENSIDADE, 'confortavel')
  const [fonte, definirFonte] = usarArmazenado<number>(CHAVE_FONTE, 100)
  return { densidade, definirDensidade, fonte, definirFonte }
}

