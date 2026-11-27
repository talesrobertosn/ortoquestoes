# Vídeo: Salter-Harris em 40 segundos (27/11/2026)

Reels/TikTok vertical (1080 x 1920, 30 fps, cerca de 50 s), com começo, meio e fim. O gancho compara a mesma queda no adulto e na criança. O meio ensina os cinco tipos com o mnemônico SALTR, e o fim traz a virada: o tipo V só aparece meses depois. Toda a arte é pixel art pintada por código: uma sala de laudos à noite, a radiografia no negatoscópio e o mascote apontando. A narração usa uma voz masculina sintética local (Kokoro pt-br, 75% `pm_alex` e 25% `pm_santa`), gerada frase por frase com pausas naturais e tratamento de locução. Embaixo de cada letra do SALTR, a palavra em inglês e o significado vão ficando escritos. Uma placa fixa mostra o site o vídeo inteiro ("Treine para o TEOT, o TARO e a Cirurgia da Mão" e www.ortoquestoes.com.br). Por baixo da voz toca uma música original animada, em estilo chiptune (`musica.py`), bem baixa e com ducking.

## Como gerar

Precisa de `pip install kokoro-onnx soundfile scipy fonttools brotli`, do modelo Kokoro v1.0 (os arquivos `kokoro-v1.0.onnx` e `voices-v1.0.bin`, das releases do kokoro-onnx no GitHub) e das fontes Jersey 10, Pixelify Sans e Plus Jakarta Sans (esta convertida de `src/marca/plus-jakarta-sans.woff2`) na pasta `FONTES`.

```
python3 narracao.py /caminho/do/modelo         # audio/cena-NN.wav e tempos.json (frases e tempos)
python3 cena.py                                  # cenário iluminado (arte/fundo.npy)
python3 video.py                                 # salter-harris.mp4
python3 video.py --quadros 3.5 20                # só prévias em PNG
```

Depois de gerar, normalize o áudio para -14 LUFS (`ffmpeg ... -af loudnorm=I=-14:TP=-1.5`).

## Roteiro

| Cena | Fala | Tela |
|---|---|---|
| Gancho | Mesma queda, mesmo punho. No adulto, quebra o osso. Na criança, quem paga é a fise. | Dois filmes: o traço de ouro na metáfise do adulto e a fise da criança acesa em vermelho, escorregando |
| A fise | A placa de crescimento é cartilagem, mais fraca que o osso e o ligamento. Salter e Harris dividiram em cinco tipos. Decora: SALTR. | Rótulos de metáfise, fise e epífise; os ladrilhos S A L T R entram um a um |
| S, A, L, T, R | Um tipo por vez (o II com o Thurston-Holland; o III e o IV com "redução anatômica"; o V com "nenhum traço aparece") | O ladrilho ativo em ouro, o traço riscando com faísca e "TIPO I" a "TIPO V" no filme |
| Virada | Por isso o tipo cinco quase nunca é visto no dia. Ele aparece meses depois, quando o osso para de crescer. | Lado bom e lado lesado: a fise fecha (ponte óssea) e o osso encurta diante da linha tracejada |
| Fim | Salva pro próximo plantão. Mais questões assim, no Orto Questões. | Cartão com o ladrilho, @ortoquestoes e a fonte |

Fonte: Rockwood and Wilkins' Fractures in Children, 10ª ed., cap. 2, figs. 2-10 a 2-15 (resumo `rockwoodcriancas10-02-consolidacao-fise`, questão central `pediatria-0909`).

## Legenda do post

> No adulto quebra o osso. Na criança, quem paga é a fise.
>
> SALTR: Straight, Above, Lower, Through, cRush. E o tipo V, que só aparece quando o osso para de crescer.
>
> Salva para o próximo plantão de pediatria. Qual tipo você mais vê no PS?
>
> Treine para o TEOT, o TARO e a Cirurgia da Mão em www.ortoquestoes.com.br (grátis com a conta; o caminho está no perfil @ortoquestoes).
>
> #ortopedia #residenciamedica #teot #taro #ortopediapediatrica

## Conferência

- [x] Toda a arte é feita por código, sem IA de imagem; o mascote vem das folhas oficiais (`raiox`, `orientando`, `comemorando`).
- [x] Livro e capítulo aparecem no filme e no cartão final.
- [x] Sem emoji, sem preço, sem número total do acervo e sem link clicável.
- [x] Legendas na faixa segura do Reels (perto de y = 1405) e nada importante no rodapé, onde ficam os botões.
