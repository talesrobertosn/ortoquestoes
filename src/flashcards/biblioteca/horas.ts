/**
 * As horas da Biblioteca (15/10/2026, pedido do Tales: "que o fundo vá mudando conforme
 * vai acertando"). Cada sessão começa no amanhecer e a luz anda com os acertos até a
 * noite estrelada. As pinturas saem de scripts/cenarios/biblioteca_horas.py; o "dia" é
 * a pintura original da Biblioteca.
 */
export interface HoraBiblioteca { id: string; nome: string; pintura: string; frase: string }

export const HORAS_BIBLIOTECA: readonly HoraBiblioteca[] = [
  { id: 'amanhecer', nome: 'Amanhecer', pintura: 'biblioteca-amanhecer', frase: 'A sala acorda com você.' },
  { id: 'dia', nome: 'Dia claro', pintura: 'biblioteca', frase: 'O sol entra pelo janelão.' },
  { id: 'tarde', nome: 'Tarde dourada', pintura: 'biblioteca-tarde', frase: 'A luz fica cor de mel.' },
  { id: 'entardecer', nome: 'Pôr do sol', pintura: 'biblioteca-entardecer', frase: 'As velas se acendem.' },
  { id: 'noite', nome: 'Noite estrelada', pintura: 'biblioteca-noite', frase: 'Só os que sabem chegam aqui.' },
]

/** Acertos para avançar uma hora: cerca de um quinto da sessão (de 2 a 6). */
export function passoDaHora(tamanhoSessao: number) {
  return Math.max(2, Math.min(6, Math.round(tamanhoSessao / 5)))
}

/** Em que hora a sessão está e quantos acertos faltam para a próxima. */
export function horaDaSessao(acertos: number, tamanhoSessao: number) {
  const passo = passoDaHora(tamanhoSessao)
  const indice = Math.min(HORAS_BIBLIOTECA.length - 1, Math.floor(Math.max(0, acertos) / passo))
  const ultima = indice === HORAS_BIBLIOTECA.length - 1
  return { indice, hora: HORAS_BIBLIOTECA[indice], faltam: ultima ? 0 : (indice + 1) * passo - acertos, passo }
}

/** Conta como acerto: a alternativa certa; sem alternativa, "Sabia" ou "Hesitei". */
export const ehAcerto = (objetiva: boolean | null, avaliacao: 'errei' | 'hesitei' | 'sabia') =>
  objetiva === null ? avaliacao !== 'errei' : objetiva
