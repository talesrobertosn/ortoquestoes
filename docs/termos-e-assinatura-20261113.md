# Termos de Uso e Condições da Assinatura: versão de 13/11/2026

Pedido do Tales (13/11/2026): revisar os dois documentos para reduzir riscos, mantendo a boa relação com quem
assina ("não fazer as coisas ruins, sem piorar a defesa"). Nada aqui limita direitos do consumidor; continua
valendo o aviso da versão de 16/10/2026: revisão por advogado(a) é recomendável.

## Versões

- `VERSAO_TERMOS` e `VERSAO_CONDICOES_ASSINATURA`: `2026-11-13` (`src/conta/termos.ts`).
- `MUDANCAS_TERMOS` e `MUDANCAS_CONDICOES` ficaram vazias de propósito: o aviso de reaceite mostra só "Li e
  concordo" e os botões para ler os textos (pedido do Tales: "não precisa fazer um mini resumo").
- `criar-checkout` e `criar-pix` (e as cópias em `supabase/colar-no-painel/`) aceitam `2026-11-13`.
  **Publicar as duas funções antes do site**, senão o checkout recusa a versão nova.

## Termos de Uso

| Cláusula | O que mudou |
|---|---|
| 3.3 | Lista aberta de quem não tem vínculo: SBOT, SBCM, SBCOC, SBQ, ENARE, bancas, residências, instituições, editoras e autores, e qualquer outra entidade. |
| 4.7 a 4.11 | Uso de IA: onde é usada; o que não é feito com IA (imagens médicas); papel humano; dados e IA (relatos e suporte lidos pelo Tales, sem IA; dados não treinam modelos); proibição de treinar IA com o acervo. |
| 5.1 | Deixa de afirmar que as provas foram "divulgadas": reprodução para estudo, crítica e comentário (art. 46), sem afirmar que é oficial ou autorizado, e retirada mediante pedido. |
| 5.4 | Uso didático das obras: redação própria, comparação de livros e edições, trechos curtos, figuras com a fonte quando ajudam, retirada a pedido. |
| 5.8 | Edições novas das obras: o conteúdo pode levar tempo para ser revisto. |
| 9.2 (l) | Proíbe apresentar o conteúdo como próprio ou de outra instituição (cursos, apostilas, grupos pagos). |
| 11 | Sai a 11.4 (comentários publicados por usuários): o site não publica mais comentários de usuários. A moderação vira 11.4. |
| 13.5 | Sites externos. |
| 17.2 e 17.3 | Aniversário só com dia e mês, opcional, com base no consentimento. |
| 22.6 | Registros eletrônicos como prova. |

## Condições da Assinatura

| Cláusula | O que mudou |
|---|---|
| 2.3 | Recibo eletrônico em Detalhes da assinatura; sem nota fiscal enquanto o fornecedor for pessoa física. |
| 6.3 | O valor antigo do reajuste de 3/11 vale só para quem já assinava e não se repete em reajustes futuros, salvo anúncio. |
| 11.4 | Promoções e cupons. |

Sem devolução proporcional depois dos 7 dias (decisão do Tales: "é um acordo que a pessoa topa").

## No site

- Comentários de usuários: saem a seção "Comentários da comunidade" e o envio (`ContribuirComentario`).
- Aniversário: dia e mês, opcional, guardado como `0000-MM-DD` (o formato que os e-mails e o aviso de parabéns já
  leem). A migração `20261113030000_aniversario_sem_ano.sql` apaga o ano já guardado.
- Recibo: `src/componentes/Recibos.tsx`, recolhido no fim de Detalhes da assinatura; a consulta
  `meus_recibos()` vem da migração `20261113031000_meus_recibos.sql`. Sem ela, o item não lista nada.
- Arquivo da página de Planos: `node scripts/juridico/arquivar_planos.mjs` grava texto e imagens em
  `docs/juridico/planos/`; `fixtures/testar_arquivo_planos.mjs` falha quando a oferta muda sem arquivo novo.

## Ordem para publicar

1. No Supabase: rodar `supabase/colar-no-painel/sql-20261113030000-aniversario-sem-ano.sql` e
   `sql-20261113031000-meus-recibos.sql`.
2. Publicar `criar-checkout` e `criar-pix` com `2026-11-13` na lista de versões aceitas.
3. Juntar o PR do site.
