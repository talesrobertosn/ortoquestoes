#!/usr/bin/env python3
"""Monta e exporta peças de Instagram do Orto Questões a partir de um JSON.

Adaptado do fluxo da skill cirotrigo/instagram-carousel-skill (fases de copy, curadoria, montagem, revisão e
export), trocando o servidor e o Drive do Studio Lagosta pelo acervo, pela arte e pelos tokens do Orto Questões
(DESIGN.md e docs/design/INSTAGRAM.md). Código próprio; nenhum arquivo do repositório original foi copiado.

Uso:
  python3 .claude/skills/instagram-carrossel/montar.py peca.json            # gera HTML, prévia e PNGs
  python3 .claude/skills/instagram-carrossel/montar.py peca.json --sem-png  # só HTML e prévia

O JSON (ver exemplo.json):
  {"formato": "vertical|quadrado|story", "tema": "noite|papel", "saida": "pasta", "questao": "id do acervo",
   "slides": [{"tipo": "capa|questao|passos|resposta|fecho|texto", ...}]}
"""
from __future__ import annotations

import html
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
FONTES = RAIZ / "marketing" / "instagram" / "fontes"

FORMATOS = {
    "quadrado": (1080, 1080, 80),
    "vertical": (1080, 1350, 72),
    "story": (1080, 1920, 64),
}
TEMAS = {
    # verde-noite e papel claro, iguais aos do site (DESIGN.md › Colors)
    "noite": dict(fundo="radial-gradient(70% 45% at 85% 0%, rgba(244,207,124,.14), transparent 70%), linear-gradient(180deg,#0d3f39,#0a1f1c)",
                  texto="#f6eedb", texto2="#c9d6d2", acento="#f4cf7c", linha="rgba(246,238,219,.18)", cartao="rgba(255,255,255,.06)", tinta_acento="#1b1208"),
    "papel": dict(fundo="radial-gradient(70% 45% at 85% 0%, rgba(20,101,94,.08), transparent 70%), #f6f3ea",
                  texto="#12181a", texto2="#4c5a57", acento="#14655e", linha="rgba(18,24,26,.14)", cartao="#ffffff", tinta_acento="#ffffff"),
}

SIMBOLO = ('<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#14655E"/>'
           '<g fill="#fff" opacity=".55"><rect x="13" y="10" width="22" height="8.6" rx="3.2"/><rect x="11" y="21" width="22" height="8.6" rx="3.2"/>'
           '<rect x="13" y="45" width="22" height="8.6" rx="3.2"/></g><rect x="11" y="33" width="22" height="8.6" rx="3.2" fill="#F4CF7C"/></svg>')


def e(t: str) -> str:
    """Escapa e aceita **negrito**."""
    partes = html.escape(t or "").split("**")
    return "".join(f"<b>{p}</b>" if i % 2 else p for i, p in enumerate(partes))


def img(caminho: str, saida: Path) -> str:
    alvo = (RAIZ / caminho).resolve()
    if not alvo.exists():
        raise SystemExit(f"Imagem não encontrada: {caminho}")
    return Path(*([".."] * len(saida.resolve().relative_to(RAIZ).parts)), alvo.relative_to(RAIZ)).as_posix()


def css(formato: str, tema: str) -> str:
    w, h, m = FORMATOS[formato]
    t = TEMAS[tema]
    topo = 250 if formato == "story" else m
    base = 340 if formato == "story" else m + 30
    escala = 1.0 if formato != "quadrado" else 0.92
    f = FONTES.relative_to(RAIZ).as_posix()
    return f"""
@font-face {{ font-family: Jakarta; src: url(RAIZ/{f}/plus-jakarta-sans-latin-wght-normal.woff2) format('woff2'); font-weight: 200 800; }}
@font-face {{ font-family: Inter; src: url(RAIZ/{f}/inter-latin-wght-normal.woff2) format('woff2'); font-weight: 100 900; }}
@font-face {{ font-family: Placa; src: url(RAIZ/{f}/jersey-10-latin-400-normal.woff2) format('woff2'); }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ background: #2a2a2a; font-family: Inter, sans-serif; }}
section.peca {{ position: relative; overflow: hidden; width: {w}px; height: {h}px; margin: 0 0 40px; color: {t['texto']}; background: {t['fundo']}; }}
.miolo {{ position: absolute; left: {m}px; right: {m}px; top: {topo}px; bottom: {base}px; display: flex; flex-direction: column; gap: {int(28*escala)}px; }}
.topo {{ display: flex; justify-content: space-between; align-items: center; }}
.marca {{ display: flex; align-items: center; gap: 12px; font: 500 30px Jakarta; letter-spacing: -.02em; }}
.marca svg {{ width: 46px; height: 46px; }} .marca b {{ font-weight: 800; }}
.cont {{ font: 30px Placa; letter-spacing: .06em; color: {t['acento']}; }}
.rotulo {{ font: 800 23px Inter; letter-spacing: .18em; text-transform: uppercase; color: {t['acento']}; }}
h1 {{ font: 800 {int(88*escala)}px/1.02 Jakarta; letter-spacing: -.035em; text-wrap: balance; }}
h2 {{ font: 800 {int(60*escala)}px/1.06 Jakarta; letter-spacing: -.03em; text-wrap: balance; }}
h1 em, h2 em {{ font-style: normal; color: {t['acento']}; }}
.texto {{ font: 500 {int(32*escala)}px/1.4 Inter; color: {t['texto2']}; text-wrap: pretty; }}
.texto b {{ color: {t['texto']}; font-weight: 700; }}
.figura {{ position: relative; flex: 1 1 auto; min-height: 0; border-radius: 22px; overflow: hidden; background: #000; box-shadow: 0 0 0 2px {t['linha']}; }}
.figura img {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }}
.figura small {{ position: absolute; left: 14px; bottom: 12px; padding: 4px 12px; border-radius: 999px; font: 700 18px Inter; letter-spacing: .08em; text-transform: uppercase; color: #12181a; background: rgba(246,243,234,.92); }}
.alts {{ display: grid; gap: 14px; }}
.alt {{ display: grid; grid-template-columns: 64px 1fr; align-items: center; gap: 18px; padding: 16px 20px; border-radius: 16px; background: {t['cartao']}; box-shadow: inset 0 0 0 2px {t['linha']}; font: 600 {int(30*escala)}px/1.25 Jakarta; }}
.alt i {{ display: grid; place-items: center; width: 56px; height: 56px; border-radius: 12px; font: 800 30px Jakarta; font-style: normal; color: {t['tinta_acento']}; background: {t['acento']}; }}
.alt.certa {{ box-shadow: inset 0 0 0 3px {t['acento']}; }}
.passos {{ display: grid; gap: 22px; }}
.passo {{ display: grid; grid-template-columns: 72px 1fr; gap: 22px; padding-bottom: 22px; border-bottom: 2px solid {t['linha']}; }}
.passo:last-child {{ border: 0; padding-bottom: 0; }}
.passo i {{ font: 64px/0.9 Placa; font-style: normal; color: {t['acento']}; }}
.passo h3 {{ font: 800 {int(38*escala)}px/1.15 Jakarta; letter-spacing: -.02em; }}
.passo p {{ margin-top: 8px; font: 500 {int(29*escala)}px/1.4 Inter; color: {t['texto2']}; }}
.passo p b {{ color: {t['texto']}; }}
.letra {{ display: flex; align-items: center; gap: 28px; }}
.letra i {{ display: grid; place-items: center; width: 150px; height: 150px; border-radius: 30px; font: 800 104px Jakarta; font-style: normal; color: {t['tinta_acento']}; background: {t['acento']}; flex: none; }}
.prova {{ margin-top: auto; padding: 26px 30px; border-radius: 20px; background: {t['acento']}; color: {t['tinta_acento']}; font: 800 {int(36*escala)}px/1.25 Jakarta; letter-spacing: -.01em; }}
.prova small {{ display: block; margin-bottom: 6px; font: 800 20px Inter; letter-spacing: .2em; text-transform: uppercase; opacity: .75; }}
.site {{ margin-top: auto; font: 600 28px/1.4 Inter; color: {t['texto2']}; }}
.site b {{ display: block; font: 800 44px Jakarta; letter-spacing: -.02em; color: {t['texto']}; }}
.mascote {{ position: absolute; right: {m}px; bottom: {base - 10}px; width: 200px; image-rendering: pixelated; }}
.fonte {{ font: 500 18px Inter; color: {t['texto2']}; opacity: .8; }}
.progresso {{ position: absolute; left: {m}px; right: {m}px; bottom: {int(m*0.55)}px; height: 4px; border-radius: 4px; background: {t['linha']}; }}
.progresso span {{ display: block; height: 100%; border-radius: inherit; background: {t['acento']}; }}
""".replace("RAIZ/", "")


def slide(s: dict, i: int, n: int, cfg: dict, saida: Path) -> str:
    tipo = s["tipo"]
    pre = ""
    corpo = ""
    if s.get("rotulo"):
        pre = f'<p class="rotulo">{e(s["rotulo"])}</p>'
    if tipo == "capa":
        corpo = f'{pre}<h1>{s["titulo"]}</h1>' + (f'<p class="texto">{e(s.get("texto",""))}</p>' if s.get("texto") else "")
        if s.get("imagem"):
            corpo += f'<div class="figura"><img src="{img(s["imagem"], saida)}" alt=""><small>{e(s.get("legenda","Imagem da prova"))}</small></div>'
    elif tipo == "questao":
        corpo = pre
        if s.get("imagem"):
            corpo += f'<div class="figura"><img src="{img(s["imagem"], saida)}" alt=""><small>Imagem da prova</small></div>'
        corpo += f'<p class="texto" style="color:inherit;font-weight:700">{e(s["enunciado"])}</p><div class="alts">'
        corpo += "".join(f'<div class="alt"><i>{a["letra"]}</i><span>{e(a["texto"])}</span></div>' for a in s["alternativas"])
        corpo += "</div>"
    elif tipo == "passos":
        corpo = f'{pre}<h2>{s["titulo"]}</h2><div class="passos">'
        corpo += "".join(f'<div class="passo"><i>{k + 1}</i><div><h3>{e(p["titulo"])}</h3><p>{e(p["texto"])}</p></div></div>' for k, p in enumerate(s["passos"]))
        corpo += "</div>"
    elif tipo == "resposta":
        corpo = f'{pre}<div class="letra"><i>{s["letra"]}</i><h2>{e(s["titulo"])}</h2></div><p class="texto">{e(s.get("texto",""))}</p>'
        if s.get("erradas"):
            corpo += '<div class="passos">' + "".join(f'<div class="passo"><i>{x["letra"]}</i><div><p style="margin:0">{e(x["texto"])}</p></div></div>' for x in s["erradas"]) + "</div>"
        if s.get("prova"):
            corpo += f'<p class="prova"><small>Para a prova</small>{e(s["prova"])}</p>'
    elif tipo == "fecho":
        corpo = f'{pre}<h2>{s.get("titulo","Questões comentadas como uma aula.")}</h2><p class="texto">{e(s.get("texto",""))}</p>'
        corpo += '<p class="site"><b>ortoquestoes.com.br</b>o caminho está no nosso perfil</p>'
    else:
        corpo = f'{pre}<h2>{s.get("titulo","")}</h2><p class="texto">{e(s.get("texto",""))}</p>'
    mascote = f'<img class="mascote" src="{img(s["mascote"], saida)}" alt="">' if s.get("mascote") else ""
    barra = f'<div class="progresso"><span style="width:{(i + 1) / n * 100:.1f}%"></span></div>' if cfg["formato"] != "story" and n > 1 else ""
    return (f'<section class="peca" id="{i + 1:02d}-{tipo}" data-question="{cfg.get("questao","")}">'
            f'<div class="miolo"><div class="topo"><span class="marca">{SIMBOLO}<span><b>Orto</b> Questões</span></span>'
            f'<span class="cont">{i + 1}/{n}</span></div>{corpo}</div>{mascote}{barra}</section>')


def previa(nomes: list[str], formato: str) -> str:
    w, h, _ = FORMATOS[formato]
    larg = 300
    alt = int(larg * h / w)
    itens = "".join(f'<figure><div class="tela" style="height:{alt}px"><img src="png/{n}.png" alt=""></div><figcaption>{n}</figcaption></figure>' for n in nomes)
    return f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Prévia</title><style>
body{{margin:0;padding:32px;background:#f1f3f2;font:500 14px system-ui;color:#12181a}}h1{{font:800 22px system-ui;margin:0 0 20px}}
.fila{{display:flex;gap:24px;overflow-x:auto;padding-bottom:16px}}figure{{margin:0;flex:none}}
.tela{{width:{larg}px;border-radius:18px;overflow:hidden;background:#000;box-shadow:0 0 0 1px #dce2e0,0 10px 28px rgba(0,0,0,.12)}}
.tela img{{width:100%;height:100%;object-fit:cover;display:block}}figcaption{{margin-top:8px;color:#5b686c}}</style></head>
<body><h1>Prévia · {formato} ({w}×{h})</h1><div class="fila">{itens}</div></body></html>"""


def exportar(html_path: Path, pasta_png: Path, formato: str) -> list[Path]:
    from playwright.sync_api import sync_playwright
    w, h, _ = FORMATOS[formato]
    pasta_png.mkdir(parents=True, exist_ok=True)
    feitos = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
        pg.goto(html_path.resolve().as_uri())
        pg.evaluate("document.fonts.ready")
        pg.wait_for_timeout(300)
        for el in pg.query_selector_all("section.peca"):
            nome = el.get_attribute("id")
            alvo = pasta_png / f"{nome}.png"
            el.screenshot(path=str(alvo))
            feitos.append(alvo)
        b.close()
    return feitos


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    cfg = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    formato, tema = cfg.get("formato", "vertical"), cfg.get("tema", "noite")
    if formato not in FORMATOS or tema not in TEMAS:
        raise SystemExit(f"formato deve ser {list(FORMATOS)} e tema {list(TEMAS)}")
    saida = (RAIZ / cfg["saida"]) if not Path(cfg["saida"]).is_absolute() else Path(cfg["saida"])
    saida.mkdir(parents=True, exist_ok=True)
    n = len(cfg["slides"])
    corpo = "".join(slide(s, i, n, cfg, saida) for i, s in enumerate(cfg["slides"]))
    rel_fontes = Path(*([".."] * len(saida.resolve().relative_to(RAIZ).parts))).as_posix()
    estilo = css(formato, tema).replace("url(marketing/", f"url({rel_fontes}/marketing/")
    pagina = saida / "peca.html"
    pagina.write_text(f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Peça</title><style>{estilo}</style></head><body>{corpo}</body></html>', encoding="utf-8")
    nomes = [f"{i + 1:02d}-{s['tipo']}" for i, s in enumerate(cfg["slides"])]
    (saida / "previa.html").write_text(previa(nomes, formato), encoding="utf-8")
    print(f"HTML: {pagina.relative_to(RAIZ)}")
    if "--sem-png" not in sys.argv:
        for f in exportar(pagina, saida / "png", formato):
            print(f"PNG:  {f.relative_to(RAIZ)}")
        print(f"Prévia: {(saida / 'previa.html').relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
