import { SITE } from '../config'
import { Icone } from '../componentes/Icone'
import { href } from '../util/rotas'
import '../estilos/paginas/DireitosAutorais.css'

/**
 * Direitos autorais e retirada de conteúdo (/direitos-autorais), 13/11/2026, pedido do Tales.
 * O canal de retirada para titulares de direitos previsto nos Termos (cláusulas 5.4 e 5.5): como o site usa as
 * obras de referência e como pedir correção ou retirada. O pedido vai pelo suporte, com o motivo "direitos"
 * (src/conta/suporte.ts), ou pelo e-mail. Tom do Tales para mensagens em nome dele: gentil, formal e acolhedor.
 */
const ASSUNTO = '[Direitos autorais] Pedido de correção ou retirada de conteúdo'

export function DireitosAutorais() {
  const nome = SITE.nome
  const email = `mailto:${SITE.contato}?subject=${encodeURIComponent(ASSUNTO)}`
  return <article className="limite-leitura empilha termos-pagina da">
    <header>
      <p className="meta">DIREITOS AUTORAIS · RETIRADA DE CONTEÚDO</p>
      <h1>Direitos autorais e retirada de conteúdo</h1>
      <p className="texto-2">
        O {nome} existe para ajudar quem estuda ortopedia, e isso só é possível graças aos autores, editoras e bancas
        que produzem o conhecimento em que nos apoiamos. Respeitamos esse trabalho. Se você é titular de direitos sobre
        algum conteúdo e entende que ele aparece aqui de forma indevida, agradecemos desde já por nos avisar: o pedido é
        atendido com prioridade.
      </p>
    </header>

    <section className="da-pedido" aria-labelledby="da-pedido-titulo">
      <div className="da-pedido__texto">
        <h2 id="da-pedido-titulo">Pedir correção ou retirada</h2>
        <p>Assim que o pedido chega, o conteúdo indicado sai do ar de forma preventiva enquanto analisamos, e a resposta vai para o seu e-mail.</p>
      </div>
      <div className="da-pedido__acoes">
        <a className="botao botao--principal" href={href('/contato?assunto=direitos-autorais')}><Icone nome="correio" tamanho={18} /> Enviar pedido</a>
        <a className="botao" href={email}>Escrever para <span className="numerico">{SITE.contato}</span></a>
      </div>
    </section>

    <section aria-labelledby="da-como">
      <h2 id="da-como">O que ajuda incluir no pedido</h2>
      <ol className="da-passos">
        <li><span className="px-numero" aria-hidden="true">1</span><div><strong>A obra.</strong> Título, edição, autor ou editora e, se possível, o capítulo ou a página.</div></li>
        <li><span className="px-numero" aria-hidden="true">2</span><div><strong>Onde ela aparece no site.</strong> O endereço da página ou o número da questão (aparece no topo de cada questão); um print também ajuda.</div></li>
        <li><span className="px-numero" aria-hidden="true">3</span><div><strong>Quem pede.</strong> Seu nome e se você é o titular dos direitos ou fala em nome dele, como editora, autor ou representante.</div></li>
      </ol>
      <p className="texto-2">Não é preciso nenhum formulário especial: uma mensagem simples com essas informações basta. Se faltar algo, pedimos com gentileza por e-mail.</p>
    </section>

    <section aria-labelledby="da-uso">
      <h2 id="da-uso">Como usamos as obras de referência</h2>
      <ul className="da-lista">
        <li><strong>Textos próprios.</strong> Comentários, resumos e flashcards são escritos pelo {nome}, explicando o conteúdo com as nossas palavras.</li>
        <li><strong>Fonte em cada fato.</strong> As obras são citadas com autor, edição, capítulo e página, para que quem estuda possa conferir e voltar ao livro. Trechos reproduzidos são curtos e sempre identificados, na medida da finalidade de estudo, crítica ou explicação (artigo 46 da Lei nº 9.610/1998).</li>
        <li><strong>Figuras com a fonte na legenda.</strong> Quando uma figura de outra obra ajuda a explicar um ponto, ela aparece com a referência completa, como ilustração do ensino.</li>
        <li><strong>Questões de provas.</strong> As questões de provas já aplicadas pertencem às respectivas bancas e instituições; o {nome} não reivindica direitos sobre elas.</li>
        <li><strong>Nenhuma obra é vendida aqui.</strong> Os livros citados pertencem aos seus autores e editoras, e recomendamos sempre a leitura da obra original.</li>
      </ul>
    </section>

    <section aria-labelledby="da-depois">
      <h2 id="da-depois">O que acontece depois</h2>
      <ul className="da-lista">
        <li>Confirmamos o recebimento e retiramos o conteúdo indicado de forma preventiva.</li>
        <li>Analisamos o pedido de boa-fé e respondemos por e-mail, em geral em até 5 dias.</li>
        <li>Quando for o caso, o conteúdo é corrigido, reescrito ou substituído, ou continua fora do ar.</li>
      </ul>
      <p className="texto-2">
        Este canal complementa a cláusula 5.5 dos <a href={href('/termos')}>Termos de Uso e Privacidade</a>. Para
        outros assuntos, como erro em questão, acesso ou assinatura, use o <a href={href('/contato')}>suporte</a>.
      </p>
    </section>
  </article>
}
