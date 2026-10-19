import { useMemo } from 'react'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { primeiroNome } from '../componentes/Cabecalho'
import { usarConta } from '../conta/ContextoConta'
import { EXIGIR_CONTA_PARA_QUESTOES, fraseGratis } from '../config'
import { usarIndice } from '../dados/usarIndice'
import { href } from '../util/rotas'
import '../estilos/paginas/Sobre.css'

/*
 * O projeto (/sobre e /projeto), refeito em 19/10/2026 na temporada pixel.
 * Conta que o site ganhou cara nova e lista o que existe hoje (só recursos reais, conferidos
 * no menu), depois como os comentários são feitos. Regra do Tales (19/10/2026): a página não
 * diz a profissão nem a etapa dele; sobre ele, só o nome.
 */

interface Recurso { titulo: string; texto: string; destino?: string; icone: NomeIcone; assinante?: boolean; beta?: boolean }

const GRUPOS: { titulo: string; lide: string; itens: Recurso[] }[] = [
  {
    titulo: 'Estudar',
    lide: 'Questão de prova, explicada como uma aula, e o que errou volta na hora certa.',
    itens: [
      { titulo: 'Treinar', texto: 'Questões oficiais e OrtoQuestões Simulados, misturados ou só um deles, por prova, tema, ano e dificuldade.', destino: '/treinar', icone: 'livro' },
      { titulo: 'Comentário em formato de aula', texto: 'O conceito por trás da questão e a análise de todas as alternativas, inclusive a correta.', icone: 'lapis' },
      { titulo: 'Revisão espaçada e Revisar hoje', texto: 'O que você errou ou acertou na dúvida volta no dia certo, numa fila só.', destino: '/revisao', icone: 'reiniciar' },
      { titulo: 'Caderno de erros', texto: 'Tudo o que você errou, pronto para refazer.', destino: '/erros', icone: 'alerta' },
      { titulo: 'Favoritas', texto: 'As questões que você marcou com estrela.', destino: '/favoritas', icone: 'estrela' },
      { titulo: 'Flashcards e o Torneio', texto: 'Revisão espaçada em cartões, na Biblioteca calma ou em forma de jogo.', destino: '/flashcards', icone: 'raio', beta: true },
    ],
  },
  {
    titulo: 'Rumo à prova',
    lide: 'Para quem tem data marcada: o plano de cada dia e o que mais cai.',
    itens: [
      { titulo: 'Cronograma até a prova', texto: 'Você diz a data e o tempo por dia; cada dia chega decidido.', destino: '/cronograma', icone: 'rota', assinante: true },
      { titulo: 'Temas que mais caem', texto: 'A contagem dos assuntos nas provas oficiais, área por área.', destino: '/temas-que-mais-caem', icone: 'grafico', assinante: true },
      { titulo: 'Biblioteca de Resumos', texto: 'Resumos dos temas que mais caem, com as questões no meio do texto.', destino: '/resumos', icone: 'livro', beta: true },
      { titulo: 'Simulado Nacional', texto: 'Uma prova por mês, no tempo, com nota e posição.', destino: '/simulado-nacional', icone: 'alvo', assinante: true },
      { titulo: 'Cirurgia da mão (SIMÃO)', texto: 'OrtoQuestões Simulados no padrão do SIMÃO, para o título de cirurgia da mão.', destino: '/treinar', icone: 'bandeira' },
    ],
  },
  {
    titulo: 'Acompanhar',
    lide: 'Onde você está crescendo, e um pouco de jogo para manter o ritmo.',
    itens: [
      { titulo: 'Desempenho', texto: 'Acerto por tema, por prova e a sua evolução nas semanas.', destino: '/dados', icone: 'grafico' },
      { titulo: 'Ranking e Conquistas', texto: 'Sua posição na semana e no geral, emblemas e missões.', destino: '/ranking', icone: 'trofeu' },
      { titulo: 'Liga da residência', texto: 'Uma disputa entre os colegas do seu serviço.', destino: '/ligas', icone: 'grupo', assinante: true },
      { titulo: 'Tema claro e escuro', texto: 'Escolha no botão do topo do site; a escolha fica guardada.', icone: 'lua' },
    ],
  },
]

const BIBLIOGRAFIA = [
  "Campbell's Operative Orthopaedics",
  'Rockwood and Green: Fractures in Adults',
  "Tachdjian's Pediatric Orthopaedics",
  'Lovell and Winter: Pediatric Orthopaedics',
  "Green's Operative Hand Surgery",
  'The Adult Hip',
  'Hebert: Ortopedia e Traumatologia',
  'Classificação de tumores da OMS',
  'AO Surgery Reference',
  'POSNA Study Guide',
]

const TEMAS_ACERVO = ['Mão e punho', 'Ombro e cotovelo', 'Quadril', 'Joelho', 'Pé e tornozelo', 'Coluna', 'Trauma adulto', 'Tumores ósseos', 'Ortopedia pediátrica', 'Osteometabólicas', 'Conceitos básicos']

function CartaoRecurso({ r }: { r: Recurso }) {
  const conteudo = <>
    <span className="sb-recurso__icone" aria-hidden="true"><Icone nome={r.icone} tamanho={18} /></span>
    <span className="sb-recurso__texto">
      <strong>
        {r.titulo}
        {r.beta && <span className="sb-tag sb-tag--beta">Beta</span>}
        {r.assinante && <span className="sb-tag">Assinante</span>}
      </strong>
      <span>{r.texto}</span>
    </span>
    {r.destino && <span className="sb-recurso__seta" aria-hidden="true"><Icone nome="direita" tamanho={16} /></span>}
  </>
  if (r.destino) return <li><a className="sb-recurso" href={href(r.destino)}>{conteudo}</a></li>
  return <li><div className="sb-recurso">{conteudo}</div></li>
}

export function Sobre() {
  const { indice } = usarIndice()
  const nome = primeiroNome(usarConta().sessao?.user.user_metadata?.nome)
  const comentadas = useMemo(() => (indice?.questoes ?? []).filter((q) => q.c === 1).length, [indice])
  const provas = (indice?.provas ?? []).filter((p) => !['TEOT', 'TARO'].includes(p)).length

  return (
    <article className="sb">
      <section className="sb-heroi" aria-labelledby="sb-titulo">
        <div className="sb-heroi__texto">
          <p className="tr-heroi__selo">O projeto</p>
          <h1 id="sb-titulo">{nome ? <>{nome}, o Orto Questões está de cara nova.</> : 'O Orto Questões está de cara nova.'}</h1>
          <p className="sb-heroi__lide">
            O site inteiro ganhou o visual da temporada pixel, no claro e no escuro. O que você já usava
            continua no mesmo lugar, e chegou bastante coisa nova. Aqui embaixo está tudo o que tem hoje.
          </p>
          <p className="sb-heroi__lide sb-heroi__lide--menor">
            O Orto Questões (também escrito OrtoQuestões) reúne questões de provas anteriores, como TEOT, TARO,
            R4 do ENARE e TECOC de ombro e cotovelo, por assunto, para quem se prepara para o título de
            especialista ou para a residência. Da página inicial à primeira questão, no máximo dois cliques.
          </p>
          <a className="tr-heroi__link" href={href('/treinar')}><Icone nome="livro" tamanho={15} /> Montar uma sessão agora</a>
        </div>
        {indice && (
          <dl className="sb-placar" aria-label="O acervo hoje">
            <div><dt>Questões</dt><dd>{indice.total.toLocaleString('pt-BR')}</dd></div>
            <div><dt>Comentadas</dt><dd>{comentadas.toLocaleString('pt-BR')}</dd></div>
            <div><dt>Temas</dt><dd>{indice.temas.length}</dd></div>
            <div><dt>Provas</dt><dd>{provas}</dd></div>
          </dl>
        )}
      </section>

      <section className="sb-secao" aria-labelledby="sb-tem-titulo">
        <header className="sb-secao__cabeca">
          <p className="sb-sobretitulo">O que tem no site</p>
          <h2 id="sb-tem-titulo">Tudo o que você encontra hoje</h2>
          <p>Toque em qualquer item para ir direto. O que diz "Assinante" faz parte dos planos; o resto é para todo mundo com conta.</p>
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
              <ul className="sb-recursos">{g.itens.map((r) => <CartaoRecurso key={r.titulo} r={r} />)}</ul>
            </section>
          ))}
        </div>
      </section>

      <section className="sb-secao" aria-labelledby="sb-comentarios-titulo">
        <header className="sb-secao__cabeca">
          <p className="sb-sobretitulo">Os comentários</p>
          <h2 id="sb-comentarios-titulo">Como cada comentário é feito</h2>
          <p>Sempre o mesmo roteiro: o conceito por trás da questão, por que a correta está certa e por que cada uma das outras está errada.</p>
        </header>
        <ol className="sb-passos">
          <li className="sb-passo">
            <span className="px-numero" aria-hidden="true">1</span>
            <h3>Bibliografia de referência</h3>
            <p>A base é o que as bancas cobram: os tratados clássicos, as classificações oficiais e os guias das sociedades.</p>
          </li>
          <li className="sb-passo">
            <span className="px-numero" aria-hidden="true">2</span>
            <h3>Redação com apoio de IA</h3>
            <p>A inteligência artificial pode organizar e redigir a explicação a partir dessas fontes. É ferramenta de escrita, não fonte.</p>
          </li>
          <li className="sb-passo">
            <span className="px-numero" aria-hidden="true">3</span>
            <h3>Fontes à vista, correção contínua</h3>
            <p>Fontes específicas aparecem no fim, com livro e capítulo. Gabarito da banca que parece errado vem com aviso. Erro relatado é corrigido.</p>
          </li>
        </ol>
        <div className="sb-dupla">
          <aside className="sb-ia" aria-labelledby="sb-ia-titulo">
            <h3 id="sb-ia-titulo"><Icone nome="alerta" tamanho={18} /> Sobre o uso de inteligência artificial</h3>
            <p>Tudo parte da <strong>bibliografia de referência</strong>. A IA redige parte dos textos: comentários, explicações e o enunciado de algumas questões autorais, como as dos OrtoQuestões Simulados.</p>
            <p>Ela escreve bem, mas <strong>pode acrescentar algo que não está na fonte</strong>, simplificar demais ou errar um detalhe, mesmo com tom seguro. Use o comentário como ponto de partida e <strong>confira na bibliografia indicada</strong> antes de levar para a prova ou para a prática. Achou algo estranho? Use o botão "Relatar erro nesta questão" ou o "Não ajudou" no comentário: é assim que o texto é corrigido.</p>
            <p className="sb-ia__nota">Comentário é material de estudo: não substitui o livro nem a conduta do seu serviço.</p>
          </aside>
          <div className="sb-biblio">
            <p className="sb-biblio__titulo">Algumas das obras citadas nos comentários</p>
            <ul>{BIBLIOGRAFIA.map((livro) => <li key={livro}>{livro}</li>)}</ul>
          </div>
        </div>
      </section>

      <div className="sb-cartoes">
        <section className="sb-cartao sb-cartao--largo">
          <h2>O acervo</h2>
          <p>
            Questões transcritas dos cadernos oficiais, sem reescrever nem corrigir o enunciado (os do
            TARO estão na página pública da <a href="https://sbot.org.br/comissoes/sobre-a-sbot-comissao-ensino-treinamento/taro/" target="_blank" rel="noopener noreferrer">Comissão de Ensino e Treinamento da SBOT</a>).
            O gabarito é o da prova; quando a banca não publica um oficial, vem uma resposta justificada
            e sinalizada como tal. Anuladas ficam marcadas e não contam no desempenho.
          </p>
          <ul className="sb-temas">{TEMAS_ACERVO.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
        <section className="sb-cartao">
          <h2>Comentários da comunidade</h2>
          <p>
            Toda questão tem um botão para você enviar o seu comentário: o macete que ficou, a divergência
            entre serviços, a referência que a banca costuma seguir. Ele é conferido e publicado com o seu crédito.
          </p>
        </section>
        <section className="sb-cartao">
          <h2>Como funciona hoje</h2>
          <p>
            {EXIGIR_CONTA_PARA_QUESTOES ? 'Para responder, crie uma conta grátis, sem cartão. ' : ''}A conta
            guarda respostas, revisões e desempenho em qualquer aparelho. {fraseGratis('sobre')}{' '}
            <a href={href('/assinatura')}>Veja os planos</a>. Mudanças no gratuito são avisadas no site.
          </p>
        </section>
        <section className="sb-cartao">
          <h2>Seus dados</h2>
          <p>
            Respostas, revisões, favoritas, anotações e histórico ficam na sua conta, sincronizados pelo
            Supabase, com acesso restrito a você. Para exportar seu progresso, use{' '}
            <a href={href('/dados')}>Desempenho</a>.
          </p>
        </section>
        <section className="sb-cartao">
          <h2>Achou um erro?</h2>
          <p>
            Extração de PDF erra: enunciado truncado, figura faltando, gabarito estranho. Na questão, use
            "Relatar erro nesta questão"; para o resto, o <a href={href('/contato')}>suporte</a>. Gabarito
            errado é pior do que questão ausente.
          </p>
        </section>
      </div>

      <section className="sb-final" aria-labelledby="sb-final-titulo">
        <div>
          <h2 id="sb-final-titulo">{nome ? `Bora estudar, ${nome}?` : 'Bora estudar?'}</h2>
          <p>Dez questões cabem num intervalo. Dúvida, sugestão ou problema, o suporte chega direto no e-mail do Tales.</p>
        </div>
        <div className="sb-final__acoes">
          <a className="botao sb-botao-ouro" href={href('/treinar')}>Montar uma sessão</a>
          <a className="botao sb-botao-vidro" href={href('/contato')}>Falar com o suporte</a>
        </div>
      </section>
    </article>
  )
}
