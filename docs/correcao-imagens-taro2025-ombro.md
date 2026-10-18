# Imagens trocadas: ombro-cotovelo-0318, 0319, 0320 e 0323 (TARO 2025)

Origem: relato de usuário em 18/10/2026 sobre a questão 0320 ("ali não seria o lig colateral lateral radial?").

## O que aconteceu
- As questões do TARO 2025 de ombro e cotovelo foram renumeradas em algum momento.
- As imagens delas continuaram com o nome antigo (ombro-cotovelo-0449 a 0454).
- Quando o TARO 2026 foi importado, as questões novas 0449, 0450, 0451 e 0454 gravaram as próprias imagens por cima desses arquivos.
- Resultado: quatro questões do TARO 2025 mostravam a figura de outra questão.

| Questão | O que deveria mostrar | O que mostrava |
| --- | --- | --- |
| 0318 | o coracobraquial | uma figura do cotovelo |
| 0319 | a manobra de milking | outra foto |
| 0320 | o pronador redondo | os ligamentos laterais do cotovelo, que pertencem à 0451 |
| 0323 | o lacertus fibrosus | uma ressonância do ombro |

## Correção
- **Imagens:** as originais foram recuperadas do histórico do git (commit 57319867, com os tamanhos registrados) e gravadas com nomes únicos, `ombro-cotovelo-<id>-taro2025-1.jpeg`.
- **Questões:** as quatro passam a apontar para esses arquivos.
- **Comentários:** os da 0318 e da 0323 tinham um alerta de "figura não corresponde"; o alerta saiu e a leitura da figura certa foi acrescentada.
- **Gabaritos:** nenhum mudou.
- **Duplicata:** a mao-0429, cópia da 0320, já tinha a imagem certa.

## Trava nova
`scripts/validar_acervo.py` passa a recusar o acervo quando o tamanho real de uma imagem difere da largura e altura registradas na questão. É o sinal de arquivo sobrescrito por outra questão.
