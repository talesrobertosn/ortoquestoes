# Grupo R+: cotovelo do lactente (feed) · Grupo R+: subescapular (stories)

Gerar:

```
node marketing/instagram/gerar.mjs marketing/instagram/posts/2026-11-01-grupo-cotovelo-lactente/post.html
node marketing/instagram/gerar.mjs marketing/instagram/posts/2026-11-01-grupo-cotovelo-lactente/stories.html
```

Estilo **Conversa do grupo R+** (modelo `estilos/conversa-de-grupo`, aprovado em 19/10/2026), no feed e nos stories (stories adaptados para 1080×1920 como em `posts/2026-10-20-grupo-perthes`). Pedido do Tales em 01/11/2026 ("post story e feed no estilo conversa whatsapp"), que passa na frente da ordem de rodízio. O último uso foi em 20/10, bem mais de 2 dias antes.

A tela do Cronograma da prévia de link (`marketing/kit/telas/t-cel-cronograma-01-11.png`, tema claro, cartão do crachá escondido) mostra "faltam 70 dias", certo para 01/11/2026. Se o post sair em outro dia, recapture:

```
npm run build && npx vite preview --port 4175   # em outro terminal
E='.cp-tour,.aviso-termos,.status-sincronia,[class*=sincron],[class*=sync],.cracha-perfil'
ESCONDER="$E" node marketing/instagram/telas.mjs 'cel-cronograma=cronograma@main'
```

| Quando | O quê | Arquivos |
|---|---|---|
| 7h às 8h | Feed, carrossel de 6 (conversa do grupo R+) | `f1-caso`, `f2-discussao`, `f3-enquete`, `f4-zoom`, `f5-veredito`, `f6-treine` |
| 12h (almoço) | Stories da pergunta | `s1-caso`, `s2-enquete` |
| 18h às 19h | Story da resposta, com a chamada no próprio desenho | `s3-veredito` |

Os três stories vão **sem figurinha**.

## Legenda do feed

3h07 no plantão: "12 meses, cotovelo inchado, não mexe o braço. Pronação dolorosa? Já faço a manobra?". O grupo dos R+ segurou antes.

O responsável não sabe se houve trauma, não há febre, e a radiografia é do TARO 2025. Vote na enquete do terceiro slide e comente a sua letra antes de ver a resposta.

A prova teórica do TEOT e do TEPOT é em 10 de janeiro de 2027. Fique pronto, prepare-se. Com o nosso cronograma, você faz o maior número de questões possível sem se cansar tanto: nós planejamos tudo para você.

Conheça outras questões das provas oficiais, comentadas. Treine grátis e crie sua conta agora mesmo: o caminho está no perfil, @ortoquestoes.

#ortopedia #residenciamedica #ortopediapediatrica #taro #ortoquestoes

## Conferência

- Feed: `pediatria-0525` (TARO 2025). Enunciado e alternativas iguais ao acervo (o enunciado vai inteiro, encaminhado, no slide 2; a enquete repete as quatro alternativas no texto exato); gabarito D, fratura fisária do úmero distal.
- Pistas e distratores tirados do comentário do acervo: perda do alinhamento do antebraço com a metáfise; epífise quase toda cartilaginosa aos 12 meses; a fise cede antes da articulação (por isso parece luxação); pronação dolorosa tem radiografia normal e sem edema relevante; artrite séptica não explica o desalinhamento; ultrassom ou RM mostram a epífise; sem história clara, avaliar com cuidado o trauma não acidental (sem concluir só pela imagem).
- Imagem real da questão, sem marcação nova. As duas incidências viram duas fotos lado a lado (só o recorte da borda branca do arquivo); o zoom do slide 4 é recorte ampliado do perfil.
- Stories: `ombro-cotovelo-0454` (TARO 2024). Enunciado e alternativas iguais ao acervo; gabarito C, lesão do subescapular com reparo cirúrgico. O palpite errado do R1 (infraespinal) é o distrator clássico. Linhas do veredito tiradas do comentário: infraespinal é rotador externo; não leva a mão às costas após trauma = subescapular; aguda no paciente ativo = reparo precoce, antes da retração e da infiltração gordurosa.
- Conversa e nomes fictícios (Lucas R1, Bia R2, Rafa R3), com "Conversa ilustrativa" na faixa; sem nome nem logotipo de aplicativo; sem emoji e sem preço; legenda sem link e com 5 hashtags.
