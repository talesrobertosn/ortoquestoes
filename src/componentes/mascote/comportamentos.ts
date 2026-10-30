// Gerado por scripts/gerar_mascote.py: não edite à mão.
/** Os comportamentos do mascote, na ordem das linhas de public/pixel/mascote/esqueleto.webp. */
export const QUADRO = { largura: 240, altura: 272, quadros: 12 } as const
export const COMPORTAMENTOS = [
  {
    "id": "ler",
    "nome": "lendo",
    "duracao": 4.2
  },
  {
    "id": "cafe",
    "nome": "tomando café",
    "duracao": 3.6
  },
  {
    "id": "marshmallow",
    "nome": "assando marshmallow",
    "duracao": 3.2
  },
  {
    "id": "dormir",
    "nome": "cochilando",
    "duracao": 3.8
  },
  {
    "id": "alongar",
    "nome": "se espreguiçando",
    "duracao": 3.0
  },
  {
    "id": "acenar",
    "nome": "acenando",
    "duracao": 2.2
  },
  {
    "id": "flashcards",
    "nome": "revisando flashcards",
    "duracao": 3.0
  },
  {
    "id": "raiox",
    "nome": "olhando um raio X",
    "duracao": 3.4
  },
  {
    "id": "anotar",
    "nome": "fazendo anotações",
    "duracao": 3.6
  },
  {
    "id": "violao",
    "nome": "tocando cavaquinho",
    "duracao": 2.4
  },
  {
    "id": "malabares",
    "nome": "fazendo malabares com ossos",
    "duracao": 2.0
  },
  {
    "id": "reflexo",
    "nome": "testando o próprio reflexo patelar",
    "duracao": 2.6
  },
  {
    "id": "comer",
    "nome": "comendo uma maçã",
    "duracao": 3.4
  },
  {
    "id": "estetoscopio",
    "nome": "auscultando o próprio peito",
    "duracao": 3.2
  }
] as const
export type IdComportamento = (typeof COMPORTAMENTOS)[number]['id']
