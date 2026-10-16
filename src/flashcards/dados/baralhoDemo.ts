import type { Flashcard } from '../tipos'

/**
 * Baralho de demonstração: 12 flashcards tirados de questões reais do acervo e
 * dos comentários delas (o id da questão está em `questao`). Raridade pela
 * incidência do assunto na prova (lendária = prioridade máxima). A área segue o
 * padrão do acervo (`area`/`areaId` de public/flashcards/indice.json): Trauma
 * adulto e Quadril, para não criar áreas soltas em Meu desempenho.
 * Até a fábrica (scripts/flashcards/) existir, a Batalha usa só este baralho.
 */
export const BARALHO_DEMO: Flashcard[] = [
  {
    "id": "fc-trauma-1519-1",
    "questao": "trauma-1519",
    "area": "Trauma adulto",
    "areaId": "trauma",
    "assunto": "Fratura do acetábulo",
    "tipo": "Imagem",
    "raridade": "lendaria",
    "dificuldade": 3,
    "frente": "O achado da seta, na oblíqua obturatriz, é patognomônico de qual fratura?",
    "resposta": "Fratura de ambas as colunas",
    "explicacao": "É o **sinal do esporão**: a ponta mais baixa do **ílio intacto**, que sobra quando todo o acetábulo medializa. Mais bem visto na **oblíqua obturatriz**.",
    "imagem": {
      "arquivo": "trauma/trauma-1519-1.jpeg",
      "legenda": "Fonte: Rockwood and Green's Fractures in Adults, 10ª ed., capítulo 51, figura 51-37B."
    },
    "opcoes": [
      "Ambas as colunas",
      "Transversa com parede posterior",
      "Em T",
      "Coluna anterior com hemitransversa"
    ],
    "certa": 0
  },
  {
    "id": "fc-trauma-1520-1",
    "questao": "trauma-1520",
    "area": "Trauma adulto",
    "areaId": "trauma",
    "assunto": "Fratura do acetábulo",
    "tipo": "Imagem",
    "raridade": "lendaria",
    "dificuldade": 2,
    "frente": "Idosa, queda da própria altura. Que sinal a seta mostra?",
    "resposta": "Asa de gaivota",
    "explicacao": "Impacção **superomedial do teto**, típica da coluna anterior do idoso. Sinal de **mau prognóstico**.",
    "imagem": {
      "arquivo": "trauma/trauma-1520-1.jpeg",
      "legenda": "Fonte: Rockwood and Green's Fractures in Adults, 10ª ed., capítulo 51, figura 51-29."
    },
    "opcoes": [
      "Asa de gaivota",
      "Esporão",
      "Crescente",
      "Lágrima de Köhler"
    ],
    "certa": 0
  },
  {
    "id": "fc-trauma-1493-1",
    "questao": "trauma-1493",
    "area": "Trauma adulto",
    "areaId": "trauma",
    "assunto": "Fratura do anel pélvico",
    "tipo": "Par confundível",
    "raridade": "epica",
    "dificuldade": 1,
    "frente": "Hematoma no períneo, acima do ligamento inguinal ou na coxa: sinal de {{c1::DESTOT}}. E a equimose no flanco?",
    "resposta": "Sinal de Grey Turner",
    "explicacao": "**DESTOT** = períneo, acima do ligamento inguinal ou coxa. **GREY TURNER** = flanco, sangue no retroperitônio.",
    "opcoes": [
      "Grey Turner",
      "Destot",
      "Cullen",
      "Morel-Lavallée"
    ],
    "certa": 0
  },
  {
    "id": "fc-trauma-1499-1",
    "questao": "trauma-1499",
    "area": "Trauma adulto",
    "areaId": "trauma",
    "assunto": "Sacro",
    "tipo": "Tabela",
    "raridade": "lendaria",
    "dificuldade": 2,
    "frente": "Denis zona III (medial aos forames): déficit neurológico em até {{c1::60%}}.",
    "resposta": "Até 60%",
    "explicacao": "Zona I: cerca de 50% das fraturas, pouco déficit. Zona II: **cerca de 30%** de déficit. Zona III: 16% das fraturas, **até 60%**.",
    "opcoes": [
      "Até 60%",
      "Cerca de 30%",
      "Menos de 10%",
      "Acima de 90%"
    ],
    "certa": 0
  },
  {
    "id": "fc-trauma-1526-1",
    "questao": "trauma-1526",
    "area": "Trauma adulto",
    "areaId": "trauma",
    "assunto": "Fratura do acetábulo",
    "tipo": "Na prova",
    "raridade": "epica",
    "dificuldade": 3,
    "frente": "Arcos de teto de VRAHAS para o conservador: medial > {{c1::45}}, anterior > {{c2::25}}, posterior > {{c3::70}} graus.",
    "resposta": "45, 25 e 70 graus",
    "explicacao": "Medial no **AP**, anterior na **obturatriz**, posterior na **ilíaca**. Sem tração. Não vale para ambas as colunas nem parede posterior.",
    "opcoes": [
      "45, 25 e 70",
      "45, 45 e 45",
      "25, 45 e 70",
      "70, 25 e 45"
    ],
    "certa": 0
  },
  {
    "id": "fc-trauma-1491-1",
    "questao": "trauma-1491",
    "area": "Trauma adulto",
    "areaId": "trauma",
    "assunto": "Fratura do anel pélvico",
    "tipo": "Armadilha",
    "raridade": "rara",
    "dificuldade": 2,
    "frente": "Próstata alta ao toque retal ainda indica lesão da uretra?",
    "resposta": "Não. O sinal não é confiável",
    "explicacao": "Sangue no meato do homem pede **uretrografia retrógrada** antes de passar a sonda. A ruptura vesical mais comum é **extraperitoneal**.",
    "opcoes": [
      "Não, use a uretrografia",
      "Sim, sinal patognomônico",
      "Só na mulher",
      "Só com hematúria"
    ],
    "certa": 0
  },
  {
    "id": "fc-quadril-0668-1",
    "questao": "quadril-0668",
    "area": "Quadril",
    "areaId": "quadril",
    "assunto": "Pelve: ligamentos",
    "tipo": "Anatomia",
    "raridade": "rara",
    "dificuldade": 2,
    "frente": "Vista posterior da hemipelve: que ligamento curto a seta aponta?",
    "resposta": "Ligamento sacroespinal",
    "explicacao": "Vai do sacro à **espinha isquiática** e separa os forames isquiáticos **maior e menor**. O sacrotuberal é o longo, até o túber.",
    "imagem": {
      "arquivo": "quadril/quadril-0668-1.jpeg",
      "legenda": "Fonte: Netter, Atlas de Anatomia Ortopédica, 2ª edição."
    },
    "opcoes": [
      "Sacroespinal",
      "Sacrotuberal",
      "Iliolombar",
      "Sacroilíaco posterior"
    ],
    "certa": 0
  },
  {
    "id": "fc-trauma-1529-1",
    "questao": "trauma-1529",
    "area": "Trauma adulto",
    "areaId": "trauma",
    "assunto": "Fratura do acetábulo",
    "tipo": "Na prova",
    "raridade": "epica",
    "dificuldade": 2,
    "frente": "Fixar o acetábulo até {{c1::15}} dias nas elementares e {{c2::10}} nas associadas.",
    "resposta": "15 e 10 dias",
    "explicacao": "A chance de redução anatômica cai **12% por dia**. Depois de **3 semanas**, a fratura não é mais aguda.",
    "opcoes": [
      "15 e 10 dias",
      "21 e 15 dias",
      "10 e 5 dias",
      "3 e 2 semanas"
    ],
    "certa": 0
  },
  {
    "id": "fc-trauma-1502-1",
    "questao": "trauma-1502",
    "area": "Trauma adulto",
    "areaId": "trauma",
    "assunto": "Fratura do anel pélvico",
    "tipo": "Na prova",
    "raridade": "lendaria",
    "dificuldade": 1,
    "frente": "Cinta pélvica: na altura dos {{c1::trocânteres maiores}}, com rotação interna e adução.",
    "resposta": "Trocânteres maiores",
    "explicacao": "Fecha o livro aberto e favorece o tamponamento. **Retire cedo** e não planeje a cirurgia pela imagem com a cinta.",
    "opcoes": [
      "Trocânteres maiores",
      "Cristas ilíacas",
      "Cicatriz umbilical",
      "Abaixo dos joelhos"
    ],
    "certa": 0
  },
  {
    "id": "fc-trauma-1498-1",
    "questao": "trauma-1498",
    "area": "Trauma adulto",
    "areaId": "trauma",
    "assunto": "Fragilidade",
    "tipo": "Classificação",
    "raridade": "rara",
    "dificuldade": 2,
    "frente": "FFP de ROMMENS tipo III: qual a lesão?",
    "resposta": "Posterior unilateral desviada",
    "explicacao": "I: só anterior. II: posterior **sem desvio**. III: posterior **unilateral desviada**. IV: posterior **bilateral**.",
    "opcoes": [
      "Posterior unilateral desviada",
      "Posterior sem desvio",
      "Posterior bilateral",
      "Só anterior"
    ],
    "certa": 0
  },
  {
    "id": "fc-trauma-1533-1",
    "questao": "trauma-1533",
    "area": "Trauma adulto",
    "areaId": "trauma",
    "assunto": "Fratura do acetábulo",
    "tipo": "Anatomia cirúrgica",
    "raridade": "comum",
    "dificuldade": 3,
    "frente": "Variação mais comum do ciático com o piriforme (12%)?",
    "resposta": "Fibular atravessa, tibial abaixo",
    "explicacao": "**84%** saem inteiros abaixo do piriforme. A variação mais comum é a **divisão fibular atravessando** o músculo.",
    "opcoes": [
      "Fibular atravessa, tibial abaixo",
      "Nervo inteiro atravessa",
      "Fibular acima, tibial abaixo",
      "Nervo inteiro acima"
    ],
    "certa": 0
  },
  {
    "id": "fc-trauma-1508-1",
    "questao": "trauma-1508",
    "area": "Trauma adulto",
    "areaId": "trauma",
    "assunto": "Fratura do anel pélvico",
    "tipo": "Anatomia cirúrgica",
    "raridade": "epica",
    "dificuldade": 2,
    "frente": "Corona mortis: anastomose entre os vasos {{c1::obturatórios}} e os ilíacos externos ou epigástricos.",
    "resposta": "Obturatórios",
    "explicacao": "Cruza a face interna do ramo superior, a cerca de **6 cm da sínfise**. Identificar e **ligar** antes de seguir.",
    "opcoes": [
      "Obturatórios",
      "Glúteos superiores",
      "Pudendos internos",
      "Sacrais laterais"
    ],
    "certa": 0
  }
]
