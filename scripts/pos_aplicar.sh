#!/usr/bin/env bash
# Depois de aplicar simulados, comentários ou um resumo: regenera o que depende do acervo e roda as conferências
# que mais quebram no "verificar" (amostras da página inicial e o Cronograma, que dependem do tamanho do acervo).
# Criado em 30/10/2026, quando um comentário novo da mao-0102 (amostra da página inicial) quebrou o teste das amostras.
#   bash scripts/pos_aplicar.sh
set -euo pipefail
export PYTHONUTF8=1
python3 scripts/gerar_indice.py >/dev/null 2>&1 || python scripts/gerar_indice.py >/dev/null
node scripts/biblioteca/gerar.mjs | tail -1
(python3 scripts/gerar_amostras_inicio.py || python scripts/gerar_amostras_inicio.py) >/dev/null
(python3 scripts/validar_acervo.py || python scripts/validar_acervo.py) | tail -1
for t in testar_amostras_inicio testar_cronograma_adiantar testar_adiantar_ponta_a_ponta testar_ligacoes_resumos; do
  node "fixtures/$t.mjs" >/dev/null || { echo "FALHOU: fixtures/$t.mjs"; exit 1; }
done
echo "pos_aplicar: tudo certo"
