# Continuar a sessão de 15–16/10/2026 (para qualquer agente)

Documento de passagem. Resume tudo o que o Tales pediu nesta sessão, o que já foi publicado,
o que ficou pela metade e a fila combinada. Qualquer agente (Claude, Codex etc.) deve ler isto
antes de continuar, junto com AGENTS.md e CLAUDE.md.

## Como trabalhamos

- **Base do site:** branch `claude/pdfs-questoes-tp64dr`. Um merge nela publica no GitHub Pages.
- **Branch de trabalho da sessão:** `claude/eager-meitner-bumj65`. Cada entrega vira um PR, que é mesclado depois de passar:
  - `npm test`, `npx tsc --noEmit` e `npm run build`;
  - conferência visual com Playwright (Chromium em `/opt/pw-browsers/chromium`) em 1400×860 e 390×844.
- **Autorização do Tales:** "pode subir tudo no site, não precisa perguntar".
  - Exceções que pedem confirmação: SQL e Edge Functions, que ele mesmo cola ou publica no Supabase.
  - Todo SQL novo vai para `supabase/migrations/` e para `supabase/colar-no-painel/`, e o texto completo é mandado no chat.
  - Última parte de SQL criada: **28**. O Tales já colou da 25 à 28.
- **Regras fixas do Tales:**
  - nunca citar o total de questões;
  - nunca usar nomes de outras marcas ou concorrentes;
  - fora do jogo, dizer "Flashcards"/"Torneio de Flashcards", nunca "Cripta";
  - arte só por scripts próprios (nada baixado nem gerado por IA);
  - e-mails e cartas no tom de `docs/emails/TOM.md`;
  - não mudar preços, planos, limites, gabaritos nem dados de usuários.
- **Imagens em variável CSS:** usar sempre `urlCss()` de `src/config.ts`. Um `url()` relativo dentro de variável CSS quebra no site publicado.
- **Interrupções:** quando o Tales interrompe ("stop"), todos os agentes em segundo plano param. Retomar a partir do trabalho salvo.

## Publicado nesta sessão (PRs mesclados em `talesrobertosn/ortoquestoes`)

| PR | Entrega |
|---|---|
| #291, #311 | SEO: páginas de destino, `llms.txt`, guias, `/curso-preparatorio-teot/`, `/sobre/`, títulos sem duplicação |
| #292, #296, #299, #301, #305 | ~1.260 flashcards autorais (classificação/anatomia, ordem de incidência, Simulados); Simulado Nacional e Resumão otimizados |
| #293 | Perfil em poucos toques; ficha do admin (SQL parte 25) |
| #294 | Revisão reformulada; emblemas de revisão e de Flashcards (SQL parte 26); ranking legível |
| #295 | Biblioteca e cronograma dos flashcards (fila concreta, Seguir cronograma, horas do fundo) |
| #297, #298 | Kit de marketing `marketing/kit/` + fila de 30 posts |
| #300, #316 | Jogo: botões que travavam, Golem, dicas dos poderes, painel do chefe no celular, contador da rota, abertura mais leve |
| #302 | Sessão mais fluida, Favoritas refeitas, `docs/BRAINSTORM-15-10.md` |
| #303, #304 | Cartas do Tales (e-mails pessoais por faixa de acerto, envio em lote, histórico anti-spam; SQL parte 27; tom caloroso) |
| #306 | "Continuar a atual" leva à sessão; dica das setas discreta |
| #307 | Termos de Uso e Condições reescritos (versão 2026-10-16, cláusula de descontinuidade) |
| #309 | Página de vendas refeita (três planos, Pix em destaque, venda de tempo) |
| #310 | Painel: Financeiro reorganizado, cores em Pessoas, estudo de hoje, exportar dados |
| #312 | Partida da Cripta entre aparelhos (SQL parte 28); arte nova (raptor, dragões, cavaleiros); loop "sala" |
| #313 | Sincronização entre aparelhos (cronograma não reoferece questões feitas em outro aparelho) |
| #314 | Minha conta redesenhada |
| #315, #317 | Página inicial nova (painel do dia, sequência, caminho até a prova, 72 frases do título); correção das imagens que não carregavam |
| #318 | Cronograma: adiantar desconta do dia seguinte; calendário do mês |

## Pendências do Tales (fora do código)

- **Termos:** pôr nome completo e CPF (ou CNPJ de MEI) na identificação do vendedor das Condições. Ele faz manualmente.
- **Pontos de decisão:** ver `docs/termos-e-assinatura-20261016.md`.
- **Search Console:** pedir a indexação das URLs listadas em `docs/seo/PLANO-SEO-R1-2027.md`.
- **Pix com QR na página:** republicar a função `criar-pix` (arquivo `supabase/colar-no-painel/criar-pix.ts`), se ainda não fez depois do PR #309.

## Em andamento quando pausamos (16/10, à noite)

O trabalho parcial de cada frente foi salvo como patch em `.wip-16-10/` nesta branch:
- os commits e as mudanças não commitadas, com `git diff --binary` em relação a `origin/claude/pdfs-questoes-tp64dr`;
- para retomar, aplique com `git apply --3way .wip-16-10/<nome>.patch` sobre a base atual, revise, termine e teste;
- **remova a pasta `.wip-16-10/` antes do PR.**

| Frente | Patch | Estado |
|---|---|---|
| Site mais rápido (medir e otimizar rotas, service worker, chunks; `scripts/medir_desempenho.mjs`, `docs/DESEMPENHO-SITE-16-10.md`) | `desempenho.patch` | Medição "antes" em curso; parte das otimizações aplicada |
| Fogueira que evolui com a sequência (estágios 0, 1–2, 3–6, 7–13, 14–29, 30–59, 60–99 e 100+, com cores; dias da semana; arte de fundo dos atalhos "Estudar flashcards" e "Jogar o Torneio" no estilo do jogo) | `fogueira.patch` | Quase pronto; faltava rodar os testes e o e2e no build de produção |
| Revisão completa dos flashcards (auditoria `docs/flashcards/AUDITORIA-16-10.md` e correções) | `revisao-flashcards.patch` | Em correções (botão do Estudo na horizontal, dica "espaço" no toque) |
| Cronograma redesenhado com o calendário em evidência + calendário da Revisão no mesmo estilo + auditoria de casos de borda + simulados automáticos dentro do cronograma (nome coerente, ex.: "Prova do cronograma", sem confundir com o Simulado Nacional) | `cronograma-calendario.patch` | Capturas "antes" e início da implementação |
| Amostras da página inicial (10 questões, 8 oficiais e 2 Simulados, em rodízio a cada visita; "Ler comentário completo" leva a criar conta) | `amostras-inicio.patch` | Seleção das candidatas |
| Simulados de colo do fêmur e transtrocantérica (engenharia reversa das questões oficiais; espelho e projeção; justificativa no comentário) | — | Recomeçar do zero; o trabalho não foi salvo |

**Os PDFs dos simulados** (Rockwood, cap. 53 e 54) foram enviados pelo Tales neste chat e não estão no repositório. Peça os arquivos de novo se não estiverem disponíveis.
- Colo do fêmur: 60 páginas deitadas, com o conteúdo duplicado lado a lado.
- Transtrocantérica: 49 páginas normais.

## Fila combinada (depois do que está em andamento), nesta ordem

1. **Easter eggs:**
   - código Konami ortopédico;
   - festa nas questões 1.000, 5.000 e 10.000;
   - sinal de Tinel na logo;
   - plantão da madrugada;
   - Dia do Ortopedista e véspera do TEOT;
   - sala secreta "Arquivo do Preceptor";
   - gato da Biblioteca;
   - martelo nas classificações;
   - console do navegador;
   - página de erro com fratura;
   - "R1 sem dormir";
   - emblema "Mão de cirurgião".
2. **Eventos aleatórios:**
   - café de plantão;
   - bilhete na prancheta;
   - visita do mascote;
   - estrela cadente;
   - sexta à noite;
   - confete do acaso;
   - frases por hora do dia;
   - aniversário da conta e **aniversário da pessoa** (o campo "Data de nascimento" já existe em Minha conta);
   - recorde pessoal;
   - datas especiais;
   - biscoito da sorte;
   - **fim de semana**: personagem por 4 a 5 s, por exemplo "Sábado, 15h, e você aqui";
   - **madrugada**: entre 0h e 5h, pode repetir na sessão com intervalo de alguns minutos e frases variadas.

   Regras dos eventos: nunca no meio de uma questão nem em simulado; somem sozinhos; opção de desligar em Minha conta; respeitar reduced-motion; não dar vantagem no ranking.
3. **Três posts do Instagram** pelo kit (`marketing/kit/`), com pouco texto e ritmo rápido:
   - **Feed:** carrossel com uma questão de anatomia da mão ou do ombro dos OrtoQuestões Simulados. Na penúltima ou última lâmina: o que são os OrtoQuestões Simulados (engenharia reversa da banca) e o convite para conhecer o site.
   - **Stories:** uma questão com imagem, mais uma lâmina-convite que fala das oportunidades e do cronograma.
   - **Stories extra:** como o site faz o tempo render (questões entre uma cirurgia e outra, no pronto-socorro, à noite em casa).
   - Mandar ao Tales para aprovar. Não publicar em rede social.

## Bugs e ideias anotados para depois

- `docs/BRAINSTORM-15-10.md`:
  - "Quase lá" (já na página inicial);
  - "Explique com suas palavras";
  - "Mais 5 deste assunto";
  - gabarito fixo no topo ao errar;
  - "Tentar de novo" nas páginas que travam sem conexão;
  - Desempenho mostrando "Acerto nas revisões 0%, −33 pontos" para quem nunca revisou.
- **Jogo:**
  - adversários ainda com o desenho antigo: mão, espectro, harpia, quimera, rei, leviatã e arconte;
  - pulo de layout pequeno na recompensa em 1400×860;
  - selo "Fúria" cortado com chefe de nome longo no celular.
- **Painel:** o redimensionamento da janela em Minha conta remonta a seção e pode apagar um formulário não salvo (investigar).
