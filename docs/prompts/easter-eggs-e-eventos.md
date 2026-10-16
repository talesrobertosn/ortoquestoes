> **Atualização de Tales em 16/10/2026:** implementar e publicar no site está autorizado; substitui o encerramento antigo “não faça push nem PR”. Eventos podem aparecer durante questões comuns sem resposta; simulados continuam bloqueados.

Você está no repositório OrtoQuestões (site React + Vite de questões de ortopedia para a prova TEOT/TARO), num worktree git próprio, sobre a base origin/claude/pdfs-questoes-tp64dr (faça git fetch origin claude/pdfs-questoes-tp64dr && git reset --hard origin/claude/pdfs-questoes-tp64dr antes de começar). Tarefa: implementar os easter eggs e os eventos aleatórios combinados com o dono (Tales).

Leia antes
AGENTS.md, CLAUDE.md, docs/PLANO-DE-IDEIAS.md (marque o que concluir), docs/BRAINSTORM-15-10.md, e a passagem git show origin/claude/eager-meitner-bumj65:docs/CONTINUAR-SESSAO-16-10.md (seção "Fila combinada" e as regras fixas).
Regras fixas: nunca citar o total de questões do acervo; nunca nomes de outras marcas/concorrentes; fora do jogo dos flashcards dizer "Flashcards"/"Torneio de Flashcards", nunca "Cripta"; arte só por scripts próprios (pixel art com PIL, como scripts/gerar_fogueira_inicio.py, ou CSS/SVG feitos à mão; nada baixado nem gerado por IA); imagens em variável CSS só com urlCss() de src/config.ts; não mudar preços, planos, limites, gabaritos nem dados de usuários; não criar SQL nem Edge Function (se algo exigir servidor, faça só a parte local ou deixe de fora e relate). Tom das frases: caloroso, leve, de colega de plantão (veja docs/emails/TOM.md).
Easter eggs (todos discretos, sem atrapalhar o estudo)

código Konami ortopédico; festa nas questões 1.000, 5.000 e 10.000 respondidas pela pessoa; sinal de Tinel na logo (toques repetidos na logo dão um "formigamento"); plantão da madrugada; Dia do Ortopedista e véspera do TEOT (use a data da prova que o site já conhece; procure em src/); sala secreta "Arquivo do Preceptor"; gato da Biblioteca (na Biblioteca de Flashcards); martelo de reflexo nas classificações; mensagem no console do navegador; página de erro (404, NaoEncontrada/MapaPerdido em src/paginas/Apoio.tsx) com fratura; "R1 sem dormir"; emblema "Mão de cirurgião" (se emblemas forem validados/gravados no servidor, faça como selo local visual e relate).

Eventos aleatórios

café de plantão; bilhete na prancheta; visita do mascote; estrela cadente; sexta à noite; confete do acaso; frases por hora do dia; aniversário da conta e aniversário da pessoa (campo "Data de nascimento" já existe no perfil, ver src/paginas/Conta.tsx); recorde pessoal; datas especiais; biscoito da sorte; fim de semana: personagem por 4 a 5 s, por exemplo "Sábado, 15h, e você aqui"; madrugada: entre 0h e 5h, pode repetir na sessão com intervalo de alguns minutos e frases variadas.

Regras dos eventos: podem aparecer durante uma questão aberta, inclusive sem resposta (alteração autorizada pelo Tales em 16/10/2026); não podem aparecer em simulado (Simulado Nacional, Teste do cronograma ou sessão cronometrada); somem sozinhos; opção de desligar em Minha conta (guarde localmente e, se já existir preferência sincronizada sem SQL novo, use-a); respeitar prefers-reduced-motion; não dar nenhuma vantagem no ranking nem mexer em contagens; frequência baixa (no máximo um evento a cada tantos minutos, com sorteio controlado e testável).

Arquitetura sugerida

Um módulo puro de regras (src/eventos/...: quando cada evento/egg pode aparecer, dado relógio, rota e estado), testado em fixtures/ (no npm test, com relógio falso: madrugada, fim de semana, aniversário, véspera, sessão em andamento, simulado, preferência desligada, reduced-motion), e componentes pequenos carregados sob demanda (lazy) para não pesar no código inicial: existe fixtures/testar_orcamento_chunks.mjs em outra frente com orçamento de 56 KB gzip para a entrada; mantenha a entrada praticamente igual.

Validação e entrega
Dependências: ln -s /home/user/ortoquestoes/node_modules node_modules (não rode npm ci).
Antes de cada commit: npx tsc --noEmit, npm test, npm run build, git diff --check.
Playwright (Chromium em /opt/pw-browsers/chromium) em 1400×860 e 390×844: force alguns eventos/eggs com relógio falso ou parâmetro de teste e capture. Salve em /tmp/claude-0/-home-user-ortoquestoes/470d052f-b947-5213-a54a-486d1d75caf6/scratchpad/capturas-eventos/ e olhe as imagens.
Documente em docs/EASTER-EGGS-E-EVENTOS.md (cada egg/evento: gatilho, onde aparece, frases, como testar, como desligar), sem revelar isso na interface.
Commits no worktree em português, sem citar modelo de IA, terminando com Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com> e Claude-Session: https://claude.ai/code/session_01AU5toQs4eW6NnpUHqsThJp. Não faça push nem PR.
Relate: hashes, caminho do worktree, o que foi feito e o que ficou de fora (e por quê), testes com resultado e caminhos das capturas principais.
