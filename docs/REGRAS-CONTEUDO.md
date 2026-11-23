# Regras de conteúdo: a página única

Fonte única das regras de comentário, miniaula, resumo e simulado, em qualquer tema (criada em 23/11/2026 para
ninguém precisar reler cinco documentos a cada tarefa). Agentes leem **esta página, um exemplo aprovado e a
ficha ou o resumo do assunto**; os documentos longos ficam para dúvida pontual:
[padrao-editorial-comentarios.md](padrao-editorial-comentarios.md) (histórico e detalhes do padrão),
[mao/PROTOCOLO.md](mao/PROTOCOLO.md) (provas da mão), [biblioteca/FLUXO-MESTRE.md](biblioteca/FLUXO-MESTRE.md)
(ciclo dos temas). Se esta página e um documento antigo divergirem, vale esta página (é a orientação mais recente
do Tales). Orientação nova do Tales sobre conteúdo entra aqui, com a data.

## 1. A regra de ouro: explicar para um R1 (Tales, 23/11/2026)

Todo comentário e todo resumo é escrito como quem explica para alguém, num nível que um residente do primeiro ano
entenda. Continua citando o livro com página, mas nunca só enumera fatos.

- Cada termo técnico, epônimo, sigla e classificação é apresentado na primeira vez (o que é, para que serve).
- Cada fato citado vem com o porquê (mecanismo: anatomia, biomecânica, fisiopatologia) e o sentido clínico
  (o que muda no exame, na conduta, na prova).
- Ordem lógica, do básico ao detalhe; o número e a página entram dentro da explicação, não no lugar dela.
- A citação é trabalhada: o que ela quer dizer, por que é assim, de onde vem, como o conhecimento evoluiu.
  Nunca citação empilhada atrás de citação (17/11).
- Teste final: um R1 que nunca viu o assunto consegue explicar de volta depois de ler? Se não, reescrever.

## 2. Comentário de questão (miniaula)

- **Forma** (padrão aprovado em 17/11, `mao-2384`): introdução que explica o assunto quando ele não é trivial;
  subtítulos `### ` em frase natural (nunca título em negrito colado ao parágrafo, nunca "Peça 1", "Passo 2");
  tabela quando compara de fato; seção "### Como o conhecimento evoluiu" só quando houver evolução a contar.
  Nada é molde: cada questão é escrita do seu jeito, como um professor com o livro aberto.
- **Tamanho pela importância**, sem meta de caracteres: fato seco 0,8 a 2 mil; conceito com pegadinha 2 a 3 mil;
  mecanismo 3 a 5 mil; conduta, caso clínico ou questão-chave 4 a 8 mil. A trava só barra o raso. A régua é o
  conteúdo: o que é, o que acontece, classificação ou número, por que a correta, por que cada errada.
- **Alternativas**: cada uma, inclusive a correta, com motivo próprio (o que diz, de onde vem, quando seria
  verdadeira, por que não serve aqui, como diferenciar). A distratora perigosa ganha parágrafo; a absurda, meia
  linha. Nunca "está incorreta" sem o porquê. Campos: `correta` começa com `**X: texto.**`; cada `incorretas`
  começa com `**texto curto da alternativa**` (sem "a alternativa A", nunca começando com "também"); o
  `conceito` não cita alternativa por letra.
- **Nada copiado**: nenhum parágrafo repetido entre questões; o fato comum é contado de outro ângulo ou fica no
  resumo.
- **Ponte para o resumo**: "isso está no resumo de X, seção Y" (o resumo é o produto que prende o aluno).
- **"Por que esta questão foi criada"** só em OrtoQuestões Simulados; **"> Na prova:"** só quando houver uma
  frase de memória que valha. Questão de prova real não leva nenhum dos dois por obrigação.
- **Assunto incomum** (artrogripose, por exemplo): abrir com uma explicação curta do que é a doença ou a
  estrutura; assunto comum começa direto.

## 3. Resumo (capítulo da Biblioteca)

- Resumo é aula, não resumo: cada seção explica como uma miniaula. Mínimo de 45 KB, medido com
  `scripts/biblioteca/medir_profundidade.py`; o texto mais autoral possível, nunca colado ou traduzido do livro.
- Front matter: não mudar `edicao` nem `capitulo` de resumo existente (só `versao` + 1); subtemas separados por
  ponto e vírgula.
- Todo bloco `!questoes` leva `conceito:`, `como:` e `armadilha:` antes de `!fim`; `{radar=confirmado}` só em
  seção com questão de prova oficial ligada.
- Questão de prova em `relacionadas=`, simulado em `treino=`; todas as questões do tema ligadas na seção certa.
- Ordem de trabalho num tema: simulados, depois o resumo (ligando os simulados), depois os comentários citando o
  resumo.

## 4. Fontes e citação

- Livro, edição, capítulo e **página impressa** conferida em cada fato forte (1 a 3 citações por bloco). Sem
  página impressa (Rockwood adulto 10): só capítulo e seção, sem explicar por quê.
- Estudo citado (autor, revista, ano) só se estiver nas referências do capítulo do livro
  (`python3 scripts/livros.py buscar <livro> "<nome>"`) ou confirmado no PubMed com PMID. Nunca de memória.
- Fonte faltando: buscar fonte médica aberta e lida (PubMed, PMC, StatPearls, sociedades; nunca Wikipedia),
  citar e seguir. Fato sem fonte sai do texto ou vira lacuna no alerta.
- Mão: o Green é a base; Campbell, Rockwood, Netter e outros quando enriquecem, comparando quando os livros
  divergem ou se completam (nunca como molde). Livros locais: `python3 scripts/livros.py lista`.

## 5. Figuras

- Figura só quando ensina o que o texto não consegue (classificação desenhada, sinal de imagem, anatomia,
  técnica); na questão um pouco mais livre que no resumo; resumo de anatomia pode ter mais. Nunca enfeite.
- Reusar antes de recortar (conferir o caminho com `ls`); recorte, registro e legenda conforme
  `~/OrtoQuestoes-Biblioteca/ferramentas/brief_figuras.md`. Legenda: livro, edição, capítulo, figura.
- O texto diz o que olhar na figura, no ponto da explicação em que ela entra. Gráfico do livro vira tabela.
- Nunca foto com rosto nem dado de paciente (conferir nome, data e hora nos cantos de radiografias).

## 6. Nunca

- Travessão, itálico ou emoji no texto do site. Epônimos e classificações em MAIÚSCULAS.
- Escrever que o livro é PDF, "página do PDF", "sem página impressa".
- As siglas SBCM e SIMÃO no texto do site: SBCM vira "prova de título" ("da prova de título de 2024"); SIMÃO
  vira "simulado da prova de título de cirurgia da mão" ("do simulado da prova de título de cirurgia da mão de
  2023"). O sobrenome de autor SIMÃO MN nas referências fica. Documentos internos e nomes de arquivo podem usar.
- Trocar gabarito oficial: divergência vai para o `alerta` (que o aluno vê em destaque; nunca nota interna); sem
  gabarito oficial, `provavel` pela bibliografia. Nunca ensinar algo falso para defender o gabarito.
- Mudar subtema de questão existente (quebra o Cronograma); reescrever enunciado protegido da mão; copiar
  enunciado ou alternativa de SBCM e SIMÃO (7 palavras seguidas é cópia).
- Livros, provas originais e lotes no git; divulgar totais do acervo em texto do site.

## 7. Decidir sem perguntar

Autonomia total (Tales, 10 e 11/11/2026): gabarito, imagem, fonte e modelo dos agentes são decididos por quem
está trabalhando, registrando a decisão como RESOLVIDO em `~/OrtoQuestoes-Biblioteca/REVISAR-TALES.md`. Só se
para para pedir livro que não está no acervo (tumores).

## 8. Exemplos aprovados (abrir um antes do primeiro lote da sessão)

| Exemplo | Por que é referência |
|---|---|
| [exemplos/mao-2384.json](exemplos/mao-2384.json) | Formato organizado aprovado em 17/11: introdução, subtítulos, estudos citados |
| [exemplos/pe-tornozelo-0107.json](exemplos/pe-tornozelo-0107.json) | Figura do livro no ponto certo e comparação entre livros (10/11) |
| [exemplos/mao-0853.json](exemplos/mao-0853.json) | Profundidade da aula e das alternativas |
| [exemplos/mao-2164.json](exemplos/mao-2164.json) | Primeira miniaula aprovada (22/10) |
| [exemplos/einstein-2026-19.json](exemplos/einstein-2026-19.json) | Questão de prova real de outra banca |

## 9. Conferência automática antes de aplicar

`python3 ~/OrtoQuestoes-Biblioteca/ferramentas/bin/checar_estilo.py <lote.json ...>` barra sigla, travessão,
itálico, emoji, menção a PDF, campo vazio, figura inexistente e texto raso, e avisa quando falta página. Depois de
aplicar: `bash scripts/pos_aplicar.sh` (índice, Biblioteca, validação, testes e trava de profundidade).
