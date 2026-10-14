# Desempenho: ideias 68 e 69

14/10/2026. PR draft [#249](https://github.com/talesrobertosn/ortoquestoes/pull/249), independente, sem merge.

`vfxPorAndar` seleciona os efeitos comuns do herói e a família do adversário atual. A Biblioteca carrega gato, velas e chamas de humor. Ao trocar de andar, só as novas tiras são solicitadas; o cache do Palco reutiliza o que já carregou e o primeiro uso continua podendo carregar efeitos excepcionais. A lista já reconhece os pedregulhos novos do PR de combate, se seus metadados estiverem presentes, sem depender dele para funcionar.

A música usa OGG/Opus a 64 kbps quando o navegador indica suporte. HTTP, rede ou erro de decodificação tentam o MP3 existente; navegadores sem suporte vão direto ao MP3. O ganho inicial, a mixagem, o volume escolhido e a partitura permanecem os atuais.

As novas versões foram convertidas das trilhas autorais atuais, preservando-as. Os MP3 não foram regravados. `python3 scripts/musica/gerar.py --opus-existentes` reproduz esta entrega; `--opus` sintetiza OGG do WAV original, e a execução normal gera os dois formatos. FFmpeg precisa de libopus e libmp3lame.

Testes em `fixtures/testar_flashcards_desempenho.mjs`, incluídos em npm test: grupos por família, ausência das outras famílias, cache sem duplicata, seleção de variantes, Opus preferido, fallback por HTTP/decode, navegador antigo e falha total.

Playwright em 1400×860 e 390×844: 21 tiras no primeiro andar (em vez das 57 da base), Opus efetivamente decodificado no computador e MP3 decodificado no celular quando OGG foi simulado ausente. Capturas em `capturas/desempenho-14-10/`; a interface não muda visualmente neste bloco. As 14 faixas passaram de 6.162.898 para 4.117.648 bytes (33,2% menos). FFprobe conferiu as 14 faixas e equivalência de duração com os MP3.

Validação: npx tsc -b, npm test e build. Sem SQL, alteração de conteúdo médico, plano ou dados de usuários.
