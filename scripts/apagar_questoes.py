"""Tira questões de vez dos arquivos do acervo (tema e comentários) e regera o índice.

Uso:
  python3 scripts/apagar_questoes.py mao-0218 pediatria-0936     # ids dados à mão
  python3 scripts/apagar_questoes.py --do-painel                 # as marcadas como "apagada" no painel

Com --do-painel, lê as edições públicas do Supabase (RPC edicoes_questoes) e
precisa de SUPABASE_URL e SUPABASE_CHAVE (a chave pública, a mesma do site) no
ambiente. Depois de rodar e publicar, a marcação no painel pode ser desfeita:
a questão já não existe no acervo.
"""
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
ACERVO = RAIZ / "public" / "acervo"


def apagadas_no_painel() -> list[str]:
    url, chave = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_CHAVE")
    if not url or not chave:
        sys.exit("Defina SUPABASE_URL e SUPABASE_CHAVE para usar --do-painel.")
    pedido = urllib.request.Request(
        url.rstrip("/") + "/rest/v1/rpc/edicoes_questoes", data=b"{}", method="POST",
        headers={"apikey": chave, "Authorization": f"Bearer {chave}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(pedido, timeout=30) as r:
        linhas = json.load(r)
    return sorted(l["id_questao"] for l in linhas if (l.get("dados") or {}).get("apagada"))


def gravar(caminho: Path, bruto: str, dados) -> None:
    indent = 2 if bruto.startswith("{\n  ") or bruto.startswith("[\n  ") else 1
    caminho.write_text(json.dumps(dados, ensure_ascii=False, indent=indent) + ("\n" if bruto.endswith("\n") else ""), encoding="utf-8")


def principal() -> int:
    args = sys.argv[1:]
    ids = apagadas_no_painel() if args == ["--do-painel"] else args
    if not ids:
        print("Nenhuma questão para apagar.")
        return 0
    por_tema: dict[str, set[str]] = {}
    for i in ids:
        por_tema.setdefault(i.rsplit("-", 1)[0], set()).add(i)
    for tema, alvo in por_tema.items():
        arq = ACERVO / "temas" / f"{tema}.json"
        if not arq.exists():
            print(f"  tema {tema} não existe; ignorando {sorted(alvo)}")
            continue
        bruto = arq.read_text(encoding="utf-8")
        dados = json.loads(bruto)
        lista = dados["questoes"] if isinstance(dados, dict) else dados
        restantes = [q for q in lista if q["id"] not in alvo]
        saiu = len(lista) - len(restantes)
        if isinstance(dados, dict):
            dados["questoes"] = restantes
        else:
            dados = restantes
        gravar(arq, bruto, dados)
        arq_c = ACERVO / "comentarios" / f"{tema}.json"
        if arq_c.exists():
            bruto_c = arq_c.read_text(encoding="utf-8")
            com = json.loads(bruto_c)
            if isinstance(com, dict):
                for i in alvo:
                    com.pop(i, None)
                gravar(arq_c, bruto_c, com)
        print(f"  {tema}: {saiu} questão(ões) retirada(s) {sorted(alvo)}")
    subprocess.run([sys.executable, str(RAIZ / "scripts" / "gerar_indice.py")], check=True, stdout=subprocess.DEVNULL)
    return subprocess.run([sys.executable, str(RAIZ / "scripts" / "validar_acervo.py")]).returncode


if __name__ == "__main__":
    sys.exit(principal())
