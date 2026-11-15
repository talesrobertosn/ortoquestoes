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
