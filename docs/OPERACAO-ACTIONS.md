# Operação eficiente do GitHub Actions

Diretriz de Tales em 20/10/2026. Regras dos agentes: seção **Eficiência de
desenvolvimento e GitHub Actions** em [AGENTS.md](../AGENTS.md). A produtividade,
a confiabilidade e a atualização do site têm prioridade; não há espera mínima
obrigatória entre pushes. Lotes editoriais podem ser agrupados na mesma entrega.

## Auditoria antes das alterações

Foram inspecionados todos os workflows existentes: `verificar-pr.yml` e
`publicar.yml`, seus gatilhos, scripts npm, tsconfig, geradores e entradas dos
testes. Foram conferidos os PRs abertos e a branch publicada
`claude/pdfs-questoes-tp64dr` no commit `1c92d2d0aded5180630ab86e6d4f1b2139931c3c`.
Nenhum PR alheio foi alterado. Não havia workflow separado de atualização do
acervo: os geradores de incidência, resumão, SEO e sitemap pertencem à publicação.

Amostra: 100 execuções mais recentes consultadas pela API Actions, criadas entre
19/10/2026 16:31:20 UTC e 20/10/2026 23:24:52 UTC. A soma das durações dos jobs
(`completed_at - started_at`, sem fila) foi:

| Workflow | Execuções | Resultados | Minutos de runner |
| --- | ---: | --- | ---: |
| Verificar Pull Request | 66 | 66 sucessos | 157,50 |
| Publicar no GitHub Pages | 34 | 32 sucessos, 2 cancelamentos | 90,88 |
| Total | 100 | | 248,38 |

Há 22 branches na amostra, com prefixos Claude e Codex. Nenhum SHA se repetiu
no mesmo workflow. O volume não decorre de um gatilho de push em toda branch:
o PR já era o único evento da verificação, e apenas as três branches listadas
abaixo publicavam. Cada atualização do PR podia iniciar nova execução sem
cancelar a anterior. Cada incorporação funcional refazia testes/build no merge.
Muitos ciclos pequenos aumentam esse volume mesmo sem SHAs duplicados.

O repositório é privado. Os endpoints de faturamento e proteção de branch
retornaram HTTP 403 para a integração desta sessão. Estes números medem tempo
de runner, não minutos faturados, franquia ou cobrança mensal; não permitem
extrapolação confiável para o mês.

## Fluxo implementado

- **PR:** continua disparando em `pull_request`, com o mesmo job `verificar`.
  Concurrency por número do PR cancela a execução antiga quando chega outra.
  O checkout e a classificação de impacto são leves; documentação pura dispensa
  instalação de Node/dependências, testes e build, sem deixar um check obrigatório
  ausente. Mantém `git diff --check`.
- **Publicação:** continua disparando em pushes de `main`, `master` e
  `claude/pdfs-questoes-tp64dr`, além de `workflow_dispatch`. O job `impacto`
  dispensa construção e deploy para documentação pura; publicação manual força
  a construção. `workflow_dispatch` destinado a outra branch é rejeitado antes
  do deploy. Não há publicação automática de branches de trabalho.
- **Cancelamento seguro:** apenas construções da mesma ref e SHA se cancelam.
  Um rerun de SHA antigo não pode cancelar o build de um SHA novo.
  O job de publicação mantém fila global `pages` sem cancelamento. Antes de
  chamar `deploy-pages`, busca o head remoto da branch e recusa um build
  superado por mudança funcional. Documentação posterior não invalida o build.
  Isso também protege contra reexecuções antigas. Falha de fetch interrompe o
  deploy; não é interpretada como autorização para publicar.
- **Suíte:** todos os testes existentes de `npm test` permanecem. No Pages foram
  retiradas somente chamadas extras de `testar_revisao.mjs`, `testar_reinicio.mjs`
  e `testar_deteccao.py`, já executadas pela suíte. Acervo e geradores continuam.
  No PR, sai somente `npm run typecheck` separado: `npm run build` executa
  `tsc -b` com o mesmo tsconfig antes do Vite, mantendo a barreira de tipos.
- **Cache:** os dois builds já usavam `setup-node@v4` com cache npm, indexado
  pelo lockfile; foi mantido. `npm ci` preserva instalação reprodutível. Não se
  guarda `node_modules` nem se restaura `dist` potencialmente desatualizado.

O classificador compartilhado é `scripts/ci/impacto.py`. Apenas arquivos `.md`
em `docs/` e `AGENTS.md`, `CLAUDE.md`, `README.md`, `LICENSE` dispensam build.
Exceção: `docs/ativacao-e-rollback-assinaturas.md` é entrada real de um teste,
portanto exige a suíte. Qualquer arquivo desconhecido, JSON, imagem, código,
workflow, script, fixture, lockfile, fonte em `conteudo/` ou conteúdo em `public/`
continua exigindo tudo. Um pacote misto executa tudo. Renomes são tratados como
remoção e adição para que mover código para documentação não evite validação.
Comparação indisponível (inclusive histórico raso ou primeiro push) executa tudo.

Não se usam filtros amplos como `**/*.md` nem `paths-ignore: docs/**`: fontes
editoriais e documentos lidos por testes também precisam de validação. O filtro
por job preserva o nome do check de PR, mesmo sem acesso à proteção da branch.
Não foram alteradas regras de merge, configurações de conta, pagamentos,
Supabase, automações externas nem funcionalidades do aplicativo.

## Economia sustentada pela amostra

O typecheck separado somou 1.673 segundos (27,88 minutos de runner) nas 66
verificações: cerca de 25 segundos por execução. Essa repetição é evitada pelo
novo fluxo; corresponde a aproximadamente 11% do tempo total da amostra, se os
demais tempos permanecessem iguais. Não é previsão de economia mensal.
As três chamadas de testes repetidas eram inferiores a um segundo no último
Pages inspecionado, portanto sua remoção tem impacto pequeno.

A economia de documentação e cancelamentos depende da mistura futura de
alterações e da sobreposição das execuções. Não foi atribuído um percentual sem
medição. A nova etapa leve do Pages e o guard de deploy têm custo próprio;
a economia líquida deve ser acompanhada em novas execuções. Agrupar entregas
reduz ciclos completos de PR e publicação sem retirar testes.

## Validação e limites

Executar `python3 fixtures/testar_impacto_ci.py`, `npm test`, `npm run validar`,
`npm run build`, `git diff --check` e `actionlint .github/workflows/*.yml`.
Os testes do filtro usam commits reais, alteração documental, pacote misto,
renome de código e SHA ausente. Conferir checks do head efetivo, deploy do merge
e resposta do site antes de considerar publicada uma mudança funcional.

PR e merge continuam com builds separados: o merge pode conter mudanças
concorrentes, e o build de produção recebe variáveis próprias. Reutilizar um
artefato de PR sem comprovar árvore, configuração e origem seria arriscado.
Uma futura consolidação exige esse desenho e validação, não simplesmente
suprimir testes do merge. Não há otimização adicional bloqueada por aprovação
do dono; acesso ao faturamento é necessário apenas para quantificar cobrança.

Validação local em 20/10/2026: actionlint 1.7.7, suíte completa npm, validação do
acervo, build e diff passaram. O guard extraído diretamente do YAML também foi
executado contra um remoto Git temporário: publicou o head atual e um build
seguido só de documentação, recusou código superado, branch manual inválida e
falha de fetch. A validação remota e o deploy serão conferidos no PR desta entrega.
