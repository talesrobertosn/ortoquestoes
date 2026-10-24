#!/bin/bash
# uso: revisar2026.sh NN AAAA BBBB  (aplica lotes/simao-2026/revisao_NN.py, ids mao-AAAA a mao-BBBB) [tema]
set -e
cd ~/ortoquestoes
export PYTHONUTF8=1
T=${4:-mao}
python scripts/simulados/aplicar_lote.py ~/OrtoQuestoes-Biblioteca/lotes/simao-2026 $T revisao_$1
python scripts/gerar_indice.py > /dev/null
python scripts/validar_acervo.py | tail -1
N=$(printf "%02d" $((10#$1 + 1))); A=$((10#$3 + 1)); B=$((10#$3 + 5))
sed -i -E "s/   Feito: revisões 01 a [0-9]+ \(mao-1719 a mao-[0-9]+\)\. Próximo: revisão [0-9]+ \(mao-[0-9]+ a mao-[0-9]+\)\./   Feito: revisões 01 a $1 (mao-1719 a $T-$3). Próximo: revisão $N (mao-$A a mao-$B)./" docs/mao/PROGRESSO.md
grep -n "Feito: revisões" docs/mao/PROGRESSO.md
git add public/acervo docs/mao
git commit -q -m "SIMÃO 2026: comentários refeitos com o Green ($T-$2 a $T-$3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
# push agrupado (diretriz de 20/10/2026): enviar com "timeout 180 git push -q origin HEAD" a cada 2 a 4 revisões
git log --oneline -1
