/** Regras puras: relógio, histórico e sorteio entram por argumento. Nunca gravam progresso. */
import { chaveDoDia, diaDaSemana, diasEntre, FUSO_DIA } from '../util/dia'

export const INTERVALO_EVENTOS = 6 * 60_000
export const ESPERA_INICIAL = 90_000
export const MARCOS = [1_000, 5_000, 10_000] as const
export const CODIGO = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
export type IconeEvento = 'cafe' | 'bilhete' | 'mascote' | 'estrela' | 'relogio' | 'livro' | 'martelo' | 'selo' | 'biscoito' | 'bolo' | 'gato' | 'presente'
export interface Evento {
  id: string; titulo: string; texto: string; icone: IconeEvento
  efeito?: 'confete' | 'estrela' | 'formiga'; arquivo?: boolean
}
export interface Contexto {
  agora: number; iniciou: number; ultimo: number; rota: string; ligado: boolean; visivel: boolean
  modal: boolean; sessao?: { simulado?: boolean; limiteSegundos?: number | null; nacional?: string; concluidaEm?: number | null } | null
  nascimento?: string; criadaEm?: string; dataTeot: string
  vistos: Record<string, number>; reduzido: boolean
}
export function permitido(c: Contexto): boolean {
  if (!c.ligado || !c.visivel || c.modal) return false
  if (/^\/(simulado-nacional|admin|conta|entrar|assinatura|termos|condicoes-assinatura|contato)(\/|$)/.test(c.rota)) return false
  if (c.sessao && !c.sessao.concluidaEm && (c.sessao.simulado || c.sessao.nacional || (c.sessao.limiteSegundos ?? 0) > 0)) return false
  // Combate já tem sua própria apresentação. A Biblioteca recebe apenas o gato, por interação.
  if (c.rota.startsWith('/flashcards/') && c.rota !== '/flashcards/biblioteca') return false
  return true // Uma questão comum aberta NÃO bloqueia os eventos (decisão de Tales em 16/10).
}
export const horaBR = (agora: number) => Number(new Intl.DateTimeFormat('en-US', { timeZone: FUSO_DIA, hour: '2-digit', hourCycle: 'h23' }).format(agora))
function aniversario(data: string | undefined, hoje: string): boolean {
  return !!data && /^\d{4}-\d{2}-\d{2}$/.test(data) && data < hoje && data.slice(5) === hoje.slice(5)
}
const evento = (id: string, titulo: string, texto: string, icone: IconeEvento, efeito?: Evento['efeito']): Evento => ({ id, titulo, texto, icone, efeito })
export function candidatos(c: Contexto): Evento[] {
  const hoje = chaveDoDia(c.agora), hora = horaBR(c.agora), semana = diaDaSemana(c.agora)
  const lista: Evento[] = []
  if (aniversario(c.nascimento, hoje)) lista.push(evento('aniversario', 'Hoje o café é por nossa conta', 'Feliz aniversário! Que seu dia tenha boas companhias e um tempo só seu.', 'bolo', 'confete'))
  const criacao = c.criadaEm && Number.isFinite(Date.parse(c.criadaEm)) ? chaveDoDia(Date.parse(c.criadaEm)) : undefined
  if (aniversario(criacao, hoje) && Number(hoje.slice(0, 4)) > Number(criacao!.slice(0, 4))) lista.push(evento('aniversario-conta', 'Mais um ano por aqui', 'Bom ter sua companhia nessa rotina de estudo. Feliz aniversário de conta!', 'presente'))
  if (hoje.slice(5) === '09-19') lista.push(evento('ortopedista', 'Dia do Ortopedista', 'Um abraço a quem cuida, ensina e segue aprendendo. Bom ter você por aqui.', 'presente'))
  if (/^\d{4}-\d{2}-\d{2}$/.test(c.dataTeot) && diasEntre(hoje, c.dataTeot) === 1) lista.push(evento('vespera', 'Amanhã é dia de prova', 'Hoje cabe uma revisão leve. Separe seus documentos e reserve tempo para descansar. Estamos na torcida.', 'bilhete'))
  if (hoje.slice(5) === '12-31' || hoje.slice(5) === '01-01') lista.push(evento('ano-novo', 'Um bom começo', 'Que o próximo capítulo tenha espaço para aprender e para viver fora dos livros.', 'estrela'))
  if (hora < 5) {
    const frases = ['Companhia de plantão. Se o cansaço apertar, o estudo pode esperar um pouco.', 'Um café imaginário e um lembrete de colega: descanso também faz parte.', 'A casa está quieta por aqui. Vá no seu ritmo e cuide de você.']
    lista.push(evento('madrugada', 'Plantão da madrugada', frases[Math.floor(c.agora / INTERVALO_EVENTOS) % frases.length], 'relogio'))
    lista.push(evento('r1', 'R1 sem dormir?', 'Se o plantão foi puxado, uma pausa pode ser a melhor revisão de agora.', 'cafe'))
  }
  if (semana === 5 && hora >= 18) lista.push(evento('sexta', 'Sextou por aqui também', 'Só passando para deixar um café. Depois da revisão, que caiba um respiro.', 'cafe'))
  if (semana === 0 || semana === 6) lista.push(evento('fim-semana', `${semana === 6 ? 'Sábado' : 'Domingo'}, ${hora}h, e você aqui`, 'Uma visita rápida para fazer companhia. Bom estudo, no seu ritmo.', 'mascote'))
  const saudacao = hora < 12 ? ['Bom dia por aqui', 'Café passado e uma página de cada vez.'] : hora < 18 ? ['Uma pausa na tarde', 'Solte os ombros, beba uma água e siga quando quiser.'] : ['Boa noite por aqui', 'Uma revisão tranquila também rende. Sem pressa.']
  lista.push(evento('hora', saudacao[0], saudacao[1], 'relogio'))
  lista.push(evento('cafe', 'Café de plantão', 'Deixamos uma xícara por aqui. O café é imaginário; a companhia, de colega.', 'cafe'))
  lista.push(evento('bilhete', 'Um bilhete na prancheta', 'Entender uma dúvida com calma vale mais que correr para a próxima página.', 'bilhete'))
  lista.push(evento('mascote', 'Visita rápida', 'O mensageiro passou para desejar um bom estudo. Já está de saída.', 'mascote'))
  lista.push(evento('estrela', 'Olha uma estrela', 'Passou rápido. Fica aqui um desejo de bons encontros pelo caminho.', 'estrela', 'estrela'))
  lista.push(evento('confete', 'Uma pequena festa, sem motivo', 'Às vezes cabe comemorar só por estar aqui. Bom ter sua companhia.', 'presente', 'confete'))
  const biscoitos = ['O assunto que hoje parece confuso pode fazer sentido na próxima revisão.', 'Faça caber uma pausa entre um capítulo e outro.', 'Aprender também é dar tempo para a ideia assentar.', 'Uma boa pergunta acompanha a gente depois de fechar o livro.']
  lista.push(evento('biscoito', 'Biscoito da sorte', biscoitos[Math.floor(c.agora / INTERVALO_EVENTOS) % biscoitos.length], 'biscoito'))
  // Datas têm prioridade; madrugada pode repetir após 18 min. Demais visitas, no máximo uma por dia.
  return lista.filter(e => !c.vistos[`${hoje}:${e.id}`] || (e.id === 'madrugada' && c.agora - c.vistos[`${hoje}:${e.id}`] >= 18 * 60_000))
}
export function escolher(c: Contexto, sorteio: number): Evento | null {
  if (!permitido(c) || c.rota === '/flashcards/biblioteca' || c.agora - c.iniciou < ESPERA_INICIAL || c.agora - c.ultimo < INTERVALO_EVENTOS) return null
  if (!Number.isFinite(sorteio) || sorteio < 0 || sorteio >= .18) return null
  const opcoes = candidatos(c)
  const especial = opcoes.find(e => ['aniversario', 'aniversario-conta', 'ortopedista', 'vespera', 'ano-novo'].includes(e.id))
  return especial ?? opcoes[Math.min(opcoes.length - 1, Math.floor(sorteio / .18 * opcoes.length))] ?? null
}
export function semMovimento(e: Evento, reduzido: boolean): Evento {
  return reduzido ? { ...e, efeito: undefined } : e
}
export function marcosCruzados(antes: number, depois: number, vistos: number[]): number[] {
  return MARCOS.filter(m => antes < m && depois >= m && !vistos.includes(m))
}
export function avancaCodigo(posicao: number, tecla: string): number {
  const normalizada = tecla.length === 1 ? tecla.toLowerCase() : tecla
  return CODIGO[posicao] === normalizada ? posicao + 1 : normalizada === CODIGO[0] ? 1 : 0
}
/** Recorde de respostas da pessoa num dia, sem extrapolar o histórico limitado de revisões. */
export function recordeDoDia(registros: Record<string, { q: number; historico?: { em: number }[] }>, agora: number) {
  const dias = new Map<string, number>(), hoje = chaveDoDia(agora)
  for (const r of Object.values(registros)) for (const instante of new Set((r.historico?.length ? r.historico.map(t => t.em) : [r.q]))) {
    if (!Number.isFinite(instante)) continue
    const dia = chaveDoDia(instante)
    dias.set(dia, (dias.get(dia) ?? 0) + 1)
  }
  return { hoje: dias.get(hoje) ?? 0, anterior: Math.max(0, ...[...dias].filter(([dia]) => dia < hoje).map(([, n]) => n)) }
}
