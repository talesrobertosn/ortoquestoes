#!/usr/bin/env bash
# Publica o branch atual: push, PR para a base, espera os checks e só então faz o merge.
# Criado em 30/10/2026 depois de um merge com o check vermelho: o `| head` do comando antigo escondia a falha.
#   bash scripts/publicar_pr.sh "Título da PR" arquivo-do-corpo.md
# Sai com código diferente de zero (e sem mesclar) se algum check falhar.
set -uo pipefail
TITULO="$1"; CORPO="$2"; BASE="claude/pdfs-questoes-tp64dr"
RAMO=$(git rev-parse --abbrev-ref HEAD)
# Trava de profundidade (30/10/2026): não publica resumo ou comentário abaixo do padrão.
git fetch -q origin "$BASE"
(python3 scripts/biblioteca/trava_profundidade.py || python scripts/biblioteca/trava_profundidade.py) || exit 3
git push -q -u origin "$RAMO" || exit 1
gh pr view "$RAMO" --json url -q .url >/dev/null 2>&1 || gh pr create --base "$BASE" --title "$TITULO" --body-file "$CORPO" >/dev/null || exit 1
echo "PR: $(gh pr view "$RAMO" --json url -q .url)"
sleep 20
# --watch devolve 0 só quando todos os checks passam; qualquer falha devolve outro código.
if gh pr checks "$RAMO" --watch --interval 30 --fail-fast >/dev/null 2>&1; then
  gh pr merge "$RAMO" --merge && echo "MESCLADO"
else
  echo "CHECK FALHOU: não mesclado"; gh pr checks "$RAMO"; exit 2
fi
