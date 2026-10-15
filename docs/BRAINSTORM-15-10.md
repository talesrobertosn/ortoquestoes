# Brainstorm de 15/10/2026: caminho até a versão Gold

Pedido do Tales: "faça um brainstorm, tenha novas ideias, adicione novas coisas. Sempre com design
bonito e experiência de usuário fluida". Fora do escopo, por orientação dele: página inicial, Treinar,
Flashcards (e `src/flashcards/`), Cronograma, Desempenho e Ranking.

Como foi feito: o app rodou localmente (`VITE_SUPABASE_URL=sem npx vite --port 5201`) e foi
percorrido com Playwright em 1400×860 e 390×844, com uma conta de teste só na memória do navegador
(uma sessão de 5 questões de Mão, duas erradas no histórico, duas favoritas). Capturas antes e
depois em `/tmp/claude-0/capturas-brainstorm/` (fora do repositório).

Legenda: **[feito]** entrou neste trabalho · valor e esforço de 1 (baixo) a 3 (alto).

---

## 1. Achados por página

### Sessão de questões (`#/sessao`) e questão avulsa (`#/questao/ID`)

O coração do produto já está muito bom: atalhos 1–5, Enter, setas, riscar com Shift, grifo, desfazer,
dica de deslizar, rolagem até o comentário ao errar, pré-carregamento do próximo comentário.

- **Bug de leitura no contador** [feito]: "2 de 5" aparecia como **"8 de S"**. A Pixelify Sans em
  0,95 rem desenha o 5 igual a um S e o 2 parecido com 8. A mesma fonte deixava a dica "Use as setas…
  para trocar de questão" com cara de "troear". O próprio `tokens.css` já registrava que a Jersey 10
  lê melhor (`--fonte-pixel-titulo`).
- **Comentário longo no celular** [feito]: o comentário de `mao-0853` passa de 7.800 px no celular.
  Para seguir, a pessoa precisava rolar tudo até o "Próxima" do rodapé (ou descobrir o deslizar).
- **Confiança só no mouse** [feito]: dava para escolher e confirmar pelo teclado, mas "Tenho dúvida"
  e "Foi um chute" exigiam o mouse, e é justamente a confiança que alimenta a revisão espaçada.
  O modo leitura também não tinha atalho.
- **Feedback seco ao responder** [feito]: o aviso "Você acertou/errou" aparecia sem nenhuma transição;
  o resto do site (combo, XP, emblemas) é bem mais vivo.
- Na barra de XP, o bloco da questão atual fica dourado mesmo depois de respondida: o vermelho ou
  verde só aparece ao sair dela. (Ideia 9.)
- Ao errar, a rolagem suave até o comentário tira da tela o aviso "Você errou" e a alternativa marcada
  quase imediatamente. Funciona (é proposital, para mostrar o conceito), mas um resumo fixo
  "Você marcou B · Gabarito A" no topo do comentário ajudaria a não perder o contexto. (Ideia 10.)
- Sem conta, responder abre o "Crie sua conta para responder"; correto e claro.

### Caderno de erros (`#/erros`)

Bonito e útil (o herói, "Errou com certeza", "Entender o erro", "Refazer").

- **Bug no celular** [feito]: os dois quadros do herói ("Já corrigidos" e "Errou com certeza") saíam
  um com meia largura e o outro com largura inteira. A regra geral de `.rv-heroi__numeros` esticava
  sempre o último; agora só estica quando a quantidade é ímpar.
- No vazio, a cena do mensageiro usa a Pixelify no "Zzz", e o "z" grande parece um "2".

### Favoritas (`#/favoritas`)

- **Era a página mais crua do site** [feito]: título solto, lista de texto sem cartão, botão
  "Treinar as  2  favoritas" com espaço sobrando em volta do número, nenhuma informação sobre a
  situação de cada questão. Destoava do Caderno de erros e da Revisão, que foram refeitos.

### Conquistas (`#/conquistas`)

- Muito rica (204 emblemas, família, próximas). No celular, a grade fica longa; o filtro "Próximas"
  já ajuda. Sugestão: destacar no topo os 3 emblemas mais perto de cair ("faltam 2 questões"),
  que é o que puxa a pessoa de volta. (Ideia 6.)

### Minha conta, Indicar, Ligas, Temas que mais caem, Resumo

- Sem Supabase, Ligas e Temas que mais caem ficam no esqueleto de carregamento e Indicar mostra
  "Não foi possível carregar o seu link". É o esperado no ambiente local, mas vale conferir no site
  publicado se há um estado de erro com "Tentar de novo" quando a rede falha (hoje o esqueleto
  pode ficar para sempre). (Ideia 12.)
- Resumo sem sessão: estado vazio correto, mas poderia oferecer "Rever a última sessão" a partir do
  histórico (o histórico das últimas 50 sessões já existe no aparelho). (Ideia 11.)

### Apoio, Projeto, Termos, Condições, 404

- Visual coerente. A 404 em pixel art ("Esta trilha não existe") está ótima.
- Suporte: no celular, a página é longa (passo 1, passo 2, modelos); está clara e não precisa mexer.

### Desempenho (só anotado, fora do escopo)

- Com um único erro na revisão e nenhuma revisão feita, "Acerto nas revisões" mostra **0%** e
  "−33 pontos sobre a 1ª vez". Sem revisões, o certo seria "—" e "ainda sem revisões". Fica para
  quando o Tales liberar mexer no Desempenho.

---

## 2. Ideias novas, priorizadas (valor × esforço)

Todas sem mudar preço, limites, gabaritos, comentários ou dados. Nenhuma precisa de SQL novo,
salvo onde está indicado.

| # | Ideia | Para quê | Valor | Esforço |
|---|-------|----------|-------|---------|
| 1 | **[feito]** "Próxima" na barra fixa da sessão depois de responder | fluidez no celular | 3 | 1 |
| 2 | **[feito]** Atalhos S/D/C para a confiança e L para o modo leitura | aprendizagem (confiança honesta) | 2 | 1 |
| 3 | **[feito]** Microinteração de acerto e erro (respeita movimento reduzido) | prazer de estudar | 2 | 1 |
| 4 | **[feito]** Favoritas refeitas: herói, situação de cada uma, filtro, "Só as que errei", desfazer | retenção | 2 | 1 |
| 5 | **[feito]** Contador legível e herói do Caderno no celular | polimento | 2 | 1 |
| 6 | "Quase lá" nas Conquistas e no fim da sessão: os 3 emblemas mais perto de cair | retenção | 3 | 1 |
| 7 | "Explique com suas palavras" depois de errar com certeza: uma caixa curta que vira anotação da questão (já existe `NotasQuestao`) | aprendizagem real (autoexplicação) | 3 | 1 |
| 8 | Sessão "Revanche de 5 minutos": 5 questões do Caderno de erros mais antigas, um toque na página inicial do assinante e no Resumo | retenção | 3 | 2 |
| 9 | Bloco da barra de XP já colorido (verde/vermelho) na questão atual depois de respondida, com contorno de "atual" | clareza | 1 | 1 |
| 10 | Resumo fixo "Você marcou B · Gabarito A" no topo do comentário ao errar | leitura no celular | 2 | 1 |
| 11 | No Resumo vazio, "Rever a última sessão" a partir do histórico | fluidez | 1 | 1 |
| 12 | Estado de erro com "Tentar de novo" em Ligas, Temas que mais caem e Indicar quando a rede falha | confiança no produto | 2 | 1 |
| 13 | Índice do comentário longo no celular: chips "Conceito · A · B · C · D" que levam a cada parte | leitura no celular | 2 | 2 |
| 14 | Intercalar automaticamente 1 questão de revisão a cada 5 novas na sessão do cronograma (ritmo de prática intercalada), como opção | aprendizagem real | 3 | 2 |
| 15 | "Calibração da semana": quantas vezes "certeza" virou erro, com um convite para refazer só essas | metacognição | 2 | 2 |
| 16 | Para o gratuito, no Resumo, uma linha honesta do que a assinatura liberaria **nesta** sessão (ex.: "a turma de cada alternativa", "o cronograma te diria o tema de amanhã"), só com benefícios que já existem | conversão | 3 | 1 |
| 17 | Na questão avulsa (página que o Google abre), depois de responder, "Mais 5 deste assunto" que monta a sessão na hora | conversão de visitante | 3 | 1 |
| 18 | Modo "Prova de bolso": 10 questões cronometradas em 15 min, com o tempo médio da banca | treino de prova | 2 | 2 |
| 19 | Lembrete de "fila de revisão vencendo" no próprio site (selo no menu), sem e-mail | retenção | 2 | 1 |
| 20 | Compartilhar uma questão como imagem bonita (enunciado + "você acertaria?") para grupos de residência, usando os modelos HTML do marketing | aquisição | 2 | 2 |

Sugestão de ordem para os próximos dias: 6, 7, 17, 16, 10, 12, depois 8 e 14.

---

## 3. O que foi implementado neste trabalho

1. **Contador e dicas legíveis na sessão.** Contador "X de N", combo e dica de deslizar/setas passam
   da Pixelify (que confundia 5 com S e c com e) para a Jersey 10, a fonte de pixel que o site já
   usa nos títulos. `src/estilos/paginas/Sessao.css`.
2. **"Próxima" na barra fixa.** Respondida a questão atual, a barra do topo ganha um botão
   "Próxima" (ou "Concluir" na última), que respeita a regra do limite gratuito exatamente como o
   botão do rodapé (usa a mesma função `avancar`). No celular, o "Mapa" vira só ícone para caber.
   `src/paginas/Sessao.tsx`.
3. **Atalhos de confiança e de leitura.** `S` (tenho certeza), `D` (tenho dúvida) e `C` (foi um
   chute) antes de confirmar; `L` alterna o modo leitura depois. Aparecem na dica do rodapé da
   questão, no título de cada botão e no painel de atalhos (`?`). Não valem em simulado nem em
   dissertativa. `src/componentes/CartaoQuestao.tsx`, `src/componentes/Atalhos.tsx`.
4. **Microinteração ao responder.** Só na resposta de agora (rever uma questão não anima): acerto
   faz o aviso crescer de leve e o ✓ dar um pulinho, com um brilho na alternativa certa; erro faz o
   aviso balançar curto, sem alarme. Com "reduzir movimento" do sistema, nada se mexe.
   `src/estilos/paginas/CartaoQuestao.css`.
5. **Favoritas refeitas.** Herói no padrão da Revisão e do Caderno (dourado, da estrela), contagem
   de "Errou na última" e "Ainda não respondidas", treino de todas ou só das que errou, filtro por
   situação, cartões com assunto (respeitando "esconder etiquetas"), selo de situação, data da última
   resposta e "Desfazer" ao tirar a estrela. A mais recente aparece primeiro.
   `src/paginas/Favoritas.tsx`, `src/estilos/paginas/Favoritas.css`.
6. **Herói do Caderno de erros no celular.** Com dois números, os quadros ficam lado a lado.
   `src/estilos/premium.css`.

Nada disso muda questões, gabaritos, comentários, preços, limites, dados de usuários ou SQL.
