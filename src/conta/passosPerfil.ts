/**
 * Arquivo leve (sem a lista de provas com textos): o App consulta estes passos em toda
 * página para saber se monta o crachá do perfil. perfilEstudo.ts o reexporta.
 */
/** Os valores de prova que existem (os mesmos de PROVAS em perfilEstudo.ts; o teste confere). */
export const VALORES_PROVA = ['taro', 'teot', 'mao', 'titulo_mao', 'coluna', 'sbq', 'r4', 'atualizacao']
/** O que gravamos quando a pessoa atende em vários lugares, sem um serviço principal. */
export const SERVICO_VARIOS = 'Vários serviços'

const temProva = (valor: unknown) => {
  const lista = Array.isArray(valor) ? valor : typeof valor === 'string' && valor ? valor.split(',') : []
  return lista.some((p) => VALORES_PROVA.includes(String(p)))
}

/**
 * O crachá do perfil (21/10/2026, pedido do Tales: o cadastro continua só com e-mail e
 * senha, e ao entrar aparece no topo uma caixa bonita que pede, aos poucos, o que falta).
 * Uma pergunta por vez, na ordem em que ela mais ajuda: a etapa (com o ano de quem é
 * residente), as provas, onde faz residência ou estuda, o nome e o estado.
 * O ortopedista não responde onde trabalha: ele atua em vários serviços, e isso é
 * gravado sozinho. O nome é opcional: quem pula não é perguntado de novo.
 */
export type PassoPerfil = 'etapa' | 'provas' | 'servico' | 'nome' | 'local'
export const PASSOS_OPCIONAIS: PassoPerfil[] = ['nome']

const texto = (v: unknown) => (typeof v === 'string' ? v : '').trim()

/** Os passos que valem para esta pessoa, cada um com o que já está feito. */
export function passosPerfil(meta: Record<string, unknown> | undefined | null): Array<{ passo: PassoPerfil; feito: boolean; opcional: boolean }> {
  const m = meta ?? {}
  const situacao = texto(m.situacao)
  const pulados = Array.isArray(m.perfil_pulados) ? m.perfil_pulados.map(String) : []
  const lista: Array<{ passo: PassoPerfil; feito: boolean }> = [
    { passo: 'etapa', feito: !!situacao && (situacao !== 'residente' || !!m.ano_residencia) },
    { passo: 'provas', feito: temProva(m.provas_interesse) },
  ]
  if (situacao !== 'ortopedista') lista.push({ passo: 'servico', feito: texto(m.servico ?? m.residencia).length >= 2 })
  lista.push({ passo: 'nome', feito: texto(m.nome).length >= 2 || pulados.includes('nome') })
  lista.push({ passo: 'local', feito: !!texto(m.uf) })
  return lista.map((p) => ({ ...p, opcional: PASSOS_OPCIONAIS.includes(p.passo) }))
}

/** O próximo passo a perguntar, ou null quando o crachá está completo. */
export function proximoPasso(meta: Record<string, unknown> | undefined | null): PassoPerfil | null {
  return passosPerfil(meta).find((p) => !p.feito)?.passo ?? null
}

/** Uma vez por entrada: de novo quando a pessoa faz login outra vez ou passadas 20 horas. */
export const LEMBRAR_PERFIL_MS = 20 * 60 * 60 * 1000
export function deveMostrarCracha(visto: { login?: string | null; em?: number } | null, login: string | null | undefined, agora = Date.now()): boolean {
  if (!visto || !visto.em) return true
  if ((login ?? '') !== (visto.login ?? '')) return true
  return agora - visto.em >= LEMBRAR_PERFIL_MS
}
