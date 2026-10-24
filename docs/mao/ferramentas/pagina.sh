#!/bin/bash
# Mostra o texto (pdftotext -raw) de UMA página impressa de um capítulo do Green.
# Uso: bash pagina.sh "<início do nome do PDF>" <página impressa> [folha]
#   bash pagina.sh "13-" 537          (capítulo 13, página 537)
#   bash pagina.sh "22-" 977 1        (quando a página é a 1ª folha do PDF, que leva o número do capítulo)
# A folha vem da marca "===== livros\<pdf> | p. N | folha F =====" do texto em .oq/texto.
# Cuidado: a 1ª folha de cada PDF é marcada com o número do capítulo, não com a página; passe a folha à mão.
B=~/OrtoQuestoes-Biblioteca
pdf=$(ls "$B/livros" | grep -E "^$1" | head -1)
[ -z "$pdf" ] && { echo "PDF não encontrado para '$1'" >&2; exit 1; }
folha=$3
if [ -z "$folha" ]; then
  marca='livros\'"$pdf |"
  txt=$(grep -l -F "$marca" "$B"/.oq/texto/livros__*.txt | head -1)
  folha=$(grep -F "| p. $2 | folha" "$txt" | grep -o "folha [0-9]*" | grep -o "[0-9]*" | head -1)
fi
[ -z "$folha" ] && { echo "Página $2 sem marca em $pdf; passe a folha como 3º argumento" >&2; exit 1; }
pdftotext -enc UTF-8 -raw -f "$folha" -l "$folha" "$B/livros/$pdf" - 2>/dev/null | grep -v "^Machine Translated"
