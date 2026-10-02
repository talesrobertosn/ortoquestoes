# Prompt para continuar o enriquecimento dos comentários (Codex / ChatGPT)

Cole o texto abaixo, a partir da linha "Você vai continuar...", no Codex conectado ao repositório
`talesrobertosn/ortoquestoes`, na branch `claude/pdfs-questoes-tp64dr`.

---

Você vai continuar um trabalho editorial no repositório `talesrobertosn/ortoquestoes`, um banco de questões
de prova de título em ortopedia (TEOT, TARO, TECOC, ENARE). Trabalhe SEMPRE na branch
`claude/pdfs-questoes-tp64dr`, faça commits pequenos e frequentes e dê push nela. Escreva tudo em português
do Brasil.

## Diretriz do dono do projeto (02/10/2026): cada questão é uma aula isolada

Vale para todo comentário novo ou reescrito, acima de qualquer regra de tamanho deste arquivo:

- Sempre explicar o MOTIVO da resposta. Nunca assumir que quem lê já conhece o tema.
- Todo conceito, sigla, classificação, epônimo ou sinal citado é explicado na primeira vez em que
  aparece, em linguagem simples, como se o leitor nunca tivesse ouvido falar dele.
- Explicar tudo o que a questão exige: definição, anatomia ou mecanismo, classificação completa,
  números de corte, conduta e armadilhas da banca.
- Para CADA alternativa errada, dizer o que ela é, a que situação ela pertence e por que não responde
  a esta pergunta. Uma linha curta do tipo "fecha antes" não basta.
- O comentário precisa funcionar sozinho: quem cair direto nesta questão sai sabendo o tema, sem
  depender de outra questão do acervo.
- O tamanho segue a necessidade da explicação.
- Forma livre: nenhum molde fixo. Cada comentário é uma peça única, escrita como um professor humano
  escreveria para aquela questão. Títulos em negrito no começo de cada parágrafo, o fecho "Na prova:",
  listas ou tabelas só entram quando fazem sentido para aquela questão, nunca por obrigação. Repetir a
  mesma estrutura em todas fica artificial; varie a abertura, o ritmo e a organização.
  Esta diretriz substitui as regras de formato das seções abaixo (títulos obrigatórios, "Na prova",
  proibição de listas); continua valendo não usar travessão.
- Referências: na seção `## referencias` do lote (uma por linha). Só citar referência conferida; sem
  DOI quando ele não puder ser conferido.

## O que já foi feito (histórico para você se situar)

Este trabalho começou com o Claude Code. Até agora:

- O formato "aula" foi definido e aprovado pelo dono do projeto (médico ortopedista) depois de ver o
  resultado no celular. Não mude o formato.
- **ombro-cotovelo**: todos os comentários crus foram reescritos no formato aula (cerca de 250 questões).
- **trauma**: 288 questões reescritas no formato aula (de trauma-0257 até trauma-1050, na ordem da fila).
- Comentários antigos que descreviam a IMAGEM errada foram corrigidos depois de abrir a figura:
  trauma-0770 (era um descolamento epifisário do fêmur distal, não o úmero), trauma-0787 (haste umeral
  GROSSA demais para o canal distal, e não fina), trauma-0912 (via posterior de Bosworth do fêmur),
  trauma-0979 (pseudartrose do colo cirúrgico, Boileau 3), trauma-0980 (distâncias dos fios na banda de
  tensão do olécrano) e trauma-1026 (semitendíneo e semimembranáceo). Isso mostra que vale a pena abrir
  todas as imagens.
- Foram acrescentados alertas quando o gabarito oficial parece discutível, por exemplo: trauma-1021
  (regra de Coventry: a conta trigonométrica dá 57 mm, a banca diz 67 mm), trauma-0851 (placa de 95 graus
  na subtrocantérica), trauma-0304 e trauma-0683 (supinação x pronação na via lateral do cotovelo),
  trauma-0272 (die-punch como AO B3), trauma-0532 (MIPO do úmero), trauma-0723 (projétil como Gustilo IIIB),
  trauma-1000 (meniscos). Os gabaritos foram mantidos.
- Correção feita em trauma-0483: o grupo D de Herbert é D1 união fibrosa, D2 pseudartrose, D3 pseudartrose
  esclerótica, D4 com necrose do polo proximal.

Valores já usados nos comentários (mantenha a coerência com eles):
- Escápula (critérios de Cole): medialização de 20 mm, angulação sagital de 45 graus, ângulo glenopolar de
  22 graus ou menos, ou 15 mm com 29 graus.
- TLICS (toracolombar): compressão 1, explosão 2, translação 3, distração 4; LCP indeterminado 2, roto 3;
  raiz 2, medular completa 2, incompleta 3; 5 ou mais é cirúrgico.
- SLIC (cervical): compressão 1, explosão 2, distração 3, rotação ou translação 4; discoligamentar 0, 1, 2;
  raiz 1, completa 2, incompleta 3, mais 1 se compressão contínua; 5 ou mais é cirúrgico.
- Denis (sacro): zona I cerca de 6% de lesão neurológica, II cerca de 28%, III acima de 50%.
- Síndrome compartimental: delta P (diastólica menos compartimento) abaixo de 30 mmHg; lesão irreversível
  a partir de cerca de 8 horas.
- Fratura transtrocantérica: TAD abaixo de 25 mm; parede lateral de 20,5 mm ou menos é incompetente,
  medida 3 cm abaixo do tubérculo inominado a 135 graus.
- Hertel (úmero proximal): calcar de 8 mm ou menos e dobradiça medial rompida acima de 2 mm.

Um cuidado técnico que já causou problema: os arquivos `public/acervo/comentarios/*.json` usam indentação
de 1 espaço. Se algum dia precisar editar um desses arquivos por script próprio, grave com
`json.dumps(dados, ensure_ascii=False, indent=1) + "\n"`; do contrário o diff vira o arquivo inteiro.

## O que falta (situação no momento da passagem)

| Etapa | Tema | Pendentes |
|---|---|---|
| 1. Crus (`fila.py TEMA`) | trauma | 27 (a partir de trauma-1051) |
| 2. Tópicos antigos (`fila.py TEMA N 0 --topicos`) | pediatria | 564 |
| | mao | 476 |
| | quadril | 417 |
| | pe-tornozelo | 255 |
| | trauma | 243 |
| | coluna | 238 |
| | conceitos-basicos | 201 |
| | joelho | 190 |
| | ombro-cotovelo | 10 |
| 3. Corrido antigo sem "Na prova" (`fila.py TEMA N 0 --corrido`) | trauma | 200 |
| | ombro-cotovelo | 134 |

Os temas `osteometabolicas` e `tumores` já estão completos. Confira os números atuais rodando o
`fila.py` antes de começar, porque a fila é calculada a partir dos arquivos.

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
