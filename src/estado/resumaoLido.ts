import { chaveData } from '../dados/planoEstudo'
import { diaCivil } from '../util/dia'

/**
 * Áreas do resumão lidas hoje, para o item "Resumão do tema" do cronograma.
 *
 * Critério (simples e de propósito): a área conta como lida hoje quando a pessoa
 * toca em "Li esta área" ou fica um minuto com ela aberta e a aba visível. O clique
 * em "Ler" no cronograma só abre a página; não marca nada antes da leitura.
 */
export const CHAVE_RESUMAO_HOJE = 'resumao:lido-hoje'
/** Tempo com a área aberta (e a aba à vista) que conta como leitura. */
export const SEGUNDOS_LEITURA = 60

export interface ResumaoHoje { data: string; areas: string[] }
export const RESUMAO_HOJE_VAZIO: ResumaoHoje = { data: '', areas: [] }

export const lidoHoje = (registro: ResumaoHoje, slug: string | undefined, hoje = diaCivil()) =>
  !!slug && registro.data === chaveData(hoje) && registro.areas.includes(slug)

export function comAreaLida(registro: ResumaoHoje, slug: string, hoje = diaCivil()): ResumaoHoje {
  const data = chaveData(hoje)
  const areas = registro.data === data ? registro.areas : []
  return areas.includes(slug) ? registro : { data, areas: [...areas, slug] }
}
