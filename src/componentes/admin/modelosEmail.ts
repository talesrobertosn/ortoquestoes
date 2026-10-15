/**
 * Cartas do painel (15/10/2026). O texto não mora mais aqui: vem do motor de
 * cartas (supabase/functions/_shared/cartas.ts), o mesmo que a Edge Function usa
 * para montar o e-mail. Assim a prévia do painel é exatamente o que chega.
 *
 * Aqui ficam só as pontes do painel: montar o perfil da pessoa quando a parte 27
 * ainda não foi colada (com o que a ficha já tem), os rótulos do histórico e os
 * modelos que o administrador salva neste navegador.
 */
import { LIMITES_HABILITADOS } from '../../config'
import {
  TIPOS, perfilDosDados, primeiroNome, type DadosCartaBanco, type EnvioHistorico, type PerfilCarta,
} from '../../../supabase/functions/_shared/cartas.ts'
import type { LinhaUsuario } from './AdminUsuarios'

export * from '../../../supabase/functions/_shared/cartas.ts'

/** "Sem limite" só é benefício real com o limite diário do gratuito ligado. */
export const LIMITE_LIGADO = LIMITES_HABILITADOS

/** Perfil a partir do banco (parte 27), com o limite do gratuito do site. */
export const perfilDoBanco = (d: DadosCartaBanco): PerfilCarta => perfilDosDados(d, LIMITE_LIGADO)

/**
 * Perfil com o que a ficha já carregou, para quando a parte 27 ainda não foi colada:
 * números da lista de usuários, temas calculados no navegador e horário da atividade.
 */
export function perfilDaFicha(u: LinhaUsuario, extra: {
  areas?: Array<{ slug: string; total: number; certas: number }>
  horas?: Array<{ hora: number; n: number }>
  provas?: string[]
  situacao?: string | null
  ano?: string | null
  flashcards?: number | null
  viuPlanos?: number | null
} = {}): PerfilCarta {
  const tentativas = (u.acertos_tentativas ?? 0) + (u.erros_tentativas ?? 0)
  const dia = 86_400_000
  return {
    nome: u.nome,
    respondidas: u.respondidas,
    acertos: tentativas > 0 ? u.acertos_tentativas ?? 0 : u.acertos,
    erros: tentativas > 0 ? u.erros_tentativas ?? 0 : u.erros,
    semana: u.respondidas_7d,
    diasParado: u.ultima_atividade ? Math.floor((Date.now() - new Date(u.ultima_atividade).getTime()) / dia) : null,
    diasConta: Math.floor((Date.now() - new Date(u.criado_em).getTime()) / dia),
    assinante: !!u.plano_vigente,
    situacao: extra.situacao ?? u.situacao ?? null,
    ano: extra.ano ?? u.ano_residencia ?? null,
    provas: extra.provas ?? (u.provas ?? '').split(',').filter(Boolean),
    areas: extra.areas ?? [],
    horas: extra.horas ?? [],
    flashcards: extra.flashcards ?? null,
    viuPlanos: extra.viuPlanos ?? null,
    limiteGratisLigado: LIMITE_LIGADO,
  }
}

/** Como cada e-mail do histórico aparece no painel. */
export function rotuloEnvio(e: EnvioHistorico): string {
  const modelo = e.modelo ?? ''
  const base = modelo.split(':')[0] as keyof typeof TIPOS
  if (e.tipo === 'carta' && TIPOS[base]) return modelo.startsWith('ativo:') ? `Carta: estudando (${modelo.slice(6)}%)` : `Carta: ${TIPOS[base].rotulo.toLowerCase()}`
  if (e.tipo === 'marco') return e.marco ? `Parabéns pelo emblema de ${e.marco.toLocaleString('pt-BR')} questões` : 'Parabéns pelo emblema'
  if (e.tipo === 'lembrete') return TIPOS[base] ? `Lembrete: ${TIPOS[base].rotulo.toLowerCase()}` : 'Lembrete de estudo'
  if (e.tipo === 'relatorio') return 'Resumo de estudo'
  if (e.tipo === 'relato_resolvido') return 'Aviso de relato resolvido'
  if (e.tipo === 'parabens') return 'Carta enviada por você'
  return e.tipo ?? 'E-mail'
}
export const ROTULO_ORIGEM: Record<string, string> = { manual: 'enviado por você', lote: 'em lote', automatico: 'automático' }

/** Resumo do histórico: quantos nos últimos 7 e 30 dias e o último envio que saiu. */
export function resumoHistorico(lista: readonly EnvioHistorico[], agora = Date.now()) {
  const saiu = lista.filter((e) => (e.status ?? 'enviado') !== 'falhou')
  const dentro = (dias: number) => saiu.filter((e) => agora - new Date(e.em).getTime() <= dias * 86_400_000).length
  const ultimo = [...saiu].sort((a, b) => new Date(b.em).getTime() - new Date(a.em).getTime())[0] ?? null
  return { n7: dentro(7), n30: dentro(30), ultimo, falhas: lista.filter((e) => e.status === 'falhou').length }
}
/** Aviso de excesso: 2 ou mais na semana já pede atenção; 3 ou mais, cuidado. */
export function nivelExcesso(n7: number): 'ok' | 'atencao' | 'muito' {
  return n7 >= 3 ? 'muito' : n7 >= 2 ? 'atencao' : 'ok'
}

// ---------------------------------------------------------------------------
// Modelos salvos pelo administrador (neste navegador)
// ---------------------------------------------------------------------------

/** Modelos salvos pelo administrador neste navegador. Podem usar {nome}, {questoes}, {dias} e {prova}. */
const CHAVE = 'ortoquestoes:admin-modelos-email'
export interface ModeloSalvo { id: string; titulo: string; texto: string; assunto?: string }

export function lerModelosSalvos(): ModeloSalvo[] {
  try { return JSON.parse(localStorage.getItem(CHAVE) ?? '[]') as ModeloSalvo[] } catch { return [] }
}
export function gravarModelosSalvos(lista: ModeloSalvo[]) {
  try { localStorage.setItem(CHAVE, JSON.stringify(lista)) } catch { /* sem armazenamento */ }
}

const PROVA = new Date('2027-01-10T12:00:00-03:00')
/**
 * Preenche os marcadores de um modelo salvo, sempre com texto que faz sentido
 * (nunca "0 questões"). Marcador desconhecido fica como está, e o servidor
 * recusa o envio de texto com marcador sobrando.
 */
export function preencher(texto: string, p: PerfilCarta): string {
  const n = (v: number) => v.toLocaleString('pt-BR')
  const nome = primeiroNome(p.nome)
  return texto
    .replace(/ ?\{nome\}/g, nome ? ` ${nome}` : '').replace(/^ /gm, '').replace(/ ,/g, ',').replace(/,,/g, ',')
    .replace(/\{questoes\}/g, p.respondidas > 0 ? `${n(p.respondidas)} ${p.respondidas === 1 ? 'questão' : 'questões'}` : 'as suas primeiras questões')
    .replace(/\{dias\}/g, p.diasParado ? `${n(p.diasParado)} ${p.diasParado === 1 ? 'dia' : 'dias'}` : 'alguns dias')
    .replace(/\{prova\}/g, String(Math.max(0, Math.ceil((PROVA.getTime() - Date.now()) / 86_400_000))))
}
