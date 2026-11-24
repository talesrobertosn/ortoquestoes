import { FAMILIAS, type Emblema, type FamiliaId } from '../estado/conquistas'

export type CenarioConquista = 'questoes' | 'revisao' | 'biblioteca' | 'flashcards' | 'cronograma' | 'ranking' | 'comunidade' | 'segredo'
export interface PerfilAviso {
  cenario: CenarioConquista
  /** Só contagens que podem avançar no contexto atual permitem prometer "faltam N". */
  acompanhar: boolean
}
const perfil = (cenario: CenarioConquista, acompanhar = false): PerfilAviso => ({ cenario, acompanhar })
/** Nova família exige triagem explícita; novos emblemas da família entram automaticamente. */
export const PERFIS_AVISOS = {
  questoes: perfil('questoes', true), sequencia: perfil('cronograma'), dias: perfil('cronograma'),
  // Recorde e sequências não prometem "faltam N": o melhor passado não é a sequência atual.
  fogueiraRecorde: perfil('cronograma'), labareda: perfil('cronograma'),
  mao: perfil('questoes', true), simuladosMao: perfil('questoes', true), teot: perfil('questoes', true), bancas: perfil('questoes', true),
  // Contagens do servidor: comemoram, mas a meta do dia é confirmada fora da sessão.
  cronogramaDias: perfil('cronograma'), semanaPerfeita: perfil('cronograma'),
  acertos: perfil('questoes', true), dominadas: perfil('revisao', true), temas: perfil('questoes', true),
  sessoes: perfil('questoes'), maratona: perfil('questoes'), precisao: perfil('questoes'),
  redencao: perfil('revisao', true), gabarito: perfil('questoes'), mestre: perfil('questoes'),
  especialista: perfil('questoes', true), aproveitamento: perfil('questoes'), resistencia: perfil('questoes'),
  colecao: perfil('questoes', true), anotacoes: perfil('questoes', true), pseudartrose: perfil('revisao', true),
  imagem: perfil('questoes', true), certeza: perfil('questoes'), provas: perfil('questoes'),
  assuntos: perfil('questoes'), horaDeOuro: perfil('questoes'), calibrado: perfil('questoes'),
  contraCorrente: perfil('questoes'), completo: perfil('questoes'), notaDeCorte: perfil('questoes'),
  curva: perfil('questoes'), runSemDano: perfil('cronograma'), chefes: perfil('questoes'),
  pontual: perfil('cronograma'), filaZerada: perfil('revisao'), cronograma: perfil('cronograma'),
  nacional: perfil('ranking'), arena: perfil('ranking'), indicacao: perfil('comunidade'),
  revisor: perfil('comunidade'), editorial: perfil('comunidade', true),
  revisoes: perfil('revisao', true), constancia: perfil('revisao'), resgate: perfil('revisao', true),
  fcProfundezas: perfil('flashcards'), fcMestreRevisao: perfil('flashcards'),
  fcEspecialista: perfil('flashcards', true), fcBestiario: perfil('flashcards', true),
  fcSemErrar: perfil('flashcards'), fcLendarios: perfil('flashcards', true), fcDragoes: perfil('flashcards'),
  bibMarcas: perfil('biblioteca', true), bibNotas: perfil('biblioteca', true), bibAbertos: perfil('biblioteca', true),
  bibConcluidos: perfil('biblioteca', true), bibTempo: perfil('biblioteca'), bibDias: perfil('biblioteca'),
  secretas: perfil('segredo'),
} satisfies Record<FamiliaId, PerfilAviso>

export const CENARIOS_AVISOS: Record<CenarioConquista, { titulo: string; chamada: string; arte: string }> = {
  questoes: { titulo: 'Questões', chamada: 'Seu próximo marco', arte: 'bau' },
  revisao: { titulo: 'Revisão', chamada: 'Sua revisão está rendendo', arte: 'pergaminho' },
  biblioteca: { titulo: 'Biblioteca', chamada: 'Mais uma página da sua história', arte: 'livro' },
  flashcards: { titulo: 'Flashcards', chamada: 'Sua próxima conquista', arte: 'cartas' },
  cronograma: { titulo: 'Constância', chamada: 'Um dia de cada vez', arte: 'mapa' },
  ranking: { titulo: 'Ranking', chamada: 'Seu próximo estandarte', arte: 'estandarte' },
  comunidade: { titulo: 'Comunidade', chamada: 'Seu cuidado faz diferença', arte: 'carta' },
  segredo: { titulo: 'Conquista secreta', chamada: 'Uma descoberta', arte: 'relicario' },
}

export function perfilDoEmblema(e: Emblema): PerfilAviso {
  // Secretas de outras famílias (ex.: dragões) nunca são antecipadas.
  return e.secreta ? { cenario: PERFIS_AVISOS[e.familia].cenario, acompanhar: false } : PERFIS_AVISOS[e.familia]
}
export function unidadeRestante(e: Emblema, n: number): string {
  const numero = n.toLocaleString('pt-BR')
  const unidades: Partial<Record<FamiliaId, [string, string]>> = {
    questoes: ['questão diferente', 'questões diferentes'], acertos: ['acerto', 'acertos'],
    dominadas: ['questão dominada', 'questões dominadas'], temas: ['tema', 'temas'],
    redencao: ['erro corrigido', 'erros corrigidos'], revisoes: ['revisão', 'revisões'],
    resgate: ['revisão atrasada resgatada', 'revisões atrasadas resgatadas'],
    pseudartrose: ['erro antigo dominado', 'erros antigos dominados'], imagem: ['acerto com imagem', 'acertos com imagem'],
    especialista: ['questão dessa prova', 'questões dessa prova'],
    mao: ['questão de mão', 'questões de mão'], simuladosMao: ['acerto nos simulados da mão', 'acertos nos simulados da mão'],
    teot: ['acerto no TEOT', 'acertos no TEOT'], bancas: ['questão das provas regionais', 'questões das provas regionais'],
    colecao: ['favorita', 'favoritas'], anotacoes: ['anotação', 'anotações'],
    editorial: ['comentário avaliado', 'comentários avaliados'],
    bibMarcas: ['marcação', 'marcações'], bibNotas: ['nota na margem', 'notas na margem'],
    bibAbertos: ['resumo aberto', 'resumos abertos'], bibConcluidos: ['resumo concluído', 'resumos concluídos'],
    fcEspecialista: ['flashcard dominado na área', 'flashcards dominados na área'],
    fcBestiario: ['adversário diferente', 'adversários diferentes'],
    fcLendarios: ['flashcard lendário diferente', 'flashcards lendários diferentes'],
  }
  const u = unidades[e.familia]
  return u ? `${numero} ${u[n === 1 ? 0 : 1]}` : FAMILIAS.find(f => f.id === e.familia)!.unidade(n)
}
