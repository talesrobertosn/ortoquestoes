# Biblioteca OrtoQuestões (resumos de capítulos)

Rota: `#/resumos` (estante), `#/resumos/<capítulo>` (leitor), `#/resumos/caderno` (Meu caderno de estudo).
Criada em 16/10/2026. **Publicada em beta** no menu suspenso ("Resumos · Beta"), com atalho na página inicial,
caixa no cronograma e convite no fim das questões. O que já está pronto e o que falta
estão no fim deste arquivo. A fila de temas e o que já foi enviado estão em [CHECKLIST.md](CHECKLIST.md).

> Roteiro de ponta a ponta (PDF → simulados → resumo → site), com o significado de cada pedido curto do Tales e o
> jeito de escrever: [PILOTO-AUTOMATICO.md](PILOTO-AUTOMATICO.md).

## Regras do dono (Tales)

1. **Todo resumo sai de um capítulo de livro ou artigo que o Tales enviou.** Nada de resumo "de memória"
   nem de outra fonte. O arquivo enviado é a fonte, e o cabeçalho do resumo diz qual é (`fonte:`).
2. **Resumos abertos para todos** (decisão do Tales em 16/10/2026, para o Google achar o site): todo resumo usa
   `acesso: gratis`, é lido sem conta no app e ganha página estática em `/resumos/<id>/`
   (`scripts/gerar_resumos_seo.py`, gerada no deploy). **Resolver as questões citadas é do assinante**: no leitor,
   "Fazer a questão" e "Treinar o capítulo" mostram o convite da assinatura para quem não assina.
   (O limite antigo de 5 grátis caiu; o campo `acesso` continua, caso um resumo precise voltar a ser fechado.)
   **Porta para visitantes (Tales, 19/10/2026):** no leitor do app, quem não tem conta lê as **6 primeiras partes**
   (seções de `secoes`, na ordem de leitura) de cada resumo; da 7ª em diante aparece o convite "Criar conta grátis
   e continuar lendo", que volta para a 7ª parte (ou a parte pedida num `?bloco=`) depois de entrar. O índice mostra
   todas as partes, com cadeado nas fechadas. Conta grátis ou assinante lê tudo. A página estática do Google
   continua com o texto inteiro e só ganhou uma linha avisando. Lógica em `src/biblioteca/porta.ts`
   (teste `fixtures/testar_porta_resumos.mjs`), painel em `src/biblioteca/PortaLeitura.tsx`.
3. **Pode e deve citar as questões no meio do resumo**, com botão para fazer a questão (ela abre num
   painel, sem perder o lugar da leitura).
4. Texto **autoral**, em português, na ordem em que a prova cobra; não traduzir o livro nem copiar trechos
   longos. Números e condutas são os do capítulo. Divergência entre o livro e um gabarito oficial vai
   num `alerta:` (ver abaixo), nunca escondida.
5. **Nunca inventar** prova, ano, número de questão ou estatística. Prova e ano aparecem na tela a partir
   do acervo (`public/acervo/indice.json`); o resumo só guarda os ids.
6. **Figuras do livro só com licença de reprodução digital.** Sem licença, o leitor mostra o número, a
   legenda e a referência da figura e avisa que ela não foi publicada. Nunca usar imagem gerada por IA
   no lugar de figura científica.
7. Não divulgar quantidades totais do acervo.

## Como fazer um capítulo novo (passo a passo)

> Pedido do Tales (16/10/2026): quando ele pedir resumo **e** questões, faça primeiro os OrtoQuestões
> Simulados do capítulo (média de 10, cada um com "Por que esta questão foi criada" no comentário; ver AGENTS.md)
> e depois o resumo, citando os simulados novos em `treino=`.

1. **Ler o PDF inteiro.** Os PDFs do Tales costumam vir com cada página duplicada e girada; extraia uma
   cópia do texto assim (ajuste o caminho):
   ```bash
   F=caminho/do/capitulo.pdf; : > /tmp/cap.txt
   for i in $(seq 1 $(pdfinfo "$F" | awk '/Pages/{print $2}')); do
     echo "=== PÁGINA $i ===" >> /tmp/cap.txt
     pdftotext -f $i -l $i -x 0 -y 0 -W 595 -H 421 "$F" - >> /tmp/cap.txt
   done
   ```
   Se vier vazio ou cortado, teste sem o recorte (`pdftotext -layout "$F" -`) e confira com
   `Read` em algumas páginas. Leia tudo antes de escrever.
2. **Engenharia reversa das questões.** Liste as questões do acervo sobre o tema (subtema do índice e
   busca por termos no enunciado e nas alternativas), com prova, ano, gabarito e o `conceito` do
   comentário (`public/acervo/comentarios/<area>.json`). Exemplo em Python:
   ```python
   import json,re
   ind=json.load(open('public/acervo/indice.json')); sub=ind['subtemas']
   alvo=[q for q in ind['questoes'] if any(re.search(r'transtrocant', sub[s], re.I) for s in q['s'])]
   ```
   - Separe **prova real** (tem `p`, sem `sim`) de **simulado do site** (`sim: 1`).
   - Descarte duplicatas (`dup`) e questões de outro assunto que caíram no subtema por engano.
   - Anote o que cada questão exige, as alternativas-armadilha e se o gabarito diverge do livro.
3. **Escrever** `conteudo/biblioteca/<livro><edição>-<capítulo>-<tema>.md` no formato abaixo. A ordem das
   seções segue o que mais cai; a profundidade é proporcional à cobrança, sem cortar fundamentos.
4. **Gerar e conferir:** `node scripts/biblioteca/gerar.mjs` (grava `public/biblioteca/`). Ele recusa
   questão inexistente, duplicata, simulado marcado como "já caiu" e negrito sem fechar.
5. **Ver no navegador** (`VITE_SUPABASE_URL=sem npx vite`, abrir `#/resumos/<id>`), no computador e no
   celular, e rodar os testes (abaixo).
6. Marcar o tema no [CHECKLIST.md](CHECKLIST.md), commitar `conteudo/`, `public/biblioteca/` e publicar.

## Formato de autoria (`conteudo/biblioteca/*.md`)

```markdown
---
id: rockwood10-53-colo-femur          # estável: é o endereço e a chave das marcações
versao: 1                             # suba a cada revisão editorial do texto
titulo: Fratura do colo do fêmur
especialidade: trauma                 # slug de um tema do acervo; "mao" leva o resumo ao cronograma da mão
acesso: gratis                        # todos abertos desde 16/10/2026 (assinante fecha o leitor)
livro: Rockwood and Green's Fractures in Adults
edicao: 10ª edição (2025)
capitulo: Capítulo 53 · Femoral Neck Fractures
autores: ...
fonte: Capítulo enviado pelo Tales em 16/10/2026 (arquivo.pdf, 60 páginas)
resumo: Uma frase para a estante.
---

# Título da seção {radar=confirmado}
Parágrafo (linhas seguidas viram um parágrafo; linha em branco separa). **Negrito** com dois asteriscos.

## Subtítulo
- item de lista
> Na prova: frase-chave que aparece com a marca "Na prova".

!questoes central=trauma-0334,trauma-0727 relacionadas=quadril-0508 treino=trauma-1542
conceito: O que a questão exige, numa frase.
como: Como a banca explorou o assunto (o raciocínio, não só o tema).
armadilha: Alternativa-armadilha e por que está errada (pode repetir a linha).
alerta: Divergência entre o livro e o gabarito oficial, explicada.
!fim

!figura 53-4
Legenda da figura no original (a imagem só aparece com licença).
!fim
```

- `radar`: `confirmado` (há questão de prova real na seção), `fundamento` (base para as questões),
  `clinico` (relevante na prática, sem questão encontrada), `oportunidade` (pode cair; nunca como
  certeza). Seção `confirmado` sem questão mostra "Nenhuma questão encontrada no conjunto analisado".
- `central`: questões em que esse conceito é o centro; `relacionadas`: associação secundária;
  `treino`: OrtoQuestões Simulados (não contam como "já caiu").
- Cada bloco ganha um id estável (hash do texto + seção). Pode reescrever à vontade: as marcações
  antigas se reencontram pelo trecho (ver "Âncoras"); as que perderem o trecho ficam como "precisam de
  nova associação", nunca somem.

## Arquitetura

| Parte | Onde | Observações |
| --- | --- | --- |
| Conteúdo (compartilhado) | `conteudo/biblioteca/*.md` → `public/biblioteca/indice.json`, `capitulos/<id>.json`, `questoes.json` | Estático, um arquivo por capítulo, baixado só ao abrir. `questoes.json` liga questão → trecho (caminho inverso). |
| Dados da pessoa | chave `biblioteca` no armazenamento da conta: `m.<id>` (marcação), `l.<capítulo>` (leitura), `pref` | Sincronizada pela fila que já existe (`src/conta/sincronizacao.ts`), item a item, com versão por linha, trava otimista e idempotência. Sem segundo sistema de conta nem de sync. |
| Servidor | `progresso_usuario`, tipo `biblioteca` (migração `202610161800_biblioteca.sql`, parte 29) | Mesmas policies RLS: cada conta só lê e grava as próprias linhas; o formato é validado por `forma_documento`. Teste: `supabase/tests/biblioteca.sql`. |
| Âncoras | `src/biblioteca/ancoras.ts` | Bloco + trecho exato + 32 caracteres antes e depois + deslocamento + versão (TextQuote/TextPosition do Web Annotation). Reencontra no mesmo bloco, em outro bloco ou marca como órfã. |
| Conflitos | `src/biblioteca/juntar.ts` (chamado por `resolverConflito` em `modeloSync.ts`) | Nota editada em dois aparelhos: a mais recente fica e a outra vai para `notasDeOutroAparelho`; a pessoa escolhe (usar, juntar, descartar). Exclusão é lápide (`apagadaEm`), não some do servidor. |
| Leitor | `src/paginas/LeitorResumo.tsx` | Tela cheia; rolagem ou páginas (colunas CSS); temas claro/sépia/escuro; fonte, entrelinha, largura, justificar, serifa; índice, busca (CSS Highlight API), marcador de página, notas, concentração, teclado (i, n, /, f, setas, Esc). A posição é (bloco, fração), não pixel. |
| Estante e caderno | `src/paginas/Resumos.tsx` | Continuar estudando, filtros por especialidade e busca; caderno com filtros (capítulo, área, cor, texto, nota, favorito), revisão em sequência e exportação em Markdown. |
| Da questão para o livro | `src/biblioteca/EstudarAssunto.tsx` em `CartaoQuestao` | "Estudar este assunto na Biblioteca" abre o parágrafo que explica, destacado. Enquanto `BIBLIOTECA_PUBLICA = false` (config.ts), só aparece para quem já abriu `#/resumos`. |
| Fora da Biblioteca | `src/biblioteca/recomendar.ts`, `CaixaResumos.tsx` | O resumo "combina" com um assunto quando ensina um dos subtemas do acervo (`subtemas` no índice: os que têm ao menos ¼ das questões de prova citadas, ou `subtemas: A; B` no cabeçalho). Cronograma: item "Resumo do capítulo" em "Se sobrar tempo" e caixa "Resumos" na coluna lateral (o que combina com hoje em destaque). Questão: convite com capa no fim (citada → trecho; mesmo subtema → resumo). Página inicial: atalho "Resumos". |
| Frases que caem (antigo Resumão) | `src/paginas/Resumao.tsx` em `#/resumos/frases`, `src/biblioteca/FrasesDoTema.tsx` | Desde 16/10/2026 o Resumão é adendo da Biblioteca: `#/resumao` redireciona para `#/resumos/frases` (com `?tema=`), saiu do menu e do rodapé, e cada resumo termina com um adendo pequeno (5 frases, "mostrar mais") das frases dos seus `subtemas` (`public/acervo/resumao.json`). Quem não assina vê 2. |
| Acesso | `acesso` do capítulo + `usarPremium` | Igual às frases que caem: a regra vale na interface; o conteúdo é estático. Para proteger no servidor seria preciso servir o capítulo por função autenticada (pendência). |

| Emblemas dos resumos (16/10/2026) | `src/biblioteca/conquistas.ts` (métricas), `src/biblioteca/tempoLeitura.ts` (cronômetro), famílias `bib…` em `src/estado/conquistas.ts` | Calculados no aparelho a partir da chave `biblioteca`, sem SQL novo. O documento de leitura ganhou `segundos` (leitura ativa: aba visível, leitor aberto e alguém mexendo nos últimos 2 min; no máximo o tempo real) e `dias` (dias de São Paulo com 1 minuto de leitura, até 120 por capítulo). O tempo vai na gravação da posição que já existe: junto com ela a partir de 30 s acumulados, sozinho a cada 2 min sem rolar e, ao sair ou esconder a aba, o que sobrou. Na junção entre aparelhos, `segundos` fica com o maior e `dias` com a união. Detalhes e lista em `docs/emblemas.md`. |

"Salvo na conta" só aparece quando não há nenhum item da Biblioteca na fila; sem conexão aparece
"Alterações locais pendentes"; banco sem a parte 29 aparece "Falha na sincronização" e as marcações
ficam no aparelho (sem travar as respostas das questões e sem ir para "não enviados").

## Testes

- `npm test` inclui `fixtures/testar_biblioteca.mjs`: âncoras (exata, movida, outro bloco, trecho
  repetido, órfã, sobreposição), junção entre aparelhos, conflito pela fila real, banco sem a migração e o
  gerador (`--conferir`), e a junção de `segundos` e `dias`. As métricas dos emblemas e o cronômetro de
  leitura estão em `fixtures/testar_conquistas.mjs`.
- `node fixtures/e2e_biblioteca.mjs` (Playwright, Supabase falso): destacar, anotar, recarregar, fonte,
  tema e modo paginado, abrir questão e voltar ao mesmo ponto, outro aparelho (celular) com a posição,
  sem conexão com edição conflitante (as duas notas ficam), exclusão, caderno, banco sem migração.
- SQL de verdade: `supabase/tests/biblioteca.sql` (formato inválido recusado; outra conta não lê, não
  altera e não sobrescreve). Rodado num Postgres 16 local com um esquema `auth` mínimo.

## Pendências (para as próximas sessões)

- **SQL da parte 29 precisa ser colado no Supabase** (`supabase/colar-no-painel/sql-202610161800-parte29.sql`).
  Até lá, as marcações ficam só no aparelho e o leitor avisa "Falha na sincronização".
- Criar flashcard a partir de um trecho: o site **não tem flashcards pessoais** (os cartões são estáticos,
  gerados por script). Fazer isso sem criar um sistema paralelo exige primeiro um tipo de cartão pessoal
  no próprio Torneio de Flashcards (registro em `flashcards:registros`). O botão não foi colocado para não
  ficar sem função.
- Do flashcard errado para o trecho do livro: depende de os cartões terem o id da questão de origem
  (`Flashcard.questao`) e usar `public/biblioteca/questoes.json`, como faz "Estudar este assunto".
- Figuras: nenhuma licença confirmada ainda. O visualizador (ampliar, zoom) está pronto para `imagem`
  com `licenca: autorizada`.
- Proteção no servidor dos resumos de assinante (hoje só na interface, como as frases que caem).
