#!/usr/bin/env bash
# Prepara o MacBook para continuar a fila editorial do OrtoQuestões (Tales, 30/10/2026).
# Um comando só, no Terminal do Mac:
#   curl -fsSL https://raw.githubusercontent.com/talesrobertosn/ortoquestoes/claude/pdfs-questoes-tp64dr/scripts/macbook/preparar.sh | bash
# Pode rodar de novo quantas vezes quiser: só cria o que falta.
set -euo pipefail

BASE="$HOME/OrtoQuestoes-Biblioteca"
REPO="$HOME/ortoquestoes"
BRANCH="claude/pdfs-questoes-tp64dr"

echo "== 1. Pastas locais (fora do git)"
mkdir -p "$BASE"/{livros,provas,resumos,lotes,figuras,prints}
[ -f "$BASE/figuras/registro.json" ] || echo "{}" > "$BASE/figuras/registro.json"
echo "   $BASE/livros   <- coloque aqui os PDFs dos livros"
echo "   $BASE/provas   <- provas originais (nunca vão para o git)"
echo "   $BASE/resumos  <- resumos em PDF que você mandar"

echo "== 2. Programas (Homebrew)"
if ! command -v brew >/dev/null 2>&1; then
  echo "   Instale o Homebrew antes (https://brew.sh) e rode este comando de novo."; exit 1
fi
for p in git gh node poppler python@3.12; do
  brew list --versions "$p" >/dev/null 2>&1 || brew install "$p"
done
python3 -m pip install --user --quiet --break-system-packages pillow pypdf 2>/dev/null || python3 -m pip install --user --quiet pillow pypdf

echo "== 3. Repositório"
if [ ! -d "$REPO/.git" ]; then
  git clone https://github.com/talesrobertosn/ortoquestoes.git "$REPO"
fi
cd "$REPO"
git fetch -q origin
git checkout -q "$BRANCH" 2>/dev/null || git checkout -q -b "$BRANCH" "origin/$BRANCH"
git pull -q --ff-only origin "$BRANCH" || true
[ -d node_modules ] || npm ci

echo "== 4. Material de trabalho vindo do Windows (opcional)"
ZIP=$(ls -t "$HOME"/Downloads/OrtoQuestoes-material-de-trabalho*.zip "$HOME"/Desktop/OrtoQuestoes-material-de-trabalho*.zip 2>/dev/null | head -1 || true)
if [ -n "${ZIP:-}" ]; then
  echo "   Encontrado $ZIP: extraindo em $BASE (sem sobrescrever o que já existe)"
  unzip -n -q "$ZIP" -d "$BASE"
else
  echo "   Nenhum zip OrtoQuestoes-material-de-trabalho*.zip em Downloads ou Desktop (lotes, figuras, checkpoint). Pode seguir sem ele."
fi

echo "== 5. GitHub"
gh auth status >/dev/null 2>&1 || echo "   Rode: gh auth login   (necessário para abrir e mesclar PRs)"

cat <<FIM

Pronto. Próximos passos:
  1. Copie os PDFs dos livros para $BASE/livros
  2. Abra o Claude Code na pasta $REPO (app ou: cd $REPO && claude)
  3. Cole a mensagem:
     Leia docs/prompts/CONTINUAR-NO-MACBOOK.md e siga tudo, continuamente.
FIM
