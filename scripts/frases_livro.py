"""Busca frases num texto extraído de livro (saída de scripts/livros.py ler), mostrando a página do PDF.

Uso:
  python3 scripts/livros.py ler <livro> <p1> <p2> > /tmp/cap.txt
  python3 scripts/frases_livro.py /tmp/cap.txt "regex" [máximo]
"""
import re,sys
arq,pad=sys.argv[1],sys.argv[2]; n=int(sys.argv[3]) if len(sys.argv)>3 else 8
pag='?'; achou=0
for bloco in re.split(r'(===== pág\. PDF \d+[^\n]*)',open(arq,encoding='utf-8').read()):
    m=re.match(r'===== pág\. PDF (\d+)',bloco)
    if m: pag=m.group(1); continue
    for f in re.split(r'(?<=[.!?])\s+',bloco.replace('\n',' ')):
        if re.search(pad,f,re.I):
            print(f'[p{pag}] {f.strip()[:600]}'); achou+=1
            if achou>=n: sys.exit()
