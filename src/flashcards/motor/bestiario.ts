/**
 * Adversários da Batalha e o escalonamento por andar.
 *
 * Regra geral (docs/flashcards/BATALHA.md): é mais fácil morrer do que matar.
 * Você causa 10, 20 ou 30 por acerto (fácil, moderada, difícil); o adversário
 * multiplica o dano-base do erro (2, 5 e 10) pela própria força.
 *
 * A masmorra é feita de atos de 3 andares: dois confrontos (comum ou elite) e
 * um chefe. Cada adversário tem nível (comum, elite, chefe) e faixa de andar:
 * chefes avançados nunca aparecem no começo. A cada ato, vida e força crescem
 * devagar e com teto; o dano de um golpe também tem teto em relação à vida
 * máxima do herói (ver LIMITES), para não haver morte injusta de vida cheia.
 */

export type Cenario = 'campo' | 'masmorra' | 'salao' | 'covil' | 'torre'
  | 'forja' | 'coliseu' | 'jardim' | 'laboratorio' | 'caverna' | 'templo' | 'passarela' | 'catacumba' | 'treino' | 'arquivo'
export type Nivel = 'comum' | 'elite' | 'chefe'
/** Masmorra (Cripta): sem fim, em atos de 3. Torre do Título: 100 andares, com patamares. */
export type Modo = 'masmorra' | 'torre'
export type SpriteInimigo = 'golem' | 'serpente' | 'guardiao' | 'dragao' | 'raptor' | 'gosma' | 'mimico'
  | 'corvo' | 'morcego' | 'aranha' | 'escaravelho' | 'goblin' | 'esqueleto' | 'cavaleiro' | 'espectro' | 'quimera' | 'mao' | 'leviata' | 'rei' | 'arconte' | 'ent' | 'harpia'

export interface FaseChefe {
  /** Entra quando a vida do chefe cai a esta fração da vida máxima. */
  abaixoDe: number
  nome: string
  forca: number
  armadura: number
  /** Barreira renovada ao entrar na fase (0 = nenhuma). */
  barreira?: number
}

export interface Inimigo {
  id: string
  nome: string
  sprite: SpriteInimigo
  /** Troca de paleta do sprite (personagens.ts). */
  variante?: string
  cenario: Cenario
  nivel: Nivel
  /** Primeiro andar em que pode aparecer. */
  andarMin: number
  vida: number
  /** Multiplica o dano-base do erro. */
  forca: number
  /** Desconta de cada acerto (mínimo de 5 de dano). */
  armadura: number
  /** Rodadas contra ele antes da Fúria (dano ×1,5). */
  paciencia: number
  /** Dano extra por erro consecutivo (veneno, pressão). */
  porErroSeguido: number
  /** Chance de golpe crítico (sorteada ANTES da pergunta e mostrada na intenção). */
  critico: number
  /** Escudo de energia que absorve o dano dos seus acertos antes da vida. */
  barreira?: number
  /** Recupera vida a cada rodada, até o total indicado no confronto. */
  regenera?: { porRodada: number; total: number }
  chefe?: boolean
  fase2?: FaseChefe
  /** O golpe vem em várias mordidas: passa pela Barreira reativa (o escudo ainda bloqueia). */
  rajada?: number
  /** A cada N rodadas, um golpe carregado (o aviso aparece na intenção): dano × mult, teto do crítico. */
  carrega?: { aCada: number; mult: number; nome: string }
  /** No erro, rouba 1 carga de um poder seu. */
  rouba?: boolean
  /** Uma vez, abaixo desta fração da vida, se divide e ganha barreira (fração da vida máxima). */
  divide?: { abaixoDe: number; barreira: number }
  /**
   * Superpoder do veneno: o golpe que acerta deixa o herói Envenenado. Envenenado,
   * cada flashcard respondido tira este tanto de vida (nunca abaixo de 1), até
   * você acertar VENENO.acertos flashcards seguidos (um erro recomeça a conta).
   */
  envenena?: number
  /**
   * Superpoder do fogo: o golpe carregado (o Sopro) deixa o herói em chamas por
   * QUEIMADURA.flashcards flashcards, perdendo este tanto de vida em cada um
   * (nunca abaixo de 1). Acertar um flashcard difícil apaga o fogo na hora.
   */
  queima?: number
  /** Grude (gosmas): o golpe que acerta gruda; o próximo erro dói GRUDE.mult vezes, até você acertar. */
  gruda?: boolean
  /** Tremor (golens): o crítico que acerta faz cair 1 carga de um poder equipado. */
  tremor?: boolean
  /** Moedas a mais quando cai (o Mímico guarda o tesouro). */
  ouroExtra?: number
  /** Só aparece num andar exato de um modo (o dragão do topo da Torre). */
  exclusivo?: { modo: Modo; andar: number }
  /** Área da ortopedia que inspira o adversário (só sabor; não muda as perguntas). */
  especialidade: string
  lema: string
  habilidade: string
}

export const BESTIARIO: Inimigo[] = [
  // ---------- Comuns
  {
    id: 'golem-de-gesso', nome: 'Golem de Gesso', sprite: 'golem', cenario: 'campo', nivel: 'comum', andarMin: 1,
    vida: 80, forca: 3, armadura: 0, paciencia: 10, porErroSeguido: 0, critico: 0.06, tremor: true, especialidade: 'trauma',
    lema: 'Lento, duro e cheio de gesso.', habilidade: 'Bate pouco, mas aguenta muito. Tremor: o crítico derruba 1 carga de um poder equipado.',
  },
  {
    id: 'serpente-do-ciatico', nome: 'Serpente do Ciático', sprite: 'serpente', cenario: 'masmorra', nivel: 'comum', andarMin: 2,
    vida: 100, forca: 3.5, armadura: 0, paciencia: 10, porErroSeguido: 3, critico: 0.08, envenena: 2, especialidade: 'coluna',
    lema: 'Ela espera o primeiro erro.', habilidade: 'Picada venenosa: envenena (−2 por flashcard até 5 acertos seguidos) e cada erro seguido causa +3.',
  },
  {
    id: 'elemental-do-calcio', nome: 'Elemental do Cálcio', sprite: 'golem', variante: 'cristal', cenario: 'masmorra', nivel: 'comum', andarMin: 4,
    vida: 95, forca: 3.2, armadura: 4, paciencia: 11, porErroSeguido: 0, critico: 0.06, tremor: true, especialidade: 'osteometabolicas',
    lema: 'Mineral puro, sem pressa.', habilidade: 'Armadura 4: cada acerto perde 4 de dano. Tremor: o crítico derruba 1 carga de um poder equipado.',
  },
  {
    id: 'vibora-do-mediano', nome: 'Víbora do Mediano', sprite: 'serpente', variante: 'eletrica', cenario: 'masmorra', nivel: 'comum', andarMin: 4,
    vida: 105, forca: 3.4, armadura: 0, paciencia: 9, porErroSeguido: 2, critico: 0.14, envenena: 2, especialidade: 'mao',
    lema: 'O choque vem antes da dor.', habilidade: 'Críticos frequentes (avisados na intenção) e picada que envenena (−2 por flashcard até 5 acertos seguidos).',
  },
  {
    id: 'golem-de-cimento', nome: 'Golem de Cimento Ósseo', sprite: 'golem', variante: 'cimento', cenario: 'campo', nivel: 'comum', andarMin: 7,
    vida: 130, forca: 3.6, armadura: 2, paciencia: 12, porErroSeguido: 0, critico: 0.06, regenera: { porRodada: 4, total: 32 }, tremor: true, especialidade: 'quadril',
    lema: 'Endurece enquanto você hesita.', habilidade: 'Regenera 4 por rodada (até 32 no confronto). Tremor: o crítico derruba 1 carga de um poder equipado.',
  },
  {
    id: 'gosma-de-cimento', nome: 'Gosma de Cimento', sprite: 'gosma', cenario: 'jardim', nivel: 'comum', andarMin: 3,
    vida: 90, forca: 3.1, armadura: 0, paciencia: 10, porErroSeguido: 0, critico: 0.05, divide: { abaixoDe: 0.5, barreira: 0.25 }, gruda: true, especialidade: 'quadril',
    lema: 'Ainda não endureceu. Ainda.', habilidade: 'Com metade da vida, se divide e ganha uma barreira de 25% da vida. Grude: depois de acertar você, o próximo erro dói 50% a mais (um acerto desgruda).',
  },
  {
    id: 'raptor-do-menisco', nome: 'Raptor do Menisco', sprite: 'raptor', cenario: 'campo', nivel: 'comum', andarMin: 4,
    vida: 95, forca: 3.3, armadura: 0, paciencia: 9, porErroSeguido: 0, critico: 0.12, rajada: 2, especialidade: 'joelho',
    lema: 'Rasga em dois tempos.', habilidade: 'Ataca em duas mordidas: passa pela Barreira reativa.',
  },
  {
    id: 'gosma-acida', nome: 'Gosma do Metilmetacrilato', sprite: 'gosma', variante: 'acida', cenario: 'covil', nivel: 'comum', andarMin: 8,
    vida: 120, forca: 3.4, armadura: 0, paciencia: 10, porErroSeguido: 3, critico: 0.06, divide: { abaixoDe: 0.5, barreira: 0.3 }, gruda: true, especialidade: 'quadril',
    lema: 'O vapor arde antes da cola pegar.', habilidade: 'Veneno +3 por erro seguido e divisão com barreira de 30%. Grude: depois de acertar você, o próximo erro dói 50% a mais (um acerto desgruda).',
  },
  {
    id: 'raptor-sombrio', nome: 'Raptor da Plica', sprite: 'raptor', variante: 'sombrio', cenario: 'covil', nivel: 'comum', andarMin: 10,
    vida: 125, forca: 3.5, armadura: 1, paciencia: 9, porErroSeguido: 1, critico: 0.16, rajada: 2, especialidade: 'joelho',
    lema: 'Se esconde na dobra e salta no erro.', habilidade: 'Duas mordidas, críticos frequentes e pressão +1.',
  },
  {
    id: 'corvo-de-kocher', nome: 'Corvo de Kocher', sprite: 'corvo', cenario: 'passarela', nivel: 'comum', andarMin: 2,
    vida: 70, forca: 3.2, armadura: 0, paciencia: 8, porErroSeguido: 0, critico: 0.18, rajada: 2, especialidade: 'trauma',
    lema: 'O bico prende e não solta.', habilidade: 'Críticos frequentes e Mordidas: o bico pinça duas vezes.',
  },
  {
    id: 'esqueleto-do-metacarpo', nome: 'Esqueleto do Metacarpo', sprite: 'esqueleto', cenario: 'catacumba', nivel: 'comum', andarMin: 3,
    vida: 85, forca: 3.2, armadura: 3, paciencia: 10, porErroSeguido: 0, critico: 0.08, especialidade: 'mao',
    lema: 'Cinco ossos, uma espada.', habilidade: 'Armadura 3 e escudo de madeira.',
  },
  {
    id: 'sentinela-da-fibula', nome: 'Sentinela da Fíbula', sprite: 'cavaleiro', variante: 'fibula', cenario: 'treino', nivel: 'comum', andarMin: 4,
    vida: 100, forca: 3.4, armadura: 2, paciencia: 9, porErroSeguido: 0, critico: 0.12, carrega: { aCada: 4, mult: 1.6, nome: 'Estocada da lança' }, especialidade: 'joelho',
    lema: 'Fina, longa e sempre de guarda.', habilidade: 'A cada 4 rodadas, a Estocada (golpe carregado, avisado na intenção).',
  },
  {
    id: 'escaravelho-da-cartilagem', nome: 'Escaravelho da Cartilagem', sprite: 'escaravelho', cenario: 'jardim', nivel: 'comum', andarMin: 4,
    vida: 90, forca: 3.0, armadura: 5, paciencia: 11, porErroSeguido: 0, critico: 0.06, regenera: { porRodada: 3, total: 24 }, especialidade: 'joelho',
    lema: 'Lisa por fora, dura por dentro.', habilidade: 'Armadura 5 e regenera 3 por rodada.',
  },
  {
    id: 'aranha-dos-ligamentos', nome: 'Aranha dos Ligamentos', sprite: 'aranha', cenario: 'caverna', nivel: 'comum', andarMin: 5,
    vida: 95, forca: 3.3, armadura: 0, paciencia: 9, porErroSeguido: 3, critico: 0.1, rouba: true, envenena: 2, especialidade: 'joelho',
    lema: 'Tece a teia entre os seus erros.', habilidade: 'Picada que envenena, veneno +3 por erro seguido e rouba 1 carga de poder.',
  },
  {
    id: 'cavaleiro-da-tala', nome: 'Cavaleiro da Tala', sprite: 'cavaleiro', cenario: 'forja', nivel: 'comum', andarMin: 6,
    vida: 120, forca: 3.5, armadura: 4, paciencia: 11, porErroSeguido: 0, critico: 0.08, barreira: 15, especialidade: 'trauma',
    lema: 'Imobiliza primeiro, pergunta depois.', habilidade: 'Barreira 15 e Armadura 4.',
  },
  {
    id: 'morcego-do-tunel', nome: 'Morcego do Túnel do Carpo', sprite: 'morcego', cenario: 'caverna', nivel: 'comum', andarMin: 6,
    vida: 80, forca: 3.4, armadura: 0, paciencia: 8, porErroSeguido: 2, critico: 0.16, rajada: 3, especialidade: 'mao',
    lema: 'Comprime e foge pelo túnel.', habilidade: 'Três Mordidas por golpe e Veneno +2.',
  },
  {
    id: 'slime-sinovial', nome: 'Slime Sinovial', sprite: 'gosma', variante: 'sinovial', cenario: 'laboratorio', nivel: 'comum', andarMin: 7,
    vida: 110, forca: 3.2, armadura: 0, paciencia: 11, porErroSeguido: 0, critico: 0.06, regenera: { porRodada: 5, total: 40 }, divide: { abaixoDe: 0.4, barreira: 0.2 }, gruda: true, especialidade: 'joelho',
    lema: 'Lubrifica, escorrega e volta.', habilidade: 'Regenera 5 por rodada e se divide com barreira. Grude: depois de acertar você, o próximo erro dói 50% a mais (um acerto desgruda).',
  },
  {
    id: 'goblin-da-fratura', nome: 'Goblin da Fratura', sprite: 'goblin', cenario: 'forja', nivel: 'comum', andarMin: 3,
    vida: 75, forca: 3.6, armadura: 1, paciencia: 7, porErroSeguido: 0, critico: 0.14, ouroExtra: 15, especialidade: 'trauma',
    lema: 'Quebra primeiro, foge com as moedas.', habilidade: 'Fúria cedo e +15 moedas ao cair.',
  },
  // ---------- Elites
  {
    id: 'mimico-do-arsenal', nome: 'Mímico do Arsenal', sprite: 'mimico', cenario: 'masmorra', nivel: 'elite', andarMin: 5,
    vida: 140, forca: 3.6, armadura: 3, paciencia: 11, porErroSeguido: 0, critico: 0.1, rouba: true, ouroExtra: 45, especialidade: 'trauma',
    lema: 'A caixa de instrumentais sorriu.', habilidade: 'No erro, rouba 1 carga de um poder seu. Guarda +45 moedas.',
  },
  {
    id: 'raptor-alfa', nome: 'Raptor Alfa do Cruzado', sprite: 'raptor', variante: 'alfa', cenario: 'campo', nivel: 'elite', andarMin: 8,
    vida: 165, forca: 3.9, armadura: 2, paciencia: 10, porErroSeguido: 0, critico: 0.14, rajada: 3, especialidade: 'joelho',
    lema: 'O bando obedece ao pivô.', habilidade: 'Três mordidas por golpe e armadura 2.',
  },
  {
    id: 'cavaleiro-da-osteossintese', nome: 'Cavaleiro da Osteossíntese', sprite: 'guardiao', variante: 'prata', cenario: 'salao', nivel: 'elite', andarMin: 5,
    vida: 150, forca: 3.8, armadura: 6, paciencia: 12, porErroSeguido: 1, critico: 0.1, especialidade: 'trauma',
    lema: 'Placas, parafusos e paciência.', habilidade: 'Armadura 6. Use Ruptura ou acertos difíceis.',
  },
  {
    id: 'colosso-da-tibia', nome: 'Colosso da Tíbia', sprite: 'golem', variante: 'rubro', cenario: 'campo', nivel: 'elite', andarMin: 5,
    vida: 175, forca: 4.2, armadura: 1, paciencia: 11, porErroSeguido: 0, critico: 0.1, tremor: true, especialidade: 'joelho',
    lema: 'A investida que racha o chão.', habilidade: 'Muita vida e golpes pesados. Tremor: o crítico derruba 1 carga de um poder equipado.',
  },
  {
    id: 'mao-dos-tendoes', nome: 'Mão dos Tendões', sprite: 'mao', cenario: 'laboratorio', nivel: 'elite', andarMin: 6,
    vida: 160, forca: 3.8, armadura: 4, paciencia: 11, porErroSeguido: 0, critico: 0.12, rajada: 4, especialidade: 'mao',
    lema: 'Cada dedo, um cabo esticado.', habilidade: 'Quatro dedos, quatro Mordidas; Armadura 4.',
  },
  {
    id: 'espectro-do-mediano', nome: 'Espectro do Nervo Mediano', sprite: 'espectro', variante: 'nervo', cenario: 'catacumba', nivel: 'elite', andarMin: 7,
    vida: 140, forca: 4.0, armadura: 0, paciencia: 10, porErroSeguido: 2, critico: 0.2, barreira: 30, especialidade: 'mao',
    lema: 'Formiga, queima e some.', habilidade: 'Barreira 30, críticos de choque frequentes e Veneno +2.',
  },
  {
    id: 'quimera-da-pseudoartrose', nome: 'Quimera da Pseudoartrose', sprite: 'quimera', cenario: 'caverna', nivel: 'elite', andarMin: 8,
    vida: 180, forca: 4.0, armadura: 2, paciencia: 12, porErroSeguido: 1, critico: 0.12, regenera: { porRodada: 4, total: 40 }, divide: { abaixoDe: 0.5, barreira: 0.2 }, especialidade: 'trauma',
    lema: 'Três cabeças, nenhuma consolida.', habilidade: 'Regenera e, com metade da vida, ganha barreira.',
  },
  {
    id: 'arquiteto-da-consolidacao', nome: 'Arquiteto da Consolidação', sprite: 'espectro', variante: 'arquiteto', cenario: 'arquivo', nivel: 'elite', andarMin: 9,
    vida: 150, forca: 3.7, armadura: 3, paciencia: 12, porErroSeguido: 0, critico: 0.1, barreira: 25, carrega: { aCada: 3, mult: 1.7, nome: 'Planta do calo' }, especialidade: 'osteometabolicas',
    lema: 'Mede três vezes, consolida uma.', habilidade: 'Barreira 25 e a Planta do calo a cada 3 rodadas.',
  },
  {
    id: 'harpia-do-manguito', nome: 'Harpia do Manguito', sprite: 'harpia', cenario: 'passarela', nivel: 'elite', andarMin: 7,
    vida: 150, forca: 3.9, armadura: 0, paciencia: 9, porErroSeguido: 0, critico: 0.18, rajada: 2, rouba: true, especialidade: 'ombro',
    lema: 'Rasga o ombro e leva o que achar.', habilidade: 'Duas garras por golpe e rouba carga.',
  },
  {
    id: 'guardiao-da-artrodese', nome: 'Guardião da Artrodese', sprite: 'cavaleiro', variante: 'artrodese', cenario: 'coliseu', nivel: 'elite', andarMin: 10,
    vida: 200, forca: 3.6, armadura: 8, paciencia: 14, porErroSeguido: 0, critico: 0.08, barreira: 20, especialidade: 'tornozelo',
    lema: 'Nada se move enquanto ele guarda.', habilidade: 'Armadura 8 e barreira 20: use Ruptura e raios.',
  },
  // ---------- Chefes
  {
    id: 'guardiao-do-acetabulo', nome: 'Guardião do Acetábulo', sprite: 'guardiao', cenario: 'salao', nivel: 'chefe', andarMin: 3,
    vida: 190, forca: 4, armadura: 5, paciencia: 14, porErroSeguido: 2, critico: 0.12, chefe: true, especialidade: 'trauma',
    fase2: { abaixoDe: 0.5, nome: 'Teto rachado', forca: 5, armadura: 0 },
    lema: 'Ninguém passa do teto sem conhecer as colunas.', habilidade: 'Armadura 5. Com metade da vida, perde a armadura e bate mais forte.',
  },
  {
    id: 'senhor-do-anel-pelvico', nome: 'Senhor do Anel Pélvico', sprite: 'guardiao', variante: 'real', cenario: 'salao', nivel: 'chefe', andarMin: 6,
    vida: 230, forca: 4.2, armadura: 3, paciencia: 14, porErroSeguido: 2, critico: 0.14, chefe: true, barreira: 30, especialidade: 'trauma',
    fase2: { abaixoDe: 0.5, nome: 'Anel quebrado', forca: 5.2, armadura: 0, barreira: 25 },
    lema: 'O anel se fecha sobre quem erra.', habilidade: 'Barreira de 30 que absorve seus acertos; renova (25) na segunda fase.',
  },
  {
    id: 'dragao-de-ossos', nome: 'Dragão de Ossos', sprite: 'dragao', cenario: 'covil', nivel: 'chefe', andarMin: 12,
    vida: 300, forca: 4.4, armadura: 4, paciencia: 15, porErroSeguido: 2, critico: 0.12, chefe: true, queima: 3, carrega: { aCada: 3, mult: 1.8, nome: 'Sopro de fogo-fátuo' }, especialidade: 'osteometabolicas',
    fase2: { abaixoDe: 0.5, nome: 'Asas em chamas', forca: 5.2, armadura: 1, barreira: 30 },
    lema: 'Dorme sobre o tesouro de quem não estudou.', habilidade: 'A cada 3 rodadas, o Sopro (dano ×1,8, avisado na intenção). Na segunda fase, ganha barreira. O Sopro deixa você em chamas por 3 flashcards (um acerto difícil apaga).',
  },
  {
    id: 'rainha-gosma', nome: 'Rainha do Cimento', sprite: 'gosma', variante: 'rainha', cenario: 'salao', nivel: 'chefe', andarMin: 21,
    vida: 290, forca: 4.3, armadura: 2, paciencia: 15, porErroSeguido: 2, critico: 0.12, chefe: true, divide: { abaixoDe: 0.6, barreira: 0.25 }, regenera: { porRodada: 4, total: 36 }, gruda: true, especialidade: 'quadril',
    fase2: { abaixoDe: 0.3, nome: 'Presa total', forca: 5.4, armadura: 4 },
    lema: 'Tudo que toca, fixa.', habilidade: 'Regenera, se divide com barreira e endurece no fim. Grude: depois de acertar você, o próximo erro dói 50% a mais (um acerto desgruda).',
  },
  {
    id: 'dragao-rubro', nome: 'Dragão Rubro da Artrose', sprite: 'dragao', variante: 'escarlate', cenario: 'covil', nivel: 'chefe', andarMin: 39,
    vida: 320, forca: 4.6, armadura: 5, paciencia: 15, porErroSeguido: 2, critico: 0.14, chefe: true, queima: 3, carrega: { aCada: 3, mult: 1.9, nome: 'Sopro de brasas' }, rajada: 2, especialidade: 'joelho',
    fase2: { abaixoDe: 0.45, nome: 'Fúria do desgaste', forca: 5.5, armadura: 2 },
    lema: 'Range a cada passo, queima a cada erro.', habilidade: 'Sopro a cada 3 rodadas e golpes em duas mordidas. O Sopro deixa você em chamas por 3 flashcards (um acerto difícil apaga).',
  },
  {
    id: 'basilisco-do-radio', nome: 'Basilisco da Cabeça do Rádio', sprite: 'quimera', variante: 'basilisco', cenario: 'templo', nivel: 'chefe', andarMin: 15,
    vida: 300, forca: 4.4, armadura: 3, paciencia: 14, porErroSeguido: 2, critico: 0.16, chefe: true, carrega: { aCada: 3, mult: 1.8, nome: 'Olhar petrificante' }, especialidade: 'cotovelo',
    fase2: { abaixoDe: 0.45, nome: 'Crista em chamas', forca: 5.3, armadura: 1 },
    lema: 'Gira o olhar e tudo endurece.', habilidade: 'O Olhar petrificante a cada 3 rodadas; furioso na segunda fase.',
  },
  {
    id: 'imperador-do-carpo', nome: 'Imperador do Carpo', sprite: 'rei', cenario: 'salao', nivel: 'chefe', andarMin: 18,
    vida: 320, forca: 4.4, armadura: 5, paciencia: 15, porErroSeguido: 2, critico: 0.12, chefe: true, barreira: 40, especialidade: 'mao',
    fase2: { abaixoDe: 0.5, nome: 'Oito coroas', forca: 5.4, armadura: 2, barreira: 40 },
    lema: 'Oito súditos em duas fileiras.', habilidade: 'Barreira 40 que volta na segunda fase.',
  },
  {
    id: 'leviata-dos-tendoes', nome: 'Leviatã dos Tendões', sprite: 'leviata', cenario: 'templo', nivel: 'chefe', andarMin: 24,
    vida: 340, forca: 4.5, armadura: 2, paciencia: 15, porErroSeguido: 3, critico: 0.14, chefe: true, rajada: 3, regenera: { porRodada: 5, total: 50 }, envenena: 3, especialidade: 'mao',
    fase2: { abaixoDe: 0.4, nome: 'Maré alta', forca: 5.5, armadura: 0 },
    lema: 'Desliza na bainha e puxa para o fundo.', habilidade: 'Três Mordidas, regenera e envenena (−3 por flashcard até 5 acertos seguidos).',
  },
  {
    id: 'necromante-da-pseudoartrose', nome: 'Necromante da Pseudoartrose', sprite: 'espectro', variante: 'necromante', cenario: 'catacumba', nivel: 'chefe', andarMin: 27,
    vida: 310, forca: 4.6, armadura: 1, paciencia: 15, porErroSeguido: 2, critico: 0.16, chefe: true, regenera: { porRodada: 7, total: 70 }, divide: { abaixoDe: 0.6, barreira: 0.2 }, especialidade: 'trauma',
    fase2: { abaixoDe: 0.3, nome: 'Não consolida', forca: 5.6, armadura: 0, barreira: 40 },
    lema: 'O que não fecha, ele levanta.', habilidade: 'Regenera muito, ganha barreira duas vezes.',
  },
  {
    id: 'quimera-do-escafoide', nome: 'Quimera do Escafoide', sprite: 'quimera', variante: 'escafoide', cenario: 'caverna', nivel: 'chefe', andarMin: 30,
    vida: 350, forca: 4.6, armadura: 4, paciencia: 15, porErroSeguido: 2, critico: 0.14, chefe: true, rajada: 2, carrega: { aCada: 4, mult: 1.8, nome: 'Investida alada' }, especialidade: 'mao',
    fase2: { abaixoDe: 0.5, nome: 'Necrose do polo', forca: 5.6, armadura: 1 },
    lema: 'Voa baixo e some no raio-x.', habilidade: 'Duas Mordidas e a Investida alada a cada 4 rodadas.',
  },
  {
    id: 'arconte-da-biomecanica', nome: 'Arconte da Biomecânica', sprite: 'arconte', cenario: 'laboratorio', nivel: 'chefe', andarMin: 33,
    vida: 360, forca: 4.7, armadura: 6, paciencia: 16, porErroSeguido: 1, critico: 0.12, chefe: true, barreira: 50, carrega: { aCada: 3, mult: 1.9, nome: 'Pistão de carga' }, especialidade: 'joelho',
    fase2: { abaixoDe: 0.4, nome: 'Sobrecarga', forca: 5.8, armadura: 2 },
    lema: 'Força, braço de alavanca e nenhuma piedade.', habilidade: 'Barreira 50, Armadura 6 e o Pistão a cada 3 rodadas.',
  },
  {
    id: 'guardiao-da-fise', nome: 'Guardião da Fise', sprite: 'ent', cenario: 'jardim', nivel: 'chefe', andarMin: 36,
    vida: 380, forca: 4.5, armadura: 3, paciencia: 16, porErroSeguido: 2, critico: 0.12, chefe: true, regenera: { porRodada: 8, total: 90 }, especialidade: 'pediatria',
    fase2: { abaixoDe: 0.5, nome: 'Estirão', forca: 5.6, armadura: 4, barreira: 40 },
    lema: 'Cresce enquanto você hesita.', habilidade: 'Regenera 8 por rodada; no Estirão endurece e ganha barreira.',
  },
  {
    id: 'rei-da-consolidacao', nome: 'Rei da Consolidação', sprite: 'rei', variante: 'consolidacao', cenario: 'coliseu', nivel: 'chefe', andarMin: 42,
    vida: 400, forca: 4.8, armadura: 6, paciencia: 16, porErroSeguido: 2, critico: 0.15, chefe: true, barreira: 40, regenera: { porRodada: 6, total: 60 }, especialidade: 'trauma',
    fase2: { abaixoDe: 0.5, nome: 'Calo duro', forca: 5.9, armadura: 8 },
    lema: 'Tudo o que ele toca fica firme.', habilidade: 'Barreira, regeneração e, no fim, Armadura 8.',
  },
  {
    id: 'dragao-ancestral', nome: 'Dragão Ancestral do Título', sprite: 'dragao', variante: 'ancestral', cenario: 'torre', nivel: 'chefe', andarMin: 1,
    vida: 380, forca: 4.6, armadura: 6, paciencia: 16, porErroSeguido: 2, critico: 0.15, chefe: true, queima: 4, carrega: { aCada: 3, mult: 2, nome: 'Sopro do título' }, especialidade: 'trauma',
    exclusivo: { modo: 'torre', andar: 100 },
    fase2: { abaixoDe: 0.5, nome: 'Última prova', forca: 5.6, armadura: 2, barreira: 60 },
    lema: 'O guardião do topo. Ninguém passa sem saber tudo.', habilidade: 'Sopro a cada 3 rodadas; com metade da vida, uma barreira de 60. O Sopro deixa você em chamas por 3 flashcards (um acerto difícil apaga).',
  },
  {
    id: 'tita-da-coluna', nome: 'Titã da Coluna', sprite: 'golem', variante: 'obsidiana', cenario: 'masmorra', nivel: 'chefe', andarMin: 9,
    vida: 270, forca: 4.4, armadura: 4, paciencia: 15, porErroSeguido: 2, critico: 0.12, chefe: true, regenera: { porRodada: 5, total: 45 }, tremor: true, especialidade: 'coluna',
    fase2: { abaixoDe: 0.4, nome: 'Vértebras em brasa', forca: 5.4, armadura: 2 },
    lema: 'Cada vértebra, uma muralha.', habilidade: 'Regenera 5 por rodada (até 45) e endurece na segunda fase. Tremor: o crítico derruba 1 carga de um poder equipado.',
  },
]

/** Parâmetros do escalonamento (ajustados pela simulação de fixtures/testar_flashcards.mjs). */
export const ESCALA = {
  /** Crescimento por ato (3 andares). */
  vidaPorAto: 0.3,
  forcaPorAto: 0.24,
  /** Tetos dos multiplicadores (crescimento linear até aqui, nunca exponencial). */
  vidaMax: 6,
  forcaMax: 5,
  /** A paciência (rodadas até a Fúria) encurta 1 por ato, até este mínimo. */
  pacienciaMin: 6,
  /** O crítico fica um pouco mais frequente por ato, até este teto. */
  criticoPorAto: 0.01,
  criticoMax: 0.25,
  /** Elite no segundo andar do ato, a partir deste andar, com esta chance. */
  eliteDesde: 5,
  chanceElite: 0.5,
}

/**
 * Teto do dano de UM golpe, em fração da vida máxima do herói. Um herói com
 * pouca vida ainda morre no próximo erro; o que se evita é o escalonamento
 * injusto (morrer de vida cheia num golpe só).
 */
export const LIMITES = { comum: 0.22, elite: 0.28, chefe: 0.35, critico: 0.45, multCritico: 1.6 }

function hash(a: number, b: number) {
  let h = (a ^ Math.imul(b + 0x9e3779b9, 0x85ebca6b)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Torre do Título: 100 andares; elite a cada 5, chefe a cada 10, patamar (ponto de retorno) a cada 5. */
export const TORRE = {
  andares: 100,
  patamarACada: 5,
  /** Crescimento por andar (linear, com o mesmo teto da masmorra). */
  vidaPorAndar: 0.06,
  forcaPorAndar: 0.04,
  pacienciaACada: 10,
  criticoPorAndar: 0.0016,
  /** Chefes da Torre, na ordem dos andares 10, 20, 30... (o 100 é o Dragão Ancestral). */
  chefes: ['guardiao-do-acetabulo', 'basilisco-do-radio', 'tita-da-coluna', 'leviata-dos-tendoes', 'dragao-de-ossos', 'necromante-da-pseudoartrose', 'arconte-da-biomecanica', 'rei-da-consolidacao', 'quimera-do-escafoide'],
}

/** Andar equivalente da masmorra (para escolher quem aparece na Torre). */
const equivalente = (andar: number, modo: Modo) => (modo === 'torre' ? 1 + Math.floor((andar - 1) * 0.3) : andar)

const naoExclusivo = (i: Inimigo) => !i.exclusivo

/**
 * Adversário do andar. Determinístico pela semente da partida: a mesma semente
 * repete a mesma masmorra.
 */
export function inimigoDoAndar(andar: number, semente = 0, modo: Modo = 'masmorra'): { inimigo: Inimigo; ciclo: number } {
  if (modo === 'torre') return inimigoDaTorre(andar, semente)
  const ato = Math.floor((andar - 1) / 3), pos = (andar - 1) % 3
  let base: Inimigo
  if (pos === 2) {
    const chefes = BESTIARIO.filter((i) => i.nivel === 'chefe' && i.andarMin <= andar && naoExclusivo(i))
    // o chefe do ato segue a ordem de estreia; depois do último, alterna entre todos
    const novo = chefes.find((c) => Math.floor((c.andarMin - 1) / 3) === ato)
    base = novo ?? chefes[Math.floor(hash(semente, andar) * chefes.length)]
  } else {
    const elite = andar >= ESCALA.eliteDesde && pos === 1 && hash(semente, andar * 7 + 1) < ESCALA.chanceElite
    const pool = BESTIARIO.filter((i) => i.nivel === (elite ? 'elite' : 'comum') && i.andarMin <= andar && naoExclusivo(i))
    // o primeiro andar é sempre o Golem (apresentação do jogo)
    if (andar === 1) base = BESTIARIO[0]
    else if (andar === 2) base = BESTIARIO[1]
    else {
      const preferidos = pool.filter((i) => i.andarMin > andar - 6) // os novos da faixa aparecem mais
      const lista = preferidos.length && hash(semente, andar * 13) < 0.6 ? preferidos : pool
      base = lista[Math.floor(hash(semente, andar * 31 + 5) * lista.length)]
    }
  }
  if (ato === 0) return { inimigo: base, ciclo: 0 }
  const kv = Math.min(ESCALA.vidaMax, 1 + ESCALA.vidaPorAto * ato)
  const kf = Math.min(ESCALA.forcaMax, 1 + ESCALA.forcaPorAto * ato)
  return {
    ciclo: ato,
    inimigo: {
      ...base,
      vida: Math.round(base.vida * kv),
      forca: +(base.forca * kf).toFixed(2),
      paciencia: Math.max(ESCALA.pacienciaMin, base.paciencia - ato),
      critico: Math.min(ESCALA.criticoMax, base.critico + ESCALA.criticoPorAto * ato),
      barreira: base.barreira && Math.round(base.barreira * kv),
      regenera: base.regenera && { porRodada: base.regenera.porRodada, total: Math.round(base.regenera.total * kv) },
      fase2: base.fase2 && { ...base.fase2, forca: +(base.fase2.forca * kf).toFixed(2), barreira: base.fase2.barreira && Math.round(base.fase2.barreira * kv) },
    },
  }
}

function inimigoDaTorre(andar: number, semente: number): { inimigo: Inimigo; ciclo: number } {
  const eq = equivalente(andar, 'torre')
  let base: Inimigo
  if (andar >= TORRE.andares) base = BESTIARIO.find((i) => i.exclusivo?.modo === 'torre' && i.exclusivo.andar === TORRE.andares)!
  else if (andar % 10 === 0) base = BESTIARIO.find((i) => i.id === TORRE.chefes[(andar / 10 - 1) % TORRE.chefes.length])!
  else {
    const elite = andar % 5 === 0
    const pool = BESTIARIO.filter((i) => i.nivel === (elite ? 'elite' : 'comum') && i.andarMin <= Math.max(eq, elite ? 5 : 1) && naoExclusivo(i))
    if (andar === 1) base = BESTIARIO[0]
    else {
      const preferidos = pool.filter((i) => i.andarMin > eq - 6)
      const lista = preferidos.length && hash(semente, andar * 13) < 0.55 ? preferidos : pool
      base = lista[Math.floor(hash(semente, andar * 31 + 5) * lista.length)]
    }
  }
  const k = andar - 1
  const kv = Math.min(ESCALA.vidaMax, 1 + TORRE.vidaPorAndar * k)
  const kf = Math.min(ESCALA.forcaMax, 1 + TORRE.forcaPorAndar * k)
  const ciclo = Math.floor(k / 10)
  // o cenário da Torre muda a cada 10 andares, sempre com o salão no andar do chefe
  const cenario: Cenario = andar % 10 === 0 ? (andar >= TORRE.andares ? 'torre' : base.cenario) : (['campo', 'masmorra', 'torre', 'covil', 'torre'] as const)[ciclo % 5]
  return {
    ciclo,
    inimigo: {
      ...base,
      cenario,
      vida: Math.round(base.vida * kv),
      forca: +(base.forca * kf).toFixed(2),
      paciencia: Math.max(ESCALA.pacienciaMin, base.paciencia - Math.floor(k / TORRE.pacienciaACada)),
      critico: Math.min(ESCALA.criticoMax, base.critico + TORRE.criticoPorAndar * k),
      barreira: base.barreira && Math.round(base.barreira * kv),
      regenera: base.regenera && { porRodada: Math.round(base.regenera.porRodada * Math.sqrt(kv)), total: Math.round(base.regenera.total * kv) },
      fase2: base.fase2 && { ...base.fase2, forca: +(base.fase2.forca * kf).toFixed(2), barreira: base.fase2.barreira && Math.round(base.fase2.barreira * kv) },
    },
  }
}

/** Estágios do herói: a cada chefe vencido ele evolui (só nesta partida). */
export const ESTAGIOS = [
  { nome: 'Aprendiz do Torneio', vida: 0, ataque: 0, defesa: 0 },
  { nome: 'Escudeiro Clínico', vida: 10, ataque: 2, defesa: 1 },
  { nome: 'Guardião dos Fundamentos', vida: 20, ataque: 3, defesa: 2 },
  { nome: 'Cavaleiro da Reconstrução', vida: 30, ataque: 5, defesa: 2 },
  { nome: 'Mestre da Ortopedia', vida: 40, ataque: 6, defesa: 3 },
  { nome: 'Lenda da Masmorra', vida: 52, ataque: 8, defesa: 4 },
] as const
