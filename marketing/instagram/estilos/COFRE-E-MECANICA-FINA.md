# Cofre e Mecânica fina — modelos aprovados
Aprovados por Tales em 11/10/2026 como possibilidades do arsenal, não como padrão obrigatório para todos os posts. Orientação para Claude, Codex e demais agentes.

## Escolher pela lógica da questão
| Modelo | Uso | Referência executável |
|---|---|---|
| Cofre de duas chaves | Duas identificações ou duas condições que precisam coincidir; pares nervo/vaso, estrutura/função | [cofre-duas-chaves/modelo.html](cofre-duas-chaves/modelo.html) |
| Mecânica fina / Relojoaria anatômica | Identificação por imagem e relações precisas: origem, inserção, trajeto, posição ou função | [mecanica-fina/modelo.html](mecanica-fina/modelo.html) |

Não forçar a metáfora quando ela não ajuda a resolver a questão. Alternar com os demais estilos e consultar o histórico. Os exemplos contêm questões reais já entregues: servem para estudar acabamento, não para repetir automaticamente o conteúdo. Aprovação estética não equivale a revisão médica ou confirmação de postagem.

## Cofre de duas chaves
- Feed: seis PNGs individuais, 1080×1350.
- Verde-noite, grafite, dourado fosco, porta de cofre e dois seletores circulares em CSS, luz e volume discretos, moldura ampla e arredondada.
- A imagem original fica dentro do cofre, preservada e legível. A porta não pode esconder informação necessária no slide da pergunta.
- Sequência: gancho sem gabarito → questão integral e imagem → duas etapas do raciocínio → combinação correta e cada distrator → como a questão dos Simulados foi construída → comentário ilustrativo e chamada.
- Referência: ombro-cotovelo-0636, radial + braquial profunda. Duas chaves correspondem aos dois componentes exigidos pela questão.
- Seletores devem manter proporção circular, com flex-shrink:0; nunca comprimir a geometria para encaixar texto.

## Mecânica fina / Relojoaria anatômica

> **Aposentado em 27/10/2026, a pedido do Tales** ("nunca mais usar esse tema, já foi usado tipo 8 vezes"). Fica só como registro; não usar em post novo.
- Stories: seis PNGs individuais, 1080×1920; conteúdo essencial entre y=250 e y=1700, margem lateral preferencial de 80 px.
- Azul-petróleo como variação temática aprovada, prata e dourado; marca oficial preservada. Caixa de instrumento de precisão em CSS, cantos arredondados e mostradores discretos.
- Referência principal aprovada: mão, mao-1644, origem dos lumbricais. A primeira versão de coluna foi substituída a pedido do dono; usar a versão de mão como referência final deste conjunto.
- Sequência: gancho “onde começa?” → questão integral e alternativas → identificar e seguir a estrutura → resposta e por que as outras estão erradas → engenharia reversa dos Simulados → comentário ilustrativo e “Questão grátis todo dia”.
- O tema pode migrar para outros segmentos. Trocar todo o raciocínio, a imagem, a transcrição e o comentário do celular; não apenas o título.
- Engrenagens e mostradores são decoração abstrata. Nunca devem simular músculos, tendões, ossos, nervos ou relações anatômicas.

## Padrão de acabamento a preservar
1. Plus Jakarta Sans nos títulos, Inter no corpo; símbolo SVG oficial e “Orto Questões” por extenso.
2. Hierarquia clara: uma ideia principal por tela, contraste alto, espaço entre título, imagem e explicação. Profissional, criativo, sem aparência de formulário administrativo.
3. Cantos generosamente arredondados, luz e textura sutis. Evitar caixas pequenas empilhadas, bordas rígidas e decoração que dispute atenção com a imagem.
4. Imagens médicas exclusivamente originais do acervo. Sem anatomia gerada ou redesenhada. Não adicionar setas; preservar as marcações que já fazem parte da questão.
5. Mockup de celular pode reproduzir trechos reais do comentário, com “Tela ilustrativa” e indicação quando adaptados. Não inventar métricas, funcionalidades ou depoimentos.
6. CTA com conta gratuita e limite diário renovado; não prometer acesso ilimitado, aprovação ou vínculo com bancas. Stories sem figurinhas.
7. Na divulgação dos Simulados, explicar concretamente: estudo das provas → bibliografia → questão autoral → comentário da correta e de cada errada. Não atribuir prova/ano oficial a questão autoral.
8. Legenda curta quando houver feed, sem URL, até quatro hashtags; entregar como texto junto dos arquivos.

## Como reutilizar, Claude
Leia primeiro docs/marketing/orientacoes.md e os guias atuais. Consulte publicadas.md e historico.json; escolha questão nova e confirme simulado=true quando for anunciada como Simulados. Leia o comentário completo e a situação de revisão. A mao-1644 estava com conferido=false na criação; não converter a aprovação visual em selo médico.

Copie o modelo escolhido para marketing/instagram/posts/AAAA-MM-DD-<slug>/post.html. A profundidade das pastas é equivalente, portanto os caminhos relativos de fontes e imagens continuam válidos. Substitua todas as referências à questão anterior, inclusive data-question, mockup e fontes. Mantenha apenas as seis seções desejadas.

Gere:
```bash
node marketing/instagram/gerar.mjs marketing/instagram/posts/AAAA-MM-DD-<slug>/post.html
```

Faça duas revisões: (1) transcrição, gabarito, raciocínio, alternativas e promessas do produto; (2) abra cada PNG final e confira legibilidade no celular, cortes, sobreposições, imagem inteira, contraste, rodapé, áreas seguras e texto dentro do mockup. Se corrigir, renderize e reveja a tela alterada. Não declarar revisão apenas porque o HTML gerou sem erro.

Entregue seis PNGs separados, nunca só mosaico. Registre o uso no histórico e o ID como entregue, sem afirmar publicação no Instagram. Estes modelos estão disponíveis por cópia direta; não presumir que o sorteador já reconhece seus nomes.
