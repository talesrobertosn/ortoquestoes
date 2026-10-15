# Termos de Uso e Condições da Assinatura — versão de 16/10/2026

Pedido do Tales (15/10/2026): reescrever do zero os Termos de Uso e as Condições da Assinatura
(termos de venda) em linguagem jurídica, protegendo todas as partes, e incluir uma cláusula para o
caso de o site ser encerrado ou ficar gratuito para todos, com reembolso proporcional ao tempo que
falta, sem falar em "processado" nos termos.

> **Aviso importante.** Nenhum contrato é "totalmente antiprocesso": qualquer pessoa pode reclamar
> na Justiça, no Procon ou em outro órgão, e cláusulas consideradas abusivas pelo Código de Defesa do
> Consumidor são nulas (art. 51). O objetivo desta versão é **reduzir riscos**: deixar as regras claras,
> cumprir o que a lei exige, prever as situações mais prováveis de conflito e usar apenas cláusulas
> válidas e defensáveis. **É recomendável a revisão por advogado(a) antes de considerar o texto
> definitivo**, sobretudo nos pontos de decisão listados no fim deste documento.

## Arquivos

- `src/paginas/Termos.tsx`: Termos de Uso e Privacidade (23 cláusulas; a 17 é a Política de Privacidade).
- `src/paginas/CondicoesAssinatura.tsx`: Condições da Assinatura (18 cláusulas; a 13 é a de descontinuidade).
- `src/conta/termos.ts`: `VERSAO_TERMOS`, `VERSAO_CONDICOES_ASSINATURA` (ambas `2026-10-16`), a lista
  `MUDANCAS_TERMOS` (resumo do que mudou) e `dataDaVersao`.
- `src/componentes/AvisoTermos.tsx`: aviso de Termos atualizados (faixa no topo e cartão em Minha conta).
- `supabase/functions/criar-checkout` e `criar-pix` (e as cópias em `supabase/colar-no-painel/`): aceitam a versão `2026-10-16`.
- `fixtures/testar_paywall.py`: confere os trechos essenciais, a versão aceita pelo Pix e a ausência de "processo" nos textos.

## O que mudou e por quê

1. **Reescrita completa, numerada e com sumário.** As duas páginas têm data de vigência, versão,
   sumário clicável (o índice já existente, montado a partir dos títulos), um **resumo em linguagem
   simples** no topo, declarado sem valor jurídico, e o quadro "O que mudou nesta versão".
2. **Cláusula de descontinuidade** (Condições, cláusula 13; Termos, cláusula 14). Antes só havia o
   encerramento definitivo do site. Agora cobre também o fim da oferta paga, a gratuidade para todos e a
   supressão substancial de recurso essencial, por decisão própria ou fator externo, com cálculo pro rata,
   prazo de 30 dias, meio de pagamento, exceções (promoções, liberação temporária, acervo dinâmico, beta)
   e sucessão. Não usa "processo/processado" nem menciona litígio.
3. **Cláusulas do CDC refeitas para serem válidas.** Saíram ou mudaram as redações que o art. 51 do
   CDC tende a anular e que enfraqueciam o documento: isenção total "no estado em que se encontra",
   exclusão de danos diretos e de dano moral, limitação de indenização para consumidor pessoa física,
   licença "revogável a qualquer tempo", remoção de conteúdo "a exclusivo critério e sem justificativa",
   alteração unilateral sem ressalva e foro com renúncia para o consumidor. No lugar: responsabilidade
   nos termos da lei com excludentes legítimas (culpa exclusiva, uso fora da finalidade, serviços de
   terceiros), limitação de valor apenas fora da relação de consumo (art. 51, I, permite para pessoa
   jurídica), suspensão com aviso e prazo de defesa, e alterações que não atingem período já pago.
4. **Arrependimento (art. 49) separado da garantia.** O direito legal de 7 dias e a garantia do site
   (7 dias após **cada** cobrança, inclusive renovações) estão descritos separadamente, sem mudar o que
   já era oferecido.
5. **Inadimplência, contestação e cortesias** ganharam cláusulas próprias: cobrança recusada não gera
   multa, juros nem negativação (é o que o sistema faz: a conta volta ao gratuito).
6. **Privacidade (LGPD) completa:** tabela de dados, tabela de finalidades e bases legais, e item
   próprio (17.4) para o uso das **páginas visitadas** (30 dias) e dos dados de estudo para **entender o
   interesse nos planos** (painel "Viu os planos") e **personalizar comunicações** (cartas pessoais e
   lembretes), com salvaguardas e direito de oposição. Separação entre e-mails de serviço, comunicações
   pessoais (desligáveis por tipo) e novidades (consentimento). Retenção, direitos do titular com prazo
   de 15 dias (LGPD, art. 19), encarregado, transferência internacional, cookies e incidentes.
7. **Atendimento e solução amigável:** resposta em até 5 dias (Decreto nº 7.962/2013, art. 4º,
   parágrafo único), tentativa de solução pelo suporte sem condicionar direitos, Procon e
   consumidor.gov.br (quando disponível).
8. **Foro válido:** domicílio do consumidor; foro do responsável só fora da relação de consumo.
9. **Funcionalidades em teste:** cláusula própria para betas (Flashcards).
10. **Nada mudou** em preços (R$ 39,90 / R$ 179,90 / R$ 239,90), periodicidades, Pix de 24 h,
    renovação antecipada do Pix, garantia de 7 dias, limite gratuito (textos de `fraseGratis`), regra de
    indisponibilidade de 3 dias, programa de indicação (20 questões, 7 dias, até 12) e recursos do plano.
    O Resumão completo passou a constar da lista do plano porque já é anunciado como exclusivo na página
    de planos.

## Mapa cláusula → risco coberto

| Cláusula | Risco coberto |
| --- | --- |
| Termos 1 e Condições 1 | Dúvida sobre quem é o fornecedor, o que foi contratado e qual documento prevalece |
| Termos 1.2, 1.4 e Condições 4.1 | Alegação de que não houve aceite ou de que a versão era outra (aceite ativo, versionado e registrado) |
| Termos 3 e 4 | Expectativa de aprovação, uso clínico do conteúdo, erro de IA, confusão com SBOT ou bancas |
| Termos 5 | Direitos autorais das provas, questões autorais confundidas com oficiais, gabarito divergente, pedido de titular |
| Termos 6 | Conta de menor, dados falsos, senha compartilhada, uso simultâneo |
| Termos 8 e 9 | Cópia, raspagem, revenda, uso para IA, criação de banco concorrente, fraude de ranking |
| Termos 10 | Exposição indevida no ranking, apelido ofensivo, ligas |
| Termos 11 | Responsabilidade por conteúdo de terceiros, uso de sugestões, moderação |
| Termos 12 | Reclamação por mudança ou falha em recurso beta |
| Termos 13 e Condições 14 | Indisponibilidade e manutenção (com prorrogação objetiva após 3 dias) |
| Termos 14 e Condições 13 | Encerramento, fim da venda, gratuidade para todos, supressão de recurso essencial |
| Termos 15 e Condições 15 | Suspensão arbitrária (há aviso, prazo de defesa e restituição proporcional) |
| Termos 16 | Pedidos de indenização desproporcionais, sem cláusulas nulas pelo CDC |
| Termos 17 | Tratamento de dados sem base legal, falta de transparência, e-mails sem descadastro, pixel sem consentimento |
| Termos 19 e Condições 17 | Alteração unilateral (não atinge período pago; aviso com resumo) |
| Termos 20 e Condições 16 | Reclamação sem tentativa prévia de solução; prazo de resposta exigido por decreto |
| Termos 21 | Foro inválido (o do consumidor é preservado) |
| Termos 22 | Cláusula inválida derrubando o resto, tolerância vista como renúncia, transferência do projeto |
| Condições 2 e 4 | Erro de preço, parcelamento presumido, Pix vencido |
| Condições 5 e 6 | Renovação surpresa, reajuste sem aviso |
| Condições 7 e 8 | Arrependimento, garantia, pedidos de reembolso após 7 dias |
| Condições 9 e 10 | Cobrança recusada, chargeback |
| Condições 11 e 12 | Cortesias convertidas em dinheiro, redução de recursos |

## Versionamento e reaceite

- **Havia duas constantes `VERSAO_TERMOS` divergentes**: `src/conta/termos.ts` (`2026-10-06`, a usada
  no cadastro e em Minha conta) e `src/estado/termos.ts` (`2026-09-15`, um hook antigo de aceite em
  `localStorage` que nenhum arquivo importa hoje). Para alinhar sem quebrar o desenho existente, o
  arquivo antigo agora **reexporta** a constante de `src/conta/termos.ts`, que passa a ser a fonte
  única: as duas valem sempre `2026-10-16` e não podem mais divergir.
- `VERSAO_TERMOS` (Termos) e `VERSAO_CONDICOES_ASSINATURA` (Condições) continuam separadas de propósito:
  a primeira fica no cadastro da conta (`termos_versao`), a segunda é aceita a cada checkout e conferida
  pelas Edge Functions. Nesta revisão conjunta as duas ficaram `2026-10-16`.
- **Reaceite:** quem tem conta com `termos_versao` diferente vê o `AvisoTermos` — uma faixa no topo do
  site (fora da resposta de questões, do painel e de Minha conta) e um cartão em Minha conta — com o
  resumo do que mudou, links para os dois textos e o botão "Li e concordo", que grava a nova versão e a
  data. "Agora não" adia só nesta aba. A conta continua funcionando enquanto a pessoa lê (o próprio
  texto prevê isso e o direito de encerrar a conta se não concordar).
- **Google:** antes, cada login pelo Google gravava a versão atual em silêncio. Agora o aceite pelo
  botão do Google só é gravado na primeira entrada; quem já tinha conta vê o aviso com o resumo.

### Ordem de publicação (importante)

As Edge Functions conferem a versão das Condições. **Publique primeiro `criar-checkout` e `criar-pix`**
(arquivos em `supabase/colar-no-painel/` ou `supabase functions deploy`) com a versão `2026-10-16` na
lista de aceitas, e **só depois** o site. Se o site for publicado antes, o checkout e o Pix recusam o
pedido com "Atualize a página…". As funções continuam aceitando a versão anterior (`2026-10-01`) para
quem abriu a página de planos antes da atualização.

## Pontos de decisão do Tales

1. **Identificação do fornecedor.** O Decreto nº 7.962/2013 (art. 2º, I e II) pede, em destaque no
   site de venda, nome completo ou razão social, **CPF ou CNPJ** e **endereço físico e eletrônico**. O
   site só informa "Tales", "pessoa física, médico residente" e o e-mail. Os textos reaproveitam esses
   dados sem inventar nada; decidir se inclui nome completo, CPF/CNPJ e endereço (ou endereço comercial).
2. **Prazo da restituição na descontinuidade:** adotado **até 30 dias** após a Data de Efeito (ou após a
   opção, na supressão de recurso, ou após o assinante informar a conta quando o estorno não for possível).
3. **Aviso prévio do encerramento:** antes era "mínimo de 30 dias" sem exceção; agora é "mínimo de 30
   dias sempre que possível", com aviso imediato quando um fator externo impedir. Confirmar.
4. **Encerramento por violação:** adotada a restituição proporcional do período não usufruído, ressalvada
   a cobrança de danos comprovados. Reter o valor seria mais duro, mas com alto risco de ser considerado
   abusivo.
5. **Prazo de defesa antes da suspensão:** adotados 5 dias, salvo urgência de segurança ou fraude.
6. **Retenção de registros de pagamento e aceite:** "em regra até 5 anos após o fim da relação"
   (prescrição do CDC, art. 27, e obrigações fiscais). Confirmar com contador(a) ou advogado(a).
7. **Redução de recursos do plano:** antes, "qualquer redução não vale para um período já pago"; agora,
   aviso prévio e, se a redução for substancial, opção de cancelar com restituição proporcional.
8. **consumidor.gov.br:** a adesão de fornecedores exige cadastro (normalmente com CNPJ). O texto diz
   "quando disponível para o Orto Questões". Decidir se vale cadastrar.
9. **Oposição ao uso das páginas visitadas:** hoje é pedida pelo canal de contato. Uma chave em Minha
   conta ("não usar meu histórico de páginas para personalizar mensagens") deixaria o legítimo interesse
   mais robusto; recomenda-se também registrar um teste de balanceamento (LIA) interno.
10. **Reaceite obrigatório ou não:** o aviso não bloqueia o uso. Bloquear até aceitar é possível, mas
    tende a irritar e não aumenta muito a força jurídica, já que as mudanças não atingem períodos pagos.
11. **Transferência internacional:** confirmar a região do projeto Supabase e manter a lista de
    fornecedores (Supabase, hospedagem, Mercado Pago, serviço de e-mail, Meta) atualizada se algum mudar.
12. **Nomes de outras marcas.** Pela regra de não citar outras marcas, os textos não citam concorrentes
    nem exemplos de marca dispensáveis (saíram o nome do serviço de e-mail, o "Chrome no Android" e as
    redes sociais como exemplo de origem). Ficaram só os nomes que a lei ou o próprio uso exigem:
    entidades e provas a que as questões se referem (SBOT, ENARE, SBCOC, TEOT, TARO, TECOC), o Mercado
    Pago (onde o pagamento é feito), o Google (login), a Supabase (armazenamento, para transparência da
    LGPD) e o Meta (pixel com consentimento). Se preferir, a Supabase pode virar "provedor de banco de
    dados", mas a LGPD pede informação clara sobre com quem os dados são compartilhados.

## Fontes legais usadas

- Código de Defesa do Consumidor (Lei nº 8.078/1990): arts. 6º, 14, 49, 51 e 101.
- Decreto nº 7.962/2013 (comércio eletrônico): arts. 2º, 4º e 5º.
- Lei Geral de Proteção de Dados (Lei nº 13.709/2018): arts. 7º, 9º, 14, 18, 19, 33, 41 e 48; Resolução
  CD/ANPD nº 2/2022 (agentes de pequeno porte).
- Marco Civil da Internet (Lei nº 12.965/2014); Código Civil, arts. 393 e 403; Lei nº 9.610/1998, art. 46.
- Registro anterior: [termos-e-assinatura-20260927.md](termos-e-assinatura-20260927.md).
