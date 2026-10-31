#!/usr/bin/env bash
# Testa o ambiente de design: skills instaladas, DESIGN.md válido, carrossel nos 3 formatos e comparação visual.
# Uso: bash scripts/design/testar_design.sh
set -u
cd "$(dirname "$0")/../.."
SAIDA=scripts/design/.saida-teste
rm -rf "${SAIDA:?}" && mkdir -p "$SAIDA"
falhas=0
ok() { echo "  ok  $1"; }
erro() { echo "  ERRO $1"; falhas=$((falhas+1)); }

echo "1. Skills (SKILL.md com name e description)"
for s in impeccable ui-ux-pro-max frontend-design canvas-design theme-factory design instagram-carrossel refero-design ui-styling design-system arte-hd2d; do
  f=.claude/skills/$s/SKILL.md
  if [ -f "$f" ] && grep -q '^name:' "$f" && grep -q '^description:' "$f"; then ok "$s"
  elif [ "$s" = impeccable ]; then echo "  aviso impeccable fora desta sessão (rode: npx impeccable install)"
  else erro "$s sem SKILL.md válido"; fi
done

echo "2. DESIGN.md e PRODUCT.md"
python3 - <<'PY' && ok "frontmatter do DESIGN.md e cores presentes em tokens.css" || erro "DESIGN.md"
import re, yaml, pathlib
t = pathlib.Path("DESIGN.md").read_text()
fm = yaml.safe_load(t.split("---")[1])
tokens = pathlib.Path("src/estilos/tokens.css").read_text().lower() + pathlib.Path("src/estilos/paginas/InicioHd.css").read_text().lower()
faltam = [k for k, v in fm["colors"].items() if v.lower() not in tokens]
assert not faltam, f"cores fora dos tokens: {faltam}"
for sec in ["## Overview", "## Colors", "## Typography", "## Layout", "## Elevation & Depth", "## Shapes", "## Components", "## Do's and Don'ts"]:
    assert sec in t, sec
assert "impeccable:product-schema" in pathlib.Path("PRODUCT.md").read_text()
PY
if [ -x .claude/skills/impeccable/scripts/impeccable ]; then
  .claude/skills/impeccable/scripts/impeccable context 2>/dev/null | grep -q '"designPath": "DESIGN.md"' && ok "impeccable encontra DESIGN.md e PRODUCT.md" || erro "impeccable context"
fi

echo "3. UI UX Pro Max (busca local)"
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "medical education dashboard" --domain product --max-results 1 >/dev/null 2>&1 && ok "search.py responde" || erro "search.py"

echo "4. Carrossel nos 3 formatos (Playwright)"
for fmt in quadrado vertical story; do
  python3 - "$fmt" "$SAIDA" <<'PY'
import json, sys
c = json.load(open(".claude/skills/instagram-carrossel/exemplo.json"))
c["formato"], c["saida"] = sys.argv[1], f"{sys.argv[2]}/{sys.argv[1]}"
c["slides"] = c["slides"][:2] + c["slides"][3:4]
json.dump(c, open(f"{sys.argv[2]}/{sys.argv[1]}.json", "w"))
PY
  python3 .claude/skills/instagram-carrossel/montar.py "$SAIDA/$fmt.json" >/dev/null 2>&1 \
    && python3 scripts/design/conferir_pngs.py "$SAIDA/$fmt/png" --formato "$fmt" >/dev/null && ok "$fmt" || erro "$fmt"
done

echo "5. Comparação visual"
a=$SAIDA/vertical/png/01-capa.png; b=$SAIDA/vertical/png/02-questao.png
python3 scripts/design/comparar_visual.py "$a" "$a" --limite 0 >/dev/null && ok "imagem igual = 0%" || erro "igual"
python3 scripts/design/comparar_visual.py "$a" "$b" --limite 1 --saida "$SAIDA/diff.png" >/dev/null && erro "diferentes deveriam falhar" || ok "imagens diferentes detectadas"

echo; [ $falhas -eq 0 ] && echo "Tudo certo." || echo "$falhas falha(s)."
exit $falhas
