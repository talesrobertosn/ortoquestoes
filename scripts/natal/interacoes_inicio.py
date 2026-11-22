"""Peças da inicial: vidro, geada, fita, caneca e trenó vistos à noite."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
from hd2d import h01

PASTA = Path(__file__).resolve().parents[2] / "public/pixel/natal"
CORES = [(255,184,98),(242,107,96),(126,201,159),(123,179,232),(255,219,146),(241,137,164)]


def salvar(img, nome):
    img.resize((img.width * 2, img.height * 2), Image.Resampling.NEAREST).save(PASTA / nome, optimize=True)


def lampadas():
    img = Image.new("RGBA", (12 * len(CORES), 15))
    d = ImageDraw.Draw(img)
    for i, (r, g, b) in enumerate(CORES):
        x = i * 12 + 6
        d.line((x, 0, x, 4), "#674124")
        d.rectangle((x-2,4,x+2,6), "#4e432b")
        d.line((x-2,4,x+1,4), "#b3904b")
        d.polygon([(x-3,7),(x+2,7),(x+3,9),(x+2,12),(x,14),(x-2,13),(x-3,10)], tuple(int(c*.53) for c in (r,g,b)))
        d.polygon([(x-2,8),(x+1,8),(x+2,11),(x,13),(x-2,11)], (r,g,b))
        d.line((x-1,8,x-1,10), "#fff0c8")
        d.point((x,11), tuple(int(c*.78) for c in (r,g,b)))
    salvar(img, "atalhos-vidro.png")


def geada():
    img = Image.new("RGBA", (96, 8))
    d = ImageDraw.Draw(img)
    for x in range(img.width):
        h = 1 + int(h01(x//4,12)*4)
        for y in range(h + 1):
            pal = ("#61788a","#8fa7b4","#bbcfd2","#d5e3df","#f7f5e7")
            tom = 1 + int(h01(x,y,15)*2) + (2 if y==0 else 0) - (1 if y==h else 0)
            d.point((x,y), pal[tom])
        if h01(x,29) > .92:
            d.point((x,h+1), "#9fb4bd")
    salvar(img, "geada-atalhos.png")


def enfeites():
    fita = Image.new("RGBA", (38, 26))
    d = ImageDraw.Draw(fita)
    d.polygon([(17,11),(12,14),(3,22),(11,20),(13,25),(19,14),(24,23),(27,18),(34,21),(24,12)], "#692533")
    d.polygon([(19,11),(10,3),(3,5),(2,11),(5,15),(15,15),(20,12),(23,8),(28,3),(35,5),(36,11),(31,15),(23,14)], "#9f2632")
    d.polygon([(4,7),(10,6),(16,11),(10,12),(5,11)], "#571e2a")
    d.polygon([(22,11),(28,6),(33,6),(33,11),(27,12)], "#682230")
    d.line([(3,7),(5,4),(10,4),(16,8)], "#ed6a60")
    d.line([(23,9),(29,4),(33,5)], "#da5854")
    d.rectangle((16,9,22,15), "#bb3a40")
    d.line((17,9,20,9), "#f59377")
    d.point((18,12), "#8c2934")
    salvar(fita, "laco-faixa.png")
    caneca = Image.new("RGBA", (26, 21))
    d = ImageDraw.Draw(caneca)
    d.ellipse((0,15,25,20), "#554033")
    d.ellipse((1,15,24,18), "#a97b4c")
    d.arc((16,6,24,15), -100, 105, "#c97458", 2)
    d.polygon([(4,6),(19,6),(18,15),(15,17),(7,17),(5,14)], "#973e38")
    d.line((6,7,7,15), "#e17b63", 2)
    d.line((17,9,16,15), "#602327", 2)
    d.ellipse((4,4,19,8), "#edbe9b")
    d.ellipse((6,5,17,7), "#533529")
    d.line((9,6,14,6), "#b17850")
    salvar(caneca, "caneca-sequencia.png")


def treno():
    img = Image.new("RGBA", (116, 37))
    d = ImageDraw.Draw(img)
    # Duas renas com pernas desencontradas, arnês e galhadas escuras.
    for x, y, passo in ((96, 10, 2), (69, 13, -2)):
        d.line([(x-6,y+7),(x-8,y+15),(x-14+passo,y+17)], "#745443", 2)
        d.line([(x+2,y+7),(x+5,y+14),(x+10+passo,y+13)], "#95705c", 2)
        d.ellipse((x-12,y-2,x+5,y+8), "#4d3536")
        d.ellipse((x-11,y-2,x+4,y+5), "#8a604a")
        d.line((x-9,y-1,x+2,y-1), "#c29976")
        d.polygon([(x+1,y+4),(x+5,y-7),(x+9,y-8),(x+12,y-3),(x+8,y),(x+5,y+5)], "#a1745c")
        d.line([(x+7,y-7),(x+5,y-13),(x+1,y-15)], "#b9a08d")
        d.line([(x+5,y-10),(x+9,y-13)], "#b9a08d")
        d.line((x+2,y,x+6,y+2), "#b34a46", 2)
        d.point((x+9,y-5), "#3d2524")
        d.point((x+12,y-4), "#f1a882")
        d.line((x-8,y+2,x+3,y+2), "#c6a26f")
    # O trenó é de madeira envernizada e ferro, com carga amarrada.
    d.line([(10,32),(42,32),(50,29),(51,26)], "#b49c79", 2)
    d.line((14,28,13,32), "#6d5549")
    d.line((36,28,35,32), "#835f44")
    d.polygon([(8,19),(14,22),(36,22),(44,18),(49,19),(45,25),(37,28),(13,28)], "#7b2a32")
    d.line([(9,20),(15,24),(37,24),(44,20)], "#db935c")
    for x,y,w,h,c in ((14,17,8,6,"#a74441"),(22,14,7,9,"#4b8574"),(30,17,8,6,"#9f714c")):
        d.rectangle((x,y,x+w,y+h), c)
        d.line((x+3,y,x+3,y+h), "#e6b56e")
        d.line((x,y+1,x+w,y+1), "#d6945f")
    d.line([(45,19),(62,14),(78,14),(89,10)], "#b8976b")
    d.point((45,19), "#ffde9b")
    halo = Image.new("RGBA", img.size)
    ImageDraw.Draw(halo).ellipse((42,16,49,24), fill=(255,180,96,150))
    halo = halo.filter(ImageFilter.GaussianBlur(2))
    halo.alpha_composite(img)
    salvar(halo, "treno-noturno.png")


if __name__ == "__main__":
    lampadas()
    geada()
    enfeites()
    treno()
