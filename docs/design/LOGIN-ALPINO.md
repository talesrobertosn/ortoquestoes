# Login — Pousada de Natal no Vale

Pedido do Tales em 13/11/2026: vale suíço inspirado em Lauterbrunnen e Grindelwald, verão verde com decoração natalina, luz quente, trem, rios, espaço físico para os três visitantes e arte que continue até o fim da página. Referência dominante: o cenário de neve já aprovado do início. Brainstorm apresentado antes da implementação; início autorizado pelo Tales.

## Pintura e reprodução

`python scripts/cenarios/login_alpino.py` gera manhã, tarde e noite, no computador e no celular. Requer numpy e Pillow. `python scripts/sprites/login_natal.py` gera os figurinos e suas três linhas de 16 quadros.

A cordilheira, o paredão e o chalé usam os pintores originais de `inicio_vale.py` e `inicio_neve.py`. Materiais novos têm textura determinística, bordas, desgaste e iluminação calculada. O chalé perde a cobertura de neve; o vale permanece verde. Não há imagem de terceiros ou geração de imagem por IA.

A pintura do computador tem base 480 × 900; a do celular, 296 × 3300. O jardim estreito é recomposto, sem esticar verticalmente a cena do computador. Faixas contíguas com sobreposição durante o cálculo do bloom evitam emendas. `<picture>` seleciona somente a composição pertinente; faixas inferiores usam carregamento tardio. `ancoras.json` registra a geometria. Só a hora atual é solicitada.

O percurso desce do céu e das montanhas ao terraço, passando por caminho de pedra, canteiros, rio, passarela, pérgola e ponte de alvenaria. O texto e os formulários permanecem HTML com os tokens existentes de contraste claro e escuro.

## Refinamentos visuais

1. Composição inicial: profundidade, posição do rio, terraço e espaços dos mascotes.
2. Substituição do chalé preliminar pelo pintor nativo aprovado; proporções e materiais.
3. Jardim inferior completo, pérgola, presentes e ponte.
4. Arco da ponte recortado sobre a água, sombras de contato e correção da iluminação noturna.
5. Verdes noturnos mais escuros, luz das lanternas mais quente, ajuste de proporções dos sprites, alvos de toque e contraste dos cartões.

## Personagens e movimento

O esqueleto conserva o rosto aprovado E em três quartos, sem boca. Usa casaco verde, colete vermelho tricotado, botões e livro; estados de espera, aceno e celebração. O gato conserva cabeça, patas e cauda, com colete xadrez e cachecol; dorme, observa e celebra. A coruja usa o sprite nativo e observa o foco do formulário.

Os três visitantes têm suportes pintados e alvos de toque de pelo menos 44 px sem distorcer seus desenhos. Falas medidas no DOM são ancoradas no interlocutor e evitam os outros visitantes e o título. O trem passa atrás do terraço. Fogo e água são camadas separadas. A pintura permanece estática com o mouse. Movimento reduzido desativa as animações; fora da área visível ou com a aba oculta, elas pausam.

## Contratos preservados

Entrar, criar conta, Google, recuperação de senha, confirmação, completar perfil, conta lembrada, questão de exemplo, correção, outra questão, vitrine e provas mantêm os fluxos anteriores. Não há alteração no motor de autenticação, banco, permissões, assinaturas ou limites. O gato realocado recebe também o evento de troca da questão.

## Conferência

`fixtures/login_alpino_roteiro.mjs`, com `scripts/capturar_telas.mjs`, usa dados falsos e confere interações dos três visitantes, balões, alvos, proporções, 320–2160 px, composição responsiva, emendas, formulário editável, cadastro, recuperação, questão e movimento reduzido. Nenhuma conta real é criada ou autenticada por esse roteiro. Conferir capturas de manhã, tarde e noite, computador/celular e temas claro/escuro; rodar TypeScript, testes do projeto, build e orçamento de chunks antes da publicação.

Validação concluída em 13/11/2026: testes completos do projeto, TypeScript, build e orçamento de chunks aprovados. Roteiro de interação aprovado nos dois dispositivos, em tarde clara e noite escura, incluindo larguras até 2160 px. Capturas adicionais de manhã clara/escura e noite clara conferidas. O cartão de acesso fica estável ao alternar movimento reduzido; pausa fora da área visível restrita ao cabeçalho.
