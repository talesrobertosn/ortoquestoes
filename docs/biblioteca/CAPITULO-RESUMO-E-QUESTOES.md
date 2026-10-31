# Capítulo do Tales → resumo + OrtoQuestões Simulados + convite em todas as questões do tema

Documento para qualquer conta ou sessão do Claude (ou outro agente) que receber um capítulo de livro do Tales.
Pedido dele, em 19/10/2026: "quando eu mando um capítulo de livro, faz o resumo junto com outras questões simuladas e,
depois, ainda coloca nas questões que têm esse tema o resumo lá embaixo. Tem que colocar em tudo: a pessoa fez uma
questão sobre lesões do tal tema e aparece lá embaixo 'leia mais sobre esse tema no resumo'".

Este arquivo explica **o que fazer, em que ordem e como o site liga tudo**. O passo a passo detalhado de cada etapa
já existe e continua valendo:
- [PILOTO-AUTOMATICO.md](PILOTO-AUTOMATICO.md): o roteiro completo, com o significado de cada pedido curto, as regras de ouro, a divisão em agentes e o jeito de escrever.
- [README.md](README.md): o formato técnico do resumo, ou seja, o front matter e os blocos `!questoes`, `!figura`, `!tabela` e radar.
- [CHECKLIST.md](CHECKLIST.md): a lista dos capítulos já feitos.
- [docs/padrao-editorial-comentarios.md](../padrao-editorial-comentarios.md) e [docs/padrao-questoes-simulado-teot-taro.md](../padrao-questoes-simulado-teot-taro.md): o padrão dos simulados.

Leia também `AGENTS.md` e `CLAUDE.md` na raiz antes de começar.

---

## 1. O que o Tales manda e o que ele quer

| Ele manda | Você entrega, sem pedir confirmação |
| --- | --- |
| PDF de capítulo com "faça resumo disso", "questões e resumo" ou sem dizer nada | Os **OrtoQuestões Simulados** do capítulo (quantos o tema merecer), o **resumo** na Biblioteca e o **convite para o resumo** em todas as questões do tema |
| "só o resumo" ou "já temos as questões" | O resumo citando os simulados que já existem, e o convite |
| "só as questões" | Só os simulados. Eles passam a aparecer no resumo do tema na próxima vez que o resumo for gerado, se for citado em `treino=` |

O resultado que ele quer ver no site:
1. **O resumo** em `/resumos/<id>`, gratuito, organizado na ordem em que as provas cobram o tema, com as questões reais e os simulados no meio do texto.
2. **Os simulados** no Treinar, misturados às oficiais ou sozinhos, com o selo "OrtoQuestões Simulados" e o comentário em formato de aula.
3. **Em toda questão do tema**, oficial ou simulada, o **convite da Biblioteca** no fim do comentário, depois de responder:
   - **"Esta questão está explicada num resumo"**, com o botão "Ler o trecho que explica", quando a questão está citada no resumo. O botão abre o resumo já no parágrafo dela, destacado.
   - **"Tem um resumo sobre este tema"**, com o botão "Ler o resumo", quando a questão não está citada, mas o subtema dela é o do resumo.

---

## 2. A ordem do trabalho

1. **Abrir o PDF e descobrir o que ele é.** O nome do arquivo engana. Leia o número e o título do capítulo nas primeiras linhas de cada página (`pdfinfo`, `pdftotext -f N -l N`). Confira no CHECKLIST se o capítulo já tem resumo: se tiver, você **atualiza**, não refaz. Detalhes em PILOTO-AUTOMATICO, seção 3.
2. **Engenharia reversa da banca.**
   - Rode `python3 -I scripts/simulados/registro.py` para ver o que já existe.
   - Rode `mapear_banca.py` para ver as questões oficiais do assunto: prova, ano, gabarito, como foi perguntado e qual foi a armadilha.
3. **Simulados (quantos o tema merecer, sem cota (Tales, 31/10/2026: tema bom, mais; tema ruim, menos; o ponto de partida sai de `scripts/biblioteca/fila_teot_taro.py` e se ajusta pelas lacunas do capítulo)).**
   - Cada simulado é uma "gêmea" do que já caiu (outro ângulo do mesmo fato) ou uma lacuna com chance real de cair.
   - Formato TEOT/TARO, gabarito distribuído entre as letras e comentário completo.
   - O `conceito` do comentário termina com "Por que esta questão foi criada.".
   - Aplique com `scripts/simulados/aplicar_lote.py`, primeiro com `--conferir` e depois sem, dentro do lock. Detalhes em PILOTO-AUTOMATICO, seção 5.
4. **Resumo** em `conteudo/biblioteca/<livro><edição>-<capítulo>-<tema>.md`.
   - Escreva no mesmo jeito dos anteriores (PILOTO-AUTOMATICO, seção 6).
   - Depois de cada ponto cobrado, um bloco `!questoes`:
     - `central=`: a questão real que melhor representa o ponto;
     - `relacionadas=`: as outras questões reais;
     - `treino=`: os simulados do passo 3.
5. **Ligar o resumo a todas as questões do tema.** Esta é a parte nova, explicada na seção 3 abaixo.
6. **Conferir**, conforme a seção 4.
7. **Registrar** no CHECKLIST e no `docs/simulados/mapas-da-banca.md`.
8. **Publicar:** commit, push, PR para `claude/pdfs-questoes-tp64dr` e merge. O Tales já autorizou sempre. Depois, um relatório curto para ele (PILOTO-AUTOMATICO, seção 11).

Sempre que um comando escrever em `public/acervo` ou `public/biblioteca`, rode-o dentro de `flock /tmp/claude-0/acervo.lock -c '...'`.

---

## 3. Como o convite aparece no fim de cada questão (e como garantir que aparece em todas)

O componente é `src/biblioteca/EstudarAssunto.tsx`, montado no `CartaoQuestao.tsx` depois do comentário. Ele decide assim:

1. **A questão está citada num resumo?** O gerador da Biblioteca (`node scripts/biblioteca/gerar.mjs`) lê todos os `!questoes` dos resumos e grava `public/biblioteca/questoes.json`. Esse arquivo diz, para cada id de questão, qual resumo a cita, em qual trecho e com que papel (`central`, `relacionada` ou `treino`). Se a questão está lá, o convite diz "Esta questão está explicada num resumo" e o botão abre aquele trecho.
2. **Se não está citada, o subtema dela é o do resumo?** O gerador também copia a linha `subtemas:` do front matter de cada resumo para `public/biblioteca/indice.json`. Se algum subtema da questão está nessa linha, o convite diz "Tem um resumo sobre este tema". Havendo mais de um resumo possível, vale o que tiver mais subtemas em comum.
3. Se nenhuma das duas coisas acontece, o convite não aparece.

Para o convite chegar a **todas** as questões do tema:

- **Cite no resumo todas as questões reais que o capítulo ensina** (`central=` e `relacionadas=`) e **todos os simulados do capítulo** (`treino=`). Questão citada abre direto o parágrafo certo, que é o melhor convite.
- **A linha `subtemas:`** precisa ter **todos os nomes de subtema do acervo que são esse tema**, escritos exatamente como no acervo. Isso inclui os nomes "combinados", por exemplo:
  - "Fraturas do tornozelo e do pilão tibial" entra no resumo do tornozelo e no do pilão;
  - "Fraturas do cotovelo e antebraço" entra no do cotovelo.

  Assim, as questões irmãs que o texto não cita também ganham o convite. Para ver os nomes, use `public/acervo/indice.json`, chave `subtemas`.
- **Não ponha subtemas genéricos de outra área** só para aumentar a conta: "Anatomia do quadril" ou "Imagem da mão e punho" mandariam a pessoa para o resumo errado. Subtema genérico só entra se o capítulo inteiro for sobre ele.
- **Rode o conferidor de cobertura** depois de gerar a Biblioteca:
  ```bash
  flock /tmp/claude-0/acervo.lock -c 'node scripts/biblioteca/gerar.mjs'
  python3 -I scripts/biblioteca/cobertura.py
  ```
  Ele mostra quantas questões já têm convite e, para cada resumo, os subtemas que faltam na linha `subtemas:`. São os casos em que pelo menos 30% das questões do subtema (e no mínimo 3) já estão citadas naquele resumo.
  - Se a sugestão é o mesmo tema, acrescente o subtema na linha `subtemas:`, separado por `; `.
  - Se é outro tema, não acrescente.
  - Depois, gere de novo.

  Em 19/10/2026 foram acrescentados assim os subtemas combinados do tornozelo, do pilão e do cotovelo, e o convite passou de 1.848 para 1.858 questões.
- **Simulados novos de um tema que já tem resumo:** inclua os ids em `treino=` no bloco certo do resumo e aumente a `versao` do front matter. Mesmo sem isso, o simulado já recebe o convite pelo subtema, desde que use o mesmo nome de subtema da linha `subtemas:`.

O convite aparece depois que a pessoa responde, junto do comentário. O resumo é gratuito; o botão mostra o cadeado só quando o resumo for de assinante.

---

## 4. Conferir antes de publicar

```bash
flock /tmp/claude-0/acervo.lock -c 'node scripts/biblioteca/gerar.mjs && python3 scripts/validar_acervo.py'
python3 -I scripts/biblioteca/cobertura.py
npx tsc -b && npm test && npm run build
```

- Para ver no navegador, rode `npx vite`. Abra `#/resumos/<id>` e uma questão citada `#/questao/<id>`, responda e role até o convite.
- Para fotografar uma tela, use `node scripts/capturar_telas.mjs /questao/<id> <prefixo> --pasta <pasta> --roteiro <roteiro.mjs>`. O roteiro é um arquivo `.mjs` que exporta `default async (pagina, foto) => {...}`: clique numa `.alternativa`, depois no botão de `.acao-responder`, role até `.bib-convite` e chame `foto('convite')`.
- Nunca pule nem desligue um teste. Se o acervo cresceu e um teste de tamanho quebrou, corrija a suposição do teste.

---

## 5. Regras de ouro

As mesmas do PILOTO-AUTOMATICO, resumidas:
- Tudo sai **só do capítulo enviado**.
- Nada de prova, ano, id ou estatística inventados.
- O **gabarito oficial é preservado**. Uma divergência vai em `alerta`.
- Não citar o total de questões do acervo em texto.
- Nenhuma imagem gerada por IA.
- Nenhum texto diz a profissão ou a etapa do Tales (orientação de 19/10/2026).

---

## 6. Modelo de instrução para um agente (um por capítulo)

> Você trabalha em /home/user/ortoquestoes. Leia AGENTS.md, CLAUDE.md, docs/biblioteca/CAPITULO-RESUMO-E-QUESTOES.md e
> docs/biblioteca/PILOTO-AUTOMATICO.md, e os guias que eles citam. TAREFA: capítulo N do <livro, edição>, "<título>" (<autores>).
> Texto em <scratchpad>/capN/cap.txt (PDF: <caminho>, páginas A–B). Pedido do Tales: "<frase>" ⇒ <só resumo | só simulados | os dois>.
> Faça quantos simulados o tema merecer (ponto de partida em `scripts/biblioteca/fila_teot_taro.py`), aplicados dentro do lock. Depois escreva o resumo `conteudo/biblioteca/<id>.md`, citando-os em `treino=` e citando todas as
> questões reais do tema. Complete a linha `subtemas:` com todos os nomes de subtema do acervo que são esse tema e rode
> `scripts/biblioteca/cobertura.py`. Atualize o CHECKLIST e os mapas da banca. Não faça commit nem push. No fim responda: os ids criados, o id do
> resumo, quantas questões ganharam o convite, os alertas e as dúvidas.
