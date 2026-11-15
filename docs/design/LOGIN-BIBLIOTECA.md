# Biblioteca do login — aprovada pelo Tales em 14/11/2026

Substitui o estudo alpino, abandonado. Publicação autorizada depois da prévia com luz quente, lanterna no peitoril e oclusão ambiente. A biblioteca ocupa o painel inteiro, inclusive abaixo dos cartões. O formulário permanece HTML; não alterar autenticação ou planos.

Pintura original em 720×1200, ampliada 3×. Palco 720×340; no celular, x180..540. A lareira, o banco e a mesa ficam no espaço visível entre texto e formulário. Bonfire original do site sempre acesa, sem vínculo com sequência: mesma chama e espada, montadas numa folha transparente. Caveira sentada tomando chocolate; gato na almofada da lareira; coruja no apoio do mantel. Os dois pets preservam as reações aos campos e à questão por portais React.

A pintura não se move no hover. As animações respeitam movimento reduzido, aba escondida e palco fora da tela. A luz é fixa na pintura: lareira, abajures, lanterna da janela, reflexos e oclusão nas junções e apoios.

Gerar com Python com numpy e Pillow:

```
python scripts/cenarios/login_biblioteca_natal.py
python scripts/sprites/login_biblioteca.py
python scripts/cenarios/exportar_login_biblioteca.py
```

Saída: `public/pixel/acesso/biblioteca/`. Fontes: `CenaPortal.tsx`, `LoginBiblioteca.css`. Miolo e base móveis são independentes da altura do formulário. A imagem é a mesma nos temas claro e escuro, conforme prévia aprovada; campos seguem o tema.

## Bonfire ajustada em 15/11/2026

Pedido do Tales: chama maior, mais baixa e sem o recorte quebrado na origem. A folha agora usa seis quadros nativos (80×96), estágio fogaréu do fogo original, espada e brasas de apoio. A camada frontal usa o mesmo desenho/coordenadas da chama traseira, sem a faixa reescalada anterior. Mantém pintura estática, pausa e movimento reduzido.

## Bonfire integrada — 15/11/2026, revisão aprovada para publicação

O Tales pediu labaredas envolvendo e subindo pela própria lâmina, mais luz reagindo na sala e autorizou publicar ao terminar. Substitui o recorte de seis quadros: são 24 quadros originais em 2,4 s, combustível contínuo na base, línguas curvas, canais de ignição na espada, metal aquecido e chamas com profundidade à frente e atrás da lâmina.

A resposta da sala usa albedo, oclusão ambiente e sombras do cenário: pedra, arco, mesa, piso e latão recebem a luz; a sombra debaixo da mesa e o vidro frio são preservados. Os atlas de luz e fogo e o brilho dos pets compartilham o mesmo ciclo. Sem movimento da câmera, com pausa fora da tela/aba oculta e movimento reduzido.

Geração da versão atual:

```
python scripts/cenarios/login_biblioteca_natal.py output/bonfire-integrada
python scripts/cenarios/bonfire_biblioteca.py
python scripts/cenarios/exportar_bonfire_biblioteca.py
```

Assets versionados `*-v3.webp` preservam os arquivos antigos em cache. `BonfireResposta.css` é gerado pelo exportador. O arquivo de materiais NPZ fica apenas em output; não é enviado ao navegador.


## Carregamento progressivo e imagens compactas (15/11/2026)

- `otimizar_biblioteca.py` deriva v4 das artes v3 aprovadas. Mantém os 24 quadros, a duração de 2,4 s e as âncoras; fogo com dois pixels por pixel de origem, mapas suaves de luz a meia resolução. Arquivos antigos permanecem para clientes com código em cache.
- Fogo + mapa de luz: 749.328 → 342.070 bytes no desktop (−54,4%); 663.320 → 307.712 no celular (−53,6%). Memória RGBA decodificada dessas duas texturas: −60,9% / −59,2%, respectivamente. São medidas dos arquivos, não promessa de tempo em qualquer aparelho.
- Primeiro vem a pintura e um quadro leve da bonfire acesa; os atlas são decodificados depois da pintura, em tempo ocioso. Ativam juntos, sem mostrar sprite incompleto. Falha de rede mantém o quadro aceso. Economia de dados e movimento reduzido não baixam os atlas.
- A rota `#/entrar` pré-carrega apenas a pintura correspondente à largura. O formulário público não baixa o índice do acervo nem adianta Treinar automaticamente; a amostra avulsa e os links por intenção continuam funcionando. O acervo passa a ser solicitado após autenticação.
- Filtros de luz dos mascotes têm keyframes diretos; não alteram uma propriedade herdada por toda a árvore a cada quadro. Pausa fora da tela/aba oculta e pintura fixa continuam.
- Verificados no navegador: 320, 390, 1024, 1440, 1920; relógios alinhados, sem overflow/zoom, alternância entrar/criar conta, economia de dados, movimento reduzido e falha de atlas. Suíte npm, pré-carga, build e diff conferidos.
