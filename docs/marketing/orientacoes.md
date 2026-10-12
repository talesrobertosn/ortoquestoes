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

- Cirurgia da mão é outra especialidade e tem prova própria; não apresentar como R4 de ortopedia (orientação de 08/10/2026).
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
- **Não repetir questão já publicada:** antes de escolher, conferir `marketing/instagram/publicadas.md` e buscar o id em `marketing/instagram/posts/`. Ao entregar um post, anotar o id nessa lista (orientação de 08/10/2026).
- Conteúdo médico sempre de uma questão real do acervo (com o id) e do comentário dela; nada inventado.
  Enunciado, alternativas e gabarito iguais aos do acervo.
- **Legenda: no máximo 5 hashtags** (o Instagram recusa mais que isso). Orientação de 09/10/2026.
- **Legenda sem endereço do site e sem a palavra "link":** o Instagram entrega menos o post que tenta
  levar o usuário para fora. A legenda leva para o **perfil** (onde o site já está na bio), por
  exemplo "Treine grátis: o caminho está no nosso perfil, @ortoquestoes" ou "Mais no nosso perfil".
  Orientação de 09/10/2026.
- **Site escrito dentro da imagem pode e é bom** ("ortoquestoes.com.br" no último slide ou story): o
  dono gosta e não é clicável. O que evitar é link **clicável**: na legenda, nos comentários e a
  figurinha de link nos stories.
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

## Outros agentes (Codex)

Quando o post for feito por outro agente, ele deve seguir o roteiro passo a passo de
[docs/prompts/codex-instagram.md](../prompts/codex-instagram.md). Ponto central: as imagens **não**
são geradas por IA de imagem (nada de ultrarrealista, foto, ilustração ou 3D); são HTML e CSS a partir
dos modelos de `marketing/instagram/estilos/`, transformados em PNG por `marketing/instagram/gerar.mjs`.
Para os simulados de questões, o roteiro é [docs/prompts/codex-simulados.md](../prompts/codex-simulados.md).

## Rotina de cada post

1. Escolher a questão (TEOT ou TARO de preferência, de um tema diferente do dia anterior) e ler o
   comentário dela.
2. Criar a pasta `marketing/instagram/posts/AAAA-MM-DD-<slug>/` com `post.html` e `LEGENDA.md`
   (ordem de publicação, horários, legenda e conferência com o id da questão).
3. Gerar as imagens: `node marketing/instagram/gerar.mjs <post.html>` e olhar uma a uma (texto
   cortado, sobreposição, acentos, contador).
4. Registrar em `marketing/instagram/estilos/historico.json`.
5. Commit, push e mandar as imagens e a legenda para o dono.

## Novos modelos aprovados em 11/10/2026
Tales aprovou **Cofre de duas chaves** (feed) e **Mecânica fina / Relojoaria anatômica** (stories, versão final com questão de mão) para reutilização futura por Claude e Codex. São opções do arsenal, não padrão obrigatório. Preservar acabamento profissional, cantos arredondados, imagem médica original e metáfora ligada ao raciocínio. [Guia completo e modelos executáveis](../../marketing/instagram/estilos/COFRE-E-MECANICA-FINA.md). A aprovação visual não significa revisão médica nem publicação no Instagram.

## Novos modelos aprovados em 12/10/2026
Tales aprovou a **Tabela de Snellen** (feed, para questões em que uma palavra do enunciado decide) e o **Cupom fiscal** (stories de propaganda, com preço conferido em `src/dados/planos.ts`), com o pedido de "salvar modelo para o futuro". Os dois são opções do arsenal. [Guia completo e modelos executáveis](../../marketing/instagram/estilos/SNELLEN-E-CUPOM.md).

## Entregar antes de pedir (orientação de 12/10/2026)
Em propaganda, comece entregando algo útil, de preferência uma questão real com a resposta e a explicação, e só depois peça algo em troca (seguir, testar, entrar no site). A propaganda vem leve e sem preço. Se algum valor precisar aparecer, que seja bem pequeno. O Cupom fiscal na versão "questão primeiro" é o modelo desse formato.

## VAR da questão aprovado em 12/10/2026
Tales aprovou o **VAR da questão** (feed e stories): visual de transmissão esportiva em que cada alternativa é revisada como um lance, anulado ou gol validado. É bom para questões de pares ou combinações de itens. [Guia completo e modelo executável](../../marketing/instagram/estilos/VAR-DA-QUESTAO.md).

## Story de propaganda com figurinha de link (orientação de 12/10/2026)
A pedido do Tales, o story de propaganda pode trazer um botão "Treine grátis" e um espaço livre para a figurinha de link, que leva direto para criar a conta. É a exceção à regra "stories sem figurinha", que continua valendo para os stories de questão. O link é sempre marcado (utm) para o Admin mostrar de onde veio o cadastro, por exemplo `https://ortoquestoes.com.br/?utm_source=instagram&utm_medium=stories&utm_campaign=treine-gratis#/conta?modo=criar&voltar=%2Ftreinar`. Troque o `utm_campaign` a cada story para comparar. Modelo: `marketing/instagram/posts/2026-10-12-story-treine-gratis/`.
