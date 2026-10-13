# Polimento do beta: opinião, volume, capa e cenário

Pedido do Tales, 13/10/2026, depois da Jornada única. Base: PR #225 já publicado.
Aplicável ao Claude Code e ao Codex; leia junto com [JORNADA-UNICA.md](JORNADA-UNICA.md).

## Decisões do dono

- Melhorar o convite para opinar e o formulário, que parecia uma caixa sem acabamento.
- Começar com som baixo. O ícone deve abrir um volume vertical, inspirado no controle do iPhone, em vez de mutar imediatamente.
- Corrigir o fundo da arena do Golem e melhorar a apresentação dos flashcards, inclusive o quadro na página inicial. Os prints enviados mostram a capa para conta logada e a opinião em tema claro.
- Mostrar uma proposta de herói menos infantil, usando os modelos existentes como referência.
- Salvar tudo no repositório para o Claude continuar. Capturas reais da interface continuam fazendo parte da entrega visual.

## Implementação

**Opinião:** convite discreto em vez de aviso amarelo; janela de 680 px com padding, cabeçalho, notas agrupadas, campos menores e rodapé fixo durante a rolagem. Responsiva e compatível com temas claro/escuro. Texto curto e acolhedor; orientação sobre dados pessoais fica no final. Mantém a RPC e os campos originais. Erros não apagam o texto nem exibem sucesso. `JanelaCentral` agora inclui textarea e select no ciclo de foco; os dois campos de opinião têm nomes acessíveis estáveis.

**Som:** `Volume.tsx` é compartilhado por Entrada e Arena (Batalha/Estudo). Abre cápsula com range vertical nativo 0–100%, percentual e indicador de preenchimento. Arrastar ou usar setas ajusta o ganho geral de efeitos, música e ambiente. Zero silencia; aumentar reativa. Escape fecha o controle e devolve o foco ao botão; clicar fora fecha. Os sliders individuais continuam nos Ajustes.

O ganho geral em `sons.ts` começa em **0,2**. `volumeDaSessao` mantém o valor ao trocar de modos. `Flashcards.tsx` encerra música/ambiente e chama `reiniciarVolume` ao voltar à central ou sair do recurso: uma nova abertura começa baixa, mesmo que tenha sido aumentada anteriormente. A preferência por som desligado é respeitada. O navegador ainda pode exigir o primeiro gesto para liberar áudio, especialmente no iPhone. O botão controla o áudio do site, não o volume físico do aparelho.

**Golem:** `Cenario.tsx` usava ampliações diferentes na geometria, no tilt-shift e na luz das imagens pintadas offline. Agora essas camadas usam a mesma projeção; o bloom de cenas prontas foi reduzido para evitar brilhos deslocados/excessivos. Cenas procedurais mantêm seus fatores. O cache e a proteção contra repintura de uma cena antiga permanecem. Tamanho zero também é ignorado.

**Capa:** `QuadroFlashcards` mantém a arte nativa existente, com imagem integrada ao quadro, gradiente para legibilidade, serifada Alegreya, chamada curta e botão. Há composição vertical na coluna da conta logada e faixa para visitante/celular. Não substitui o herói nem gera outro asset de produção.

## Proposta de herói — referência, não sprite publicado

[Imagem de conceito](conceitos/heroi-adulto-proposta.png), gerada a pedido do Tales usando `heroi-3.png` como referência. Cavaleiro adulto: cabeça menor, tronco/pernas mais longos, postura firme, capacete de aço, detalhes azul/dourado e escudo deixando mais do corpo aparente. Mantém a identidade; não é uma folha de animação utilizável.

Esta imagem fica **somente na documentação**, fora de `public/`. Não foi aplicada ao jogo. Se esta direção for adotada, refazer o modelo nativo em `scripts/sprites/heroi.py`, os seis estágios e todas as poses/âncoras, conforme [ARTE.md](ARTE.md), e validar a leitura na escala do celular. Não colar o conceito como sprite e não misturá-lo ao atlas atual.

## Verificação

- `npm test`, `npx tsc --noEmit`, `npm run build`.
- `node fixtures/testar_revisao.mjs` e `node fixtures/testar_reinicio.mjs`.
- `python3 scripts/validar_acervo.py`: passou sem erros; avisos editoriais preexistentes permanecem. Este trabalho não altera questões.
- Playwright em 1400×860, 390×844 e 844×390: abertura, teclado/foco, envio falho preservando texto, slider/setas/gesto, zero e reativação, persistência entre modos, reinício em 20%, arena carregada e capa sem rolagem horizontal da página. Elementos decorativos com transform podem exceder geometricamente o tamanho da arena, mas ficam recortados pelo overflow; os controles do topo cabem na tela.
- Prévia de conta logada usa conta fictícia apenas na resposta do módulo ao navegador de captura, sem escrita no servidor ou mudança do produto.
- O teste de interface usa servidor local com Supabase desabilitado: verifica o erro de envio; não cria opiniões reais. A integração/RPC de sucesso permanece a existente.

Reproduzir:

```sh
VITE_SUPABASE_URL=sem VITE_FLASHCARDS_CAPA=1 npm run dev -- --host 127.0.0.1 --port 5201
# Em outro terminal:
node fixtures/testar_flashcards_interface.mjs
```

`ORTO_INTERFACE_URL`, `ORTO_CHROMIUM` e `ORTO_CAPTURAS` permitem ajustar o navegador, o endereço local e a pasta das capturas. O teste recusa servidor remoto.

Capturas locais: [opinião no computador](capturas/polimento/opiniao-desktop.png), [volume no celular](capturas/polimento/volume-celular.png) e [capa na coluna da conta](capturas/polimento/capa-conta-desktop.png).

Nenhum SQL novo. A publicação segue PR para `claude/pdfs-questoes-tp64dr` e workflow Pages. PR #224 do Claude permanece independente: ao integrar suas mudanças, conservar este controle e a política de volume baixo na abertura.
