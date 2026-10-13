# Como continuar a Cripta em outra conta

Atualizado em 13/10/2026, no fim das Etapas 1 a 8 da direção criativa.

## Mensagem para colar na outra conta

> Leia docs/flashcards/CONTINUAR.md e docs/flashcards/PASSAGEM-ETAPA1.md na branch
> claude/sharp-goodall-pl7kp7 do repositório talesrobertosn/ortoquestoes e continue de onde parou.
> Trabalhe nessa mesma branch, com PR para claude/pdfs-questoes-tp64dr. Respeite todas as
> restrições listadas nos arquivos.

## Onde as coisas estão

| O quê | Onde |
|---|---|
| Branch de trabalho | `claude/sharp-goodall-pl7kp7` |
| Base (publica no GitHub Pages) | `claude/pdfs-questoes-tp64dr` |
| Etapa 1 integrada | PR #219 |
| Etapas 2 a 8 | PR #220 (aberto; ver "Parou aqui" abaixo) |
| Relatório da Etapa 1 | https://claude.ai/artifact/USHFDMekPZmT5ptqcsVd1y |
| Relatório das Etapas 2 a 8 | https://claude.ai/artifact/FZJtaBEu91gh6qbxLs5T9M |
| Passagem detalhada (o que foi feito e o que falta, etapa por etapa) | [PASSAGEM-ETAPA1.md](PASSAGEM-ETAPA1.md) |
| Arte: como fazer cenário e personagem | [ARTE.md](ARTE.md) |
| Histórico das auditorias de arte | [AUDITORIA-ARTE.md](AUDITORIA-ARTE.md) |

## O que já foi feito (resumo)

1. **Floresta das Fises Antigas** (andar 1), pintada offline, com a clareira de pedras, vaga-lumes, folhas e borboletas.
2. **Alternativas 1 a 4** forjadas: pergaminho, moldura de bronze, medalhão e 8 estados.
3. **Modo Estudo** com o mesmo acabamento:
   - Biblioteca Ancestral;
   - alternativas antes de virar;
   - placas Errei, Hesitei e Sabia;
   - painéis forjados.
4. **Celular deitado** com layout próprio, em três colunas.
5. **Herói em 6 estágios**, crescendo de verdade do aprendiz à lenda.
6. **Chefes:** Dragão de Ossos redesenhado e Guardião com acabamento.
7. **Interface mais leve:**
   - dois selos e um "+N" na placa do adversário;
   - topo acima dos personagens;
   - "Ver imagem" sempre visível.
8. **Covil e Masmorra** pintados offline; sem chuva nas cenas internas.
9. **Salas de evento:**
   - ferreiro;
   - curandeira;
   - baú;
   - sala secreta;
   - encontros.
   - Com elas, as sinergias de relíquias.
10. **Trilha:** floresta, masmorra, covil e sala.
11. **Bestiário:** variantes em volume (golem, guardião, serpente, gosma) e a Gosma de Cimento modelada.
12. **Revisão do PR #219** (Codex): o cenário pintado não repinta mais com a cena antiga quando se troca Batalha/Estudo antes de as camadas carregarem; o corte do celular deitado é o mesmo no CSS e no `usarFaixa` (paisagem, altura ≤ 520 px, largura ≥ 480 px), com o flashcard preso à coluna do meio e o painel do Estudo em coluna de 480 a 700 px.
13. **Celular em pé, Estudo:** os botões Errei, Hesitei e Sabia ficavam espremidos ao lado do veredito; agora o veredito ocupa a linha de cima e os três botões dividem a de baixo.

14. **Dificuldades da Batalha (Fácil, Normal e Difícil),** escolhidas na entrada e guardadas em `flashcards:nivel`. Cada partida guarda o próprio `nivel`; as partidas antigas abrem como Normal.
   - O nível muda a vida do herói (×1,3, ×1 ou ×0,85), a do adversário (×0,8, ×1 ou ×1,25), o dano recebido (×0,65, ×1 ou ×1,35) e os pontos (×0,5, ×1 ou ×1,5).
   - Muda também o peso de cada dificuldade de flashcard no sorteio (`NIVEIS` em `motor/regras.ts`, `pesoDoFlashcard` em `motor/selecao.ts`). O conteúdo não muda, só a mistura.
   - **Ranking:** o Fácil não abre corrida no servidor nem conta para os recordes de andar. Só Normal e Difícil contam.
   - Simulação com 75% de acerto, andar médio: Fácil 11,5, Normal 4,8 e Difícil 2,9.

## Parou aqui (13/10/2026, fim da sessão)

O último commit ("Correções da revisão…") já está no PR #220. Falta:

1. **Conferir o teste novo** em `fixtures/testar_flashcards.mjs`, no bloco "Salas de evento". A parte de "reforçar respeita o máximo de cargas" pega a primeira recompensa que tem `maximo`, que pode não ser um poder.
   - Troque por um poder de verdade: `m.PODERES.find((r) => m.RECOMPENSAS[r].maximo === 1)`, com `ouro: 60` no estado.
   - Confirme que o teste falha sem a correção em `aplicarEfeitoSala` (`cargas` com `Math.min`).
2. **Rodar os testes:** `npm test`, `npx tsc --noEmit`, `npm run build` e Playwright em 1400×860, 390×844, 844×390, 600×360 e 568×320.
3. **Responder os comentários do Codex no PR #220** (cargas, cura da forja e peso das relíquias, já corrigidos) e resolver as conversas.
   - No PR #219 (já mesclado) também há dois comentários, cenário antigo e corte do deitado, já corrigidos neste commit.
4. **Ler as notificações novas do PR #220.** Com o CI ("verificar") verde, fazer o merge do PR #220 na base `claude/pdfs-questoes-tp64dr`.
5. **Depois do merge,** recomeçar a branch: `git fetch origin claude/pdfs-questoes-tp64dr && git checkout -B claude/sharp-goodall-pl7kp7 origin/claude/pdfs-questoes-tp64dr && git push -f -u origin claude/sharp-goodall-pl7kp7`.

## Próximos passos sugeridos (em ordem)

1. **Folhas em volume** para raptor, mímico e esqueleto, que estreiam cedo. Use o modelo de `scripts/sprites/gosma.py` e `python3 scripts/sprites/assar.py <nome>`.
2. **Pintar Torre e Salão** com `scripts/cenarios/` (veja "Como fazer um cenário novo" em ARTE.md) e ligar em `CENAS_PINTADAS`.
3. **Variantes escarlate e ancestral do Dragão**: acrescente `VARIANTES` em `scripts/sprites/dragao.py`.
4. **Escudo do herói no estágio 6**: reduzir (`PROP[6]['escudo']` em `scripts/sprites/heroi.py`).
5. **Emenda da faixa "sala"**: revisar com `python3 scripts/musica/conferir.py`.

## Como trabalhar

- **Instalar:** `npm install`.
- **Servidor local:** `VITE_SUPABASE_URL=sem npx vite --port 5199`.
- **Gancho de teste** (só no modo de desenvolvimento): `window.__torneio`.
  - `ir(andar, semente)` leva a partida a um andar.
  - `definir(partida)` troca o estado.
  - `cena(nome)` troca o cenário.
- **Capturas com Playwright:**
  - usar `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`;
  - semente fixa em `Math.random`;
  - tamanhos 1400×860, 390×844 e 844×390 (deitado).
  - Os roteiros antigos ficavam em `.capturas/` (fora do git) e precisam ser recriados.
- **Antes de cada PR:**
  - `npm test`;
  - `npx tsc --noEmit`;
  - `npm run build`;
  - Playwright nos três tamanhos.
- **Ao enviar:** sempre `git push -u origin claude/sharp-goodall-pl7kp7`. Depois de um merge, a branch local pode ficar ligada à base, e aí um `git push` simples não envia.
- **Depois do merge de um PR:** recomeçar a branch a partir da base.

## Restrições (não mudam)

- **Publicar:** só na rota escondida `#/flashcards`.
  - Nada de banner, menu, ranking público, divulgação ou página de vendas.
- **Não mexer:**
  - assinaturas e limites;
  - questões, gabaritos e comentários;
  - dados de usuários.
- **Preservar:** as feature flags e o progresso salvo. Partidas antigas precisam continuar abrindo.
- **Arte:**
  - só pintura nossa, sem imagem baixada nem gerada por IA;
  - sem anatomia nos enfeites;
  - nada copiado de outros jogos.
- **Commits e PRs:** sem identificador de modelo.
