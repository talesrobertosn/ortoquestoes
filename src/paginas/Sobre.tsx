import { useMemo } from 'react'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { primeiroNome } from '../componentes/Cabecalho'
import { usarConta } from '../conta/ContextoConta'
import { EXIGIR_CONTA_PARA_QUESTOES, fraseGratis } from '../config'
import { usarIndice } from '../dados/usarIndice'
import { Simbolo } from '../marca/Simbolo'
import { href } from '../util/rotas'
import '../estilos/paginas/Sobre.css'

/*
 * O projeto (/sobre e /projeto). Refeito do zero em 19/10/2026 porque, no tema claro, a versão
 * anterior virou uma parede de letra miúda cinza em caixas dentro de caixas. Agora é leitura
 * primeiro: texto corrido grande e na cor cheia, poucas superfícies, uma ideia por seção.
 * Regra do Tales (19/10/2026): a página não diz a profissão nem a etapa dele; sobre ele, só o nome.
 */

interface Recurso { titulo: string; texto: string; destino: string; icone: NomeIcone; assinante?: boolean; beta?: boolean }

/* Só recursos reais, conferidos no menu. No máximo dez, em três grupos curtos. */
const GRUPOS: { titulo: string; lide: string; itens: Recurso[] }[] = [
  {
    titulo: 'Estudar',
    lide: 'Questão de prova e o que errou de volta na hora certa.',
    itens: [
      { titulo: 'Treinar', texto: 'Provas oficiais e OrtoQuestões Simulados, por prova, tema e ano.', destino: '/treinar', icone: 'livro' },
      { titulo: 'Revisar hoje', texto: 'O que você errou ou acertou na dúvida volta no dia certo.', destino: '/revisao', icone: 'reiniciar' },
      { titulo: 'Caderno de erros e favoritas', texto: 'O que errou e o que marcou com estrela, pronto para refazer.', destino: '/erros', icone: 'estrela' },
      { titulo: 'Flashcards e o Torneio', texto: 'Cartões com revisão espaçada, calmos ou em forma de jogo.', destino: '/flashcards', icone: 'raio', beta: true },
    ],
  },
  {
    titulo: 'Rumo à prova',
    lide: 'Para quem tem data marcada.',
    itens: [
      { titulo: 'Cronograma até a prova', texto: 'Você diz a data e o tempo por dia; cada dia chega decidido.', destino: '/cronograma', icone: 'rota', assinante: true },
      { titulo: 'Temas que mais caem', texto: 'A contagem dos assuntos nas provas oficiais, área por área.', destino: '/temas-que-mais-caem', icone: 'grafico', assinante: true },
      { titulo: 'Biblioteca de Resumos', texto: 'Os temas que mais caem, com questões no meio do texto.', destino: '/resumos', icone: 'lapis', beta: true },
      { titulo: 'Simulado Nacional', texto: 'Uma prova por mês, no tempo, com nota e posição.', destino: '/simulado-nacional', icone: 'alvo', assinante: true },
    ],
  },
  {
    titulo: 'Acompanhar',
    lide: 'Onde você está crescendo.',
    itens: [
      { titulo: 'Desempenho', texto: 'Acerto por tema e por prova, e a evolução nas semanas.', destino: '/dados', icone: 'grafico' },
      { titulo: 'Ranking, conquistas e ligas', texto: 'Sua posição na semana, emblemas e a liga do seu serviço.', destino: '/ranking', icone: 'trofeu' },
    ],
  },
]

const BIBLIOGRAFIA = [
  "Campbell's Operative Orthopaedics",
  'Rockwood and Green',
  "Tachdjian's Pediatric Orthopaedics",
  'Lovell and Winter',
  "Green's Operative Hand Surgery",
  'The Adult Hip',
  'Hebert',
  'a classificação de tumores da OMS',
  'AO Surgery Reference',
  'POSNA Study Guide',
]

/*
 * Os números do acervo, contados sobre o mesmo conjunto. O índice traz também as cópias de
 * questões repetidas entre provas (marcadas com `dup`); `indice.total` já as exclui. Contar as
 * comentadas sobre todos os itens dava "7.214 comentadas" para "6.865 questões".
 */
function contarAcervo(questoes: { c: 0 | 1; dup?: string }[]) {
  let comentadas = 0
  for (const q of questoes) if (!q.dup && q.c === 1) comentadas++
  return comentadas
}

export function Sobre() {
  const { indice } = usarIndice()
  const nome = primeiroNome(usarConta().sessao?.user.user_metadata?.nome)
  const comentadas = useMemo(() => contarAcervo(indice?.questoes ?? []), [indice])
  const temAcervo = Boolean(indice && indice.total > 0)

  return (
    <article className="sb-pagina">
      <section className="sb-topo" aria-labelledby="sb-titulo">
        <div className="sb-topo__texto">
          <p className="tr-heroi__selo">O projeto</p>
          <h1 id="sb-titulo">{nome ? <>{nome}, o Orto Questões está de cara nova.</> : 'O Orto Questões está de cara nova.'}</h1>
          <p className="sb-topo__lide">
            O site ganhou um visual novo, mais claro e mais fácil de ler. O que você já usava continua no mesmo
            lugar, e chegou bastante coisa nova. Aqui está tudo o que tem hoje.
          </p>
          <a className="botao sb-botao-ouro" href={href('/treinar')}>
            <Icone nome="livro" tamanho={18} /> Montar uma sessão
          </a>
        </div>
        <div className="sb-topo__marca" aria-hidden="true"><Simbolo tamanho={176} /></div>
      </section>

      <section className="sb-secao" aria-labelledby="sb-tem-titulo">
        <header className="sb-cabeca">
          <h2 id="sb-tem-titulo">O que tem no site</h2>
          <p>Toque em um item para ir direto. O que diz “Assinante” faz parte dos planos; o resto é de todo mundo com conta.</p>
        </header>
        <div className="sb-grupos">
          {GRUPOS.map((g, i) => (
            <section key={g.titulo} className="sb-grupo" aria-labelledby={`sb-grupo-${i}`}>
              <header className="sb-grupo__cabeca">
                <span className="px-numero" aria-hidden="true">{i + 1}</span>
                <div>
                  <h3 id={`sb-grupo-${i}`}>{g.titulo}</h3>
                  <p>{g.lide}</p>
                </div>
              </header>
              <ul className="sb-recursos">
                {g.itens.map((r) => (
                  <li key={r.titulo}>
                    <a className="sb-recurso" href={href(r.destino)}>
                      <span className="sb-recurso__icone" aria-hidden="true"><Icone nome={r.icone} tamanho={20} /></span>
                      <span className="sb-recurso__texto">
                        <span className="sb-recurso__nome">
                          {r.titulo}
                          {r.beta && <span className="sb-tag sb-tag--beta">Beta</span>}
                          {r.assinante && <span className="sb-tag">Assinante</span>}
                        </span>
                        <span className="sb-recurso__desc">{r.texto}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <section className="sb-secao" aria-labelledby="sb-comentarios-titulo">
        <header className="sb-cabeca">
          <h2 id="sb-comentarios-titulo">Como os comentários são feitos</h2>
          <p>Cada comentário é uma aula curta: o conceito por trás da questão e por que cada alternativa está certa ou errada.</p>
        </header>
        <ol className="sb-passos">
          <li>
            <span className="px-numero" aria-hidden="true">1</span>
            <h3>Parte da bibliografia</h3>
            <p>Os tratados clássicos, as classificações oficiais e os guias das sociedades que as bancas cobram.</p>
          </li>
          <li>
            <span className="px-numero" aria-hidden="true">2</span>
            <h3>Redigido com apoio de IA</h3>
            <p>A inteligência artificial ajuda a organizar e escrever a explicação. É ferramenta de escrita, não fonte.</p>
          </li>
          <li>
            <span className="px-numero" aria-hidden="true">3</span>
            <h3>Corrigido sempre</h3>
            <p>As fontes aparecem no fim, com livro e capítulo. Erro relatado é conferido e corrigido.</p>
          </li>
        </ol>
        <aside className="sb-ia" aria-labelledby="sb-ia-titulo">
          <h3 id="sb-ia-titulo"><Icone nome="alerta" tamanho={20} /> Sobre o uso de inteligência artificial</h3>
          <p>
            A IA redige parte dos textos: comentários, explicações e o enunciado de algumas questões autorais, como as dos
            OrtoQuestões Simulados. Ela escreve bem, mas <strong>pode acrescentar algo que não está na fonte</strong>, simplificar
            demais ou errar um detalhe, mesmo com tom seguro. Use o comentário como ponto de partida e <strong>confira na
            bibliografia indicada</strong> antes de levar para a prova ou para a prática. Achou algo estranho? Toque em
            “Relatar erro nesta questão” ou em “Não ajudou” no comentário: é assim que o texto é corrigido. Comentário é
            material de estudo e não substitui o livro nem a conduta do seu serviço.
          </p>
        </aside>
        <p className="sb-biblio">
          <strong>Bibliografia de referência:</strong> {BIBLIOGRAFIA.join(', ')}, entre outras.
        </p>
      </section>

      <section className="sb-secao sb-acervo" aria-labelledby="sb-acervo-titulo">
        <header className="sb-cabeca">
          <h2 id="sb-acervo-titulo">O acervo</h2>
        </header>
        <div className="sb-acervo__corpo">
          <div className="sb-acervo__texto">
            <p>
              O Orto Questões (também escrito OrtoQuestões) reúne questões de provas anteriores, como TEOT, TARO, R4 do ENARE
              e TECOC de ombro e cotovelo, organizadas por assunto, para quem se prepara para o título de especialista ou para
              a residência.
            </p>
            <p>
              As questões são transcritas dos cadernos oficiais, sem reescrever o enunciado (as do TARO estão na página pública
              da <a href="https://sbot.org.br/comissoes/sobre-a-sbot-comissao-ensino-treinamento/taro/" target="_blank" rel="noopener noreferrer">Comissão
              de Ensino e Treinamento da SBOT</a>). O gabarito é o da prova; quando a banca não publica um oficial, vem uma
              resposta justificada e sinalizada. Anuladas ficam marcadas e não contam no desempenho.
            </p>
          </div>
          {temAcervo && indice && (
            <dl className="sb-numeros" aria-label="O acervo hoje">
              <div><dt>questões</dt><dd>{indice.total.toLocaleString('pt-BR')}</dd></div>
              <div><dt>comentadas</dt><dd>{comentadas.toLocaleString('pt-BR')}</dd></div>
              <div><dt>temas</dt><dd>{indice.temas.length}</dd></div>
            </dl>
          )}
        </div>
      </section>

      <section className="sb-secao" aria-labelledby="sb-duvidas-titulo">
        <header className="sb-cabeca">
          <h2 id="sb-duvidas-titulo">Dúvidas comuns</h2>
        </header>
        <dl className="sb-duvidas">
          <div>
            <dt>Precisa pagar?</dt>
            <dd>
              {EXIGIR_CONTA_PARA_QUESTOES ? 'Para responder, crie uma conta grátis, sem cartão. ' : ''}
              {fraseGratis('sobre')} <a href={href('/assinatura')}>Veja os planos</a>.
            </dd>
          </div>
          <div>
            <dt>Onde ficam os meus dados?</dt>
            <dd>
              Respostas, revisões, favoritas e anotações ficam na sua conta, com acesso só seu, em qualquer aparelho.
              Para exportar o progresso, use o <a href={href('/dados')}>Desempenho</a>.
            </dd>
          </div>
          <div>
            <dt>Posso comentar uma questão?</dt>
            <dd>
              Pode. Toda questão tem um botão para enviar o seu comentário: o macete, a divergência entre serviços, a
              referência da banca. Ele é conferido e publicado com o seu crédito.
            </dd>
          </div>
          <div>
            <dt>Achei um erro. E agora?</dt>
            <dd>
              Na questão, toque em “Relatar erro nesta questão”. Para o resto, fale com o <a href={href('/contato')}>suporte</a>.
              Gabarito errado é pior do que questão ausente.
            </dd>
          </div>
        </dl>
      </section>

      <section className="sb-final" aria-labelledby="sb-final-titulo">
        <div>
          <h2 id="sb-final-titulo">{nome ? `Bora estudar, ${nome}?` : 'Bora estudar?'}</h2>
          <p>Dez questões cabem num intervalo. Dúvida ou sugestão, o suporte chega direto no e-mail do Tales.</p>
        </div>
        <div className="sb-final__acoes">
          <a className="botao sb-botao-ouro" href={href('/treinar')}>Montar uma sessão</a>
          <a className="sb-final__link" href={href('/contato')}>Falar com o suporte <Icone nome="direita" tamanho={16} /></a>
        </div>
      </section>
    </article>
  )
}
