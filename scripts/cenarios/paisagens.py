"""Paisagens autorais: natureza, vilas e vidro, sem adereços anatômicos."""
import numpy as np
from pintor import F, Tela, fbm, hexrgb, rampa
from acabamento import material, ret, MADEIRA, PEDRA, VERDE, OURO, luz, executar

TELHA=rampa(['#503b39','#87574a','#b87658','#dfa474','#f3ca98'])
AGUA=rampa(['#284855','#436c7d','#6c9aa0','#98c2b9','#d2e1c6'])


def arvore(t,cx,cy,r,semente=5):
    x,y=t.x,t.y
    material(t,ret(t,cx-r*.13,cy,cx+r*.13,cy+r*1.5),MADEIRA,.45+(cx-x)/r*.4,semente)
    for dx,dy,k in [(-.45,-.25,.66),(.35,-.25,.62),(0,-.6,.76),(0,0,.72)]:
        d=np.hypot((x-cx-dx*r)/r,(y-cy-dy*r)/(r*.75))
        m=d+fbm(x/5,y/5,2,semente)*.15<k
        material(t,m,VERDE,.52+(cy-y)/r*.3+(cx-x)/r*.18,semente)
        t.cor(m & (d>.57), '#31503d', .35)
        t.cor(m & (fbm(x/2,y/2,2,semente+2)>.72),'#b4c778',.7)


def casa(t,cx,cy,w,h,semente=4):
    x,y=t.x,t.y
    sombra=np.hypot((x-cx)/(w*.57),(y-cy-h)/(h*.14))<1
    t.cor(sombra,'#314a3c',.5)
    material(t,ret(t,cx-w*.43,cy,cx+w*.43,cy+h),PEDRA,.66-(x-cx)/w*.28,semente)
    t.cor(ret(t,cx-w*.43,cy+h*.88,cx+w*.43,cy+h),'#695748')
    for xx in [cx-w*.4,cx,cx+w*.4]:
        material(t,ret(t,xx-w*.018,cy,xx+w*.018,cy+h),MADEIRA,.6,semente)
    roof=(np.abs(x-cx)<w*.56)&(y>cy-h*.6+np.abs(x-cx)*h/w)&(y<cy+h*.04)
    material(t,roof,TELHA,.66-((y%5)<1)*.13,semente+1)
    t.cor(roof&((x%7)<1),'#8e5945',.55)
    t.cor(roof&(y<cy-h*.6+np.abs(x-cx)*h/w+1.3),'#634539')
    t.cor(ret(t,cx-w*.58,cy,cx+w*.58,cy+2),'#f0c18c')
    for xx in (cx-w*.23,cx+w*.23):
        m=ret(t,xx-w*.065,cy+h*.25,xx+w*.065,cy+h*.53)
        material(t,m,MADEIRA,.2,semente)
        t.cor(m&(x>xx-w*.05)&(x<xx+w*.05)&(y<cy+h*.48),'#e6c27d')
        t.cor(m&((abs(x-xx)<1)|(abs(y-(cy+h*.37))<1)),'#765444')
        t.cor(ret(t,xx-w*.085,cy+h*.53,xx+w*.085,cy+h*.58),'#597749')
        t.cor(ret(t,xx-w*.08,cy+h*.51,xx+w*.08,cy+h*.53)&((x%3)<1),'#e0a99e')
    material(t,ret(t,cx-w*.07,cy+h*.6,cx+w*.07,cy+h),MADEIRA,.4,semente)
    t.cor(ret(t,cx-w*.01,cy+h*.78,cx+w*.015,cy+h*.81),'#e4ba72')
    material(t,ret(t,cx+w*.23,cy-h*.48,cx+w*.32,cy-h*.19),PEDRA,.58,semente+3)


def terreno(t,inicio,quente=False):
    x,y=t.x,t.y
    m=y>=inicio
    material(t,m,VERDE,.6+.1*fbm(x/23,y/20,3,6),6)
    if quente:t.velar(m*.1,'#efb664')
    t.cor(m & (fbm(x/3,y/3,2,21)>.76),'#aac06b',.7)


def caminho(t,centro,largura,inicio):
    x,y=t.x,t.y
    d=np.abs(x-centro)
    m=(d<largura*(.4+(y-inicio)/t.H))&(y>inicio)
    juntas=((y%8)<1)|(((x+np.floor(y/8)*4)%12)<1)
    material(t,m,PEDRA,.62-juntas*.16,8)


def flores(t,inicio,quantidade=180,semente=24):
    rng=np.random.default_rng(semente);x,y=t.x,t.y
    for i in range(quantidade):
        px=rng.uniform(0,t.W);py=rng.uniform(inicio,t.H)
        t.cor((abs(x-px)<.8)&(y>py-2)&(y<py+1),'#365747')
        t.cor((abs(x-px)<1.5)&(abs(y-py+3)<.9),['#eec876','#ebb7a3','#dbe4ad','#a9c2da'][i%4])
        t.cor((abs(x-px)<.7)&(abs(y-py+3)<.7),'#fff0c4')


def pintar(W,H,saida,nome):
    tipo=nome.rsplit('-',1)[0];retrato=H>W;s=W/(250 if retrato else 520)
    f=Tela(W,H);m=Tela(W,H);fr=Tela(W,H);x,y=f.x,f.y
    quente=tipo=='campoflorido';horizonte=H*.42
    alto='#e4958a' if quente else '#83bfd0'
    baixo='#ffdfaa' if quente else '#f6e6ba'
    k=np.clip(y/(H*.55),0,1)[...,None]
    f.rgb[:]=np.array(hexrgb(alto),F)*(1-k)+np.array(hexrgb(baixo),F)*k;f.a[:]=1
    for i,c in enumerate(('#b4c5a4','#87a78c','#5c8474')):
        linha=H*(.3+i*.06)+np.sin(x/(W*.12)+i*.8)*H*.05
        f.cor((y>linha)&(y<H*.68),c)
    if quente:f.cor(np.hypot(x-W*.66,y-H*.21)<H*.055,'#fff0be')
    terreno(m,horizonte,quente)
    if tipo=='vilarejo':
        caminho(m,W*.5+np.sin(y/H*4)*W*.04,W*.12,horizonte)
        casa(m,W*.19,H*.42,W*.23,H*.19)
        casa(m,W*.79,H*.45,W*.26,H*.21,13)
        arvore(m,W*.05,H*.62,W*.13)
        arvore(m,W*.91,H*.7,W*.10,31)
        # Cerca de madeira, portão aberto e canteiros ao longo da trilha.
        for lado in (-1,1):
            for i in range(6):
                cx=W*.5+lado*(W*.16+i*W*.055);cy=H*.76+i*H*.01
                material(m,ret(m,cx-s,cy-10*s,cx+s,cy+6*s),MADEIRA,.6,33)
            material(m,ret(m,W*.5+lado*W*.17 if lado>0 else 0,H*.76,W if lado>0 else W*.33,H*.76+2*s),MADEIRA,.67,34)
        flores(m,H*.85,100)
    elif tipo=='ruinas':
        terreno(m,H*.48)
        # Água e ponte: o veio acompanha o recorte em ambos os formatos.
        agua=(y>H*.62+np.sin(x/W*7)*H*.035)&(y<H*.78+np.sin(x/W*7)*H*.035)
        material(m,agua,AGUA,.65+np.sin(y*1.7)*.12,18)
        m.cor(agua&((y%7)<1)&(fbm(x/3,y/3,2,3)>.6),'#d1e5cd',.7)
        ponte=ret(m,W*.39,H*.59,W*.61,H*.81)
        material(m,ponte,MADEIRA,.65-((y%5)<1)*.17,19)
        for cx in (W*.39,W*.61):material(m,ret(m,cx-s,H*.58,cx+s,H*.82),MADEIRA,.74,19)
        for cx,altura in [(W*.16,.26),(W*.31,.2),(W*.75,.29),(W*.88,.21)]:
            mask=ret(m,cx-9*s,H*(.5-altura),cx+9*s,H*.56)
            material(m,mask,PEDRA,.66-(x-cx)/(40*s),22)
            material(m,ret(m,cx-12*s,H*(.5-altura),cx+12*s,H*(.5-altura)+4*s),PEDRA,.78,23)
            m.cor(mask & ((y%9)<1),'#46584f',.5)
            material(m,ret(m,cx-13*s,H*.54,cx+13*s,H*.57),PEDRA,.7,24)
            m.cor(mask&(np.sin(y/(6*s))>0.55)&(x>cx),'#5e885c')
        # Frontão incompleto de pedra, com entalhes geométricos.
        for cx in (W*.2,W*.79):
            material(m,ret(m,cx-27*s,H*.24,cx+27*s,H*.27),PEDRA,.59,25)
            m.cor(ret(m,cx-26*s,H*.24,cx+26*s,H*.25),'#ccd0aa')
        arvore(fr,W*.06,H*.4,W*.17,40);arvore(fr,W*.97,H*.38,W*.17,41)
        flores(m,H*.85,80)
    elif tipo=='vila':
        # Visão de cima: gramado inteiro, rio sinuoso e telhados em planta.
        terreno(f,0)
        rio=np.abs(x-W*.82-np.sin(y/H*6)*W*.05)<W*.06
        material(f,rio,AGUA,.7-((y%8)<1)*.14,42)
        material(m,(abs(x-W*.5)<W*.065)|(abs(y-H*.52)<H*.03),PEDRA,.63-((x%8)<1)*.13,43)
        for cx,cy in [(W*.22,H*.27),(W*.63,H*.23),(W*.23,H*.69),(W*.66,H*.77)]:
            w=W*.2;h=H*.12
            material(m,ret(m,cx-w*.5,cy-h*.5,cx+w*.5,cy+h*.5),TELHA,.63-((y%4)<1)*.13,45)
            m.cor(ret(m,cx-w*.55,cy+h*.5,cx+w*.55,cy+h*.5+2*s),'#e8bf8a')
            m.cor(ret(m,cx-w*.52,cy-h*.52,cx+w*.52,cy-h*.52+2*s),'#674b3e')
            m.cor(ret(m,cx-s,cy-h*.5,cx+s,cy+h*.5),'#f0ce9f')
            material(m,ret(m,cx-w*.1,cy+h*.5,cx+w*.1,cy+h*.5+6*s),MADEIRA,.6,46)
            material(m,ret(m,cx+w*.22,cy-h*.27,cx+w*.3,cy-h*.05),PEDRA,.63,47)
            m.cor(ret(m,cx+w*.23,cy-h*.25,cx+w*.29,cy-h*.17),'#3c4544')
            for xx in (cx-w*.54,cx+w*.54):
                m.cor(ret(m,xx-s,cy-h*.55,xx+s,cy+h*.55),'#526c48')
        for cx in (W*.12,W*.34):
            canteiro=ret(m,cx-9*s,H*.86,cx+9*s,H*.95)
            material(m,canteiro,MADEIRA,.32,46)
            m.cor(canteiro&((x%5)<2)&((y%5)<2),'#86af5a')
        material(m,ret(m,W*.74,H*.5,W*.95,H*.55),MADEIRA,.7-((x%4)<1)*.2,48)
        flores(m,H*.12,70)
    elif tipo=='campoflorido':
        caminho(m,W*.5+np.sin(y/H*5)*W*.07,W*.11,H*.42)
        flores(m,H*.5,260)
        arvore(m,W*.05,H*.61,W*.15,50)
        arvore(m,W*.93,H*.59,W*.12,51)
        # Um banco de descanso sem alterar a cura nem introduzir sala nova.
        material(m,ret(m,W*.73,H*.8,W*.9,H*.8+4*s),MADEIRA,.65,52)
        for cx in (W*.75,W*.88):material(m,ret(m,cx,H*.8,cx+2*s,H*.87),MADEIRA,.43,52)
    elif tipo=='praia':
        m.rgb[:]=0;m.a[:]=0
        mar=y>H*.36
        material(f,mar,AGUA,.74-((y%8)<1)*.14,58)
        areia=y>H*.62+np.sin(x/W*4)*H*.055
        material(m,areia,OURO,.72+.07*fbm(x/3,y/3,2,59),59)
        m.cor(areia&(y<H*.64+np.sin(x/W*4)*H*.055),'#e8f0d1')
        cx=W*.81;base=H*.59
        corpo=(abs(x-cx)<(7+(y-H*.25)/(H*.34)*6)*s)&(y>H*.25)&(y<base)
        material(m,corpo,PEDRA,.86-(x-cx)/(40*s),60)
        m.cor(corpo&((y>H*.34)&(y<H*.4)),'#ba6750')
        material(m,ret(m,cx-10*s,H*.21,cx+10*s,H*.28),MADEIRA,.44,61)
        m.cor(ret(m,cx-7*s,H*.22,cx+7*s,H*.265),'#eedba1')
        telhado=(abs(x-cx)<(y-H*.16)*.5)&(y>H*.16)&(y<H*.22)
        material(m,telhado,TELHA,.6,61)
        m.cor(ret(m,cx-2*s,H*.48,cx+2*s,H*.55),'#517481')
        for cx in (W*.1,W*.92):
            mask=np.hypot((x-cx)/(W*.13),(y-H*.9)/(H*.07))<1
            material(fr,mask,PEDRA,.48-(y-H*.9)/H,65)
        # Madeira à deriva, pequenos seixos e grama nas dunas.
        material(m,ret(m,W*.12,H*.83,W*.27,H*.83+3*s),MADEIRA,.56,63)
        flores(m,H*.94,50,66)
    elif tipo=='estufa':
        arvore(f,W*.08,H*.38,W*.12,67);arvore(f,W*.95,H*.4,W*.12,68)
        cx=W*.5;top=H*.23;chao=H*.67;larg=W*.36
        vidro=(abs(x-cx)<larg)&(y>top+abs(x-cx)*H*.16/larg)&(y<chao)
        material(m,vidro,AGUA,.76,71)
        m.velar(vidro*.22,'#e1e9d1')
        material(m,ret(m,cx-larg-2*s,top+H*.16,cx-larg, chao),MADEIRA,.48,70)
        material(m,ret(m,cx+larg,top+H*.16,cx+larg+2*s, chao),MADEIRA,.48,70)
        # Travessas, reflexos pontilhados e teto de vidro inclinado.
        m.cor(vidro&(((x%max(8,int(20*s)))<1)|((y%max(8,int(23*s)))<1)),'#c5cab1')
        m.cor(vidro&(abs(y-(top+abs(x-cx)*H*.16/larg))<2*s),'#f4e2b7')
        m.cor(vidro&(fbm(x/4,y/4,2,72)>.73),'#f1ecd0',.45)
        material(m,ret(m,cx-larg,chao,cx+larg,chao+4*s),PEDRA,.75,73)
        for i in range(12):
            px=W*(.19+(i%6)*.12);py=H*(.5+(i//6)*.11)
            material(m,ret(m,px-4*s,py,px+4*s,py+5*s),MADEIRA,.64,74)
            for j in range(3):
                folha=np.hypot((x-px-np.sin(j*2.4)*4*s)/(4*s),(y-py+3*s+j*2*s)/(2*s))<1
                material(m,folha,VERDE,.7-(x-px)/(25*s),75)
        # Porta central e canteiros externos, deixando a mesa livre.
        m.cor(ret(m,cx-7*s,H*.48,cx+7*s,chao),'#467163',.45)
        flores(m,H*.81,140)
    for cx in (0,W):
        sombra=np.hypot((x-cx)/(W*.17),(y-H)/(H*.12))<1
        material(fr,sombra,VERDE,.32+.12*fbm(x/3,y/3,2,81),81)
    f.salvar(saida/f'{nome}-fundo.png');m.salvar(saida/f'{nome}-meio.png');fr.salvar(saida/f'{nome}-frente.png')
    luz(saida,nome,W,H,[(W*.65,H*.15,W*.4,'#ffe7ae',.10),(W*.5,H*.65,W*.4,'#ffe5ac',.04)])
