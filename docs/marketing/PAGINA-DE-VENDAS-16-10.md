# Página de vendas de 16/10/2026

Pedido do Tales em 15/10/2026: a página de planos convertia pouco e estava "pixel art demais". A
nova versão mantém a temporada pixel nas ilustrações (baú, prancheta, turma, guerreiro, calendário,
troféu), mas com fundo liso, tipografia firme e cantos arredondados; vende **tempo**; mostra os
**três planos lado a lado** logo no topo; destaca o **Pix**; e explica a garantia com o botão que
existe de verdade.

Arquivos: `src/paginas/Assinatura.tsx` (página e janela de pagamento),
`src/componentes/vendas/` (cartões dos planos, prévia do cronograma, entrada por rolagem, ícones),
`src/dados/vendas.ts` (contas e personalização, sem React), `src/estilos/paginas/Assinatura.css`.
Testes: `fixtures/testar_pagina_vendas.mjs` (no `npm test`) e `fixtures/testar_compra_planos.mjs`
(`npm run test:compra`: compra de ponta a ponta no navegador, com Supabase e Mercado Pago simulados).

## O que a página antiga tinha de bom (e voltou)

Lendo o histórico (`git log --follow -p src/paginas/Assinatura.tsx`), a versão de 03/10 a 11/10
("Tudo o que você precisa para chegar pronto na prova") tinha:

| Da antiga | Como voltou |
|---|---|
| Os três planos visíveis juntos, com "de R$ X" riscado, "% OFF" e "você economiza R$" | Os três cartões já no topo, com preço por mês, total do período, `-50%`/`-25%`, economia em reais e custo por dia |
| "Pix em todos os planos" bem visível, e "Pix ou cartão" em cada plano | Selo do Pix em cada cartão e faixa "Pix à vista, liberado assim que cai" em destaque logo abaixo |
| Uma prévia real do produto ("Ilustração com números de exemplo") e o ranking das áreas com as 3 primeiras abertas e o resto borrado | A seção "Temas que mais caem" mostra as 4 áreas que mais caem com a porcentagem real e borra as seguintes; os 3 assuntos campeões aparecem por nome |
| "Começar grátis" ao lado de "Ver os planos" (porta aberta) | "Ainda não é a hora? Tudo bem." no fim, e a prévia do cronograma que funciona sem assinar |
| Seção própria de cancelamento e garantia | Seção "Não gostou? Um botão e o dinheiro volta", em 3 passos |
| FAQ mais completo (Pix, renovar Pix sem perder dias, cancelar o semestral, histórico, liga) | FAQ com 14 perguntas, incluindo as antigas e as novas |
| Tipografia comum (sem fonte pixel nos títulos) e cartões limpos | Títulos na fonte do sistema, cartões brancos, sombras suaves |

O que a versão de 12/10 tinha de bom e ficou: a prévia interativa do cronograma (o "presente" da
página), a barra fixa com o preço quando o topo sai da tela, a janela de pagamento com Pix primeiro.
O que saiu: o topo com **um preço só** (R$ 19,99/mês com abas), que escondia a comparação; o céu em
faixas e o horizonte quadriculado; títulos em Jersey 10; sombras "de jogo" em tudo.

## Ordem da página (e por quê)

1. **Topo personalizado com os três planos.** Logada: "Ana, você já respondeu 312 questões. Agora
   deixe o plano decidir a próxima.", um elogio verdadeiro (dias seguidos, acerto só se for 50% ou
   mais, ponto forte com amostra mínima) e a ficha (questões, acerto, ponto forte, prova e etapa).
   Visitante: "A residência já ocupa o seu dia. O que estudar, deixe com a gente." e os dias até a
   prova teórica do TEOT. Os três planos já na primeira dobra (computador), Pix/cartão e garantia
   logo abaixo. No celular, o anual vem primeiro, inteiro, e semestral e mensal ficam lado a lado
   logo abaixo (fácil comparar sem carrossel). Quem tem ficha no celular vê os planos antes dela.
2. **O tempo.** Três momentos reais (entre cirurgias, entre pacientes no PS, à noite em casa) e a
   promessa: abre, o dia está pronto, faz, fecha; o repertório vem do treino diário.
3. **Cronograma em 3 passos** e a prévia interativa (reciprocidade: dá para planejar sem assinar).
4. **Temas que mais caem**: "Analisamos todas as questões das provas oficiais"; só porcentagens.
5. **OrtoQuestões Simulados**: engenharia reversa em 3 passos (estudamos, avaliamos, criamos).
6. **Flashcards** (com a trava `VITE_FLASHCARDS_VENDA`, ligada no publicar.yml).
7. **Os outros recursos**: Simulado Nacional, Resumão, Liga da residência (com o nome do serviço
   da pessoa quando ela informou, sem número de colegas), relatório do mês, como a turma respondeu,
   desempenho e mapa de risco.
8. **Gratuito × assinante** com `fraseGratis` (nada de prometer limite com o limite desligado).
9. **Garantia** com o botão de verdade e o prazo de cada meio.
10. **Dúvidas** (14 perguntas, em duas colunas no computador).
11. **Chamada final com os três planos de novo** e a porta aberta para o gratuito.

A ordem pedida foi mantida; a única mudança é que, no celular logado, a ficha da pessoa vai para
depois dos planos, para os preços aparecerem na primeira tela.

## Técnicas usadas (todas com dado verdadeiro)

- **Ancoragem e decoy (pipoca P, M, G):** mensal à esquerda ancora o preço cheio (R$ 39,90);
  semestral no meio; anual maior, com borda dourada, selo "Melhor custo-benefício" (verdade
  aritmética: menor preço por dia) e a frase "Por R$ 60,00 a mais que o semestral, 6 meses a mais
  de estudo." (derivada dos preços em `src/dados/planos.ts`). Não usamos "mais escolhido", porque
  não há dado que sustente.
- **Preço em unidades pequenas:** por mês e por dia (R$ 0,66 no anual), sempre com o total cobrado.
- **Prova sem números inventados:** o ranking real das áreas, a soma das duas primeiras (39%), o
  formato do Simulado Nacional (50 questões, 2 horas). Nenhum depoimento, nenhum número de usuários,
  nenhum total de questões (nem do acervo, nem da contagem das provas; o teste confere).
- **Reciprocidade:** a prévia do cronograma funciona sem conta; as 4 áreas que mais caem e os 3
  assuntos campeões ficam abertos.
- **Redução de risco:** 7 dias com um botão, explicados com verdade; "Desistir" é o rótulo real do
  botão em Minha conta.
- **Urgência verdadeira:** dias até a prova teórica do TEOT, calculados de `DATAS_PROVA`
  (`src/estado/conquistas.ts`). Nenhuma escassez falsa.
- **Carnegie:** o nome da pessoa, o que ela já fez, elogio específico, perguntar em vez de mandar
  ("Que tal deixar o próximo dia de estudo pronto?"), porta aberta ("Ainda não é a hora? Tudo bem.").
- **CTA claro e repetido:** cartões no topo, barra fixa com o anual, três planos no fim.
  Visitante: "Assinar o anual" leva a criar a conta e volta com `?plano=`; ao voltar logado, a
  janela de pagamento daquele plano **abre sozinha**.
- **Objeções respondidas:** Pix, cartão, renovação, cancelamento, reembolso, prazo do dinheiro,
  acesso imediato, curso preparatório, TEOT/TARO e outras provas, celular, limite do gratuito.

## Garantia e reembolso: o que é verdade hoje

- O botão existe em **Minha conta › Assinatura** (`ResumoAssinatura.tsx`, rota `#/conta/assinatura`):
  "Desistir e solicitar reembolso integral", com confirmação. Aparece até 7 dias depois da última
  cobrança (cartão ou Pix).
- `gerenciar-plano` pede o reembolso ao Mercado Pago na hora e **só encerra o acesso depois de
  confirmar** `refunded`. Se o Mercado Pago não confirmar, nada muda e a pessoa é orientada ao
  atendimento manual (vale a data do pedido, Condições 7.3).
- Pix: o Mercado Pago devolve à conta de origem; costuma ser rápido, mas o prazo final é do Mercado
  Pago e do banco. Cartão: o estorno aparece na fatura conforme o emissor, muitas vezes na seguinte.
  A página não promete prazo em horas.
- Observação: as Condições (7.3) chamam o botão de "Usar garantia de 7 dias", mas o rótulo na tela é
  "Desistir e solicitar reembolso integral". A página usa o rótulo da tela. Vale alinhar numa
  próxima versão das Condições.

## Pix: QR Code e Copia e Cola dentro da página

`criar-pix` passou a devolver também `qr_code` e `qr_code_base64` (opcionais, validados), que o
Mercado Pago já manda em `point_of_interaction.transaction_data`. A janela mostra o QR Code, o
código para copiar e o botão "Copiar código Pix", sem sair da página; o link do Mercado Pago
continua como alternativa. **Enquanto a função nova não for publicada, a página continua com o
botão "Abrir QR Code e Pix Copia e Cola"** (o teste cobre os dois casos). Para publicar: `npm run
funcoes:colar` já gerou `supabase/colar-no-painel/criar-pix.ts`. As versões aceitas das condições
(2026-10-16 e 2026-10-01) não mudaram.

## O que medir

| O quê | Onde |
|---|---|
| Visitas à página de planos | Ficha e filtro "Viu os planos" no painel (histórico de páginas, 30 dias) |
| Cliques nos planos, por plano e por lugar | Atributo `data-funil` em cada botão (`plano-anual-topo`, `plano-mensal-final`, `plano-anual-barra`…) e o evento `AddToCart` do Meta (com consentimento) ao abrir a janela de pagamento |
| Início de checkout, Pix × cartão | Tabela `aceites_assinatura` (`plano`, `meio_pagamento`, `versao`, `aceito_em`): cada linha é um checkout iniciado; e o evento `InitiateCheckout` do Meta com `payment_type` |
| Pix gerado × Pix pago | `pedidos_pix` por `status` (pending, approved, expired) |
| Conversão | `assinaturas` novas por plano e meio, comparando as duas semanas antes e depois de 16/10 |
| Reembolsos | `assinaturas` com `status = 'reembolsada'` (a garantia mais visível pode aumentar os pedidos; acompanhar) |

Consulta sugerida para o SQL Editor (início de checkout por meio e plano, por semana):

```sql
select date_trunc('week', aceito_em) as semana, meio_pagamento, plano, count(*) as checkouts
from public.aceites_assinatura
where aceito_em >= now() - interval '60 days'
group by 1, 2, 3
order by 1 desc, 2, 3;
```

(Um Pix recuperado não grava outro aceite; um checkout de cartão abandonado e refeito grava de novo.)

## Regras que continuam valendo

Não citar o total de questões; não citar outras marcas; nada de depoimento, escassez ou número
inventado; não mudar preços, planos, garantia nem regras de pagamento (`src/dados/planos.ts`,
Condições e funções); movimento só com `prefers-reduced-motion` liberado; ilustrações abaixo da
dobra com `loading="lazy"`.
