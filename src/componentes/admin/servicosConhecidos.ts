import { normalizar } from './formatos'

/**
 * Serviços que aparecem escritos de vários jeitos (sigla, apelido, nome
 * incompleto, erro de digitação). O painel usa esta lista para juntar as contas
 * do mesmo lugar e mostrar o nome completo; o cadastro, para a busca com
 * sugestões. O perfil da pessoa continua com o que ela escreveu.
 *
 * Para incluir um serviço, acrescente uma linha: os apelidos valem sem acento
 * e sem diferença de maiúscula, e valem também dentro de um texto maior
 * ("HAC Curitiba"). Com `ufs`, o serviço só é reconhecido quando a pessoa
 * informou um desses estados ou não informou nenhum. Siglas ambíguas (HRC,
 * HGVC, "Hospital de Base", "Santa Casa" sozinha) ficam de fora de propósito.
 *
 * O `nome` é o que fica gravado quando a pessoa escolhe na lista: não mude o
 * nome de um serviço que já existe (perfis antigos guardam o texto); se
 * precisar, deixe o nome antigo como apelido.
 */
export interface ServicoConhecido { nome: string; cidade: string; uf: string; apelidos: string[]; ufs?: string[] }

export const SERVICOS_CONHECIDOS: ServicoConhecido[] = [
  // Os dez primeiros (21/10/2026): o nome já está gravado em perfis, não mudar.
  { nome: 'Hospital Angelina Caron (PR)', cidade: 'Campina Grande do Sul', uf: 'PR', apelidos: ['hac', 'angelina caron', 'hospital angelina caron'] },
  { nome: 'Hospital Universitário Cajuru (PR)', cidade: 'Curitiba', uf: 'PR', apelidos: ['huc', 'cajuru', 'hospital universitario cajuru'], ufs: ['PR'] },
  { nome: 'Instituto Nacional de Traumatologia e Ortopedia (INTO)', cidade: 'Rio de Janeiro', uf: 'RJ', apelidos: ['into', 'instituto nacional de traumatologia e ortopedia'] },
  { nome: 'Hospital Municipal Dr. José de Carvalho Florence (São José dos Campos, SP)', cidade: 'São José dos Campos', uf: 'SP', apelidos: ['hmjcf', 'jose de carvalho florence', 'jose carvalho florence', 'hospital municipal de sao jose dos campos'] },
  { nome: 'Hospital Universitário da Universidade Federal de Juiz de Fora', cidade: 'Juiz de Fora', uf: 'MG', apelidos: ['hufjf', 'hu ufjf', 'hu jf', 'hospital universitario de juiz de fora'] },
  { nome: 'Hospital das Clínicas da Faculdade de Medicina de Ribeirão Preto', cidade: 'Ribeirão Preto', uf: 'SP', apelidos: ['fmrphc', 'fmrp hc', 'hcfmrp', 'hc fmrp', 'hcrp', 'hc ribeirao preto', 'hc de ribeirao preto'] },
  { nome: 'Faculdade de Pinhais (acadêmicos de medicina)', cidade: 'Pinhais', uf: 'PR', apelidos: ['fap', 'fapi', 'faculdade de pinhais'] },
  { nome: 'Hospital Estadual de Traumatologia e Ortopedia Dona Lindu (Paraíba do Sul, RJ)', cidade: 'Paraíba do Sul', uf: 'RJ', apelidos: ['htodi', 'htodl', 'hetodl', 'dona lindu', 'hospital dona lindu'] },
  { nome: 'Hospital Estadual Dr. Jayme Santos Neves (Serra, ES)', cidade: 'Serra', uf: 'ES', apelidos: ['jaime santos neves', 'jayme santos neves', 'hejsn'] },
  // Santa Izabel é o hospital da Santa Casa da Bahia (29/10/2026: os dois viram um só).
  { nome: 'Hospital Santa Izabel (Santa Casa da Bahia)', cidade: 'Salvador', uf: 'BA', apelidos: ['hospital santa isabel ba', 'hospital santa izabel', 'hospital santa isabel', 'santa izabel', 'santa isabel', 'santa casa da bahia', 'santa casa de misericordia da bahia', 'santa casa de salvador'], ufs: ['BA'] },

  // São Paulo
  { nome: 'Instituto de Ortopedia e Traumatologia do HC-FMUSP (IOT)', cidade: 'São Paulo', uf: 'SP', apelidos: ['iot', 'iot hcfmusp', 'iot hc fmusp', 'iot usp', 'hcfmusp', 'hc fmusp', 'hc usp', 'instituto de ortopedia e traumatologia', 'hospital das clinicas da fmusp', 'hospital das clinicas de sao paulo'] },
  { nome: 'Santa Casa de São Paulo', cidade: 'São Paulo', uf: 'SP', apelidos: ['santa casa de sao paulo', 'santa casa sp', 'santa casa de misericordia de sao paulo', 'irmandade da santa casa de misericordia de sao paulo', 'iscmsp', 'fcmscsp', 'scsp'] },
  { nome: 'Escola Paulista de Medicina (Unifesp)', cidade: 'São Paulo', uf: 'SP', apelidos: ['unifesp', 'epm', 'epm unifesp', 'escola paulista de medicina', 'hospital sao paulo unifesp'] },
  { nome: 'Conjunto Hospitalar do Mandaqui', cidade: 'São Paulo', uf: 'SP', apelidos: ['mandaqui', 'conjunto hospitalar do mandaqui', 'complexo hospitalar do mandaqui', 'hospital do mandaqui'] },
  { nome: 'Hospital Santa Marcelina', cidade: 'São Paulo', uf: 'SP', apelidos: ['santa marcelina', 'sta marcelina', 'hospital santa marcelina'], ufs: ['SP'] },
  { nome: 'Hospital do Servidor Público Municipal (HSPM)', cidade: 'São Paulo', uf: 'SP', apelidos: ['hspm', 'hspm sp', 'hospital do servidor publico municipal'] },
  { nome: 'Hospital do Servidor Público Estadual (Iamspe)', cidade: 'São Paulo', uf: 'SP', apelidos: ['hspe', 'iamspe', 'hospital do servidor publico estadual'] },
  { nome: 'Hospital Municipal Dr. Carmino Caricchio (Tatuapé)', cidade: 'São Paulo', uf: 'SP', apelidos: ['carmino caricchio', 'hospital do tatuape', 'hospital municipal do tatuape'] },
  { nome: 'Hospital Municipal do Campo Limpo', cidade: 'São Paulo', uf: 'SP', apelidos: ['campo limpo', 'hospital municipal de campo limpo', 'hospital municipal do campo limpo'], ufs: ['SP'] },
  { nome: 'Universidade Santo Amaro (Unisa)', cidade: 'São Paulo', uf: 'SP', apelidos: ['unisa', 'universidade santo amaro'] },
  { nome: 'PUC-SP (Sorocaba)', cidade: 'Sorocaba', uf: 'SP', apelidos: ['pucsp', 'puc sp', 'puc sorocaba', 'pontificia universidade catolica de sao paulo'] },
  { nome: 'Faculdade de Medicina do ABC', cidade: 'Santo André', uf: 'SP', apelidos: ['fmabc', 'faculdade de medicina do abc', 'centro universitario fmabc'] },
  { nome: 'Hospital IFOR', cidade: 'São Bernardo do Campo', uf: 'SP', apelidos: ['ifor', 'hospital ifor'] },
  { nome: 'Hospital Municipal Dr. Antônio Giglio', cidade: 'Osasco', uf: 'SP', apelidos: ['antonio giglio', 'hospital municipal antonio giglio'] },
  { nome: 'Hospital de Clínicas da Unicamp', cidade: 'Campinas', uf: 'SP', apelidos: ['unicamp', 'hc unicamp', 'hospital de clinicas da unicamp', 'hospital das clinicas da unicamp'] },
  { nome: 'Hospital das Clínicas da Faculdade de Medicina de Botucatu (Unesp)', cidade: 'Botucatu', uf: 'SP', apelidos: ['unesp', 'unesp botucatu', 'hc botucatu', 'hcfmb', 'fmb unesp', 'hc unesp'] },
  { nome: 'Hospital de Base de São José do Rio Preto (Famerp)', cidade: 'São José do Rio Preto', uf: 'SP', apelidos: ['famerp', 'hospital de base de sao jose do rio preto', 'hospital de base de rio preto', 'hb rio preto'] },
  { nome: 'Faculdade de Medicina de Marília (Famema)', cidade: 'Marília', uf: 'SP', apelidos: ['famema', 'faculdade de medicina de marilia'] },
  { nome: 'Hospital Regional de Presidente Prudente', cidade: 'Presidente Prudente', uf: 'SP', apelidos: ['hospital regional de presidente prudente', 'hr presidente prudente', 'hrpp'] },
  { nome: 'Hospital dos Fornecedores de Cana de Piracicaba', cidade: 'Piracicaba', uf: 'SP', apelidos: ['fornecedores de cana', 'hospital fornecedores de cana', 'hospital dos fornecedores de cana'] },
  { nome: 'Santa Casa de Ourinhos', cidade: 'Ourinhos', uf: 'SP', apelidos: ['santa casa de ourinhos', 'santa casa de misericordia de ourinhos'] },
  { nome: 'UniSALESIANO (Araçatuba)', cidade: 'Araçatuba', uf: 'SP', apelidos: ['unisalesiano', 'centro universitario catolico salesiano auxilium'] },

  // Minas Gerais
  { nome: 'Hospital Evangélico de Belo Horizonte', cidade: 'Belo Horizonte', uf: 'MG', apelidos: ['hospital evangelico de belo horizonte', 'hospital evangelico de bh', 'hebh'] },
  { nome: 'Hospital Universitário Ciências Médicas', cidade: 'Belo Horizonte', uf: 'MG', apelidos: ['ciencias medicas', 'hospital universitario ciencias medicas', 'fcmmg', 'faculdade ciencias medicas de minas gerais'], ufs: ['MG'] },
  { nome: 'Hospital das Clínicas da UFMG', cidade: 'Belo Horizonte', uf: 'MG', apelidos: ['hc ufmg', 'hospital das clinicas da ufmg'] },
  { nome: 'Hospital Felício Rocho', cidade: 'Belo Horizonte', uf: 'MG', apelidos: ['felicio rocho', 'hospital felicio rocho'] },
  { nome: 'Hospital João XXIII', cidade: 'Belo Horizonte', uf: 'MG', apelidos: ['joao xxiii', 'hospital joao xxiii', 'hps joao xxiii'] },
  { nome: 'Hospital Márcio Cunha', cidade: 'Ipatinga', uf: 'MG', apelidos: ['marcio cunha', 'hospital marcio cunha'] },
  { nome: 'Hospital de Clínicas da UFU', cidade: 'Uberlândia', uf: 'MG', apelidos: ['hc ufu', 'hcufu', 'hospital das clinicas da ufu', 'hospital de clinicas da ufu', 'hospital de clinicas de uberlandia', 'hospital das clinicas de uberlandia'] },
  { nome: 'Hospital de Clínicas da UFTM', cidade: 'Uberaba', uf: 'MG', apelidos: ['hcuftm', 'hc uftm', 'hospital de clinicas da uftm', 'hospital das clinicas da uftm'] },
  { nome: 'Universidade Federal dos Vales do Jequitinhonha e Mucuri (UFVJM)', cidade: 'Diamantina', uf: 'MG', apelidos: ['ufvjm', 'universidade federal dos vales do jequitinhonha e mucuri'] },
  { nome: 'Santa Casa de Montes Claros', cidade: 'Montes Claros', uf: 'MG', apelidos: ['santa casa montes claros', 'santa casa de montes claros'] },
  { nome: 'Hospital Santa Lúcia (Poços de Caldas)', cidade: 'Poços de Caldas', uf: 'MG', apelidos: ['santa lucia pocos de caldas', 'santa lucia de pocos de caldas', 'hospital santa lucia de pocos de caldas'] },

  // Rio de Janeiro e Espírito Santo
  { nome: 'Hospital Universitário Clementino Fraga Filho (UFRJ)', cidade: 'Rio de Janeiro', uf: 'RJ', apelidos: ['hucff', 'clementino fraga filho', 'hu ufrj'] },
  { nome: 'Hospital Universitário Pedro Ernesto (UERJ)', cidade: 'Rio de Janeiro', uf: 'RJ', apelidos: ['hupe', 'pedro ernesto', 'hospital universitario pedro ernesto'] },
  { nome: 'Hospital Municipal Miguel Couto', cidade: 'Rio de Janeiro', uf: 'RJ', apelidos: ['miguel couto', 'hospital miguel couto', 'hospital municipal miguel couto'] },
  { nome: 'Hospital Municipal Jesus', cidade: 'Rio de Janeiro', uf: 'RJ', apelidos: ['hospital municipal jesus'] },
  { nome: 'Hospital Universitário Antônio Pedro (UFF)', cidade: 'Niterói', uf: 'RJ', apelidos: ['huap', 'antonio pedro', 'hospital universitario antonio pedro'] },

  // Paraná
  { nome: 'Hospital do Trabalhador', cidade: 'Curitiba', uf: 'PR', apelidos: ['hospital do trabalhador'], ufs: ['PR'] },
  { nome: 'Complexo Hospital de Clínicas da UFPR', cidade: 'Curitiba', uf: 'PR', apelidos: ['chc ufpr', 'hc ufpr', 'hospital de clinicas da ufpr', 'hospital de clinicas pr', 'hospital de clinicas do parana', 'hospital de clinicas de curitiba'] },
  { nome: 'Hospital Universitário Evangélico Mackenzie', cidade: 'Curitiba', uf: 'PR', apelidos: ['evangelico mackenzie', 'huem', 'hospital evangelico de curitiba', 'hospital universitario evangelico mackenzie'] },
  { nome: 'Hospital Universitário de Londrina (UEL)', cidade: 'Londrina', uf: 'PR', apelidos: ['hu londrina', 'hu uel', 'hurnp', 'hospital universitario de londrina'] },
  { nome: 'Hospital Universitário Regional dos Campos Gerais (UEPG)', cidade: 'Ponta Grossa', uf: 'PR', apelidos: ['hu uepg', 'huepg', 'hu hepg', 'hospital universitario regional dos campos gerais'] },
  { nome: 'Hospital Universitário do Oeste do Paraná (HUOP)', cidade: 'Cascavel', uf: 'PR', apelidos: ['huop', 'hospital universitario do oeste do parana'] },
  { nome: 'Hospital Municipal Padre Germano Lauck', cidade: 'Foz do Iguaçu', uf: 'PR', apelidos: ['padre germano lauck', 'hospital municipal padre germano lauck'] },

  // Santa Catarina e Rio Grande do Sul
  // O "Regional do Oeste" de Chapecó; com a pessoa no PR, o "oeste" é outro (HUOP).
  { nome: 'Hospital Regional do Oeste (Chapecó)', cidade: 'Chapecó', uf: 'SC', apelidos: ['hro', 'hro chapeco', 'uffs hro', 'uffs hro chapeco', 'hospital regional do oeste'], ufs: ['SC'] },
  { nome: 'Hospital Governador Celso Ramos', cidade: 'Florianópolis', uf: 'SC', apelidos: ['celso ramos', 'hgcr', 'hospital governador celso ramos'] },
  { nome: 'Hospital de Clínicas de Porto Alegre', cidade: 'Porto Alegre', uf: 'RS', apelidos: ['hcpa', 'hospital de clinicas de porto alegre'] },
  { nome: 'Hospital Independência (Porto Alegre)', cidade: 'Porto Alegre', uf: 'RS', apelidos: ['hospital independencia', 'independencia porto alegre'], ufs: ['RS'] },
  { nome: 'Hospital Moinhos de Vento', cidade: 'Porto Alegre', uf: 'RS', apelidos: ['moinhos de vento', 'hospital moinhos de vento'] },
  { nome: 'Hospital Cristo Redentor (GHC)', cidade: 'Porto Alegre', uf: 'RS', apelidos: ['cristo redentor', 'hospital cristo redentor'], ufs: ['RS'] },
  { nome: 'Santa Casa de Porto Alegre', cidade: 'Porto Alegre', uf: 'RS', apelidos: ['santa casa de porto alegre', 'iscmpa', 'santa casa de misericordia de porto alegre'] },
  { nome: 'Hospital São Lucas da PUCRS', cidade: 'Porto Alegre', uf: 'RS', apelidos: ['pucrs', 'puc rs', 'sao lucas da pucrs', 'hospital sao lucas da pucrs'] },
  { nome: 'Hospital Universitário de Santa Maria (HUSM)', cidade: 'Santa Maria', uf: 'RS', apelidos: ['husm', 'hospital universitario de santa maria'] },
  { nome: 'Hospital Universitário da FURG', cidade: 'Rio Grande', uf: 'RS', apelidos: ['furg', 'hu furg', 'uh furg'] },

  // Centro-Oeste
  { nome: 'Hospital de Base do Distrito Federal (HBDF)', cidade: 'Brasília', uf: 'DF', apelidos: ['hbdf', 'hospital de base do distrito federal', 'hospital de base do df', 'hospital de base de brasilia'] },
  { nome: 'Hospital Estadual de Urgências de Goiânia (HUGO)', cidade: 'Goiânia', uf: 'GO', apelidos: ['hugo', 'hospital de urgencias de goiania', 'hospital estadual de urgencias de goiania'], ufs: ['GO'] },
  { nome: 'Hospital das Clínicas da UFG', cidade: 'Goiânia', uf: 'GO', apelidos: ['hc ufg', 'hospital das clinicas da ufg'] },
  { nome: 'Hospital Universitário Maria Aparecida Pedrossian (UFMS)', cidade: 'Campo Grande', uf: 'MS', apelidos: ['humap', 'maria aparecida pedrossian', 'hospital universitario maria aparecida pedrossian'] },

  // Nordeste e Norte
  { nome: 'Hospital Geral do Estado (HGE)', cidade: 'Salvador', uf: 'BA', apelidos: ['hospital geral do estado da bahia', 'hge salvador'] },
  { nome: 'Hospital Geral Roberto Santos', cidade: 'Salvador', uf: 'BA', apelidos: ['roberto santos', 'hospital geral roberto santos'], ufs: ['BA'] },
  { nome: 'Universidade Estadual do Ceará (Uece)', cidade: 'Fortaleza', uf: 'CE', apelidos: ['uece', 'universidade estadual do ceara'] },
  { nome: 'Instituto Dr. José Frota (IJF)', cidade: 'Fortaleza', uf: 'CE', apelidos: ['ijf', 'jose frota', 'instituto doutor jose frota', 'instituto dr jose frota'] },
  { nome: 'Hospital Infantil Albert Sabin', cidade: 'Fortaleza', uf: 'CE', apelidos: ['albert sabin', 'hospital infantil albert sabin'], ufs: ['CE'] },
  { nome: 'Hospital da Restauração', cidade: 'Recife', uf: 'PE', apelidos: ['hospital da restauracao'] },
  { nome: 'Instituto de Medicina Integral Prof. Fernando Figueira (IMIP)', cidade: 'Recife', uf: 'PE', apelidos: ['imip'] },
  { nome: 'Hospital Dom Helder Câmara', cidade: 'Cabo de Santo Agostinho', uf: 'PE', apelidos: ['dom helder camara', 'hospital dom helder camara', 'hdh'] },
  { nome: 'UniFacisa (CESED)', cidade: 'Campina Grande', uf: 'PB', apelidos: ['unifacisa', 'cesed', 'cesed unifacisa'] },
  { nome: 'Hospital Universitário da UFMA (HU-UFMA)', cidade: 'São Luís', uf: 'MA', apelidos: ['huufma', 'hu ufma', 'hospital universitario da ufma'] },
  { nome: 'Universidade Federal do Amapá (Unifap)', cidade: 'Macapá', uf: 'AP', apelidos: ['unifap', 'universidade federal do amapa'] },
]

/** Minúsculas, sem acento e sem pontuação: "H.A.C." e "hac" ficam iguais. */
const limpar = (texto: string) => normalizar(texto).replace(/[^a-z0-9]+/g, ' ').trim()

const INDICE = SERVICOS_CONHECIDOS.map(s => ({ ...s, chaves: [...new Set([limpar(s.nome), ...s.apelidos.map(limpar)])] }))

const ufCombina = (s: ServicoConhecido, uf?: string | null) => !s.ufs || !uf || s.ufs.includes(uf.toUpperCase())

/** Distância de edição (letras trocadas, a mais ou a menos) entre dois textos. */
function distancia(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 4) return 99
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const linha = [i]
    for (let j = 1; j <= b.length; j++) linha[j] = Math.min(anterior[j] + 1, linha[j - 1] + 1, anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    anterior = linha
  }
  return anterior[b.length]
}

/** Só nomes compridos entram na comparação aproximada: siglas curtas parecidas são lugares diferentes. */
const TAMANHO_APROXIMADO = 12

/**
 * Nome completo do serviço conhecido, ou null quando o texto não bate com
 * nenhum. Primeiro o texto exato, a sigla ou o apelido dentro do texto; depois,
 * para nomes compridos, até 1 letra errada a cada 8 ("poços de csldas"), sempre
 * no mesmo estado quando a pessoa informou um.
 */
export function servicoConhecido(servico: string | null | undefined, uf?: string | null): string | null {
  if (!servico) return null
  const texto = limpar(servico)
  if (!texto) return null
  // Também sem os espaços, para "H A C" (de "H.A.C.") e "HC-FMRP".
  const colado = texto.replace(/ /g, '')
  const palavras = ` ${texto} `
  for (const s of INDICE) {
    if (!ufCombina(s, uf)) continue
    if (s.chaves.some(c => c === texto || c.replace(/ /g, '') === colado || palavras.includes(` ${c} `))) return s.nome
  }
  if (texto.length < TAMANHO_APROXIMADO) return null
  let melhor: { nome: string; erro: number } | null = null
  for (const s of INDICE) {
    if (!ufCombina(s, uf) || (uf && s.uf !== uf.toUpperCase() && !s.ufs)) continue
    for (const c of s.chaves) {
      if (c.length < TAMANHO_APROXIMADO) continue
      const erro = distancia(texto, c)
      if (erro <= Math.floor(c.length / 8) && (!melhor || erro < melhor.erro)) melhor = { nome: s.nome, erro }
    }
  }
  return melhor?.nome ?? null
}

/** O serviço da lista pelo nome gravado (o que a pessoa escolheu), ou undefined. */
export const servicoPeloNome = (nome: string) => SERVICOS_CONHECIDOS.find(s => s.nome === nome)

/** "Curitiba, PR", para mostrar ao lado do nome na busca. */
export const localDoServico = (s: ServicoConhecido) => `${s.cidade}, ${s.uf}`

/**
 * Busca do cadastro: os serviços cujo nome, cidade, estado ou apelido contêm o
 * que a pessoa digitou ("manda", "hc", "curitiba"). Os do estado dela vêm
 * primeiro; depois, em ordem alfabética.
 */
export function buscarServicos(termo: string, uf?: string | null): ServicoConhecido[] {
  const busca = limpar(termo)
  const meuUf = uf?.toUpperCase()
  const lista = !busca ? SERVICOS_CONHECIDOS : INDICE.filter(s => {
    const alvo = ` ${limpar(s.nome)} ${limpar(s.cidade)} ${s.uf.toLowerCase()} ${s.chaves.join(' ')} `
    return busca.split(' ').every(p => alvo.includes(` ${p}`))
  })
  return [...lista].sort((a, b) => Number(b.uf === meuUf) - Number(a.uf === meuUf) || a.nome.localeCompare(b.nome, 'pt-BR'))
}

/** Palavras genéricas que não distinguem um lugar de outro ("Ortopedia do Hospital X" = "Hospital X"). */
const GENERICAS = new Set(['hospital', 'hosp', 'ortopedia', 'ortopedia e traumatologia', 'traumatologia', 'servico', 'residencia', 'medica', 'medico', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'clinica', 'clinicas', 'consultorio', 'propria', 'proprio', 'particular', 'privada', 'privado'])

/** Rótulo de quem escreveu só "ortopedia", "hospital", "clínica" ou marcou que atua em vários lugares. */
export const SERVICO_GERAL = 'Vários lugares ou não especificado'

/**
 * Chave para agrupar: o serviço conhecido; "Vários serviços" e textos só com
 * palavras genéricas ("Ortopedia", "Hospital", "Clínica") num grupo só; o resto,
 * pelo texto sem acento e sem as palavras genéricas.
 */
export function chaveServico(servico: string, uf?: string | null): string {
  const conhecido = servicoConhecido(servico, uf)
  if (conhecido) return conhecido
  const palavras = limpar(servico).split(' ').filter((p) => p && !GENERICAS.has(p))
  if (!palavras.length || limpar(servico) === 'varios servicos') return SERVICO_GERAL
  return palavras.join(' ')
}
