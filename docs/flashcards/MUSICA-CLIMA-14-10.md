# Música e clima — 14/10/2026

## Comportamento

- **38:** chuva/tempestade ou Leitura tranquila aplicam passa-baixas suave em 1600 Hz; névoa usa 3600 Hz. Ao abrir o céu, a trilha volta ao timbre normal. Não altera o volume escolhido.
- **Glória:** carrega `biblioteca-coral` apenas quando necessário. É uma camada vocal sintetizada, com a mesma progressão, 24 compassos, 88 BPM e duração da Biblioteca. Entra na posição atual do laço principal, com fade. Sai ao perder Glória, ativar Leitura tranquila, trocar de modo ou sair. Não duplica fontes em mudanças repetidas. Passa pelos controles de música e mestre, inclusive silenciar.
- **75:** Passeio ao Sol, composição própria de 62,6 s em Sol maior, com violão de nylon sintetizado, flauta, piano e celesta. Campo, jardim e treino usam a faixa quando a trilha de chefe/elite não tem precedência. Preload troca floresta por passeio, mantendo o número de faixas iniciais. MP3 de reserva e OGG/Opus.
- **82:** o renderizador fecha os últimos 14 ms de sala sem mudar o tempo/duração. Após decodificação no navegador, a mesma janela corrige o resíduo dos codecs: o último valor coincide com o primeiro. Apenas sala recebe esse ajuste; temas existentes restantes não são regravados.

Todo som é composto e sintetizado por código em `scripts/musica/`, sem amostras externas. O mestre continua no fim da cadeia, na escala 2, com padrão de 30%; música permanece no ganho 0,3 introduzido pelo Menu. Nenhuma mudança em planos, conteúdo médico, motor de combate ou progresso de contas. Sem SQL.

## Validação

- `npx tsc -b`, `npm test`, build.
- Fixture de desempenho: mix por clima/Leitura tranquila, posição no laço e emenda preservando a duração e o prefixo do sinal; testes anteriores de efeitos/Opus continuam.
- `node scripts/musica/testar_mix.mjs` com o servidor local `VITE_SUPABASE_URL=sem npx vite --port 5199`: 1400×860 e 390×844. Instrumentação real do Web Audio conferiu coral ausente no começo, uma fonte na Glória, offset positivo, fade/saída na chuva, restauração e emenda zero no buffer de sala usado pelo player. Nenhum erro JavaScript.
- Análise com ffmpeg/numpy: sala mantém 45,714 s. Salto entre extremos do MP3 passou de 0,225220 para 0,022608 no arquivo e zero no buffer ajustado. OGG codificado: 0,007846 antes do ajuste do player. Pico abaixo de 0,98 nos arquivos analisados. Duração declarada de Biblioteca e coral é igual.
- Capturas: `capturas/musica-14-10/`. Capturam a interface da Glória; a validação sonora está na instrumentação do player, não na imagem.

## Reprodução

`python scripts/musica/gerar.py passeio biblioteca-coral sala` gera somente as três faixas deste bloco e atualiza o índice. `node scripts/musica/testar_mix.mjs` usa Chromium local (`CHROMIUM_BIN` pode selecionar executável); os testes são separados do npm test por exigirem navegador instalado.

## Estado e sequência

O reparo do Menu #257 já está publicado (deploy 38648064258). Este bloco ainda depende do merge e do deploy próprios. Ao continuar, registrar o PR e o resultado efetivo da publicação; não presumir pelo estado dos arquivos locais.

Próximas pendências permitidas: ambientação sazonal, cenários adicionais e aparência opcional. Monstros novos seguem em pausa. Medição de 50 FPS em aparelho físico continua pendente; o benchmark disponível é sintético.
