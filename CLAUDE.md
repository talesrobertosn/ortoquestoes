# Orientação permanente para Claude

Leia [AGENTS.md](AGENTS.md). Todo trabalho de comentários segue
[docs/padrao-editorial-comentarios.md](docs/padrao-editorial-comentarios.md):
aula independente, fundamentos e mecanismos explicados, e análise rica de todas
as alternativas, inclusive a correta. Essa diretriz do dono do projeto substitui
regras antigas de brevidade, limites de caracteres e proibição de tabelas/listas.

Referência aprovada: [docs/exemplos/mao-0853.json](docs/exemplos/mao-0853.json).

**Capítulo enviado pelo Tales ("faça resumo disso", "questões e resumo", PDF sem comentário):** siga sozinho, sem pedir
confirmação, o roteiro [docs/biblioteca/PILOTO-AUTOMATICO.md](docs/biblioteca/PILOTO-AUTOMATICO.md): o que cada pedido curto
quer dizer, OrtoQuestões Simulados primeiro, resumo no mesmo jeito de escrever dos anteriores, conferir e publicar.
Consultar o acervo atual, usar os scripts de aplicação/validação, preservar o
gabarito e salvar em branches e PRs revisáveis conforme o pedido.

## Arsenal de marketing aprovado
Para posts, leia [docs/marketing/orientacoes.md](docs/marketing/orientacoes.md). Tales aprovou em 11/10/2026 os modelos **Cofre de duas chaves** (feed) e **Mecânica fina / Relojoaria anatômica** (stories, versão final de mão). Veja [o guia de reutilização](marketing/instagram/estilos/COFRE-E-MECANICA-FINA.md): quando escolher cada um, roteiro, acabamento, HTMLs executáveis e revisão. São opções criativas do arsenal; adapte à questão, sem repetir mecanicamente ou substituir os outros estilos.

Em 12/10/2026, Tales também aprovou a **Tabela de Snellen** (feed de questão em que a linha miúda decide) e o **Cupom fiscal** (stories: primeiro uma questão com a resposta, depois uma propaganda leve e sem preço; a variante com preço só a pedido). Veja [o guia](marketing/instagram/estilos/SNELLEN-E-CUPOM.md).

Também em 12/10/2026, Tales aprovou o **VAR da questão** (feed e stories: cada alternativa revisada como um lance de futebol). Veja [o guia](marketing/instagram/estilos/VAR-DA-QUESTAO.md).

Também em 12/10/2026, Tales aprovou o **Treine grátis** (story de propaganda com MacBook e iPhone, botão "Treine grátis" e espaço para a figurinha de link com utm, que abre direto em criar conta). Veja [o guia](marketing/instagram/estilos/TREINE-GRATIS.md).

Kit de posts (15/10/2026): [marketing/kit/README.md](marketing/kit/README.md) traz os modelos aprovados parametrizados por JSON, a fila das próximas 30 postagens e o ciclo em um comando (`node marketing/kit/renderizar.mjs <NN>`). Prompt para o Codex: [docs/prompts/codex-post-rapido.md](docs/prompts/codex-post-rapido.md).

Em 16/10/2026, Tales aprovou como modelo o trio **Embarque** (feed: cartão de embarque), **Exame de DNA** (stories de questão: "quem é o pai?") e **Créditos finais** (stories de propaganda com tudo o que o site tem e "Treine grátis"). Veja [o guia](marketing/instagram/estilos/EMBARQUE-DNA-CREDITOS.md).

Em 16/10/2026, Tales definiu o **modelo padrão** de posts (stories e feed): o lançamento da Biblioteca de Resumos, com telas reais do site editadas (MacBook e iPhone, lupas com moldura dourada e pinos numerados), cor dominante verde ou branca. Quando ele pedir "no modelo padrão", use este. Veja [o guia](marketing/instagram/estilos/MODELO-PADRAO.md).

Em 18/10/2026, Tales aprovou para o arsenal o **Laboratório de patologia** (feed: lâmina na ocular, laudo com pinos) e a **Raspadinha da prova** (stories). Veja [o guia](marketing/instagram/estilos/LABORATORIO-E-RASPADINHA.md).

Em 19/10/2026, Tales aprovou a **Caderneta de topografia** (feed) e o **Bingo da prova** (stories). Veja [o guia](marketing/instagram/estilos/CADERNETA-E-BINGO.md). Também pediu que os estilos sigam uma **ordem fixa de rodízio**, sem sortear nem repetir: rode `node marketing/instagram/estilos/ordem.mjs` antes de cada post ([regras](marketing/instagram/estilos/ORDEM.md)). Stories nunca levam figurinha de link (tira o alcance da página).

## Telas do site
Regra do Tales (19/10/2026): a tela começa **sempre limpa**, só com o essencial. O resto (mapa, Pomodoro, placar, atalhos, dicas) fica como **opção visível** para a pessoa adicionar, como o botão "Personalizar" da sessão; nunca ligado de entrada.
