# Ferramentas de apoio das provas da mão (cópia arquivada)

Estes scripts vivem na biblioteca local, fora do git, e esta pasta guarda uma cópia para não se perderem
(computador novo, outra conta). Nenhum deles contém texto de livro, resumo ou prova: só leem os arquivos
da biblioteca. Para instalar numa biblioteca nova:

```bash
B=~/OrtoQuestoes-Biblioteca
mkdir -p $B/.oq $B/lotes/simao-2023
cp docs/mao/ferramentas/{exportar.py,ver_prova.py,progresso.py,revisar.sh,revisar2026.sh,pagina.sh,onde.sh,ver_acervo.py} $B/.oq/
cp docs/mao/ferramentas/_revisar.py $B/lotes/simao-2023/
```

| Script | Onde fica | Para que serve |
|---|---|---|
| `exportar.py` | `.oq/` | Gera `.oq/texto/*.txt` (um arquivo por capítulo ou resumo, com as marcas `===== ... p. N | folha F =====`) a partir de `.oq/paginas.jsonl`. Rodar depois do `indexar`. É o jeito rápido de achar a página impressa com `grep`. |
| `ver_prova.py` | `.oq/` | `python -I .oq/ver_prova.py simao-2023` imprime as questões originais da prova (de `.oq/provas/<slug>.json`). |
| `progresso.py` | `.oq/` | Atualiza as linhas do lote no `docs/mao/PROGRESSO.md` e a linha da prova no Resumo: `python -I .oq/progresso.py "SIMÃO 2023" 18 "15|mao-2015|cap. 59, p. X|" ... --gab "A 22, B 22, C 22, D 21"`. |
| `revisar.sh` | `.oq/` | Aplica uma revisão de questões já publicadas (`revisao_NN.py`): copia, aplicar_lote, gerar_indice, validar_acervo e commit local (o push é agrupado a cada 2 a 4 revisões; ver AGENTS.md). |
| `revisar2026.sh` | `.oq/` | O mesmo para as revisões de comentário do SIMÃO 2026: `bash .oq/revisar2026.sh NN AAAA BBBB` aplica `lotes/simao-2026/revisao_NN.py` (mao-AAAA a mao-BBBB), atualiza a linha "Feito" da Retomada e faz o commit local. |
| `pagina.sh` | `.oq/` | Texto bruto de uma página impressa do Green: `bash .oq/pagina.sh "13-" 537`. Na 1ª folha do PDF (marcada com o número do capítulo), passe a folha: `bash .oq/pagina.sh "22-" 977 1`. |
| `onde.sh` | `.oq/` | Página impressa de cada ocorrência de um trecho: `bash .oq/onde.sh "Fernandez tipo" "livros__15"`. |
| `ver_acervo.py` | `.oq/` | Enunciado, alternativas, gabarito e comentário publicados: `python -X utf8 .oq/ver_acervo.py mao 2028 2032`. |
| `_comentario_simao2026.py` | `lotes/simao-2026/_comentario.py` | Base das revisões de comentário do SIMÃO 2026: pega enunciado, alternativas e gabarito do acervo e troca só o comentário. |
| `_revisar.py` | `lotes/simao-2023/` | Base das `revisao_NN.py`: carrega o `lote_NN.py` publicado, troca enunciado e alternativas, acrescenta a citação e reescreve o "Por que esta questão foi criada.". Acha os ids publicados pelo número da questão. |

## Cuidados no Windows

- Rodar Python com `PYTHONUTF8=1` (ou `python -I` nos scripts da biblioteca); sem isso o `npm test` quebra
  com `UnicodeDecodeError` no primeiro teste Python e o console embaralha acentos.
- `git push` às vezes trava sem rede: usar `timeout 180 git push -q origin HEAD`; se travar, matar o
  `git.exe` e repetir.
- Conflito de merge em `public/acervo/indice.json` (ou `busca.json`): é gerado. Pegar qualquer lado e
  rodar `python scripts/gerar_indice.py` de novo antes de commitar.
- Para tirar print de uma questão com o comentário aberto no site local: o servidor de desenvolvimento
  pede conta para responder. Para o print, trocar temporariamente em `src/paginas/QuestaoDireta.tsx` a
  linha `if (!conta) { definirPortaoContaAberto(true); return }` por uma que, só com
  `import.meta.env.DEV`, chame `definirResposta(...)`; tirar o print e desfazer com
  `git checkout -- src/paginas/QuestaoDireta.tsx`. Nunca commitar essa troca.
