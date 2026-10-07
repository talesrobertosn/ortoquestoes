# Fluxo de trabalho dos OrtoQuestões Simulados

Ferramentas para transformar um capítulo da bibliografia em questões no padrão TEOT e TARO.
As regras de conteúdo estão em [docs/padrao-questoes-simulado-teot-taro.md](../../docs/padrao-questoes-simulado-teot-taro.md)
e o que a banca cobra por assunto, em [docs/simulados/mapas-da-banca.md](../../docs/simulados/mapas-da-banca.md).

Trabalhe numa pasta fora do repositório (por exemplo, o rascunho da sessão). O PDF nunca entra no
repositório. Rode o que lê o PDF com `python3 -I`.

| Passo | Comando | Saída |
|---|---|---|
| 0. O que já existe | `python3 scripts/simulados/registro.py` | capítulos já feitos, ids, gabarito e tamanho dos comentários |
| 1. Ler a banca (engenharia reversa) | `python3 scripts/simulados/mapear_banca.py --regex '...' --subtema '...' --tema <tema> [--excluir ids] > PASTA/oficiais.txt` | questões oficiais de TEOT e TARO, resumo de formato e fatos repetidos na saída de erro; seguir o roteiro "Engenharia reversa por tema" do guia e registrar no mapa da banca |
| 2. Extrair o capítulo | `python3 -I scripts/simulados/extrair_capitulo.py capitulo.pdf PASTA prefixo` | `r.txt`, `secoes.txt`, `figuras.txt`, `img/` e `mosaico*.png` |
| 3. Escrever os lotes | copiar `scripts/simulados/exemplo_lote.py` para `PASTA/lote_a.py` etc. | 6 a 9 questões por lote |
| 4. Conferir | `python3 scripts/simulados/aplicar_lote.py PASTA tema lote_a,lote_b --conferir` | erros bloqueiam; avisos mostram comentários curtos e enunciados fora da faixa |
| 5. Aplicar | o mesmo comando sem `--conferir` (opcional `--data AAAA-MM-DD`) | questões e comentários no tema, figuras em `public/imagens/<tema>/` |
| 6. Validar | `python3 scripts/gerar_indice.py && python3 scripts/validar_acervo.py && npm test && node fixtures/testar_revisao.mjs` | tudo verde antes do commit |
| 6b. Enriquecer depois | `python3 scripts/simulados/enriquecer.py PASTA/acrescimos.py [--conferir]` | acrescenta texto a comentários já publicados (por id), sem mexer em gabarito e enunciado |
| 7. Registrar | atualizar `docs/simulados/mapas-da-banca.md` com o mapa do assunto e as lições do capítulo | o conhecimento fica para o próximo |

O que o `aplicar_lote.py` confere: 4 alternativas distintas; gabarito coerente com as chaves de
`inc`; `correta` começando com `**X:`; subtema existente no tema escolhido (lista os válidos se
errar); ausência de travessão, meia-risca, itálico com asterisco simples e marca-texto; enunciado
sem EXCETO, INCORRETA, "assinale" ou lacuna de completar (______); figura existente. Avisa quando o comentário tem menos de 4.000
caracteres. Mostra a distribuição do gabarito e a mediana dos comentários do lote.

A figura usa `img=("arquivo_sem_ext", "figura 32-11", (x0, y0, x1, y1))`; a caixa é opcional e
serve para recortar o painel certo e tirar rótulos que entreguem a resposta. Olhe o recorte antes de
aplicar.
