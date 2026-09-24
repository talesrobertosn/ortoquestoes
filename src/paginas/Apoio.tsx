import { usarConta } from '../conta/ContextoConta'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { BackupProgresso } from '../componentes/BackupProgresso'
import { Icone } from '../componentes/Icone'
import { useMemo } from 'react'
import { PROVA_SIMULADOS, SITE } from '../config'
import { href } from '../util/rotas'
import { AcoesDeEmail } from '../componentes/AcoesDeEmail'
import { armazenamentoDisponivel, tamanhoArmazenado } from '../estado/armazenamento'
import { type ResumoHistorico, usarFavoritos } from '../estado/sessao'
import { usarIndice } from '../dados/usarIndice'
import { conquistaAtual, proximaConquista } from '../estado/conquistas'
import { Medalha } from '../componentes/Medalha'
import { chaveDia, inicioDia } from '../estado/planoRevisao'

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
          O OrtoQuestões reúne questões de provas anteriores (TEOT, TARO, R4 do ENARE, TECOC de ombro e cotovelo e outras),
          organizadas por assunto, para quem se prepara para o título de especialista ou para a
          residência. Foi criado por um ortopedista para residentes que estudam entre plantões e
          cirurgias: da página inicial até a primeira questão, no máximo dois cliques.
        </p>
        {indice && (
          <dl className="pj-heroi__numeros">
            <div><dt>Questões</dt><dd>{indice.total.toLocaleString('pt-BR')}</dd></div>
            <div><dt>Comentadas</dt><dd>{comentadas.toLocaleString('pt-BR')}</dd></div>
            <div><dt>Temas</dt><dd>{indice.temas.length}</dd></div>
            <div><dt>Provas</dt><dd>{(indice.provas ?? []).filter((p) => !['TEOT', 'TARO', PROVA_SIMULADOS].includes(p)).length}</dd></div>
          </dl>
        )}
      </section>

      <section className="pj-secao">
        <header className="pj-secao__cabeca">
          <p className="meta">OS COMENTÁRIOS</p>
          <h2>Como cada comentário é construído</h2>
          <p>Todo comentário segue o mesmo roteiro: o conceito por trás da questão, por que a alternativa correta está certa e por que cada uma das outras está errada.</p>
        </header>
        <ol className="pj-passos">
          <li className="pj-passo">
            <span className="pj-passo__icone"><Icone nome="livro" tamanho={22} /></span>
            <h3>Bibliografia de referência</h3>
            <p>A base é a literatura que as bancas cobram: os tratados clássicos da ortopedia, as classificações oficiais e os guias das sociedades.</p>
          </li>
          <li className="pj-passo">
            <span className="pj-passo__icone"><Icone nome="raio" tamanho={22} /></span>
            <h3>Redação com apoio de IA</h3>
            <p>A inteligência artificial pode ser usada para organizar e redigir a explicação a partir dessas fontes. Ela é ferramenta de escrita, não a fonte do conteúdo.</p>
          </li>
          <li className="pj-passo">
            <span className="pj-passo__icone"><Icone nome="alvo" tamanho={22} /></span>
            <h3>Fontes à vista e correção contínua</h3>
            <p>Quando o comentário cita fontes específicas, elas aparecem no fim, com livro e capítulo. Se o gabarito da banca parece errado, o comentário avisa. Erro relatado é corrigido.</p>
          </li>
        </ol>
        <div className="pj-biblio">
          <p className="pj-biblio__titulo">Algumas das obras citadas nos comentários</p>
          <ul>{BIBLIOGRAFIA.map((livro) => <li key={livro}>{livro}</li>)}</ul>
        </div>
        <p className="pj-nota">
          <Icone nome="alerta" tamanho={16} />
          <span>Comentário de questão é material de estudo e não substitui o livro nem a conduta do seu serviço. Quando uma questão passar por revisão médica individual, isso aparece indicado nela.</span>
        </p>
      </section>

      <div className="pj-duas">
        <section className="pj-cartao">
          <span className="pj-cartao__icone"><Icone nome="usuario" tamanho={20} /></span>
          <h2>Comentários da comunidade</h2>
          <p>
            Conhecimento de prova circula melhor quando é compartilhado. Quem passou pelo TEOT sabe
            explicar a questão que caiu; quem está estudando agora tem a dúvida fresca. Toda questão
            tem um botão para você enviar o seu comentário: o macete que ficou, a divergência entre
            serviços, a referência que a banca costuma seguir. Ele é conferido e publicado com o
            seu crédito.
          </p>
        </section>
        <section className="pj-cartao">
          <span className="pj-cartao__icone"><Icone nome="mapa" tamanho={20} /></span>
          <h2>O acervo</h2>
          <p>
            As questões são transcritas das provas sem reescrita nem correção do enunciado. O
            gabarito vem da própria prova ou, quando a banca não publica um oficial, de uma resposta
            justificada e sinalizada como tal. Anuladas ficam marcadas e não contam no desempenho.
          </p>
          <ul className="pj-temas">{TEMAS_ACERVO.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      </div>

      <div className="pj-tres">
        <section className="pj-cartao">
          <h2>Como funciona hoje</h2>
          <p>
            O acervo inteiro está disponível para responder. A conta guarda suas respostas, revisões
            e desempenho em qualquer aparelho. No futuro pretendo cobrar uma taxa pequena para manter
            o projeto de pé, preservando um uso diário livre. Qualquer mudança será avisada aqui, com
            antecedência.
          </p>
        </section>
        <section className="pj-cartao">
          <h2>Seus dados</h2>
          <p>
            Respostas, revisões, favoritas, anotações e histórico ficam na sua conta, sincronizados
            pelo Supabase com acesso restrito a você. Exporte ou zere seu progresso quando quiser em{' '}
            <a href={href('/dados')}>Desempenho</a>.
          </p>
        </section>
        <section className="pj-cartao">
          <h2>Achou um erro?</h2>
          <p>
            Extração de PDF erra. Enunciado truncado, figura faltando ou gabarito estranho: use o{' '}
            <a href={href('/contato')}>relato de erro</a>. Uma questão com gabarito errado é pior do
            que uma questão ausente.
          </p>
        </section>
      </div>

      <section className="pj-final">
        <div>
          <h2>Bora estudar?</h2>
          <p>
            Acompanhe também no Instagram,{' '}
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer me">@{SITE.instagramUsuario}</a>,
            com questão comentada e avisos de acervo novo. Feito por {SITE.autor}.
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

export function Contato({ consulta }: { consulta: URLSearchParams }) {
  const questao = consulta.get('questao')

  const modelo = useMemo(
    () =>
      [
        `Questão: ${questao ?? '(identificador da questão)'}`,
        'Problema: (enunciado truncado, figura faltando, gabarito divergente, outro)',
        'O que eu esperava: ',
        '',
      ].join('\n'),
    [questao],
  )

  const assunto = questao
    ? `OrtoQuestões — erro na questão ${questao}`
    : 'OrtoQuestões — relato de erro'

  return (
    <article className="limite-leitura empilha">
      <h1>Relatar erro</h1>
      <p>
        Erro em questão é o tipo de coisa que precisa ser corrigida rápido. Quanto mais específico o
        relato, mais rápido a correção entra no ar.
      </p>
      {questao && (
        <p>
          Você está relatando a questão <span className="numerico">{questao}</span>.
        </p>
      )}
      <h2>Modelo do relato</h2>
      <pre
        className="cartao"
        style={{
          padding: '1rem',
          whiteSpace: 'pre-wrap',
          fontFamily: 'var(--fonte-dados)',
          fontSize: 'var(--corpo-menor)',
          margin: 0,
        }}
      >
        {modelo}
      </pre>
      <AcoesDeEmail para={SITE.contato} assunto={assunto} corpo={modelo} />

      <p className="texto-2">
        Prefere mandar por mensagem? O projeto também está no Instagram, em{' '}
        <a href={SITE.instagram} target="_blank" rel="noopener noreferrer me">
          @{SITE.instagramUsuario}
        </a>
        .
      </p>


    </article>
  )
}

type PeriodoDesempenho = { tipo: 'tudo' | '7' | '30' | '90' | 'desde'; desde?: string }
const PERIODOS: { tipo: PeriodoDesempenho['tipo']; rotulo: string }[] = [
  { tipo: 'tudo', rotulo: 'Tudo' }, { tipo: '7', rotulo: '7 dias' }, { tipo: '30', rotulo: '30 dias' }, { tipo: '90', rotulo: '90 dias' }, { tipo: 'desde', rotulo: 'Desde…' },
]
function inicioDoPeriodo(p: PeriodoDesempenho): number {
  if (p.tipo === 'tudo') return 0
  if (p.tipo === 'desde') {
    const data = p.desde ? new Date(`${p.desde}T00:00:00`).getTime() : NaN
    return Number.isFinite(data) ? data : 0
  }
  return inicioDia() - (Number(p.tipo) - 1) * 86400000
}
function descreverPeriodo(p: PeriodoDesempenho): string {
  if (p.tipo === 'tudo') return 'desde o começo'
  if (p.tipo === 'desde') return p.desde ? `desde ${new Date(`${p.desde}T00:00:00`).toLocaleDateString('pt-BR')}` : 'escolha a data'
  return `nos últimos ${p.tipo} dias`
}

export function DadosLocais() {
  const { favoritos } = usarFavoritos()
  const { indice } = usarIndice()
  const { sessao: conta, status: statusSync, sincronizar } = usarConta()
  const [historico] = usarArmazenado<ResumoHistorico[]>('historico', [])
  const [marcadas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  // Depois de "Começar do zero", nada anterior ao reinício entra nos gráficos,
  // mesmo que algum aparelho ainda guarde eventos antigos no histórico da questão.
  const [reinicioEm] = usarArmazenado<number>('reinicio:em', 0)
  const respondidas = Object.keys(marcadas).length
  const [reinicioPendente] = usarArmazenado<string | null>('reinicio:pendente', null)
  const bytes = tamanhoArmazenado()

  // Período escolhido: fica salvo e vale sempre que a pessoa volta. Em vez de
  // apagar o histórico, ela acompanha só a fase atual do estudo.
  const [periodo, definirPeriodo] = usarArmazenado<PeriodoDesempenho>('desempenho:periodo', { tipo: 'tudo' })
  const inicioPeriodo = inicioDoPeriodo(periodo)
  const limite = Math.max(inicioPeriodo, reinicioEm || 0)

  // Cada tentativa registrada (até as últimas 8 por questão), com o tema.
  const eventos = useMemo(() => {
    const temaPorId = new Map<string, { nome: string; slug: string }>()
    if (indice) for (const item of indice.questoes) {
      const tema = indice.temas[item.t]
      if (tema) temaPorId.set(item.id, { nome: tema.nome, slug: tema.slug })
    }
    const lista: { id: string; em: number; correta: boolean | null; confianca: 'seguro' | 'duvida' | 'chute'; tema?: { nome: string; slug: string } }[] = []
    for (const [id, registro] of Object.entries(marcadas)) {
      const historicoQuestao = registro.historico?.length ? registro.historico : registro.q ? [{ em: registro.q, correta: registro.c, confianca: registro.confianca ?? 'seguro' as const }] : []
      for (const evento of historicoQuestao) {
        if ((evento.em ?? 0) < limite) continue
        lista.push({ id, em: evento.em, correta: evento.correta, confianca: evento.confianca ?? 'seguro', tema: temaPorId.get(id) })
      }
    }
    return lista
  }, [indice, marcadas, limite])

  const porTema = useMemo(() => {
    const soma = new Map<string, { certas: number; total: number; slug: string }>()
    for (const evento of eventos) {
      if (evento.correta === null || !evento.tema) continue
      const atual = soma.get(evento.tema.nome) ?? { certas: 0, total: 0, slug: evento.tema.slug }
      atual.total++
      if (evento.correta) atual.certas++
      soma.set(evento.tema.nome, atual)
    }
    return [...soma.entries()]
      .map(([nome, valores]) => ({ nome, ...valores }))
      .sort((a, b) => b.total - a.total)
  }, [eventos])

  const totalCertas = porTema.reduce((n, t) => n + t.certas, 0)
  const totalContadas = porTema.reduce((n, t) => n + t.total, 0)
  const errosTotais = eventos.filter((e) => e.correta === false).length
  const questoesNoPeriodo = new Set(eventos.map((e) => e.id)).size
  const sessoesNoPeriodo = historico.filter((h) => h.concluidaEm >= limite).length
  const nome = String(conta?.user.user_metadata?.nome ?? '').trim()
  const percentualGeral = totalContadas > 0 ? totalCertas / totalContadas : null
  const incertas = Object.values(marcadas).filter(registro => registro.confianca === 'duvida' || registro.confianca === 'chute').length
  const minhaConquista = conquistaAtual(respondidas)
  const proximaConquistaAlvo = proximaConquista(respondidas)
  const porConfianca = useMemo(() => {
    const grupos = { seguro: { certas: 0, total: 0 }, duvida: { certas: 0, total: 0 }, chute: { certas: 0, total: 0 } }
    for (const evento of eventos) {
      if (evento.correta === null) continue
      const grupo = grupos[evento.confianca]
      grupo.total++
      if (evento.correta) grupo.certas++
    }
    return grupos
  }, [eventos])
  const atividade = useMemo(() => {
    const porDia = new Map<string, { total: number; certas: number }>()
    for (const registro of Object.values(marcadas)) {
      const historicoQuestao = registro.historico?.length ? registro.historico : registro.q ? [{ em: registro.q, correta: registro.c }] : []
      for (const evento of historicoQuestao) {
        if (reinicioEm && evento.em < reinicioEm) continue
        const chave = chaveDia(evento.em)
        const atual = porDia.get(chave) ?? { total: 0, certas: 0 }
        atual.total++
        if (evento.correta) atual.certas++
        porDia.set(chave, atual)
      }
    }
    const hoje = inicioDia()
    return Array.from({ length: 28 }, (_, i) => {
      const dia = hoje - (27 - i) * 86400000
      return { dia, fora: dia + 86400000 <= limite, ...(porDia.get(chaveDia(dia)) ?? { total: 0, certas: 0 }) }
    })
  }, [marcadas, reinicioEm, limite])
  const maiorDia = Math.max(1, ...atividade.map((d) => d.total))
  const diasAtivos = atividade.filter((d) => d.total > 0 && !d.fora).length
  const questoesMes = atividade.reduce((n, d) => n + (d.fora ? 0 : d.total), 0)
  const avaliados = porTema.filter((t) => t.total >= 5)
  const temaForte = [...avaliados].sort((a, b) => b.certas / b.total - a.certas / a.total)[0]
  const temaFragil = [...avaliados].sort((a, b) => a.certas / a.total - b.certas / b.total)[0]
  const mensagemDesempenho = percentualGeral === null
    ? 'Vamos começar e construir seu histórico.'
    : percentualGeral >= 0.8
      ? 'Mandou muito bem! Desempenho excelente. Continue nesse ritmo.'
      : percentualGeral >= 0.6
        ? 'Você está no caminho certo. Mais algumas revisões vão fazer essa porcentagem subir.'
        : percentualGeral >= 0.4
          ? 'Há espaço para melhorar. Revise as questões que errou e tente novamente.'
          : 'Atenção redobrada agora: revise com calma os temas mais difíceis e reforce a base.'

  const pct = percentualGeral === null ? null : Math.round(percentualGeral * 100)
  const perimetro = 2 * Math.PI * 52
  const faixa = (p: number) => (p >= 70 ? 'bom' : p >= 50 ? 'medio' : 'baixo')
  return (
    <article className="empilha-2 dp">
      <section className="dp-heroi">
        <div className="dp-heroi__texto">
          <p className="dp-heroi__selo"><Icone nome="grafico" tamanho={16} /> Seu desempenho</p>
          <h1>{nome ? `Olha seu desempenho, ${nome}` : 'Seu desempenho'}</h1>
          <p>{mensagemDesempenho}</p>
          {conta && (
            <p className="dp-heroi__sync" role="status">
              <span className={`ponto-sincronia ponto-sincronia--${statusSync.estado}`} aria-hidden="true" />
              {statusSync.estado === 'sincronizando' ? 'Sincronizando…' : statusSync.estado === 'salvo' ? 'Progresso sincronizado' : statusSync.pendentes ? `${statusSync.pendentes} alteração(ões) aguardando envio` : 'Progresso salvo neste dispositivo'}
              {statusSync.estado !== 'sincronizando' && <button type="button" className="botao--vinculo" onClick={sincronizar}>sincronizar agora</button>}
              {statusSync.estado === 'erro' && statusSync.detalhe && <small className="status-sincronia__detalhe">Motivo: {statusSync.detalhe}</small>}
              {statusSync.rejeitados.length > 0 && <a className="status-sincronia__detalhe dp-heroi__rejeitados" href={href('/conta')}>{statusSync.rejeitados.length} {statusSync.rejeitados.length === 1 ? 'item não enviado' : 'itens não enviados'} · ver em Minha conta</a>}
            </p>
          )}
        </div>
        <div className="dp-anel" aria-label={pct === null ? 'Sem respostas ainda' : `${pct}% de acerto no total`}>
          <svg viewBox="0 0 120 120" width="168" height="168" aria-hidden="true">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="10" />
            <circle cx="60" cy="60" r="52" fill="none" stroke="#ffe3a3" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${((pct ?? 0) / 100) * perimetro} ${perimetro}`} transform="rotate(-90 60 60)" />
          </svg>
          <span className="dp-anel__valor"><strong>{pct === null ? '0%' : `${pct}%`}</strong><small>{periodo.tipo === 'tudo' ? 'de acerto' : 'no período'}</small></span>
        </div>
        <dl className="dp-heroi__numeros">
          <div><dt>{periodo.tipo === 'tudo' ? 'Respondidas' : 'Questões no período'}</dt><dd>{(periodo.tipo === 'tudo' ? respondidas : questoesNoPeriodo).toLocaleString('pt-BR')}{minhaConquista && <span className="medalha-inline"><Medalha conquista={minhaConquista} tamanho={20} titulo={`Emblema ${minhaConquista.rotulo}`} /></span>}</dd></div>
          <div><dt>Sessões</dt><dd>{periodo.tipo === 'tudo' ? historico.length : sessoesNoPeriodo}</dd></div>
          <div><dt>{periodo.tipo === 'tudo' ? 'Erros acumulados' : 'Erros no período'}</dt><dd><a href={href('/erros')} title="Abrir o caderno de erros">{errosTotais}</a></dd></div>
          <div><dt>Favoritas</dt><dd><a href={href('/favoritas')}>{favoritos.length}</a></dd></div>
        </dl>
      </section>

      <section className="dp-periodo" aria-label="Período do desempenho">
        <div className="dp-periodo__texto">
          <strong><Icone nome="calendario" tamanho={16} /> Período</strong>
          <span>Mostrando {descreverPeriodo(periodo)}. Ranking e emblemas continuam contando o total.</span>
        </div>
        <div className="dp-periodo__controles">
          <div className="ct-seg dp-periodo__seg" role="group" aria-label="Escolher período">
            {PERIODOS.map((opcao) => (
              <button key={opcao.tipo} type="button" aria-pressed={periodo.tipo === opcao.tipo}
                onClick={() => definirPeriodo(opcao.tipo === 'desde' ? { tipo: 'desde', desde: periodo.desde ?? new Date(inicioDia() - 29 * 86400000).toISOString().slice(0, 10) } : { tipo: opcao.tipo, desde: periodo.desde })}>
                {opcao.rotulo}
              </button>
            ))}
          </div>
          {periodo.tipo === 'desde' && (
            <label className="dp-periodo__data">
              <span className="so-leitor">Data inicial</span>
              <input className="entrada" type="date" value={periodo.desde ?? ''} max={new Date().toISOString().slice(0, 10)} onChange={(e) => definirPeriodo({ tipo: 'desde', desde: e.target.value })} />
            </label>
          )}
        </div>
      </section>

      {!conta && <p className="aviso-ia">Crie uma conta gratuita para salvar seu desempenho, revisões e histórico e acompanhar sua evolução em qualquer dispositivo. <a href={href('/conta')}>Criar minha conta</a></p>}
      {conta && !armazenamentoDisponivel() && (
        <div className="estado">
          <p className="estado__titulo">Este navegador está com o armazenamento bloqueado.</p>
          <p>O site funciona normalmente, mas o progresso vale só até você fechar a aba. Aba anônima e bloqueio de cookies costumam ser a causa.</p>
        </div>
      )}

      <div className="dp-duas">
        <section className="cartao cartao__corpo dp-cartao">
          <div className="dp-cartao__cabeca">
            <div><h2>Últimas 4 semanas</h2><p className="texto-2">{questoesMes} {questoesMes === 1 ? 'resposta' : 'respostas'} em {diasAtivos} {diasAtivos === 1 ? 'dia ativo' : 'dias ativos'}</p></div>
          </div>
          <div className="dp-barras" role="img" aria-label={`Atividade diária: ${questoesMes} respostas em 28 dias`}>
            {atividade.map((d) => (
              <span key={d.dia} className={'dp-barras__dia' + (d.fora ? ' dp-barras__dia--fora' : '')} title={`${new Date(d.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}: ${d.total} ${d.total === 1 ? 'resposta' : 'respostas'}${d.total ? `, ${Math.round((d.certas / d.total) * 100)}% de acerto` : ''}`}>
                <span className="dp-barras__barra" style={{ height: `${d.total ? Math.max(6, (d.total / maiorDia) * 100) : 0}%` }} />
              </span>
            ))}
          </div>
          <div className="dp-barras__eixo"><span>há 4 semanas</span><span>hoje</span></div>
        </section>

        <section className="cartao cartao__corpo dp-cartao">
          <div className="dp-cartao__cabeca"><div><h2>Pontos de atenção</h2><p className="texto-2">Temas com pelo menos 5 respostas.</p></div></div>
          {temaForte && temaFragil && temaForte.nome !== temaFragil.nome ? (
            <div className="dp-destaques">
              <a className="dp-destaque dp-destaque--bom" href={href(`/treinar?temas=${temaForte.slug}&limite=10`)}>
                <small>Ponto forte</small>
                <strong>{temaForte.nome}</strong>
                <span>{Math.round((temaForte.certas / temaForte.total) * 100)}% de acerto</span>
              </a>
              <a className="dp-destaque dp-destaque--baixo" href={href(`/treinar?temas=${temaFragil.slug}&situacao=erradas&limite=10`)}>
                <small>Para reforçar</small>
                <strong>{temaFragil.nome}</strong>
                <span>{Math.round((temaFragil.certas / temaFragil.total) * 100)}% de acerto · refazer erros</span>
              </a>
            </div>
          ) : <p className="texto-2">Responda mais algumas questões em temas diferentes para ver seu ponto forte e o que reforçar.</p>}
        </section>
      </div>

      {(porConfianca.seguro.total > 0 || porConfianca.duvida.total > 0 || porConfianca.chute.total > 0) && <section className="cartao cartao__corpo dp-cartao">
        <div className="dp-cartao__cabeca">
          <div>
            <h2>Sua sensação combina com o resultado?</h2>
            <p className="texto-2">Acerto separado pelo que você marcou ao responder. Chute volta em 1 dia, dúvida em 3, certeza em 10. <a href={href('/revisao')}>Ver a escada completa</a></p>
          </div>
        </div>
        <div className="dp-confianca">
          {([['seguro', 'Certeza', 'certo'], ['duvida', 'Dúvida', 'olho'], ['chute', 'Chute', 'interrogacao']] as const).map(([tipo, rotulo, icone]) => {
            const grupo = porConfianca[tipo]
            const p = grupo.total ? Math.round((grupo.certas / grupo.total) * 100) : 0
            return <div className="dp-confianca__linha" key={tipo}>
              <span className="dp-confianca__rotulo"><Icone nome={icone} tamanho={16} /> {rotulo}</span>
              <span className="dp-confianca__trilho"><span className={`dp-faixa--${faixa(p)}`} style={{ width: `${grupo.total ? Math.max(3, p) : 0}%` }} /></span>
              <span className="dp-confianca__valor"><strong>{grupo.total ? `${p}%` : '–'}</strong> <small>{grupo.total} {grupo.total === 1 ? 'resposta' : 'respostas'}</small></span>
            </div>
          })}
        </div>
        {incertas > 0 && <a className="botao botao--principal" href={href('/treinar?situacao=incertas&limite=20')}>Refazer {incertas} {incertas === 1 ? 'questão com dúvida ou chute' : 'questões com dúvida ou chute'}</a>}
      </section>}

      <section className="cartao cartao__corpo dp-cartao">
        <div className="dp-cartao__cabeca">
          <div><h2>Por tema</h2><p className="texto-2">Toque em um tema para treinar só ele.</p></div>
          {proximaConquistaAlvo && <a className="dp-emblema" href={href('/ranking')}>Faltam {proximaConquistaAlvo.minimo - respondidas} questões para {proximaConquistaAlvo.rotulo}</a>}
        </div>
        {porTema.length === 0 ? (
          <p className="texto-2">Ainda não há questões respondidas nesta conta. Responda uma sessão e o desempenho por tema aparece aqui.</p>
        ) : (
          <ul className="dp-temas">
            {porTema.map((tema) => {
              const percentual = Math.round((tema.certas / tema.total) * 100)
              return (
                <li key={tema.nome}>
                  <a className="dp-tema" href={href(`/treinar?temas=${tema.slug}&limite=10`)}>
                    <span className="dp-tema__nome">{tema.nome}</span>
                    <span className={`dp-tema__pct dp-texto--${faixa(percentual)}`}>{percentual}%</span>
                    <span className="dp-tema__trilho"><span className={`dp-faixa--${faixa(percentual)}`} style={{ width: `${percentual}%` }} /></span>
                    <span className="dp-tema__meta">{tema.certas} de {tema.total} certas</span>
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {conta && <p className="meta dp-guardado">Seu progresso fica salvo e sincronizado com a sua conta ({(bytes / 1024).toFixed(1)} kB neste perfil). <a href={href('/conta')}>Minha conta</a></p>}

      <BackupProgresso />

      {conta && <section className="zona-risco cartao__corpo empilha">
        <p className="meta"><Icone nome="alerta" tamanho={15} /> ZONA DE RISCO</p>
        <h2>Começar do zero <span className="dp-embreve">Em breve</span></h2>
        <p className="texto-2">Esta opção está sendo refeita e volta em breve. Enquanto isso, use o <strong>Período</strong> lá em cima para acompanhar só a fase atual do seu estudo: o acerto, os temas e a confiança passam a contar a partir da data que você escolher, sem apagar nada.</p>
        <div className="linha">
          {/* A função reiniciarProgresso continua pronta; o botão só volta a funcionar quando o reinício for refeito. */}
          <button type="button" className="botao botao--perigo" disabled aria-disabled="true" title="Em breve">Zerar meu progresso · em breve</button>
          {reinicioPendente && <button type="button" className="botao botao--fantasma" onClick={sincronizar}>Tentar sincronizar agora</button>}
        </div>
      </section>}
    </article>
  )
}

export function NaoEncontrada() {
  return (
    <article className="limite-leitura empilha">
      <h1>Página não encontrada</h1>
      <p>O endereço digitado não existe no site.</p>
      <div className="linha">
        <a className="botao botao--principal" href={href('/')}>
          Ir para o início
        </a>
        <a className="botao" href={href('/treinar')}>
          Montar uma sessão
        </a>
      </div>
    </article>
  )
}
