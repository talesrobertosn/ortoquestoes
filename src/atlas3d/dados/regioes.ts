import { Box3, Vector3 } from 'three'

/**
 * Regiões ortopédicas como caixas em mm (Z para cima, esquerda = +X, anterior = −Y),
 * medidas nas caixas reais dos ossos do modelo. Membros têm uma caixa por lado; a
 * região mostra tudo o que cruza a caixa (nervos e vasos longos inclusive).
 */
export type IdRegiao = 'ombro' | 'braco' | 'cotovelo' | 'antebraco' | 'punho-mao' | 'coluna' | 'pelve-quadril' | 'coxa' | 'joelho' | 'perna' | 'tornozelo-pe'
export type Lateralidade = 'ambos' | 'd' | 'e'

export interface Regiao {
  id: IdRegiao
  nome: string
  /** frase curta do cartão */
  resumo: string
  /** caixa do lado esquerdo do paciente (+X); o direito é o espelho. Sem membro = linha média. */
  caixa: [number, number, number, number, number, number]
  membro: boolean
  /** articulação (vira "Exploração por articulação") */
  articulacao?: boolean
  /** subtemas do acervo ligados à região (contagem de questões e "treinar a região") */
  subtemas: string[]
  /** vista de partida ao entrar */
  vista?: 'anterior' | 'posterior' | 'direita' | 'esquerda'
}

export const REGIOES: Regiao[] = [
  { id: 'ombro', nome: 'Ombro', resumo: 'Úmero proximal, escápula, clavícula e manguito', caixa: [30, -150, 1180, 300, 160, 1500], membro: true, articulacao: true, subtemas: ['Anatomia do ombro'] },
  { id: 'cotovelo', nome: 'Cotovelo', resumo: 'Úmero distal, cabeça do rádio e olécrano', caixa: [150, -90, 1030, 320, 120, 1180], membro: true, articulacao: true, subtemas: ['Anatomia do cotovelo'] },
  { id: 'punho-mao', nome: 'Punho e mão', resumo: 'Rádio distal, carpo, metacarpos e falanges', caixa: [200, -120, 680, 360, 70, 930], membro: true, articulacao: true, subtemas: ['Anatomia da mão e punho'] },
  { id: 'coluna', nome: 'Coluna', resumo: 'Cervical, torácica, lombar e sacro', caixa: [-70, -40, 820, 70, 120, 1570], membro: false, subtemas: ['Anatomia da coluna'], vista: 'direita' },
  { id: 'pelve-quadril', nome: 'Pelve e quadril', resumo: 'Acetábulo, fêmur proximal e anel pélvico', caixa: [-210, -110, 740, 210, 140, 1040], membro: false, articulacao: true, subtemas: ['Anatomia do quadril'] },
  { id: 'joelho', nome: 'Joelho', resumo: 'Fêmur distal, platô tibial, patela e ligamentos', caixa: [20, -90, 350, 170, 110, 540], membro: true, articulacao: true, subtemas: ['Anatomia do joelho'] },
  { id: 'tornozelo-pe', nome: 'Tornozelo e pé', resumo: 'Pilão, maléolos, tálus, calcâneo e antepé', caixa: [20, -160, -10, 200, 120, 170], membro: true, articulacao: true, subtemas: ['Anatomia do pé e tornozelo'] },
  { id: 'braco', nome: 'Braço', resumo: 'Diáfise do úmero e nervo radial', caixa: [140, -80, 1080, 280, 120, 1300], membro: true, subtemas: [] },
  { id: 'antebraco', nome: 'Antebraço', resumo: 'Diáfises do rádio e da ulna', caixa: [180, -100, 850, 330, 120, 1110], membro: true, subtemas: [] },
  { id: 'coxa', nome: 'Coxa', resumo: 'Diáfise do fêmur', caixa: [20, -110, 450, 200, 140, 900], membro: true, subtemas: [] },
  { id: 'perna', nome: 'Perna', resumo: 'Diáfises da tíbia e da fíbula', caixa: [20, -100, 60, 180, 120, 460], membro: true, subtemas: [] },
]

export function regiaoPorId(id: string | null | undefined) { return REGIOES.find((r) => r.id === id) }

/** Caixas da região conforme o lado escolhido (direito do paciente = −X). */
export function caixasDaRegiao(r: Regiao, lado: Lateralidade): Box3[] {
  const [x0, y0, z0, x1, y1, z1] = r.caixa
  const esquerda = new Box3(new Vector3(x0, y0, z0), new Vector3(x1, y1, z1))
  if (!r.membro) return [esquerda]
  const direita = new Box3(new Vector3(-x1, y0, z0), new Vector3(-x0, y1, z1))
  return lado === 'e' ? [esquerda] : lado === 'd' ? [direita] : [direita, esquerda]
}
