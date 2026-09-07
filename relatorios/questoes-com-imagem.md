# Questões com imagem à espera de comentário

Gerado por `scripts/listar_com_imagem.py`. Rode de novo depois de cada lote
para ver o que sobrou.

**418 questões pendentes**, de um total de 518 com
imagem no acervo.

Comentar uma questão ilustrada custa mais do que comentar as demais: cada
figura precisa ser aberta e lida antes de a explicação ser escrita, porque é
isso que impede o comentário de descrever o que o gabarito sugere em vez do que
está no desenho. Foi por isso que elas ficaram separadas. Questões anuladas e
sem gabarito não entram nesta lista — o pipeline não as comenta.

## Como retomar

1. Escolher um tema abaixo e um bloco de dez a vinte ids.
2. Abrir cada figura em `public/imagens/<tema>/` — o nome do arquivo vem do
   campo `imagens[].arquivo` da questão, e **não** do id: uma questão pode ter
   sido renumerada e o arquivo guarda o número original do PDF.
3. Escrever o lote e aplicar com `python3 scripts/aplicar_comentarios.py lote.json`,
   que recusa o lote inteiro se qualquer conferência falhar.
4. Rodar `python3 scripts/gerar_indice.py` e `npm run build`.

### Mão e punho — 3 pendentes de 95 com imagem (3 figuras para abrir)

`mao-0238`, `mao-0565`, `mao-0569`

### Ombro e cotovelo — 92 pendentes de 92 com imagem (93 figuras para abrir)

`ombro-cotovelo-0018`, `ombro-cotovelo-0019`, `ombro-cotovelo-0055`, `ombro-cotovelo-0056`, `ombro-cotovelo-0057`, `ombro-cotovelo-0058`, `ombro-cotovelo-0061`, `ombro-cotovelo-0064`, `ombro-cotovelo-0068`, `ombro-cotovelo-0072`, `ombro-cotovelo-0073`, `ombro-cotovelo-0089`, `ombro-cotovelo-0113`, `ombro-cotovelo-0116`, `ombro-cotovelo-0117`, `ombro-cotovelo-0120`, `ombro-cotovelo-0121`, `ombro-cotovelo-0122`, `ombro-cotovelo-0123`, `ombro-cotovelo-0124`, `ombro-cotovelo-0125`, `ombro-cotovelo-0126`, `ombro-cotovelo-0127`, `ombro-cotovelo-0128`, `ombro-cotovelo-0129`, `ombro-cotovelo-0130`, `ombro-cotovelo-0131`, `ombro-cotovelo-0132`, `ombro-cotovelo-0133`, `ombro-cotovelo-0134`, `ombro-cotovelo-0135`, `ombro-cotovelo-0137`, `ombro-cotovelo-0155`, `ombro-cotovelo-0156`, `ombro-cotovelo-0197`, `ombro-cotovelo-0214`, `ombro-cotovelo-0215`, `ombro-cotovelo-0246`, `ombro-cotovelo-0247`, `ombro-cotovelo-0248`, `ombro-cotovelo-0249`, `ombro-cotovelo-0250`, `ombro-cotovelo-0251`, `ombro-cotovelo-0252`, `ombro-cotovelo-0253`, `ombro-cotovelo-0254`, `ombro-cotovelo-0255`, `ombro-cotovelo-0256`, `ombro-cotovelo-0257`, `ombro-cotovelo-0258`, `ombro-cotovelo-0259`, `ombro-cotovelo-0260`, `ombro-cotovelo-0261`, `ombro-cotovelo-0262`, `ombro-cotovelo-0263`, `ombro-cotovelo-0264`, `ombro-cotovelo-0268`, `ombro-cotovelo-0288`, `ombro-cotovelo-0289`, `ombro-cotovelo-0304`, `ombro-cotovelo-0305`, `ombro-cotovelo-0306`, `ombro-cotovelo-0307`, `ombro-cotovelo-0308`, `ombro-cotovelo-0309`, `ombro-cotovelo-0310`, `ombro-cotovelo-0311`, `ombro-cotovelo-0313`, `ombro-cotovelo-0316`, `ombro-cotovelo-0317`, `ombro-cotovelo-0318`, `ombro-cotovelo-0319`, `ombro-cotovelo-0320`, `ombro-cotovelo-0323`, `ombro-cotovelo-0359`, `ombro-cotovelo-0361`, `ombro-cotovelo-0362`, `ombro-cotovelo-0365`, `ombro-cotovelo-0366`, `ombro-cotovelo-0369`, `ombro-cotovelo-0371`, `ombro-cotovelo-0379`, `ombro-cotovelo-0380`, `ombro-cotovelo-0394`, `ombro-cotovelo-0433`, `ombro-cotovelo-0435`, `ombro-cotovelo-0436`, `ombro-cotovelo-0437`, `ombro-cotovelo-0438`, `ombro-cotovelo-0439`, `ombro-cotovelo-0440`, `ombro-cotovelo-0441`

### Quadril — 52 pendentes de 59 com imagem (52 figuras para abrir)

`quadril-0074`, `quadril-0080`, `quadril-0081`, `quadril-0082`, `quadril-0083`, `quadril-0084`, `quadril-0085`, `quadril-0086`, `quadril-0087`, `quadril-0095`, `quadril-0097`, `quadril-0099`, `quadril-0103`, `quadril-0110`, `quadril-0111`, `quadril-0115`, `quadril-0117`, `quadril-0124`, `quadril-0126`, `quadril-0130`, `quadril-0131`, `quadril-0132`, `quadril-0133`, `quadril-0134`, `quadril-0135`, `quadril-0136`, `quadril-0138`, `quadril-0139`, `quadril-0140`, `quadril-0141`, `quadril-0150`, `quadril-0152`, `quadril-0156`, `quadril-0157`, `quadril-0158`, `quadril-0161`, `quadril-0162`, `quadril-0167`, `quadril-0175`, `quadril-0181`, `quadril-0182`, `quadril-0183`, `quadril-0185`, `quadril-0186`, `quadril-0190`, `quadril-0191`, `quadril-0212`, `quadril-0214`, `quadril-0215`, `quadril-0219`, `quadril-0223`, `quadril-0224`

### Coluna — 43 pendentes de 43 com imagem (43 figuras para abrir)

`coluna-0022`, `coluna-0050`, `coluna-0054`, `coluna-0056`, `coluna-0063`, `coluna-0074`, `coluna-0078`, `coluna-0096`, `coluna-0097`, `coluna-0098`, `coluna-0099`, `coluna-0100`, `coluna-0101`, `coluna-0111`, `coluna-0125`, `coluna-0149`, `coluna-0154`, `coluna-0164`, `coluna-0165`, `coluna-0166`, `coluna-0167`, `coluna-0168`, `coluna-0169`, `coluna-0186`, `coluna-0192`, `coluna-0196`, `coluna-0197`, `coluna-0198`, `coluna-0199`, `coluna-0203`, `coluna-0206`, `coluna-0216`, `coluna-0218`, `coluna-0220`, `coluna-0222`, `coluna-0231`, `coluna-0233`, `coluna-0264`, `coluna-0265`, `coluna-0267`, `coluna-0281`, `coluna-0283`, `coluna-0286`

### Pé e tornozelo — 56 pendentes de 56 com imagem (59 figuras para abrir)

`pe-tornozelo-0023`, `pe-tornozelo-0055`, `pe-tornozelo-0056`, `pe-tornozelo-0057`, `pe-tornozelo-0058`, `pe-tornozelo-0062`, `pe-tornozelo-0073`, `pe-tornozelo-0076`, `pe-tornozelo-0104`, `pe-tornozelo-0116`, `pe-tornozelo-0117`, `pe-tornozelo-0118`, `pe-tornozelo-0120`, `pe-tornozelo-0121`, `pe-tornozelo-0122`, `pe-tornozelo-0123`, `pe-tornozelo-0124`, `pe-tornozelo-0127`, `pe-tornozelo-0132`, `pe-tornozelo-0133`, `pe-tornozelo-0145`, `pe-tornozelo-0157`, `pe-tornozelo-0158`, `pe-tornozelo-0159`, `pe-tornozelo-0160`, `pe-tornozelo-0161`, `pe-tornozelo-0179`, `pe-tornozelo-0182`, `pe-tornozelo-0183`, `pe-tornozelo-0184`, `pe-tornozelo-0185`, `pe-tornozelo-0186`, `pe-tornozelo-0187`, `pe-tornozelo-0188`, `pe-tornozelo-0189`, `pe-tornozelo-0190`, `pe-tornozelo-0191`, `pe-tornozelo-0206`, `pe-tornozelo-0207`, `pe-tornozelo-0208`, `pe-tornozelo-0212`, `pe-tornozelo-0215`, `pe-tornozelo-0218`, `pe-tornozelo-0230`, `pe-tornozelo-0232`, `pe-tornozelo-0233`, `pe-tornozelo-0236`, `pe-tornozelo-0247`, `pe-tornozelo-0280`, `pe-tornozelo-0281`, `pe-tornozelo-0283`, `pe-tornozelo-0287`, `pe-tornozelo-0291`, `pe-tornozelo-0295`, `pe-tornozelo-0303`, `pe-tornozelo-0304`

### Trauma adulto — 81 pendentes de 82 com imagem (82 figuras para abrir)

`trauma-0079`, `trauma-0173`, `trauma-0175`, `trauma-0176`, `trauma-0177`, `trauma-0179`, `trauma-0181`, `trauma-0182`, `trauma-0183`, `trauma-0184`, `trauma-0186`, `trauma-0187`, `trauma-0220`, `trauma-0312`, `trauma-0316`, `trauma-0344`, `trauma-0349`, `trauma-0439`, `trauma-0791`, `trauma-0798`, `trauma-0905`, `trauma-0912`, `trauma-0956`, `trauma-0963`, `trauma-0975`, `trauma-0976`, `trauma-0978`, `trauma-0979`, `trauma-0980`, `trauma-0991`, `trauma-0992`, `trauma-0994`, `trauma-0450`, `trauma-0461`, `trauma-0464`, `trauma-0468`, `trauma-0473`, `trauma-0474`, `trauma-0475`, `trauma-0505`, `trauma-0515`, `trauma-0544`, `trauma-0546`, `trauma-0558`, `trauma-0563`, `trauma-0570`, `trauma-0579`, `trauma-0581`, `trauma-0583`, `trauma-0584`, `trauma-0587`, `trauma-0604`, `trauma-0610`, `trauma-0613`, `trauma-0614`, `trauma-0624`, `trauma-0626`, `trauma-0628`, `trauma-0678`, `trauma-0682`, `trauma-0695`, `trauma-0711`, `trauma-0716`, `trauma-0729`, `trauma-0730`, `trauma-0741`, `trauma-0744`, `trauma-0751`, `trauma-0753`, `trauma-0755`, `trauma-0757`, `trauma-0760`, `trauma-0763`, `trauma-0764`, `trauma-0770`, `trauma-0773`, `trauma-0786`, `trauma-0787`, `trauma-0788`, `trauma-0789`, `trauma-0790`

### Ortopedia pediátrica — 54 pendentes de 54 com imagem (54 figuras para abrir)

`pediatria-0038`, `pediatria-0039`, `pediatria-0044`, `pediatria-0086`, `pediatria-0087`, `pediatria-0088`, `pediatria-0089`, `pediatria-0102`, `pediatria-0104`, `pediatria-0120`, `pediatria-0146`, `pediatria-0149`, `pediatria-0164`, `pediatria-0168`, `pediatria-0188`, `pediatria-0193`, `pediatria-0194`, `pediatria-0199`, `pediatria-0200`, `pediatria-0228`, `pediatria-0229`, `pediatria-0230`, `pediatria-0231`, `pediatria-0238`, `pediatria-0248`, `pediatria-0256`, `pediatria-0267`, `pediatria-0268`, `pediatria-0273`, `pediatria-0276`, `pediatria-0287`, `pediatria-0288`, `pediatria-0289`, `pediatria-0302`, `pediatria-0304`, `pediatria-0310`, `pediatria-0315`, `pediatria-0327`, `pediatria-0330`, `pediatria-0360`, `pediatria-0361`, `pediatria-0381`, `pediatria-0384`, `pediatria-0387`, `pediatria-0443`, `pediatria-0444`, `pediatria-0445`, `pediatria-0449`, `pediatria-0453`, `pediatria-0458`, `pediatria-0478`, `pediatria-0493`, `pediatria-0500`, `pediatria-0502`

### Tumores ósseos e de partes moles — 26 pendentes de 26 com imagem (28 figuras para abrir)

`tumores-0035`, `tumores-0065`, `tumores-0067`, `tumores-0068`, `tumores-0071`, `tumores-0119`, `tumores-0125`, `tumores-0144`, `tumores-0146`, `tumores-0147`, `tumores-0153`, `tumores-0155`, `tumores-0161`, `tumores-0163`, `tumores-0194`, `tumores-0203`, `tumores-0224`, `tumores-0226`, `tumores-0227`, `tumores-0235`, `tumores-0293`, `tumores-0294`, `tumores-0297`, `tumores-0298`, `tumores-0309`, `tumores-0313`

### Conceitos básicos — 11 pendentes de 11 com imagem (11 figuras para abrir)

`conceitos-basicos-0073`, `conceitos-basicos-0112`, `conceitos-basicos-0123`, `conceitos-basicos-0131`, `conceitos-basicos-0150`, `conceitos-basicos-0162`, `conceitos-basicos-0165`, `conceitos-basicos-0176`, `conceitos-basicos-0198`, `conceitos-basicos-0199`, `conceitos-basicos-0247`
