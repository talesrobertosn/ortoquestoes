"""Gera post.html do post do Torneio de Flashcards (rodar da raiz do repositório):
    python3 marketing/instagram/posts/2026-10-13-torneio-flashcards/gerar_post.py
    node marketing/instagram/gerar.mjs marketing/instagram/posts/2026-10-13-torneio-flashcards/post.html
"""
import json
D='marketing/instagram/posts/2026-10-13-torneio-flashcards/'
R='../../../../public/flashcards/'
_m=open('marketing/instagram/estilos/mecanica-fina/modelo.html').read()
svg=_m[_m.find('<body>')+6:_m.find('<section')]  # símbolo oficial da marca
meta={}
for n in ['heroi-1','heroi-2','heroi-3','heroi-4','heroi-5','heroi-6','dragao','guardiao','guardiao-real','guardiao-prata','gosma','gosma-rainha','gosma-acida','golem','golem-obsidiana','golem-cristal','serpente','serpente-eletrica']:
    meta[n]=json.load(open('public/flashcards/sprites/'+n+'.json'))

def spr(n,k,cls='',style='',flip=False):
    m=meta[n]; w,h=m['largura'],m['altura']
    return (f'<div class="spr {cls}{" flip" if flip else ""}" style="width:{w*k}px;height:{h*k}px;'
            f'background-image:url({R}sprites/{n}.png);background-size:{w*6*k}px auto;{style}"></div>')

def cena(nome,fmt,extra=''):
    b=f'{R}cenarios/{nome}-{fmt}-'
    return (f'<div class="cena {extra}"><i class="c fundo" style="background-image:url({b}fundo.png)"></i>'
            f'<i class="c meio" style="background-image:url({b}meio.png)"></i>'
            f'<i class="c frente" style="background-image:url({b}frente.png)"></i>'
            f'<i class="c luz" style="background-image:url({b}luz.png)"></i><i class="poeira"></i><i class="vinheta"></i></div>')

marca='<div class="marca"><svg><use href="#sim"/></svg><b>Orto</b>&nbsp;Questões</div>'
def topo(n,tot,rot='Torneio de Flashcards'):
    return f'<header class="topo">{marca}<span class="pilula">Beta público</span></header>'

css='''
@font-face{font-family:Cinzel;src:url(../../fontes/cinzel-latin-700-normal.woff2);font-weight:700}
@font-face{font-family:Cinzel;src:url(../../fontes/cinzel-latin-900-normal.woff2);font-weight:900}
@font-face{font-family:Cinzel;src:url(../../fontes/cinzel-latin-600-normal.woff2);font-weight:600}
@font-face{font-family:Alegreya;src:url(../../fontes/alegreya-latin-400-normal.woff2);font-weight:400}
@font-face{font-family:Alegreya;src:url(../../fontes/alegreya-latin-500-normal.woff2);font-weight:500}
@font-face{font-family:Alegreya;src:url(../../fontes/alegreya-latin-700-normal.woff2);font-weight:700}
@font-face{font-family:Alegreya;src:url(../../fontes/alegreya-latin-500-italic.woff2);font-weight:500;font-style:italic}
@font-face{font-family:J;src:url(../../fontes/plus-jakarta-sans-latin-wght-normal.woff2);font-weight:200 800}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#111;color:#fff7e6;font-family:Alegreya,Georgia,serif}
section{position:relative;width:1080px;height:1350px;overflow:hidden;margin-bottom:40px;background:#07090c;isolation:isolate}
section.story{height:1920px}
.cena{position:absolute;inset:0;z-index:0;overflow:hidden}
.cena .c{position:absolute;inset:-3%;background-size:cover;background-position:center;image-rendering:pixelated}
.cena .fundo{filter:blur(2.2px) brightness(.78) saturate(1.1)}
.cena .meio{filter:brightness(.92) saturate(1.08)}
.cena .frente{filter:blur(7px) brightness(.5);transform:scale(1.14)}
.cena .luz{mix-blend-mode:screen;opacity:.95;filter:blur(1px)}
.cena.desfoca .meio{filter:blur(3px) brightness(.7)}
.cena.desfoca .fundo{filter:blur(5px) brightness(.6)}
.vinheta{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,transparent 35%,rgba(4,3,2,.78) 100%)}
.poeira{position:absolute;inset:0}
.poeira b{position:absolute;border-radius:50%;background:radial-gradient(circle,#fff3c4 0,#f4cf7c 35%,rgba(244,207,124,0) 70%);mix-blend-mode:screen}
.veu{position:absolute;left:0;right:0;z-index:1;pointer-events:none}
.veu.cima{top:0;height:46%;background:linear-gradient(rgba(5,4,3,.92),rgba(5,4,3,.55) 55%,transparent)}
.veu.baixo{bottom:0;height:42%;background:linear-gradient(transparent,rgba(5,4,3,.65) 45%,rgba(5,4,3,.95))}
.raio{position:absolute;z-index:1;width:340px;height:1700px;top:-300px;background:linear-gradient(rgba(255,226,150,.28),rgba(255,226,150,0) 80%);filter:blur(22px);transform:rotate(18deg);mix-blend-mode:screen}
.topo{position:absolute;z-index:6;left:64px;right:64px;top:56px;display:flex;justify-content:space-between;align-items:center}
.story .topo{top:250px;left:72px;right:72px}
.marca{display:flex;align-items:center;gap:13px;font:500 31px J;letter-spacing:-.02em;color:#fff7e6;text-shadow:0 2px 10px #000}
.marca b{font-weight:800}.marca svg{width:48px;height:48px;filter:drop-shadow(0 4px 10px #0008)}
.pag{font:700 18px Cinzel;letter-spacing:.22em;text-transform:uppercase;color:#e9d3a0;text-shadow:0 2px 8px #000}
.conteudo{position:absolute;z-index:5;left:64px;right:64px}
.story .conteudo{left:72px;right:72px}
.kicker{display:inline-flex;align-items:center;gap:14px;font:700 21px Cinzel;letter-spacing:.3em;text-transform:uppercase;color:#f4cf7c;text-shadow:0 2px 10px #000}
.kicker:before{content:'';width:46px;height:2px;background:linear-gradient(90deg,transparent,#f4cf7c)}
h1,h2{font-family:Cinzel;font-weight:900;line-height:1.02;letter-spacing:.01em;text-wrap:balance}
h1{font-size:104px}h2{font-size:70px}
.ouro{background:linear-gradient(180deg,#fffbe9 0%,#ffe7a6 38%,#f0b94f 62%,#b8741f 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 #3b2208) drop-shadow(0 0 26px rgba(244,190,90,.45))}
.claro{color:#fff7e6;text-shadow:0 3px 0 #2a1a08,0 0 22px rgba(0,0,0,.8)}
.texto{font:500 33px/1.4 Alegreya;color:#f3e6c8;text-shadow:0 2px 8px #000}
.texto b{color:#ffe7a6;font-weight:700}
.selo{display:inline-flex;align-items:center;gap:12px;padding:13px 24px;border-radius:999px;font:700 21px Cinzel;letter-spacing:.2em;text-transform:uppercase;color:#2a1806;background:linear-gradient(180deg,#fff0bf,#f4cf7c 55%,#d9a040);box-shadow:0 0 0 2px #5b3a10,0 0 0 4px #f4cf7c88,0 10px 30px #000a,0 0 30px rgba(244,207,124,.45)}
.selo.escuro{color:#ffe7a6;background:rgba(20,13,6,.82);box-shadow:0 0 0 2px #c9953f,0 10px 30px #000a}
.spr{position:absolute;z-index:3;background-repeat:no-repeat;background-position:0 0;image-rendering:pixelated;filter:drop-shadow(0 0 2px rgba(255,236,190,.35)) drop-shadow(0 18px 18px rgba(0,0,0,.55))}
.spr.flip{transform:scaleX(-1)}
.sombra{position:absolute;z-index:2;border-radius:50%;background:radial-gradient(ellipse,rgba(0,0,0,.7),rgba(0,0,0,0) 70%)}
.halo{position:absolute;z-index:2;border-radius:50%;mix-blend-mode:screen;filter:blur(30px)}
.moldura{position:relative;z-index:4;padding:9px;border-radius:24px;background:linear-gradient(145deg,#fff1c2 0%,#d9a64a 18%,#6b4413 42%,#f2c766 64%,#8a5a1c 86%,#ffe39a 100%);box-shadow:0 0 0 2px #1d1206,0 34px 80px rgba(0,0,0,.85),0 0 70px rgba(244,190,90,.28)}
.moldura img{display:block;width:100%;border-radius:16px;box-shadow:inset 0 0 0 2px #000}
.moldura:before,.moldura:after{content:'';position:absolute;width:26px;height:26px;transform:rotate(45deg);background:linear-gradient(135deg,#fff6d0,#f4cf7c 50%,#a8692a);box-shadow:0 0 0 3px #2a1806,0 0 18px rgba(244,207,124,.8);top:-13px;left:calc(50% - 13px)}
.moldura:after{top:auto;bottom:-13px}
.celular{position:relative;z-index:4;padding:13px;border-radius:66px;background:linear-gradient(140deg,#e9d6a6,#7d5a24 20%,#1b130a 50%,#3c2a12 78%,#d8b46a);box-shadow:0 0 0 2px #0c0804,0 40px 90px rgba(0,0,0,.85),0 0 60px rgba(244,190,90,.25)}
.celular img{display:block;width:100%;border-radius:54px}
.passos{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.passo{position:relative;padding:22px 22px 24px;border-radius:20px;background:linear-gradient(180deg,rgba(38,25,10,.88),rgba(16,11,6,.92));box-shadow:inset 0 0 0 1.5px rgba(233,185,85,.55),0 14px 30px rgba(0,0,0,.55)}
.passo i{display:grid;place-items:center;width:52px;height:52px;border-radius:50%;font:900 24px Cinzel;font-style:normal;color:#2a1806;background:radial-gradient(circle at 35% 30%,#fff3c9,#f4cf7c 45%,#b87b2a);box-shadow:0 0 0 3px #3b2208,0 0 18px rgba(244,207,124,.6)}
.passo h3{font:700 28px/1.12 Cinzel;color:#ffe7a6;margin-top:14px}
.passo p{font:500 25px/1.32 Alegreya;color:#eadcbc;margin-top:8px}
.rodape{position:absolute;z-index:6;left:64px;right:64px;bottom:50px;display:flex;justify-content:space-between;align-items:center;font:700 19px Cinzel;letter-spacing:.2em;text-transform:uppercase;color:#d9c08a;text-shadow:0 2px 8px #000}
.story .rodape{bottom:auto;top:1650px;left:72px;right:72px}
.rodape b{color:#ffe7a6}
.placa{position:absolute;z-index:5;text-align:center;padding:12px 18px 14px;border-radius:14px;background:linear-gradient(180deg,rgba(40,26,10,.92),rgba(15,10,5,.95));box-shadow:inset 0 0 0 1.5px rgba(233,185,85,.6),0 12px 26px rgba(0,0,0,.6)}
.placa strong{display:block;font:700 25px/1.1 Cinzel;color:#ffe7a6}
.placa small{display:block;margin-top:5px;font:700 15px Cinzel;letter-spacing:.22em;text-transform:uppercase;color:#bfa774}
.placa small.chefe{color:#ff9d7a}
.pedestal{position:absolute;z-index:2;border-radius:50%;background:radial-gradient(ellipse,rgba(255,214,140,.35),rgba(255,180,90,.12) 45%,transparent 70%);filter:blur(4px)}
.cartao{padding:26px 30px;border-radius:22px;background:linear-gradient(180deg,rgba(40,26,10,.9),rgba(14,9,4,.94));box-shadow:inset 0 0 0 1.5px rgba(233,185,85,.6),0 18px 40px rgba(0,0,0,.6)}
.cartao .rot{font:700 18px Cinzel;letter-spacing:.24em;text-transform:uppercase;color:#ff9d7a}
.cartao h3{font:900 40px/1.05 Cinzel;margin-top:8px}
.cartao q{display:block;font:500 italic 30px/1.32 Alegreya;color:#f3e6c8;margin-top:12px;quotes:'“' '”'}
.cartao p{font:500 27px/1.36 Alegreya;color:#eadcbc;margin-top:12px}
.lista{display:grid;gap:16px}
.lista p{display:grid;grid-template-columns:40px 1fr;gap:16px;align-items:start;font:500 30px/1.36 Alegreya;color:#f3e6c8;text-shadow:0 2px 8px #000}
.lista p:before{content:'';width:18px;height:18px;margin:13px 0 0 10px;transform:rotate(45deg);background:linear-gradient(135deg,#fff3c9,#f4cf7c 50%,#b87b2a);box-shadow:0 0 12px rgba(244,207,124,.7)}
.lista b{color:#ffe7a6}
.estagio{position:absolute;z-index:5;text-align:center;width:170px}
.estagio em{display:block;font:900 30px Cinzel;font-style:normal;color:#ffe7a6;text-shadow:0 2px 8px #000}
.estagio span{display:block;font:700 17px/1.15 Cinzel;color:#e6d2a4;margin-top:4px;text-shadow:0 2px 6px #000}
.menu{display:inline-flex;align-items:center;gap:18px;padding:18px 30px;border-radius:18px;background:rgba(10,7,3,.85);box-shadow:inset 0 0 0 1.5px rgba(233,185,85,.6);font:700 34px Cinzel;color:#ffe7a6}
.menu span{color:#bfa774;font-size:28px}
.nota{font:500 19px Alegreya;color:#bfa774;text-shadow:0 2px 6px #000}
.faixa{position:absolute;z-index:8;left:0;right:0;bottom:0;height:92px;display:flex;align-items:center;justify-content:space-between;padding:0 64px;background:linear-gradient(180deg,rgba(14,9,4,.0),rgba(14,9,4,.92) 30%,#0b0703);border-top:1.5px solid rgba(233,185,85,.55);font:700 20px Cinzel;letter-spacing:.18em;text-transform:uppercase;color:#e9d3a0}
.faixa:before{content:'';position:absolute;left:50%;top:-9px;width:16px;height:16px;transform:translateX(-50%) rotate(45deg);background:linear-gradient(135deg,#fff3c9,#f4cf7c 50%,#b87b2a);box-shadow:0 0 0 2px #2a1806,0 0 14px rgba(244,207,124,.8)}
.faixa b{color:#ffe7a6}
.faixa .alvo{display:flex;align-items:center;gap:14px}
.faixa .alvo i{width:12px;height:12px;transform:rotate(45deg);background:#f4cf7c;box-shadow:0 0 10px #f4cf7c}
.story .faixa{bottom:0;top:1632px;height:auto;align-items:flex-start;padding:30px 72px 0;background:linear-gradient(180deg,rgba(14,9,4,.85),#0b0703 40%)}
.pilula{font:700 18px Cinzel;letter-spacing:.2em;text-transform:uppercase;color:#2a1806;padding:10px 18px;border-radius:999px;background:linear-gradient(180deg,#fff0bf,#f4cf7c 55%,#d9a040);box-shadow:0 0 0 2px #5b3a10,0 6px 18px #000a}
.logo{text-align:center}
.logo .pre{font:700 22px Cinzel;letter-spacing:.42em;text-transform:uppercase;color:#e9d3a0;text-shadow:0 2px 10px #000}
.logo .l1{display:block;font:900 78px/1 Cinzel;letter-spacing:.06em;margin-top:18px}
.logo .l2{display:block;font:900 138px/.95 Cinzel;letter-spacing:.01em;margin-top:6px}
.ornamento{display:flex;align-items:center;justify-content:center;gap:18px;margin:20px auto 0;width:760px}
.ornamento:before,.ornamento:after{content:'';flex:1;height:2px;background:linear-gradient(90deg,transparent,#f4cf7c)}
.ornamento:after{background:linear-gradient(270deg,transparent,#f4cf7c)}
.ornamento i{width:18px;height:18px;transform:rotate(45deg);background:linear-gradient(135deg,#fff3c9,#f4cf7c 50%,#b87b2a);box-shadow:0 0 14px rgba(244,207,124,.8)}
.tagline{font:500 italic 40px/1.25 Alegreya;color:#fff3d6;text-shadow:0 2px 12px #000;margin-top:16px}
'''

# partículas determinísticas
js='''<script>
document.querySelectorAll('.poeira').forEach(function(el,k){var s=1234+k*97;function r(){s=(s*16807)%2147483647;return (s-1)/2147483646}
var n=el.closest('.story')?60:44;for(var i=0;i<n;i++){var b=document.createElement('b');var t=2+r()*9;b.style.width=b.style.height=t+'px';b.style.left=(r()*100)+'%';b.style.top=(r()*100)+'%';b.style.opacity=(.25+r()*.75).toFixed(2);if(t>8)b.style.filter='blur(2px)';el.appendChild(b)}})
</script>'''


def ator(n,k,cx,base,flip=False,extra=''):
    """posiciona a folha para que a âncora (pés) fique em (cx, base)"""
    m=meta[n]; w=m['largura']; ax,ay=m['ancora']
    left=cx-((w-ax) if flip else ax)*k; top=base-ay*k
    return spr(n,k,style=f'left:{left:.0f}px;top:{top:.0f}px;{extra}',flip=flip)
def chao(cx,base,larg):
    return f'<i class="sombra" style="left:{cx-larg/2:.0f}px;top:{base-larg*0.09:.0f}px;width:{larg}px;height:{larg*0.18:.0f}px"></i>'
def faixa(n,tot,msg='Treine flashcards no Orto Questões'):
    return f'<footer class="faixa"><span class="alvo"><i></i>{msg}</span><b>{n}/{tot}{" ›" if n<tot else ""}</b></footer>'
AREAS=['Coluna','Joelho','Quadril','Mão e punho','Ombro e cotovelo','Pé e tornozelo','Trauma adulto','Ortopedia pediátrica','Tumores','Osteometabólicas','Conceitos básicos','Anatomia']
def chips(lista,cls=''):
    return '<div class="chips '+cls+'">'+''.join(f'<span class="chip">{a}</span>' for a in lista)+'</div>'
css_extra='''
.chips{display:flex;flex-wrap:wrap;gap:10px}
.chip{font:600 22px J;letter-spacing:-.01em;color:#ffeccc;padding:9px 16px;border-radius:999px;background:rgba(20,13,6,.78);box-shadow:inset 0 0 0 1.5px rgba(233,185,85,.6),0 6px 14px rgba(0,0,0,.45)}
.chip.ouro{color:#2a1806;background:linear-gradient(180deg,#fff0bf,#f4cf7c 55%,#d9a040)}
h1.claro2{font:900 80px/1.04 Cinzel;letter-spacing:.01em}
.sub2{font:500 34px/1.35 Alegreya;color:#f3e6c8;text-shadow:0 2px 10px #000}
.sub2 b{color:#ffe7a6}
.voltas{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.volta{border-radius:20px;padding:20px 20px 22px;text-align:center;box-shadow:0 0 0 2px rgba(0,0,0,.6),0 14px 30px rgba(0,0,0,.55),inset 0 2px 0 rgba(255,255,255,.35)}
.volta strong{display:block;font:900 32px Cinzel;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.35)}
.volta span{display:block;font:600 22px J;color:#fff;margin-top:6px;opacity:.95}
.volta.e{background:linear-gradient(180deg,#e2574a,#a3241c)}.volta.h{background:linear-gradient(180deg,#e7b54a,#a8741c)}.volta.s{background:linear-gradient(180deg,#46b871,#1e7a43)}
'''

S=[]
T=7
# F1 CAPA: treinar flashcards por área
S.append(f'''<section id="feed-01">{cena("biblioteca","paisagem","desfoca")}<i class="raio" style="left:600px"></i><i class="veu cima" style="height:60%"></i><i class="veu baixo" style="height:30%"></i>
{topo(1,T)}
<div class="conteudo" style="top:150px;right:470px"><div class="kicker">Novo no Orto Questões</div>
<h1 class="ouro claro2" style="margin-top:20px">Treine flashcards de Ortopedia.</h1>
<p class="sub2" style="margin-top:22px">Por área, com as <b>questões das provas</b> e os comentários.</p></div>
<div class="conteudo" style="top:700px;right:470px">{chips(AREAS)}</div>
<div class="conteudo lista" style="top:1010px;right:470px;gap:8px"><p style="font-size:27px"><span>Questões <b>das provas</b></span></p><p style="font-size:27px"><span>Comentário em <b>cada flashcard</b></span></p><p style="font-size:27px"><span>Revisão <b>no tempo certo</b></span></p></div>
<div class="celular" style="position:absolute;right:56px;top:190px;width:400px;transform:rotate(3deg)"><img src="prints/cel-estudo-frente2.jpg" alt="Flashcard na Biblioteca"></div>
{faixa(1,T,'Grátis para testar · Menu › Flashcards')}</section>''')
# F2 COMO FUNCIONA
S.append(f'''<section id="feed-02">{cena("biblioteca","paisagem","desfoca")}<i class="veu cima" style="height:38%"></i><i class="veu baixo" style="height:44%"></i>
{topo(2,T)}
<div class="conteudo" style="top:150px"><div class="kicker">Como funciona</div><h2 class="ouro" style="margin-top:16px;font-size:66px">Escolha a área.<br>Responda. Vire.</h2></div>
<div class="conteudo" style="top:420px"><div class="moldura"><img src="prints/pc-estudo-verso2.jpg" alt="Flashcard respondido na Biblioteca"></div></div>
<div class="conteudo passos" style="top:1034px">
<div class="passo"><i>1</i><h3>Área</h3><p>Coluna, Joelho, Mão… ou os temas que mais caem.</p></div>
<div class="passo"><i>2</i><h3>Responda</h3><p>Quatro alternativas, como na prova.</p></div>
<div class="passo"><i>3</i><h3>Vire</h3><p>A resposta e o porquê, do comentário.</p></div></div>
{faixa(2,T)}</section>''')
# F3 REVISÃO + CRONOGRAMA
S.append(f'''<section id="feed-03">{cena("biblioteca","paisagem","desfoca")}<i class="veu cima" style="height:44%"></i><i class="veu baixo" style="height:40%"></i>
{topo(3,T)}
<div class="conteudo" style="top:150px"><div class="kicker">Revisão no tempo certo</div><h2 class="ouro" style="margin-top:16px;font-size:64px">O que você erra<br>volta antes.</h2></div>
<div class="conteudo voltas" style="top:400px">
<div class="volta e"><strong>Errei</strong><span>volta hoje</span></div>
<div class="volta h"><strong>Hesitei</strong><span>volta em 3 dias</span></div>
<div class="volta s"><strong>Sabia</strong><span>volta em 10 dias</span></div></div>
<div class="conteudo" style="top:556px"><p class="sub2" style="font-size:30px"><b>E um cronograma de flashcards:</b> data da prova, assuntos e quantos por dia.</p></div>
<div class="conteudo" style="top:650px"><div class="moldura"><img src="prints/pc-cronograma.jpg" alt="Cronograma de flashcards"></div></div>
{faixa(3,T)}</section>''')
# F4 MODO JOGO
S.append(f'''<section id="feed-04">{cena("covil","paisagem","desfoca")}<i class="veu cima" style="height:40%"></i><i class="veu baixo" style="height:46%"></i>
{topo(4,T)}
<div class="conteudo" style="top:150px"><div class="kicker">Quer treinar jogando?</div><h2 class="ouro" style="margin-top:16px;font-size:64px">Os mesmos flashcards,<br>em modo jogo.</h2></div>
<div class="conteudo" style="top:430px"><div class="moldura"><img src="prints/pc2-dragao.jpg" alt="Modo jogo: duelo contra o Dragão de Ossos"></div></div>
<div class="conteudo lista" style="top:1040px;gap:10px">
<p style="font-size:29px"><span><b>Acertou</b>, você ataca. <b>Errou</b>, o adversário revida.</span></p>
<p style="font-size:29px"><span>A cada 3 andares, <b>um chefe</b>. Este é o Dragão de Ossos.</span></p></div>
{faixa(4,T)}</section>''')
# F5 BESTIÁRIO
cel=[('golem',2.9,'Golem de Gesso','Comum',''),('serpente',3.3,'Serpente do Ciático','Comum',''),('gosma',3.5,'Gosma de Cimento','Comum',''),
     ('guardiao',2.4,'Guardião do Acetábulo','Chefe','chefe'),('golem-obsidiana',2.9,'Titã da Coluna','Chefe','chefe'),('gosma-rainha',3.6,'Rainha do Cimento','Chefe','chefe')]
grid=''
for i,(n,k,nome,niv,cl) in enumerate(cel):
    col,lin=i%3,i//3; cx=64+col*317+158; base=700+lin*390
    grid+=f'<i class="pedestal" style="left:{cx-150}px;top:{base-40}px;width:300px;height:80px"></i>'+ator(n,k,cx,base,flip=True)
    grid+=f'<div class="placa" style="left:{cx-148}px;top:{base+16}px;width:296px"><strong>{nome}</strong><small class="{cl}">{niv}</small></div>'
S.append(f'''<section id="feed-05">{cena("masmorra","paisagem","desfoca")}<i class="veu cima" style="height:40%"></i><i class="veu baixo" style="height:20%"></i>
{topo(5,T)}
<div class="conteudo" style="top:150px"><div class="kicker">Modo jogo · adversários</div><h2 class="ouro" style="margin-top:16px;font-size:62px">Para vencer,<br>acerte os flashcards.</h2></div>
{grid}
{faixa(5,T)}</section>''')
# F6 HERÓI
est=[('heroi-1','I','Aprendiz do Torneio'),('heroi-2','II','Escudeiro Clínico'),('heroi-3','III','Guardião dos Fundamentos'),('heroi-4','IV','Cavaleiro da Reconstrução'),('heroi-5','V','Mestre da Ortopedia'),('heroi-6','VI','Lenda da Masmorra')]
lin=''
for i,(n,rom,nome) in enumerate(est):
    k=2.5+i*0.2; cx=110+i*172; base=1010
    lin+=f'<i class="pedestal" style="left:{cx-90}px;top:{base-30}px;width:180px;height:60px"></i>'+ator(n,k,cx,base)
    lin+=f'<div class="estagio" style="left:{cx-85}px;top:{base+30}px"><em>{rom}</em><span>{nome}</span></div>'
S.append(f'''<section id="feed-06">{cena("floresta","paisagem")}<i class="raio" style="left:380px"></i><i class="veu cima" style="height:44%"></i><i class="veu baixo" style="height:24%"></i>
{topo(6,T)}
<div class="conteudo" style="top:150px"><div class="kicker">Modo jogo · progressão</div><h2 class="ouro" style="margin-top:16px;font-size:62px">Seu personagem cresce<br>com o seu treino.</h2>
<p class="texto" style="margin-top:16px">Seis estágios. Ele evolui <b>a cada chefe vencido</b>.</p></div>
{lin}
{faixa(6,T)}</section>''')
# F7 CTA
S.append(f'''<section id="feed-07">{cena("floresta","paisagem")}<i class="raio" style="left:600px"></i><i class="veu cima" style="height:58%"></i><i class="veu baixo" style="height:44%"></i>
{topo(7,T)}
<div class="conteudo logo" style="top:150px"><div class="pre">Novo · beta aberto</div>
<span class="l1 ouro" style="font-size:84px;margin-top:22px">Treine</span><span class="l2 ouro" style="font-size:118px">Flashcards</span>
<div class="ornamento"><i></i></div>
<p class="tagline">Teste grátis e conte o que achou.</p></div>
{chao(330,960,250)}{ator("heroi-4",3.1,330,960)}
{chao(730,960,300)}{ator("golem",2.9,730,960,flip=True)}
<div class="conteudo" style="top:1010px;text-align:center"><div class="menu">Menu <span>›</span> Flashcards</div>
<p class="texto" style="margin-top:18px;font-size:27px">Conta grátis: 10 flashcards a cada 24 horas. Assinante: sem limite.</p></div>
{faixa(7,T,'ortoquestoes.com.br')}</section>''')

# STORIES
ST=6
S.append(f'''<section class="story" id="story-01">{cena("biblioteca","retrato","desfoca")}<i class="raio" style="left:420px"></i><i class="veu cima" style="height:46%"></i><i class="veu baixo" style="height:30%"></i>
{topo(1,ST)}
<div class="conteudo" style="top:360px;text-align:center"><div class="kicker">Novo no Orto Questões</div>
<h1 class="ouro claro2" style="margin-top:20px;font-size:86px">Treine flashcards<br>de Ortopedia.</h1>
<p class="sub2" style="margin-top:20px">Por área, com as <b>questões das provas</b>.</p></div>
<div class="conteudo" style="top:770px;display:flex;justify-content:center"><div class="celular" style="width:372px;transform:rotate(-3deg)"><img src="prints/cel-estudo-frente2.jpg" alt="Flashcard na Biblioteca"></div></div>
{faixa(1,ST,'Grátis para testar · Menu › Flashcards')}</section>''')
S.append(f'''<section class="story" id="story-02">{cena("biblioteca","retrato","desfoca")}<i class="veu cima" style="height:34%"></i><i class="veu baixo" style="height:34%"></i>
{topo(2,ST)}
<div class="conteudo" style="top:360px"><div class="kicker">Depois de responder</div><h2 class="ouro" style="margin-top:16px;font-size:74px">Errei. Hesitei.<br>Sabia.</h2>
<p class="sub2" style="margin-top:14px;font-size:31px">Você diz como foi. O flashcard <b>volta na hora certa</b>.</p></div>
<div class="conteudo" style="top:720px;display:flex;justify-content:center"><div class="celular" style="width:388px;transform:rotate(3deg)"><img src="prints/cel-estudo-verso2.jpg" alt="Flashcard respondido no celular"></div></div>
{faixa(2,ST)}</section>''')
S.append(f'''<section class="story" id="story-03">{cena("biblioteca","retrato","desfoca")}<i class="veu cima" style="height:34%"></i><i class="veu baixo" style="height:34%"></i>
{topo(3,ST)}
<div class="conteudo" style="top:360px"><div class="kicker">Cronograma de flashcards</div><h2 class="ouro" style="margin-top:16px;font-size:72px">Até a data<br>da sua prova.</h2>
<p class="sub2" style="margin-top:14px;font-size:31px">Escolha os assuntos, os dias e <b>quantos por dia</b>.</p></div>
<div class="conteudo" style="top:720px;display:flex;justify-content:center"><div class="celular" style="width:388px;transform:rotate(-3deg)"><img src="prints/cel-cronograma.jpg" alt="Cronograma de flashcards no celular"></div></div>
{faixa(3,ST)}</section>''')
S.append(f'''<section class="story" id="story-04">{cena("floresta","retrato","desfoca")}<i class="veu cima" style="height:34%"></i><i class="veu baixo" style="height:30%"></i>
{topo(4,ST)}
<div class="conteudo" style="top:360px"><div class="kicker">Dois jeitos de treinar</div><h2 class="ouro" style="margin-top:16px;font-size:72px">Estudo calmo<br>ou modo jogo.</h2>
<p class="sub2" style="margin-top:14px;font-size:31px"><b>Biblioteca</b> para revisar. <b>Cripta</b> para treinar jogando.</p></div>
<div class="conteudo" style="top:720px;display:flex;justify-content:center"><div class="celular" style="width:388px;transform:rotate(3deg)"><img src="prints/cel-entrada.jpg" alt="Escolha entre Cripta e Biblioteca"></div></div>
{faixa(4,ST)}</section>''')
S.append(f'''<section class="story" id="story-05">{cena("covil","paisagem")}<i class="raio" style="left:380px"></i><i class="veu cima" style="height:40%"></i><i class="veu baixo" style="height:30%"></i>
{topo(5,ST)}
<div class="conteudo" style="top:360px;text-align:center"><div class="kicker">Modo jogo</div>
<h2 class="ouro" style="margin-top:16px;font-size:80px">Cada acerto<br>é um golpe.</h2>
<p class="sub2" style="margin-top:16px">Monstros, chefes e um dragão.<br>Para vencer, <b>acerte os flashcards</b>.</p></div>
<i class="halo" style="left:300px;top:1000px;width:700px;height:480px;background:rgba(255,110,40,.32)"></i>
{chao(700,1560,680)}{ator("dragao",3.3,700,1560,flip=True)}
{chao(170,1590,240)}{ator("heroi-5",3.0,170,1590)}
{faixa(5,ST)}</section>''')
lin2=''
for i,(n,rom,nome) in enumerate(est):
    k=2.1+i*0.17; cx=150+i*156; base=1230
    lin2+=f'<i class="pedestal" style="left:{cx-80}px;top:{base-26}px;width:160px;height:52px"></i>'+ator(n,k,cx,base)
S.append(f'''<section class="story" id="story-06">{cena("floresta","retrato")}<i class="raio" style="left:420px"></i><i class="veu cima" style="height:50%"></i><i class="veu baixo" style="height:40%"></i>
{topo(6,ST)}
<div class="conteudo logo" style="top:380px"><div class="pre">Novo · beta aberto</div>
<span class="l1 ouro" style="font-size:88px;margin-top:22px">Treine</span><span class="l2 ouro" style="font-size:120px">Flashcards</span>
<div class="ornamento" style="width:640px"><i></i></div>
<p class="tagline">Teste grátis no Orto Questões.</p></div>
{lin2}
<div class="conteudo" style="top:1340px;text-align:center"><div class="menu">Menu <span>›</span> Flashcards</div>
<p class="texto" style="margin-top:18px;font-size:26px">Conta grátis: 10 flashcards a cada 24 horas.</p></div>
{faixa(6,ST,'ortoquestoes.com.br')}</section>''')

html=f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Orto Questões · Torneio de Flashcards</title>
<!-- Feed (7 slides, 1080x1350) e stories (6, 1080x1920) do beta dos flashcards, em estilo HD-2D: cenários pintados do jogo
     com profundidade de campo, luz e partículas; monstros e herói das folhas reais do jogo; prints reais em moldura.
     node marketing/instagram/gerar.mjs marketing/instagram/posts/2026-10-13-torneio-flashcards/post.html -->
<style>{css}{css_extra}</style></head><body>{svg}
{chr(10).join(S)}
{js}
</body></html>'''
open(D+'post.html','w').write(html)
print('ok', len(html))
