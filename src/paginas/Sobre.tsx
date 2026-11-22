import { useEffect, useMemo, useState } from 'react'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { MolduraNatal } from '../natal/MolduraNatal'
import { primeiroNome } from '../componentes/Cabecalho'
import { usarConta } from '../conta/ContextoConta'
import { EXIGIR_CONTA_PARA_QUESTOES, ROTULO_SIMULADOS, fraseGratis } from '../config'
import { usarIndice } from '../dados/usarIndice'
import { Simbolo } from '../marca/Simbolo'
import { href } from '../util/rotas'
import '../estilos/paginas/Sobre.css'

/*
 * O projeto (/sobre e /projeto). Refeito em 13/11/2026 a pedido do Tales: a versão de 19/10 não separava um
 * assunto do outro. Agora cada seção é um capítulo numerado, com um sumário que acompanha a leitura (fixo ao lado
 * no computador, em faixa rolável no celular), e uma seção de avisos com a postura do projeto: sem vínculo com
 * sociedades, bancas ou editoras; conteúdo para estudo; pode conter erros; uso de IA; direitos autorais.
 * Texto prudente de propósito (pedido do Tales: "bem anti-processo"): nada de promessa absoluta, "oficial" só para
 * o que é da banca, e sem resultado garantido. Sobre o autor, só o nome: "feito por Tales Roberto".
 * Os Termos de Uso não mudam por enquanto.
 */

interface Recurso { titulo: string; texto: string; destino: string; icone: NomeIcone; assinante?: boolean; beta?: boolean }

/* Só recursos reais, conferidos no menu, em três grupos curtos. */
const GRUPOS: { titulo: string; lide: string; itens: Recurso[] }[] = [
  {
    titulo: 'Estudar',
    lide: 'Questão de prova e o que você errou de volta na hora certa.',
    itens: [
      { titulo: 'Treinar', texto: `Provas anteriores e ${ROTULO_SIMULADOS}, inclusive de cirurgia da mão, por prova, tema e ano.`, destino: '/treinar', icone: 'livro' },
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
      { titulo: 'Temas que mais caem', texto: 'A contagem dos assuntos nas provas anteriores, área por área.', destino: '/temas-que-mais-caem', icone: 'grafico', assinante: true },
      { titulo: 'Biblioteca de Resumos', texto: 'Os temas que mais caem, com questões no meio do texto.', destino: '/resumos', icone: 'lapis' },
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

/* Os capítulos da página, na ordem: o sumário e as âncoras saem daqui. */
const CAPITULOS = [
  { id: 'sb-site', titulo: 'O que tem no site' },
  { id: 'sb-comentarios', titulo: 'Como escrevemos' },
  { id: 'sb-acervo', titulo: 'O acervo' },
  { id: 'sb-avisos', titulo: 'Avisos importantes' },
  { id: 'sb-duvidas', titulo: 'Dúvidas comuns' },
] as const

/*
 * Os números do acervo, contados sobre o mesmo conjunto. O índice traz também as cópias de
 * questões repetidas entre provas (marcadas com `dup`); `indice.total` já as exclui.
 */
function contarAcervo(questoes: { c: 0 | 1; dup?: string }[]) {
  let comentadas = 0
  for (const q of questoes) if (!q.dup && q.c === 1) comentadas++
  return comentadas
}

/** O capítulo que está na tela agora, para o sumário marcar onde a pessoa está. */
function usarCapituloAtual(): string {
  const [atual, definir] = useState<string>(CAPITULOS[0].id)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const vistos = new Map<string, boolean>()
    const obs = new IntersectionObserver((entradas) => {
      for (const e of entradas) vistos.set(e.target.id, e.isIntersecting)
      const primeiro = CAPITULOS.find((c) => vistos.get(c.id))
      if (primeiro) definir(primeiro.id)
    }, { rootMargin: '-20% 0px -55% 0px' })
    for (const c of CAPITULOS) { const el = document.getElementById(c.id); if (el) obs.observe(el) }
    return () => obs.disconnect()
  }, [])
  return atual
}

/** Rola até o capítulo sem trocar a rota (o site usa o # para as páginas). */
function irPara(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' })
  el.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
}

function Sumario({ atual }: { atual: string }) {
  return (
    <nav className="sb-sumario" aria-label="Nesta página">
      <p className="sb-sumario__titulo">Nesta página</p>
      <ol>
        {CAPITULOS.map((c, i) => (
          <li key={c.id}>
            <a className="sb-sumario__link" href={`#${c.id}`} aria-current={atual === c.id ? 'location' : undefined}
              onClick={(e) => { e.preventDefault(); irPara(c.id) }}>
              <span className="sb-sumario__n" aria-hidden="true">{i + 1}</span>{c.titulo}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** Cabeça de capítulo: o número em selo dourado, a etiqueta e o título. */
function Capitulo({ n, id, etiqueta, titulo, lide, children, classe = '' }: { n: number; id: string; etiqueta: string; titulo: string; lide?: string; children: React.ReactNode; classe?: string }) {
  return (
    <section className={`sb-capitulo ${classe}`} id={id} aria-labelledby={`${id}-titulo`}>
      <header className="sb-capitulo__cabeca">
        <span className="px-numero" aria-hidden="true">{n}</span>
        <div>
          <p className="sb-capitulo__etiqueta">{etiqueta}</p>
          <h2 id={`${id}-titulo`} tabIndex={-1}>{titulo}</h2>
          {lide && <p className="sb-capitulo__lide">{lide}</p>}
        </div>
      </header>
      <div className="sb-capitulo__corpo">{children}</div>
    </section>
  )
}

interface Aviso { icone: NomeIcone; titulo: string; texto: React.ReactNode }

export function Sobre() {
  const { indice } = usarIndice()
  const nome = primeiroNome(usarConta().sessao?.user.user_metadata?.nome)
  const comentadas = useMemo(() => contarAcervo(indice?.questoes ?? []), [indice])
  const temAcervo = Boolean(indice && indice.total > 0)
  const atual = usarCapituloAtual()

  const AVISOS: Aviso[] = [
    {
      icone: 'bandeira', titulo: 'Projeto independente, sem vínculo institucional',
      texto: <>O Orto Questões é um projeto independente, feito por Tales Roberto. <strong>Não tem vínculo, parceria, patrocínio
        nem endosso</strong> da SBOT, da SBCM ou de qualquer outra sociedade de especialidade, de bancas e organizadoras de prova,
        de programas de residência ou de editoras. Os nomes de provas, sociedades e obras (como TEOT, TARO, ENARE e os livros
        citados) pertencem aos seus titulares e aparecem só para identificar o assunto e a fonte.</>,
    },
    {
      icone: 'livro', titulo: 'Conteúdo para estudo, não para conduta',
      texto: <>Questões, comentários, resumos e flashcards são <strong>material de estudo</strong> para provas. Não são orientação
        médica, não substituem a bibliografia, as diretrizes, a conduta do seu serviço nem a avaliação de um paciente. Nenhuma
        decisão clínica deve se apoiar apenas no que está aqui.</>,
    },
    {
      icone: 'alerta', titulo: 'Pode conter erros',
      texto: <>Mesmo com cuidado e correção constante, o conteúdo <strong>pode ter erros, imprecisões ou ficar desatualizado</strong>,
        por exemplo quando sai uma edição nova de um livro ou quando a banca muda um gabarito. Confira sempre na fonte indicada. Se
        encontrar algo errado, use “Relatar erro nesta questão”: é assim que o texto melhora.</>,
    },
    {
      icone: 'lapis', titulo: 'Textos gerados com inteligência artificial',
      texto: <>Parte do conteúdo é <strong>gerada ou redigida com apoio de inteligência artificial</strong>: comentários,
        resumos, flashcards e o enunciado das questões autorais. A IA escreve com tom seguro, mas pode acrescentar algo que
        não está na fonte, simplificar demais ou errar um detalhe. Nem todo texto foi conferido linha a linha por uma pessoa;
        por isso cada fato traz o livro e a página, para você conferir.</>,
    },
    {
      icone: 'cadeado', titulo: `${ROTULO_SIMULADOS} não são questões oficiais`,
      texto: <>As questões dos {ROTULO_SIMULADOS} são autorais, escritas a partir da bibliografia e do padrão de provas anteriores.
        Não foram elaboradas, revisadas nem endossadas por nenhuma banca, e não reproduzem material sigiloso ou não divulgado.</>,
    },
    {
      icone: 'copiar', titulo: 'Direitos autorais',
      texto: <>As obras citadas pertencem aos seus autores e editoras, e as questões de provas anteriores, às bancas e instituições
        que as elaboraram. Se você é titular de algum conteúdo e entende que ele aparece aqui de forma indevida, use
        o canal de <a href={href('/direitos-autorais')}>direitos autorais e retirada de conteúdo</a>: o pedido é atendido com prioridade.</>,
    },
    {
      icone: 'trofeu', titulo: 'Sem promessa de resultado',
      texto: <>O site ajuda a organizar e treinar o estudo, mas <strong>não garante aprovação nem nota</strong>. O resultado em
        qualquer prova depende de cada pessoa e de muitos fatores fora do nosso alcance.</>,
    },
  ]

  return (
    <article className="sb-pagina">
      <section className="sb-topo" aria-labelledby="sb-titulo">
        <MolduraNatal publica />
        <div className="sb-topo__texto">
          <p className="tr-heroi__selo">O projeto</p>
          <h1 id="sb-titulo">{nome ? <>{nome}, este é o Orto Questões.</> : 'Questões de ortopedia comentadas como uma aula.'}</h1>
          <p className="sb-topo__lide">
            Questões de provas anteriores e questões autorais, cada uma com um comentário que explica o conceito e todas as
            alternativas, com a fonte de cada fato. Um projeto independente, para quem estuda ortopedia.
          </p>
          <p className="sb-topo__autor"><Simbolo tamanho={22} /> Feito por Tales Roberto</p>
          <a className="botao sb-botao-ouro" href={href('/treinar')}>
            <Icone nome="livro" tamanho={18} /> Montar uma sessão
          </a>
        </div>
        <div className="sb-topo__marca" aria-hidden="true"><Simbolo tamanho={176} /></div>
      </section>

      <div className="sb-leitura">
        <Sumario atual={atual} />

        <div className="sb-capitulos">
          <Capitulo n={1} id="sb-site" etiqueta="Recursos" titulo="O que tem no site"
            lide="Toque em um item para ir direto. O que diz “Assinante” faz parte dos planos; o resto é de todo mundo com conta.">
            <div className="sb-grupos">
              {GRUPOS.map((g, i) => (
                <section key={g.titulo} className="sb-grupo" aria-labelledby={`sb-grupo-${i}`}>
                  <header className="sb-grupo__cabeca">
                    <h3 id={`sb-grupo-${i}`}>{g.titulo}</h3>
                    <p>{g.lide}</p>
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
          </Capitulo>

          <Capitulo n={2} id="sb-comentarios" etiqueta="Método" titulo="Como escrevemos os comentários"
            lide="Cada comentário é uma aula curta: o conceito por trás da questão e por que cada alternativa está certa ou errada.">
            <ol className="sb-passos">
              <li>
                <span className="sb-passos__icone" aria-hidden="true"><Icone nome="livro" tamanho={20} /></span>
                <h3>Parte da bibliografia</h3>
                <p>Os tratados clássicos, as classificações e os guias das sociedades que as provas costumam cobrar.</p>
              </li>
              <li>
                <span className="sb-passos__icone" aria-hidden="true"><Icone nome="lapis" tamanho={20} /></span>
                <h3>Redigido com apoio de IA</h3>
                <p>A inteligência artificial ajuda a organizar e escrever a explicação. É ferramenta de escrita, não fonte.</p>
              </li>
              <li>
                <span className="sb-passos__icone" aria-hidden="true"><Icone nome="alvo" tamanho={20} /></span>
                <h3>Fonte em cada fato</h3>
                <p>Livro, edição, capítulo e página aparecem no texto, para você conferir. Quando dois livros divergem, o comentário mostra os dois.</p>
              </li>
              <li>
                <span className="sb-passos__icone" aria-hidden="true"><Icone nome="reiniciar" tamanho={20} /></span>
                <h3>Corrigido sempre</h3>
                <p>Erro relatado é conferido e corrigido, e quem relatou recebe um e-mail quando a questão muda.</p>
              </li>
            </ol>
            <p className="sb-biblio"><strong>Bibliografia de referência:</strong> {BIBLIOGRAFIA.join(', ')}, entre outras.</p>
          </Capitulo>

          <Capitulo n={3} id="sb-acervo" etiqueta="Conteúdo" titulo="O acervo">
            <div className="sb-acervo__corpo">
              <div className="sb-acervo__texto">
                <p>
                  O Orto Questões (também escrito OrtoQuestões) reúne questões de provas anteriores, como TEOT, TARO, R4 do ENARE
                  e a prova de título de ombro e cotovelo, organizadas por assunto, para quem se prepara para o título de especialista ou para a residência. Ao
                  lado delas ficam os {ROTULO_SIMULADOS}, questões autorais no padrão dessas provas.
                </p>
                <p>
                  As questões de provas anteriores aparecem com a indicação da prova e do ano, para fins de estudo, e continuam
                  pertencendo às bancas e instituições que as elaboraram. Os cadernos do TARO, por exemplo, ficam na página pública
                  da <a href="https://sbot.org.br/comissoes/sobre-a-sbot-comissao-ensino-treinamento/taro/" target="_blank" rel="noopener noreferrer">Comissão
                  de Ensino e Treinamento da SBOT</a>. O gabarito exibido é o da prova; quando a banca não publica um, vem uma resposta
                  justificada e sinalizada. Questões anuladas ficam marcadas e não contam no desempenho.
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
          </Capitulo>

          <Capitulo n={4} id="sb-avisos" etiqueta="Transparência" titulo="Avisos importantes" classe="sb-capitulo--avisos"
            lide="O que você precisa saber antes de estudar por aqui, sem letra miúda.">
            <ul className="sb-avisos">
              {AVISOS.map((a) => (
                <li key={a.titulo} className="sb-aviso">
                  <span className="sb-aviso__icone" aria-hidden="true"><Icone nome={a.icone} tamanho={20} /></span>
                  <div>
                    <h3>{a.titulo}</h3>
                    <p>{a.texto}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="sb-avisos__rodape">
              As regras completas de uso, privacidade e assinatura estão nos <a href={href('/termos')}>Termos de Uso e Privacidade</a> e
              nas <a href={href('/condicoes-assinatura')}>Condições da Assinatura</a>.
            </p>
          </Capitulo>

          <Capitulo n={5} id="sb-duvidas" etiqueta="Perguntas" titulo="Dúvidas comuns">
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
                <dt>O site usa inteligência artificial?</dt>
                <dd>
                  Usa, para redigir comentários, resumos e flashcards a partir dos livros citados. As questões de provas
                  anteriores não são reescritas, e as imagens médicas vêm das provas ou dos livros, nunca de IA. Relatos de
                  erro e mensagens de suporte são lidos pelo Tales, pessoalmente.
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
          </Capitulo>
        </div>
      </div>

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
