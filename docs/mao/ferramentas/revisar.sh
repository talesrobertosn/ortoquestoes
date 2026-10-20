#!/bin/bash
# uso: revisar.sh NN "questões ..." "mao-AAAA a mao-BBBB"
set -e
cd ~/ortoquestoes
L=~/OrtoQuestoes-Biblioteca/lotes/simao-2023
export PYTHONUTF8=1
python -I scripts/mao/biblioteca_local.py copia $L/revisao_$1.py simao-2023
python scripts/simulados/aplicar_lote.py $L mao revisao_$1
python scripts/gerar_indice.py > /dev/null
python scripts/validar_acervo.py | tail -1
git add public/acervo docs/mao
git commit -q -m "SIMÃO 2023: revisão das questões $2 ($3), mais perto do original e com citações do Green

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
timeout 180 git push -q origin HEAD || { sleep 5; timeout 180 git push -q origin HEAD; }
git log --oneline -1
