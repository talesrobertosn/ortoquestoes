# Conversa do grupo R+: modelo aprovado

Tales aprovou em 19/10/2026 ("Ficou insano. Salvar na nossa lista de futuros modelos"). Primeira entrega: `posts/2026-10-19-checagem-patela/` (feed com `trauma-0570`, TEOT 2024, patela bipartida). Registre como `conversa-de-grupo` em `historico.json` e respeite os 2 dias entre usos.

| Estilo | Formato | Modelo |
|---|---|---|
| Conversa do grupo R+ | feed, 6 slides de 1080×1350 | [conversa-de-grupo/modelo.html](conversa-de-grupo/modelo.html) |

Gere com `node marketing/instagram/gerar.mjs marketing/instagram/estilos/conversa-de-grupo/modelo.html`. A tela do Cronograma da prévia de link vem de `marketing/kit/telas/` (recapture no dia do post, tema claro, para o "faltam N dias" bater).

**A ideia:** um print de conversa do grupo dos residentes ("R+ Ortopedia") no plantão da madrugada. O R1 (o "você" da conversa, balões verdes à direita) manda a imagem e pergunta; a R2 e o R3 discutem, encaminham a questão oficial, abrem uma enquete, dão o zoom e fecham com a resposta e a chamada. O leitor se vê no R1.

**Quando usar:** questões de imagem com caso clínico de pronto-socorro ou enfermaria (trauma, pediatria, infecção), em que a dúvida "é isso ou aquilo?" rende conversa. Funciona melhor com imagem de pelo menos 450 px de largura.

## Os 6 slides

1. **O caso:** data "Hoje · plantão", o R1 manda a imagem real grande com o caso em uma ou duas linhas e a dúvida em negrito. No topo, "Fulana está digitando…".
2. **A discussão:** a R2 pergunta o dado clínico que decide, o R1 responde, o R3 diz em que prova caiu e encaminha **o enunciado oficial completo** (etiqueta da prova e ano).
3. **A enquete:** enquete do R3 citando a foto do R1, com as quatro alternativas oficiais e as letras A a D, "Selecione uma opção" e "Ver votos". Aviso amarelo: "Comente a sua letra no post antes de arrastar".
4. **O zoom:** recorte ampliado da mesma imagem (sem seta nem marcação) e três pistas numeradas em balões curtos. No topo, "Fulano está digitando…".
5. **O veredito:** a enquete com a certa marcada ("Correta") e uma linha curta por alternativa errada, a dica "Na dúvida..." e uma piada leve de plantão para fechar.
6. **A chamada:** o R1 pergunta "Como vocês sabem tudo isso?", o R3 responde com a prévia de link do Orto Questões (tela real do Cronograma), a data da prova com "Fique pronto, prepare-se" e a frase do cronograma. Rodapé verde com o botão "Treine grátis" e "Crie sua conta grátis agora mesmo e conheça outras questões".

## Acabamento

- Visual de aplicativo de mensagens genérico, **sem nome nem logotipo de aplicativo**: barra de status, cabeçalho branco com o avatar "R+", fundo bege `#EFEAE2` com desenhos suaves, balões brancos e verde-claro `#D9FDD3`, tiques azuis, enquete com a cor `#00A884`.
- Faixa verde-escura `#0E2E2A` no pé com a marca, "Conversa ilustrativa" e o número do slide (1/6 →).
- Nomes fictícios com o ano da residência (Lucas R1, Bia R2, Rafa R3); cores fixas por pessoa. Horários na madrugada, avançando de minuto em minuto.
- Mensagens curtas (uma ou duas linhas); só o enunciado encaminhado é longo. Sem emoji.

## Revisão antes de entregar

- [ ] Enunciado, alternativas e gabarito iguais ao acervo; o enunciado oficial aparece inteiro no slide 2.
- [ ] Imagem real sem marcação nova; o zoom é só recorte; sem a borda branca do arquivo original aparecendo.
- [ ] "Conversa ilustrativa" na faixa; nada que pareça depoimento real de pessoa ou marca de aplicativo.
- [ ] Nenhum balão cortado pelo cabeçalho ou pela barra de digitar; "faltam N dias" da prévia igual ao dia do post.
