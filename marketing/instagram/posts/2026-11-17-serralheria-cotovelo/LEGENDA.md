# Serralheria da dobradiça: complexo ligamentar lateral do cotovelo (stories)

```bash
python3 marketing/instagram/posts/2026-11-17-serralheria-cotovelo/arte_dobradica.py
node marketing/instagram/gerar.mjs marketing/instagram/posts/2026-11-17-serralheria-cotovelo/stories.html
```

Padrão aula (`marketing/instagram/estilos/PADRAO-AULA.md`) na régua da Oficina do Encaixe (`marketing/instagram/estilos/OFICINA-DO-ENCAIXE.md`).
Questão `ombro-cotovelo-0249` (**TEOT 2024**), gabarito oficial **C** (`3`, ligamento colateral ulnar lateral).
Só stories (`1080×1920`), sem figurinha nem link; stories não levam legenda.

## Roteiro e horários sugeridos

| Ordem | Horário | Story | Arquivo |
|---|---|---|---|
| 1 | 7h | O gancho da dobradiça vista por fora + a questão real do TEOT 2024 | `s1-questao.png` |
| 2 | 12h | A desmontagem lado a lado (prova × Campbell 15ª ed. Fig. 15.1B) e os 4 números | `s2-mecanismo.png` |
| 3 | 19h | Gabarito C (`Nº 3`), comparação por dentro × por fora (Fig. 15.1A × 15.1B), círculo de Horii / O'Driscoll e convite | `s3-resposta.png` |

## Ideia e execução

- **Metáfora mecânica ("A Serralheria da Dobradiça"):** o cotovelo funciona como uma dobradiça com eixo giratório lateral. Uma **braçadeira presa na mesma haste** (ligamento anular, `2`) permite que o eixo gire sem soltar, mas não impede a dobradiça de abrir; uma **tira curta que para na braçadeira** (colateral radial, `1`) também não segura a haste inferior; quem trava a abertura lateral e rotatória é o **tirante diagonal que atravessa de uma haste à outra** (ligamento colateral ulnar lateral, `3`, do epicôndilo lateral à crista do supinador da ulna).
- **Arte original em pixel art HD-2D por código (`arte_dobradica.py`):** oficina de serralheria ao entardecer (parede de blocos de pedra com facho de luz e partículas de poeira na janela, lampião de latão aceso, prateleira com almotolia verde `#14655E` da marca e pote de rebites, bancada de carvalho escuro com bigorna, régua de aço e dobradiça de latão) e objetos mecânicos soltos (`dobradica.png`, `grampo.png`, `chave.png`, `martelo.png`). Zero desenho de anatomia.
- **Marca no rodízio (`marca/README.md`):** ladrilho verde-noite (`marca/png/perfil-ladrilho-noite.png`), variando em relação ao post anterior (`2026-11-15-cartaz-bennett`, símbolo verdete).

## Conferência

- **Questão do acervo:** `ombro-cotovelo-0249` (TEOT 2024), imagem `public/imagens/ombro-cotovelo/ombro-cotovelo-0250-1.jpeg`, enunciado e alternativas (`1`, `2`, `3`, `4`) literais do acervo, gabarito oficial **C** (`3`).
- **Figura comparativa comentada:** `public/imagens/ombro-cotovelo/campbell15-15-1-w82.jpeg` (*Campbell's Operative Orthopaedics*, 15ª ed., 2026, cap. 15, Fig. 15.1A–B, p. 644).
- **Fontes conferidas no comentário (`conferido: true`) e no resumo (`rockwood10-40-cotovelo-cabeca-radio.md`):** *Campbell's Operative Orthopaedics*, 15ª ed. (2026), cap. 15, p. 643–644 e cap. 52, p. 2229–2230; *Rockwood and Green's Fractures in Adults*, 10ª ed. (2025), cap. 40 (instabilidade rotatória posterolateral e círculo de Horii / O'Driscoll de lateral para medial).
