# Como criar flashcards autorais

O plano (o que fazer e em que ordem) está em [CRONOGRAMA.md](CRONOGRAMA.md),
gerado a partir da incidência nas provas. Esta página diz **como** escrever
cada lote. As regras de forma vêm de [FORMATOS.md](FORMATOS.md).

## Fábrica e autorais

| | Fábrica (`fabrica.py`) | Autorais (`cronograma.py`) |
|---|---|---|
| De onde sai | A própria questão da prova | O comentário da questão |
| Quantos por questão | No máximo 1 | Quantos o comentário sustentar |
| Quem escreve | Ninguém: é cópia automática | Uma sessão de trabalho, seguindo este guia |
| Onde fica | `public/flashcards/<área>.json` | `scripts/flashcards/autorais/<área>.json`, mesclado na publicação |
| Tipos | Relâmpago, Imagem, Anatomia, Na prova | Tabela, Classificação, Par confundível, Armadilha, Na prova, Conceito |

A fábrica nunca apaga nem altera um autoral.

## OrtoQuestões Simulados (desde 15/10/2026)

As questões dos OrtoQuestões Simulados (TEOT e TARO escritos pela casa; no acervo,
`"simulado": true`, sem `prova` e sem `area` própria) **já entravam na fábrica** desde o
início: 754 das 799 viraram flashcard automático. O que faltava era saber de onde cada
flashcard veio e tratá-las no cronograma. Agora:

- **Marca de origem.** Todo flashcard (da fábrica ou autoral) cuja questão é de simulado
  leva `"colecao": "simulados"`. A regra fica em `fabrica.colecao_da_questao` e é a mesma
  de `simuladoDeOrtopedia` em `src/dados/acervo.ts`: o Fellowship Quadril, que tem prova e
  área, fica de fora. A marca é aplicada na publicação, então os flashcards antigos também
  a recebem; o `indice.json` conta `simulados` no total e por área.
- **No app.** O botão "De onde veio" diz "dos OrtoQuestões Simulados" em vez de "do acervo".
- **No cronograma.** As questões de simulado não contam para a incidência (que é só de
  prova oficial), mas seguem a mesma ordem de assuntos. `CRONOGRAMA.md` ganhou a seção
  "OrtoQuestões Simulados", com quantas questões de simulado cada assunto tem e quantos
  flashcards da fábrica e autorais saíram delas.
- **Para escrever:** `cronograma.py proximo --simulados` abre o assunto de maior incidência
  que ainda tem questão de simulado comentada sem autoral e lista só essas questões
  (marcadas "OrtoQuestões Simulados"). Com `--assunto`, restringe ao assunto pedido.
  As regras de escrita são as mesmas: trecho literal do comentário, nada de fora.
- **Primeiros lotes (15/10/2026):** anatomia do antebraço (Netter, Anatomia da mão e punho)
  e coronoide e cabeça do rádio (Fratura da cabeça do rádio e instabilidade do cotovelo),
  os dois primeiros assuntos da fila com questões de simulado. O lote 3
  (`2026-10-15-simulados-ombro-1.json`) cobriu as 24 questões de simulado de Anatomia do ombro
  (ombro, axila e braço).

## Rotina

```bash
python3 scripts/flashcards/cronograma.py estado     # onde estamos nesta semana
python3 scripts/flashcards/cronograma.py proximo    # assunto da vez + questões-fonte com o comentário inteiro
# escreva o lote em scripts/flashcards/lotes/AAAA-MM-DD-assunto.json
python3 scripts/flashcards/cronograma.py aplicar scripts/flashcards/lotes/AAAA-MM-DD-assunto.json
python3 scripts/flashcards/cronograma.py plano      # atualiza CRONOGRAMA.md
python3 scripts/flashcards/fabrica.py validar       # confere tudo o que está publicado
```

Para outro assunto: `proximo --assunto "Lesões fisárias"`. Para ver mais
questões: `proximo --n 10 --pular 6`. Só OrtoQuestões Simulados: `proximo --simulados`.

## Formato do lote

Uma lista JSON. Cada item:

| Campo | Obrigatório | O que é |
|---|---|---|
| `questao` | sim | id da questão de origem (`pediatria-0431`) |
| `tipo` | sim | `Tabela`, `Classificação`, `Par confundível`, `Armadilha`, `Na prova` ou `Conceito` |
| `assunto` | não | um dos subtemas da questão; sem ele, vale o primeiro |
| `frente` | sim | a pergunta; em `Na prova`, uma lacuna `{{c1::termo}}` |
| `resposta` | sim | curta (de preferência até 6 palavras) e **dentro do trecho** |
| `explicacao` | sim | 1 a 3 linhas, termo-chave em **negrito** |
| `trecho` | sim | cópia **literal** do comentário que sustenta a resposta |
| `opcoes` | não | 2 a 4 alternativas para a Batalha, todas tiradas do comentário ou da questão; sem elas, o flashcard vai só para o Estudo |
| `certa` | com `opcoes` | índice da alternativa igual à resposta |
| `alerta` | se o comentário tiver divergência | o aviso, copiado |
| `dificuldade` | não | 1, 2 ou 3 (sem ela, é estimada) |
| `colecao` | não (automático) | preenchido na publicação: `simulados` quando a questão é dos OrtoQuestões Simulados |

Exemplo real (aprovado no lote piloto de 13/10/2026):

```json
{
  "questao": "pediatria-0431", "assunto": "Lesões fisárias", "tipo": "Par confundível",
  "frente": "O anel pericondral de LaCroix dá estabilidade mecânica à periferia da fise. E o crescimento da fise em largura depende de qual estrutura?",
  "resposta": "Zona de Ranvier",
  "explicacao": "**Zona (sulco) de Ranvier:** células em cunha na borda da fise que fornecem condrócitos para o crescimento latitudinal. O **anel de LaCroix** é fibroso e dá suporte mecânico.",
  "trecho": "O **crescimento periférico** (em largura) da fise é função da **zona de Ranvier**.",
  "opcoes": ["Zona de Ranvier", "Anel pericondral de LaCroix", "Processos mamilares"], "certa": 0
}
```

## O que o validador barra

O validador está em `scripts/flashcards/autorais.py` e é testado em
`fixtures/testar_cronograma_flashcards.py`. Ele barra:

- trecho que não está literalmente no comentário (diferenças de negrito, sinais e acentos são toleradas);
- resposta que não aparece no trecho;
- alternativa que não existe nem no comentário nem nas alternativas da questão;
- `certa` que não aponta para a resposta;
- frente que entrega a resposta, frente sem contexto ou longa demais;
- `Na prova` sem exatamente uma lacuna;
- questão anulada ou sem comentário;
- comentário com divergência sem o campo `alerta`;
- assunto que não é subtema da questão;
- frente repetida (de outro autoral ou da fábrica);
- travessão ou HTML.

O validador confere que nada foi inventado. Ele **não** confere se o
flashcard é bom. Isso é com quem escreve:

- **uma ideia por flashcard**, e a ideia que a prova cobra (epônimo, número de corte, estrutura em risco, conduta);
- **tabela:** um flashcard por linha útil, perguntando pela célula que a prova troca;
- **par confundível:** dê um dos dois na frente e pergunte pelo outro;
- **armadilha:** só quando o comentário diz que o sinal ou a conduta está superado;
- **alternativas da Batalha:** vizinhos verdadeiros do mesmo comentário (as outras zonas, os outros tipos), nunca absurdos;
- **não repetir a questão:** a fábrica já cobre a pergunta original.

## Para quem escreve em lote (sessões automáticas)

1. Rode `cronograma.py proximo` e use **só** o que aparece ali: enunciado, alternativas, gabarito e comentário.
2. De cada comentário, extraia de 2 a 5 flashcards, priorizando tabelas e classificações.
3. Não traga conhecimento de fora do comentário, mesmo que correto. Se o comentário não sustenta, não escreva.
4. Aplique o lote, corrija os reprovados ou descarte-os, e rode `plano`.
5. Commit com o nome do lote, numa branch, com PR para revisão.
