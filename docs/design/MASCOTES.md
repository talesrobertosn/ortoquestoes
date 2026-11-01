# Os mascotes como personagens de jogo (plano-mestre, 01/11/2026)

Pedido do Tales em 01/11/2026: "dar a eles maior desenvolvimento de imagem, qualidade, responder a ray tracing, mais
movimentos diferentes, cenários diferentes, apresentações diferentes, várias atividades dinâmicas que se alteram
aleatoriamente". Depois do primeiro brainstorm, ele pediu **os quatro caminhos** e **ainda mais ideias**: roupas,
variações e frases, tudo sobre os mascotes.

Este arquivo é o plano e o banco de ideias. Ele vale junto com [DIRECAO-ARTISTICA.md](DIRECAO-ARTISTICA.md) (regras de arte que não
mudam) e [OBJETOS-ANIMADOS.md](OBJETOS-ANIMADOS.md). Quem pegar uma tarefa daqui marca o que fez na seção "Andamento" no fim.

**Os três:**
- o **esqueleto** de armadura (modelo E: três-quartos, sem boca), sério e de humor seco;
- o **gato** laranja, o preguiçoso;
- a **coruja** bibliotecária, a sábia.

As regras de sempre continuam:
- nada cobre texto, botão, bicho ou balão;
- no celular quase parado; com "menos movimento", tudo parado;
- sem emoji, sem símbolo religioso, sem texto em inglês na arte e sem anatomia em CSS/SVG.

---

## 0. Diagnóstico (o ponto de partida)

| Bicho | Hoje | O que falta |
|---|---|---|
| **Esqueleto** | 46 comportamentos (96×128, 8 quadros), poses fixas, fantasia de Halloween automática, falas | Partes separadas, luz real, roupas fora de outubro, interação com os outros |
| **Gato** | Folhas de poses (64×48), cenas da espera, tala no 6º toque, 46 falas | Ciclos completos (andar, pular, cair), resolução maior, olhar que segue, roupas |
| **Coruja** | 8 movimentos de 5 quadros (44×32, PixelLab), 110 conceitos, pousa em pontos firmes | Voo de entrada, giro de cabeça, óculos com reflexo, expressões, roupas |

**O ponto fraco é a luz:** a cena tem luz calculada por pixel, e o bicho recebe só um filtro CSS (sépia, escurecer).
Ele parece colado na pintura em vez de estar dentro dela.

---

## 1. Os quatro caminhos e a ordem

1. **Fatia vertical épica (primeiro):** a página inicial (acampamento) com luz real nos bichos, 6 roteiros com os três
   interagindo, 2 raridades e as entradas de cena. Prova tudo num lugar.
2. **Luz ("ray tracing" nos bichos):** mapas de relevo, iluminação pelas luzes da cena, sombra projetada, contorno de
   luz e brilhos, levados a todas as cenas (estufa, campo de treino, gabinete, observatório, torre, salão).
3. **Diretor de cena (vida aleatória):** motor de roteiros, relógio do mundo, raridades, memória e o álbum.
4. **Repintura de personagem:** resolução 2×, ciclos completos, esqueleto em partes, retratos de diálogo, guarda-roupa.

O caminho 1 já usa um pedaço de cada um dos outros três. Depois dele, a luz e o diretor de cena viram peças comuns
(`componentes/mascote/`) e a repintura entra em lotes.

---

## 2. Luz e imagem

### 2.1 Mapa de relevo por quadro (a base do "ray tracing")
- Junto de cada folha, o script gera a **folha de normais**, que diz para onde cada pixel aponta:
  - o crânio é uma esfera;
  - a armadura são planos com chanfro;
  - o pelo do gato é uma esfera fofa com ruído;
  - as penas são escamas.
- Para gerar as normais, a altura sai da distância até o contorno e de pesos por material. Para arte do PixelLab ou do
  ChatGPT, a altura é estimada pela luminância mais a distância da borda, com retoque por máscara.
- **Folha de materiais:** cada pixel recebe brilho especular (osso fosco, armadura de metal, olho molhado, óculos de
  vidro) e emissão (órbita, olho do gato no escuro, lanterna).
- **No site:** um canvas WebGL leve por cena desenha os bichos com as luzes da própria pintura. Cada cena exporta a
  lista de luzes (posição, cor, raio e tremulação) junto com os pontos dos bichos.
- **Reserva:** sem WebGL, ou com o aparelho fraco, ficam os filtros CSS de hoje.

### 2.2 Efeitos de luz nos bichos
- **Lado quente e lado frio:** perto da fogueira, a face virada para o fogo esquenta e as costas pegam o céu.
- **Contorno de luz (rim light):** de costas para o sol, a borda fica dourada; à noite, azul de luar.
- **Sombra projetada:** a sombra se estica para longe da fonte, encurta perto dela e duplica quando há duas luzes
  (fogueira e lua).
- **Oclusão de contato:** uma mancha escura nos pés, mais firme quando o bicho pousa.
- **Reflexos:**
  - os óculos da coruja piscam quando ela vira a cabeça;
  - os olhos do gato acendem no escuro, com o tapetum lucidum (a camada do olho do gato que reflete a luz);
  - a espada do esqueleto pega o fogo.
- **Na água:** no cais, os bichos se refletem no lago, e o reflexo ondula.
- **Na neve:** pegadas que somem devagar, bafo no frio e flocos que pousam na cabeça e derretem perto do fogo.
- **No feixe:** quando o bicho cruza um feixe de luz (estufa, gabinete), a poeira em volta dele brilha e ele fica
  contornado de luz.
- **Tremulação sincronizada:** a luz no bicho tremula no mesmo ritmo da chama animada da cena.

### 2.3 Resolução e acabamento
- Gato e coruja em **2×** (128×96 e 88×64), com 5 a 7 tons por material, contorno colorido (nunca preto puro) e
  anti-serrilhado manual nas curvas.
- Esqueleto com **mais tons de osso** (amarelo velho, osso limpo e cinza da rachadura) e uma armadura com desgaste e
  rebites.
- **Escala inteira sempre** (2×, 3×, 4×), sem borrão; `image-rendering: pixelated`.

---

## 3. Movimento

### 3.1 Ciclos completos (8 a 12 quadros)
- **Comum aos três:** parado com respiração, andar, correr, virar, pular, cair, aterrissar, susto, comemorar, dormir,
  acordar, ser acariciado e se esconder.
- **Esqueleto:** marchar, sentar no tronco, levantar, tropeçar e se remontar (os ossos voltam para o lugar), saudar com
  a espada, tirar a espada da fogueira e cravar de volta, ler pergaminho, escrever, apontar.
- **Gato:** espreguiçar em três tempos, amassar pãozinho, lamber a pata, caçar (abaixar, rebolar, saltar), perseguir a
  própria cauda, cair de pé, entrar em caixa, derrubar coisas da mesa olhando nos olhos, bocejar, rolar de barriga para
  cima e se "derreter" no sol.
- **Coruja:**
  - voo com batida e planeio;
  - pouso com freio de asas;
  - decolagem;
  - girar a cabeça 180°;
  - inclinar a cabeça de curiosa;
  - limpar as penas;
  - ajeitar os óculos;
  - virar página com a asa;
  - piscar um olho só;
  - estufar as penas no frio;
  - dormir em um pé só.

### 3.2 Esqueleto em partes (montagem por código)
- O esqueleto vira camadas: crânio, mandíbula fechada (não há boca), tronco, braços, pernas, espada, escudo e capa.
- Cada camada tem seu ponto de giro. Assim ele combina ações sem novo desenho: anda olhando o gato, acena segurando a
  caneca, lê e coça o crânio.
- A **piada do desmonte:** com susto, os ossos voam e se remontam; uma vez a cada tanto, um osso vem no lugar errado e
  ele conserta, envergonhado.

### 3.3 Vida pequena (o que faz parecer vivo)
- Olhar que segue o mouse ou quem está falando (só a cabeça, 3 direções).
- Piscar com intervalo aleatório: o gato pisca devagar, que é o "eu te amo" dos gatos.
- Cauda do gato que balança sozinha; penas que eriçam no vento; pano vermelho do esqueleto que balança com a brisa.
- Reação a clique perto (não em cima): o bicho olha para onde você clicou.
- Reação ao rolar a página: a coruja se segura no poleiro, o gato abre um olho.

---

## 4. Guarda-roupa (roupas e variações)

As roupas são camadas por cima do sprite base (ou linhas próprias quando mudam a silhueta), e todas recebem a luz.
Cada uma tem um gatilho: data, conquista, escolha da pessoa ou raridade.

### 4.1 Calendário do ano (automático, como o Halloween)

> **Em espera (Tales, 01/11/2026):** as roupas por data ainda não entram. Ele vai pedir em breve as **roupas de
> Natal, com foco especial**; até lá, não pinte nem ligue roupas de data.

| Quando | Esqueleto | Gato | Coruja |
|---|---|---|---|
| **Ano-novo** (31/12–2/1) | Roupa branca, taça de suco de uva, chapéu de festa | Laço dourado, assustado com os fogos | Óculos de festa, confete preso nas penas |
| **Carnaval** | Fantasia de pirata, colar de flores | Máscara de baile, serpentina enrolada | Coroa de penas extra, glitter |
| **Arraial de junho** | Chapéu de palha, camisa xadrez, bigode pintado no crânio | Lenço no pescoço, fugindo do quentão | Chapéu de palha pequeno, segura um milho |
| **Copa do Mundo** (só nos anos de Copa) | Camisa verde e amarela, cachecol, vuvuzela | Pintura no focinho, bola de lã verde-amarela | Apito de juíza, cartão amarelo |
| **Inverno** (jun–ago, sul) | Gorro e cachecol já existentes, caneca | Suéter tricotado, embaixo da manta | Cachecol, penas estufadas |
| **Primavera** (set–nov) | Coroa de flores no capacete | Flor atrás da orelha, espirrando pólen | Ninho com flores |
| **Halloween** (outubro) | O que já existe: manto, foice, abóbora, morcegos | Gato preto (troca de pelagem por uma semana!) | Chapéu de bruxa, vassoura |
| **Fim de ano** (dez) | Gorro vermelho e branco de inverno (sem símbolo religioso), cachecol | Enrolado em pisca-pisca | Gorro, carrega um pacote |
| **Semana da prova** (TEOT, TARO, SBCM) | Armadura de gala, estandarte, "modo batalha" | Faixa de torcida na cabeça | Capelo de formatura, pena de escrever |
| **Aniversário do site** | Chapéu de festa e bolo com velas | Dentro da caixa do presente | Sopra a língua de sogra |
| **Aniversário da pessoa** (se informar) | Segura um bolo pixel com o nome em HTML | Dorme em cima do bolo | Canta (notas musicais pixel) |

### 4.2 Roupas de hospital e de residência (a cara do site)
- **Centro cirúrgico:** gorro, máscara, capote verde, luvas; o esqueleto com **avental de chumbo** para o raio X.
- **Plantão:** crachá, olheira pintada (o esqueleto "com olheira" na órbita), café gigante, celular tocando.
- **Ambulatório:** jaleco com caneta no bolso, martelo de reflexo, goniômetro.
- **Residência que evolui com a pessoa:** o crachá do mascote acompanha a fase que a pessoa informou (estudante, R1,
  R2, R3, R4/fellow e ortopedista): R1 de jaleco grande demais, R3 de jaleco ajustado e ortopedista com gravata-borboleta.
- **Subespecialidades:**
  - mão: lupa de cirurgia, luvas finas;
  - coluna: colete;
  - joelho: artroscópio de brinquedo;
  - pé: palmilha;
  - quadril: prótese de brinquedo;
  - pediatria: jaleco colorido;
  - oncologia: microscópio;
  - trauma: fixador externo de brinquedo no braço.
- **Gesso e tala:** o gato com a tala (já existe), o esqueleto com gesso na perna e assinaturas (sem texto legível) e a
  coruja com a asa enfaixada.

### 4.3 Classes de RPG (a pessoa escolhe; desbloqueiam por conquista)
- **Cavaleiro** (padrão do esqueleto), **mago** (já existe), **arqueiro**, **bardo** (alaúde), **ladino** (capuz verde),
  **paladino de ouro**, **druida** (folhas).
- **Gato:** gato-mago, gato-ninja, gato-astronauta, gato-chef, gato-pirata, gato-explorador (já existe o aventureiro).
- **Coruja:** professora (capelo), alquimista (frascos), cartógrafa (mapa), astrônoma (luneta), detetive (lupa e capa).

### 4.4 Armaduras por liga do ranking (prestígio)
- Bronze, prata, ouro, esmeralda e "dos Cem" (a armadura dos cavaleiros do pódio, que o Tales desenhou), seguindo a
  Liga da pessoa.
- Cada liga muda o brilho do metal: bronze fosco, prata com reflexo azul, ouro com brilho quente e esmeralda com veio
  verde.
- O gato e a coruja ganham **coleiras e medalhas** da mesma liga.

### 4.5 Variações raras (1 em 200 visitas)
- **Gato:** pelagem tricolor, branco de olhos azuis, preto, cinza e o "gato dourado" (uma em mil, vai para o álbum).
- **Coruja:** coruja-das-neves (só no cenário da neve), coruja-buraqueira (de dia, no chão, olhando torto) e coruja
  de penas azuis à noite.
- **Esqueleto:** versão dourada (depois de 100 dias de sequência), versão de cristal (zerou todas as revisões do mês) e
  versão "fantasma azul" que some e aparece (no Halloween).

### 4.6 Acessórios soltos (combinam com qualquer roupa)
Óculos redondos, monóculo, cachecol, mochila, lanterna, pergaminho, caneca, livro, pena de escrever, estetoscópio,
martelo de reflexo, coroa de louros, medalha da sequência, flor e guarda-chuva (dias de chuva no cenário).

---

## 5. Cenários e apresentações

### 5.1 Cada cena é um palco com ações próprias
| Cena | Esqueleto | Gato | Coruja |
|---|---|---|---|
| **Acampamento** | Assa marshmallow, atiça o fogo, crava a espada | Dorme perto do fogo, persegue vaga-lume | Pousa na barraca, lê à luz da fogueira |
| **Forja** | Bate no ferro, a faísca assusta o gato | Se esquenta na bigorna (fria!) | Fiscaliza com os óculos |
| **Cais** | Pesca, tira uma bota do lago | Olha o peixe e se debruça demais | Pousa no poste e assiste |
| **Observatório** | Mira a luneta e conta estrelas | Dorme no mapa celeste | Aponta constelações em forma de osso |
| **Neve** | Faz um boneco de neve esqueleto | Afunda na neve, só sobram as orelhas | Estufa as penas e vira uma bola |
| **Estufa** | Rega o vaso errado | Derruba um vaso e finge que não foi | Rega os vasos certos, no dia certo |
| **Campo de treino** | Treina no boneco e erra feio | Ataca o boneco quando ninguém vê | Marca os pontos no alvo |
| **Gabinete** | Espana os cristais | Brinca com a fita do livro | Cataloga relíquias com a lupa |
| **Salão dos Cem** | Faz guarda ao lado do campeão | Dorme no tapete vermelho | Pousa no capitel e aplaude |
| **Biblioteca** | Carrega pilhas de livros | Derruba um livro (já existe) | Reorganiza a estante |
| **Torre do Tempo** | Dá corda no relógio | Corre atrás do pêndulo | Avisa a hora da revisão |

### 5.2 Entradas e saídas de cena
- **Coruja:** chega voando de fora do quadro e pousa com freio de asas; vai embora em espiral.
- **Gato:** entra pela borda, para no meio, senta e lambe a pata. Às vezes cai do alto (de pé, claro).
- **Esqueleto:**
  - entra marchando;
  - no Halloween, sobe da terra numa nuvem de poeira;
  - em semana de prova, chega a cavalo (cavalo de pau pixel).
- **Saída de susto:** um barulho alto (a pessoa errou três seguidas) faz o gato pular para fora do quadro e voltar
  espiando.

### 5.3 Momentos de cinema (gatilhos do estudo)
| Gatilho | Cena |
|---|---|
| Acertou 10 seguidas | Os três comemoram juntos; a coruja solta confete de penas |
| Zerou a revisão do dia | O esqueleto tira a espada da fogueira e ergue; o gato bate palmas com as patinhas |
| Errou marcando "certeza" | A coruja tira os óculos, limpa e olha séria (sem bronca, só "vamos rever") |
| Recorde de sequência | Fogos pixel no céu da cena; o gato se esconde |
| 100 dias de sequência | O esqueleto ganha a armadura dourada, com cerimônia de 6 s, que pode ser pulada |
| Primeira questão do dia | A coruja acena com a asa e o gato abre um olho |
| Voltou depois de 7 dias | O gato corre até a borda e se esfrega na tela |
| Errou a mesma questão de novo | O gato traz a questão na boca, como um rato |
| Simulado entregue | Os três posam para uma "foto" com flash e moldura de pergaminho, que dá para baixar e compartilhar |
| Subiu de liga | Estandarte novo desce na cena, com a cor da liga |
| Meia-noite estudando | A coruja aparece de pijama: "Até eu fui dormir." |

### 5.4 Apresentações (formatos novos)
- **Retratos de diálogo** de RPG: o retrato grande (3 a 4 expressões por bicho: neutro, feliz, sério e surpreso), o nome
  e o texto com efeito de máquina de escrever (desligável).
- **Cartas colecionáveis:** cada roupa ou raridade vira uma carta com moldura dourada, numa página "Álbum dos bichos".
- **Diorama de bolso:** no Menu, um diorama pequeno que gira de leve (3 ângulos pintados, não 3D) com os três.
- **Tela de carregamento:** cenas curtas do Gato Aventureiro (já existe), mais as da coruja e do esqueleto.
- **Bichos no Instagram:** os mesmos sprites nos modelos aprovados (stories com o gato dormindo na questão).
- **Sala dos bichos (easter egg):** a casa dos três, com as coisas que eles "ganharam" do seu estudo na parede: medalhas,
  emblemas e a foto do simulado.
- **Modo foto:** um botão discreto no rodapé da cena congela tudo, tira a interface e salva o quadro (com a marca Orto
  Questões no canto).

---

## 6. O diretor de cena (vida aleatória)

### 6.1 Formato de um roteiro
```
{ id: 'gato-derruba-vaso', bichos: ['gato'], cenas: ['estufa'], horas: ['manha', 'tarde'],
  peso: 3, raro: false, intervalo: 600,
  quando: (contexto) => true,
  passos: [ ['gato', 'andar', { ate: 'vaso' }], ['gato', 'empurrar'], ['vaso', 'cair'],
            ['gato', 'olhar', 'camera'], ['gato', 'fugir', { ate: 'borda' }], ['coruja', 'fala', 'Eu vi isso.'] ] }
```
- **Sorteio com peso:** a cada 40 a 120 s no computador e 3 a 6 min no celular, só com a aba visível e a cena na tela.
- **Nunca dois roteiros ao mesmo tempo** e nunca o mesmo duas vezes seguidas.
- **O roteiro para na hora** se a pessoa toca num bicho: a fala manda.
- **Pontos nomeados por cena** (vaso, poste, borda, poleiro, fogueira) em `scripts/cenarios/cena-*.json`, como os
  pontos de hoje.

### 6.2 Relógio do mundo
- **Manhã:** o gato toma sol, a coruja dorme num pé só e o esqueleto alonga.
- **Tarde:** o esqueleto treina e o gato caça.
- **Noite:** a coruja fica acordada e ativa, o gato vira caçador de vaga-lume e o esqueleto cochila sentado.
- **Dia da semana:**
  - segunda: "café duplo";
  - sexta: "festa na fogueira", com marshmallow para todos;
  - domingo: preguiça geral (o gato vence).
- **Clima sorteado por dia:** limpo, nublado, chuva leve (gotas no vidro e poças) ou névoa da manhã. A chuva muda o
  roteiro: o gato se esconde e a coruja abre um guarda-chuva.

### 6.3 Raridades e o álbum
- Cada raridade tem uma chance por visita (1 em 30, 1 em 100 ou 1 em 1.000) e entra no **Álbum dos bichos** quando
  aparece.
- **Exemplos:**
  - a estrela cadente que vira uma dica de prova;
  - o gato dourado;
  - a coruja que fala ao contrário ("Acertou? Então revisa.");
  - o esqueleto que se monta errado;
  - os três jogando cartas na fogueira;
  - uma raposa visitante que rouba o marshmallow.
- **O álbum:** mostra o que já foi visto e silhuetas do que falta, com o número de cenas descobertas. Nada se compra:
  aparece com o tempo de estudo.

### 6.4 Memória (os bichos lembram de você)
- A coruja lembra o tema que você mais errou ontem e usa num conceito de hoje: "Ontem foi Garden. Hoje ele não escapa."
- O gato lembra quantos dias você ficou fora: "Três dias. Eu contei. Dormindo, mas contei."
- O esqueleto lembra o seu recorde: "Seu recorde é 19 dias. Eu tenho 206 ossos torcendo por 20."
- Tudo local e leve (a mesma memória do site, sem servidor novo), e desligável em Minha conta.

### 6.5 Interações entre os três
- O gato tenta pegar a coruja, a coruja dá um tapa de asa e o esqueleto separa.
- O gato dorme no colo do esqueleto, que não se mexe para não acordar ("Fico aqui. Ele está em consolidação.").
- A coruja corrige o esqueleto ("Bankart é no lábio da glenoide; o Hill-Sachs fica na cabeça do úmero."), e o
  esqueleto anota.
- Os três dividem o marshmallow; o gato rouba o último.
- O esqueleto joga um osso e o gato não busca. A coruja busca.
- Disputa de olhar: o gato e a coruja se encaram e o esqueleto é o juiz (ele não tem pálpebra, então não vale); o gato
  sempre perde, porque pisca devagar de propósito.

---

## 7. Mini-jogos e atividades com os bichos (opcionais, nunca de entrada)
- **Pega a coruja:** toque na coruja três vezes seguidas e ela faz uma pergunta relâmpago (verdadeiro ou falso, de um
  conceito real); acertou, ela solta uma pena dourada para o álbum.
- **Acorda o gato:** cinco toques seguidos e ele fica bravo, com a tala (já existe); dez, ele foge e volta com uma
  questão "na boca".
- **Esqueleto quebra-cabeça:** quando ele se desmonta, dá para arrastar os ossos de volta. É uma piada de anatomia de
  verdade: o osso certo no lugar certo, com o nome em HTML.
- **Alimente a fogueira:** cada questão respondida joga um graveto; a chama cresce até o fim do dia (liga com a
  sequência que já existe).
- **Correio da coruja:** uma vez por semana, a coruja traz uma carta com a sua semana (o mesmo texto das cartas do
  e-mail, no tom do Tales).

---

## 8. Frases novas (banco para escolher)

As frases da coruja são conceitos de prova: **confira cada uma com o acervo antes de pôr no site**, como manda a regra
dos conceitos. As do gato e do esqueleto são humor e não podem soar como bronca.

### 8.1 Coruja (conceitos, a conferir)
- "Monteggia: a ulna quebra e a cabeça do rádio luxa. Olhe sempre o cotovelo."
- "Galeazzi: o rádio quebra embaixo e a radioulnar distal luxa. O inverso da Monteggia."
- "Salter-Harris V é a compressão da fise. O raio X pode vir normal e o crescimento para depois."
- "Trendelenburg: o glúteo médio fraco deixa a pelve cair do lado oposto ao apoio."
- "Fratura de Jones: base do quinto metatarso, na junção metáfise-diáfise. Consolida mal."
- "Ângulo de Böhler normal fica entre 20 e 40 graus. Diminuiu, o calcâneo afundou."
- "Escafoide: o sangue entra pelo polo distal e só depois chega ao proximal. Por isso é o proximal que necrosa."
- "Kienböck é a necrose do semilunar; a ulna curta (variância negativa) aparece junto."
- "Tumor de células gigantes: epífise, adulto jovem, fise já fechada."
- "Osteossarcoma: metáfise do joelho, triângulo de Codman e raios de sol."
- "Perthes: quanto mais velha a criança no início, pior o prognóstico."
- "Pé torto: no Ponseti, a última correção é o equino, muitas vezes com tenotomia do Aquiles."
- "Síndrome compartimental: a dor ao estiramento passivo vem antes da falta de pulso."
- "Lesão de Hill-Sachs é na cabeça do úmero; Bankart, no lábio da glenoide."
- "Fratura de Colles desvia para dorsal; Smith, para volar."

### 8.2 Coruja (fora dos conceitos: dicas e humor sábio)
- "Revisar no dia certo vale mais que revisar muito no dia errado."
- "Quem erra com certeza aprende mais quando revisa. Guarde essas."
- "Eu não sei tudo. Eu sei onde está tudo. É diferente."
- "Até eu fui dormir." (meia-noite)
- "Ler o comentário inteiro é o que separa o chute do acerto."
- "Uma questão por vez. Coruja também não voa com dez livros."
- "Errou? Ótimo. Agora você sabe onde mora a dúvida."
- "Óculos limpos, cabeça limpa. Vamos a mais uma."

### 8.3 Gato (preguiça, sempre fofo)
- "Eu também tenho uma sequência: 14 dias sem fazer nada."
- "Sentei no seu caderno. Ele agora é meu."
- "Estou aquecendo o teclado para você."
- "Isso aqui é um sono de qualidade. Nível de evidência 1."
- "A coruja estuda à noite. Eu durmo à noite. E de dia. E agora."
- "Meu plano de estudo: deitar perto de quem estuda."
- "Fiz um alongamento. Foi o suficiente por hoje."
- "Se cair 'gato' na prova, eu respondo."
- "Não é preguiça. É conservação de energia."
- "Ronrono em 25 hertz. Dizem que ajuda a consolidar osso." (curiosidade popular; não vale como conceito)
- "Derrubei o vaso. Foi a gravidade."
- "Você estuda, eu supervisiono a temperatura do sol."
- "Três dias fora. Eu contei. Dormindo, mas contei."
- "Treino de queda: sempre de pé. Pode anotar."

### 8.4 Esqueleto (humor seco, sem boca, sem bronca)
- "Tenho 206 motivos para estudar ortopedia."
- "Fratura? Eu chamo de autoconhecimento."
- "Não tenho estômago para desistir. Literalmente."
- "Já fui de carne e osso. Hoje sou só a parte que cai na prova."
- "Revisão espaçada? Eu espaço até as costelas."
- "O gato dormiu no meu colo. Não me mexo há duas horas."
- "Sempre de armadura. Proteção articular é tudo."
- "Meu cálcio está em dia. E o seu cronograma?"
- "Eu não sorrio. Mas por dentro, esse acerto me deixou radiante."
- "Até a minha patela torce por você."
- "Ossos do ofício: estudar um pouco todo dia."
- "Sou o único aqui que já fez a anatomia por dentro."
- "Se eu desmontar, você sabe onde vai cada peça? Eu sei que você sabe."
- "Vinte questões. Sem pressa. Eu tenho a eternidade, você tem o plantão."

### 8.5 Diálogos curtos entre os três
- **Gato:** "Vou dormir." **Coruja:** "Você acabou de acordar." **Gato:** "Exato."
- **Esqueleto:** "Monteggia é a do rádio?" **Coruja:** "É a da ulna; a do rádio é a Galeazzi." **Esqueleto:** "Anotado."
- **Coruja:** "Quem quer revisar?" **Gato:** (vira de costas) **Esqueleto:** (ergue a espada)
- **Gato:** "Esse osso é meu?" **Esqueleto:** "É meu. Mas pode ficar com a fíbula."
- **Coruja:** "Silêncio, estamos estudando." **Gato:** "Eu estou dormindo em silêncio."

---

## 9. Ferramentas e produção

- **Scripts:** cada bicho tem um script que monta a folha, as normais e os materiais a partir da fonte (desenho por
  código, PixelLab ou ChatGPT) e uma prancha e um GIF para revisão.
- **Prompts para o ChatGPT:** grade fixa, fundo liso, sem texto, mesma linha de chão e mesmos objetos em todos os
  quadros, uma folha por movimento ou roupa. O Tales manda o arquivo sozinho numa mensagem.
- **Peso:** cada folha em PNG indexado; as normais podem ir em meia resolução; tudo carregado só quando a cena aparece.
- **Testes:** prancha automática de todas as roupas por bicho; roteiro que roda cada roteiro de cena e confere que
  nada cobre texto; prints no celular e no computador, claro e escuro.

---

## Andamento
- 01/11/2026: plano escrito; ordem decidida (fatia vertical, luz, diretor de cena, repintura). Roupas por data em
  espera até o pedido do Natal.
- 01/11/2026: **luz nos bichos (caminho 2, primeira versão)**. `scripts/sprites/luz_bichos.py` gera quatro mapas por
  folha (luz quente e sombra fria, da esquerda e da direita, em faixas). No site, `componentes/mascote/luz.ts` e
  `Luz.css`: as cenas declaram as luzes (fogueira na cor da chama, chamas da vila, sol ou lua da janela) e cada bicho
  acende do lado da luz mais forte, esfria do outro e ganha a sombra no chão para longe dela. Ligado na página inicial
  e nas cenas da vila (Revisão, Caderno, Favoritas). Sem WebGL: duas camadas que herdam o quadro do sprite.
- 01/11/2026: **diretor de cena (caminho 3, primeira versão) na página inicial**. `componentes/inicio/cena/roteiros.ts`
  traz os roteiros: conversas, cenas com ação (o gato vai até o fogo ou até o esqueleto, a coruja troca de poleiro
  voando, o esqueleto muda de atividade), dias da semana (café na segunda, festa na sexta, preguiça no domingo),
  madrugada e raridades (estrela cadente à noite, o osso trocado). O `DiretorDeCena` (em `CenaDiorama.tsx`) sorteia
  um roteiro a cada 1 a 2 min no computador e 2,5 a 5 min no celular, só com a aba e a cena à vista. Ele cala o
  esqueleto enquanto a cena roda e para quando a pessoa toca num bicho. O gato dourado aparece em uma visita a cada
  150. As raridades vistas ficam em `localStorage['bichos:album']` (o álbum ainda não tem tela). Para testar:
  `sessionStorage['inicio:roteiro'] = '<id>'`.
- 01/11/2026: **Sala dos bichos** (`#/bichos`, `paginas/Bichos.tsx`, no menu em Competir): a ficha dos três, com o
  retrato vivo iluminado pela lareira, a troca de pose, uma fala por toque e o **álbum das raridades** (cartas com a
  silhueta até a pessoa ver na página inicial).
- 01/11/2026: **palcos (caminho 4, primeira leva de repintura)**. Esqueleto: `esqueleto-poses3.png` com pescar,
  martelar, aticar, luneta, boneco_neve e pescou_bota (`scripts/gerar_mascote.py`, terceira leva). Gato: cinco linhas
  novas no fim de `gato-fofo.png` (lambendo, cacando, pulando, derretido, assustado; `scripts/gerar_gato_fofo.py`).
  Roteiros por cenário (`cenarios` em `roteiros.ts`): a pesca da bota no cais, a forja, o atiçar na fogueira, a
  luneta no observatório e o boneco de neve; e o gato sendo gato (vaga-lume, derretido no sol, banho, susto do
  reflexo). Mapas de luz gerados para as duas folhas. As poses novas também estão na Sala dos bichos.

