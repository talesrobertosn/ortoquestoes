# Página inicial: brainstorm e proposta (16/10/2026)

Pedido do Tales: "Me mostra como você faria para deixar a página inicial mais bonita, melhor, como
você otimizaria. Não sobe, só faz e me manda uns prints. Faça um brainstorm."

**Situação: proposta, não publicada.** Está num branch próprio, com commit e sem push. Capturas
antes e depois em `/tmp/claude-0/proposta-inicio/` (fora do repositório).

Como foi feito: o app rodou localmente com Supabase simulado no navegador (mesma técnica de
`fixtures/testar_compra_planos.mjs`: sessão falsa no `localStorage` e respostas do Supabase
interceptadas pelo Playwright, sem credenciais) e com as travas do `publicar.yml` ligadas
(flashcards na capa, limites, pagamentos). Visitante e uma conta de exemplo, "Ana": R3, assinante,
cronograma do TEOT com 142 dias até a prova, meta de hoje 10 de 34 em Quadril, 30 revisões
vencendo, 9 dias seguidos, 420 questões respondidas. Tamanhos: 1400×860, 390×844 e 844×390.

---

## 1. Diagnóstico da página atual

### Com conta (o caso mais importante: é a tela que a pessoa abre todo dia)

- **Três chamadas para a mesma coisa.** O topo diz "Meta de hoje: 10 de 34" e "Começar a meta de
  hoje"; logo abaixo o cartão grande do Cronograma repete "10 de 34" e "Seguir o cronograma"; e o
  quadro de flashcards do topo tem "Seguir o cronograma de hoje" (dos flashcards). A pessoa precisa
  decidir entre três botões que levam quase ao mesmo lugar.
- **A primeira coisa depois do topo é um formulário.** "Complete seu perfil" e "Novidade: Simulados
  no seu cronograma" ocupam cerca de 700 px no computador antes de qualquer informação de estudo.
- **Excesso de blocos.** São 14 blocos empilhados: topo, perfil, novidade, cronograma, estudo de
  hoje, onde mais erra, o que mais cai, recursos do assinante, semana, últimas sessões, por tema,
  ranking, assinatura, indique. A página tem cerca de 4.900 px no computador e 9.100 px no celular.
- **Números que não ajudam a decidir.** "Questões novas: 6.159" é quase o total do acervo (a regra é
  não citar total) e não leva a nenhuma ação; "Dominadas: 0" desanima; "Por tema" mostra "130 de
  1.545" em cada tema, de novo totais.
- **Legibilidade.** No computador, o título "Conhecimento que evolui com você" fica em cima da arte
  da floresta e quase some. No celular, o contador "30" de "Revisar hoje" quebra em "3 / 0" e
  "Montar minha sessão" quebra em três linhas.
- **A sequência está escondida.** Os dias seguidos aparecem só como um número pequeno no celular e,
  no computador, só dentro do texto do ranking, lá embaixo. É o maior motivo para voltar amanhã.
- **Nada de "quase lá".** O site tem 204 emblemas e calcula o progresso de cada um, mas a página
  inicial não mostra o que está perto de cair.

### Visitante

- **O topo não diz o que é o produto.** O título é uma frase sorteada ("Nada de fratura por
  estresse."). É simpática, mas quem chega pelo Google ou pelo Instagram não fica sabendo, em uma
  frase, que são as provas oficiais comentadas.
- **A amostra é estática.** A questão de exemplo já vem respondida; o visitante não tem o "deixa eu
  tentar", que é o gancho mais forte do produto.
- **Bom no resto, mas sem fechamento.** Cronograma, "Até a prova", "O que mais cai", recursos,
  ranking e planos estão lá; falta um convite final claro depois de tudo isso.
- "Até a prova" mostrava "São 26% do acervo", que permite deduzir o total. Corrigido na proposta.

### Velocidade

- O topo do usuário logado carregava a arte grande dos flashcards (180 KB) na primeira dobra do
  computador. Na proposta, a arte só aparece em miniatura nos atalhos (52 e 64 KB) e, para o
  visitante, abaixo da dobra com `loading="lazy"`.
- O "Onde mais erra" e o plano de revisão de 7 dias não são calculados para o visitante.
- Nenhuma imagem, fonte ou biblioteca nova. O CSS novo tem cerca de 25 KB sem compressão (carregado só com a página inicial).

---

## 2. Ideias, julgadas (valor e esforço de 1 a 3)

| # | Ideia | Para quem | Valor | Esforço | Na proposta |
|---|-------|-----------|-------|---------|-------------|
| 1 | **Uma próxima ação só no topo**: continuar a sessão → meta do cronograma → revisão de hoje → treino rápido, nessa ordem | logado | 3 | 1 | sim |
| 2 | **Progresso ao lado da ação**: fogueira em pixel, dias seguidos, os 7 dias em quadradinhos, semana, acerto de 7 dias, respondidas | logado | 3 | 1 | sim |
| 3 | **Trilha da jornada dentro do topo** (o mensageiro andando até a coroa), em vez de um segundo cartão de cronograma | logado | 2 | 1 | sim |
| 4 | **Atalhos rápidos**: Treinar, Revisão (com contador), Estudar flashcards e Jogar o Torneio, com miniaturas da arte | logado | 3 | 1 | sim |
| 5 | **"Quase lá"**: os 3 emblemas mais perto de cair, com "faltam N" e barra | logado | 3 | 1 | sim |
| 6 | Formulário de perfil e avisos **depois** do estudo do dia | logado | 2 | 1 | sim |
| 7 | "Sua semana" e "Últimas sessões" num cartão só; "Onde mais erra" virou "Onde uma sessão rende mais", com tom de convite | logado | 2 | 1 | sim |
| 8 | "Treinar por tema" com a porcentagem percorrida em vez de "130 de 1.545" | todos | 2 | 1 | sim |
| 9 | **Topo do visitante com proposta de valor** fixa e um CTA dourado | visitante | 3 | 1 | sim |
| 10 | **Questão de amostra respondível** (mao-0853): marca, vê se acertou, lê o porquê da certa e da que marcou, e o convite | visitante | 3 | 1 | sim |
| 11 | Quatro pilares em pixel art (questões comentadas, revisão, cronograma, desempenho) | visitante | 2 | 1 | sim |
| 12 | Chamada final "A primeira sessão leva um minuto" | visitante | 2 | 1 | sim |
| 13 | Movimento sutil: entrada em cascata, barras que enchem, fogueira que tremula; tudo desligado com movimento reduzido | todos | 1 | 1 | sim |
| 14 | Celular deitado: esconder o subtítulo para a ação caber na primeira tela | logado | 1 | 1 | sim |
| 15 | "Revanche de 5 minutos" (5 erros mais antigos do Caderno) como ação quando não há cronograma nem revisão | logado | 3 | 2 | depois |
| 16 | Saudação pela hora e pelo momento ("véspera de plantão?") usando os dias leves do cronograma | logado | 1 | 2 | depois |
| 17 | Questão de amostra trocando por semana, sorteada entre questões com comentário aprovado | visitante | 2 | 2 | depois |
| 18 | Lembrar a ordem dos atalhos pelo uso (quem só usa flashcards vê os flashcards primeiro) | logado | 1 | 2 | depois |
| 19 | Medir: `data-funil` nos botões do topo e dos atalhos, para comparar cliques antes e depois | todos | 2 | 1 | depois |

Descartadas: carrossel de recursos (esconde conteúdo e pesa no celular); vídeo no topo (peso e
pouco ganho); depoimentos ou número de usuários (não há dado verdadeiro); citar o tamanho do
acervo (regra da marca).

---

## 3. A proposta escolhida

### Com conta: "painel do dia"

1. **Topo** (fundo verde liso com brilho dourado suave, como a página de vendas nova):
   - à esquerda, a frase do dia com o nome, "Faltam N dias para a prova" e **um cartão de ação**:
     selo ("Cronograma de hoje"), o tema ("Quadril"), por onde começar e quanto falta, os blocos
     da meta (um por questão, enchendo em dourado), **um botão dourado** e, em linha discreta,
     "Depois: 30 questões para rever hoje";
   - à direita, **o progresso**: fogueira em pixel e "9 dias seguidos" ("Hoje já conta. Fogueira
     acesa." ou "Faltam 3 hoje para manter."), os 7 últimos dias em quadradinhos, três números
     (na semana, acerto de 7 dias, respondidas) e a trilha da jornada até a prova.
2. **Atalhos**: Treinar, Revisão (com contador), Estudar flashcards e Jogar o Torneio (miniaturas da
   biblioteca e do torneio, com véu escuro para o texto ler bem).
3. **Três cartões**: Quase lá · Onde uma sessão rende mais · Sua semana (gráfico e últimas sessões).
4. Completar perfil e a novidade dos Simulados (quando aparecem).
5. Cartão do Cronograma só para quem ainda não tem um (convite) ou está na reta final; "Até a prova"
   só para quem ainda está começando (menos de 30 respondidas).
6. Treinar por tema (porcentagem percorrida).
7. O que a prova mais cobra + recursos do assinante, lado a lado.
8. Ranking + assinatura lado a lado; Indique.

Sem cronograma, a ação do topo vira a revisão de hoje; sem revisão, o treino rápido de 10. Com
uma sessão aberta, "Continuar sessão · 6 de 15" vem antes de tudo.

### Visitante: "vitrine"

1. **Topo**: "As provas de ortopedia, *comentadas como uma aula*.", o que o site faz numa frase,
   "Criar conta grátis e treinar", "Já tenho conta · Entrar", a frase do gratuito (de
   `fraseGratis('curto')`, que respeita o limite ligado ou desligado) e as provas do acervo. Ao lado,
   **a questão de amostra para responder**.
2. Quatro pilares com ícones em pixel art.
3. O que a prova mais cobra (com a degustação de sempre).
4. Cronograma (convite com "Ver um exemplo com o meu histórico").
5. Flashcards (o quadro de sempre).
6. Até a prova (a conta do ritmo).
7. Ranking + planos, lado a lado.
8. Chamada final com o mensageiro e o CTA.
9. Os links de guias para o Google (sem mudança).

### O que continua igual

Todos os links e destinos; o convite do limite diário (`ConviteLimiteDoDia`); o pedido de perfil;
a novidade dos Simulados; os textos de gratuito via `fraseGratis`; as regras de acesso (o
visitante continua indo criar conta para responder no acervo; a amostra é só a questão de
referência, que já abria sem conta pelo link); o treino rápido usa `iniciarComAviso`, como antes;
"Flashcards" e "Torneio de Flashcards" fora do jogo, nunca "Cripta". Nenhum preço, plano, limite,
questão ou dado mudou.

### Arquivos

- `src/paginas/Inicio.tsx`: as duas páginas (vitrine e painel), a escolha da próxima ação.
- `src/componentes/inicio/AmostraRespondivel.tsx`: a questão de amostra respondível. Enunciado,
  alternativas e gabarito iguais aos do acervo (mao-0853); cada porquê resume o comentário aprovado
  em `docs/exemplos/mao-0853.json`.
- `src/estilos/paginas/InicioPainel.css`: estilos novos (prefixo `ip-`), claro e escuro, movimento
  só sem `prefers-reduced-motion`.
- `src/estado/conquistas.ts`: `emblemasQuaseLa()`, os emblemas mais perto de cair (um por família,
  só famílias de contagem simples).
- `src/componentes/CaixasAssinante.tsx`: `TrilhaJornada` exportada para o topo.
- `src/componentes/AteAProva.tsx`: tira o "São N% do acervo" (permitia deduzir o total).

### Para publicar, se aprovado

1. Olhar as capturas e ajustar textos (o título do visitante e o "Onde uma sessão rende mais" são
   sugestões).
2. Conferir no site real com uma conta sem cronograma e com uma conta gratuita.
3. Rodar `npm test`, `npx tsc --noEmit`, `npm run build` (todos passam neste branch).
4. Merge e publicação pelo fluxo de sempre.

### Capturas

- Comparação: `comparacao-computador.png`, `comparacao-celular.png` (página inteira, logado),
  `comparacao-celular-dobra.png` e `comparacao-visitante-computador.png` (primeira dobra).
- `antes/` e `depois/`: `<visitante|logado>-<largura>x<altura>-<dobra|inteira>.png`; no depois
  também 844×390, o tema escuro (`-escuro`) e a amostra respondida (`-amostra-respondida`).
