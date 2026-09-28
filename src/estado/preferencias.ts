import { useCallback } from 'react'
import { usarArmazenado } from './usarArmazenado'
import { RITMO_PADRAO, type RitmoRevisao } from './planoRevisao'

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

export const CHAVE_RITMO = 'revisao:ritmo'
/** Teto diário e dias de folga da revisão. O padrão (30 por dia) evita o dia de 100 revisões depois de uma maratona. */
export function usarRitmoRevisao() {
  const [salvo, definirRitmo] = usarArmazenado<RitmoRevisao>(CHAVE_RITMO, RITMO_PADRAO)
  const ritmo: RitmoRevisao = {
    limite: salvo && (salvo.limite === null || (typeof salvo.limite === 'number' && salvo.limite > 0)) ? salvo.limite : RITMO_PADRAO.limite,
    folgas: Array.isArray(salvo?.folgas) ? salvo.folgas.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [],
  }
  return { ritmo, definirRitmo }
}
