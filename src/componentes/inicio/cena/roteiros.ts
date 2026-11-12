import type { Periodo } from '../../../estado/aparencia'
import type { IdComportamento } from '../../mascote/comportamentos'
import { climaAgora } from './clima'

/*
 * Os roteiros do diretor de cena (01/11/2026; plano em docs/design/MASCOTES.md, seção 6). De tempos em tempos a página
 * inicial sorteia uma cena curta com os três bichos: falas em sequência, o esqueleto trocando de atividade, o gato indo
 * até o fogo ou até o esqueleto, a coruja voando para outro poleiro. Cada passo espera a fala terminar (ou o tempo dele)
 * antes do próximo. As frases da coruja que ensinam algo seguem a regra dos conceitos: curtas e corretas.
 */
export type Bicho = 'esqueleto' | 'gato' | 'coruja'
export type Acao =
  | { tipo: 'pose'; id: IdComportamento }
  | { tipo: 'gato-ir'; ate: 'fogo' | 'esqueleto' | 'longe' }
  | { tipo: 'gato-pose'; id: 'acordado' | 'comemorando' | 'ronronando' | 'observando' | 'brincando' | 'sentado' | 'lambendo' | 'cacando' | 'pulando' | 'derretido' | 'assustado' | 'olhando_cima' }
  | { tipo: 'coruja-voar' }
  | { tipo: 'estrela' }
export type Passo = { quem?: Bicho; fala?: string; acao?: Acao; espera?: number }
export type Roteiro = {
  id: string
  passos: Passo[]
  /** Chance relativa no sorteio. */
  peso: number
  horas?: Periodo[]
  /** Só nestes cenários da página inicial (cenarios.ts): cada cena é um palco com ações próprias. */
  cenarios?: string[]
  /** Bichos que precisam estar à vista (o gato e a coruja podem estar fora de cena em telas estreitas). */
  precisa?: Bicho[]
  /** Só uma vez a cada tantas visitas: entra no álbum quando aparece. */
  raro?: boolean
  /** Uma condição extra (hora do relógio, por exemplo). */
  quando?: (agora: Date) => boolean
}

export const ROTEIROS: Roteiro[] = [
  // ---- Conversas curtas (o banco de diálogos do plano) ----
  { id: 'dormir-exato', peso: 3, precisa: ['gato', 'coruja'], passos: [
    { quem: 'gato', fala: 'Vou dormir.' }, { quem: 'coruja', fala: 'Você acabou de acordar.' }, { quem: 'gato', fala: 'Exato.', acao: { tipo: 'gato-pose', id: 'ronronando' } }] },
  { id: 'monteggia', peso: 3, precisa: ['coruja'], passos: [
    { quem: 'esqueleto', fala: 'Monteggia é a do rádio?', acao: { tipo: 'pose', id: 'ler' } },
    { quem: 'coruja', fala: 'É a da ulna, com a cabeça do rádio luxada. A do rádio é a Galeazzi.' },
    { quem: 'esqueleto', fala: 'Anotado.', acao: { tipo: 'pose', id: 'escrevendo' } }] },
  { id: 'quem-revisa', peso: 3, precisa: ['gato', 'coruja'], passos: [
    { quem: 'coruja', fala: 'Quem quer revisar?' }, { quem: 'gato', fala: '(finge que está dormindo)', acao: { tipo: 'gato-pose', id: 'ronronando' } },
    { quem: 'esqueleto', fala: 'Eu! Trinta por dia, sem muro.', acao: { tipo: 'pose', id: 'comemora2' } }] },
  { id: 'fibula', peso: 2, precisa: ['gato'], passos: [
    { acao: { tipo: 'gato-ir', ate: 'esqueleto' }, espera: 3800 },
    { quem: 'gato', fala: 'Esse osso é meu?' }, { quem: 'esqueleto', fala: 'É meu. Mas pode ficar com a fíbula.' }] },
  { id: 'silencio', peso: 2, precisa: ['gato', 'coruja'], passos: [
    { quem: 'coruja', fala: 'Silêncio, estamos estudando.' }, { quem: 'gato', fala: 'Eu estou dormindo em silêncio.' }] },
  { id: 'hill-sachs', peso: 2, precisa: ['coruja'], passos: [
    { quem: 'esqueleto', fala: 'Bankart fica na cabeça do úmero, certo?', acao: { tipo: 'pose', id: 'raiox' } },
    { quem: 'coruja', fala: 'Bankart é no lábio da glenoide. Na cabeça do úmero é o Hill-Sachs.' },
    { quem: 'esqueleto', fala: 'Por isso eu estudo de armadura.' }] },
  { id: 'colles', peso: 2, precisa: ['coruja'], passos: [
    { quem: 'coruja', fala: 'Pergunta rápida: Colles desvia para onde?' }, { quem: 'esqueleto', fala: 'Para dorsal.' },
    { quem: 'coruja', fala: 'Isso. E a Smith, para volar.' }, { quem: 'gato', fala: 'Eu desvio para o sofá.' }] },

  // ---- Cenas com ação ----
  { id: 'marshmallow', peso: 3, precisa: ['gato'], horas: ['tarde', 'noite'], passos: [
    { quem: 'esqueleto', fala: 'O último marshmallow é meu.', acao: { tipo: 'pose', id: 'marshmallow' } },
    { acao: { tipo: 'gato-ir', ate: 'fogo' }, espera: 3800 },
    { quem: 'gato', fala: 'Era.', acao: { tipo: 'gato-pose', id: 'comemorando' } }] },
  { id: 'consolidacao', peso: 2, precisa: ['gato'], passos: [
    { acao: { tipo: 'gato-ir', ate: 'esqueleto' }, espera: 3800 },
    { acao: { tipo: 'gato-pose', id: 'ronronando' }, espera: 900 },
    { quem: 'esqueleto', fala: 'Não me mexo. Ele está em fase de consolidação.', acao: { tipo: 'pose', id: 'cafe' } }] },
  { id: 'troca-poleiro', peso: 3, precisa: ['coruja'], passos: [
    { quem: 'coruja', fala: 'Daqui não vejo a fogueira direito.' }, { acao: { tipo: 'coruja-voar' }, espera: 2600 },
    { quem: 'coruja', fala: 'Melhor. Luz boa para ler.' }] },
  { id: 'alongamento', peso: 2, passos: [
    { quem: 'esqueleto', fala: 'Intervalo: alongar entre um bloco e outro.', acao: { tipo: 'pose', id: 'alongar' } },
    { quem: 'gato', fala: 'Eu alongo. Depois deito de novo.', acao: { tipo: 'gato-pose', id: 'sentado' } }] },
  { id: 'malabares', peso: 2, passos: [
    { quem: 'esqueleto', fala: 'Malabares com ossos do carpo. Oito de uma vez.', acao: { tipo: 'pose', id: 'malabares' } },
    { quem: 'coruja', fala: 'Escafoide, semilunar, piramidal, pisiforme… cuidado com o hamato.' }] },
  { id: 'reflexo', peso: 2, passos: [
    { quem: 'esqueleto', fala: 'Teste do reflexo patelar.', acao: { tipo: 'pose', id: 'reflexo' } },
    { quem: 'gato', fala: 'Nada? Normal. Faltam alguns componentes aí.' }] },
  { id: 'brincadeira', peso: 2, precisa: ['gato'], passos: [
    { acao: { tipo: 'gato-pose', id: 'brincando' }, espera: 2400 },
    { quem: 'gato', fala: 'Não estou brincando. Estou treinando a preensão.' }] },
  { id: 'cafe-segunda', peso: 4, quando: (d) => d.getDay() === 1, passos: [
    { quem: 'esqueleto', fala: 'Segunda-feira: café duplo e uma revisão curta.', acao: { tipo: 'pose', id: 'cafe' } }] },
  { id: 'festa-sexta', peso: 4, horas: ['tarde', 'noite'], quando: (d) => d.getDay() === 5, passos: [
    { quem: 'esqueleto', fala: 'Sexta é festa na fogueira. Depois de dez questões.', acao: { tipo: 'pose', id: 'comemora2' } },
    { quem: 'gato', fala: 'Eu já comecei a festa. Dormindo.', acao: { tipo: 'gato-pose', id: 'comemorando' } }] },
  { id: 'domingo', peso: 4, quando: (d) => d.getDay() === 0, precisa: ['gato'], passos: [
    { quem: 'gato', fala: 'Domingo. O dia oficial da preguiça. Eu venci de novo.', acao: { tipo: 'gato-pose', id: 'ronronando' } }] },
  { id: 'madrugada', peso: 8, precisa: ['coruja'], quando: (d) => d.getHours() < 4, passos: [
    { quem: 'coruja', fala: 'Até eu fui dormir. Uma última questão e cama.' }] },

  // ---- Cada cenário é um palco (terceira leva de poses do esqueleto) ----
  { id: 'pesca', peso: 5, cenarios: ['cais'], passos: [
    { quem: 'esqueleto', fala: 'Pescaria. Paciência é metade da revisão.', acao: { tipo: 'pose', id: 'pescar' } },
    { acao: { tipo: 'pose', id: 'pescou_bota' }, espera: 1400 },
    { quem: 'esqueleto', fala: 'Uma bota. Tamanho 42.' }, { quem: 'gato', fala: 'Não é peixe. Não me interessa.' },
    { quem: 'coruja', fala: 'Pelo menos o calcâneo cabe nela.' }] },
  { id: 'forja', peso: 5, cenarios: ['forja'], passos: [
    { quem: 'esqueleto', fala: 'Forjando uma placa de compressão. Brincadeira: é uma ferradura.', acao: { tipo: 'pose', id: 'martelar' } },
    { quem: 'coruja', fala: 'Na placa de compressão dinâmica, o furo oval deixa o parafuso comprimir o foco.' }] },
  { id: 'atica', peso: 4, cenarios: ['acampamento', 'neve'], passos: [
    { quem: 'esqueleto', fala: 'Fogo baixo e constante. Estudo também.', acao: { tipo: 'pose', id: 'aticar' } },
    { quem: 'gato', fala: 'Mais perto não. Bigode é patrimônio.' }] },
  { id: 'luneta', peso: 5, cenarios: ['observatorio'], passos: [
    { quem: 'esqueleto', fala: 'Achei a constelação do fêmur.', acao: { tipo: 'pose', id: 'luneta' } },
    { quem: 'coruja', fala: 'Essa é a Ursa Maior. Mas a ideia está ótima.' }] },
  { id: 'boneco-neve', peso: 5, cenarios: ['neve'], passos: [
    { quem: 'esqueleto', fala: 'Um boneco de neve. O primeiro com esqueleto.', acao: { tipo: 'pose', id: 'boneco_neve' } },
    { quem: 'gato', fala: 'Frio demais. Me acorda na primavera.', acao: { tipo: 'gato-pose', id: 'ronronando' } }] },

  // ---- O gato sendo gato (quarta leva de poses) ----
  { id: 'vagalume', peso: 3, precisa: ['gato'], horas: ['noite'], passos: [
    { acao: { tipo: 'gato-pose', id: 'cacando' }, espera: 2600 }, { acao: { tipo: 'gato-pose', id: 'pulando' }, espera: 1300 },
    { quem: 'gato', fala: 'Quase. O vaga-lume é rápido.', acao: { tipo: 'gato-pose', id: 'sentado' } },
    { quem: 'coruja', fala: 'Ele é uma luz. Você é um gato.' }] },
  { id: 'derretido', peso: 3, precisa: ['gato'], horas: ['manha', 'tarde'], passos: [
    { acao: { tipo: 'gato-pose', id: 'derretido' }, espera: 1800 },
    { quem: 'gato', fala: 'Estou derretido. Chamam isso de termoterapia.' }, { quem: 'esqueleto', fala: 'Calor superficial. Trinta minutos, no máximo.' }] },
  { id: 'banho', peso: 2, precisa: ['gato'], passos: [
    { acao: { tipo: 'gato-pose', id: 'lambendo' }, espera: 2200 },
    { quem: 'gato', fala: 'Higiene antes do estudo. É protocolo.' }] },
  { id: 'susto-reflexo', peso: 2, precisa: ['gato'], passos: [
    { quem: 'esqueleto', fala: 'Agora, o reflexo patelar.', acao: { tipo: 'pose', id: 'reflexo' } },
    { acao: { tipo: 'gato-pose', id: 'assustado' }, espera: 1600 },
    { quem: 'gato', fala: 'Avisa antes de bater o martelo!' }, { quem: 'coruja', fala: 'L3 e L4. O nervo é o femoral.' }] },

  // ---- Raridades (entram no álbum) ----
  { id: 'estrela-cadente', peso: 1, raro: true, horas: ['noite'], precisa: ['coruja'], passos: [
    { acao: { tipo: 'estrela' }, espera: 1400 },
    { quem: 'coruja', fala: 'Estrela cadente! Faça um pedido: que caia o que você revisou.' }] },
  { id: 'osso-trocado', peso: 1, raro: true, passos: [
    { quem: 'esqueleto', fala: 'Espera. Essa costela era do outro lado.', acao: { tipo: 'pose', id: 'raiox' } },
    { quem: 'coruja', fala: 'Décima segunda costela, flutuante. Pode deixar aí.' }] },
  // Terceira leva (09/11/2026): o acampamento lembra as fogueiras de descanso dos jogos de aventura sombrios.
  { id: 'nevoa', peso: 1, raro: true, passos: [
    { quem: 'esqueleto', fala: 'Uma névoa no caminho. Do outro lado, o chefe: o TEOT.', acao: { tipo: 'pose', id: 'luneta' } },
    { quem: 'coruja', fala: 'Respire. Quem revisa todo dia atravessa a névoa já sabendo o padrão do chefe.' },
    { quem: 'gato', fala: 'Eu fico aqui. Névoa dá sono.', acao: { tipo: 'gato-pose', id: 'ronronando' } }] },
  { id: 'mimico', peso: 1, raro: true, precisa: ['gato'], passos: [
    { quem: 'esqueleto', fala: 'Um baú de questões sozinho no caminho. Suspeito.', acao: { tipo: 'pose', id: 'raiox' } },
    { acao: { tipo: 'gato-pose', id: 'assustado' }, espera: 1400 },
    { quem: 'gato', fala: 'É um mímico. Eu tentei dormir nele uma vez.' },
    { quem: 'coruja', fala: 'Regra de aventureiro: baú bonito demais no meio do nada, desconfie.' }] },
  { id: 'estus', peso: 1, raro: true, passos: [
    { quem: 'esqueleto', fala: 'Um gole do frasco. Café, claro. Energia para mais três questões.', acao: { tipo: 'pose', id: 'cafe' } },
    { quem: 'gato', fala: 'Tem refil? Para o sono, digo.' }] },
  { id: 'meia-noite', peso: 6, raro: true, precisa: ['gato'], quando: (d) => d.getHours() === 0, passos: [
    { quem: 'gato', fala: 'Meia-noite. A hora em que o gato estuda.', acao: { tipo: 'gato-pose', id: 'observando' } },
    { quem: 'coruja', fala: 'Sério?' },
    { quem: 'gato', fala: 'Não.', acao: { tipo: 'gato-pose', id: 'ronronando' } }] },
  // ---- O Natal no Vale (12/11/2026): o esqueleto sentado no banco do terraço, o gato no cesto, o trem lá embaixo ----
  { id: 'novelo', peso: 5, cenarios: ['vale'], precisa: ['gato'], passos: [
    { quem: 'esqueleto', fala: 'Mais duas voltas e o cachecol fica pronto.', acao: { tipo: 'pose', id: 'natal_tricotar' } },
    { acao: { tipo: 'gato-ir', ate: 'esqueleto' }, espera: 3800 },
    { acao: { tipo: 'gato-pose', id: 'brincando' }, espera: 2200 },
    { quem: 'esqueleto', fala: 'Cadê o meu novelo?' },
    { quem: 'gato', fala: 'Que novelo? Não vi novelo nenhum.' }] },
  { id: 'castanha', peso: 5, cenarios: ['vale'], precisa: ['coruja'], passos: [
    { quem: 'esqueleto', fala: 'Castanha quentinha, coruja?', acao: { tipo: 'pose', id: 'natal_castanhas' } },
    { quem: 'coruja', fala: 'Eu como ratos. Mas obrigada pela gentileza.' },
    { quem: 'esqueleto', fala: 'Sobra mais para mim.' }] },
  { id: 'chocolate', peso: 4, cenarios: ['vale'], precisa: ['gato'], passos: [
    { quem: 'esqueleto', fala: 'Alguém quer chocolate quente?', acao: { tipo: 'pose', id: 'natal_chocolate' } },
    { quem: 'gato', fala: 'Gato não pode chocolate. Mas aceito a manta.', acao: { tipo: 'gato-pose', id: 'ronronando' } }] },
  { id: 'sino-do-vale', peso: 4, cenarios: ['vale'], precisa: ['coruja'], passos: [
    { quem: 'coruja', fala: 'Ouviu? O relógio da prefeitura lá no vale bateu a hora.' },
    { quem: 'esqueleto', fala: 'É a deixa para mais uma canção.', acao: { tipo: 'pose', id: 'natal_cantar' } },
    { quem: 'gato', fala: 'Era a deixa para silêncio.' }] },
  { id: 'trenzinho', peso: 3, cenarios: ['vale'], passos: [
    { quem: 'coruja', fala: 'Lá vai o trenzinho do vale. Pontual como revisão bem feita.' },
    { quem: 'gato', fala: 'Eu prefiro o cesto. Não atrasa e é quentinho.', acao: { tipo: 'gato-pose', id: 'ronronando' } }] },
  { id: 'cochilo-manta', peso: 3, cenarios: ['vale'], precisa: ['coruja'], passos: [
    { acao: { tipo: 'pose', id: 'natal_cochilo' }, espera: 2200 },
    { quem: 'coruja', fala: 'Silêncio. Ele está consolidando a memória.' },
    { quem: 'gato', fala: 'Eu consolido há dezesseis horas por dia.' }] },
  { id: 'primeira-neve', peso: 9, cenarios: ['vale', 'neve'], precisa: ['gato'], quando: (d) => climaAgora(d).nevando, passos: [
    { acao: { tipo: 'gato-pose', id: 'olhando_cima' }, espera: 1800 },
    { quem: 'gato', fala: 'Está caindo algodão do céu.' },
    { quem: 'coruja', fala: 'É neve. Volte para o cesto antes que molhe o bigode.' },
    { acao: { tipo: 'gato-ir', ate: 'fogo' }, espera: 3800 },
    { quem: 'gato', fala: 'Ninguém viu eu obedecer.', acao: { tipo: 'gato-pose', id: 'ronronando' } }] },
  // Aparece sozinha de vez em quando e também por palavra digitada na página inicial (CenaDiorama).
  { id: 'louva-o-sol', peso: 2, raro: true, passos: [
    { quem: 'esqueleto', fala: 'Louvado seja o sol!', acao: { tipo: 'pose', id: 'comemora2' } },
    { quem: 'coruja', fala: 'Braços para o alto, em V. Do jeito que manda a tradição.' },
    { quem: 'gato', fala: 'O sol é ótimo. Dá para deitar nele.', acao: { tipo: 'gato-pose', id: 'derretido' } }] },
  // O código antigo dos videogames, no teclado: cima, cima, baixo, baixo, esquerda, direita, esquerda, direita, B, A.
  { id: 'codigo-antigo', peso: 2, raro: true, passos: [
    { quem: 'esqueleto', fala: 'Código antigo aceito! Trinta vidas extras.', acao: { tipo: 'pose', id: 'comemora2' } },
    { quem: 'gato', fala: 'Trinta vidas. Vou usar todas dormindo.', acao: { tipo: 'gato-pose', id: 'comemorando' } },
    { quem: 'coruja', fala: 'Usem as vidas extras na revisão, por favor.' }] },
]

/** O pedido de uma cena específica (segredos da página inicial): o diretor encena o roteiro com este id. */
export const EVENTO_ROTEIRO = 'hd-roteiro'

/** Quanto falta de tempo para ler uma fala: curtas ficam pelo menos 2,6 s. */
export const tempoDeLer = (fala: string) => Math.max(2600, Math.min(7000, 1200 + fala.length * 55))
