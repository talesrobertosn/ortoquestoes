# Passagem: Etapa 1 da direção criativa (em andamento, 13/10/2026)

Pedido: "DIREÇÃO CRIATIVA E REFORMULAÇÃO ARTÍSTICA — CRIPTA DO RESIDENTE" (etapas 1 a 8).

## Feito até aqui
- Auditoria rápida do andar 1 (cenário "campo"): pátio genérico de muros de tijolo; no celular
  deitado (844×390) a tela se sobrepõe (cartão sob o baralho, título sob o botão de som).
- Novo pintor de cenários offline: `scripts/cenarios/pintor.py` (ruído, voronoi, rampas com
  pontilhado, contorno) e `scripts/cenarios/floresta.py` (Floresta das Fises Antigas).
  Gera 4 camadas por formato (fundo, meio, frente, luz), em paisagem 520×330 e retrato 250×470:
  `python3 scripts/cenarios/floresta.py <pasta> [paisagem|retrato]`.
  Ainda NÃO está ligado ao jogo nem salvo em `public/`.

## Problemas conhecidos da floresta (rascunho)
- Raízes ainda parecem garras e há uma linha reta na base dos troncos gigantes.
- Musgo dos troncos em manchas; a copa do alto precisa de bordas mais orgânicas.

## Próximos passos
1. Acertar raízes e base dos troncos; gerar em `public/flashcards/cenarios/`.
2. Ligar no jogo: em `pintarCena` (src/flashcards/efeitos/pintura.ts), para a cena `campo`,
   desenhar as imagens recortadas no centro (sem reescalar), pré-carregadas; camada `luz` em screen.
3. Tabuleiro próprio da clareira (círculo de pedras com musgo e raízes) em `tabuleiros.ts`.
4. Partículas: vaga-lumes, folhas caindo, borboletas (`criarAmbiente`).
5. Corrigir o layout do celular deitado; interface mais leve.
6. Capturas antes/depois (`.base-tmp.mjs golem:1:3`), testes, PR, relatório.
