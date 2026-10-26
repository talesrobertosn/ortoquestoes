# Banco anatômico do Atlas 3D

Origem, inserção, inervação, ação, função de ligamentos, trajeto de nervos e importância ortopédica
das estruturas do atlas. A cobertura atual está em [COBERTURA-ANATOMIA.md](COBERTURA-ANATOMIA.md), gerado a cada montagem.

## Fonte e direitos

- Referência: Thompson JC. *Netter Atlas de Anatomia Ortopédica*. 2ª ed. Elsevier, 2012 (PDF local, fora do git,
  em `~/OrtoQuestoes-Biblioteca/livros`).
- O livro é usado como fonte de **fatos anatômicos**. Cada registro foi escrito com redação própria, sem copiar
  tabelas, textos ou pranchas. Nenhuma imagem do livro entra no site nem no repositório.
- Os textos extraídos e as páginas renderizadas para leitura ficam em `~/OrtoQuestoes-Biblioteca/netter-texto` e
  `netter-paginas`, também fora do git.
- As páginas citadas em `fonte.p` são as **posições no PDF local** (o número que `pdftoppm -f` usa), não a
  paginação impressa. Servem para auditoria interna; a ficha mostra só o nome do livro.

## Como foi feito

1. `pdftotext -enc UTF-8 -layout` no PDF, para mapear capítulos e achar as seções de músculos, nervos e articulações.
2. As tabelas de músculos e de ligamentos do PDF são imagens ou têm colunas que o texto embaralha. Por isso foram
   lidas na página renderizada (`pdftoppm -r 90..115`), uma a uma.
3. Cada fato virou um registro num lote por região, em `scripts/atlas3d/anatomia/NN-regiao.json`.
4. O registro é ligado às malhas reais do modelo pelos ids estáveis do catálogo, sem o sufixo de lado; o lado vem
   da estrutura clicada. Os marcos 3D de origem e inserção usam só pontos que existem em `public/atlas3d/v1/pontos.json`
   (`"osso:Nome do marco"`) ou o osso inteiro (`"o"`). Nenhuma coordenada é inventada. Sem marco validado, a ficha
   mostra o texto e avisa que a marcação no modelo ainda não está disponível.
5. `node scripts/atlas3d/montar_anatomia.mjs` valida tudo e gera `public/atlas3d/v1/anatomia.json` e o relatório
   de cobertura. O `npm test` roda a mesma checagem (`--checar`) e falha se o arquivo publicado estiver desatualizado.

## Esquema do registro

| Campo | Para quê |
|---|---|
| `chave` | identificador estável do registro (kebab-case) |
| `tipo` | `musculo`, `nervo`, `ligamento` ou `arteria` (o esquema aceita osso, veia e fáscia para lotes futuros) |
| `ids` | malhas do modelo, sem `_l`/`_r` |
| `origem`, `insercao` | `{ t: texto, m: ["osso:Marco"], o: ["osso", "C7-T12", "costelas:3-5"] }` |
| `nervos` | chaves dos nervos que inervam (o nervo ganha `inerva` derivado) |
| `acao`, `funcao`, `restringe`, `articulacao` | músculo e ligamento |
| `raizes`, `trajeto`, `sensitivo` | nervo |
| `trajeto`, `ramos`, `irriga` | artéria |
| `relacoes`, `ver` | texto de relações e chaves de estruturas ligadas (navegáveis na ficha); o script cria a relação de volta (`citado`) |
| `clinica` | importância ortopédica, separada do fato anatômico |
| `fonte` | `[{ l: "netter-ao2", p: [páginas do PDF] }]` |
| `status` | `verificado`, `pendente` ou `conflito`; `conflito` exige `notas` explicando a divergência |

## O que a validação barra

- id que não existe no catálogo ou que é de outra camada (músculo ligado a malha de nervo etc.)
- a mesma malha em dois registros (duplicação)
- nervo citado sem registro, relação para chave inexistente ou para si mesmo, relação repetida
- marco que não existe em `pontos.json`, osso inexistente nos atalhos
- campo que não cabe no tipo (nervo com inserção, ligamento com nervos), fixação sem texto
- nome fora do padrão (português, inicial maiúscula), registro sem fonte ou sem página, conflito sem nota

## Na interface

- A ficha de músculo, nervo e ligamento mostra o quadro curto (origem, inserção, inervação, ação ou função) e a
  importância ortopédica; trajeto, músculos inervados e relações abrem em seções.
- Os botões Origem, Inserção, Inervação e Relacionadas acendem no modelo, cada um com a cor do texto. "Só as
  relações" isola a estrutura com o que se liga a ela.
- Na ficha do osso, a aba Inserções lista o que se origina e se insere ali (nos ossos longos, só na faixa clicada)
  e mostra os pontos no osso.
- Os nomes citados levam à estrutura, respeitando as regras do plano: visitante recebe o convite da conta grátis;
  camadas de assinante aparecem por alguns segundos antes do convite.
- O banco (cerca de 210 KB) só é baixado quando o atlas abre, junto com os pontos do modelo. Trocar a ficha não
  reconstrói a cena: o motor troca só a camada de destaques (`Motor.mostrarRelacoes`).

## Visualizações prontas

`src/atlas3d/dados/presets.ts`: conjuntos por região (manguito rotador, espaços do ombro, canto posterolateral,
compartimentos da perna, colateral lateral do tornozelo etc.), feitos de chaves do banco. Ao abrir, o atlas vai para a
região, isola o conjunto (o resto fica translúcido) e pinta cada item com uma cor da legenda. Só liga as camadas que a
pessoa já pode usar; o que está em camada de outro plano aparece com cadeado na legenda, sem abrir convite sozinho.
A montagem valida que toda chave citada existe.

## Para ampliar

- Outra fonte: acrescente a chave em `FONTES` no script e use `fonte: [{ l: "chave", p: [...] }]`. Fatos que
  divergirem entre fontes ficam `conflito`, com as duas versões na nota.
- Marcos novos (áreas de inserção mais precisas): entram primeiro em `pontos.json` com conferência visual; o lote
  passa a citá-los em `m`.
- Pendências atuais: ver a seção "Pendentes e conflitos" do relatório de cobertura. Os conflitos foram procurados
  nos outros livros locais (capítulos do Green e Pardini); o capítulo de plexo braquial confirma que o peitoral medial
  sai do fascículo medial, mas nenhum traz as raízes nem resolve os demais. Ficam em revisão até uma segunda fonte.
