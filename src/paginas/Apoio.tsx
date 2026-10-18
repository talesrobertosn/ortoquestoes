import { MapaPerdido } from '../componentes/CenasPixel'
import { Icone } from '../componentes/Icone'
import { useMemo, useState } from 'react'
import { EXIGIR_CONTA_PARA_QUESTOES, SITE, fraseGratis } from '../config'
import { href } from '../util/rotas'
import { AcoesDeEmail } from '../componentes/AcoesDeEmail'
import { usarIndice } from '../dados/usarIndice'
import '../estilos/paginas/Apoio.css'

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

export function Sobre() {
  const { indice } = usarIndice()
  const comentadas = useMemo(() => (indice?.questoes ?? []).filter((q) => q.c === 1).length, [indice])
  return (
    <article className="empilha-2 pj">
      <section className="pj-heroi">
        <p className="pj-heroi__selo">O projeto</p>
        <h1>Questões de ortopedia comentadas, feitas por quem vive a especialidade.</h1>
        <p className="pj-heroi__lide">
          O Orto Questões (ortoquestoes.com.br, também escrito OrtoQuestões) reúne questões de provas
          anteriores, como TEOT, TARO, R4 do ENARE e TECOC de ombro e cotovelo, organizadas por assunto,
          para quem se prepara para o título de especialista ou para a residência. Foi criado por um
          residente de ortopedia para estudar entre plantões e cirurgias: da página inicial à primeira
          questão, no máximo dois cliques.
        </p>
        {indice && (
          <dl className="pj-heroi__numeros">
            <div><dt>Questões</dt><dd>{indice.total.toLocaleString('pt-BR')}</dd></div>
            <div><dt>Comentadas</dt><dd>{comentadas.toLocaleString('pt-BR')}</dd></div>
            <div><dt>Temas</dt><dd>{indice.temas.length}</dd></div>
            <div><dt>Provas</dt><dd>{(indice.provas ?? []).filter((p) => !['TEOT', 'TARO'].includes(p)).length}</dd></div>
          </dl>
        )}
      </section>

      <section className="pj-secao">
        <header className="pj-secao__cabeca">
          <p className="meta">OS COMENTÁRIOS</p>
          <h2>Como cada comentário é feito</h2>
          <p>Sempre o mesmo roteiro: o conceito por trás da questão, por que a correta está certa e por que cada uma das outras está errada.</p>
        </header>
        <ol className="pj-passos">
          <li className="pj-passo">
            <span className="pj-passo__icone"><Icone nome="livro" tamanho={22} /></span>
            <h3>Bibliografia de referência</h3>
            <p>A base é o que as bancas cobram: os tratados clássicos, as classificações oficiais e os guias das sociedades.</p>
          </li>
          <li className="pj-passo">
            <span className="pj-passo__icone"><Icone nome="raio" tamanho={22} /></span>
            <h3>Redação com apoio de IA</h3>
            <p>A inteligência artificial pode organizar e redigir a explicação a partir dessas fontes. É ferramenta de escrita, não fonte.</p>
          </li>
          <li className="pj-passo">
            <span className="pj-passo__icone"><Icone nome="alvo" tamanho={22} /></span>
            <h3>Fontes à vista, correção contínua</h3>
            <p>Fontes específicas aparecem no fim, com livro e capítulo. Gabarito da banca que parece errado vem com aviso. Erro relatado é corrigido.</p>
          </li>
        </ol>
        <div className="pj-biblio">
          <p className="pj-biblio__titulo">Algumas das obras citadas nos comentários</p>
          <ul>{BIBLIOGRAFIA.map((livro) => <li key={livro}>{livro}</li>)}</ul>
        </div>
        <p className="pj-nota">
          <Icone nome="alerta" tamanho={16} />
          <span>Comentário é material de estudo: não substitui o livro nem a conduta do seu serviço.</span>
        </p>
        <aside className="pj-ia" aria-labelledby="pj-ia-titulo">
          <h3 id="pj-ia-titulo">Sobre o uso de inteligência artificial</h3>
          <p>Tudo parte da <strong>bibliografia de referência</strong>. A IA redige parte dos textos: comentários, explicações e o enunciado de algumas questões autorais, como as dos OrtoQuestões Simulados.</p>
          <p>Ela escreve bem, mas <strong>pode acrescentar algo que não está na fonte</strong>, simplificar demais ou errar um detalhe, mesmo com tom seguro. Use o comentário como ponto de partida e <strong>confira na bibliografia indicada</strong> antes de levar para a prova ou para a prática. Achou algo estranho? Use o <a href={href('/contato')}>relato de erro</a> ou o botão "Não ajudou" no comentário: é assim que o texto é corrigido.</p>
        </aside>
      </section>

      <div className="pj-duas">
        <section className="pj-cartao">
          <span className="pj-cartao__icone"><Icone nome="usuario" tamanho={20} /></span>
          <h2>Comentários da comunidade</h2>
          <p>
            Toda questão tem um botão para você enviar o seu comentário: o macete que ficou, a
            divergência entre serviços, a referência que a banca costuma seguir. Ele é conferido e
            publicado com o seu crédito.
          </p>
        </section>
        <section className="pj-cartao">
          <span className="pj-cartao__icone"><Icone nome="mapa" tamanho={20} /></span>
          <h2>O acervo</h2>
          <p>
            Questões transcritas dos cadernos oficiais, sem reescrever nem corrigir o enunciado (os do
            TARO estão na página pública da <a href="https://sbot.org.br/comissoes/sobre-a-sbot-comissao-ensino-treinamento/taro/" target="_blank" rel="noopener noreferrer">Comissão de Ensino e Treinamento da SBOT</a>).
            O gabarito é o da prova; quando a banca não publica um oficial, vem uma resposta justificada
            e sinalizada como tal. Anuladas ficam marcadas e não contam no desempenho.
          </p>
          <ul className="pj-temas">{TEMAS_ACERVO.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      </div>

      <div className="pj-tres">
        <section className="pj-cartao">
          <h2>Como funciona hoje</h2>
          <p>
            {EXIGIR_CONTA_PARA_QUESTOES ? 'Para responder, crie uma conta grátis, sem cartão. ' : ''}A conta
            guarda respostas, revisões e desempenho em qualquer aparelho. {fraseGratis('sobre')}{' '}
            <a href={href('/assinatura')}>Veja os planos</a>. Mudanças no gratuito são avisadas no site.
          </p>
        </section>
        <section className="pj-cartao">
          <h2>Seus dados</h2>
          <p>
            Respostas, revisões, favoritas, anotações e histórico ficam na sua conta, sincronizados pelo
            Supabase, com acesso restrito a você. Para exportar seu progresso, use{' '}
            <a href={href('/dados')}>Desempenho</a>.
          </p>
        </section>
        <section className="pj-cartao">
          <h2>Achou um erro?</h2>
          <p>
            Extração de PDF erra: enunciado truncado, figura faltando, gabarito estranho. Use o{' '}
            <a href={href('/contato')}>relato de erro</a>. Gabarito errado é pior do que questão ausente.
          </p>
        </section>
      </div>

      <section className="pj-final">
        <div>
          <h2>Bora estudar?</h2>
          <p>
            No Instagram,{' '}
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer me">@{SITE.instagramUsuario}</a>,
            tem questão comentada e aviso de acervo novo. Feito por {SITE.autor}.
          </p>
        </div>
        <div className="linha linha--empilha-celular">
          <a className="botao botao--claro" href={href('/treinar')}>Montar uma sessão</a>
          <a className="botao botao--vidro" href={href('/contato')}>Falar com o autor</a>
        </div>
      </section>
    </article>
  )
}

const ASSUNTOS_SUPORTE = [
  { id: 'assinatura', titulo: 'Assinatura ou cobrança', descricao: 'Plano, renovação, cancelamento ou reembolso.' },
  { id: 'acesso', titulo: 'Acesso à conta', descricao: 'Entrar, senha ou sincronização.' },
  { id: 'questao', titulo: 'Questão ou comentário', descricao: 'Gabarito, imagem ou enunciado.' },
  { id: 'dados', titulo: 'Meus dados', descricao: 'Privacidade, exportação ou exclusão da conta.' },
  { id: 'outro', titulo: 'Outro assunto', descricao: 'Conte o que aconteceu.' },
] as const
type AssuntoSuporte = typeof ASSUNTOS_SUPORTE[number]['id']

function assuntoInicial(consulta: URLSearchParams): AssuntoSuporte {
  if (consulta.has('questao')) return 'questao'
  const assunto = consulta.get('assunto')
  if (assunto === 'exclusao-conta') return 'dados'
  if (assunto === 'sincronizacao') return 'acesso'
  return 'outro'
}

function modeloSuporte(tipo: AssuntoSuporte, questao: string | null, exclusao: boolean): string {
  if (exclusao) return 'Solicito a exclusão da minha conta e dos dados pessoais associados.\n\nInformações adicionais (opcional): '
  if (tipo === 'questao') return `Questão: ${questao ?? '(identificador, se souber)'}\nO que encontrei: \nO que esperava: `
  if (tipo === 'assinatura') return 'O que aconteceu com minha assinatura ou cobrança: \nData aproximada: \nO que esperava: '
  if (tipo === 'acesso') return 'O que aconteceu ao entrar ou sincronizar: \nAparelho/navegador: \nMensagem exibida (sem senha ou código): '
  if (tipo === 'dados') return 'Minha dúvida ou solicitação sobre meus dados: '
  return 'Como podemos ajudar?\n\nDetalhes úteis: '
}

export function Contato({ consulta }: { consulta: URLSearchParams }) {
  const questao = consulta.get('questao')
  const exclusao = consulta.get('assunto') === 'exclusao-conta'
  const [tipo, definirTipo] = useState<AssuntoSuporte>(() => assuntoInicial(consulta))
  const [mensagem, definirMensagem] = useState(() => modeloSuporte(assuntoInicial(consulta), questao, exclusao))
  const tituloAssunto = ASSUNTOS_SUPORTE.find(item => item.id === tipo)?.titulo ?? 'Outro assunto'
  const assunto = exclusao && tipo === 'dados' ? 'Orto Questões — solicitação de exclusão da conta' : questao && tipo === 'questao'
    ? `Orto Questões — questão ${questao}` : `Orto Questões — ${tituloAssunto}`

  function selecionarTipo(novoTipo: AssuntoSuporte) {
    if (novoTipo === tipo) return
    const modeloAtual = modeloSuporte(tipo, questao, exclusao && tipo === 'dados')
    definirTipo(novoTipo)
    if (mensagem === modeloAtual) definirMensagem(modeloSuporte(novoTipo, questao, exclusao && novoTipo === 'dados'))
  }

  return <article className="empilha-2 suporte-pagina">
    <header className="suporte-heroi heroi-escuro">
      <p className="meta">SUPORTE DO ORTOQUESTÕES</p>
      <h1>Vamos resolver juntos.</h1>
      <p>Dúvida sobre conta, assinatura ou uma questão? Conte o que aconteceu. O contato chega diretamente ao responsável pelo projeto.</p>
      <a className="botao botao--claro" href={`mailto:${SITE.contato}`}>Escrever para o suporte</a>
    </header>
    <section className="suporte-contato" aria-label="Contato direto">
      <div><span>Nosso e-mail</span><strong><a href={`mailto:${SITE.contato}`}>{SITE.contato}</a></strong></div>
      <p>O contato é por e-mail. Abrir um rascunho não envia a mensagem automaticamente; confira e envie pelo seu aplicativo.</p>
    </section>
    <section className="empilha suporte-painel" aria-labelledby="suporte-assunto">
      <div><p className="meta">PASSO 1</p><h2 id="suporte-assunto">Sobre o que você quer falar?</h2><p>Escolha um tema para preparar a mensagem.</p></div>
      <div className="suporte-temas" role="group" aria-label="Assunto do contato">
        {ASSUNTOS_SUPORTE.map(item => <button type="button" key={item.id} className="suporte-tema" aria-pressed={tipo === item.id} onClick={() => selecionarTipo(item.id)}><strong>{item.titulo}</strong><span>{item.descricao}</span></button>)}
      </div>
    </section>
    <section className="empilha suporte-painel" aria-labelledby="suporte-mensagem">
      <div><p className="meta">PASSO 2</p><h2 id="suporte-mensagem">Descreva o que aconteceu</h2><p>Edite o modelo abaixo. Se for sobre pagamento, informe a data aproximada e o plano; não envie números de cartão.</p></div>
      <label className="campo" htmlFor="mensagem-suporte">Sua mensagem</label>
      <textarea id="mensagem-suporte" className="entrada suporte-mensagem" value={mensagem} onChange={evento => definirMensagem(evento.target.value)} rows={7} />
      <p className="suporte-aviso"><Icone nome="alerta" tamanho={18} /> Não inclua senha, código de acesso, número do cartão ou dados de saúde na mensagem.</p>
      <AcoesDeEmail para={SITE.contato} assunto={assunto} corpo={mensagem} rotuloCopiar="Copiar mensagem" />
    </section>
    <section className="suporte-atalhos" aria-label="Respostas rápidas">
      <h2>Talvez você resolva agora</h2>
      <div><a href={href('/conta/assinatura')}>Ver minha assinatura <Icone nome="direita" tamanho={17} /></a><a href={href('/dados')}>Exportar meu progresso <Icone nome="direita" tamanho={17} /></a><a href={href('/condicoes-assinatura')}>Regras de cancelamento e garantia <Icone nome="direita" tamanho={17} /></a></div>
    </section>
  </article>
}

// A página de desempenho (/dados) mora em Desempenho.tsx; o carregador de Apoio continua servindo-a.
export { DadosLocais } from './Desempenho'

/** Página não encontrada, na cena de mapa da temporada RPG. */
export function NaoEncontrada() {
  return <MapaPerdido />
}
