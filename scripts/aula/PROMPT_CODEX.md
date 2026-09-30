# Prompt para continuar o enriquecimento dos comentários (Codex / ChatGPT)

Cole o texto abaixo, a partir da linha "Você vai continuar...", no Codex conectado ao repositório
`talesrobertosn/ortoquestoes`, na branch `claude/pdfs-questoes-tp64dr`.

---

Você vai continuar um trabalho editorial no repositório `talesrobertosn/ortoquestoes`, um banco de questões
de prova de título em ortopedia (TEOT, TARO, TECOC, ENARE). Trabalhe SEMPRE na branch
`claude/pdfs-questoes-tp64dr`, faça commits pequenos e frequentes e dê push nela. Escreva tudo em português
do Brasil.

## Objetivo

Reescrever os comentários das questões no formato "aula": quem lê o comentário deve sair como se tivesse
assistido a uma aula curta sobre o tema da questão, e não apenas sabendo a letra certa. Os comentários
ficam em `public/acervo/comentarios/<tema>.json`. As questões (enunciado, alternativas, gabarito, imagens)
ficam em `public/acervo/temas/<tema>.json`. As imagens ficam em `public/imagens/`.

## Fluxo de trabalho (use os scripts, não edite o JSON à mão)

1. Veja as próximas questões pendentes de um tema:
   `python3 scripts/aula/fila.py trauma 6`
   (mostra 6 questões; o total restante aparece como "# restantes N")
   - sem opção: comentários crus (prioridade 1)
   - `--topicos`: formato antigo com "###" e tabelas (prioridade 2)
   - `--corrido`: texto corrido antigo sem o parágrafo "Na prova" (prioridade 3)
2. Escreva um lote de 6 questões num arquivo de texto FORA do repositório (por exemplo `/tmp/lote01.txt`),
   no formato mostrado em `scripts/aula/exemplo_lote.txt`.
3. Aplique: `python3 scripts/aula/montar.py /tmp/lote01.txt`
   O script valida o formato e grava no JSON do tema. Se acusar erro, corrija o lote e rode de novo.
4. A cada 3 ou 4 lotes: `python3 scripts/validar_acervo.py`, depois
   `git add public/acervo/comentarios/<tema>.json`, commit com mensagem curta
   (ex.: "Comentários em formato aula: trauma, mais 24 questões") e push.
5. Repita até a fila zerar, tema por tema.

Ordem sugerida:
1. `trauma` (crus)
2. `--topicos` em: `ombro-cotovelo`, `joelho`, `conceitos-basicos`, `coluna`, `trauma`, `pe-tornozelo`,
   `quadril`, `mao`, `pediatria`
3. `--corrido` em: `ombro-cotovelo`, `trauma`

## Formato do lote (obrigatório; o script recusa se não seguir)

```
@@ trauma-1051
## conceito
**Título curto.** Parágrafo explicativo...

**Outro título.** Parágrafo...

**Mais um título.** Parágrafo...

**Na prova:** resumo de uma ou duas linhas do que cai.
## correta
**Frase curta em negrito com a resposta.** Por que ela está certa.
## A
**Frase curta em negrito.** Por que está errada e a que situação essa opção pertence.
## C
**...** ...
```

- `## conceito`: 4 a 5 parágrafos, separados por linha em branco, cada um começando com `**Título.**`,
  e o último sempre começando com `**Na prova:**`. Cerca de 1.500 a 2.000 caracteres no total.
- `## correta`: começa com negrito, explica o porquê em 1 a 2 frases.
- Uma seção `## X` para CADA alternativa errada (use a letra da alternativa). Nunca crie seção para a
  letra correta. Cada uma começa com negrito e diz em que contexto aquela opção seria verdadeira.
- `## alerta` (opcional, antes do conceito): só quando o gabarito oficial é duvidoso. Explique a dúvida
  de forma honesta e mantenha o gabarito da banca. Se a questão já tinha alerta, copie-o de volta no lote
  (ou deixe sem a seção, que o script preserva o antigo).

## Regras de estilo

- Texto corrido, didático, como uma boa aula. Nada de listas com marcadores, nada de `###`, nada de tabelas.
- Proibido o travessão (os caracteres "—" e "–"). Use vírgula, dois-pontos ou ponto.
- Negrito com moderação: nos títulos dos parágrafos e em poucos termos-chave.
- Sem emoji. Sem mencionar inteligência artificial.
- Conteúdo que deve aparecer quando fizer sentido: definição, anatomia e mecanismo, classificação completa
  (todos os tipos, não só o da questão), números de corte que caem em prova, tratamento, complicações,
  e armadilhas comuns das bancas.

## Regras de conteúdo (as mais importantes)

- NUNCA mude o gabarito. Se discordar dele, mantenha a resposta oficial e escreva um `## alerta` claro.
- Não invente números, autores ou classificações. Se não tiver certeza de um dado, escreva de forma mais
  geral ou use o alerta. Precisão vale mais que volume.
- Questões com imagem: ABRA a imagem (o caminho aparece na linha da fila, em `public/imagens/...`) antes de
  escrever. Vários comentários antigos descreviam a imagem errada; confira sempre.
- O comentário antigo serve de ponto de partida, mas pode estar errado. Corrija o que estiver errado.
- Mantenha coerência com questões irmãs do mesmo assunto (use o mesmo valor de corte e a mesma
  classificação em todas).

## Segurança

- Nunca grave senhas, e-mails de login, tokens ou variáveis de ambiente em arquivos do repositório.
- Não altere nada fora de `public/acervo/comentarios/` (e, se precisar, destes scripts em `scripts/aula/`).
- Não reformate os arquivos JSON inteiros; o script de aplicação já grava no formato certo
  (indentação de 1 espaço). Se o `git diff --stat` mostrar milhares de linhas alteradas num lote de 6,
  algo saiu errado: desfaça e refaça pelo script.
