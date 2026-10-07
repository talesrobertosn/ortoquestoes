# Orientações de marketing do Orto Questões

Documento permanente para qualquer agente (Claude, ChatGPT Codex ou outro) que for criar conteúdo
de divulgação. Decisões do dono do projeto, Tales Roberto. Atualizar sempre que uma nova orientação
for dada. Detalhes técnicos dos posts em [marketing/instagram/README.md](../../marketing/instagram/README.md)
e o catálogo de estilos em [marketing/instagram/estilos/ESTILOS.md](../../marketing/instagram/estilos/ESTILOS.md).

## Público

Residentes de ortopedia (R1 a R3) que se preparam para o TARO e o TEOT, e candidatos às provas de
subespecialidade. Tempo curto, rotina de hospital, cansaço no fim do dia. O conteúdo precisa ensinar
algo em poucos segundos e dar vontade de responder.

## Quando postar (orientação de 07/10/2026)

| Horário | Por quê | Uso |
|---|---|---|
| **7h às 8h** | O residente costuma ter tempo antes da rotina | Horário principal: feed e primeiro story |
| **12h (almoço)** | Segundo momento livre | Story de resposta ou segundo post |
| **18h às 19h** | Mais cansado, mas é quando o site tem mais acesso | Story de resposta, chamada para o site |

- **No máximo 2 posts de feed por dia**, para não parecer que está inundando o seguidor. O normal
  é 1 de feed pela manhã.
- Stories podem acompanhar: a pergunta de manhã e a resposta no almoço ou à noite.

## Regras da marca (todas permanentes)

- Nome por extenso: **Orto Questões**. Sem emoji. Não mencionar IA nos posts.
- Não citar o número total de questões do acervo. O destaque é serem as questões das provas oficiais,
  comentadas.
- Não citar nomes de cursos preparatórios; "SBQ" vira "Fellowship de Quadril".
- Telas com dados de exemplo levam a nota "Tela ilustrativa".
- **Stories sem figurinha:** nada de quiz, enquete, sim/não, caixa de pergunta nem link. O Instagram
  entrega menos o story que tira o usuário do aplicativo. O story é uma imagem simples para baixar e
  postar; a pergunta vai escrita e a resposta sai no story seguinte.
- **Sem desenho de anatomia:** nada de SVG ou CSS que imite osso, articulação, músculo, nervo ou vaso.
  Para uma marca de ortopedia, qualquer coisa parecida com erro anatômico é inadmissível. Usar a imagem
  real da questão ou só texto com apresentação criativa; objeto simples (parafuso, ícone) só de vez em
  quando.
- Conteúdo médico sempre de uma questão real do acervo (com o id) e do comentário dela; nada inventado.
  Enunciado, alternativas e gabarito iguais aos do acervo.
- Ao entregar um post, mandar a **legenda do feed como texto** na conversa, além da `LEGENDA.md`
  (no celular é mais fácil de copiar).

## Estilos que funcionam (e como escolher)

- **Esperar pelo menos 2 dias para repetir um estilo** (feed ou stories; orientação de 07/10/2026).
  Exemplo: cartaz de cinema postado em 07/10, o próximo cartaz só a partir de 10/10. Antes de criar,
  conferir `marketing/instagram/estilos/historico.json`.
- Stories podem usar o mesmo estilo do feed do dia (teaser de manhã, resposta à noite).
- Favoritos do dono: **Cartaz de cinema** (stories; "fenomenal") e **Jornal** (feed).
- Um post bom tem: gancho na capa sem entregar a resposta, a questão real com "comente a sua letra",
  a explicação em passos e a resposta no fim, com uma frase "para a prova".
- Estilos novos são bem-vindos; quando um for aprovado, vira modelo em `marketing/instagram/estilos/`.

## Rotina de cada post

1. Escolher a questão (TEOT ou TARO de preferência, de um tema diferente do dia anterior) e ler o
   comentário dela.
2. Criar a pasta `marketing/instagram/posts/AAAA-MM-DD-<slug>/` com `post.html` e `LEGENDA.md`
   (ordem de publicação, horários, legenda e conferência com o id da questão).
3. Gerar as imagens: `node marketing/instagram/gerar.mjs <post.html>` e olhar uma a uma (texto
   cortado, sobreposição, acentos, contador).
4. Registrar em `marketing/instagram/estilos/historico.json`.
5. Commit, push e mandar as imagens e a legenda para o dono.
