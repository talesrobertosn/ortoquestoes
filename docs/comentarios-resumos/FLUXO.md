# Fluxo: comentários das questões a partir dos resumos

Fluxo aprovado pelo Tales em 27/10/2026, para repetir sempre que entrarem **questões novas** ou **resumos novos**. As regras de fundo estão no [README](README.md) deste diretório e no [padrão editorial](../padrao-editorial-comentarios.md); este arquivo é o roteiro prático, na ordem em que se faz.

## Quando rodar

- **Chegou resumo novo** (capítulo publicado em `conteudo/biblioteca/`): ele pode resolver questões que estavam em `pendente-fonte`. Rodar o fluxo com `--com-lacunas` no capítulo novo.
- **Chegaram questões novas** no acervo: elas entram sozinhas no catálogo como `pendente` (ou `pendente-inspecao-imagem`). Rodar o fluxo sem `--com-lacunas`.
- Pedido curto do Tales ("corrija com os resumos", "faz as questões do resumo novo") quer dizer este fluxo inteiro, até publicar, sem pedir confirmação a cada lote.

## Passo a passo

1. **Base atualizada e branch própria.** `git fetch origin claude/pdfs-questoes-tp64dr`, branch nova a partir dela. Ver os PRs abertos para não colidir com o Codex (ele usa lotes numerados; o Claude usa o prefixo `c`, hoje até `c08`).
2. **Catálogo.** `python3 scripts/comentarios-resumos/catalogo.py atualizar`. Mostra a contagem por estado.
3. **Fila do capítulo.**
   ```bash
   python3 scripts/comentarios-resumos/catalogo.py exportar --capitulo <id-do-resumo> \
     --limite 50 --com-lacunas --saida work/fila.json
   ```
   `--com-lacunas` traz de volta as pendências já anotadas (fonte, imagem, anulada), cada uma com a frase do que faltava: é por ela que se vê se o resumo novo resolve. O `work/` é rascunho local (está no `.git/info/exclude` desta máquina; não versionar).
4. **Ler o resumo inteiro** (`conteudo/biblioteca/<id>.md`) antes de escrever. Os IDs de bloco estão em `public/biblioteca/capitulos/<id>.json`.
5. **Triar cada questão:**
   - o resumo sustenta a resposta e o raciocínio de **todas** as alternativas → escrever;
   - o dado decisivo não está no resumo, ou duas alternativas ficam defensáveis → `pendente-fonte`, com a frase exata do que falta;
   - questão com imagem → **abrir a imagem** (Read no arquivo de `public/imagens/`) antes; se a figura não bate com o enunciado, dizer no comentário e avisar o Tales;
   - Para novas questões e revisão de fonte primária de SIMÃO/SBCM, exigir Green em mãos (`docs/mao/PROTOCOLO.md`). Na revisão secundária das candidatas existentes desta tarefa, incluir todas as provas conforme autorização atual documentada em `AGENTS.md` e `README.md`; usar apenas os resumos conferidos, com `baseResumo`, sem declarar páginas ou leitura primária não realizadas.
6. **Escrever o rascunho** `work/rascunho-cNN.json`: `{id: {"resumo": ..., "blocos": [...], "imagensConferidas": [...], "comentario": {conceito, correta, incorretas, conferido: false, alerta?}}}`.
   - **Primeiro bloco = a seção mais específica**: é ela que o selo "Comentário baseado em resumo" e o convite "Leia o resumo" abrem.
   - Miniaula: o conceito primeiro, o mecanismo, a imagem descrita quando houver, um quadro "**Na prova:**", e uma linha final apontando a seção do resumo. Cada alternativa errada com o erro específico dela.
   - Gabarito nunca muda. Divergência com o livro vai em `alerta`. Anulada: todas as letras em `incorretas`, `correta` explica a anulação (o validador recusa anulada que ainda tem `gabarito` nos dados).
   - Citar livro, edição e capítulo só para o que está no resumo; nada de página.
7. **Montar, conferir e aplicar** (dentro do lock):
   ```bash
   python3 scripts/comentarios-resumos/montar.py work/rascunho-cNN.json docs/comentarios-resumos/lotes/cNN-tema.json
   flock /tmp/claude-0/acervo.lock -c 'python3 scripts/comentarios-resumos/aplicar.py docs/comentarios-resumos/lotes/cNN-tema.json --conferir'
   flock /tmp/claude-0/acervo.lock -c 'python3 scripts/comentarios-resumos/aplicar.py docs/comentarios-resumos/lotes/cNN-tema.json'
   ```
8. **Registrar as lacunas** em lote: `work/lacunas.json` (`{id: "o que falta"}`) e, de dentro de `scripts/comentarios-resumos/`, `python3 pendencias.py ../../work/lacunas.json`. Depois `catalogo.py atualizar`.
9. **Validar**: se alguma questão ganhou o primeiro comentário, `python3 scripts/gerar_indice.py` (no lock). Depois `python3 scripts/letras_alternativas.py`, `python3 fixtures/testar_comentarios_resumos.py`, `python3 scripts/validar_acervo.py`, `npm test`, `npm run build`, `git diff --check`.
10. **Print de conferência** (o Tales gosta de ver o primeiro do lote):
    ```bash
    node scripts/capturar_telas.mjs /questao/<id> print \
      --roteiro scripts/comentarios-resumos/roteiro-print.mjs --pasta <scratchpad>/telas
    ```
11. **Publicar**: commit dos lotes, catálogo, `ANDAMENTO.md` e `public/acervo/comentarios/*.json` (mais `indice.json`/`letras.json` se mudaram); PR para `claude/pdfs-questoes-tp64dr`; CI verde → merge; conferir que o workflow "Publicar no GitHub Pages" do merge terminou com sucesso.
12. **Relatar ao Tales**: quantas revisadas, quantas viraram pendência e por quê, e o que depende de decisão dele.

## Estado em 27/10/2026

1.668 revisadas de 2.623 no catálogo (inclui os lotes do Codex). Faltam 868: 766 sem resumo que cubra o assunto ou com ambiguidade registrada (cada uma com a frase do que falta), 100 de SIMÃO/SBCM, 2 sem figura (87 duplicadas não contam). Aguardando decisão do Tales: `coluna-0088` e `trauma-0322` (anuladas com gabarito nos dados; texto pronto) e a figura trocada de `pe-tornozelo-0295`.

O texto das duas anuladas está em [rascunhos/anuladas-com-gabarito.json](rascunhos/anuladas-com-gabarito.json), no formato de rascunho: tirado o `gabarito` das questões, é só `montar.py` e `aplicar.py` (passo 7).
