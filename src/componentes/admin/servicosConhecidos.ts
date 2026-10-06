import { normalizar } from './formatos'

/**
 * Serviços que aparecem escritos de vários jeitos (sigla, apelido, nome
 * incompleto). Só o painel usa esta lista, para juntar as contas do mesmo
 * lugar e mostrar o nome completo; o perfil da pessoa continua com o que ela
 * escreveu. Para incluir um serviço novo, acrescente uma linha: os apelidos
 * valem sem acento e sem diferença de maiúscula, e a sigla vale também dentro
 * de um texto maior ("HAC Curitiba"). Com `ufs`, o apelido só vale quando a
 * pessoa informou um desses estados ou não informou nenhum.
 */
export const SERVICOS_CONHECIDOS: Array<{ nome: string; apelidos: string[]; ufs?: string[] }> = [
  { nome: 'Hospital Angelina Caron (PR)', apelidos: ['hac', 'angelina caron', 'hospital angelina caron'] },
  { nome: 'Hospital Santa Isabel (BA)', apelidos: ['hospital santa isabel', 'santa isabel'], ufs: ['BA'] },
  { nome: 'Hospital Universitário Cajuru (PR)', apelidos: ['huc', 'cajuru', 'hospital universitario cajuru'], ufs: ['PR'] },
  { nome: 'Instituto Nacional de Traumatologia e Ortopedia (INTO)', apelidos: ['into', 'instituto nacional de traumatologia e ortopedia'] },
  { nome: 'Hospital Municipal Dr. José de Carvalho Florence (São José dos Campos, SP)', apelidos: ['hmjcf', 'jose de carvalho florence', 'hospital municipal de sao jose dos campos'] },
  { nome: 'Hospital Universitário da Universidade Federal de Juiz de Fora', apelidos: ['hufjf', 'hu ufjf', 'hu jf', 'hospital universitario de juiz de fora'] },
  { nome: 'Hospital das Clínicas da Faculdade de Medicina de Ribeirão Preto', apelidos: ['fmrphc', 'fmrp hc', 'hcfmrp', 'hc fmrp', 'hcrp', 'hc ribeirao preto', 'hc de ribeirao preto'] },
  { nome: 'Faculdade de Pinhais (acadêmicos de medicina)', apelidos: ['fap', 'fapi', 'faculdade de pinhais'] },
  { nome: 'Hospital Estadual de Traumatologia e Ortopedia Dona Lindu (Paraíba do Sul, RJ)', apelidos: ['htodi', 'htodl', 'hetodl', 'dona lindu', 'hospital dona lindu'] },
  { nome: 'Hospital Estadual Dr. Jayme Santos Neves (Serra, ES)', apelidos: ['jaime santos neves', 'jayme santos neves', 'hejsn'] },
]

/** Minúsculas, sem acento e sem pontuação: "H.A.C." e "hac" ficam iguais. */
const limpar = (texto: string) => normalizar(texto).replace(/[^a-z0-9]+/g, ' ').trim()

const INDICE = SERVICOS_CONHECIDOS.map(s => ({ ...s, chaves: s.apelidos.map(limpar) }))

/** Nome completo do serviço conhecido, ou null quando o texto não bate com nenhum. */
export function servicoConhecido(servico: string | null | undefined, uf?: string | null): string | null {
  if (!servico) return null
  const texto = limpar(servico)
  // Também sem os espaços, para "H A C" (de "H.A.C.") e "HC-FMRP".
  const colado = texto.replace(/ /g, '')
  const palavras = ` ${texto} `
  for (const s of INDICE) {
    if (s.ufs && uf && !s.ufs.includes(uf.toUpperCase())) continue
    if (s.chaves.some(c => c === texto || c.replace(/ /g, '') === colado || palavras.includes(` ${c} `))) return s.nome
  }
  return null
}

/** Chave para agrupar: o serviço conhecido, ou o texto escrito sem acento e sem espaços repetidos. */
export const chaveServico = (servico: string, uf?: string | null) =>
  servicoConhecido(servico, uf) ?? normalizar(servico).replace(/\s+/g, ' ').trim()
