# Reajuste do semestral e do anual (preparado em 31/10/2026)

Escada de R$ 5 por mês escolhida pelo Tales:

| Plano | Por mês | Cobrança | Desconto |
|---|---|---|---|
| Mensal | R$ 39,90 | R$ 39,90 por mês | — |
| Semestral | R$ 34,90 | R$ 209,40 a cada 6 meses | 13% |
| Anual | R$ 29,90 | R$ 358,80 por ano | 25% |

**Quem já assinava não muda nada.** Tem direito ao preço antigo (semestral R$ 179,90, anual R$ 239,90)
quem tem uma assinatura, no cartão ou no Pix, criada antes do corte, com pagamento aprovado e sem
reembolso. Vale para sempre: renovação no cartão, nova compra no Pix e volta depois de cancelar.
Quem foi reembolsado volta como novo.

## Onde está cada parte

- Valores do site: `src/dados/planos.ts` (`PLANOS` e `PLANOS_PRECO_ANTIGO`).
- Valores do servidor: `supabase/functions/_shared/precos.ts` (`PRECOS`, `PRECOS_ANTIGOS`, `centavosPara`).
- Quem tem o preço antigo: funções `tem_preco_antigo` (servidor) e `meu_preco_antigo` (página) na
  migração `supabase/migrations/202611070000_reajuste_escada.sql`. O corte fica em `reajuste_precos`.
- A página mostra o preço de cada pessoa (`src/conta/precoAntigo.ts`) e o selo "Seu preço de sempre".
- Condições da Assinatura na versão `2026-11-07` (cláusula 6.3); os Termos de Uso não mudam de versão.
- Conferência automática: `node fixtures/testar_reajuste_precos.mjs`.

## Ordem de publicação (na mesma tarde)

1. **SQL** no SQL Editor: `supabase/colar-no-painel/sql-202611070000-parte36-reajuste-escada.sql`.
   Antes, confira o nome da restrição (o esperado é `pedidos_pix_check`):
   `select conname from pg_constraint where conrelid = 'public.pedidos_pix'::regclass and contype = 'c';`
   O corte é o momento em que o SQL roda.
2. **Funções que aceitam os dois preços**: `webhook-mercado-pago` e `gerenciar-plano`.
3. **Funções que cobram**: `criar-checkout` e `criar-pix`.
   (arquivos em `supabase/colar-no-painel/`, gerados por `npm run funcoes:colar`).
4. **Site**: juntar o PR. A versão nova das Condições (`2026-11-07`) só funciona com o passo 3 no ar.
5. **Teste em produção**: uma conta nova compra o semestral por Pix (deve sair R$ 209,40) e pede
   o reembolso pela garantia. Uma conta que já assinava abre os planos e vê "Seu preço de sempre".

Se o dia mudar, troque a data `2026-11-07` em `src/conta/termos.ts`, nas listas de versões de
`criar-checkout` e `criar-pix`, no texto das Condições e dos Termos e em `fixtures/testar_compra_planos.mjs`.

## Conferências depois

- `select corte from public.reajuste_precos;` mostra o corte. Para ajustar:
  `update public.reajuste_precos set corte = '2026-11-07 15:00-03';`
- `select public.tem_preco_antigo('<id do usuário>');` diz se a pessoa paga o preço antigo.
- O painel do administrador estima a receita futura pelo preço novo; as cobranças já feitas usam o
  valor gravado.

## Para voltar atrás

Recoloque os valores antigos em `planos.ts` e `precos.ts` e publique as funções e o site. Não
precisa desfazer o SQL: a restrição aceita os dois valores e `tem_preco_antigo` só escolhe entre eles.
