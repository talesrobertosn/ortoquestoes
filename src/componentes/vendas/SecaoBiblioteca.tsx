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

/** Quantos capítulos a estante mostra aqui; o resto fica a um clique, na Biblioteca. */
const NA_ESTANTE = 8

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
            <li key={c.titulo} data-revelar><span className="px-numero">{i + 1}</span><div><h3>{c.titulo}</h3><p>{c.texto}</p></div></li>
          ))}
        </ol>

        {/* O cartão como ele aparece no leitor (pedido do Tales, 30/10/2026: um resumo do Rockwood como exemplo).
            Trecho real do resumo do colo do fêmur; as cinco provas são as questões centrais desse bloco. */}
        <a className="vd-bib__cartao" href={href('/resumos/rockwood10-53-colo-femur?bloco=fratura-desviada-no-jovem-38a46d78')} data-revelar aria-label="Exemplo real: o índice de Garden no resumo do colo do fêmur, do Rockwood. Abrir o trecho">
          <span className="vd-bib__fonte">Rockwood adulto · Cap. 53 · Fratura do colo do fêmur</span>
          <span className="vd-bib__texto">O <b>índice de alinhamento de Garden</b> compara as trabéculas compressivas da cabeça com a cortical medial da diáfise: <b>cerca de 160° no AP</b> e <b>180° no perfil</b>. Na radioscopia é mais fácil usar o <b>sinal de Lowell</b>, as curvas suaves em S na junção da cabeça com o colo.</span>
          <span className="vd-bib__questao">
            <span className="vd-bib__selo">Já caiu 5 vezes: TARO 2013, 2021, 2022 e 2026 · ENARE R4 2024</span>
            <span className="vd-bib__conceito">Índice de Garden: cerca de 160° no AP e 180° no perfil; sinal de Lowell: curvas em S na junção cabeça-colo.</span>
            <span className="vd-bib__como"><strong>Como isso cai na prova:</strong> as alternativas trocam os valores do AP e do perfil e oferecem 125° a 135°, que é o ângulo cervicodiafisário, não o índice.</span>
            <span className="vd-bib__armadilha"><strong>Armadilha:</strong> inverter AP e perfil (180° e 160°).</span>
          </span>
          <span className="vd-bib__legenda">Assim fica cada ponto cobrado, no meio do texto. <b>Ler este trecho <Icone nome="direita" tamanho={13} /></b></span>
        </a>
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
          <p className="vd-bib__estante-titulo">Já na estante <small>{capitulos.length} resumos · novos toda semana</small></p>
          <ul>{capitulos.slice(0, NA_ESTANTE).map((c) => <li key={c.id} style={{ ['--vd-area' as string]: corDaArea(c.especialidade) }}><a href={href(`/resumos/${c.id}`)}><i aria-hidden="true" /><span>{c.titulo}</span><small>~{c.minutos} min</small></a></li>)}</ul>
          {capitulos.length > NA_ESTANTE && <a className="vd-link vd-bib__todos" href={href('/resumos')}>Ver a estante inteira <Icone nome="direita" tamanho={14} /></a>}
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
