# Arquitetura

## 0. O que já está no app (12/10/2026, noite)

Tudo em `src/flashcards/`, com camadas separadas como pediu o briefing:

| Camada | Arquivo | O que faz |
|---|---|---|
| Motor de regras | `motor/regras.ts` | Funções puras. Cada ação (`novaPartida`, `responder`, `usarPista`, `seguir`, `escolher`, `encerrar`) devolve `{ estado, eventos }`; uma ação fora de hora devolve o mesmo estado e nenhum evento, o que impede corrida entre clique, tecla e animação. |
| Sorteio com semente | `motor/aleatorio.ts` | A mesma semente repete a partida (testes e, depois, o Desafio do dia). |
| Monstros | `motor/bestiario.ts` | Vida, força, armadura, paciência, veneno, fase 2 do chefe, cenário de cada um. |
| Poderes e relíquias | `motor/poderes.ts` | Catálogo com nome, texto, ícone e cor. |
| Estado da partida | `Partida` em `regras.ts` | Salvo a cada mudança em `flashcards:partida` (por conta, como o resto do site); ao reabrir, a partida continua. |
| Progresso educacional | `progresso.ts` | Registro por flashcard em `flashcards:registros`, no formato do `RegistroQuestao` e com a mesma escada de intervalos. Acerto livre conta como certeza, acerto com pista como dúvida, erro volta. É uma fila separada da de questões. |
| Máquina da tela | `componentes/Arena.tsx` | Fases `pergunta → resposta → recompensa → fim`. O **diretor** (`encenar`) transforma cada evento em animação e pode ser pulado (Esc, Seguir, toque na faixa); ao pular, a tela sincroniza com o estado real. |
| Efeitos e partículas | `efeitos/palco.ts` | Um canvas por cima da arena que só anima enquanto há partículas: projétil com rastro, fagulhas, onda de choque, corte, cura subindo, cacos de escudo, confete e dissolução. |
| Cenários | `efeitos/pintura.ts` | Campo, Masmorra e Salão pintados em canvas uma vez por tamanho de tela. Ambiente leve (vaga-lumes, brasas, poeira, tochas) a 25 quadros por segundo, que para com a aba escondida ou com efeitos reduzidos. Paralaxe discreta com o mouse. |
| Áudio | `efeitos/sons.ts` | Sons sintetizados com Web Audio, sem arquivo; desligados por padrão, com volume. |
| Componentes | `componentes/` | `Cartao` (flashcard 3D com moldura por raridade), `Sprite` (pixel art com luz automática), `Texto` (negrito e lacunas sem HTML), `Cenario` e `TampoMesa`, `Estudo`, `Arena` (com `Recompensas` e `Fim`). |
| Estilo | `src/estilos/paginas/Flashcards.css` | Arena em tela cheia, sem depender do tema do site. Fontes: Cinzel e Alegreya (`@fontsource`) e Pixelify Sans. |
| Página | `src/paginas/Flashcards.tsx` | Rota `#/flashcards`, carregada sob demanda e publicada só por link (`FLASHCARDS_LIBERADO` em `config.ts`); o atalho no Treinar depende de `FLASHCARDS_NO_MENU` (`npm run dev` ou `VITE_FLASHCARDS=1`). Pede conta, como o Treinar. |

**Baralho de demonstração:** os 12 flashcards reais do protótipo (`dados/baralhoDemo.ts`), com o id da questão de origem e as imagens de `public/imagens/`. A fábrica (seção 1) vai substituí-lo.

**Ainda não feito, e não pode ser dado como pronto:**
- limite de 10 por dia no servidor;
- sincronização dos registros com o Supabase;
- bloco "Flashcards de hoje" na Revisão;
- fábrica;
- Livro de flashcards.

**Prints:** `node prototipos/flashcards/testar-prototipo.mjs` serve só para o protótipo HTML. Para o app:
1. rode `VITE_SUPABASE_URL=sem npx vite`; sem Supabase, o app não pede conta, e isso vale só nessa máquina;
2. abra `#/flashcards`;
3. no `npm run dev`, a arena expõe `window.__torneio`, que os testes de tela usam para achar a alternativa certa.

## Proposta inicial (seções 1 a 5)

Ajuste ao implementar e registre acima o que mudou.

## 1. A fábrica (scripts/flashcards/)

Mesmo esquema dos lotes de simulados: gerar rascunhos, conferir, aprovar e publicar.

```
python3 scripts/flashcards/gerar.py   --tema trauma --ordem incidencia [--subtema "Fratura do acetábulo"] [--limite 50]
python3 scripts/flashcards/gerar.py   --anatomia            # Simulados de anatomia, em todos os temas
python3 scripts/flashcards/conferir.py                      # validador (regras do FORMATOS.md)
python3 scripts/flashcards/publicar.py                      # aprovados → public/acervo/flashcards/<tema>.json
```

- **Rascunhos:** `scripts/flashcards/rascunhos/<tema>.json`. É o arquivo que se edita à mão ou com um agente.
- **Publicado:** `public/acervo/flashcards/<tema>.json`, mais um índice leve `public/acervo/flashcards/indice.json` (ids, tema, assunto, raridade, dificuldade).
- **Fontes da geração automática:**
  - a linha `> **Na prova:**` do comentário (lacuna nos negritos);
  - as tabelas markdown do comentário;
  - as questões com imagem;
  - as análises de alternativas para os tipos Par confundível e Armadilha (geração assistida por agente, com revisão).
- **Ordem de publicação:** prioridade máxima, alta, média e baixa, pela incidência (`src/dados/incidencia.json`). Depois, a anatomia dos Simulados.
- **Questão nova no acervo:** o mesmo comando gera os flashcards dela. Não editar à mão o que foi publicado; editar o rascunho e republicar.

### Formato de um flashcard

```json
{
  "id": "fc-trauma-1519-1",
  "questao": "trauma-1519",
  "tema": "trauma",
  "assunto": "Fratura do acetábulo",
  "tipo": "imagem",
  "raridade": "lendaria",
  "dificuldade": 3,
  "frente": "O achado da seta, na oblíqua obturatriz, é patognomônico de qual fratura?",
  "lacunas": [],
  "imagem": { "arquivo": "trauma/trauma-1519-1.jpeg", "legenda": "Fonte: Rockwood and Green, 10ª ed., capítulo 51, figura 51-37B." },
  "resposta": "Fratura de ambas as colunas",
  "explicacao": "É o **sinal do esporão**: a ponta mais baixa do **ílio intacto**...",
  "opcoes": ["Ambas as colunas", "Transversa com parede posterior", "Em T", "Coluna anterior com hemitransversa"],
  "certa": 0,
  "alerta": null,
  "status": "aprovado"
}
```

- Na lacuna, `frente` traz o texto com marcadores `{{c1::termo}}` (padrão do Anki), e a tela troca cada marcador por um espaço.
- `opcoes` alimenta a Batalha; sem opções, o flashcard fica só no modo Estudo.

## 2. Estado do usuário e as filas

- **Arquivo novo:** `src/estado/flashcards.ts`, à parte de `revisao.ts`, para as **filas serem independentes**.
  - Registro por flashcard: `{ c, q, sequencia, proximaRevisao, confianca, historico }`, no mesmo formato do `RegistroQuestao`.
  - Intervalos: os mesmos `INTERVALOS` por confiança. Errei vale chute, Hesitei vale dúvida, Sabia vale certeza.
- **Persistência:** `localStorage` com a chave da conta (como as questões) e sincronização com o Supabase pelo mesmo mecanismo do progresso.
- **Página Revisão:**
  - dois blocos, "Questões de hoje" e "Flashcards de hoje", cada um com contagem e botão próprios;
  - quem nunca usou flashcards não vê o segundo bloco cobrando nada;
  - uma opção "esconder flashcards".
- **Flashcard amaldiçoado:** errado 4 vezes, ele ganha a marca e sugere "Fazer a questão de origem".
- **Cronograma:** só inclui flashcards para quem usa flashcards (decidir junto com o Tales).

## 3. Limite diário (plano grátis)

- **10 flashcards por dia** para não assinantes; assinantes, sem limite.
- **Contagem no servidor:** uma RPC no Supabase, no mesmo padrão do contrato de limite de questões e do fuso canônico (`fixtures/testar_paywall.py`). O cliente só mostra o contador.
- **Ao atingir o limite:** o próximo flashcard aparece **lacrado com selo de cera**, com uma chamada leve para assinar. Sem preço na tela.
- **SQL novo:** vai para `supabase/colar-no-painel/` e também é mandado como texto na conversa (regra do AGENTS.md).

## 4. Telas

- `Treinar` ganha a aba **Flashcards** (rota sugerida: `#/flashcards`).
- A tela de entrada tem:
  - Estudo, Batalha e Livro de flashcards (coleção);
  - filtros por área e assunto;
  - o contador do dia.
- **Mesa:**
  - cenário em canvas de baixa resolução, ampliado com `image-rendering: pixelated`;
  - flashcard em CSS 3D (`transform-style: preserve-3d`, `backface-visibility: hidden`);
  - gestos com Pointer Events: tocar vira; deslizar à direita = Sabia, à esquerda = Errei, para cima = Hesitei;
  - teclado: espaço vira; 1, 2 e 3 avaliam; 1 a 4 respondem na Batalha.
- **Desempenho:** só transform e opacity nas animações, nenhuma biblioteca pesada, e o canvas desenhado a cerca de 11 quadros por segundo (é pixel art).
- **Acessibilidade:**
  - `prefers-reduced-motion` desliga giro e tremor;
  - o flashcard é focável e tem rótulo;
  - os botões têm foco visível.
- **Fontes do protótipo:**
  - Cinzel (títulos), Alegreya (texto) e Pixelify Sans (HUD), todas do Google Fonts;
  - o site já tem Pixelify Sans em `marketing/instagram/fontes/` e usa visual pixel no Ranking.

## 5. Livro de flashcards (coleção)

- O flashcard dominado (escada completa) vira **brilhante** e entra no Livro.
- O Livro mostra o progresso por área e assunto ("Trauma: 34 de 120").
- Emblemas por assunto completo, integrados aos emblemas existentes.

## Fábrica de flashcards (13/10/2026)

`scripts/flashcards/fabrica.py` transforma as questões reais do acervo em flashcards, em lotes, sem inventar conteúdo:

- **De onde sai cada parte:** frente, alternativas e gabarito vêm da questão; a resposta é o texto da alternativa correta (ou o termo em negrito da linha "Na prova", quando coincide com ela); a explicação é o campo `correta` do comentário, sem as letras (as alternativas são embaralhadas), completada pelo primeiro parágrafo do conceito quando só repete a resposta.
- **Tipos:** Na prova (lacuna), Relâmpago (pergunta curta e direta), Imagem e Anatomia (com a figura real da questão).
- **Fica de fora (reprovado):** anuladas, duplicatas, dissertativas, figura pendente, sem comentário, sem gabarito oficial, pergunta com negação ("exceto", "incorreta"), "assinale a afirmação correta" e caso clínico longo.
- **Quarentena (não entra em lugar nenhum até revisão):** comentário com alerta de divergência, gabarito provável, falha de validação (gabarito não preservado, alternativas repetidas, frente que revela a resposta, lacuna ambígua, imagem ausente, travessão, HTML, explicação ausente, duplicata da mesma frente).
- **Batalha ou só Estudo:** alternativas acima de 72 caracteres ou frente acima de 220 ficam só no Estudo.
- **Raridade** = nível de incidência do assunto (`src/dados/incidencia.json`); **dificuldade** é estimada (figura e anatomia = difícil; lacuna curta = fácil) até haver índice de acerto real.
- **Estado incremental** em `scripts/flashcards/estado.json`: por questão, o hash da fonte, a situação e os motivos. Rodar de novo só refaz o que mudou. Ordem de produção: assuntos que mais caem primeiro, provas oficiais (TEOT/TARO) antes, imagem antes dentro do mesmo nível.
- **Saída:** `public/flashcards/<area>.json` e `public/flashcards/indice.json` (contagens por área, assunto e tipo, e uma assinatura para o cache).

Comandos:

```bash
python3 scripts/flashcards/fabrica.py gerar --lote 50          # próximo lote
python3 scripts/flashcards/fabrica.py gerar --todos            # todos os pendentes, lote a lote
python3 scripts/flashcards/fabrica.py gerar --area trauma --somente-imagem
python3 scripts/flashcards/fabrica.py validar                  # revalida o publicado
python3 scripts/flashcards/fabrica.py estado                   # cobertura, quarentena e motivos
python3 scripts/flashcards/fabrica.py refazer                  # do zero (depois de mudar regras)
```

Contagem real em 13/10/2026: **4.302 publicados** (3.858 na Batalha, 444 só no Estudo, 630 com imagem), 523 em quarentena, 2.108 questões sem flashcard pelos motivos acima.

### Seleção procedural (`src/flashcards/motor/selecao.ts`)

O baralho da partida é sorteado em lotes de 40, com semente, por peso: incidência (raridade), revisão vencida, erro anterior, nunca visto, figura (×1,3) e exposição recente (os últimos 600 vistos quase não voltam). A ordem espalha os assuntos. Qualquer adversário joga flashcards de qualquer dificuldade: o desafio do RPG vem do combate.

### Dados para o ranking futuro (`src/flashcards/progresso.ts`)

- **Flashcards únicos respondidos** = número de chaves em `flashcards:registros` (repetição não conta). É a medida principal do ranking.
- **Andar mais fundo**, partidas, chefes, melhor sequência e respostas em `flashcards:recordes`.
- Ambos ficam no aparelho até a sincronização com o Supabase; o formato já é o que o servidor vai receber.
