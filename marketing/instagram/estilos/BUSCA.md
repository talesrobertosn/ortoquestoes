# Busca: modelo aprovado

Tales pediu em 22/10/2026 um post "como se estivesse procurando algo no Google" e aprovou o resultado
para o arsenal ("Gostei, salve o estilo Busca como modelo"). Primeira entrega:
`posts/2026-10-22-busca-quadril/` (feed com `quadril-0022`, TARO 2016; stories com `quadril-0019`, TARO 2016).
Registre como `busca` em `historico.json` e siga a [ordem de rodízio](ORDEM.md).

| Formato | Modelo |
|---|---|
| Feed, 4 slides de 1080×1350, e stories, 2 telas de 1080×1920 | [busca/modelo.html](busca/modelo.html) |

Gere o exemplo com `node marketing/instagram/gerar.mjs marketing/instagram/estilos/busca/modelo.html`
(se o Playwright não achar o Chromium, use `CHROMIUM="C:/Program Files/Google/Chrome/Application/chrome.exe"`).
Para um post novo, copie o `modelo.html` para a pasta do post e troque os textos.

**Quando usar:** questões cujo tema vira uma pesquisa que o paciente ou o residente faria: um sintoma
("quadril estalando na virilha", "dor do lado do quadril ao deitar de lado"), um sinal ou uma dúvida de
plantão. Funciona melhor com alternativas curtas, que cabem como linhas de "As pessoas também perguntam".

**A marca:** o buscador é genérico e leva a marca Orto Questões (símbolo das três barras com a certa em
dourado). Nunca usar logotipo, nome, cores ou leiaute de outra empresa; a ideia é a experiência de buscar,
não a imitação de um site real.

## Feed (4 slides)

1. **A busca:** selo de contexto ("Pesquisado às 2h da manhã, no plantão"), gancho grande com a pergunta
   e a caixa de busca aberta com o sintoma digitado e cinco sugestões do autocompletar (a primeira com a
   pílula "cai na prova"). Rodapé com prova e ano e "Deslize para pesquisar".
2. **O resultado:** caixa de busca menor com a pergunta técnica, abas (Questões, Comentários, Provas,
   Revisão), "1 resultado que já caiu na prova", o resultado com o enunciado oficial como título e
   "As pessoas também perguntam" com as quatro alternativas (texto igual ao acervo, sem acrescentar
   pontuação). Rodapé manuscrito "comente a sua letra antes de deslizar".
3. **Trecho em destaque:** a letra e a resposta em grande, o mecanismo em um parágrafo do comentário,
   uma tabela comparativa (a linha certa em verde) e a faixa "Na prova".
4. **Por que não as outras e convite:** uma linha por distrator, depois a busca "onde treinar questões
   do TARO e do TEOT comentadas" com o resultado do Orto Questões e "Treine grátis: o caminho está no
   perfil"; @ortoquestoes e o site no rodapé.

## Stories (2 telas)

1. **7h:** selo ("A paciente pesquisou antes da consulta"), a busca com três sugestões, o resultado com
   o enunciado e as alternativas e "Responda de cabeça. A resposta sai no próximo story."
2. **12h ou 18h:** a busca curta, o trecho em destaque com a resposta, tabela e "Na prova", e abaixo
   o porquê dos distratores. Rodapé "Treine grátis: o caminho está no perfil" e o site.

O que importa fica entre 250 px e 1580 px; sem figurinha.

## Acabamento

Fundo branco com brilho verde e dourado suave nos cantos; verde `#14655E`, dourado `#B8892E` e `#E9C46A`,
tinta `#1D2327`, cinzas `#5E666D` e `#8A9299`, linhas `#E1E6EA`. Títulos em Plus Jakarta Sans, texto em
Inter, a frase manuscrita em Caveat (no máximo uma por tela). Lupa em SVG simples; nada de desenho de
anatomia. Na revisão, conferir que o texto digitado não corta na caixa de busca e que as sugestões não
quebram linha.
