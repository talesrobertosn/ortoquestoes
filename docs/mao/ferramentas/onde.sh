#!/bin/bash
# Diz a página impressa (pela marca "===== ... p. N") de cada linha do texto do capítulo que contém o trecho.
# Uso: bash onde.sh "<trecho>" "<início do nome do arquivo em .oq/texto>"   ex.: bash onde.sh "Fernandez tipo" "livros__15"
B=~/OrtoQuestoes-Biblioteca/.oq/texto
f=$(ls "$B" | grep -F "$2" | head -1)
grep -n -i -F "$1" "$B/$f" | head -20 | while IFS=: read n resto; do
  p=$(grep -n "===== .*p\. " "$B/$f" | awk -F: -v n="$n" '$1<n' | tail -1 | grep -o 'p\. [0-9?]*')
  echo "$p :: $(echo "$resto" | sed 's/  */ /g' | cut -c1-200)"
done
