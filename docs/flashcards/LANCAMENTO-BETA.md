# Roteiro de execução do beta público dos flashcards

Projeto: OrtoQuestões, Cripta do Residente. Repositório `talesrobertosn/ortoquestoes`.
Diretriz de Tales Roberto, 13/10/2026. Texto recebido na conversa e salvo aqui na íntegra, só com a formatação ajustada.

## Objetivo

- **Hoje:** publicar o beta público dos flashcards, integrando a Cripta do Residente e o modo Estudo ao restante do OrtoQuestões.
- **Depois do lançamento:** continuar o acabamento artístico, as correções e as expansões, em etapas verificáveis.

O produto deve oferecer uma experiência de RPG visualmente bonita e uma ferramenta de estudo consistente. As prioridades são qualidade visual, aprendizagem e funcionamento no celular.

## Autorização atual

**O que muda:** esta orientação substitui expressamente a restrição anterior de manter `#/flashcards` escondido e de proibir menu, banner, divulgação, ranking público e apresentação na página de planos.

**Agora estão autorizados:**
- entrada no menu principal;
- divulgação na página inicial;
- artes promocionais dentro do site;
- integração com a página de ranking;
- desempenho, revisão e cronograma de flashcards;
- apresentação dos recursos existentes na página de planos;
- aviso de beta e coleta de opiniões dos usuários;
- publicação após implementação, testes e revisão.

**Links:** preservar a URL `#/flashcards` e os links existentes.

**Acesso e preços:**
- Tales escolheu **manter as regras atuais de acesso, assinatura e limites**.
- Divulgação pública não significa acesso ilimitado gratuito.
- Não alterar preços nem inventar benefícios comerciais.

**Fora do escopo:** enviar e-mails, mensagens ou posts em redes sociais. A divulgação pedida é dentro do site.

**Dúvidas:** perguntar quando houver dúvida essencial que estas instruções e o código não resolvam. Não pedir de novo autorização para publicar por causa das restrições antigas.

## 1. Reconhecer o estado real do projeto

**Ler:**
- `AGENTS.md`;
- `docs/flashcards/README.md`, `CONTINUAR.md`, `RESUMO-CHATGPT.md`, `PASSAGEM-ETAPA1.md` e `ARTE.md`;
- as orientações de marketing do projeto.

**Antes de abrir uma branch nova:** confirmar a base de publicação (hoje `claude/pdfs-questoes-tp64dr`) e verificar os PRs recentes. Outro agente pode ter avançado.

**Mapear:**
- página inicial e menus;
- ranking geral;
- desempenho;
- revisão;
- cronograma;
- formato e seleção dos flashcards;
- persistência local e na conta;
- regras de acesso e feature flags;
- motor da Cripta;
- situação real da Torre;
- áudio e assets existentes;
- funções de servidor relacionadas às corridas.

**Diferenciar claramente:**
- implementado e funcionando;
- implementado parcialmente;
- apenas planejado.

Não anunciar como pronta uma função só porque ela aparece num documento.

**Registrar a autorização:** atualizar `AGENTS.md`, `CONTINUAR.md` e `README.md` para registrar a autorização de lançamento público, preservando o histórico das decisões.

## 2. Menu principal e central de flashcards

- **Menu:** adicionar "Flashcards" ao menu principal, incluindo a navegação móvel, com um selo discreto "Beta".
- **Central:** organizar a entrada dos flashcards como uma central clara, com:
  - Revisar flashcards;
  - Jogar a Cripta;
  - Meu desempenho;
  - Meu cronograma;
  - Revisões de hoje, quando houver dados reais;
  - Enviar opinião.
- **Estudo sem combate:** permitir estudar sem precisar entrar em combate.
- **Funcionamento em três passos:**
  1. escolha um assunto;
  2. responda e revise o flashcard;
  3. acompanhe seu aprendizado e sua progressão.
- **Login:** preservar o destino depois do login. Se a pessoa clicar num CTA e precisar entrar na conta, ela volta ao recurso que escolheu.
- **Acesso:** aplicar as regras atuais de acesso e limites.
- **Torre:** apresentá-la só conforme o estado real. Se estiver incompleta, marcar "Em desenvolvimento", sem prometer uma experiência disponível.

## 3. Página inicial e artes dedicadas

**Seção própria:** criar na página inicial uma seção para os flashcards, com acabamento visual marcante e integrada à identidade do OrtoQuestões. Não fazer só um card genérico com um ícone.

**Direção de composição:**
- floresta com profundidade e iluminação;
- entrada da masmorra ao fundo;
- herói em primeiro plano;
- baú iluminado como foco secundário;
- elementos reais do jogo distribuídos com equilíbrio;
- espaço adequado para título, texto e botões.

**Layout:**
- no computador, texto e arte podem ficar lado a lado;
- no celular, criar um recorte próprio que preserve o herói, o baú e o título, em vez de simplesmente cortar a composição do computador.

**Texto sugerido:**
- título: "Seu próximo desafio começa com um flashcard.";
- descrição: "Revise Ortopedia e Traumatologia, enfrente os desafios da Cripta do Residente e acompanhe sua evolução.";
- botões: "Treinar flashcards" e "Explorar a Cripta";
- selo: "Beta público".

**Imagens:**
- Usar imagens e capturas reais do jogo: masmorras, floresta, baús, heróis, adversários, biblioteca e recompensas existentes.
- Produzir composições dedicadas a partir desses elementos. Evitar uma captura inteira com a interface minúscula e ilegível.
- Não expor nomes, contas ou informações pessoais nas capturas.
- Não inventar aparências ou mecânicas para a propaganda.

**Três cartões ilustrados:**
- Biblioteca: revisão;
- Cripta: aventura;
- Progresso: desempenho e cronograma.

Cada cartão tem identidade visual própria, dentro de uma linguagem comum.

**Arte:** usar arte autoral do projeto, sem copiar outros jogos, baixar imagens externas ou gerar imagens por IA.

**Qualidade técnica:**
- otimizar imagens, carregamento e versões responsivas;
- respeitar movimento reduzido, contraste e legibilidade.

**Página de planos:** apresentar os recursos conforme os benefícios e limites que realmente existem, sem alterar preços.

**Sem excesso:** não espalhar banners repetidos por todas as páginas nem cobrir questões com pop-ups.

## 4. Corrigir o som no celular

**Problema confirmado por Tales:** o som funciona no PC e não funciona no celular. Investigar o código antes de atribuir uma causa.

**Verificar:**
- inicialização do contexto de áudio;
- ativação diretamente no gesto do usuário;
- retomada do contexto suspenso;
- carregamento e reprodução das faixas;
- mudo e volume;
- tratamento de falhas;
- volta depois de minimizar o navegador, de bloquear a tela e de trocar de aba;
- sobreposição de trilhas;
- listeners duplicados.

**Controles:** disponibilizar controles claros de música e de efeitos. A primeira entrada pode oferecer "Entrar com som" e "Entrar sem som". Não depender de reprodução automática obrigatória.

**Falhas:**
- distinguir bloqueio de reprodução de falha no carregamento;
- não deixar exceções silenciosas;
- não repetir tentativas de ativação a cada resposta.

**Teste em aparelho real:**
- Validar em Safari no iPhone e em Chrome no Android, em aparelhos reais quando disponíveis.
- Emulação de viewport e teste automatizado com WebKit não comprovam que o som funciona num celular real.
- Registrar o que foi efetivamente testado. Se faltar aparelho, pedir a Tales que confirme o comportamento depois da correção.

**Corrigir também:**
- a cauda do dragão fora da tela no celular;
- o escudo do herói lendário cobrindo demais o corpo;
- cortes e sobreposições em telas pequenas.

## 5. Ranking da Cripta junto do ranking geral

**Integração:** na página de ranking existente, com abas ou seções "Questões" e "Cripta".
- Preservar o cálculo e o histórico do ranking geral de questões.
- Não somar andares da Cripta com pontos de questões.

**Ranking da Cripta:**
- Indicador principal: o maior andar alcançado numa tentativa válida.
- Definir com precisão o evento de atualização, conforme o motor.
- Separar Normal e Difícil. O Fácil fica fora da competição, mas continua contando para as estatísticas pessoais de estudo.
- Definir desempates determinísticos, com dados existentes e verificáveis.
- Explicar as regras na interface.
- Exibir só o nome público, o avatar permitido, a posição e os dados pertinentes. Nunca exibir e-mail.

**Recordes antigos:**
- preservar os recordes pessoais;
- não importar automaticamente para o ranking público dados que existem só no aparelho;
- admitir na competição somente corridas verificáveis conforme a arquitetura.

**Servidor:**
- auditar as funções existentes;
- registrar a dificuldade no início da corrida e preservá-la até o fim;
- validar autorização e transições;
- impedir duplicatas e resultados arbitrários;
- não confiar em andar ou pontuação enviados livremente pelo navegador.

Se não houver validação suficiente, implementá-la antes de habilitar a competição.

**Bloqueio de infraestrutura:** se houver bloqueio real, mostrar indisponibilidade explícita, registrar o bloqueio e não declarar o ranking concluído.

**Torre:** não publicar o ranking da Torre antes de validar seu funcionamento e sua persistência.

## 6. Desempenho dos flashcards

**Onde:** adicionar uma aba "Flashcards" na área de desempenho que já existe, com acesso também pela central.

**Mostrar, conforme os dados disponíveis:**
- flashcards únicos estudados;
- total de revisões;
- acerto na primeira resposta, quando houver alternativas;
- distribuição Errei / Hesitei / Sabia;
- revisões pendentes;
- atividade por dia;
- desempenho por assunto.

**Separar a aprendizagem** da vida, das moedas, dos andares e da pontuação do RPG.

**Regras de contagem:**
- Não interpretar "Sabia" como acerto objetivo.
- Não contar cada repetição como um novo flashcard único.
- Definir o período e o denominador dos percentuais.
- Se o histórico antigo não tiver determinado campo, coletá-lo a partir da nova implementação. Não fabricar dados retroativamente.

**Eventos de estudo:** registrar com identificação do usuário, do flashcard, da sessão, do modo e do momento, conforme a arquitetura existente. Proteger contra duplicação por reenvio, recarga da página, clique duplo e reconexão.

**Cripta:** as respostas na Cripta também contribuem para o histórico de aprendizagem, com regras consistentes.

## 7. Revisão e repetição espaçada

**Área de revisão:** integrar os flashcards a ela, distinguindo-os das questões. Oferecer:
- revisões de hoje;
- Errei;
- Hesitei;
- seleção por assunto;
- nunca estudados.

Preservar imagens e comentários.

**Algoritmo:**
- Auditar se já existe um algoritmo de repetição espaçada.
- Reutilizá-lo quando compatível, mantendo um estado próprio dos flashcards.
- Se faltar, implementar e documentar uma regra explícita e testável.
- Não chamar um sorteio simples de repetição espaçada.

**Na Cripta:**
- a resposta atualiza o histórico;
- não presumir confiança autorrelatada: se não houve avaliação de confiança, o campo fica ausente;
- usar a regra definida para resposta objetiva.

**Cuidados:**
- Abrir um comentário ou recarregar a tela não deve alterar o agendamento de novo.
- Usar o fuso do usuário para "hoje" e para os vencimentos.
- Preservar os IDs e o progresso existentes.
- Não misturar erros de questões com erros de flashcards.

## 8. Cronograma de flashcards

**Onde:** ampliar o cronograma existente com uma opção ou aba de flashcards.

**Permitir configurar:**
- data-alvo;
- assuntos;
- dias disponíveis;
- ritmo diário.

Se já houver data-alvo no cronograma de questões, oferecer reaproveitá-la.

**Cálculo:**
- Separar flashcards novos de revisões vencidas.
- Calcular a meta com base no conjunto acessível e nos dias de estudo.
- Não contar o mesmo flashcard repetido como conteúdo novo.
- Informar quando a carga necessária exceder o ritmo escolhido, e permitir ajustar a data, os assuntos e a meta.

**Sessão de hoje:**
- Criar o botão "Começar a sessão de hoje", que abre a seleção correspondente ao plano.
- Não prometer que uma corrida aleatória cumpre o cronograma. Contabilizar só os flashcards efetivamente estudados que contribuam para ele.

**Tratar os casos:**
- data ausente;
- data passada;
- nenhum flashcard disponível;
- plano concluído;
- revisões acumuladas.

## 9. Aviso de beta e opinião dos usuários

**Selo Beta:** no menu, na central e na apresentação.

**Texto sugerido:** "A Cripta do Residente está em beta. Estamos aprimorando o visual, o áudio e as mecânicas. Teste e conte o que funcionou — ou o que precisa melhorar."

**Onde pedir opinião:** criar "Enviar opinião" na central e no fim das sessões.

**Perguntas sugeridas:**
- Foi fácil estudar?
- Como foi a experiência visual?
- Houve algum problema?
- O som funcionou no seu celular?
- O que você gostaria de melhorar?

**Categorias:** som, visual, desempenho, conteúdo e outro.

**Funcionamento:**
- Reutilizar o canal de feedback existente quando for adequado.
- Confirmar o envio só depois de sucesso real, e tratar as falhas.
- Não tornar a pesquisa obrigatória nem interromper todas as sessões.
- Depois de algumas sessões ou da primeira tentativa concluída, apresentar um convite discreto e dispensável.

**Privacidade:** não enviar automaticamente prints, respostas médicas, histórico detalhado ou dados pessoais. Coletar só os metadados necessários, de forma transparente.

## 10. Implementação e publicação

**Ordem sugerida:**
1. estrutura de dados e eventos necessária;
2. revisão, desempenho e cronograma;
3. ranking;
4. navegação e artes;
5. feedback;
6. validação;
7. publicação.

**Ritmo:**
- Usar PRs pequenos quando ajudar, sem publicar CTAs quebrados para funções que não existem.
- Não adiar o lançamento inteiro para concluir todos os biomas. O objetivo imediato é um beta integrado e utilizável.

**Antes de cada PR:**
- `npm test`;
- `npx tsc --noEmit`;
- `npm run build`;
- revisão visual com Playwright em 1400×860, 390×844 e 844×390, e também em 600×360 e 568×320 nas telas do jogo.

**Testar:**
- navegação;
- login e retorno;
- regras atuais de acesso;
- partidas antigas;
- salvamento e retomada;
- sessão nova;
- revisão;
- cálculo do cronograma;
- ranking por dificuldade;
- falhas de rede;
- feedback;
- teclado e foco;
- contraste;
- movimento reduzido.

**Testes automáticos relevantes para:**
- contagem única;
- deduplicação;
- agendamento;
- fuso;
- metas;
- validação de corridas.

Capturas comprovam a apresentação visual; não comprovam o áudio.

**Se houver migração:**
- seguir as instruções do projeto;
- salvar em `supabase/colar-no-painel/`;
- enviar o SQL completo na conversa para Tales copiar;
- não marcar como aplicada sem evidência;
- preservar dados, acessos e histórico;
- preferir mudanças aditivas.

**Publicar:** abrir PR para a base confirmada, resolver os apontamentos pertinentes e publicar conforme a autorização atual.

**Depois de publicar, verificar:**
- workflow de deploy;
- site publicado;
- links;
- assets;
- fluxos principais.

**Bloqueios:** se houver um bloqueio concreto, explicar o impacto. Não esconder uma falha funcional atrás do selo Beta.

## 11. Critérios de conclusão do lançamento

- Flashcards no menu principal.
- Seção dedicada na página inicial.
- Artes com elementos reais do jogo.
- Estudo e Cripta acessíveis conforme as regras atuais.
- Ranking integrado e validado.
- Desempenho funcionando.
- Revisão funcionando.
- Cronograma funcionando.
- Canal real de feedback.
- Comunicação de beta.
- Progresso antigo preservado.
- Verificação do áudio no celular, com as limitações do teste declaradas.

Qualquer exceção deve aparecer claramente no relatório.

## 12. Continuar depois do lançamento

Depois de publicar, organizar o backlog e continuar em etapas.

1. **Falhas reais:**
   - áudio no celular;
   - travamentos;
   - dados e persistência;
   - cortes;
   - acessibilidade.
2. **Acabamento:**
   - raptor, mímico e esqueleto;
   - Torre e Salão pintados;
   - dragões escarlate e ancestral;
   - emenda da faixa "sala";
   - impactos;
   - transições musicais.
3. **Herói:**
   - evolução corporal expressiva;
   - postura e animações;
   - equipamentos visíveis;
   - aparências alternativas sem vantagem competitiva.
4. **Mundo:**
   - novos biomas, NPCs e encontros;
   - composição e identidade próprias, evitando cenários que sejam só recolorações.
5. **Gameplay:**
   - builds, sinergias e decisões de risco;
   - chefes com fases;
   - mecânicas que mantenham o conhecimento determinante, sem favorecer respostas aleatórias.
6. **Torre:**
   - persistência validada;
   - mapa e checkpoints;
   - marcos nos andares 10, 25, 50, 75 e 100;
   - ranking independente, depois de validado.
7. **Aprendizagem:**
   - refinar revisão e cronograma com dados reais;
   - incorporar a opinião dos usuários;
   - preservar conteúdo médico, gabaritos e comentários neste escopo.

Não parar na publicação do beta. Prosseguir nas etapas viáveis, com PRs e documentação atualizada.

## 13. Direção artística permanente

A Cripta deve parecer um RPG de verdade.

**Buscar:**
- cenários belíssimos, com profundidade e iluminação própria;
- personagens memoráveis;
- materiais legíveis;
- animações expressivas;
- interface integrada ao mundo;
- efeitos com identidade;
- áudio coerente;
- bom desempenho no celular.

**Referências de qualidade:**
- Octopath Traveler: profundidade e iluminação.
- Stardew Valley: encanto ambiental e detalhes.
- Hades: personalidade e resposta do combate.
- Hearthstone e Legends of Runeterra: cartas, recompensas e apresentação.

Manter a identidade autoral, sem copiar assets. Cada melhoria precisa contribuir para a diversão, a aprendizagem ou a qualidade visual. Evitar adicionar quantidade sem acabamento.

## 14. Relatório de cada entrega

Atualizar `docs/flashcards/RESUMO-CHATGPT.md` e informar:
- o que mudou e onde o usuário encontra;
- o link do PR e o link publicado;
- evidências visuais do computador e do celular;
- os checks executados;
- a validação do áudio e suas limitações;
- as migrações aplicadas ou pendentes;
- a confirmação de que os acessos e limites foram preservados;
- as limitações atuais do beta;
- como enviar opinião;
- a próxima etapa.

Distinguir sempre o que foi implementado, publicado, validado e apenas planejado.


---

## Andamento (13/10/2026, noite)

Feito: seções 1 (docs), 2 (menu e central), 3 (página inicial, com o ajuste do Tales: quadro à direita
do herói no computador, faixa no celular, começar por "Flashcards"), 5 (ranking), 6 (desempenho),
7 (revisão), 8 (cronograma), 9 (opinião) e a correção de som da seção 4. Detalhes em CONTINUAR.md.

Pendente: validação do som em aparelho real (Tales), cauda do dragão e escudo do herói lendário no
celular, cortes em telas pequenas, e as prioridades pós-lançamento da seção 12.
