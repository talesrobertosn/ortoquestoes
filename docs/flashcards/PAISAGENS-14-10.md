# Paisagens das paradas — 14/10/2026

Ideias 43–48: seis paisagens próprias, com quatro camadas e dois formatos (48 PNGs). `scripts/cenarios/paisagens.py` reúne as ferramentas; cada paisagem tem seu comando reproduzível em vilarejo.py, ruinas.py, vila.py, campoflorido.py, praia.py e estufa.py. Pintura numpy, Tela, fbm, rampas, contornos e iluminação. Sem imagens externas, anatomia ou monstros novos.

## Integração

- Loja: Vilarejo dos Caminhos, casas de pedra/madeira, árvore e cerca.
- Portas: Vila do Rio, telhados e hortas vistos de cima.
- Preceptor e baú: Ruínas do Bosque, colunas e ponte sobre água.
- Encontro: Campo do Poente, flores e banco ao entardecer.
- Sala secreta: Enseada do Farol, mar, dunas e farol.
- Curandeira: Jardim dos Curandeiros, estufa e vasos de ervas.
- Ferreiro: aproveita a Forja já pintada.

`paisagemDaParada` apenas escolhe a imagem da fase que o motor já definiu. Não sorteia encontro, cria sala, modifica opções, custos, cura ou recompensas. Estudo mantém a Biblioteca; combate volta ao cenário original. Música e regras de acesso permanecem iguais. Sem SQL.

O encontro conserva o painel opaco; o véu deixa a paisagem aparecer. Durante as paradas, a mesa de combate fica invisível e fora da leitura assistiva, mantendo seu espaço e as referências de animação. As camadas são carregadas quando a paisagem aparece, com cache e fallback existente. Não gera animais sobre uma paisagem com lago em outra posição: extras usam somente o ambiente leve do pátio.

## Revisão e validação

A revisão visual retirou gramado que cobria o mar, reforçou contornos e sombras das casas/árvores, acrescentou frontões às ruínas e detalhes dos telhados da vila. O formato retrato foi conferido separadamente.

- `npx tsc -b`, `npm test`, build.
- Fixture: associação fase/paisagem sem mutar a partida, Biblioteca preservada e dimensões das 48 camadas (520×330 e 250×470).
- `scripts/flashcards/testar_paisagens.mjs`: seis cenários em 1400×860, 390×844 e 844×390, carregamento real das camadas, painel visível, combate oculto durante a parada e restaurado ao voltar, botão de seguir funcional, Estudo preservado e ausência de erros JavaScript. Os encontros são fixtures locais, sem Supabase.
- Capturas em `capturas/paisagens-14-10/`.

## Continuidade

Música #258, estações #259 e ambiente vivo #260 publicados; este bloco precisa de PR, checks, merge e seu próprio deploy. Próximos itens: aparência opcional, leitura dos dados existentes para selos/ranking e desafios isolados. Monstros continuam em pausa; a medição em aparelho físico continua pendente.
