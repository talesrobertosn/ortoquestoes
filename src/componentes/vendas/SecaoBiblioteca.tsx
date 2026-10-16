import { useEffect, useState } from 'react'
import { carregarIndiceBiblioteca } from '../../biblioteca/conteudo'
import type { ResumoCapitulo } from '../../biblioteca/tipos'
import { corDaArea } from '../../dados/coresAreas'
import { href } from '../../util/rotas'
import { Icone } from '../Icone'
import { ChamaPixel } from '../ChamaPixel'

/** Como cada resumo é feito: a engenharia reversa, do que caiu para o texto. */
const COMO = [
  { titulo: 'Primeiro, as provas', texto: 'Antes de escrever uma linha, levantamos todas as questões oficiais sobre o capítulo: o que perguntaram, em que prova e ano, qual era a armadilha.' },
  { titulo: 'Depois, o texto na ordem do que cai', texto: 'O resumo segue a cobrança, não o índice do livro. O que mais cai vem primeiro e com mais profundidade, sem cortar os fundamentos que explicam o porquê.' },
  { titulo: 'No meio do texto, o que já caiu', texto: 'Cada ponto cobrado mostra a prova e o ano, como a banca perguntou e onde ela tenta pegar. Quando o gabarito oficial diverge do livro, um alerta explica as duas posições.' },
]

/** Seção "Biblioteca de resumos" da página de vendas (pedido do Tales, 16/10/2026): aberta para todos, explicada por inteiro. */
export function SecaoBiblioteca() {
  const [capitulos, definir] = useState<ResumoCapitulo[]>([])
  useEffect(() => { carregarIndiceBiblioteca().then((i) => definir(i.capitulos)).catch(() => undefined) }, [])
  return (
    <section className="vd-secao vd-bib" aria-labelledby="vd-titulo-bib">
      <header className="vd-cabeca" data-revelar>
        <p className="vd-sobre">Biblioteca de resumos · aberta para todos</p>
        <h2 id="vd-titulo-bib">O livro de referência, <em>na ordem em que a prova cobra.</em></h2>
        <p>Capítulos dos livros da bibliografia reescritos em português por quem estudou cada questão que já caiu. Não é um resumo qualquer: é engenharia reversa da banca, para você ler sabendo o que procurar.</p>
      </header>

      <div className="vd-bib__grade">
        <ol className="vd-bib__passos">
          {COMO.map((c, i) => (
            <li key={c.titulo} data-revelar><span>{i + 1}</span><div><h3>{c.titulo}</h3><p>{c.texto}</p></div></li>
          ))}
        </ol>

        {/* O cartão como ele aparece no leitor (exemplo real do resumo do colo do fêmur). */}
        <figure className="vd-bib__cartao" data-revelar aria-label="Exemplo do cartão de questão dentro do resumo">
          <p className="vd-bib__texto">Na via lateral direta de Hardinge, o limite proximal é o <b>nervo glúteo superior</b>, que corre entre o glúteo médio e o mínimo; o risco aumenta quando a divisão do músculo passa de <b>cerca de 5 cm acima do trocânter</b>.</p>
          <div className="vd-bib__questao">
            <p className="vd-bib__selo">Já caiu: TEOT 2024</p>
            <p className="vd-bib__conceito">Na via de Hardinge, dissecar mais de 3 a 5 cm acima do trocânter lesa o nervo glúteo superior.</p>
            <p className="vd-bib__como"><strong>Como isso cai na prova:</strong> uma questão de anatomia cirúrgica pura; a distância é a pista.</p>
            <p className="vd-bib__armadilha"><strong>Armadilha:</strong> marcar o ciático, que é o nervo em risco na via posterior.</p>
          </div>
          <figcaption>Assim fica cada ponto cobrado, no meio do texto.</figcaption>
        </figure>
      </div>

      <div className="vd-bib__estudo" data-revelar>
        <div>
          <h3>Como usar para estudar</h3>
          <ul className="vd-lista">
            <li><Icone nome="certo" tamanho={15} /> <span><strong>Leia antes das questões.</strong> No cronograma, o resumo do tema do dia aparece antes do treino: você chega às questões sabendo o que a banca procura.</span></li>
            <li><Icone nome="certo" tamanho={15} /> <span><strong>Só os temas que mais caem.</strong> Os capítulos entram na ordem da cobrança das provas, sem tempo perdido com o que não cai.</span></li>
            <li><Icone nome="certo" tamanho={15} /> <span><strong>Um e-book de verdade.</strong> Destaque em cinco cores, notas, claro, sépia ou escuro, letra, modo páginas e busca, salvos na sua conta em qualquer aparelho.</span></li>
            <li><Icone nome="certo" tamanho={15} /> <span><strong>O que pode cair também.</strong> Os OrtoQuestões Simulados do tema aparecem no texto, no padrão da prova, para treinar o mesmo ponto por outro ângulo.</span></li>
          </ul>
        </div>
        {capitulos.length > 0 && <div className="vd-bib__estante" aria-label="Resumos publicados">
          <p className="vd-bib__estante-titulo">Já na estante <small>novos toda semana</small></p>
          <ul>{capitulos.map((c) => <li key={c.id} style={{ ['--vd-area' as string]: corDaArea(c.especialidade) }}><a href={href(`/resumos/${c.id}`)}><i aria-hidden="true" /><span>{c.titulo}</span><small>~{c.minutos} min</small></a></li>)}</ul>
        </div>}
      </div>

      <div className="vd-bib__acao" data-revelar>
        <span className="vd-bib__botao-fogo">
          <ChamaPixel altura={34} lados={12} forca={0.8} raio={28} />
          <a className="botao botao--principal botao--grande" href={href('/resumos')}><Icone nome="livro" tamanho={18} /> Abrir a Biblioteca</a>
        </span>
        <p className="vd-nota">Aberta para todos, sem precisar de conta. Os resumos são texto autoral a partir dos capítulos citados; não substituem a leitura do original.</p>
      </div>
    </section>
  )
}
